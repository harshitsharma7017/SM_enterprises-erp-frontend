# Guru Traders Export ERP — Frontend

Frontend for the Guru Traders Export ERP, a garment export management system covering sales, procurement, finance, export documentation, and reporting. Built with Next.js (App Router), React, and Tailwind CSS.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- ESLint (`eslint-config-next`)

## Prerequisites

- Node.js 20+ and npm
- A running instance of the ERP backend API (this app is a pure frontend and expects a REST API to talk to — see [Environment Variables](#environment-variables))

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

   Then edit `.env.local` as needed (see below).

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to `/login` until you authenticate against the backend API.

## Environment Variables

| Variable               | Description                                   | Default (if unset)         |
| ----------------------- | ---------------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`  | Base URL of the backend REST API               | `http://localhost:5001/api` |

All variables are read at build/runtime via `process.env` (see [`lib/api-client.js`](lib/api-client.js)). Since `NEXT_PUBLIC_API_URL` is prefixed with `NEXT_PUBLIC_`, it is exposed to the browser.

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
  masters/                Master data: agents, buyers, categories, fob-values,
                           formats, jobbers, markups, products, suppliers
  sales/                  Inquiries, order confirmations
  procurement/             Inward entries, purchase orders
  finance/                Agent commission, buyer receipts, debit notes,
                           purchase bills, supplier payments
  export/                 Export documents, packing
  reports/                Outstanding & other reports
  user-management/        Users, roles, permissions
  administration/          Company profile

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

Ensure `NEXT_PUBLIC_API_URL` is set to the production backend API URL at build time, since it's inlined into the client bundle.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
