# Student Health Platform – Backend

Django REST Framework backend powering the Student Health and Wellness Platform. Supports role-based access control, confidential and anonymous student health concerns, direct messaging with healthcare professionals, in-app notifications, curated health resources, and tamper-evident audit logging.

---

## 🛠 Tech Stack

- **Framework**: Django 5.x & Django REST Framework (DRF)
- **Authentication**: JWT via `djangorestframework-simplejwt` (access + rotating refresh tokens with blacklist)
- **Database**: PostgreSQL (production / standard dev) or SQLite (quick local dev fallback)
- **Security & Privacy**:
  - Keyed HMAC-SHA256 reference codes with cryptographic pepper for anonymous submissions.
  - Zero linkage between anonymous submissions and student accounts.
  - Strict role-based access control (RBAC) and audit logging without health PII.

---

## 📦 Installed Apps

1. **`core`**: Global roles (`student`, `ambassador`, `professional`, `admin`), permission classes, system health check, append-only audit logging, category definitions, and shared test utilities.
2. **`accounts`**: Custom UUID-based user model, student profile extensions, public registration, authentication flows, and admin user administration.
3. **`health_concerns`**:
   - **Anonymous Concerns**: Public submission returning a CSPRNG reference code (`ASCH-XXXX-XXXX-XXXX`), reference code lookup, follow-up messages, and professional review/response workflows.
   - **Confidential Concerns**: Student-authenticated concerns, professional assignment/claiming, and status tracking (`open`, `in_review`, `responded`, `closed`).
4. **`messaging`**: Asynchronous message exchange inside confidential concerns between students and their assigned healthcare professional, unread tracking, conversations summary, and read receipts.
5. **`notifications`**: In-app notifications for message events, concern claims, and anonymous follow-ups without leaking sensitive health details in notification payloads.
6. **`resources`**: Educational health articles with editorial workflow (drafts created by healthcare professionals, review and publishing/archiving by administrators, public search and read).

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+ (Python 3.13 compatible)
- PostgreSQL (optional for local development, SQLite fallback supported)

### 2. Setup Virtual Environment
```bash
# From the backend directory
python -m venv .venv

# Activate on Linux/macOS:
source .venv/bin/activate

# Activate on Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the `backend/` directory with the following configuration:
```ini
# Django Settings
DJANGO_SECRET_KEY=change-this-to-a-secure-random-secret-key
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Pepper used for keyed HMAC-SHA256 hashing of anonymous reference codes
REFERENCE_CODE_PEPPER=change-this-to-a-random-pepper-for-anonymous-codes

# Database Settings (Leave DB_NAME empty to use SQLite during local development)
DB_NAME=student_health
DB_USER=student_health_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
```
Key environment variables:
| Variable | Description |
| :--- | :--- |
| `DJANGO_SECRET_KEY` | Secret key for cryptographic signing. |
| `DJANGO_DEBUG` | Set to `1` for development, `0` for production. |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated list of allowed hostnames (e.g. `localhost,127.0.0.1`). |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (e.g. `http://localhost:5173`). |
| `REFERENCE_CODE_PEPPER`| Secret pepper used for hashing anonymous concern reference codes. |
| `DB_NAME` | PostgreSQL database name. **Leave empty to use SQLite for quick local development.** |
| `DB_USER` / `DB_PASSWORD` | PostgreSQL database credentials. |
| `DB_HOST` / `DB_PORT` | PostgreSQL host and port (defaults to `localhost:5432`). |

### 5. Apply Migrations
```bash
python manage.py migrate
```

### 6. Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

### 7. Run Automated Tests
```bash
python manage.py test
```

### 8. Start Development Server
```bash
python manage.py runserver
```
The API is available at `http://127.0.0.1:8000/api/v1/`.

---

## 📡 API Endpoints Reference (`/api/v1/`)

### System & Health
- `GET health/` – Health check endpoint (public).

### Authentication & Profiles (`auth/`)
- `POST auth/register/` – Register student account (forces role `student`).
- `POST auth/login/` – Obtain JWT token pair (rate-limited).
- `POST auth/token/refresh/` – Refresh access token.
- `POST auth/logout/` – Blacklist refresh token and logout.
- `GET auth/profile/` – Retrieve current authenticated user profile.
- `PATCH auth/profile/` – Update first name, last name, department, or level.

### User & Audit Administration (`admin/`)
- `GET admin/users/` – List users (filterable by `?role=`).
- `POST admin/users/` – Create new user (ambassador, professional, admin).
- `GET admin/users/<uuid:pk>/` – View user details.
- `PATCH admin/users/<uuid:pk>/` – Update user (e.g. deactivate user).
- `GET admin/audit-logs/` – View immutable audit log records (filterable by `?action=`).

### Anonymous Concerns (`anonymous-concerns/`)
- `POST anonymous-concerns/` – Submit anonymous concern; returns single-use reference code.
- `POST anonymous-concerns/access/` – Access case and messages using reference code.
- `POST anonymous-concerns/follow-up/` – Post follow-up message using reference code.
- `GET anonymous-concerns/queue/` – Healthcare professionals: unassigned open queue.
- `GET anonymous-concerns/assigned/` – Healthcare professionals: claimed cases.
- `GET anonymous-concerns/<uuid:pk>/` – Healthcare professionals: case details & messages.
- `POST anonymous-concerns/<uuid:pk>/claim/` – Healthcare professionals: claim case.
- `POST anonymous-concerns/<uuid:pk>/respond/` – Healthcare professionals: submit response.

### Confidential Concerns (`concerns/`)
- `POST concerns/` – Students: submit a new confidential concern.
- `GET concerns/my/` – Students: list their submitted concerns.
- `GET concerns/queue/` – Healthcare professionals: unassigned open queue.
- `GET concerns/assigned/` – Healthcare professionals: concerns assigned to current professional.
- `GET concerns/<uuid:pk>/` – Retrieve concern details (accessible by owning student or assigned professional).
- `PATCH concerns/<uuid:pk>/` – Students: edit concern details while status is `open`.
- `POST concerns/<uuid:pk>/claim/` – Healthcare professionals: claim concern.

### Messaging (`messages/`)
- `GET messages/?concern=<uuid>` – List messages in a confidential concern.
- `POST messages/` – Send message in an assigned confidential concern.
- `GET messages/conversations/` – List user conversations with last message timestamp & unread badge count.
- `GET messages/<int:pk>/` – Retrieve message detail.
- `PATCH messages/<int:pk>/read/` – Mark message as read (recipient only).

### Notifications (`notifications/`)
- `GET notifications/` – List user notifications.
- `GET notifications/unread/` – List unread notifications only.
- `PATCH notifications/<int:pk>/read/` – Mark notification as read.
- `PATCH notifications/read-all/` – Mark all notifications for current user as read.

### Health Resources (`resources/`)
- `GET resources/` – Public list of published resources (filterable by `?category=` and `?q=`).
- `POST resources/` – Professionals & Admins: draft a new resource.
- `GET resources/manage/` – Professionals (own drafts/resources) and Admins (all resources).
- `GET resources/<int:pk>/` – View resource details.
- `PATCH resources/<int:pk>/` – Edit resource (professionals can edit own drafts; admins can publish/edit all).
- `DELETE resources/<int:pk>/` – Soft delete / archive resource (admin only).

---

## Stage 5 endpoints
Referrals: POST referrals/ (student) · GET referrals/my/ · GET referrals/assigned/ (ambassador/professional) · GET referrals/pool/ + POST referrals/{id}/claim/ (ambassador) · GET referrals/monitor/ + POST referrals/{id}/assign/ {assignee} (admin, metadata only) · GET referrals/{id}/ · PATCH referrals/{id}/status/ · GET/POST referrals/{id}/messages/
Appointments: POST appointments/ (student) · GET appointments/my/ · GET appointments/queue/ + assigned/ (professional) · GET appointments/monitor/ (admin, metadata only) · GET appointments/{id}/ · PATCH appointments/{id}/status/ {status, scheduled_at, staff_note}
Privacy: ambassadors see service type, urgency, the student's note and first name only. Admins see metadata only.

---

## Stage 6-7

**Emergency contacts** (public – no login, never throttled, ignores tokens):
- `GET emergency-contacts/` – Verified + active contacts only, with safety disclaimer.
- `GET emergency-contacts/{id}/` – Single verified + active contact.

**Emergency admin** (admin role only):
- `GET /POST admin/emergency-contacts/` – List all contacts / create new (always starts unverified).
- `GET /PATCH /DELETE admin/emergency-contacts/{id}/` – View, edit, or deactivate a contact (`DELETE` = soft deactivate, never hard delete).
- `POST admin/emergency-contacts/{id}/verify/` – Mark a contact as verified.
- Editing `name`, `category`, `phone`, `address`, or `hours` **resets verification** and hides the contact from the public endpoint until re-verified.

**Admin dashboard**:
- `GET admin/dashboard/` – Aggregate counts only (no case content, no identities).

**Tests** include an end-to-end journey (`core/test_e2e.py`) covering the full lifecycle, and a public-endpoint allowlist (`PublicEndpointAllowlist`) that fails the test suite if any unexpected endpoint becomes unauthenticated.

> See [`DEPLOYMENT.md`](DEPLOYMENT.md) before going live.

---

## 🔒 Roles & Access Summary

| Role | Capabilities |
| :--- | :--- |
| **`student`** | Submit/view own confidential concerns, exchange messages with assigned professional, view own notifications, submit anonymous concerns, read published resources. |
| **`ambassador`** | Read published resources, assist with campus health promotion (cannot view confidential/anonymous patient cases). |
| **`professional`** | View concern queues, claim and respond to confidential and anonymous concerns, message assigned students, draft health resources. |
| **`admin`** | User management, audit logs inspection, editorial review and publishing/archiving of health resources. Does not access confidential health case messages. |
