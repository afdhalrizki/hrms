# Local Development Deployment

This guide outlines the steps to run the harikerja HRMS platform locally on your machine for development and testing.

## Prerequisites
- Docker & Docker Compose
- Git
- Node.js 18+ (Optional, for running frontend outside docker)

## Step 1: Clone and Configure
1. Clone the repository to your local machine:
   ```bash
   git clone <repository-url>
   cd hrms
   ```
2. Set up environment variables locally (or rely on the docker defaults). The `environments/` folder contains examples.

## Step 2: Bootstrapping with Docker Compose
The entire stack (PostgreSQL, Redis, PgBouncer, Django Backend) is containerized for easy local startup.

```bash
docker-compose up --build
```
*Note: The frontend is currently run separately in development to leverage Next.js hot-reloading.*

## Step 3: Database Initialization
On the first run, the PostgreSQL database will be empty. You must create the multi-tenant schema and the `public` schema.

Open a new terminal and run migrations inside the backend container:
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate_schemas --shared
```

## Step 4: Run Frontend Locally
In a separate terminal, navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```

## Step 5: Accessing the Application
- **Main Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

### Note on Multi-Tenancy (Localhost)
To test logging into a specific company's workspace (e.g., "acme"), you must map the subdomain in your local OS `hosts` file:
```text
# Add to C:\Windows\System32\drivers\etc\hosts or /etc/hosts
127.0.0.1  acme.harikerja.com
```
Then access [http://acme.harikerja.com:3000](http://acme.harikerja.com:3000).
