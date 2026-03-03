from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

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

app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Real Estate CRM API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(org_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(contacts_router, prefix="/api/v1")
app.include_router(leads_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(pipeline_router, prefix="/api/v1")
app.include_router(activities_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(visits_router, prefix="/api/v1")
app.include_router(notes_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(finance_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "PropFlow CRM API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
