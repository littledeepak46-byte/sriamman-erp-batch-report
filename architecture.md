# System Architecture — Sri Amman RMC Batching ERP

## Overview

Three-tier web architecture with print-first output design.

React frontend → Python/FastAPI backend → PostgreSQL database.
No client-side data stored beyond the active session.

---

## Architecture Layers

| Layer | Component | Role |
|---|---|---|
| Presentation | React + Vite + Tailwind CSS | Responsive web UI, form validation, print templates |
| Presentation | React-to-Print / Print CSS | Pixel-perfect A4 output for DC, Batch Report, Weighment Slip |
| API Gateway | FastAPI (Python) | REST endpoints, input validation, business rule enforcement |
| Business Logic | Python services | DC number generator, batch size calculator, cumulative qty, design mix lookup |
| Data Access | SQLAlchemy ORM | Database queries, transactions, relationship management |
| Database | PostgreSQL 15 | All master data, delivery records, document sequences, audit log |
| Auth | JWT + Role-based access | Operator / Supervisor / Admin roles |
| Hosting | Single VPS / Cloud VM | Nginx reverse proxy + Gunicorn ASGI server |
| Backup | pg_dump + Cron | Daily automated backup to local + cloud storage |

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 + Vite | Core UI framework — component-based, fast hot reload |
| Tailwind CSS | Utility-first styling — consistent, responsive layout |
| React Hook Form + Zod | Form state management and schema validation |
| TanStack Query | Server state caching — instant dropdowns without API delay |
| React-to-Print | Browser-native A4 print for DC, Batch Report, Weighment Slip |
| Lucide React | Icon set for UI actions (print, save, search, delete) |
| date-fns | Date formatting — financial year, month abbreviation, DC logic |
| Axios | HTTP client with request/response interceptors |

### Backend

| Technology | Purpose |
|---|---|
| Python 3.12 | Core backend language |
| FastAPI | Async REST framework — auto-generates Swagger UI docs |
| SQLAlchemy 2.0 | ORM with async support |
| Alembic | Database migration tool — tracks and applies schema changes |
| Pydantic v2 | Strict input/output validation models |
| Uvicorn + Gunicorn | ASGI server for production — handles concurrent requests |
| python-jose + passlib | JWT authentication and bcrypt password hashing |
| ReportLab / WeasyPrint | PDF generation fallback if browser print is insufficient |

### Database

| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary relational DB — ACID compliant, excellent for sequences |
| pgAdmin 4 | Database management UI for administrator |
| Redis (optional) | Session caching and rate limiting — add if > 10 concurrent users |

### Infrastructure & DevOps

| Technology | Purpose |
|---|---|
| Ubuntu 22.04 LTS VPS | Hosting — DigitalOcean / Hetzner / AWS Lightsail |
| Nginx | Reverse proxy — serves static files + proxies /api to FastAPI |
| GitHub / GitLab | Source code repository and version control |
| GitHub Actions | CI/CD — automated tests and deployment on push to main |
| pg_dump + Cron | Scheduled daily PostgreSQL backup to compressed archive |
| UFW Firewall | Only ports 80, 443, 22 exposed |
| Let's Encrypt (Certbot) | Free SSL/TLS certificate — auto-renewal every 90 days |

---

## Database Schema

### Tables

**customers**
`id` | `name` | `gst_number` | `billing_address_line1` | `billing_address_line2` | `billing_city` | `billing_state` | `billing_pincode` | `created_at`

**customer_sites**
`id` | `customer_id (FK)` | `site_name` | `door_no` | `street1` | `street2 (nullable)` | `city` | `state` | `pincode` | `is_active`

**vehicles**
`id` | `vehicle_number` | `empty_weight_kg` | `is_active`

**drivers**
`id` | `name` | `phone (nullable)` | `is_active`

**material_types**
`id` | `name` (Concrete, Bitumen, Precast…)

**material_grades**
`id` | `material_type_id (FK)` | `grade_name` (M10, DBM…)

**pumping_types**
`id` | `name` (Pump 1, Pump 2, Boom Pump, Manual)

**design_mixes**
`id` | `plant_type` (M1.25/CP30) | `grade_id (FK)` | `sand1`, `agg_20mm`, `sand2`, `agg_12mm`, `agg_6mm`, `agg6` | `cem1`–`cem4`, `fly` | `wtr1`–`wtr3`, `adx1`–`adx4` | `silica`, `moisture`, `filler`, `col1`, `col2`, `col3` | `total_density (computed)` | `version` | `valid_from` | `valid_to`

**dc_sequences**
`id` | `year_code` (2026-27) | `month_code` (MAY) | `last_number (int)` | `UNIQUE(year_code, month_code)`

**batch_sequences**
`id` | `plant_type` | `last_batch_number (int)` | `UNIQUE(plant_type)`

**deliveries**
`id` | `dc_number (UNIQUE)` | `batch_number` | `customer_id (FK)` | `site_id (FK)` | `plant_type` | `material_type_id (FK)` | `grade_id (FK)` | `pumping_type_id (FK, nullable)` | `quantity_m3` | `cumulative_qty_m3` | `vehicle_id (FK)` | `driver_id (FK)` | `delivery_date` | `delivery_time` | `site_location` | `gross_weight_kg` | `empty_weight_kg` | `net_weight_kg` | `design_mix_id (FK)` | `created_by (FK→users)` | `created_at`

**batch_report_actuals**
`id` | `delivery_id (FK)` | `batch_number` | `batch_sequence` | `sand1_actual`, `agg20_actual` … (one column per ingredient) | `batch_size_m3` | `cumulative_qty_m3`

**users**
`id` | `username` | `password_hash` | `role` (admin/supervisor/operator) | `is_active` | `created_at`

---

## Key Business Logic Formulas

| Formula | Expression | Example |
|---|---|---|
| Batch Size | `qty ÷ CEILING(qty ÷ maxBatch, 1)` | 5.5 m³ ÷ 5 = 1.10 m³/batch |
| M1.25 Batches | `CEILING(qty ÷ 1.25, 1)` | 5.5 ÷ 1.25 = 4.4 → 5 batches |
| CP30 Batches | `CEILING(qty ÷ 0.5, 1)` | 5.5 ÷ 0.5 = 11 → 11 batches |
| Net Weight | `Gross Weight − Empty Weight` | 37,961 − 12,360 = 25,601 kg |
| Cumulative Qty | `SUM(prior deliveries: same customer+date+site+grade+plant) + current qty` | 8.5 + 2.0 = 10.5 m³ |
| Density Check | `SUM(all 24 ingredients) ≥ 2410 kg/m³` | 2390 → blocked from save |
| Financial Year | `month ≥ April → year/year+1, else year-1/year` | May 2026 → 2026-27 |
| DC Number Format | `SARMC / {FY} / {MON} / {NNNN}` | SARMC/2026-27/MAY/0262 |

---

## Deployment

| Item | Detail |
|---|---|
| Server | Ubuntu 22.04 LTS VPS — 2 vCPU, 4 GB RAM, 80 GB SSD |
| Recommended Providers | DigitalOcean ($24/mo), Hetzner (€5/mo), AWS Lightsail |
| Web Server | Nginx on 80/443, proxies `/api/*` to Gunicorn on port 8000 |
| SSL | Let's Encrypt via Certbot — auto-renews every 90 days |
| Database Backup | `pg_dump` cron daily → local + S3/Backblaze, 30-day retention |
| CI/CD | GitHub Actions: push to main → test → build React → SSH deploy → reload Gunicorn |
| Monitoring | UptimeRobot (free uptime alerts), Python logging to rotating file, Nginx access logs |
| Security | UFW (ports 22/80/443 only), SSH key auth, JWT 8h expiry, bcrypt passwords, RBAC |
