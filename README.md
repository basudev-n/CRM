# PropFlow CRM

Enterprise Real Estate CRM SaaS built with FastAPI + React

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic
- **Auth**: JWT with access + refresh tokens

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand
- **Data Fetching**: TanStack React Query

## Prerequisites

```bash
# Install required tools
brew install postgresql@15 node@20 python@3.11

# Start PostgreSQL
brew services start postgresql
```

## Setup Guide

### 1. Clone and Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your settings (DATABASE_URL, SECRET_KEY, etc.)

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

The backend will run at `http://localhost:8000`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The frontend will run at `http://localhost:5173`

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/propflow
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
RESEND_API_KEY=
FROM_EMAIL=noreply@propflow.in
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=PropFlow
```

## Features (Phase 1)

- User signup and authentication with JWT
- Organisation creation and onboarding
- User invite system with RBAC (owner, admin, manager, agent, finance, viewer)
- Leads CRUD with pagination and filters
- Contacts CRUD
- Dashboard with stats

## API Endpoints

### Auth
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Organisations
- `POST /api/v1/organisations` - Create organisation
- `GET /api/v1/organisations/me` - Get current organisation
- `GET /api/v1/organisations/me/members` - List members

### Users
- `POST /api/v1/users/invite` - Invite user
- `GET /api/v1/users/` - List organisation users
- `PATCH /api/v1/users/{id}/role` - Update user role

### Leads
- `GET /api/v1/leads` - List leads (with pagination/filters)
- `POST /api/v1/leads` - Create lead
- `GET /api/v1/leads/{id}` - Get lead
- `PATCH /api/v1/leads/{id}` - Update lead
- `DELETE /api/v1/leads/{id}` - Delete lead

### Contacts
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact
- `GET /api/v1/contacts/{id}` - Get contact
- `PATCH /api/v1/contacts/{id}` - Update contact
- `DELETE /api/v1/contacts/{id}` - Delete contact

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/dashboard/activity` - Get recent activity

## Development

```bash
# Run backend tests
cd backend
pytest

# Build frontend
cd frontend
npm run build
```

## License

MIT
