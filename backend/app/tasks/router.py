from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_task(
    request: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Validate assignee is in the organisation
    assignee_membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == request.assignee_id,
        models.OrgMembership.organisation_id == organisation.id,
        models.OrgMembership.is_active == True
    ).first()
    if not assignee_membership:
        raise HTTPException(status_code=400, detail="Assignee not found in organisation")

    task = models.Task(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        contact_id=request.contact_id,
        assignee_id=request.assignee_id,
        created_by_id=current_user.id,
        title=request.title,
        description=request.description,
        task_type=request.task_type,
        priority=request.priority,
        due_date=request.due_date,
        is_recurring=request.is_recurring,
        recurrence_pattern=request.recurrence_pattern,
        recurrence_interval=request.recurrence_interval,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Create notification for assignee
    if task.assignee_id != current_user.id:
        notification = models.Notification(
            user_id=task.assignee_id,
            organisation_id=organisation.id,
            title=f"New task: {task.title}",
            message=f"{current_user.first_name} assigned you a task",
            link=f"/tasks/{task.id}"
        )
        db.add(notification)
        db.commit()

    return task


@router.get("/", status_code=status.HTTP_200_OK)
def list_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    my_tasks: bool = False,
    today: bool = False,
    overdue: bool = False,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tasks with filters."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Task).filter(
        models.Task.organisation_id == organisation.id
    )

    # Filter by my tasks
    if my_tasks:
        query = query.filter(models.Task.assignee_id == current_user.id)

    # Filter by today
    if today:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        query = query.filter(
            models.Task.due_date >= today_start,
            models.Task.due_date < today_end
        )

    # Filter by overdue
    if overdue:
        query = query.filter(
            models.Task.due_date < datetime.utcnow(),
            models.Task.status != "completed"
        )

    # Filter by status
    if status:
        query = query.filter(models.Task.status == status)

    # Filter by priority
    if priority:
        query = query.filter(models.Task.priority == priority)

    total = query.count()
    tasks = query.order_by(models.Task.due_date.asc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": tasks,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/overview", status_code=status.HTTP_200_OK)
def get_tasks_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get task overview summary for current user."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Get all tasks assigned to user
    tasks_query = db.query(models.Task).filter(
        models.Task.organisation_id == organisation.id,
        models.Task.assignee_id == current_user.id
    )

    total_tasks = tasks_query.count()
    completed_tasks = tasks_query.filter(models.Task.status == "completed").count()
    pending_tasks = tasks_query.filter(models.Task.status != "completed").count()

    # Today's tasks
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_tasks = tasks_query.filter(
        models.Task.due_date >= today_start,
        models.Task.due_date < today_end,
        models.Task.status != "completed"
    ).count()

    # Overdue tasks
    overdue_tasks = tasks_query.filter(
        models.Task.due_date < datetime.utcnow(),
        models.Task.status != "completed"
    ).count()

    # High priority tasks
    high_priority_tasks = tasks_query.filter(
        models.Task.priority == "high",
        models.Task.status != "completed"
    ).count()

    # Upcoming this week
    week_end = datetime.utcnow() + timedelta(days=7)
    upcoming_tasks = tasks_query.filter(
        models.Task.due_date >= datetime.utcnow(),
        models.Task.due_date <= week_end,
        models.Task.status != "completed"
    ).count()

    return {
        "total": total_tasks,
        "completed": completed_tasks,
        "pending": pending_tasks,
        "today": today_tasks,
        "overdue": overdue_tasks,
        "high_priority": high_priority_tasks,
        "upcoming_this_week": upcoming_tasks,
        "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    }


@router.post("/check-overdue", status_code=status.HTTP_200_OK)
def check_and_create_overdue_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check for overdue tasks and create notifications."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Check permission (only managers/admins/owners can trigger this)
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership or membership.role not in [
        models.UserRole.OWNER,
        models.UserRole.ADMIN,
        models.UserRole.MANAGER
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    # Find all overdue tasks
    overdue_tasks = db.query(models.Task).filter(
        models.Task.organisation_id == organisation.id,
        models.Task.due_date < datetime.utcnow(),
        models.Task.status != "completed"
    ).all()

    notifications_created = 0

    for task in overdue_tasks:
        # Check if notification already exists for this task today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        existing_notification = db.query(models.Notification).filter(
            models.Notification.user_id == task.assignee_id,
            models.Notification.title.like("Overdue task:%"),
            models.Notification.created_at >= today_start
        ).first()

        if not existing_notification:
            notification = models.Notification(
                user_id=task.assignee_id,
                organisation_id=organisation.id,
                title=f"Overdue task: {task.title}",
                message=f"Task '{task.title}' was due on {task.due_date.strftime('%Y-%m-%d')}",
                link=f"/tasks/{task.id}"
            )
            db.add(notification)
            notifications_created += 1

    db.commit()

    return {
        "overdue_tasks_found": len(overdue_tasks),
        "notifications_created": notifications_created
    }


@router.get("/{task_id}", status_code=status.HTTP_200_OK)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a task."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.organisation_id == organisation.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.patch("/{task_id}", status_code=status.HTTP_200_OK)
def update_task(task_id: int, request: schemas.TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a task."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.organisation_id == organisation.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = request.model_dump(exclude_unset=True)

    # Handle completion
    if request.status == "completed" and task.status != "completed":
        task.completed_at = datetime.utcnow()

        # Create notification for task creator if different from assignee
        if task.created_by_id != current_user.id:
            notification = models.Notification(
                user_id=task.created_by_id,
                organisation_id=organisation.id,
                title=f"Task completed: {task.title}",
                message=f"{current_user.first_name} completed a task you created",
                link=f"/tasks/{task.id}"
            )
            db.add(notification)

    # Handle recurring task completion
    if request.status == "completed" and task.is_recurring:
        # Create next task in recurrence
        next_due_date = None
        if task.recurrence_pattern == "daily":
            next_due_date = datetime.utcnow() + timedelta(days=task.recurrence_interval)
        elif task.recurrence_pattern == "weekly":
            next_due_date = datetime.utcnow() + timedelta(weeks=task.recurrence_interval)
        elif task.recurrence_pattern == "monthly":
            next_due_date = datetime.utcnow() + timedelta(days=30 * task.recurrence_interval)

        if next_due_date:
            next_task = models.Task(
                organisation_id=organisation.id,
                lead_id=task.lead_id,
                contact_id=task.contact_id,
                assignee_id=task.assignee_id,
                created_by_id=task.created_by_id,
                title=task.title,
                description=task.description,
                task_type=task.task_type,
                priority=task.priority,
                due_date=next_due_date,
                is_recurring=True,
                recurrence_pattern=task.recurrence_pattern,
                recurrence_interval=task.recurrence_interval,
                parent_task_id=task.id,
                status="pending"
            )
            db.add(next_task)

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a task."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.organisation_id == organisation.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None


@router.post("/{task_id}/complete", status_code=status.HTTP_200_OK)
def complete_task(
    task_id: int,
    completion_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a task as completed with notes."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.organisation_id == organisation.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "completed"
    task.completed_at = datetime.utcnow()
    task.completion_notes = completion_notes

    # Handle recurring task
    if task.is_recurring:
        next_due_date = None
        if task.recurrence_pattern == "daily":
            next_due_date = datetime.utcnow() + timedelta(days=task.recurrence_interval)
        elif task.recurrence_pattern == "weekly":
            next_due_date = datetime.utcnow() + timedelta(weeks=task.recurrence_interval)
        elif task.recurrence_pattern == "monthly":
            next_due_date = datetime.utcnow() + timedelta(days=30 * task.recurrence_interval)

        if next_due_date:
            next_task = models.Task(
                organisation_id=organisation.id,
                lead_id=task.lead_id,
                contact_id=task.contact_id,
                assignee_id=task.assignee_id,
                created_by_id=task.created_by_id,
                title=task.title,
                description=task.description,
                task_type=task.task_type,
                priority=task.priority,
                due_date=next_due_date,
                is_recurring=True,
                recurrence_pattern=task.recurrence_pattern,
                recurrence_interval=task.recurrence_interval,
                parent_task_id=task.id,
                status="pending"
            )
            db.add(next_task)

            # Notification for next task
            notification = models.Notification(
                user_id=task.assignee_id,
                organisation_id=organisation.id,
                title=f"Next recurring task: {task.title}",
                message=f"Next task scheduled for {next_due_date.strftime('%Y-%m-%d')}",
                link=f"/tasks/{next_task.id}"
            )
            db.add(notification)

    # Notify task creator
    if task.created_by_id != current_user.id:
        notification = models.Notification(
            user_id=task.created_by_id,
            organisation_id=organisation.id,
            title=f"Task completed: {task.title}",
            message=f"{current_user.first_name} completed a task you created",
            link=f"/tasks/{task.id}"
        )
        db.add(notification)

    # Log activity if linked to lead
    if task.lead_id:
        activity = models.Activity(
            organisation_id=organisation.id,
            lead_id=task.lead_id,
            user_id=current_user.id,
            activity_type="task_completed",
            title=f"Task completed: {task.title}",
            description=f"Task '{task.title}' was marked as completed" + (f". Notes: {completion_notes}" if completion_notes else "")
        )
        db.add(activity)

    db.commit()
    db.refresh(task)

    return task
