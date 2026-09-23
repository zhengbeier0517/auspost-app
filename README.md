# ParcelDesk

An English-language order operations workspace built with React, Vite, Express and Docker Compose. Browse orders, inspect GST calculations, search the product catalog, export order details and query the Australia Post / StarTrack testbed.

## Start with Docker

Requirements: Docker Desktop (or Docker Engine with Compose), a running Docker daemon and internet access for the first image build.

The local `.env` has been configured from the supplied test-account PDF. From the project root:

```sh
docker compose up --build -d
```

Open **http://localhost:8080**. The backend is reachable only through the frontend's `/api/` proxy; no backend port is published.

```sh
docker compose ps              # service and health status
docker compose logs --tail=50  # recent application logs
docker compose down           # stop the application
```

To change the public port, set `APP_PORT` in `.env` and run the start command again. Binding is restricted to localhost. This is a local assessment application, not a production system with user authentication.

For a fresh checkout without `.env`, copy `.env.example` to `.env` and populate the keys from your own test credentials. Blank keys are allowed: the UI will show a clear tracking-not-configured state. Port and testbed URL have application defaults.

## Configuration

| Variable | Purpose |
| --- | --- |
| APP_PORT | Frontend host port; default 8080 |
| AUSPOST_BASE_URL | Official testbed base URL: `https://digitalapi.auspost.com.au/test/shipping/v1/` |
| AUSPOST_API_KEY / AUSPOST_API_PASSWORD | Testbed Basic authentication credentials |
| AUSPOST_ACCOUNT_NUMBER | Australia Post account |
| STARTRACK_ACCOUNT_NUMBER | StarTrack account, retained as a string including its leading zero |
| AUSPOST_SAME_DAY_ACCOUNT_NUMBER | Supplied same-day account, reserved for future use |
| TNT_WEBLINK_USERNAME / TNT_WEBLINK_PASSWORD | Supplied optional Weblinking credentials, not currently used |
| TNT_UAT_USERNAME / TNT_UAT_PASSWORD / TNT_UAT_ACCOUNT_NUMBER | Supplied optional UAT credentials, not currently used |

Do not print or commit `.env`. Its local permissions are restricted. `.env.example` contains empty values only. Ignore rules cover the credential-bearing PDF and HTML reference documents, and all reference documents and environment files are excluded from Docker builds. The original PDF/HTML are already tracked in the existing initial commit: ignore rules do not remove tracked files or erase history. This task does not publish or rewrite the repository. Use a sanitized repository/export before any public submission, and do not publish those originals.

## Data ownership

- `docs/db-data.json` is the sole product source. The original file is unchanged; the application reads its `rows` array.
- `docs/test-data.json` supplies three fictional orders and customers, seventeen units across all ten catalog products, quantities and shipment associations. There are no duplicate product prices in this file.
- Test identifiers come from the supplied assessment documents. Their relationship to the generated orders is fictional. The courier testbed is not a live shipment service.
- The original assessment's nine unmatched SKUs are superseded by the user's direction to use the supplied catalog and generate missing data.

To add orders, edit `docs/test-data.json` using the existing structure and rebuild. In Docker, data is included in the image; source edits require `docker compose up --build -d`. Locally, data files are read on each request. Product illustrations are neutral CSS placeholders.

## Calculation decisions

RRP includes GST. Ex-GST line totals are calculated from `RRP × quantity / 1.10`, rounded half-up to cents. Rounded lines are added, then GST is calculated as 10% of that subtotal and rounded half-up. Total is subtotal + GST + shipping. Money is calculated with integer cents and BigInt rational arithmetic, avoiding floating-point accumulation. Displayed ex-GST unit prices are rounded independently and are not reused to calculate line totals.

Line rounding can create a one-cent difference from a separately summed tax-inclusive amount. All totals follow the documented line-rounding convention. Missing or duplicate SKUs and invalid quantities or prices make the order's subtotal, GST and total incomplete instead of treating the missing price as zero.

Shipping is deliberately **not estimated** and displays A$0.00 with an explicit explanation. It is not free shipping. A defensible estimate requires packaging and weight assumptions: source `weight` uses g, while `Volumetric_GrossWeight` uses kg and its business meaning is unclear. A future implementation should normalize dimensions, use origin 2111 and each destination postcode, estimate once per shipment, then sum shipment charges. TNT is an optional, unimplemented integration with a visible fallback.

## Tracking

The backend uses the official [Track Items reference](https://developers.auspost.com.au/content/apis/shipping-and-tracking/reference-track-items.html) and [REST authentication guidance](https://developers.auspost.com.au/apis/shipping-and-tracking/reference/restful): GET `/track`, a `tracking_ids` query parameter, Basic authentication, and the `Account-Number` header. Only the official testbed host/path is accepted before sending secrets.

Requests time out after ten seconds. Results are cached for sixty seconds, concurrent requests share a single upstream call, and the process limits upstream requests to ten per minute. Refresh within the cache interval returns cached data and labels it. Errors are reduced to safe user-facing messages; raw upstream response bodies are not exposed. A result must match the requested tracking identifier. Last event time is separate from query time; displayed tracking timestamps use Australia/Sydney.

TNT remains `not_implemented`. No fake success states, delivery events or quotation results are substituted for unavailable services. Testbed identifiers may have no matching response, and credentials may be rejected. The order's input status is shown independently of tracking status.

## Local development

Use Node.js 24 or newer.

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run dev
# In another terminal:
npm --prefix frontend run dev
```

Vite proxies `/api` to port 3001. The backend loads the root `.env`. Open the address printed by Vite.

```sh
npm test       # calculation, fixture and tracking behavior
npm run lint   # frontend lint
npm run build  # production frontend build
```

Backend entry point: `backend/app.js`. UI entry point: `frontend/src/App.jsx`. Shared UI components use the existing `frontend/components/` directory. See [PRD](docs/PRD.md) for detailed requirements and API routes.

## UI assumptions

The requested screenshot could not be opened at its supplied local path. The current interface uses an independent, responsive green-and-white operations design. All visible copy, errors and documentation are in English. Fonts have local system fallbacks if Google Fonts cannot be reached. The UI includes labelled navigation and search, keyboard focus states, reduced-motion support, loading/error feedback and a mobile layout.

## Validation performed

- Ten automated backend tests passed, covering precise calculations, invalid data, fixture references, tracking normalization, request authentication, caching, errors, host restrictions and rate limiting.
- Frontend lint and production build passed.
- Docker Compose built and started both services; both health checks passed.
- HTTP checks passed for the frontend, API proxy, three orders, ten products and unknown-order 404.
- Browser checks verified status filtering, order search, details, source catalog search and the catalog empty state.
- Live testbed check on 23 September 2026 returned HTTP 401 for the supplied StarTrack credentials/account. The UI shows this actual failure; valid credentials are needed for successful carrier tracking. TNT displays its explicit not-implemented state.
- Configured API keys/passwords were checked against the built frontend assets; none were present.
