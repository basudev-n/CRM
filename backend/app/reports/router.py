from datetime import datetime
from io import StringIO
import csv
import json
from typing import Optional, List, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc, extract
from pydantic import BaseModel

from app.database import get_db
from app.core.auth import get_current_user
from app import models
from app.models import User

router = APIRouter(prefix="/reports", tags=["reports"])


# ============== CUSTOM REPORT BUILDER ==============

class ReportFilter(BaseModel):
    field: str
    operator: str  # eq, neq, gt, gte, lt, lte, contains, in, between
    value: Any


class ReportConfig(BaseModel):
    entity: str  # leads, contacts, bookings, tasks, visits, invoices, payments
    fields: List[str]
    filters: List[ReportFilter] = []
    group_by: Optional[str] = None
    aggregations: List[str] = []  # count, sum, avg, min, max
    aggregate_field: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    limit: int = 1000


# Entity configurations for the report builder
ENTITY_CONFIG = {
    "leads": {
        "model": "Lead",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "name": {"type": "string", "label": "Name"},
            "email": {"type": "string", "label": "Email"},
            "phone": {"type": "string", "label": "Phone"},
            "source": {"type": "string", "label": "Source"},
            "status": {"type": "string", "label": "Status"},
            "priority": {"type": "string", "label": "Priority"},
            "score": {"type": "integer", "label": "Score"},
            "budget_min": {"type": "number", "label": "Budget Min"},
            "budget_max": {"type": "number", "label": "Budget Max"},
            "assigned_to": {"type": "integer", "label": "Assigned To"},
            "created_at": {"type": "datetime", "label": "Created At"},
            "updated_at": {"type": "datetime", "label": "Updated At"},
        },
        "date_field": "created_at",
        "groupable": ["source", "status", "priority", "assigned_to"],
        "aggregatable": ["score", "budget_min", "budget_max"],
    },
    "contacts": {
        "model": "Contact",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "first_name": {"type": "string", "label": "First Name"},
            "last_name": {"type": "string", "label": "Last Name"},
            "email": {"type": "string", "label": "Email"},
            "phone": {"type": "string", "label": "Phone"},
            "contact_type": {"type": "string", "label": "Type"},
            "city": {"type": "string", "label": "City"},
            "state": {"type": "string", "label": "State"},
            "created_at": {"type": "datetime", "label": "Created At"},
        },
        "date_field": "created_at",
        "groupable": ["contact_type", "city", "state"],
        "aggregatable": [],
    },
    "bookings": {
        "model": "Booking",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "booking_number": {"type": "string", "label": "Booking Number"},
            "booking_date": {"type": "datetime", "label": "Booking Date"},
            "customer_name": {"type": "string", "label": "Customer Name"},
            "project_name": {"type": "string", "label": "Project"},
            "unit_number": {"type": "string", "label": "Unit"},
            "unit_type": {"type": "string", "label": "Unit Type"},
            "area_sqft": {"type": "number", "label": "Area (sqft)"},
            "booking_amount": {"type": "number", "label": "Booking Amount"},
            "agreement_value": {"type": "number", "label": "Agreement Value"},
            "status": {"type": "string", "label": "Status"},
            "created_at": {"type": "datetime", "label": "Created At"},
        },
        "date_field": "booking_date",
        "groupable": ["project_name", "unit_type", "status"],
        "aggregatable": ["booking_amount", "agreement_value", "area_sqft"],
    },
    "tasks": {
        "model": "Task",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "title": {"type": "string", "label": "Title"},
            "task_type": {"type": "string", "label": "Type"},
            "status": {"type": "string", "label": "Status"},
            "priority": {"type": "string", "label": "Priority"},
            "due_date": {"type": "datetime", "label": "Due Date"},
            "assigned_to": {"type": "integer", "label": "Assigned To"},
            "created_at": {"type": "datetime", "label": "Created At"},
            "completed_at": {"type": "datetime", "label": "Completed At"},
        },
        "date_field": "created_at",
        "groupable": ["task_type", "status", "priority", "assigned_to"],
        "aggregatable": [],
    },
    "visits": {
        "model": "Visit",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "scheduled_date": {"type": "datetime", "label": "Scheduled Date"},
            "status": {"type": "string", "label": "Status"},
            "outcome": {"type": "string", "label": "Outcome"},
            "project_id": {"type": "integer", "label": "Project ID"},
            "agent_id": {"type": "integer", "label": "Agent ID"},
            "created_at": {"type": "datetime", "label": "Created At"},
        },
        "date_field": "scheduled_date",
        "groupable": ["status", "outcome", "project_id", "agent_id"],
        "aggregatable": [],
    },
    "invoices": {
        "model": "Invoice",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "invoice_number": {"type": "string", "label": "Invoice Number"},
            "invoice_date": {"type": "datetime", "label": "Invoice Date"},
            "due_date": {"type": "datetime", "label": "Due Date"},
            "customer_name": {"type": "string", "label": "Customer"},
            "project_name": {"type": "string", "label": "Project"},
            "total_amount": {"type": "number", "label": "Total Amount"},
            "paid_amount": {"type": "number", "label": "Paid Amount"},
            "balance_amount": {"type": "number", "label": "Balance"},
            "status": {"type": "string", "label": "Status"},
            "created_at": {"type": "datetime", "label": "Created At"},
        },
        "date_field": "invoice_date",
        "groupable": ["project_name", "status"],
        "aggregatable": ["total_amount", "paid_amount", "balance_amount"],
    },
    "payments": {
        "model": "Payment",
        "fields": {
            "id": {"type": "integer", "label": "ID"},
            "payment_number": {"type": "string", "label": "Payment Number"},
            "payment_date": {"type": "datetime", "label": "Payment Date"},
            "amount": {"type": "number", "label": "Amount"},
            "payment_method": {"type": "string", "label": "Method"},
            "created_at": {"type": "datetime", "label": "Created At"},
        },
        "date_field": "payment_date",
        "groupable": ["payment_method"],
        "aggregatable": ["amount"],
    },
}


@router.get("/builder/entities")
def get_report_entities(
    current_user: User = Depends(get_current_user),
):
    """Get available entities for report builder."""
    entities = []
    for key, config in ENTITY_CONFIG.items():
        entities.append({
            "name": key,
            "label": key.replace("_", " ").title(),
            "fields": [
                {"name": f, "label": props["label"], "type": props["type"]}
                for f, props in config["fields"].items()
            ],
            "groupable": config["groupable"],
            "aggregatable": config["aggregatable"],
        })
    return {"entities": entities}


def apply_filter(query, model, filter_obj: ReportFilter):
    """Apply a filter to a query."""
    field = getattr(model, filter_obj.field, None)
    if field is None:
        return query

    op = filter_obj.operator
    val = filter_obj.value

    if op == "eq":
        query = query.filter(field == val)
    elif op == "neq":
        query = query.filter(field != val)
    elif op == "gt":
        query = query.filter(field > val)
    elif op == "gte":
        query = query.filter(field >= val)
    elif op == "lt":
        query = query.filter(field < val)
    elif op == "lte":
        query = query.filter(field <= val)
    elif op == "contains":
        query = query.filter(field.ilike(f"%{val}%"))
    elif op == "in" and isinstance(val, list):
        query = query.filter(field.in_(val))
    elif op == "between" and isinstance(val, list) and len(val) == 2:
        query = query.filter(field.between(val[0], val[1]))

    return query


@router.post("/builder/run")
def run_custom_report(
    config: ReportConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run a custom report with the given configuration."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    if config.entity not in ENTITY_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unknown entity: {config.entity}")

    entity_cfg = ENTITY_CONFIG[config.entity]
    model = getattr(models, entity_cfg["model"], None)
    if model is None:
        raise HTTPException(status_code=500, detail="Model not found")

    # Start building query
    query = db.query(model).filter(model.organisation_id == organisation.id)

    # Apply date range filter
    date_field = getattr(model, entity_cfg["date_field"], None)
    if config.date_from and date_field is not None:
        try:
            from_dt = datetime.strptime(config.date_from, "%Y-%m-%d")
            query = query.filter(date_field >= from_dt)
        except ValueError:
            pass
    if config.date_to and date_field is not None:
        try:
            to_dt = datetime.strptime(config.date_to, "%Y-%m-%d")
            query = query.filter(date_field <= to_dt)
        except ValueError:
            pass

    # Apply custom filters
    for f in config.filters:
        query = apply_filter(query, model, f)

    # Filter out soft-deleted records if model has is_active
    if hasattr(model, "is_active"):
        query = query.filter(model.is_active == True)

    # Handle grouping and aggregations
    if config.group_by and config.group_by in entity_cfg["groupable"]:
        group_field = getattr(model, config.group_by)
        agg_results = []

        # Build aggregation query
        select_fields = [group_field.label("group_key"), func.count(model.id).label("count")]

        if config.aggregations and config.aggregate_field:
            agg_field = getattr(model, config.aggregate_field, None)
            if agg_field is not None:
                for agg in config.aggregations:
                    if agg == "sum":
                        select_fields.append(func.sum(agg_field).label("sum"))
                    elif agg == "avg":
                        select_fields.append(func.avg(agg_field).label("avg"))
                    elif agg == "min":
                        select_fields.append(func.min(agg_field).label("min"))
                    elif agg == "max":
                        select_fields.append(func.max(agg_field).label("max"))

        group_query = query.with_entities(*select_fields).group_by(group_field)
        rows = group_query.all()

        for row in rows:
            row_dict = {"group_key": row.group_key, "count": row.count}
            if hasattr(row, "sum"):
                row_dict["sum"] = float(row.sum) if row.sum else 0
            if hasattr(row, "avg"):
                row_dict["avg"] = float(row.avg) if row.avg else 0
            if hasattr(row, "min"):
                row_dict["min"] = float(row.min) if row.min else 0
            if hasattr(row, "max"):
                row_dict["max"] = float(row.max) if row.max else 0
            agg_results.append(row_dict)

        return {
            "type": "aggregated",
            "group_by": config.group_by,
            "aggregate_field": config.aggregate_field,
            "aggregations": config.aggregations,
            "data": agg_results,
            "total_groups": len(agg_results),
        }

    # Non-grouped query - return raw data
    # Apply sorting
    if config.sort_by:
        sort_field = getattr(model, config.sort_by, None)
        if sort_field is not None:
            query = query.order_by(desc(sort_field) if config.sort_order == "desc" else asc(sort_field))
    else:
        # Default sort by date field
        if date_field is not None:
            query = query.order_by(desc(date_field))

    # Limit results
    query = query.limit(config.limit)

    # Execute and format results
    records = query.all()
    data = []
    valid_fields = set(entity_cfg["fields"].keys())
    selected_fields = [f for f in config.fields if f in valid_fields] if config.fields else list(valid_fields)

    for record in records:
        row = {}
        for field in selected_fields:
            val = getattr(record, field, None)
            if isinstance(val, datetime):
                row[field] = val.isoformat()
            else:
                row[field] = val
        data.append(row)

    return {
        "type": "raw",
        "entity": config.entity,
        "fields": selected_fields,
        "data": data,
        "total": len(data),
    }


@router.post("/builder/export")
def export_custom_report(
    config: ReportConfig,
    format: str = Query("csv", pattern="^(csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export a custom report to CSV."""
    result = run_custom_report(config, db, current_user)

    output = StringIO()
    writer = csv.writer(output)

    if result["type"] == "aggregated":
        headers = ["group_key", "count"]
        if "sum" in result.get("aggregations", []):
            headers.append("sum")
        if "avg" in result.get("aggregations", []):
            headers.append("avg")
        if "min" in result.get("aggregations", []):
            headers.append("min")
        if "max" in result.get("aggregations", []):
            headers.append("max")
        writer.writerow(headers)
        for row in result["data"]:
            writer.writerow([row.get(h, "") for h in headers])
    else:
        fields = result["fields"]
        writer.writerow(fields)
        for row in result["data"]:
            writer.writerow([row.get(f, "") for f in fields])

    output.seek(0)
    filename = f"custom_report_{config.entity}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Saved Report Templates
@router.post("/templates", status_code=201)
def save_report_template(
    name: str = Body(..., embed=True),
    config: ReportConfig = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a report configuration as a template."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    template = models.ReportTemplate(
        organisation_id=organisation.id,
        name=name,
        entity=config.entity,
        config=config.model_dump_json(),
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return {"id": template.id, "name": template.name, "entity": template.entity}


@router.get("/templates")
def list_report_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List saved report templates."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    templates = db.query(models.ReportTemplate).filter(
        models.ReportTemplate.organisation_id == organisation.id,
        models.ReportTemplate.is_active == True
    ).order_by(models.ReportTemplate.created_at.desc()).all()

    result = []
    for t in templates:
        result.append({
            "id": t.id,
            "name": t.name,
            "entity": t.entity,
            "config": json.loads(t.config) if t.config else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {"templates": result}


@router.get("/templates/{template_id}")
def get_report_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific report template."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    template = db.query(models.ReportTemplate).filter(
        models.ReportTemplate.id == template_id,
        models.ReportTemplate.organisation_id == organisation.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return {
        "id": template.id,
        "name": template.name,
        "entity": template.entity,
        "config": json.loads(template.config) if template.config else None,
        "created_at": template.created_at.isoformat() if template.created_at else None,
    }


@router.delete("/templates/{template_id}")
def delete_report_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a report template."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    template = db.query(models.ReportTemplate).filter(
        models.ReportTemplate.id == template_id,
        models.ReportTemplate.organisation_id == organisation.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.is_active = False
    db.commit()
    return {"status": "deleted"}


def get_user_org(db: Session, user: User):
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


@router.get("/lead-funnel")
def lead_funnel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).all()

    statuses = {
        "new": 0,
        "contacted": 0,
        "site_visit": 0,
        "negotiation": 0,
        "booking": 0,
        "won": 0,
        "lost": 0,
    }
    for lead in leads:
        s = (lead.status or "").lower()
        if "new" in s:
            statuses["new"] += 1
        elif "contact" in s:
            statuses["contacted"] += 1
        elif "site" in s:
            statuses["site_visit"] += 1
        elif "negotiation" in s:
            statuses["negotiation"] += 1
        elif "book" in s:
            statuses["booking"] += 1
        elif "won" in s:
            statuses["won"] += 1
        elif "lost" in s:
            statuses["lost"] += 1
        else:
            statuses["new"] += 1

    total = len(leads)
    conversion_rate = round((statuses["won"] / total * 100), 2) if total else 0
    return {"total": total, "conversion_rate": conversion_rate, "funnel": statuses}


@router.get("/source-performance")
def source_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).all()

    by_source = {}
    for lead in leads:
        source = (lead.source or "unknown").strip() or "unknown"
        if source not in by_source:
            by_source[source] = {"source": source, "total": 0, "won": 0, "lost": 0}
        by_source[source]["total"] += 1
        status = (lead.status or "").lower()
        if "won" in status:
            by_source[source]["won"] += 1
        if "lost" in status:
            by_source[source]["lost"] += 1

    rows = []
    for item in by_source.values():
        total = item["total"]
        item["conversion_rate"] = round((item["won"] / total * 100), 2) if total else 0
        rows.append(item)
    rows.sort(key=lambda x: x["total"], reverse=True)
    return {"data": rows}


@router.get("/agent-performance")
def agent_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    members = db.query(models.OrgMembership).filter(
        models.OrgMembership.organisation_id == organisation.id,
        models.OrgMembership.is_active == True
    ).all()

    user_ids = [m.user_id for m in members]
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all() if user_ids else []
    rows = []
    for user in users:
        total = db.query(func.count(models.Lead.id)).filter(
            models.Lead.organisation_id == organisation.id,
            models.Lead.assigned_to == user.id,
            models.Lead.is_active == True
        ).scalar() or 0
        won = db.query(func.count(models.Lead.id)).filter(
            models.Lead.organisation_id == organisation.id,
            models.Lead.assigned_to == user.id,
            models.Lead.is_active == True,
            models.Lead.status.ilike("%won%")
        ).scalar() or 0
        if total == 0:
            continue
        rows.append({
            "user_id": user.id,
            "name": f"{user.first_name} {user.last_name or ''}".strip(),
            "email": user.email,
            "total_leads": int(total),
            "won_leads": int(won),
            "conversion_rate": round((won / total * 100), 2) if total else 0,
        })

    rows.sort(key=lambda x: x["total_leads"], reverse=True)
    return {"data": rows}


@router.get("/sales-summary")
def sales_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    from_dt = datetime.strptime(date_from, "%Y-%m-%d") if date_from else None
    to_dt = datetime.strptime(date_to, "%Y-%m-%d") if date_to else None

    booking_query = db.query(models.Booking).filter(models.Booking.organisation_id == organisation.id)
    invoice_query = db.query(models.Invoice).filter(models.Invoice.organisation_id == organisation.id)
    payment_query = db.query(models.Payment).filter(models.Payment.organisation_id == organisation.id)

    if from_dt:
        booking_query = booking_query.filter(models.Booking.booking_date >= from_dt)
        invoice_query = invoice_query.filter(models.Invoice.invoice_date >= from_dt)
        payment_query = payment_query.filter(models.Payment.payment_date >= from_dt)
    if to_dt:
        booking_query = booking_query.filter(models.Booking.booking_date <= to_dt)
        invoice_query = invoice_query.filter(models.Invoice.invoice_date <= to_dt)
        payment_query = payment_query.filter(models.Payment.payment_date <= to_dt)

    bookings = booking_query.count()
    booking_value = booking_query.with_entities(func.sum(models.Booking.agreement_value)).scalar() or 0
    invoiced = invoice_query.with_entities(func.sum(models.Invoice.total_amount)).scalar() or 0
    collected = payment_query.with_entities(func.sum(models.Payment.amount)).scalar() or 0
    outstanding = invoiced - collected

    return {
        "bookings": bookings,
        "booking_value": float(booking_value),
        "invoiced_amount": float(invoiced),
        "collected_amount": float(collected),
        "outstanding_amount": float(outstanding),
        "date_from": date_from,
        "date_to": date_to,
    }


@router.get("/export/leads")
def export_leads_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).order_by(models.Lead.created_at.desc()).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "email", "phone", "source", "status", "priority", "score", "assigned_to", "created_at"])
    for lead in leads:
        writer.writerow([
            lead.id,
            lead.name,
            lead.email or "",
            lead.phone or "",
            lead.source or "",
            lead.status or "",
            lead.priority or "",
            lead.score or 0,
            lead.assigned_to or "",
            lead.created_at.isoformat() if lead.created_at else "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )


@router.get("/export/contacts")
def export_contacts_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    contacts = db.query(models.Contact).filter(
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    ).order_by(models.Contact.created_at.desc()).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "first_name", "last_name", "email", "phone", "contact_type", "created_at"])
    for contact in contacts:
        writer.writerow([
            contact.id,
            contact.first_name or "",
            contact.last_name or "",
            contact.email or "",
            contact.phone or "",
            contact.contact_type or "",
            contact.created_at.isoformat() if contact.created_at else "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts_export.csv"}
    )
