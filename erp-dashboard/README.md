# Circle ERP Dashboard

A modern ERP web application built with React + Vite, Tailwind CSS, React Router, Axios, Recharts, and Lucide icons. Inspired by modern SaaS ERP systems (Odoo, Zoho, SAP Fiori).

## Getting Started

```bash
npm install
npm run dev
```

The app expects an API Gateway running at `http://localhost:3000` (see the `EAI-KLP1` backend repo: gateway + pos/inventory/ecommerce/crm/accounting microservices).

## Modules

- **Dashboard** — KPI cards, revenue trend, customer tier distribution, inventory status, and service health
- **Sales** (`/sales`) — POS transactions table with search, sort, pagination, and "New Transaction" dialog
- **Inventory** (`/inventory`) — Product stock table with low-stock badges and restock dialog
- **E-Commerce** (`/ecommerce`) — Products & Orders tabs with "Create Order" dialog
- **CRM** (`/customers`) — Customer table with tier badges and a detail drawer (profile, loyalty points, spending history)
- **Accounting** (`/accounting`) — Journal entries table with "View XML" syntax-highlighted modal
- **Reports** (`/reports`) — Analytical charts: revenue trend, tier distribution, inventory status, order statistics
- **System Monitor** (`/system`) — Live service health cards, auto-refreshing every 30 seconds

## Folder Structure

```
src/
├── components/   # Sidebar, TopNav, KpiCard, Dialog, Drawer, TierBadge, PageHeader
├── layouts/       # MainLayout (sidebar + topnav shell)
├── pages/         # One page per module
├── services/       # Centralized Axios instance + API calls
├── routes/         # React Router configuration
```
