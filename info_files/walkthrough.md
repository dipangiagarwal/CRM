# Pixel CRM Frontend Walkthrough

I have completely implemented the CRM frontend based on modern designs (inspired by Salesforce, HubSpot, Zoho, and Odoo), utilizing React, TypeScript, Tailwind CSS, and Zustand. 

> [!NOTE]
> The backend remains completely untouched, as requested. The frontend proxy points to `https://crm-3-p5xh.onrender.com/api/v1` to communicate with the existing backend APIs.

Here is a summary of the implementation:

## 1. Design System & Core Architecture
* **Dark-Mode Driven Interface:** Developed a sleek, cohesive dark mode color palette (`bg: #0F111A`, `surface: #1A1D27`, primary brand color `Indigo-500: #6366F1`) combined with elegant typography and subtle drop shadows for an exceptionally premium look.
* **Component Library:** Built from scratch. Reusable elements like `Button`, `StatCard`, `EmptyState`, `Avatar`, `Badge`, `SearchInput`, and fully interactive `Modal` overlays.
* **State Management:** Handled global UI state (Toasts, Sidebar toggles) and Auth Context via `Zustand`. Data fetching, caching, and cache invalidation are gracefully managed using `@tanstack/react-query`.
* **API SDK:** A robust object-oriented API layer mapping to all backend endpoints, completely typed with TypeScript. It includes an Axios interceptor to silently refresh authentication tokens.

## 2. Real-Time Interactions & Routing
* **Sockets:** Implemented a lightweight Socket.io client to listen for real-time `deal_won`, `payment_success`, and `payment_failed` updates.
* **Routing:** Protected routes ensure unauthenticated users are bumped to `/login` and un-onboarded users are directed to the onboarding/change-password workflow.

## 3. Major Implemented Pages & Workflows

### Authentication & Onboarding
* **Auth:** Fully functional forms for Login, Registration, Password Reset, and "Forgot Password". 
* **Workspace Creation:** Seamless multi-step process.

### The Dashboard
* Greet users dynamically.
* Animated KPI Cards with trend indicators (Total Contacts, Total Revenue, Win Rate).
* Real Recharts implementations: interactive Area charts for revenue trends, stacked/colored bars for pipeline staging, and activity summary comparison charts.

### Contacts Management
* **List View:** Table layout with search, lifecycle stage filters, custom sortable columns, and distinct visual lead scoring (progress bar metrics). 
* **Detail View:** Deep dive into contact history, logging calls/emails/notes via the Activity Timeline, and file attachment handling.

### Deals Pipeline
* **Kanban Board:** Smooth Drag-and-Drop functionality using `@hello-pangea/dnd` to move deals across stages (New → Qualified → Won, etc). Automatically calculates and displays pipeline value in real time.
* **List View Toggle:** An alternate data table layout.
* **Deal Details:** Drill down to update deal value, probability, expected close date, attached activities, and files.

### Activities & Analytics
* **Activities Feed:** Global timeline of all company interactions. Filters rapidly swap between Notes, Calls, Emails, and Meetings.
* **Reports:** Complex metric displays utilizing `recharts` to render comparative Radar Charts, Bar Charts, and monthly trends for deep data analysis.

### Admin Tools (Team & Billing)
* **Team:** Add, deactivate, change roles (Admin, Manager, Rep), and use the `Transfer Data` modal to safely reassign deals and contacts if someone leaves the organization.
* **Billing:** Interactive pricing tier tables (Starter, Growth, Enterprise) equipped with **Razorpay Checkout script integration**. Automatically loads the payment overlay when clicking to upgrade.
* **Settings:** Profile avatar updates, company logo updates, and password changes.

## Verification

The code successfully passes all strict TypeScript compilation checks (`tsc -b`), builds successfully, and the local dev server is running. You can navigate the UI by visiting your local port. 

> [!TIP]
> The frontend dev server is running. Visit `http://localhost:5173` (or the local port provided in your terminal) to experience the UI. Since it relies on the backend, ensure your backend server is running on `https://crm-3-p5xh.onrender.com`.
