from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path
from uuid import uuid4
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User

router = APIRouter(prefix="/projects", tags=["projects"])
UPLOAD_ROOT = Path("uploads/projects")


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.ProjectResponse)
def create_project(
    request: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = models.Project(
        organisation_id=organisation.id,
        name=request.name,
        project_type=request.project_type,
        rera_number=request.rera_number,
        address=request.address,
        city=request.city,
        state=request.state,
        pin=request.pin,
        latitude=request.latitude,
        longitude=request.longitude,
        status=request.status,
        description=request.description,
        master_plan=request.master_plan,
        brochure=request.brochure,
        gallery=request.gallery,
        amenities=request.amenities,
        completion_timeline=request.completion_timeline,
        created_by=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/", status_code=status.HTTP_200_OK)
def list_projects(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List projects with pagination and filters."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Project).filter(
        models.Project.organisation_id == organisation.id
    )

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.Project.name.ilike(search_filter)) |
            (models.Project.city.ilike(search_filter))
        )

    if status:
        query = query.filter(models.Project.status == status)

    if city:
        query = query.filter(models.Project.city.ilike(f"%{city}%"))

    # Get total count
    total = query.count()

    # Apply pagination
    projects = query.order_by(models.Project.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": projects,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/{project_id}", status_code=status.HTTP_200_OK, response_model=schemas.ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.patch("/{project_id}", status_code=status.HTTP_200_OK, response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    request: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project (soft delete)."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Check permission (only owner and admin can delete)
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership or membership.role not in [models.UserRole.OWNER, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if project has towers/units
    towers_count = db.query(models.Tower).filter(
        models.Tower.project_id == project_id
    ).count()

    if towers_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete project with towers")

    db.delete(project)
    db.commit()

    return None


@router.post("/{project_id}/upload")
async def upload_project_media(
    project_id: int,
    media_type: str = Query(..., pattern="^(master_plan|brochure|gallery)$"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload project media and attach to project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    allowed_extensions = {
        "master_plan": {".pdf", ".png", ".jpg", ".jpeg", ".webp"},
        "brochure": {".pdf"},
        "gallery": {".png", ".jpg", ".jpeg", ".webp"},
    }

    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions[media_type]:
        raise HTTPException(status_code=400, detail=f"Invalid file type for {media_type}")

    project_dir = UPLOAD_ROOT / str(organisation.id) / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{media_type}_{uuid4().hex}{ext}"
    dest = project_dir / stored_name

    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")
    dest.write_bytes(content)

    relative_path = f"/uploads/projects/{organisation.id}/{project_id}/{stored_name}"

    if media_type == "master_plan":
        project.master_plan = relative_path
    elif media_type == "brochure":
        project.brochure = relative_path
    else:
        # gallery is stored as comma-separated URLs for now
        existing = [x for x in (project.gallery or "").split(",") if x]
        existing.append(relative_path)
        project.gallery = ",".join(existing)

    db.commit()
    db.refresh(project)

    return {
        "project_id": project.id,
        "media_type": media_type,
        "file_url": relative_path,
        "project": project,
    }


@router.delete("/{project_id}/upload")
def remove_project_media(
    project_id: int,
    media_type: str = Query(..., pattern="^(master_plan|brochure|gallery)$"),
    file_url: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove project media reference (and local file if present)."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if media_type == "master_plan":
        target = project.master_plan
        project.master_plan = None
    elif media_type == "brochure":
        target = project.brochure
        project.brochure = None
    else:
        gallery = [x for x in (project.gallery or "").split(",") if x]
        if file_url:
            gallery = [x for x in gallery if x != file_url]
            target = file_url
        elif gallery:
            target = gallery.pop()
        else:
            target = None
        project.gallery = ",".join(gallery) if gallery else None

    # best-effort cleanup of local file
    if target and target.startswith("/uploads/"):
        local_path = Path(target.lstrip("/"))
        if local_path.exists():
            local_path.unlink()

    db.commit()
    db.refresh(project)
    return {"project": project}
