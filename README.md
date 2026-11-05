# POSFlow

POSFlow is a medium-sized retail POS starter built with Next.js, Python/Flask, and PostgreSQL. It is designed for a small store team that needs a fast register, reliable stock visibility, and a readable sales ledger.

## Run locally

1. Install Node 18+ and pnpm 9+.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL with `docker compose up -d db`.
4. Apply `migrations/001_initial.sql` to the `posflow` database. If upgrading an existing POSFlow database, apply `migrations/002_local_roles.sql` afterward.
5. Install frontend dependencies and start Next.js:

```bash
pnpm install
pnpm dev
```

6. In a second terminal, create a Python environment and start Flask:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
flask --app backend.app run --host 0.0.0.0 --port 5000
```

The Next.js dev server proxies `/api/*` to Flask on port 5000. If the API is unavailable, the UI renders realistic demo data so the workflows remain reviewable.

## Login and receipts

The application uses local POS accounts only—there is no Google, Manus, or third-party login. The sign-in screen supports exactly two roles: **Admin** and **Staff**. After login, Flask creates the `webdev_app_session` application cookie and the frontend loads the signed-in user from `/api/auth/me`. Sign out is available from the user chip in the top bar.

Seeded development accounts after applying the migration:

- Admin: `admin@northstar.market` / `admin123`
- Staff: `staff@northstar.market` / `staff123`

Completed sales and sales-history rows open a receipt modal. The **Print receipt** action prints only the receipt at receipt-paper width; the navigation, backdrop, and application chrome are excluded from the print output.

The bell icon is clickable and shows the current notification state. The **Settings** button opens account settings; Admin users can create Staff accounts there. The signed-in user chip at the top right is the explicit **Sign out** control.

## Production container

The root `Dockerfile` builds the Next.js application and runs Flask behind it in one container. The container listens on `PORT` (3000 by default) and uses `/api/health/live` for deployment liveness. Provide a real PostgreSQL connection through the protected `POSTGRES_URL` runtime secret before enabling live persistence; never copy local demo credentials into production.

## Core API

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/products?query=&category=&status=`
- `POST /api/products`
- `PATCH /api/products/<id>`
- `POST /api/inventory/adjustments`
- `GET /api/inventory/adjustments`
- `GET /api/sales`
- `POST /api/sales`
- `GET /api/staff` (Admin only)
- `POST /api/staff` (Admin only)

## Database

The PostgreSQL schema lives in `migrations/001_initial.sql`. It creates users, products, inventory movements, sales, and sale items. The sale creation transaction locks product rows, records the sale, and deducts stock atomically.

## Roles

The API accepts only `admin` and `staff`. The backend verifies password hashes and requires the selected role to match the account role.
