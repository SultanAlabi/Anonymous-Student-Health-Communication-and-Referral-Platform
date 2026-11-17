# Deployment checklist

## Before go-live (non-technical, required by the SRS)
- [ ] Written approval from the university and health centre (professional participation, content, data handling, retention).
- [ ] Emergency contacts supplied by the university, entered by an admin, and marked **verified** (nothing shows publicly until then).
- [ ] Health resources reviewed and published by an admin.
- [ ] Data-protection / retention policy agreed. The platform must not call itself an official university service before approval.

## Server environment (all values secret, never committed)
| Variable | Notes |
|---|---|
| DJANGO_SECRET_KEY | long random, unique to production |
| REFERENCE_CODE_PEPPER | long random, unique; **never change** after launch (invalidates all anonymous codes) and back it up separately from the database |
| DJANGO_DEBUG | `0` |
| DJANGO_ALLOWED_HOSTS | your real domain only |
| CORS_ALLOWED_ORIGINS | your frontend's https origin only |
| DB_NAME / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT | dedicated PostgreSQL user with no superuser rights |
| NUM_PROXIES | `1` behind one reverse proxy (nginx etc.), else `0`. Wrong value breaks rate limiting and audit IPs |

## Steps
1. `pip install -r requirements.txt`
2. `python manage.py migrate`
3. `python manage.py collectstatic --noinput` (serve `staticfiles/` from nginx; only the Django admin site needs it)
4. `python manage.py createsuperuser` (admin-role account), then create ambassador/professional accounts via `/api/v1/admin/users/`
5. Run behind HTTPS: `gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3`
6. nginx (or similar) terminates TLS and forwards `X-Forwarded-Proto` and `X-Forwarded-For`
7. `python manage.py check --deploy` must report no issues
8. `python manage.py test` must pass on the release commit

## Operations
- [ ] Automated, encrypted PostgreSQL backups; test a restore. Protect backups like the live database.
- [ ] Restrict `/django-admin/` by IP or VPN, or disable it.
- [ ] Do not log request bodies or reference codes at the proxy (turn off body logging; keep codes out of URLs, which the API already does).
- [ ] Monitor 5xx errors and failed-login spikes. Review audit logs periodically (`/api/v1/admin/audit-logs/`).
- [ ] Rotate staff passwords on role changes; deactivate leavers (accounts are never deleted, only deactivated).
- [ ] Emergency endpoint (`/api/v1/emergency-contacts/`) is public and unthrottled by design: monitor its uptime.
