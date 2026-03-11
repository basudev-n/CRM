from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_sqlite_compatibility() -> None:
    """
    Patch older local SQLite schemas to match current models.
    This keeps development DBs usable without blocking runtime endpoints.
    """
    if engine.url.get_backend_name() != "sqlite":
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    expected_columns = {
        "activities": [("metadata", "TEXT")],
        "notes": [("contact_id", "INTEGER")],
        "notifications": [("notification_type", "VARCHAR(50) DEFAULT 'lead_assigned'"), ("metadata", "TEXT")],
    }

    with engine.begin() as conn:
        for table, columns in expected_columns.items():
            if table not in tables:
                continue
            existing = {col["name"] for col in inspector.get_columns(table)}
            for column_name, ddl in columns:
                if column_name in existing:
                    continue
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_name} {ddl}"))

        if "notifications" in tables:
            conn.execute(
                text(
                    "UPDATE notifications "
                    "SET notification_type = 'lead_assigned' "
                    "WHERE notification_type IS NULL OR notification_type = ''"
                )
            )

        # Ensure audit_logs exists for phase-6 audit trail.
        if "audit_logs" not in tables:
            conn.execute(
                text(
                    """
                    CREATE TABLE audit_logs (
                        id INTEGER PRIMARY KEY,
                        organisation_id INTEGER NOT NULL,
                        user_id INTEGER NULL,
                        action VARCHAR(255) NOT NULL,
                        entity_type VARCHAR(100) NOT NULL,
                        entity_id INTEGER NULL,
                        endpoint VARCHAR(500) NOT NULL,
                        method VARCHAR(10) NOT NULL,
                        status_code INTEGER NOT NULL,
                        ip_address VARCHAR(100) NULL,
                        user_agent VARCHAR(500) NULL,
                        details TEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(organisation_id) REFERENCES organisations(id),
                        FOREIGN KEY(user_id) REFERENCES users(id)
                    )
                    """
                )
            )


def ensure_runtime_tables() -> None:
    """Create runtime tables that may not exist in older environments."""
    from app import models
    Base.metadata.create_all(
        bind=engine,
        tables=[models.AuditLog.__table__, models.QuotationShare.__table__],
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
