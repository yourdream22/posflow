# POSFlow implementation plan

## Product scope
POSFlow is a medium-sized retail point-of-sale starter for a single store team. The first release covers a polished operations dashboard, role-aware sign-in structure, product catalog, inventory adjustments, point-of-sale checkout, sales history, receipt reprint access, and a clear Next.js / Flask / PostgreSQL separation.

## Architecture
- **Frontend (`app/`, `components/`, `lib/`)**: Next.js App Router with TypeScript. A shared client shell provides navigation, dashboard, product, inventory, POS, and sales experiences while keeping routes independently addressable.
- **API (`backend/`)**: Flask REST API with SQLAlchemy models and route blueprints. It exposes health, demo authentication, dashboard metrics, products, inventory adjustments, and sales endpoints with validation and consistent JSON errors.
- **Database (`migrations/`, `docker-compose.yml`)**: PostgreSQL schema for users, products, inventory movements, sales, and sale items. `DATABASE_URL` is injected at runtime; a local Postgres service is provided for development.
- **Integration**: Next rewrites `/api/*` to Flask during local development. The UI is resilient when the API is unavailable by showing seeded demo data, while API contracts remain ready for database-backed operation.

## Project structure
- `app/`: route entry points, global styles, metadata, and route manifest support.
- `components/pos-shell.tsx`: interactive POS workspace and shared operational views.
- `lib/`: typed domain models, demo data, and API client.
- `backend/app/`: Flask application factory, configuration, SQLAlchemy models, validation, and REST routes.
- `migrations/001_initial.sql`: PostgreSQL tables, indexes, and seed data.
- `docker-compose.yml`: local PostgreSQL service.

## Design direction
Three possible directions considered:
1. **Editorial operations console** (0.07): calm, high-contrast retail tooling with warm paper surfaces.
2. **Neon commerce cockpit** (0.05): dark, saturated and highly technical.
3. **Soft SaaS utility** (0.08): rounded pastel cards with friendly onboarding cues.

### Chosen: Editorial operations console
- **Design Movement**: Contemporary editorial dashboard design, combining print-like hierarchy with functional retail instrumentation.
- **Core Principles**: scan-first hierarchy; warm, human surfaces; dense but breathable data; actions always one step away.
- **Color Philosophy**: deep ink and warm ivory create trust and legibility, while one ownable teal-green accent signals completed actions and stock health without looking like generic finance software.
- **Layout Paradigm**: a left rail for orientation, a wide working canvas, and asymmetric content bands that let the most important metric or checkout action lead each screen.
- **Signature Elements**: oversized section numerals, teal “signal” bars on KPI cards, and fine ruled dividers that echo a store ledger.
- **Interaction Philosophy**: immediate feedback, explicit states, forgiving edits, and no hidden destructive actions. Cart and inventory actions remain visible in context.
- **Animation**: 160–220ms ease-out transitions for view changes, subtle lift on cards, and a single soft pulse for stock warnings; avoid distracting motion at checkout.
- **Typography System**: Geist Sans for interface text with a heavy display weight for totals and section titles; tabular numerals for prices and quantities.
- **Brand Essence**: “The steady hand behind a faster store.” Personality: grounded, crisp, capable.
- **Brand Voice**: direct and operational. Example lines: “Keep the line moving.” and “Three items need attention before the afternoon rush.”
- **Wordmark & Logo**: a compact “P” mark built from two offset receipt lines, paired with the POSFlow wordmark.
- **Signature Brand Color**: Ledger Teal `#0f766e`.

## Delivery decisions
No decorative image assets are needed for this internal operations tool. The project uses CSS-built data visualization and UI motifs so the interface remains fast and legible at the register. The initial implementation is intentionally self-contained and can be extended with real authentication, permissions, barcode scanning, and payment provider webhooks without changing the core domain model.
