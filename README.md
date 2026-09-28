# Garment ERP — Frontend

Frontend for the Garment ERP used by SM Enterprises and Mahindra Gupta & Company (one system, two companies). It covers masters, brand projections and material planning, sales and order tracking, purchasing, GRN and quality control, lot-wise stock, production, dispatch, invoices, barcodes, export documentation, and reports with Excel import/export. Built with Next.js (App Router), React, and Tailwind CSS.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- ESLint (`eslint-config-next`)

## Prerequisites

- Node.js 20+ and npm
- A running instance of the ERP backend API, set up per the backend README (migrations, seeds and a first admin user). This app is a pure frontend — see [Environment Variables](#environment-variables).

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the example env file and point it at your backend API:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` so `NEXT_PUBLIC_API_URL` matches the backend's `PORT` (the example file uses `5000`, the backend's default).

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to `/login`; sign in with the admin user created during backend setup.

## Environment Variables

| Variable               | Description                                   | Default (if unset)         |
| ----------------------- | ---------------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`  | Base URL of the backend REST API, ending in `/api` | `http://localhost:5001/api` |

All variables are read at build/runtime via `process.env` (see [`lib/api-client.js`](lib/api-client.js)). Since `NEXT_PUBLIC_API_URL` is prefixed with `NEXT_PUBLIC_`, it is exposed to the browser.

If it is unset, the app falls back to port **5001** while the backend defaults to **5000** — always set it explicitly.

Uploaded files (format images, company logo, export checklist files) and printable PDFs come from the backend: file links are built as `<API host>/storage/<path>` from the same variable, so no extra setting is needed whether the backend stores files locally or in Cloudflare R2 / Amazon S3.

## Available Scripts

| Command         | Description                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`   | Start the development server              |
| `npm run build` | Create a production build                 |
| `npm run start` | Serve the production build                 |
| `npm run lint`  | Run ESLint                                 |

## Project Structure

```
app/                     App Router pages (routes)
  dashboard/              Dashboard
  login/                  Login page
  masters/                Master data: agents, brands (+ product specifications),
                           buyers, categories, fob-values, formats, jobbers,
                           markups, material types, products, suppliers, UOMs
  planning/               Brand projections, material requirements, material plans
  sales/                  Inquiries, order confirmations (order tracking, allocation)
  procurement/            Purchase orders, GRNs, inward entries, lots, supplier returns
  quality-control/        Quality inspections
  inventory/              Stock, stock ledger, stock locations
  production/             Material issues, processing
  dispatch/               Stock and direct supplier dispatches
  barcode/                Barcodes, labels, scanning, scan history
  finance/                Proforma invoices, invoices, debit notes, agent commission,
                           buyer receipts, purchase bills, supplier payments
  export/                 Export documents, packing
  reports/                Reports, Excel import, lot traceability, outstanding
  user-management/        Users, roles, permissions
  administration/         Companies, company profile

components/               Reusable UI and feature components, mirrored by domain
  layout/                 Header, Sidebar, DashboardLayout
  ui/                     Generic UI primitives (Card, Badge, Pagination, ...)

hooks/
  useAuth.js               Auth/session hook (login, logout, permission checks)

lib/
  api-client.js            Fetch wrapper (auth headers, error/401 handling, file downloads)
```

## Authentication

Auth is token-based: `useAuth` (in [`hooks/useAuth.js`](hooks/useAuth.js)) stores a JWT in `localStorage` under `auth_token`, attaches it as a `Bearer` token to API requests via `apiClient`, and redirects to `/login` on missing/expired sessions (401 responses). Permission checks (`can`, `canAny`) are derived from the roles/permissions returned by `/auth/me`.

## Deployment

Build and run a production instance:

```bash
npm run build
npm run start
```

Ensure `NEXT_PUBLIC_API_URL` is set to the production backend API URL at build time, since it's inlined into the client bundle — changing it later needs a rebuild. The backend's `FRONTEND_URL` must be this app's URL, or its CORS check will block requests.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
