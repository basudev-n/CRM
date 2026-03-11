from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError
import os
from app.config import settings
from app.database import ensure_runtime_tables, ensure_sqlite_compatibility, SessionLocal

# Import routers
from app.auth.router import router as auth_router
from app.organisations.router import router as org_router
from app.users.router import router as users_router
from app.contacts.router import router as contacts_router
from app.leads.router import router as leads_router
from app.dashboard.router import router as dashboard_router
from app.pipeline.router import router as pipeline_router
from app.activities.router import router as activities_router
from app.tasks.router import router as tasks_router
from app.visits.router import router as visits_router
from app.notes.router import router as notes_router
from app.notifications.router import router as notifications_router
from app.finance.router import router as finance_router
from app.projects.router import router as projects_router
from app.inventory.router import router as inventory_router
from app.reports.router import router as reports_router
from app.audit_logs.router import router as audit_logs_router
from app.billing.router import router as billing_router
from app import models

# OpenAPI Tags for API Documentation
tags_metadata = [
    {
        "name": "Authentication",
        "description": "User registration, login, and token management. Handles JWT-based authentication.",
    },
    {
        "name": "Organisation",
        "description": "Organisation management including creation, settings, and team configuration.",
    },
    {
        "name": "Users",
        "description": "User management, invitations, role assignments, and onboarding status.",
    },
    {
        "name": "Contacts",
        "description": "Contact management - create, update, delete, and search contacts with filtering.",
    },
    {
        "name": "Leads",
        "description": "Lead management including pipeline stages, lead scoring, and status tracking.",
    },
    {
        "name": "Projects",
        "description": "Real estate project management with unit inventory and media galleries.",
    },
    {
        "name": "Inventory",
        "description": "Property inventory and unit management within projects.",
    },
    {
        "name": "Pipeline",
        "description": "Sales pipeline and deal management with stage transitions.",
    },
    {
        "name": "Tasks",
        "description": "Task creation, assignment, and tracking with due dates and priorities.",
    },
    {
        "name": "Visits",
        "description": "Site visit scheduling and tracking for property showings.",
    },
    {
        "name": "Activities",
        "description": "Activity logging including calls, emails, meetings, and custom activities.",
    },
    {
        "name": "Notes",
        "description": "Notes management for leads, contacts, and other entities.",
    },
    {
        "name": "Finance",
        "description": "Financial management including invoices, payments, payment schedules, and commission tracking.",
    },
    {
        "name": "Reports",
        "description": "Reporting and analytics with custom report builder and export functionality.",
    },
    {
        "name": "Dashboard",
        "description": "Dashboard metrics, KPIs, and activity summaries.",
    },
    {
        "name": "Notifications",
        "description": "User notifications management and preferences.",
    },
    {
        "name": "Audit Logs",
        "description": "System audit trail for compliance and activity tracking.",
    },
    {
        "name": "Billing",
        "description": "Subscription management, plans, and payment processing via Razorpay.",
    },
]

app = FastAPI(
    title=settings.APP_NAME,
    description="""
# PropFlow CRM API

Enterprise-grade Real Estate CRM API built with FastAPI.

## Features

- **Multi-tenant Architecture**: Organisation-based data isolation
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Owner, Admin, Manager, Agent roles
- **Lead Management**: Full lead lifecycle with pipeline stages
- **Project Management**: Real estate projects with inventory tracking
- **Financial Module**: Invoices, payments, and commissions
- **Custom Reports**: Dynamic report builder with export options
- **Audit Logging**: Complete activity trail for compliance

## Authentication

All API endpoints (except `/auth/*`) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Rate Limiting

API requests are rate-limited per user/organisation. Contact support for enterprise limits.

## Pagination

List endpoints support pagination with `skip` and `limit` parameters:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100)

## Filtering

Most list endpoints support filtering via query parameters specific to each entity type.
""",
    version="1.0.0",
    openapi_tags=tags_metadata,
    contact={
        "name": "PropFlow Support",
        "email": "support@propflow.com",
    },
    license_info={
        "name": "Proprietary",
    },
)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"])
app.include_router(org_router, prefix="/api/v1", tags=["Organisation"])
app.include_router(users_router, prefix="/api/v1", tags=["Users"])
app.include_router(contacts_router, prefix="/api/v1", tags=["Contacts"])
app.include_router(leads_router, prefix="/api/v1", tags=["Leads"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["Dashboard"])
app.include_router(pipeline_router, prefix="/api/v1", tags=["Pipeline"])
app.include_router(activities_router, prefix="/api/v1", tags=["Activities"])
app.include_router(tasks_router, prefix="/api/v1", tags=["Tasks"])
app.include_router(visits_router, prefix="/api/v1", tags=["Visits"])
app.include_router(notes_router, prefix="/api/v1", tags=["Notes"])
app.include_router(notifications_router, prefix="/api/v1", tags=["Notifications"])
app.include_router(finance_router, prefix="/api/v1", tags=["Finance"])
app.include_router(projects_router, prefix="/api/v1", tags=["Projects"])
app.include_router(inventory_router, prefix="/api/v1", tags=["Inventory"])
app.include_router(reports_router, prefix="/api/v1", tags=["Reports"])
app.include_router(audit_logs_router, prefix="/api/v1", tags=["Audit Logs"])
app.include_router(billing_router, prefix="/api/v1", tags=["Billing"])


@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    response = await call_next(request)

    if request.method not in {"POST", "PATCH", "DELETE"}:
        return response
    if not request.url.path.startswith("/api/v1"):
        return response
    if request.url.path.startswith("/api/v1/auth"):
        return response

    try:
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return response

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return response

        db = SessionLocal()
        try:
            membership = db.query(models.OrgMembership).filter(
                models.OrgMembership.user_id == int(user_id),
                models.OrgMembership.is_active == True
            ).first()
            if not membership:
                return response

            path_parts = [p for p in request.url.path.split("/") if p]
            entity_type = path_parts[2] if len(path_parts) > 2 else "unknown"
            entity_id = None
            for p in reversed(path_parts):
                if p.isdigit():
                    entity_id = int(p)
                    break

            log = models.AuditLog(
                organisation_id=membership.organisation_id,
                user_id=int(user_id),
                action=f"{request.method} {entity_type}",
                entity_type=entity_type,
                entity_id=entity_id,
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                ip_address=request.client.host if request.client else None,
                user_agent=(request.headers.get("user-agent") or "")[:500],
                details=f"query={request.url.query}" if request.url.query else None,
            )
            db.add(log)
            db.commit()
        finally:
            db.close()
    except (JWTError, ValueError, TypeError):
        pass
    except Exception:
        pass

    return response


@app.get("/")
def root():
    return {"message": "PropFlow CRM API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
def startup_compatibility_fixes():
    try:
        ensure_sqlite_compatibility()
        ensure_runtime_tables()
    except Exception as e:
        print(f"Startup DB check warning (non-fatal): {e}")
