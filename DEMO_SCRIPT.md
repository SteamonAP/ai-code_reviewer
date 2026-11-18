# LogiOps - Demo Script

A 10-15 minute, presenter-led walkthrough of LogiOps for an assessor. Follow the steps in order.
Each step lists **what to do**, **what to say**, and **what to point out**. Open two browser
windows/tabs side by side for the realtime step. An optional technical design and deployment
discussion can extend the walkthrough by about 7-9 minutes.

---

## 0. Before you start (2 minutes, off the clock)

Have the full stack running:

| Service | URL | Check |
| --- | --- | --- |
| PostgreSQL (Docker) | `127.0.0.1:5433` | `docker ps` shows `assessment-postgres` |
| Backend API | `http://localhost:5000` | `curl http://localhost:5000/health` |
| Frontend SPA | `http://localhost:5173` | loads the login page |
| Analytics service | `http://localhost:5001` | `curl http://localhost:5001/health` |

Make sure the database is seeded (`npm run db:seed`) so the demo data exists. Keep a terminal open
with the backend logs visible so you can narrate what happens server-side.

Demo credentials:

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@logiops.com` | `Admin@123` |

Have the sample CSV ready (content in [section 9](#9-analytics-csv-upload)).

---

## Timing overview

| # | Step | Time |
| --- | --- | --- |
| 1 | Login | 1 min |
| 2 | Dashboard tour | 1 min |
| 3 | Create / edit / delete a customer | 2-3 min |
| 4 | Create a shipment | 1-2 min |
| 5 | Change status and watch realtime in a second tab | 2-3 min |
| 6 | Dashboard counts update | 1 min |
| 7 | AI assistant provider flow | 2 min |
| 8 | Analytics CSV upload and charts | 2-3 min |
| 9 | Wrap-up | 1 min |
| Optional | Technical design, scalability and deployment proposal | 7-9 min |

---

## 1. Login (1 minute)

**Do:** Open `http://localhost:5173`. Enter `admin@logiops.com` / `Admin@123` and sign in.

**Say:** "LogiOps is an internal logistics operations platform. This is the login screen. On submit,
the frontend calls `POST /api/v1/auth/login`. The backend verifies the password with bcrypt and
returns a signed JWT with a 15-minute lifetime; the SPA stores it and attaches it as a Bearer token
to every subsequent request."

**Point out:**

- In the backend log, the login request appears.
- The SPA is now on the authenticated shell; hitting a protected URL while logged out would redirect
  back to login.

---

## 2. Dashboard tour (1 minute)

**Do:** Land on the Dashboard. Point at the totals and the status distribution chart.

**Say:** "The dashboard is not a static image. On load the SPA calls
`GET /api/v1/dashboard/summary`, and the backend computes these numbers live with Prisma - a
`count` for total customers (excluding soft-deleted ones), a `count` for total shipments, and a
`groupBy` for the per-status distribution. Nothing here is hardcoded."

**Point out:**

- Total customers (3) and total shipments (4) match the seed data.
- The distribution covers all five statuses: Pending, PickedUp, InTransit, Delivered, Cancelled.

---

## 3. Create / edit / delete a customer (2-3 minutes)

**Do (create):** Go to Customers. Click "Add customer" (or equivalent). Create a customer, e.g.:

```text
Name:    Priya Sharma
Email:   priya@swiftcargo.com
Company: Swift Cargo
Status:  Active
```

**Say:** "Creating sends `POST /api/v1/customers`. The body is validated by a Zod schema before the
controller runs - name and company have length bounds, email must be a valid address, and status
must be one of Active/Inactive. On success the API returns `201` with the created record."

**Do (edit):** Edit the new customer - change its status to `Inactive` (or update the company).

**Say:** "PATCH applies a partial update. Only the fields I send change; the Zod update schema makes
every field optional."

**Do (validation demo):** Try to submit a customer with a bad email (e.g. `not-an-email`) or a
one-character name.

**Say:** "That is rejected with `422` and a field-level error list - the API never passes invalid
data to the database." (Point at the error surfaced in the UI, and the `422` in the backend log.)

**Do (duplicate demo, optional):** Try to create a customer with an email that already exists.

**Say:** "The database enforces uniqueness on customer email. Prisma raises `P2002` and the error
handler maps it to `409 Conflict` with a clear message."

**Do (delete):** Delete the test customer.

**Say:** "Delete is a **soft delete**: it sets `deletedAt` rather than removing the row. The
customer disappears from the list and from the dashboard count, but its shipment history would
remain intact - important because customers own shipments. The unique email stays reserved."

**Point out:** after deletion, the customer is gone from the list; the customer count returns to 3.

---

## 4. Create a shipment (1-2 minutes)

**Do:** Go to Shipments. Click "Add shipment" and create one linked to an existing customer, e.g.:

```text
Tracking number: TRK-2026-005
Customer:        Acme Logistics (or any existing customer)
Origin:          Chennai
Destination:     Kochi
Status:          Pending
```

**Say:** "Creating a shipment sends `POST /api/v1/shipments`, validated by Zod (tracking number
3-50 characters and unique, customer id required, origin/destination bounded). The list and create
responses include a summary of the owning customer, which is why the customer column renders
without an extra request."

**Point out:** the new shipment appears at the top of the list (ordered by creation date,
descending), and the total shipments count increases.

---

## 5. Change status and watch realtime (2-3 minutes)

**Do:** Arrange **two browser windows side by side**, both logged in (window A and window B), both
showing Shipments. In **window A**, change `TRK-2026-005` from `Pending` to `InTransit` (or any
status).

**Say:** "This is the realtime feature. Both windows have an open, authenticated Socket.IO
connection to the backend on the same port as the API. When I change the status, the backend
updates the database **first**, and only after that write succeeds does it broadcast a
`shipment_status_changed` event with the shipment id, tracking number, previous status, new status,
and timestamp. The current implementation broadcasts to all authenticated clients connected to
this backend instance; it does not yet filter events by customer, user or tenant."

**Point out:**

- Window B updates **without a manual refresh** (rows refresh and/or a toast appears).
- In the backend log: the PATCH request and socket connection logs (`Socket connected: <id>`).
  The event itself is not currently logged; use the browser's Network/Socket.IO tools if you want
  to inspect the emitted payload.

**Say (trade-off):** "Because Socket.IO keeps connections in the backend process, scaling to
multiple backend instances would require the Socket.IO Redis adapter so an event on one instance
reaches clients on another. That is documented as a future step and intentionally not implemented
here."

**Do (validation demo, optional):** Send an invalid status value (not one of the five) and show the
`422`.

---

## 6. Dashboard counts update (1 minute)

**Do:** Navigate window A back to the Dashboard (window B can stay on Shipments).

**Say:** "The dashboard recomputes on every load, so the numbers now reflect the changes I just
made - the extra shipment I created is counted, and the status distribution reflects the new
status."

**Point out:** the InTransit (or chosen status) bucket changed accordingly.

---

## 7. AI assistant provider flow (2 minutes)

**Do:** Open the AI Chat page. Ask a first question, then a follow-up that depends on the first.

```text
You:  How do tracking numbers work?
You:  And what do the different statuses mean?
```

**Say:** "The chat module stores each turn in PostgreSQL and, on every message, replays the last 20
messages of the conversation plus a system prompt to the configured AI provider. The provider is
selected by an environment variable: `mock` by default for a deterministic, offline demo,
`ollama` for a local LLM, or `openai` for OpenAI and compatible endpoints such as Azure OpenAI v1.
The hosted provider uses `OPENAI_API_KEY`, `OPENAI_BASE_URL` and `OPENAI_MODEL` from the backend
environment."

**Point out:**

- The assistant response appears in the chat and the conversation is saved.
- This demo uses `MockAIProvider`: its keyword-based replies are canned examples, not LLM-generated
  answers. The backend still sends the configured provider the system prompt and recent history,
  but the mock does not reason over that history.
- With a real provider, the same endpoint can return model-generated text. Neither the mock nor the
  configured provider currently gets live customer or shipment records from the database.
- Mention the resilience behaviour: "If a provider call fails, the service logs the error and returns
  a clear service-unavailable response without storing a fake assistant reply. There is deliberately
  no RAG or vector database - retrieval is outside this assessment scope."

---

## 8. Analytics CSV upload (2-3 minutes)

**Do:** Open the Analytics page. Upload the sample CSV (`sales_sample.csv`, content below).

**Say:** "This page talks to a separate stateless Flask microservice on port 5001, not the Node
backend. It accepts a CSV upload, validates the extension, size (max 5 MB), and that the required
columns are present with numeric, non-negative revenue, then computes descriptive statistics with
Pandas: total and average revenue, highest/lowest sale, record counts, unique salespeople and
regions, revenue by region, and the top five salespeople. The API returns those aggregates and
Plotly figure JSON; the frontend renders the aggregate results with Recharts."

**Point out:**

- Summary: total revenue 72,000, 6 records, 3 salespeople, 3 regions.
- The revenue-by-region chart (East 22,000 / North 17,000 / West 33,000) and the top-salespeople
  chart (Jane 33,000, John 22,000, David 17,000).
- The frontend renders the aggregate results with Recharts. The API also includes Plotly figure
  JSON for other clients.

**Do (validation demo, optional):** Upload a CSV missing the `region` column, or with a negative
revenue.

**Say:** "That is rejected with the same error envelope as the main API - a `422` with field-level
errors. The service is descriptive only: no machine learning, no training, and server-side PNG
export via Kaleido is explicitly out of scope."

---

## 9. Analytics CSV upload - sample content

Save this as `sales_sample.csv` (identical to `analytics-service/sample_data/sales_sample.csv`) and
upload it in step 8:

```csv
salesperson,revenue,region
John,10000,East
Jane,15000,West
John,12000,East
Jane,18000,West
David,8000,North
David,9000,North
```

Expected results after upload:

| Metric | Value |
| --- | --- |
| totalRevenue | 72000 |
| averageRevenue | 12000 |
| highestSale | 18000 |
| lowestSale | 8000 |
| totalRecords | 6 |
| uniqueSalespeople | 3 |
| uniqueRegions | 3 |

Revenue by region: East 22000, North 17000, West 33000.
Top salespeople: Jane 33000, John 22000, David 17000.

---

## 10. Wrap-up (1 minute)

**Say:** "To summarise, this is a React frontend, a layered TypeScript API, a Flask analytics service
and PostgreSQL. API request data is validated with Zod; the analytics service validates CSV input
in Python. The services run locally for this demo. I will finish with the reasons for this design
and a realistic path to production. The Azure deployment and CI/CD ideas are proposals only; this
project has not been deployed to Azure."

---

## 11. Optional technical deep dive: decisions, scale and deployment (7-9 minutes)

Use this section if the assessor wants more than a feature demo. The goal is to explain both
**what the code does today** and **what would change before a production rollout**. Do not present
the proposed cloud pipeline as something already built.

### 11.1 Architecture and a request's journey (1-2 minutes)

**Do:** Point to the architecture diagram in the README or open
[`ARCHITECTURE.md`](ARCHITECTURE.md). Trace one request, such as changing a shipment status.

```text
React page
  -> HTTP PATCH /api/v1/shipments/:id/status
  -> Express route and authentication middleware
  -> Zod request validation
  -> controller -> service -> repository
  -> Prisma -> PostgreSQL
  -> response to the caller
  -> Socket.IO event to connected authenticated clients
```

**Say:** "Each layer has a specific job. The route chooses the endpoint; middleware checks the
token and validates the input; the controller translates HTTP into a service call; the service
enforces business rules; and the repository uses Prisma to read or write PostgreSQL. This makes
the business rule easier to find and test than if every route contained SQL and response logic.
The tradeoff is more files and indirection for a small app, but it gives the modules a consistent
place to grow."

**Explain the order of the shipment update:** "The database update happens before the socket event.
That means a notification is not sent for an update that failed to save. The event is a notification
that clients should refresh their data; PostgreSQL remains the source of truth."

### 11.2 Why these boundaries and tradeoffs? (1 minute)

**Say:** "The main backend data is relational: a shipment belongs to a customer, so PostgreSQL and
Prisma provide relationships, constraints and migrations. The analytics service is separate because
the assignment asks for Python and Pandas, and CSV processing has a different runtime and workload
from the transactional API. The separation lets us deploy or scale analytics independently, but it
also adds another service to configure, monitor and secure."

**Point out these tradeoffs:**

- **Customer soft deletion:** keeps shipment history attached to its customer, but retains personal
  data and reserves the customer's unique email. A production system needs a retention/erasure
  policy.
- **AI provider abstraction:** lets the backend switch provider without changing the chat UI. The
  current `mock` provider is deterministic and free, but its canned replies are not a real language
  model and it has no live business-data access.
- **REST plus Socket.IO:** REST performs the durable update; Socket.IO makes other open clients
  aware of it. The current event is broadcast to authenticated clients on the same server instance,
  not scoped to a user's permissions or tenant.

### 11.3 Security: what is in place and what is not (1 minute)

**Say:** "The API hashes passwords with bcrypt, issues short-lived JWTs, reloads the user when
authenticating a request, validates inputs with Zod, and uses Prisma's parameterized queries.
Helmet, an explicit CORS origin list and rate limiting are also configured. The Socket.IO handshake
checks the JWT too. In production, the backend rejects a missing or weak JWT secret."

**Be clear about limitations:** "This is assignment-level security, not a complete enterprise
identity setup. The seeded admin account is for local demonstration only. JWTs are stored in browser
`localStorage`, which means an XSS flaw could expose one. The routes currently require
authentication, but do not apply role-based restrictions to actions such as customer deletion.
Before production, I would review token storage, add the required authorization policy, tighten
rate limits, and use a managed identity provider such as Microsoft Entra ID if required."

### 11.4 Scaling: the first bottlenecks and remedies (1 minute)

**Say:** "The REST API is mostly stateless between requests, so more API instances can serve more
traffic behind a load balancer. The database and WebSocket connections are the exceptions we need
to plan for."

1. **Database:** use managed PostgreSQL, monitor connection counts and query latency, and add
   indexes based on measured filters and sorts. Use connection pooling when multiple API instances
   would otherwise open too many database connections.
2. **Realtime:** today a socket event is local to the API instance that emitted it. With several
   instances, add the Socket.IO Redis adapter so instances can distribute events. If Socket.IO uses
   long-polling across instances, configure load-balancer affinity as well. If event visibility
   becomes tenant-specific, add authorized rooms instead of a global broadcast.
3. **Analytics:** the Flask service is stateless and can run independently. It currently accepts
   bounded CSV uploads; if files or workloads grow, move longer analysis to a background job and
   store uploads/results in object storage rather than keeping work in an HTTP request.
4. **Operations:** add readiness checks, dashboards and alerts for errors, latency, CPU, memory and
   database saturation before increasing instance counts.

### 11.5 Future delivery pipeline: GitHub Actions, images and Azure (2-3 minutes)

**Status today:** "PostgreSQL is the only service in the local Docker Compose file. The repository
does not currently have Dockerfiles for the application services or a project GitHub Actions
deployment workflow. So this is the deployment design I would implement next, not a claim that it
already deploys."

**Recommended target:** containerize the **backend API** and **analytics service** separately and
run them as separate Azure Container Apps. Keep the React app as static assets on Azure Static Web
Apps, which is simpler than running a web server container just to serve a static site. Use Azure
Database for PostgreSQL for production data; do not run the production database as an app container.
Use Azure Container Registry (ACR) to hold private images. Docker Hub can work too, but ACR is the
natural Azure-integrated registry and avoids making a public image the default.

```text
Developer opens a pull request
  -> GitHub Actions runs checks
       frontend: lint + production build
       backend: TypeScript build (+ backend tests when added)
       analytics: pytest
  -> merge to main
  -> build versioned backend and analytics container images
  -> scan images and push them to private Azure Container Registry
  -> deploy a staging revision to Azure Container Apps
  -> run health checks and smoke tests
  -> approval / release gate
  -> deploy the tested revision to production

Frontend: GitHub Actions -> Azure Static Web Apps build/deployment
Database: Azure Database for PostgreSQL, reached privately by the backend
Secrets: Azure Key Vault, accessed at runtime using managed identity
```

**Say:** "A pull request should run quality checks but should not deploy production. After merge,
GitHub Actions builds immutable images tagged with the commit ID, scans them and pushes them to
ACR. It then deploys a staging revision, checks `/health` and key API flows, and only then promotes
that revision to production. I would use GitHub's OIDC federation to authenticate the workflow to
Azure, rather than storing a long-lived Azure password in GitHub."

**Explain database changes:** "Schema changes need their own safe step. A deployment job would run
Prisma's production migration command, `prisma migrate deploy`, using a restricted database
identity. Migrations should be backward-compatible while old and new application revisions may
overlap: add a new column first, deploy code that supports both shapes, backfill if needed, then
remove obsolete columns in a later release. This is safer than assuming application code and schema
change atomically."

**Explain rollback and secrets:** "If the smoke test fails, keep the current production revision and
roll back the app image; do not blindly roll back a database migration. Application secrets such as
the database URL and JWT secret should be retrieved from Key Vault at runtime, never baked into an
image, Docker build argument, or repository. Keep the previous image tag so a known-good revision
can be redeployed."

**Tradeoff to acknowledge:** "This pipeline is more reliable and repeatable than manually copying
files, but it adds registry, cloud networking, identity, migration and monitoring work. I would
start with one staging environment and a small set of checks, then add automated integration tests
and production approval as the system matures."

### 11.6 Business-focused enhancements (1 minute)

Choose one or two, rather than promising to build everything:

- **Authorization and auditability:** define which roles can create, edit or soft-delete records;
  record who changed a shipment and when; scope queries and socket events by tenant if the product
  serves multiple companies.
- **Useful AI assistance:** add narrowly scoped, read-only tools that query authorized shipment or
  customer data, then let the model explain those results. Return the referenced shipment IDs or
  tracking numbers so staff can verify answers. Do not send unrestricted database access or
  unnecessary personal information to a model provider.
- **Operational reliability:** add backend integration tests against a temporary PostgreSQL
  instance, continuous dependency/image scanning, and deployment smoke tests before relying on
  automated releases.

**Close this section with:** "Those are proposed next steps. The current deliverable demonstrates
the application flows and service boundaries locally; it does not include application Dockerfiles,
a CI/CD deployment pipeline, Azure resources, multi-instance Socket.IO distribution, or
database-grounded AI answers."

---

## Likely assessor questions - quick answers

| Question | Answer |
| --- | --- |
| Why soft delete for customers? | Customers own shipments; hard delete would orphan or cascade shipment history. Soft delete keeps history attributed. A restore operation could be added if the business needs it. |
| How is the dashboard data produced? | Live Prisma `count` and `groupBy` at request time - never hardcoded. |
| How does realtime work? | Server emits `shipment_status_changed` after the DB write; clients subscribe via Socket.IO on the API port. |
| Would it scale horizontally? | Most REST requests are stateless, but Socket.IO fan-out across instances needs a shared adapter such as Redis; tenant-specific events also need authorization and rooms. |
| Why no RAG/vector DB? | The current assistant does not retrieve live database records or use RAG. For this assignment's demo, canned provider replies keep it free. If staff need shipment-specific answers, first add authorized read-only data tools; vector search is for relevant unstructured text, not a substitute for precise database queries. |
| How is injection prevented? | All data access is Prisma parameterised queries; there is no raw SQL. |
| How are secrets handled? | Environment variables locally; the proposed Azure design uses Key Vault + managed identity. |
| Is CI/CD or Docker deployment implemented? | No. Docker Compose currently runs local PostgreSQL only. The GitHub Actions + container registry + Azure Container Apps flow is a proposed enhancement, not a deployed pipeline. |
| What is out of scope? | ML/training, RAG/embeddings, voice agent, SharePoint announcements, Kaleido PNG export, real Azure deployment. |
