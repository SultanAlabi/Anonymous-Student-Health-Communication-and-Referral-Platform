# SafeSpace frontend (React + Tailwind + Vite)

## Run (development)
1. Start the backend: `python manage.py runserver` (with `DJANGO_DEBUG=1` in its `.env`).
2. In this folder: `npm install` then `npm run dev`, then open http://localhost:5173
Vite proxies `/api` to http://127.0.0.1:8000, so no CORS setup is needed. To use another backend address: `VITE_PROXY_TARGET=http://host:port npm run dev`.

## Build (production)
`npm run build` creates `dist/`. Serve it from the same domain as the API (nginx: `/` -> dist, `/api/` -> gunicorn) or set `VITE_API_URL` and add the frontend origin to the backend's `CORS_ALLOWED_ORIGINS`.

## Privacy design
- Anonymous and public pages use a separate API client that never sends credentials.
- Reference codes stay in component memory only: never in the URL, localStorage or logs. A warning appears if the page is closed before the student confirms the code is saved.
- Access token is memory-only; the refresh token is in sessionStorage (cleared when the tab closes).
- Content is rendered as plain text (no HTML injection). The emergency banner and number are static, so they show even if the API is down.
- Route guards are a convenience only. The backend enforces every permission.

## Built so far
Public: Home, Health information, Emergency, Anonymous concern, Response portal, Login, Register.
Student workspace: Overview, Concerns & questions (submit, edit while open, conversation), Messages inbox, Referrals (request, cancel, messages), Appointments (request, cancel), Notifications (bell with unread count in the header).
Ambassador: referral pool (pick up), assigned referrals, status workflow, messages with the student (first name and note only).
Professional: anonymous and confidential case queues (pick up, reply), appointment requests (approve / reschedule / decline / complete), assigned referrals, resource drafts.
Admin: dashboard counts, users and roles, referral monitor and assignment (metadata only), resource review and publishing, emergency contacts (verify before they go live), audit log.

## Trying it out
Create an admin with `python manage.py createsuperuser` (backend). Log in as that admin, create ambassador and professional accounts under Users, then use separate browsers or private windows to act as each role. Register a student from the public Register page.
