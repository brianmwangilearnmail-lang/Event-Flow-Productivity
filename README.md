# EventFlow — Event Management System
*Made by the EventFlow Team*

A professional event management and business operations platform for managing clients, events, quotations, invoices, and receipts.

## Features

- **Client Management** — Track clients and their full profiles
- **Event Scheduling** — Manage events with full lifecycle tracking
- **Quotation Builder** — Generate professional quotations with line items
- **Invoice & Receipt Generation** — Create, send, and track invoices and receipts
- **Document Export** — Download any document as a print-ready PDF or share via email
- **Activity Log** — Full audit trail of all business activity
- **Catalog** — Manage your service/product catalog
- **Responsive** — Works on Android, tablet, and desktop

## Tech Stack

- React 19 + TypeScript
- Vite 6
- TailwindCSS 4
- Supabase (PostgreSQL + Auth + Storage)
- jsPDF + html-to-image for PDF export
- Framer Motion for animations

## Run Locally

**Prerequisites:** Node.js 18+, Supabase Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment:
   Create a `.env` file from `.env.example` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Initialize Database:
   Run the SQL provided in the `supabase_schema.sql` artifact in your Supabase SQL Editor.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
```

## Deployment (Vercel)

1. Push your code to GitHub.
2. Connect your repository to Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel Environment Variables.
4. Deployment settings are handled automatically by `vercel.json`.

## Authentication

Create an account via the login page. Authentication is handled by Supabase Auth. Ensure "Confirm Email" is disabled in your Supabase dashboard for the easiest onboarding experience.

---
© 2026 Made by the EventFlow Team
