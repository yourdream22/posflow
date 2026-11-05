# POSFlow TODO

## Dashboard and navigation
- [ ] Provide a polished dashboard showing key retail metrics, recent sales, low-stock products, and quick links to core workflows.
- [ ] Keep the product, inventory, point-of-sale, and sales-history areas reachable from persistent navigation.

## Authentication and roles
- [ ] Provide secure sign-in and session handling with basic role-based access for administrators, managers, and cashiers.
- [ ] Keep the API contract ready for authenticated sessions and role checks without exposing credentials in frontend code.

## Product catalog
- [ ] Provide searchable and filterable product listings.
- [ ] Provide create, view, edit, and archive product workflows with validation.

## Inventory
- [ ] Show stock levels, low-stock indicators, and reorder thresholds.
- [ ] Provide manual stock adjustments and an auditable adjustment history.

## Point of sale
- [ ] Provide product search, cart item quantities, item removal, discounts, tax calculation, and running totals.
- [ ] Support practical payment-method recording, sale confirmation, inventory deduction, and a printable receipt view.

## Sales history
- [ ] Provide transaction filtering, transaction details, line items, totals, cashier attribution, and receipt reprint access.

## Technical foundation
- [ ] Keep a clear Next.js frontend, Flask API, and PostgreSQL data layer with structured models, validation, error handling, and documented local setup.
- [ ] Provide a route manifest and runnable local development commands.
