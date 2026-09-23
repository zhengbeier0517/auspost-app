# ParcelDesk — Product Requirements

Version 2.1 · 23 September 2026

## 1. Scope and source priority

Build an English-language order operations application with a product catalog, per-order financial calculations, shipment tracking, and a one-command Docker Compose deployment.

The latest user instruction supersedes the original assessment fixtures: **all supplied product data comes from [db-data.json](db-data.json); missing order, customer, quantity and shipment-association data is generated in [test-data.json](test-data.json).** Do not fabricate additional catalog records or prices. Do not use the original assessment's unmatched SKU list as the application's order input.

Reference documents:

- `2026-06-IT-Interview-in-person.pdf`: original functional assessment.
- `courier_testing_account.pdf`: testbed credentials and carrier descriptions, retained locally.
- `IT_Coding_Assessment_Brief_Draft.html`: clarification of GST, Node.js support, frontend requirements and optional TNT integration, retained locally.

These documents are reference material. The latest user request governs data and language decisions. The screenshot path supplied by the user was unavailable, so the current visual design is an independent implementation pending an accessible reference image.

## 2. Data contracts

### Product source

`docs/db-data.json` contains a query result object with `table: "product_list"`, `rows`, `rowCount`, `limit`, `where` and `select`. Read the ten records from `rows`. Preserve the source file unchanged. No external SQL site, Excel file or database is required.

| Field | Use |
| --- | --- |
| SKU | Exact product lookup key, trimmed; duplicate keys are invalid |
| ProductName, Description | Product title and descriptive text |
| RRP | AUD unit price including GST, supplied as a decimal string |
| DosageType | Product category and neutral illustration type |
| length, width, height | Dimensions including unit suffixes |
| weight | Weight with a g suffix |
| volume | Volume with an mm³ suffix |
| Volumetric_GrossWeight | Separate kg-based source field with unconfirmed business meaning |
| Status, Date | Product record metadata, not order or tracking status |

Other source fields remain intact. Never infer shipment weight from the product name or treat g as kg. Do not treat `ETA: "nullDays"` as a real delivery estimate.

### Generated fixtures

`docs/test-data.json` contains `description`, `originPostcode` and `orders`.

Each order contains `orderNo`, `orderDate`, `status`, `isTestData`, `customer`, `shippingAddress`, `items` and `shipments`. Each line references a real catalog `sku`, a positive integer `quantity` and a `trackingId`. Each shipment contains `trackingId`, `trackingNumber` and `carrier`.

Generated customer names and addresses are fictional. Email addresses use `example.com`. Tracking identifiers and histories are generated locally. Each shipment has a unique `MOCK-` identifier and a `mockTracking` object containing status and timestamped events. No carrier API is used in default mock mode. All results are explicitly labelled simulated.

| Generated order | Product lines | Units | Order state |
| --- | ---: | ---: | --- |
| TEST-20260923-001 | 3 | 5 | In Transit |
| TEST-20260923-002 | 4 | 6 | Processing |
| TEST-20260923-003 | 3 | 6 | Completed |

The table above lists the three original fixtures. Twenty additional orders (004–023) bring the total to 23 orders and 30 shipments. Together the fixtures exercise all ten catalog products. Do not duplicate catalog names or prices in the fixture file. Adding another valid order must not require modifying application logic.

## 3. Required functionality

### Order list

- Display order number, date, customer, company, input status, item count and total.
- Search by order number, customer or company.
- Filter by All orders, In Transit, Processing and Completed.
- Show workspace counts derived from loaded data.
- Open a selected order and return to the list.
- Provide loading, empty, error and retry states.

### Order details

- Show order header, date, input order status and a visible test-data disclosure.
- Show each SKU's catalog title, image placeholder, quantity, RRP including GST, unit price excluding GST and line subtotal excluding GST.
- Show the associated shipment group per item.
- Show recipient, company, contact information and shipping address.
- Show separate shipment cards for each carrier/tracking identifier.
- Show subtotal, GST, shipping and total in AUD.
- Export the selected order and currently loaded tracking result as JSON without secrets.

### Catalog

- Show all supplied products with title, SKU, description, RRP, source dimensions and weight.
- Search by name or SKU.
- Use labelled neutral illustrations, not real product photography.

## 4. Financial rules

RRP includes GST. This resolves the original PDF's conflicting instruction to add GST to an already tax-inclusive subtotal.

```text
Ex-GST unit price = RRP / 1.10
Ex-GST line subtotal = round(RRP × quantity / 1.10, 2)
Order subtotal = sum(rounded ex-GST line subtotals)
GST = round(order subtotal × 10%, 2)
Total = subtotal + GST + shipment fee
```

Parse prices into integer cents. Calculate with BigInt rational arithmetic and round half-up. The displayed unit price is rounded for presentation; it is not reused to calculate the line subtotal. Line-level rounding can create a cent-level difference from a separately summed tax-inclusive total; this convention is explicit.

Reject negative, nonfinite, malformed or over-precision prices. Quantity must be a positive safe integer. Missing/duplicate SKU records and invalid quantities or prices produce item-level errors and an `incomplete` financial state with `null` subtotal, GST and total. Never silently substitute zero prices.

## 5. Shipping

The required baseline displays `A$0.00` with `not_estimated` and an explanation that it is a placeholder, not free delivery. No actual carrier quotation is claimed.

Origin is `2111`, as specified in the assessment. Destination comes from the generated address. A future estimate must explicitly define packing, weight, volume, unit conversion and tax assumptions. The source's `weight` and `Volumetric_GrossWeight` fields have different meanings/units and must not be substituted for each other without clarification.

An optional estimate would be calculated once per order/shipment group and summed to the order. A failed or unimplemented TNT estimate must not erase another group's valid estimate.

## 6. Tracking integration

Default configuration is `TRACKING_MODE=mock`. Return the stored shipment history from `docs/test-data.json` with `environment: "mock"`, `isSimulated: true`, and `queriedAt: null`. Sort events newest first. Missing mock histories must be unavailable rather than fabricated. StarTrack, Australia Post and TNT all have mock histories. Refresh reloads the same fixture. English UI badges and captions must say “Simulated”, not “Testbed” or “live”.

The following remote integration is retained only for optional `TRACKING_MODE=testbed`. Never submit a generated `MOCK-` tracking number to the remote API.


Australia Post / StarTrack tracking is requested by the backend only, using the official testbed `/track?tracking_ids=...` endpoint, Basic authentication, and the `Account-Number` header. Credentials reside in root `.env` and are never returned to the client. The official host and testbed path are enforced before sending credentials; redirects are rejected.

- StarTrack uses its separate configured account, preserving the supplied leading zero.
- Per-shipment requests prevent mixed-carrier queries.
- A response must match the requested tracking identifier.
- Normalize status, events, event location and event timestamps.
- Sort dated events newest first and distinguish event time from query time.
- Use a ten-second timeout, a sixty-second cache, concurrent-request deduplication and a maximum of ten outbound requests per minute.
- HTTP errors, no results, invalid responses, missing configuration and network failures are explicit states, never fictional tracking events.
- TNT remains an optional integration. Show `not_implemented` and explain that shipping is not estimated.
- Input order status and carrier status remain independent.

Unified results include `carrier`, `trackingNumber`, `trackingId`, `availability`, `status`, `events`, `lastUpdated`, `queriedAt`, `environment`, `message` and cache information. Availability is `available`, `unavailable`, `not_implemented` or `not_configured`.

## 7. Technical structure

Use the pre-existing React/Vite frontend and Node.js/Express backend directories.

```text
auspost-app/
├── .env                     # local configuration; ignored by Git
├── .env.example             # blank variable names
├── .dockerignore
├── compose.yaml
├── package.json
├── README.md
├── backend/
│   ├── app.js
│   ├── Dockerfile
│   ├── package.json / package-lock.json
│   ├── controllers/         # request handlers
│   ├── db/                  # source-data loading
│   ├── middlewares/         # safe error handling
│   ├── routes/              # HTTP routes
│   ├── services/            # order calculations and tracking; tests
│   └── utils/               # exact money operations
├── docs/
│   ├── db-data.json         # unchanged product source
│   ├── test-data.json       # generated fixtures
│   ├── PRD.md
│   └── original references  # credential-bearing files kept local
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── components/          # existing directory outside src
    └── src/
        ├── App.jsx / App.css / index.css / main.jsx
        ├── pages/
        └── utils/
```

API:

| Route | Result |
| --- | --- |
| GET /api/health | Service availability |
| GET /api/orders | Calculated orders and origin postcode |
| GET /api/orders/:orderNo | One order or 404 |
| GET /api/orders/:orderNo/tracking | Independent shipment results or 404 |
| GET /api/products | Source catalog records |

Nginx serves the built frontend and proxies `/api/` to the backend. Only the frontend is published to `127.0.0.1`, default port 8080. Health checks gate frontend startup on backend readiness. Docker builds copy only the two data files, never credentials or reference documents.

## 8. Acceptance

1. Every generated line matches `db-data.json`; all ten source products are used without changing their prices.
2. 23 test orders, 227 units and 30 shipments appear; customer/order data and tracking histories are labelled as generated.
3. First test order totals A$668.00 with shipping not estimated; a GROWAFB10 × 2 calculation yields 180.00 subtotal, 18.00 GST and 198.00 total.
4. Invalid/missing products, quantities and prices create clear incomplete results.
5. Search, status filters, catalog search, details navigation, export and tracking retry work.
6. Mock mode returns all 30 stored shipment histories without API calls, including delayed and delivery-attempted scenarios; no simulated state is presented as live.
7. English UI remains usable on desktop and narrow screens, with keyboard focus and accessible labels.
8. Application secrets stay out of new source files, frontend bundles, API responses and exported orders. The existing repository history already contains credential-bearing reference documents; a public release requires a sanitized repository/export.
9. `docker compose up --build -d` starts both healthy services and the application is available at `http://localhost:8080`.
10. README documents startup, fixtures, assumptions, limitations and validation results in English, following the latest language request.
