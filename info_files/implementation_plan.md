# Pixel CRM — Full Frontend Implementation Plan

## Overview

Build a **production-grade CRM frontend** in the `e:\pixel_crm\frontend` directory using **React 18 + TypeScript + Tailwind CSS v3 + Zustand**. The UI will be modeled after Salesforce, HubSpot, Zoho, and Odoo — dark-themed, premium, and data-rich.

The backend runs at `http://localhost:8000` with `httpOnly` cookie-based auth (no localStorage tokens needed).

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Vite + React 18 | App framework |
| TypeScript | Type safety |
| Tailwind CSS v3 | Utility-first styling |
| Zustand | Global state (auth, UI) |
| React Query (TanStack) | Server state + caching |
| React Router v6 | Client-side routing |
| Recharts | Charts / Analytics |
| React Beautiful DnD | Kanban drag-and-drop |
| Socket.io Client | Real-time events |
| React Hook Form + Zod | Form validation |
| Axios | HTTP client |
| Lucide React | Icons |

---

## Pages & Routes

### Public Routes
| Route | Page | Description |
|---|---|---|
| `/login` | Login | Email + password, remember me |
| `/register` | Register | Company + admin user creation |
| `/forgot-password` | Forgot Password | Request reset link |
| `/reset-password` | Reset Password | Token-based password reset |

### Onboarding (post first-login)
| Route | Page | Description |
|---|---|---|
| `/onboarding` | Onboarding Wizard | Company name, industry, size (3-step) |
| `/change-password` | Change Password | Forced on first login (`tour_completed=false`) |

### Protected App Routes
| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard | KPI cards, charts, recent activity feed |
| `/contacts` | Contacts List | Table with search, filters, pagination |
| `/contacts/:id` | Contact Detail | Timeline, deals, files, activity log |
| `/contacts/new` | New Contact | Create contact form |
| `/deals` | Deals Pipeline | Kanban board by stage |
| `/deals/list` | Deals List | Table view with filters |
| `/deals/:id` | Deal Detail | Info, activities, files |
| `/deals/new` | New Deal | Create deal form |
| `/activities` | Activities | Feed of all activities with filters |
| `/reports` | Reports & Analytics | Revenue trend, pipeline chart, activity breakdown |
| `/team` | Team Management | User list, invite, roles, deactivate |
| `/settings` | Settings | Profile, org settings, logo upload |
| `/billing` | Billing | Plan info, payment history, upgrade |

---

## Directory Structure

```
frontend/
├── public/
│   └── pixel-crm-logo.svg
├── src/
│   ├── api/           # Axios instance + per-module API functions
│   │   ├── axios.ts
│   │   ├── auth.ts
│   │   ├── contacts.ts
│   │   ├── deals.ts
│   │   ├── activities.ts
│   │   ├── users.ts
│   │   ├── analytics.ts
│   │   ├── billing.ts
│   │   ├── organizations.ts
│   │   ├── files.ts
│   │   └── export.ts
│   ├── store/         # Zustand stores
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── hooks/         # React Query hooks (per module)
│   │   ├── useContacts.ts
│   │   ├── useDeals.ts
│   │   ├── useActivities.ts
│   │   ├── useUsers.ts
│   │   ├── useAnalytics.ts
│   │   └── useBilling.ts
│   ├── components/    # Reusable UI components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── forms/
│   │   │   ├── ContactForm.tsx
│   │   │   ├── DealForm.tsx
│   │   │   └── ActivityForm.tsx
│   │   └── charts/
│   │       ├── RevenueChart.tsx
│   │       ├── PipelineChart.tsx
│   │       └── ActivityChart.tsx
│   ├── pages/         # Route-level pages
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── onboarding/
│   │   │   ├── OnboardingPage.tsx
│   │   │   └── ChangePasswordPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── contacts/
│   │   │   ├── ContactsPage.tsx
│   │   │   └── ContactDetailPage.tsx
│   │   ├── deals/
│   │   │   ├── DealsKanbanPage.tsx
│   │   │   ├── DealsListPage.tsx
│   │   │   └── DealDetailPage.tsx
│   │   ├── activities/
│   │   │   └── ActivitiesPage.tsx
│   │   ├── reports/
│   │   │   └── ReportsPage.tsx
│   │   ├── team/
│   │   │   └── TeamPage.tsx
│   │   ├── settings/
│   │   │   └── SettingsPage.tsx
│   │   └── billing/
│   │       └── BillingPage.tsx
│   ├── types/         # TypeScript interfaces mirroring backend schemas
│   │   └── index.ts
│   ├── utils/         # Helpers (format currency, dates, etc.)
│   │   └── helpers.ts
│   ├── socket/        # Socket.io real-time client
│   │   └── socket.ts
│   ├── App.tsx        # Routes + ProtectedRoute guard
│   ├── main.tsx
│   └── index.css      # Tailwind base + custom design tokens
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Design System

**Dark theme** inspired by modern SaaS CRMs:

- **Background**: `#0F1117` (darkest) → `#1A1D27` (card) → `#242736` (elevated)
- **Accent**: `#6366F1` (indigo-violet primary)
- **Success**: `#10B981` (emerald)
- **Warning**: `#F59E0B` (amber)
- **Danger**: `#EF4444` (red)
- **Text**: `#F9FAFB` primary, `#9CA3AF` muted
- **Font**: Inter (Google Fonts)

Deal stage colors:
- New → indigo, Qualified → blue, Proposal → yellow, Negotiation → orange, Won → green, Lost → red

---

## Key Feature Implementation Details

### Auth Flow
1. Login → sets `httpOnly` cookies server-side
2. Axios sends `withCredentials: true` on all requests
3. On 401 → auto-call `/api/v1/auth/refresh` → retry original request
4. `tour_completed = false` → redirect to `/change-password`
5. `onboarding_completed = false` → redirect to `/onboarding`
6. Zustand `authStore` stores user meta (role, name, org)

### Contacts Page (like Salesforce)
- Data table with column sorting, search, lifecycle stage filter badges
- Lead score indicator (colored progress bar)
- Click row → Contact Detail page (side timeline of activities)
- Export CSV button
- Bulk select + actions (future-ready)

### Deals Pipeline (like HubSpot Kanban)
- 6-column kanban: New → Qualified → Proposal → Negotiation → Won → Lost
- Drag-and-drop cards between stages (calls PATCH `/deals/update_deal_stage/{id}/stage`)
- Deal card shows: title, value (₹), contact name, probability badge
- Quick create modal on column header
- Toggle to List view

### Dashboard (like Zoho CRM)
- 4 KPI stat cards: Total Contacts, Total Revenue, Win Rate, Active Deals
- Revenue trend line chart (6 months)
- Pipeline funnel chart by stage
- Activity summary bar chart (this week vs last week)
- Recent activities feed (right sidebar)

### Reports Page
- Date range selectors
- Revenue trend (Recharts AreaChart)
- Pipeline chart (Recharts BarChart)
- Activity breakdown (Recharts RadarChart or BarChart)

### Team Management (like Odoo Users)
- User cards with role badge, status dot
- Invite user modal (email, role, name)
- Bulk invite via CSV upload
- Role change dropdown (admin-only)
- Deactivate/Activate toggle

### Billing Page
- Current plan card with expiry date
- Upgrade plan buttons (Starter/Growth/Enterprise)
- Razorpay modal integration
- Payment history table

### Real-time (Socket.io)
- `deal_stage_changed` → toast notification
- `payment_update` → subscription activated toast
- `user_deactivated` → force logout

---

## Proposed Changes

### [NEW] `frontend/` (entire directory — currently empty)

All files listed in the directory structure above.

#### Key files:
- `package.json` — all deps
- `vite.config.ts` — proxy `/api` → `http://localhost:8000`
- `tailwind.config.ts` — custom dark theme colors
- `src/index.css` — Tailwind directives + custom CSS
- `src/api/axios.ts` — Axios instance with interceptors + refresh logic
- `src/store/authStore.ts` — Zustand auth state
- `src/App.tsx` — Routing tree + protected route guard
- All pages and components as listed

---

## Verification Plan

### Automated
- `npm run build` — TypeScript compile check, no errors

### Manual Verification
- Start backend → run `npm run dev` → app at `http://localhost:5173`
- Register a new org → redirect to change password → onboarding
- Login → Dashboard loads with charts
- Create contact → appears in contacts table
- Create deal → appears on kanban board
- Drag deal between stages → updates in real-time
- Export contacts CSV
- Invite team member
- Access billing page, view plan status

---

## Open Questions

> [!IMPORTANT]
> **Currency**: Backend stores `value` in plain numbers. Should I display as **₹ (INR)** everywhere since billing uses Razorpay/INR? I'll default to ₹.

> [!NOTE]
> **Socket.io**: The backend mounts socket.io at the same port (8000). I'll connect to `http://localhost:8000` with socket.io-client.

> [!NOTE]
> **Razorpay**: I'll integrate the Razorpay checkout modal on the Billing page. The `razorpay_key` is returned from the backend create-order endpoint.
