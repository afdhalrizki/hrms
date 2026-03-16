# HRMS SaaS Frontend (Next.js)

This is the premium admin dashboard for the HRMS SaaS application, built with Next.js, Tailwind CSS, and Framer Motion.

## Features
- **Tenant-Aware Dashboard**: Automatically identifies the tenant based on the subdomain.
- **Glassmorphism UI**: High-end, dark-mode aesthetic with smooth animations.
- **Real-time Attendance Stream**: Live updates from the backend attendance API.
- **Executive Analytics**: Interactive charts for cost analysis and headcount trends.
- **Shift Management**: Full roster and shift assignment grid for administrators.

## Prerequisites
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher

## 1. Installation

### Install Dependencies
```bash
cd frontend
npm install
```

## 2. Configuration
The frontend automatically detects the current tenant by parsing the hostname. Ensure your backend is running and that your local `hosts` file includes entries for your tenants.

**Required hosts entry:**
`127.0.0.1 company1.localhost`

The API base URL is currently set to `http://localhost:8000`.

## 3. Running Locally

### Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public tenant or [http://company1.localhost:3000](http://company1.localhost:3000) for a specific tenant dashboard.

## 4. Scripts
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the production-ready application.
- `npm run start`: Starts the built production application.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run test`: Runs the test suite using Vitest.

## 5. Testing
The project uses `Vitest` for frontend component testing:
```bash
npm run test
```

---
**Status**: Integrated with Phase 3 Attendance Intelligence & Shift Management.
