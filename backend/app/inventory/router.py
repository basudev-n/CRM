from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from io import StringIO, BytesIO
import csv
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User

router = APIRouter(prefix="/inventory", tags=["inventory"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


# ==================== TOWERS ====================
@router.post("/towers", status_code=status.HTTP_201_CREATED, response_model=schemas.TowerResponse)
def create_tower(
    request: schemas.TowerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tower in a project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify project exists and belongs to org
    project = db.query(models.Project).filter(
        models.Project.id == request.project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tower = models.Tower(
        project_id=request.project_id,
        name=request.name,
        floors_count=request.floors_count,
    )
    db.add(tower)
    db.commit()
    db.refresh(tower)
    return tower


@router.get("/towers", status_code=status.HTTP_200_OK)
def list_towers(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List towers for a project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify project exists
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    towers = db.query(models.Tower).filter(
        models.Tower.project_id == project_id
    ).all()

    return {"data": towers}


@router.get("/towers/{tower_id}", status_code=status.HTTP_200_OK, response_model=schemas.TowerResponse)
def get_tower(
    tower_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific tower."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    tower = db.query(models.Tower).filter(
        models.Tower.id == tower_id
    ).first()

    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")

    # Verify tower belongs to org's project
    project = db.query(models.Project).filter(
        models.Project.id == tower.project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Tower not found")

    return tower


@router.patch("/towers/{tower_id}", status_code=status.HTTP_200_OK, response_model=schemas.TowerResponse)
def update_tower(
    tower_id: int,
    request: schemas.TowerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a tower."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    tower = db.query(models.Tower).filter(
        models.Tower.id == tower_id
    ).first()

    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")

    # Verify tower belongs to org's project
    project = db.query(models.Project).filter(
        models.Project.id == tower.project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Tower not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tower, key, value)

    db.commit()
    db.refresh(tower)
    return tower


@router.delete("/towers/{tower_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tower(
    tower_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a tower."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    tower = db.query(models.Tower).filter(
        models.Tower.id == tower_id
    ).first()

    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")

    # Verify tower belongs to org's project
    project = db.query(models.Project).filter(
        models.Project.id == tower.project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Tower not found")

    # Check if tower has units
    units_count = db.query(models.Unit).filter(
        models.Unit.tower_id == tower_id
    ).count()

    if units_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete tower with units")

    db.delete(tower)
    db.commit()
    return None


# ==================== UNITS ====================
@router.post("/units", status_code=status.HTTP_201_CREATED, response_model=schemas.UnitResponse)
def create_unit(
    request: schemas.UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new unit in a tower."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify tower exists and belongs to org
    tower = db.query(models.Tower).filter(
        models.Tower.id == request.tower_id
    ).first()

    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")

    project = db.query(models.Project).filter(
        models.Project.id == tower.project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Tower not found")

    # Calculate total price if not provided
    total_price = request.total_price
    if not total_price and request.base_price and request.super_built_up_area:
        total_price = request.base_price * request.super_built_up_area

    unit = models.Unit(
        organisation_id=organisation.id,
        tower_id=request.tower_id,
        floor=request.floor,
        unit_number=request.unit_number,
        unit_type=request.unit_type,
        carpet_area=request.carpet_area,
        built_up_area=request.built_up_area,
        super_built_up_area=request.super_built_up_area,
        facing=request.facing,
        floor_premium=request.floor_premium,
        base_price=request.base_price,
        total_price=total_price,
        status=request.status,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/units", status_code=status.HTTP_200_OK)
def list_units(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=2000),
    tower_id: Optional[int] = None,
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    unit_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List units with filters."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Unit).filter(
        models.Unit.organisation_id == organisation.id
    )

    # Filter by tower
    if tower_id:
        query = query.filter(models.Unit.tower_id == tower_id)

    # Filter by project (via tower)
    if project_id:
        query = query.join(models.Tower).filter(
            models.Tower.project_id == project_id
        )

    if status:
        query = query.filter(models.Unit.status == status)

    if unit_type:
        query = query.filter(models.Unit.unit_type == unit_type)

    if min_price:
        query = query.filter(models.Unit.total_price >= min_price)

    if max_price:
        query = query.filter(models.Unit.total_price <= max_price)

    # Get total count
    total = query.count()

    # Apply pagination
    units = query.order_by(models.Unit.tower_id, models.Unit.floor, models.Unit.unit_number)\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": units,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/units/{unit_id}", status_code=status.HTTP_200_OK, response_model=schemas.UnitResponse)
def get_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific unit."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    unit = db.query(models.Unit).filter(
        models.Unit.id == unit_id,
        models.Unit.organisation_id == organisation.id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    return unit


@router.patch("/units/{unit_id}", status_code=status.HTTP_200_OK, response_model=schemas.UnitResponse)
def update_unit(
    unit_id: int,
    request: schemas.UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a unit."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    unit = db.query(models.Unit).filter(
        models.Unit.id == unit_id,
        models.Unit.organisation_id == organisation.id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    update_data = request.model_dump(exclude_unset=True)

    # Recalculate total price if needed
    if 'base_price' in update_data or 'super_built_up_area' in update_data:
        base_price = update_data.get('base_price', unit.base_price)
        super_built_up_area = update_data.get('super_built_up_area', unit.super_built_up_area)
        if base_price and super_built_up_area:
            update_data['total_price'] = base_price * super_built_up_area

    for key, value in update_data.items():
        setattr(unit, key, value)

    db.commit()
    db.refresh(unit)
    return unit


@router.post("/units/bulk", status_code=status.HTTP_201_CREATED)
def bulk_create_units(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk create units for a tower."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    tower_id = request.get("tower_id")
    units_data = request.get("units", [])

    if not tower_id:
        raise HTTPException(status_code=400, detail="tower_id is required")

    if not units_data:
        raise HTTPException(status_code=400, detail="units array is required")

    # Verify tower exists
    tower = db.query(models.Tower).filter(
        models.Tower.id == tower_id
    ).first()

    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")

    # Verify tower belongs to org's project
    project = db.query(models.Project).filter(
        models.Project.id == tower.project_id,
        models.Project.organisation_id == organisation.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Tower not found")

    created_units = []
    for unit_data in units_data:
        total_price = None
        if unit_data.get('base_price') and unit_data.get('super_built_up_area'):
            total_price = unit_data['base_price'] * unit_data['super_built_up_area']

        unit = models.Unit(
            organisation_id=organisation.id,
            tower_id=tower_id,
            floor=unit_data.get('floor', 1),
            unit_number=unit_data.get('unit_number', ''),
            unit_type=unit_data.get('unit_type', '2bhk'),
            carpet_area=unit_data.get('carpet_area'),
            built_up_area=unit_data.get('built_up_area'),
            super_built_up_area=unit_data.get('super_built_up_area'),
            facing=unit_data.get('facing'),
            floor_premium=unit_data.get('floor_premium', 0),
            base_price=unit_data.get('base_price', 0),
            total_price=total_price,
            status=unit_data.get('status', 'available'),
        )
        db.add(unit)
        created_units.append(unit)

    db.commit()

    return {
        "created": len(created_units),
        "units": created_units
    }


@router.get("/units/{unit_id}/hold", status_code=status.HTTP_200_OK)
def hold_unit(
    unit_id: int,
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hold a unit for specified hours."""
    from datetime import datetime, timedelta

    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    unit = db.query(models.Unit).filter(
        models.Unit.id == unit_id,
        models.Unit.organisation_id == organisation.id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    if unit.status != "available":
        raise HTTPException(status_code=400, detail="Unit is not available")

    hold_until = datetime.utcnow() + timedelta(hours=hours)
    unit.hold_until = hold_until
    unit.status = "blocked"

    db.commit()
    db.refresh(unit)

    return {
        "unit_id": unit.id,
        "status": unit.status,
        "hold_until": hold_until
    }


@router.get("/units/{unit_id}/release", status_code=status.HTTP_200_OK)
def release_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Release a held unit."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    unit = db.query(models.Unit).filter(
        models.Unit.id == unit_id,
        models.Unit.organisation_id == organisation.id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    unit.hold_until = None
    unit.status = "available"

    db.commit()
    db.refresh(unit)

    return {
        "unit_id": unit.id,
        "status": unit.status
    }


@router.get("/floor-summary", status_code=status.HTTP_200_OK)
def get_floors_summary(
    project_id: int,
    tower_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get floor-wise inventory summary for grid/floor-plan style views."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(
        models.Unit.tower_id,
        models.Unit.floor,
        models.Unit.status,
        func.count(models.Unit.id).label("count")
    ).join(models.Tower, models.Tower.id == models.Unit.tower_id).filter(
        models.Tower.project_id == project_id,
        models.Unit.organisation_id == organisation.id
    )
    if tower_id:
        query = query.filter(models.Unit.tower_id == tower_id)

    rows = query.group_by(models.Unit.tower_id, models.Unit.floor, models.Unit.status).all()
    floors = {}
    for row in rows:
        key = f"{row.tower_id}:{row.floor}"
        if key not in floors:
            floors[key] = {
                "tower_id": row.tower_id,
                "floor": row.floor,
                "total": 0,
                "available": 0,
                "blocked": 0,
                "booked": 0,
                "sold": 0,
                "registered": 0,
            }
        floors[key]["total"] += row.count
        floors[key][row.status] = row.count

    return {"data": sorted(floors.values(), key=lambda x: (x["tower_id"], x["floor"]))}


@router.post("/import-units", status_code=status.HTTP_201_CREATED)
async def import_units_file(
    tower_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import units from CSV/XLSX file for a tower."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    tower = db.query(models.Tower).filter(models.Tower.id == tower_id).first()
    if not tower:
        raise HTTPException(status_code=404, detail="Tower not found")

    project = db.query(models.Project).filter(
        models.Project.id == tower.project_id,
        models.Project.organisation_id == organisation.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Tower not found")

    filename = (file.filename or "").lower()
    content = await file.read()
    rows = []

    if filename.endswith(".csv"):
        text_data = content.decode("utf-8-sig")
        reader = csv.DictReader(StringIO(text_data))
        rows = list(reader)
    elif filename.endswith(".xlsx"):
        try:
            from openpyxl import load_workbook
        except Exception as exc:
            raise HTTPException(status_code=500, detail="openpyxl is required for .xlsx import") from exc
        wb = load_workbook(filename=BytesIO(content), read_only=True)
        ws = wb.active
        data = list(ws.values)
        if not data:
            raise HTTPException(status_code=400, detail="Empty file")
        headers = [str(h).strip() if h is not None else "" for h in data[0]]
        for vals in data[1:]:
            rows.append({headers[i]: vals[i] for i in range(len(headers))})
    else:
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")

    required = {"floor", "unit_number", "unit_type", "super_built_up_area", "base_price"}
    created = 0
    skipped = 0
    errors = []

    for idx, row in enumerate(rows, start=2):
        lower_row = {str(k).strip().lower(): v for k, v in row.items() if k is not None}
        if not required.issubset(lower_row.keys()):
            skipped += 1
            errors.append(f"Row {idx}: missing required columns")
            continue
        try:
            unit_number = str(lower_row.get("unit_number", "")).strip()
            existing = db.query(models.Unit).filter(
                models.Unit.organisation_id == organisation.id,
                models.Unit.tower_id == tower_id,
                models.Unit.unit_number == unit_number
            ).first()
            if existing:
                skipped += 1
                continue

            super_built_up_area = float(lower_row.get("super_built_up_area") or 0)
            base_price = float(lower_row.get("base_price") or 0)
            total_price = super_built_up_area * base_price if super_built_up_area and base_price else None

            unit = models.Unit(
                organisation_id=organisation.id,
                tower_id=tower_id,
                floor=int(lower_row.get("floor") or 0),
                unit_number=unit_number,
                unit_type=str(lower_row.get("unit_type") or "2bhk").lower(),
                carpet_area=float(lower_row.get("carpet_area")) if lower_row.get("carpet_area") not in (None, "") else None,
                built_up_area=float(lower_row.get("built_up_area")) if lower_row.get("built_up_area") not in (None, "") else None,
                super_built_up_area=super_built_up_area or None,
                facing=str(lower_row.get("facing")).lower() if lower_row.get("facing") else None,
                floor_premium=float(lower_row.get("floor_premium") or 0),
                base_price=base_price,
                total_price=total_price,
                status=str(lower_row.get("status") or "available").lower(),
            )
            db.add(unit)
            created += 1
        except Exception as exc:
            skipped += 1
            errors.append(f"Row {idx}: {str(exc)}")

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors[:50]}


@router.get("/price-list", status_code=status.HTTP_200_OK)
def export_price_list(
    project_id: int,
    tower_id: Optional[int] = None,
    format: str = Query("csv", pattern="^(csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export inventory price list."""
    from fastapi.responses import StreamingResponse

    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.organisation_id == organisation.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(models.Unit, models.Tower).join(models.Tower, models.Tower.id == models.Unit.tower_id).filter(
        models.Unit.organisation_id == organisation.id,
        models.Tower.project_id == project_id
    )
    if tower_id:
        query = query.filter(models.Unit.tower_id == tower_id)

    units = query.order_by(models.Tower.name, models.Unit.floor, models.Unit.unit_number).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "project_name", "tower", "floor", "unit_number", "unit_type", "status",
        "super_built_up_area", "base_price", "floor_premium", "total_price"
    ])
    for unit, tower in units:
        writer.writerow([
            project.name,
            tower.name,
            unit.floor,
            unit.unit_number,
            unit.unit_type,
            unit.status,
            unit.super_built_up_area or "",
            unit.base_price or 0,
            unit.floor_premium or 0,
            unit.total_price or 0,
        ])

    output.seek(0)
    filename = f"price_list_project_{project_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
