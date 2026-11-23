# VetPulse - AI-Powered Cattle Health Monitoring Platform

**VetPulse** is a comprehensive cattle health management platform designed for Indian cattle farmers. It helps farmers report health issues, receive AI-assisted preliminary disease assessments, connect with veterinarians, and enables administrators to monitor potential disease outbreaks geographically.

## ⚠️ Important Notice

This version uses **mock AI predictions only**. No actual machine learning model is integrated. The mock predictions are clearly labeled as simulated/demo outputs and are for demonstration purposes only.

## Features

### For Farmers
- Register and manage cattle profiles
- Submit health reports with symptoms and photos
- Receive AI-assisted preliminary disease assessments
- Request veterinarian consultations
- View health history and assessments

### For Veterinarians
- Review submitted health reports
- View AI predictions and provide clinical assessments
- Manage consultation requests
- Record clinical findings and recommendations

### For Administrators
- Platform-wide analytics and reporting
- Disease distribution monitoring
- Geographic disease mapping
- Potential outbreak detection using DBSCAN clustering
- User management

## Technology Stack

### Frontend
- React 18 with Vite
- TypeScript
- Tailwind CSS
- React Router v6
- TanStack Query
- Zustand (state management)
- Axios
- React Hook Form + Zod
- Recharts
- React Leaflet + Leaflet
- Lucide React

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL with PostGIS
- JWT Authentication
- bcrypt/Argon2 password hashing

### AI Service
- Python 3.11+
- FastAPI
- Pydantic v2
- Mock prediction provider (current)
- Ready for future model integration

## Project Structure

```
VetPulse/
├── apps/
│   ├── web/                 # React frontend
│   ├── api/                 # Express.js backend
│   └── ai-service/          # FastAPI AI service
├── packages/
│   └── shared-types/        # Shared TypeScript types
├── docs/                    # Documentation
├── docker-compose.yml       # Docker configuration
└── package.json             # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 16+ with PostGIS
- Docker & Docker Compose (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VetPulse
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run db:migrate
npm run db:seed
```

### Running Locally

#### Using Docker Compose (Recommended)

```bash
docker-compose up
```

#### Manual Setup

1. Start PostgreSQL with PostGIS

2. Start the AI service:
```bash
cd apps/ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

3. Start the API:
```bash
cd apps/api
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

4. Start the Web:
```bash
cd apps/web
npm install
npm run dev
```

### Demo Credentials

After seeding, you can use these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Farmer | ramesh_pawar@demo.com | Demo@123 |
| Veterinarian | dr.meena_sharma@demo.com | Demo@123 |
| Admin | admin@vetpulse.com | Admin@123 |

## API Documentation

### Authentication

```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login
POST /api/auth/refresh      - Refresh token
POST /api/auth/logout       - Logout
GET  /api/auth/me           - Get current user
```

### Cattle Management

```
GET    /api/cattle          - List cattle
POST   /api/cattle          - Register cattle
GET    /api/cattle/:id      - Get cattle details
PATCH  /api/cattle/:id      - Update cattle
DELETE /api/cattle/:id      - Archive cattle
GET    /api/cattle/:id/history - Get health history
```

### Health Reports

```
POST   /api/reports         - Submit health report
GET    /api/reports         - List reports
GET    /api/reports/:id     - Get report details
PATCH  /api/reports/:id     - Update report
GET    /api/reports/:id/prediction - Get AI prediction
```

### Veterinary

```
GET  /api/vet/dashboard       - Dashboard stats
GET  /api/vet/reports         - List reports for review
POST /api/vet/reviews         - Submit review
GET  /api/vet/consultations   - List consultations
POST /api/vet/consultations   - Create consultation
PATCH /api/vet/consultations/:id - Update consultation
```

### Admin

```
GET /api/admin/dashboard          - Dashboard
GET /api/admin/analytics         - Analytics data
GET /api/admin/disease-statistics - Disease stats
GET /api/admin/farmers            - List farmers
GET /api/admin/vets               - List veterinarians
GET /api/admin/reports            - All reports
```

### Outbreaks

```
GET    /api/outbreaks               - List clusters
GET    /api/outbreaks/:id           - Cluster details
POST   /api/outbreaks/recalculate   - Recalculate clusters
POST   /api/outbreaks/:id/investigate - Start investigation
PATCH  /api/outbreaks/:id/status    - Update status
```

### AI Service

```
GET /health       - Service health
GET /model-info   - Model information
POST /predict     - Get prediction
```

## Mock AI Predictions

The current AI service uses a **Mock Prediction Provider** that returns deterministic, realistic-looking outputs for demonstration purposes. All mock predictions are clearly labeled with:

- `provider: "mock"`
- `model_status: "MOCK"`
- `is_simulated: true`

Available mock scenarios:
- Healthy / No obvious warning signs
- Foot-and-Mouth Disease (FMD)
- Lumpy Skin Disease (LSD)
- Mastitis
- Bovine Respiratory Disease (BRD)
- Theileriosis
- Babesiosis
- Anaplasmosis
- Blackleg
- Bovine Ephemeral Fever
- Insufficient information
- Uncertain prediction

## Future Model Integration

The application is designed to seamlessly integrate a real ML model when available. See [docs/model-integration.md](docs/model-integration.md) for detailed instructions.

## Deployment

### Frontend (Vercel)
```bash
cd apps/web
vercel deploy
```

### Backend (Render/Northflank)
Deploy the API container with environment variables.

### AI Service
Deploy as a separate service, mounting model weights to `/app/model`.

## License

Private - All rights reserved
