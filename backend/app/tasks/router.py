from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


def get_user_role(db: Session, user: User):
    """Get user's role."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.role if membership else None


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

    # Verify assignee belongs to org
    assignee_membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == request.assignee_id,
        models.OrgMembership.organisation_id == organisation.id,
        models.OrgMembership.is_active == True
    ).first()
    if not assignee_membership:
        raise HTTPException(status_code=404, detail="Assignee not found in organisation")

    # Verify lead if provided
    if request.lead_id:
        lead = db.query(models.Lead).filter(
            models.Lead.id == request.lead_id,
            models.Lead.organisation_id == organisation.id
        ).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

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
        due_date=request.due_date
    )
    db.add(task)

    # Create activity
    activity = models.Activity(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        user_id=current_user.id,
        activity_type=models.ActivityType.TASK_COMPLETED,
        title=f"Task created: {request.title}",
        description=f"Task assigned to user ID {request.assignee_id}"
    )
    db.add(activity)

    # Create notification for assignee
    notification = models.Notification(
        user_id=request.assignee_id,
        organisation_id=organisation.id,
        notification_type=models.NotificationType.TASK_ASSIGNED,
        title="New Task Assigned",
        message=f"You have been assigned a new task: {request.title}",
        link=f"/tasks/{task.id}"
    )
    db.add(notification)

    db.commit()
    db.refresh(task)
    return task


@router.get("/", status_code=status.HTTP_200_OK)
def list_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    my_tasks: bool = False,
    today: bool = False,
    overdue: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tasks with filters."""
    organisation = get_user_org(db, current_user)
    role = get_user_role(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Task).filter(
        models.Task.organisation_id == organisation.id
    )

    # Agents see only their tasks
    if role == models.UserRole.AGENT or my_tasks:
        query = query.filter(models.Task.assignee_id == current_user.id)

    if status_filter:
        query = query.filter(models.Task.status == status_filter)
    if priority:
        query = query.filter(models.Task.priority == priority)
    if assignee_id:
        query = query.filter(models.Task.assignee_id == assignee_id)

    # Today tasks
    if today:
        from datetime import datetime, timedelta
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        query = query.filter(
            models.Task.due_date >= today_start,
            models.Task.due_date < today_end
        )

    # Overdue tasks
    if overdue:
        query = query.filter(
            models.Task.due_date < datetime.utcnow(),
            models.Task.status != models.TaskStatus.COMPLETED
        )

    total = query.count()
    tasks = query.order_by(models.Task.due_date.asc().nullslast())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    # Get assignee info
    result = []
    for task in tasks:
        assignee = db.query(models.User).filter(models.User.id == task.assignee_id).first()
        result.append({
            "id": task.id,
            "lead_id": task.lead_id,
            "contact_id": task.contact_id,
            "assignee_id": task.assignee_id,
            "created_by_id": task.created_by_id,
            "title": task.title,
            "description": task.description,
            "task_type": task.task_type.value if task.task_type else None,
            "priority": task.priority.value if task.priority else None,
            "status": task.status.value if task.status else None,
            "due_date": task.due_date,
            "completed_at": task.completed_at,
            "completion_notes": task.completion_notes,
            "created_at": task.created_at,
            "assignee": {
                "id": assignee.id,
                "first_name": assignee.first_name,
                "last_name": assignee.last_name,
                "email": assignee.email
            } if assignee else None
        })

    return {
        "data": result,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/{task_id}", status_code=status.HTTP_200_OK)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific task."""
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
def update_task(
    task_id: int,
    request: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    if request.status == "completed" and task.status != models.TaskStatus.COMPLETED:
        task.completed_at = datetime.utcnow()
        task.status = models.TaskStatus.COMPLETED

        # Create activity
        activity = models.Activity(
            organisation_id=organisation.id,
            lead_id=task.lead_id,
            user_id=current_user.id,
            activity_type=models.ActivityType.TASK_COMPLETED,
            title=f"Task completed: {task.title}",
            description=request.completion_notes
        )
        db.add(activity)

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
