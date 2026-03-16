# harikerja HRMS SaaS

A next-generation, multi-tenant Human Resource Management System (HRMS) built for enterprise scale. This platform provides a comprehensive suite for HR management, attendance tracking with biometric liveness detection, Indonesian payroll compliance (TER 2024), and Executive Analytics.

## 🚀 Quick Start (Docker)

The fastest way to get the environment running is using Docker:

```bash
docker-compose up --build
```

**Access Points:**
- **Admin Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

> [!NOTE]
> For multi-tenant access, ensure you map subdomains in your `hosts` file (e.g., `company1.localhost` -> `127.0.0.1`).

## 🛠 Tech Stack

- **Backend**: Python 3.12, Django 5.0, [Django-Tenants](https://github.com/django-tenants/django-tenants) (Architecture), DRF.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion.
- **Mobile**: Flutter 3.19+, Google ML Kit (Biometrics).
- **Infras**: PostgreSQL, Redis (Caching), PgBouncer (Pooling), Docker.

## 📁 Project Structure

```text
├── backend/            # Django API & Tennant Services
├── frontend/           # Next.js Admin Dashboard
├── mobile/             # Flutter Employee Application
├── docs/               # Detailed Implementation & Walkthroughs
├── qa/                 # Performance & Manual Testing Hub
└── environments/       # Multi-env configuration templates
```

## 💎 Key Features

- **Multi-Tenant Isolation**: Complete data separation using PostgreSQL schemas.
- **Biometric Attendance**: Face recognition with liveness check for secure check-ins.
- **Indonesian Payroll**: Fully compliant with TER 2024 PPh 21 and BPJS calculation engine.
- **Executive Analytics**: Real-time HR cost and efficiency dashboards.
- **Auto-Onboarding**: Self-service tenant registration flow with internal admin approval.

## 📖 Documentation

For detailed guides and implementation history, refer to:
- [**Full Walkthrough**](file:///d:/hr/hrms/docs/walkthrough.md): Comprehensive project history and visual verification.
- [**Implementation Plan**](file:///d:/hr/hrms/docs/implementation_plan.md): Technical roadmap and phase-by-phase details.
- [**Task Checklist**](file:///d:/hr/hrms/docs/task.md): Current development status and backlog.

## 🧪 Testing

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd frontend
npm test
```

---
**Status**: Milestone 🎉 Phase 3 100% Complete. Operational & Verified.
