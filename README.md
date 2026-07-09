# 🚀 Pixel CRM

> **A Multi-Tenant SaaS Customer Relationship Management Platform**  
> Built with FastAPI · PostgreSQL · React 18 · Redis · Celery · Socket.IO

---

## ✨ What is Pixel CRM?

Pixel CRM is a **production-grade, cloud-native CRM platform** designed for small and medium-sized businesses. Multiple independent companies (tenants) can register and manage their contacts, deals, team, and billing — all on a single shared backend with complete data isolation.

---

## 🧱 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI · SQLAlchemy (Async) · Alembic · Python 3.11 |
| **Database** | PostgreSQL (Supabase) · Redis (Upstash) |
| **Task Queue** | Celery · Celery Beat |
| **Real-time** | Socket.IO |
| **Frontend** | React 18 · TypeScript · Tailwind CSS · Zustand · Recharts |
| **Payments** | Razorpay |
| **Storage** | BackBlaze B2 |
| **Email** | Brevo HTTPS API |
| **Deployment** | Render (backend) · Vercel (frontend) |

---

## 🔑 Key Features

- 🏢 **Multi-tenancy** — org_id isolation on every table, zero data leakage between companies
- 👤 **Auth** — JWT in httpOnly cookies, refresh tokens, rate limiting, forgot/reset password
- 📋 **Contacts** — lead lifecycle tracking, custom fields (JSONB), CSV export
- 📊 **Deal Pipeline** — Kanban board with drag-drop, real-time stage updates via Socket.IO
- 📝 **Activities** — log calls, emails, meetings, notes, tasks, messages
- 👥 **Team Management** — role-based access (Admin/Manager/Rep/Viewer), bulk CSV invite
- 💳 **Billing** — Razorpay integration, grace period logic, webhook-verified payments
- 📈 **Analytics** — revenue trends, pipeline by stage, activity summary
- ⚡ **Real-time** — live Kanban updates, payment notifications, force-logout on deactivation
- 📧 **Email Automation** — welcome, invite, reset, receipt, grace-period emails via Celery

---

## 🗂️ Project Structure

```
pixel_crm/
├── backend/
│   ├── app/
│   │   ├── routers/        # auth, contacts, deals, activities, users, billing...
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── services/       # B2 storage service
│   │   ├── sockets/        # Socket.IO server
│   │   ├── tasks/          # Celery tasks (email, subscription)
│   │   └── utils/          # JWT, Redis, security helpers
│   ├── alembic/            # Database migrations
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/            # Axios + per-module API functions
        ├── store/          # Zustand stores
        ├── hooks/          # React Query hooks
        ├── pages/          # Route-level pages
        └── components/     # UI components, charts, forms
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis running locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create .env (see .env.example)
cp .env.example .env

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### Celery (in separate terminals)

```bash
# Worker
celery -A app.tasks.celery_app.celery_app worker --loglevel=info

# Beat scheduler
celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 🌍 Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=your_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://localhost:6379/0
PLATFORM_ADMIN_KEY=your_admin_key
ENVIRONMENT=development

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pixel-crm-files

# Email (Brevo)
BREVO_API_KEY=...
FROM_EMAIL=noreply@yourdomain.com

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `organizations` | Tenant companies — plan, billing, status |
| `users` | Team members with roles |
| `contacts` | Leads and customers with lifecycle stage |
| `deals` | Sales pipeline deals |
| `activities` | Calls, emails, meetings, tasks |
| `billing` | Payment records linked to Razorpay |
| `files` | Attachments stored in Cloudflare R2 |
| `audit_log` | Security and compliance audit trail |

---

## 📡 API Endpoints (key ones)

```
POST   /api/v1/auth/register          Register new org + admin
POST   /api/v1/auth/login             Login → sets httpOnly cookies
POST   /api/v1/auth/forgot-password   Send reset link
GET    /api/v1/contacts               List contacts (paginated)
PATCH  /api/v1/contacts/{id}/assign   Reassign lead to team member
POST   /api/v1/deals                  Create deal
PATCH  /api/v1/deals/{id}/stage       Move deal stage (+ Socket.IO event)
POST   /api/v1/users/bulk-invite      Bulk invite via CSV
POST   /api/v1/billing/create-order   Create Razorpay order
GET    /api/v1/analytics/overview     Dashboard KPIs
GET    /api/v1/export/contacts        Download contacts CSV
```

Full interactive docs available at `/docs` (Swagger UI).

---

## 🔒 Security Highlights

- JWT stored in **httpOnly cookies** (not localStorage) — XSS proof
- **Refresh token blacklisting** in Redis on logout
- **Rate limiting** on auth endpoints via Redis
- **HMAC-SHA256** Razorpay webhook verification
- **CORS** restricted to frontend origin only
- **bcrypt** password hashing
- `org_id` always derived from JWT claims, never from user input

---

## 🚀 Deployment

| Service | Provider |
|---------|----------|
| Backend + Celery | [Render](https://render.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Redis | [Upstash](https://upstash.com) |
| File Storage | [Backblaze B2](https://www.backblaze.com/cloud-storage) |
| Email | [Brevo](https://brevo.com) (HTTPS API — no SMTP port issues) |
| Frontend | [Vercel](https://vercel.com) |

---

## 👩‍💻 Author

**Dipangi Agarwal**  
B.Tech CSE · JECRC University, Jaipur (2022-2026)
Internship at **Pixel Genix IT Solutions** · (Feb–Jun 2026)
Guide: Ms. Veena Kanwar (Founder, Pixel Genix IT Solutions)

---

## 📄 License

MIT License — feel free to use this project as a reference.
