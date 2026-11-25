# VetPulse Production Deployment

## Live URLs

| Component | URL |
|---|---|
| Web app (Netlify) | https://dulcet-lokum-81c6ac.netlify.app |
| API (Railway) | https://vetpulse-production-5744ba91.up.railway.app |
| AI service (Railway) | https://ai-service-production-47fbb141.up.railway.app |
| Health check | https://vetpulse-production-5744ba91.up.railway.app/api/health |
| AI health check | https://ai-service-production-47fbb141.up.railway.app/health |

Railway project: `magnificent-enthusiasm`
- Services: `VetPulse` (API), `ai-service`, `Postgres`
- Environment: `production`

## Architecture

```
Browser
  │  HTTPS
  ▼
Netlify (static React build, VITE_API_URL baked at build time)
  │  HTTPS + CORS (CLIENT_URL)
  ▼
Railway: VetPulse API (Express, port from $PORT)
  │  private network: http://ai-service.railway.internal:8000
  ▼
Railway: ai-service (FastAPI, pinned PORT=8000, CPU-only models)
  │
  ▼
Railway: Postgres (private network only)
```

The API downloads uploaded photos through its public domain
(`RAILWAY_PUBLIC_DOMAIN`) and passes those URLs to the AI service. The AI service
fetches the image, runs MobileNetV3-Small, and fuses vision (0.60) with XGBoost
symptoms (0.40), then applies calibration and abstention.

## Railway configuration

### API service (`VetPulse`)

- Source: local upload via `railway up` (Dockerfile at archive root)
- Dockerfile: `apps/api/Dockerfile`
- Start: `npx prisma migrate deploy && node dist/index.js`
- Health check: `/api/health`
- Variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Postgres `DATABASE_URL` (private host) |
| `JWT_SECRET` | 64-char random hex |
| `JWT_REFRESH_SECRET` | 64-char random hex |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://dulcet-lokum-81c6ac.netlify.app` |
| `AI_SERVICE_URL` | `http://ai-service.railway.internal:8000` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | `300` |
| `UPLOAD_DIR` | `./uploads` |

`PUBLIC_API_URL` is optional. If unset, the API derives it from
`RAILWAY_PUBLIC_DOMAIN`.

### AI service (`ai-service`)

- Dockerfile: `apps/ai-service/Dockerfile`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
- Health check: `/health`
- `PORT=8000` is pinned so the private-network URL is stable.
- Model binaries (`cattle_vision.pth`, `symptom_model.joblib`) are committed to
  the repository and copied into the image.
- `AI_PROVIDER` defaults to `local`.

### Postgres

- Railway managed PostgreSQL. No PostGIS extension is required by the schema.
- Migrations are applied by the API container on every boot.
- Seed once with `npx prisma db seed`.

## Redeploy

Railway is set up for **uploaded Dockerfile deployments**, not GitHub
auto-deploy. The GitHub source was detached and the service Root Directory is
empty; both services are built from an upload whose archive root contains the
service's `Dockerfile`.

`railway up` walks up to the git root, so running it inside `apps/api` still
uploads the monorepo root. To get a correct build root, copy the service files
into a clean folder and upload that folder:

```bash
# API
mkdir /tmp/vetpulse-api && cd /tmp/vetpulse-api
cp -r "$REPO"/apps/api/{package.json,package-lock.json,tsconfig.json,Dockerfile,.dockerignore,railway.json,prisma,src} .
railway up -p <project-id> -e production -s VetPulse

# AI service
mkdir /tmp/vetpulse-ai && cd /tmp/vetpulse-ai
cp -r "$REPO"/apps/ai-service/{app,models,requirements.txt,Dockerfile,.dockerignore,railway.json} .
mkdir data && cp "$REPO"/apps/ai-service/data/cattle_symptoms.csv data/
railway up -p <project-id> -e production -s ai-service
```

On Windows, use `Copy-Item` with the same file list. Do not include
`node_modules`, `dist`, `.env`, `uploads`, or `apps/ai-service/data/raw`.

Why not GitHub auto-deploy: Railway's Railpack build of `apps/api` starts but
never passes the `/api/health` check, while the Dockerfile image does. The API
Dockerfile is the supported production path. If you later set a Root Directory,
keep it empty unless you also switch the builder deliberately.

Frontend:

```bash
netlify deploy --prod
```

`netlify.toml` builds `apps/web` and bakes `VITE_API_URL` into the bundle.

## Seeding

Seeding needs a public route to Postgres. Create a temporary TCP proxy:

```bash
railway tcp-proxy create --port 5432 --service Postgres --json
```

Then, from `apps/api`:

```bash
$env:DATABASE_URL="postgresql://postgres:<password>@<proxy-host>:<proxy-port>/railway"
npx prisma db seed
```

Delete the proxy afterwards:

```bash
railway tcp-proxy delete <proxy-id> --service Postgres --yes
```

The seed is idempotent for demo users and creates 18 cattle, 183 health reports,
183 predictions, 28 disease clusters, 10 outbreak alerts, 2 vet reviews and 1
consultation.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Farmer | farmer@vetpulse.com | Farmer@123 |
| Veterinarian | vet@vetpulse.com | Vet@12345 |
| Admin | admin@vetpulse.com | Admin@123 |

## Operational notes

- **Uploads are ephemeral on Railway.** Report photos live on the API
  container's local disk and are lost on redeploy. Add object storage
  (S3/R2) before relying on historical photos.
- **CORS is restricted to `CLIENT_URL`.** Update it if the Netlify domain changes.
- **Proxy trust:** the API sets `trust proxy = 1` for Railway's edge proxy;
  without it `express-rate-limit` throws 500s.
- **AI service exposure:** the AI service has a public Railway domain for health
  checks. It can be removed if only private networking is desired.
- **Free/trial plan limits:** Railway may sleep or limit resources; the AI image
  is CPU-only to keep memory within typical container limits.

## Verification performed

- `GET /api/health` → `{"status":"ok"}`
- `GET /health` (AI) → `HEALTHY`, `local-fusion`, both models loaded
- Farmer login → JWT issued
- Symptom-only report → `local-tabular`, `LOADED`, confidence 0.999
- Photo + symptoms report → `local-fusion`, `analyzed`, confidence 0.9964
- CORS preflight from the Netlify origin → `204` with the correct
  `access-control-allow-origin`
- Netlify bundle contains the Railway API URL
