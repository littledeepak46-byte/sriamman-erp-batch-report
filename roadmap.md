# Project Roadmap — Sri Amman RMC Batching ERP

**Version:** 1.0 | **Date:** May 2026 | **Timeline:** ~6 months | **Users:** 4–10 staff daily

---

## Goal

Replace the existing Microsoft Excel batching workflow with a purpose-built web-based ERP:
- Any browser, any desktop/laptop — no software installation on workstations
- 4–10 concurrent users (operators, batch controllers, management)
- Zero manual calculation — all documents auto-generated
- Permanent searchable delivery history
- Key outputs: Delivery Challan (DC), M1.25 Batch Report, CP30 Batch Report, Weighment Slip

---

## Core Modules

### 5.1 Master Data Management
- Customer: Name, GST No, Billing Address (add/edit/delete)
- Multi-site per customer: Door No, Street, City, State, Pincode
- Vehicle: Vehicle No + Empty Weight (auto-fills weighment)
- Driver: Name, contact (optional)
- Design Mix: per plant type × grade — 24 ingredient columns, density ≥ 2410 kg validation
- Material & Grade hierarchies: Concrete (M10–M30OPC), Bitumen (DBM, BC), Precast, Oil, Emulsion
- Pumping Type: Pump 1, Pump 2, Boom Pump, Manual (Concrete only)

### 5.2 Data Entry — Main Delivery Form (19 fields)
| # | Field | Type | Source |
|---|---|---|---|
| 1 | Customer Name | Dropdown (searchable) | Customer master |
| 2 | GST Number | Auto-fill (read-only) | From customer |
| 3 | Billing Address | Auto-fill (read-only) | From customer |
| 4 | Site Address | Dropdown (by customer) | customer_sites table |
| 5 | Plant Type | Dropdown | M1.25 / CP30 / None |
| 6 | Type of Material | Dropdown | material_types master |
| 7 | Grade of Material | Cascading dropdown | material_grades by material |
| 8 | Pumping Type | Conditional dropdown | Visible only when Material = Concrete |
| 9 | Quantity | Number input | Manual entry (m³) |
| 10 | Cumulative Quantity | Auto-calculated | DB query + current qty |
| 11 | Vehicle Number | Dropdown | vehicles master |
| 12 | Driver Name | Dropdown | drivers master |
| 13 | Date | Date picker | Today's date (editable) |
| 14 | Time | Time picker | Current time (editable) |
| 15 | DC Number | Auto-generated (read-only) | DC sequence engine |
| 16 | Batching Number | Auto-generated (read-only) | Batch sequence per plant |
| 17 | Site Location | Auto-fill (read-only) | City of selected site |
| 18 | Gross Weight | Number input (kg) | Manual entry |
| 19 | Net Weight | Auto-calculated (read-only) | Gross − Empty Weight |

### 5.3 DC Number Engine
- Format: `SARMC / {FY} / {MON} / {NNNN}` — e.g. `SARMC/2026-27/MAY/0262`
- Financial year: April–March cycle, auto-detected from date
- Running number resets to 001 at start of each month
- Atomic DB transaction — concurrent saves cannot get duplicate DC numbers

### 5.4 Delivery Challan Output
- 2-up A4 layout (two identical copies per page)
- Company header, GSTIN, DC No, Date, Time, Site Address, Vehicle, Driver
- Line item: Material, Grade, Pumping Type, Qty, Cum Qty, Rate, Amount
- Signature blocks: Customer + Authorised Signatory
- PDF download option for WhatsApp/email sharing

### 5.5 Batch Report Engine (M1.25 & CP30)
- Triggered only for Concrete + M1.25 or CP30 plant
- Batch size = `qty ÷ CEILING(qty ÷ maxBatch, 1)` (equal batches, no partial last batch)
- M1.25 max batch: 1.25 m³ | CP30 max batch: 0.5 m³
- Design mix lookup by plant type + grade → target values per ingredient
- Actual values entered per batch (editable rows)
- Totals: Total Set Weight, Total Actual Weight, Difference %
- Density validation: sum ≥ 2410 kg/m³

### 5.6 Weighment Slip Output
- Header: Sri Amman Construction and Equipments, Chinnar, Shoolagiri, Krishnagiri-635117
- Date, Time, Ticket No, Challan No, Vehicle, Driver
- Material, Supplier, Grade
- Gross Weight, Empty Weight (from vehicle master), Net Weight (auto-calculated)

### 5.7 Design Mix Management
- 24 ingredient columns: Sand1, 20MM, Sand2, 12MM, 6MM, Agg6, Cem1–4, Fly, Wtr1–3, ADX1–4, Silica, Moi, Filler, 1, 2, 3
- Density computed column — highlighted red if < 2410
- Per plant type + grade combination
- Version history retained — historical batch reports remain accurate after updates

### 5.8 Reports & History
- Search by: Customer, Date range, DC No, Vehicle, Grade, Site, Plant Type
- Re-print any historical DC, Batch Report, or Weighment Slip
- Cumulative quantity summary per customer per day
- Monthly DC number audit list
- Export to Excel/CSV

---

## Project Phases & Timeline

| Phase | Duration | Key Deliverables |
|---|---|---|
| Phase 1 — Foundation & Setup | Weeks 1–2 | DB schema, FastAPI scaffold, React + Vite scaffold, JWT auth, user roles, staging deploy |
| Phase 2 — Master Data Screens | Weeks 3–5 | Customer CRUD, multi-site entry, Vehicle, Driver, Material/Grade, Pumping Type, Design Mix (24 cols + density validation), Excel data import |
| Phase 3 — Core Data Entry & Engines | Weeks 6–9 | Main form (19 fields), DC number engine, Batching number engine, Cumulative qty, Net weight, Save to DB, Delivery list |
| Phase 4 — Document Generation | Weeks 10–13 | DC 2-up A4 template, M1.25 Batch Report, CP30 Batch Report, Weighment Slip, Print preview, PDF download, Batch actual entry |
| Phase 5 — Reports & History | Weeks 14–16 | Delivery history search, Re-print historical docs, Cumulative qty report, DC audit list, CSV/Excel export, Dashboard, Admin panel |
| Phase 6 — Testing, UAT & Go-Live | Weeks 17–24 | Unit + integration tests, UAT with plant staff, Historical data migration from Excel, Staff training (3 sessions), Parallel run (2 weeks), Production deploy, SSL, Go-live sign-off |

---

## Sprint Detail

### Sprint 1 (Weeks 1–2) — Foundation
- [ ] GitHub repo, project structure, README
- [ ] PostgreSQL schema (all tables per architecture.md)
- [ ] FastAPI scaffold: health check, CORS, middleware
- [ ] React + Vite + Tailwind + routing scaffold
- [ ] Login/logout, JWT issuance and validation
- [ ] User model, seed admin user
- [ ] Staging deploy: Nginx + Gunicorn + React build

### Sprint 2 (Weeks 3–4) — Customer & Site Master
- [ ] Customer API: GET list, GET by id, POST, PUT, DELETE
- [ ] Customer UI: list table, add/edit modal, search
- [ ] Site API: GET by customer, POST, PUT, DELETE
- [ ] Site UI: structured address form (Door No, Street, Street2, City, State, Pincode)
- [ ] GST number format validation (15-char GSTIN)
- [ ] Import existing customers from Excel

### Sprint 3 (Week 5) — Vehicle, Driver & Lookup Masters
- [ ] Vehicle API + UI: vehicle number, empty weight
- [ ] Driver API + UI
- [ ] Material type + grade hierarchy API + UI (cascading)
- [ ] Pumping type API + UI
- [ ] Design Mix API + UI: 24 columns, computed density, validation alert (< 2410 blocked)
- [ ] Import existing design mix data from Excel

### Sprint 4 (Weeks 6–7) — Main Delivery Form Part 1
- [ ] Main form layout: all 19 fields
- [ ] Customer dropdown with search/filter
- [ ] GST + Billing Address auto-fill on customer select
- [ ] Site dropdown filtered by selected customer
- [ ] Site Location auto-fill from site city
- [ ] Plant Type, Material, Grade cascading dropdowns
- [ ] Pumping Type conditional visibility (Concrete only)

### Sprint 5 (Weeks 8–9) — Main Delivery Form Part 2 + Engines
- [ ] DC Number engine: atomic per-month sequence, format `SARMC/FY/MON/NNNN`
- [ ] Batching Number engine: per-plant global increment
- [ ] Cumulative quantity: DB query for matching records + current entry
- [ ] Vehicle dropdown → Empty Weight auto-fill
- [ ] Date (today default, editable) and Time (now default, editable)
- [ ] Gross Weight → Net Weight auto-computed
- [ ] Form submit: validate + save to deliveries table
- [ ] Delivery list view with status badges

### Sprint 6 (Weeks 10–11) — Delivery Challan Output
- [ ] DC print template (matches existing Excel layout exactly)
- [ ] Company header with address
- [ ] 2-up layout (2 copies per A4)
- [ ] All 19 fields populated from delivery record
- [ ] Print modal with preview
- [ ] PDF download via browser print-to-PDF
- [ ] Physical printer test

### Sprint 7 (Weeks 12–13) — Batch Report M1.25 & CP30
- [ ] Batch size formula: `qty ÷ CEILING(qty ÷ maxBatch, 1)`
- [ ] Design mix lookup by plant type + grade
- [ ] M1.25 batch report template: header, 19 ingredient columns, batch rows, totals
- [ ] CP30 batch report template: header, 15 ingredient columns, batch rows, totals
- [ ] Actual values entry (editable per batch row)
- [ ] Total Set Weight, Total Actual, Difference % rows
- [ ] Weighment Slip template
- [ ] Print buttons on form page (DC / Batch Report / Weighment)

### Sprint 8 (Weeks 14–16) — Reports, History, Dashboard
- [ ] Delivery history search with filters (customer, date, DC No, vehicle, grade, site)
- [ ] Re-print any historical document
- [ ] Monthly DC audit list
- [ ] Daily cumulative quantity summary
- [ ] Export to CSV/Excel
- [ ] Dashboard: today's delivery count, monthly m³ total
- [ ] Admin panel: user management, view sequences

### Sprint 9–10 (Weeks 17–20) — Testing & UAT
- [ ] Unit tests (DC engine, batch calc, cumulative qty, density validation, net weight)
- [ ] Integration tests for all API endpoints (pytest + httpx, real PostgreSQL test DB)
- [ ] Fix all bugs found
- [ ] UAT with 2 plant operators + 1 supervisor using real plant data
- [ ] UI polish and usability fixes from UAT feedback

### Sprint 11–12 (Weeks 21–24) — Data Migration & Go-Live
- [ ] Migration script: import all historical Excel delivery data
- [ ] Validate migrated data totals against Excel records
- [ ] Staff training: 3 sessions × 1.5 hours
- [ ] Parallel run with Excel for 2 weeks
- [ ] Production deploy: SSL, backups verified
- [ ] Final go-live sign-off and Excel retirement

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| DC number duplication under concurrent save | High | Low | Row-level lock on `dc_sequences` table; atomic increment |
| Design mix density < 2410 — wrong batch weights | High | Medium | Real-time UI check + backend validation; save blocked if below |
| Staff resistance to new system | Medium | Medium | 2-week parallel Excel run; hands-on training; keep UI fast |
| Historical data import errors | Medium | Medium | Staged migration with validation report; compare totals with Excel |
| Server downtime during plant operation | High | Low | Cloud VPS with 99.9% SLA; offline-capable PWA in future phase |
| Print layout mismatch with existing format | Medium | High | Side-by-side comparison during Sprint 6; UAT includes print test |
| Scope creep | Medium | High | Formal change request process; new features go to v2 backlog |

---

## Testing Strategy

| Type | Approach |
|---|---|
| Unit Tests | pytest — DC engine, batch calc, cumulative qty, density validation, net weight. Target: 90%+ coverage |
| Integration Tests | pytest + httpx — all API endpoints with real PostgreSQL test DB; run on every git push |
| Print Validation | Manual — generate DC, Batch Report, Weighment Slip for 5 real historical deliveries; compare field by field |
| UAT | 2 operators + 1 supervisor over 1 week; sign-off form required before go-live |
| Performance | Load test: 10 concurrent users; target page load < 2s, form submit < 1s; verify no DC collisions |

---

## Team & Resource Plan

| Role | Responsibility | Hours/Week | Duration |
|---|---|---|---|
| Full-Stack Developer (Primary) | Architecture, backend, frontend, deployment, testing | 40 hrs | 24 weeks |
| Domain Expert (Client) | Requirements, UAT coordination, staff training, data validation | 5 hrs | 24 weeks |
| Plant Staff (2–3 operators) | UAT, print layout feedback, parallel run | 5 hrs | Weeks 17–22 |
