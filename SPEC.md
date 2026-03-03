# PropFlow CRM — Enterprise Real Estate CRM SaaS
## Product Specification Document v1.0

---

## 1. PRODUCT OVERVIEW

**PropFlow** is a multi-tenant enterprise SaaS CRM built specifically for real estate developers. It centralizes lead management, property inventory, sales pipeline, finance, and team collaboration into one unified platform — replacing fragmented tools like spreadsheets, WhatsApp groups, and disconnected portals.

### Target Users
- Real estate developers (primary org owner)
- Sales managers
- Sales executives / agents
- Finance team
- Site managers

### Business Model
- Per-seat pricing (monthly/annual)
- Org-level subscription with shared user pool
- Plans: Starter (up to 5 users), Growth (up to 20), Enterprise (unlimited)
- 14-day free trial, no credit card required

---

## 2. CORE ARCHITECTURE

### Tech Stack (Claude Code Friendly)
```
Frontend:     React 18 + TypeScript + Vite
Styling:      Tailwind CSS + shadcn/ui
State:        Zustand + React Query (TanStack)
Backend:      FastAPI (Python) — REST + WebSockets
Database:     PostgreSQL (primary) + Redis (cache/sessions)
Auth:         JWT + Refresh Tokens + OAuth2 (Google)
Storage:      S3-compatible (Cloudflare R2 / AWS S3)
Email:        Resend / SendGrid
Queue:        Celery + Redis (background jobs)
Infra:        Railway / Render (easy Claude Code deploy)
```

### Multi-Tenancy Model
```
Organisation (Tenant)
  └── Users (roles: owner, admin, manager, agent, finance, viewer)
  └── Projects (properties/developments)
  └── Leads → Contacts → Customers
  └── Pipeline Stages (customizable per org)
  └── Tasks & Activities
  └── Finance Records
  └── Inventory
```

### Database Schema Overview
```sql
-- Core tenancy
organisations, users, org_memberships, roles, permissions

-- CRM
contacts, leads, lead_activities, lead_sources
pipeline_stages, pipeline_deals

-- Projects & Inventory  
projects, towers, floors, units, unit_types, amenities

-- Tasks & Scheduling
tasks, site_visits, visit_slots, reminders

-- Finance
quotations, quotation_items, invoices, invoice_items
payments, payment_schedules, cost_sheets

-- Integrations
portal_connections, portal_leads, portal_sync_logs

-- Communication
notes, emails_sent, whatsapp_logs, notifications
```

---

## 3. FEATURE MODULES

---

### MODULE 1: AUTH & ORGANISATION SETUP

#### 1.1 Authentication
- Email/password signup with email verification
- Google OAuth login
- JWT access token (15 min) + refresh token (30 days)
- Forgot password / reset flow
- Session management (view & revoke active sessions)

#### 1.2 Organisation Onboarding
- Create org: name, type (developer/broker/both), RERA number
- Upload logo, cover image
- Set timezone, currency (INR default)
- Configure business hours
- GSTIN, PAN, address details (used in invoices/quotations)

#### 1.3 User Management
- Invite users via email (magic link)
- Role-based access control (RBAC):
  - **Owner**: Full access, billing
  - **Admin**: Full CRM + settings, no billing
  - **Manager**: Team view, reports, assign leads
  - **Agent**: Own leads/tasks only
  - **Finance**: Finance module only
  - **Viewer**: Read-only
- Bulk invite via CSV
- Deactivate/reactivate users
- Transfer lead ownership on deactivation

---

### MODULE 2: CONTACTS & LEADS

#### 2.1 Contact Management
- Full contact profile: name, phone(s), email(s), address, DOB
- Contact type: Prospect / Customer / Broker / Partner
- Tags and custom fields (org-defined)
- Merge duplicate contacts
- Import contacts via CSV / Excel
- Export contacts with filters
- Contact timeline: all activities, calls, visits, emails, notes
- Link multiple leads to one contact

#### 2.2 Lead Management
- Create lead manually or auto-capture from portals
- Lead fields:
  - Source (99acres, MagicBricks, Housing, walk-in, referral, website, etc.)
  - Project interest (multi-select)
  - Unit type preference (2BHK, 3BHK, etc.)
  - Budget range
  - Possession timeline
  - Priority (High/Medium/Low)
  - Assigned agent
- Lead scoring (auto + manual)
  - Auto score based on budget match, engagement, response time
- Lead duplication detection on phone/email
- Bulk assign leads to agents
- Lead aging alerts (no activity in X days)
- Lead source ROI tracking

#### 2.3 Lead Pipeline (Kanban + List View)
- Default stages: New → Contacted → Site Visit Scheduled → Site Visited → Negotiation → Booking → Closed Won / Closed Lost
- Fully customizable stage names, colors, order
- Drag-and-drop cards between stages
- Stage-wise conversion metrics
- Lost reason tracking (mandatory on Closed Lost)
- Reopen lost leads
- Pipeline filters: agent, project, source, date range, budget

#### 2.4 Lead to Contact/Customer Conversion
- One-click convert lead to contact
- Auto-create booking record on conversion
- Preserve all history and activities
- Assign unit from inventory on conversion

---

### MODULE 3: PORTAL INTEGRATIONS

#### 3.1 Supported Portals
- 99acres
- MagicBricks
- Housing.com
- NoBroker
- Sulekha
- PropTiger
- Facebook Lead Ads
- Google Lead Form Ads
- Website embed form (JS snippet)
- WhatsApp Business API (via Twilio / WATI)

#### 3.2 Integration Features
- OAuth / API key connection per portal
- Real-time lead sync (webhook) or scheduled pull (every 15 min)
- Field mapping (portal fields → PropFlow fields)
- Duplicate detection on sync
- Auto-assign rules: assign leads from portal X to agent Y
- Portal performance dashboard: leads per portal, cost per lead, conversion rate
- Sync logs with error tracking
- Manual re-sync option

---

### MODULE 4: PROJECTS & INVENTORY

#### 4.1 Project Management
- Create project: name, type (residential/commercial/mixed), RERA number
- Location: address, city, state, pin, lat/lng (map embed)
- Project status: Pre-launch / Launch / Under Construction / Ready to Move / Completed
- Master plan upload (PDF/image)
- Brochure upload
- Project gallery (images/videos)
- Amenities checklist
- Completion timeline / construction updates

#### 4.2 Inventory Management
```
Project
  └── Tower / Block (A, B, C...)
      └── Floor (1-N)
          └── Unit (101, 102...)
              ├── Type: 2BHK / 3BHK / Penthouse etc.
              ├── Area: carpet / built-up / super built-up (sq ft / sq mt)
              ├── Facing: North / South / East / West
              ├── Floor premium
              ├── Base price (per sq ft)
              ├── Derived price (auto-calculated)
              ├── Status: Available / Blocked / Booked / Registered / Sold
              └── Linked customer (if booked)
```
- Bulk unit upload via Excel template
- Inventory dashboard: color-coded floor plan view
- Unit status change with reason + timestamp log
- Hold unit (temporary block for X hours/days with auto-release)
- Unit comparison tool (compare 2-3 units side by side)
- Price list generation (Excel/PDF export)

---

### MODULE 5: TASKS & SCHEDULING

#### 5.1 Task Management
- Create task: title, description, due date/time, priority
- Task types: Follow-up call, Send document, Internal task, Approval
- Assign to self or team member
- Link task to lead / contact / project
- Recurring tasks
- Task completion with notes
- Overdue task alerts (in-app + email)
- Task dashboard: Today / Upcoming / Overdue

#### 5.2 Site Visit Scheduling
- Schedule visit from lead card (one click)
- Visit details: date, time, location (project), agent, remarks
- Visit slots management per project (available times)
- Send confirmation to customer:
  - Email with details + Google Maps link
  - WhatsApp message template
  - SMS (optional)
- Visit outcome: Interested / Not Interested / Follow-up Required / Booking
- Post-visit feedback form (auto-send to customer)
- Visit calendar view (per agent / per project)
- Conflict detection (agent double-booking)

#### 5.3 Follow-up System
- Auto-create follow-up task after every activity
- Follow-up sequences (e.g., Day 1 call → Day 3 email → Day 7 WhatsApp)
- Snooze lead (hide until date X)
- Daily digest email to agents: tasks due today

---

### MODULE 6: COMMUNICATION HUB

#### 6.1 Notes & Activity Log
- Rich text notes on any record
- @mention team members
- Pin important notes
- Attach files to notes (PDFs, images)
- Edit / delete own notes

#### 6.2 Email Integration
- Connect Gmail / Outlook via OAuth
- Send emails directly from lead/contact record
- Email templates with variables ({{name}}, {{project}}, {{unit}})
- Track email opens & clicks
- Email history on contact timeline
- Bulk email campaigns (to filtered lead segments)

#### 6.3 WhatsApp Integration
- WATI / Twilio WhatsApp Business API
- Send templates (pre-approved)
- Receive & log incoming messages
- Quick replies from within lead card
- Broadcast to lead segments

#### 6.4 Notifications
- In-app notification center
- Email notifications (configurable per user)
- Push notifications (PWA)
- Notification types: new lead assigned, task due, visit reminder, payment received, lead inactive

---

### MODULE 7: FINANCE MODULE

#### 7.1 Cost Sheet Builder
- Per-project cost sheet template
- Components: base price, floor premium, PLC (preferred location charges), parking, club membership, GST, stamp duty, registration
- Auto-calculate total based on unit selection
- Version history of cost sheets
- Approval workflow (agent → manager → finance)

#### 7.2 Quotation Management
- Generate quotation from lead/unit
- Quotation includes: unit details, cost breakup, validity date, T&Cs
- PDF generation with company branding
- Send via email / WhatsApp
- Status: Draft / Sent / Accepted / Rejected / Expired
- Revision history (v1, v2, v3...)
- Convert accepted quotation to invoice/booking

#### 7.3 Booking & Agreement
- Booking form: customer details, unit, booking amount, payment plan selected
- Booking confirmation letter (PDF, branded)
- Agreement for Sale tracking
- Document checklist (KYC, PAN, Aadhar, etc.)

#### 7.4 Invoice & Payment Tracking
- Create invoice from booking record
- Demand note generation (construction-linked / time-linked)
- Payment schedule: milestone-based or time-based
- Record payments: amount, date, mode (NEFT/RTGS/Cheque/UPI), reference
- Auto-send payment receipt
- Overdue payment alerts
- Customer payment portal (read-only view for customer)
- Finance dashboard:
  - Total receivables
  - Collected amount
  - Overdue amount
  - Collection efficiency %
  - Top debtors list
  - Monthly collection chart

#### 7.5 Reports
- Sales report (bookings by period, by project, by agent)
- Revenue report (invoiced vs collected)
- Lead funnel report
- Agent performance report
- Source ROI report
- Inventory status report
- Custom date range exports (PDF + Excel)

---

### MODULE 8: DASHBOARD & ANALYTICS

#### 8.1 Main Dashboard (Role-specific)
**Owner/Admin view:**
- Total leads, new today, in pipeline
- Conversion rate (leads → bookings)
- Revenue: invoiced, collected, outstanding
- Active projects with unit availability
- Top performing agents
- Lead source breakdown (donut chart)
- Activity feed (org-wide)

**Agent view:**
- My leads today
- Tasks due today / overdue
- My pipeline
- My visits scheduled
- Recent activities

#### 8.2 Advanced Analytics
- Lead velocity (time in each stage)
- Drop-off analysis (where leads fall off)
- Agent leaderboard
- Project-wise sales performance
- Cohort analysis (leads from month X → conversion)
- Custom report builder (drag fields, group by, filter)

---

### MODULE 9: SETTINGS & ADMINISTRATION

- Organisation profile & branding
- Custom pipeline stages
- Custom fields (leads, contacts, projects)
- Lead source management
- Email templates library
- WhatsApp template management
- Notification preferences
- Working hours & holidays
- Data import / export
- Audit log (who did what, when)
- API access (generate API keys for external integrations)
- Billing & subscription management
- Plan upgrade/downgrade
- Invoice history

---

## 4. TECHNICAL ARCHITECTURE

### Backend Structure (FastAPI)
```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── auth/
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── organisations/
│   ├── users/
│   ├── contacts/
│   ├── leads/
│   ├── pipeline/
│   ├── projects/
│   ├── inventory/
│   ├── tasks/
│   ├── visits/
│   ├── finance/
│   │   ├── quotations/
│   │   ├── invoices/
│   │   └── payments/
│   ├── integrations/
│   │   ├── portals/
│   │   └── webhooks/
│   ├── communications/
│   ├── reports/
│   ├── notifications/
│   ├── background/
│   │   └── tasks.py (Celery)
│   └── utils/
│       ├── pdf.py
│       ├── excel.py
│       ├── email.py
│       └── storage.py
├── migrations/ (Alembic)
├── tests/
└── requirements.txt
```

### Frontend Structure (React + TypeScript)
```
frontend/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── store.ts (Zustand)
│   │   └── queryClient.ts
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── contacts/
│   │   ├── pipeline/
│   │   ├── projects/
│   │   ├── inventory/
│   │   ├── tasks/
│   │   ├── finance/
│   │   ├── reports/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── layout/
│   │   ├── crm/
│   │   ├── finance/
│   │   └── charts/
│   ├── hooks/
│   ├── services/ (API calls)
│   ├── types/
│   └── utils/
├── public/
└── index.html
```

### API Design Pattern
```
GET    /api/v1/leads              → list with filters/pagination
POST   /api/v1/leads              → create
GET    /api/v1/leads/{id}         → detail
PATCH  /api/v1/leads/{id}         → update
DELETE /api/v1/leads/{id}         → soft delete
POST   /api/v1/leads/{id}/convert → convert to contact
GET    /api/v1/leads/{id}/timeline→ activity timeline

All endpoints:
- Require Authorization: Bearer <token>
- Scope to org via middleware (X-Org-ID or JWT claim)
- Return: { data, meta: { total, page, per_page } }
- Errors: { error, message, details }
```

---

## 5. IMPLEMENTATION PHASES

### Phase 1 — Foundation (Week 1-2)
**Goal: Working auth + org setup + basic lead management**
- [ ] Project scaffold (FastAPI + React + PostgreSQL)
- [ ] Auth: signup, login, JWT, refresh
- [ ] Organisation create + onboarding flow
- [ ] User invite + RBAC middleware
- [ ] Basic contacts CRUD
- [ ] Basic leads CRUD
- [ ] Lead list + detail view
- [ ] Simple dashboard skeleton

### Phase 2 — CRM Core (Week 3-4)
**Goal: Full pipeline + tasks**
- [ ] Pipeline kanban board (drag-and-drop)
- [ ] Lead scoring
- [ ] Activity timeline
- [ ] Task management
- [ ] Site visit scheduling
- [ ] Notes + @mentions
- [ ] Basic notifications

### Phase 3 — Projects & Inventory (Week 5-6)
**Goal: Full inventory management**
- [ ] Project CRUD + media upload
- [ ] Tower/Floor/Unit structure
- [ ] Inventory grid view (color-coded)
- [ ] Unit hold/book/sell flow
- [ ] Unit bulk upload (Excel)
- [ ] Price list generator

### Phase 4 — Finance (Week 7-8)
**Goal: Quotation to payment**
- [ ] Cost sheet builder
- [ ] Quotation generator + PDF
- [ ] Invoice creation + PDF
- [ ] Payment recording + schedule
- [ ] Finance dashboard
- [ ] Overdue alerts

### Phase 5 — Integrations (Week 9-10)
**Goal: Portal connections + communication**
- [ ] Website lead form embed
- [ ] Facebook Lead Ads webhook
- [ ] 99acres / MagicBricks API (where available)
- [ ] Email integration (Gmail/Outlook)
- [ ] WhatsApp via WATI
- [ ] Portal performance dashboard

### Phase 6 — Analytics & Polish (Week 11-12)
**Goal: Reports + enterprise readiness**
- [ ] Custom report builder
- [ ] Advanced analytics charts
- [ ] Audit logs
- [ ] Bulk operations (import/export)
- [ ] Mobile responsive polish
- [ ] Performance optimization
- [ ] API documentation
- [ ] Billing integration (Razorpay/Stripe)

---

## 6. CLAUDE CODE SETUP INSTRUCTIONS

### Prerequisites
```bash
# Install
brew install postgresql redis python@3.11 node@20

# Clone & setup
git clone <repo>
cd propflow

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, SECRET_KEY, etc.
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local
# Fill in VITE_API_URL
npm run dev
```

### Environment Variables
```env
# Backend .env
DATABASE_URL=postgresql://user:pass@localhost/propflow
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# Email
RESEND_API_KEY=
FROM_EMAIL=noreply@propflow.in

# Storage
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ENDPOINT=

# WhatsApp (optional)
WATI_API_URL=
WATI_API_TOKEN=

# Frontend .env.local
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=PropFlow
```

---

## 7. KEY DIFFERENTIATORS

1. **India-first**: INR, RERA compliance, Indian portal integrations, GST invoicing
2. **Inventory-aware CRM**: Unit-level tracking directly tied to leads — not just a generic CRM
3. **Portal aggregation**: All leads from 99acres, MagicBricks, Housing in one inbox
4. **Finance depth**: Full demand note → invoice → collection cycle, not just basic invoicing
5. **Construction linked payments**: Milestone-based payment tracking tied to construction progress
6. **Site visit orchestration**: Full visit lifecycle from scheduling to outcome to follow-up
7. **WhatsApp-native**: WhatsApp is primary communication channel for Indian real estate
8. **Offline-capable PWA**: Agents on site can still access and update records
9. **No-code customization**: Custom fields, pipeline stages, templates without developer help
10. **Audit trail**: Full immutable log for compliance and dispute resolution

---

## 8. MONETIZATION

### Pricing Tiers
| Plan | Users | Projects | Price/user/month |
|------|-------|----------|-----------------|
| Starter | Up to 5 | 2 | ₹999 |
| Growth | Up to 20 | 10 | ₹799 |
| Scale | Up to 50 | Unlimited | ₹649 |
| Enterprise | Unlimited | Unlimited | Custom |

### Add-ons
- WhatsApp integration: ₹2,999/month
- Portal integrations: ₹1,999/month per portal
- Custom domain: ₹999/month
- Dedicated support: ₹4,999/month

### Revenue Projections (Year 1)
- Target: 100 orgs × avg 8 users × ₹799 = ₹6.4L/month ARR
- Year 1 target ARR: ₹75L

---

## 9. FUTURE ROADMAP

- **Mobile apps** (React Native — iOS + Android)
- **AI lead scoring** (ML model on conversion history)
- **AI assistant** (natural language query: "show me hot leads from 99acres this week")
- **Virtual tours** integration (Matterport / custom 3D)
- **Construction progress tracking** (photo timeline per tower/floor)
- **Broker portal** (separate login for channel partners)
- **Customer portal** (self-service: payment status, documents, construction updates)
- **Legal module** (agreement drafting, stamp duty calculator)
- **Post-handover CRM** (maintenance requests, society management)
- **Marketplace** (connect developers with brokers)

---

*Document version: 1.0 | Created: February 2026*
*Product: PropFlow CRM | Target Market: Indian Real Estate*
