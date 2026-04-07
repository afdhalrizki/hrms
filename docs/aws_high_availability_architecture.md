# HRMS High Availability Architecture (1 Million Users)

This document outlines the AWS architecture designed to support a scalable, decoupled, and elastic Human Resource Management System (HRMS) capable of handling up to 1 million users, specifically addressing sharp traffic spikes during morning attendance.

## System Architecture Diagram

```mermaid
flowchart TD
    User([User / Mobile App / Browser])
    
    subgraph Edge[AWS Edge Network]
        R53[Amazon Route 53]
        CF[Amazon CloudFront]
    end
    
    subgraph Storage[Storage Services]
        S3[Amazon S3\nStatic Files & Media]
    end

    subgraph VPC[Public & Private Subnets - VPC]
        ALB[Application Load Balancer]
        
        subgraph EKS[Amazon EKS - Fargate]
            Django1[Django Pod 1]
            Django2[Django Pod 2]
            DjangoN[Django Pod N]
            Worker1[Celery Worker 1]
            Worker2[Celery Worker 2]
        end
        
        subgraph Data[Data Layer]
            Redis[(ElastiCache Redis\nSession & Queue)]
            
            subgraph Aurora[Amazon Aurora PostgreSQL]
                Proxy[RDS Proxy]
                Master[(Primary Writer)]
                Replica1[(Read Replica 1)]
                Replica2[(Read Replica 2)]
            end
        end
    end

    User -->|DNS / Routing| R53
    R53 -->|CDN / Static Request| CF
    R53 -->|API Request| ALB
    CF <--> S3
    ALB --> Django1
    ALB --> Django2
    ALB --> DjangoN
    
    Django1 <--> Redis
    Django2 <--> Redis
    DjangoN <--> Redis
    
    Redis <--> Worker1
    Redis <--> Worker2
    
    Django1 -->|Read & Write| Proxy
    Django2 -->|Read & Write| Proxy
    DjangoN -->|Read & Write| Proxy
    Worker1 -->|Read & Write| Proxy
    Worker2 -->|Read & Write| Proxy
    
    Proxy --> Master
    
    Django1 -.->|SQL Report Analytics| Replica1
    Worker1 -.->|Heavy Read Tasks| Replica2
    
    Master -.->|Replication| Replica1
    Master -.->|Replication| Replica2
    
    Worker1 -->|Upload/Download| S3
    Django1 -->|Pre-signed URL Generates| S3
```

## Core Infrastructure Components

| Layer | Service | Description | Key Details |
|---|---|---|---|
| Compute | **AWS EKS (Kubernetes)** | Handles application scaling and runs Django containers without manual EC2 management. | **Auto-scaling:** Spins up pods during 08:00 AM spikes.<br>**AWS Fargate:** Serverless compute for containers. |
| Database | **Amazon RDS Multi-AZ + Read Replicas** | The multi-tenant heart of the system supporting intense queries. | **Primary:** Write transactions.<br>**Read Replicas:** 2-3 replicas for Dashboard Analytics.<br>**Aurora PostgreSQL:** Auto-scaling storage without downtime.<br>**RDS Proxy:** Crucial connection pooling for concurrent traffic. |
| Storage & CDN | **Amazon S3 + CloudFront** | Offloads media and delivers static front-end assets globally. | **S3:** Central lake for biometric photos and PDF slips.<br>**CloudFront (CDN):** Delivers Next.js build caches and media with low latency. |
| Traffic | **Application Load Balancer (ALB)** | Routes API requests and handles SSL natively. | Distributes traffic evenly to EKS pods and unloads decryption CPU overhead. |
| Caching & Queue | **ElastiCache (Redis)** | High-concurrency in-memory cache and message broker. | **Session Management:** Stateless authentication (prevents logouts).<br>**Queue (Celery):** Background processing for tax rules and payrolls. |

---

## Data Flow Summary

| Step | Action | Main Service Route | Detailed Operation |
|---|---|---|---|
| 1 | **User Request** | Route 53 → CloudFront / ALB | Traffic initiates via DNS and routes to CDN (for UI/Static) or ALB (for API queries). |
| 2 | **API Routing** | ALB → EKS (Django) | ALB balances the HTTP proxies to optimal pods inside the Kubernetes cluster. |
| 3 | **Optimized Lookups** | Django → Redis & Aurora | Django checks Redis cache first. If void, it hits PostgreSQL exclusively passing through RDS Proxy. |
| 4 | **Asynchronous Hand-off** | Django → Redis Queue → Celery | Payrolls and heavy operations are pushed to the Queue, immediately freeing up the UI, while Celery crunches tasks. |
| 5 | **Direct Storage Routing** | Django → S3 | Biometric uploads request signed URLs from Django, then directly upload massive image payloads to S3 bucket edges. |

---

## Cost Optimization & Efficiency Strategies

| Strategy | Target | Impact & Benefit |
|---|---|---|
| **Reserved Instances (RI)** | Aurora DB & Fargate | Committing upfront for 1-3 years yields roughly ~40% discount versus on-demand options. |
| **S3 Lifecycle Policies** | Amazon S3 & Glacier | Automatically archives old biometric photos and docs (>6 months) to much cheaper Glacier storage retainment. |
| **AWS Compute Optimizer** | EKS Pods & DB Memory | Intelligent ML evaluation to right-size global architectures, ensuring nothing is wastefully oversized. |

---

## Essential Django Backend Libraries Integration

To properly support the cloud infrastructure above, the codebase requires the following critical packages:

| Library | Purpose Description | Key Configuration Focus |
|---|---|---|
| `boto3` & `django-storages` | Integrates native AWS S3 routing logic for overriding dynamic media files storage locations. | Explicitly mapping `DEFAULT_FILE_STORAGE` and `STATICFILES_STORAGE` via environment constants safely replacing local machine directories. |
| `django-redis` | Exposes connections allocating Redis nodes as primary cache and robust session framework backends. | Setting core settings variables `SESSION_ENGINE = 'django.contrib.sessions.backends.cache'` alongside establishing internal `CACHES` structures. |
| `celery` & `redis` | Establishes queue workers ecosystems capable to digest extensive procedures isolated from HTTP web threads. | Establishing explicit `CELERY_BROKER_URL` routing strictly aiming at ElastiCache VPC nodes. |
| `psycopg2-binary` | Production-grade C wrappers ensuring optimal Postgres server integration pipelines natively. | Setting `DATABASES['default']` blocks explicitly towards `django.db.backends.postgresql` targets bridging RDS Proxy instances. |
| `gunicorn` / `uvicorn` | WSGI / ASGI runners maximizing scalable concurrent threads capacity safely encapsulated inside worker spaces. | Designing robust CMD instructions within standard Dockerfiles dynamically utilizing variable worker boundaries limits. |
| `django-health-check` | Yielding internal system heartbeat routes instructing external load balancers and node autoscalers. | Adding `/health/` view sets confirming functional states ensuring no bad or degraded pods operate web transactions internally. |
| `django-environ` | Structuring secure and strict deployment environment injections parsing dynamically hidden key sets variables accurately. | Unlocking straightforward mapping mechanisms resolving external systems strictly without establishing vulnerable hardcoded configurations layouts. |
| `django-db-geventpool` | *(Optional module)* Enables pooling algorithms safely inside Django layer threads accommodating intense blocking instances specifically resolving external proxies configurations optimally. | Configured primarily internally inside specialized Gunicorn settings layouts natively serving high density network connections efficiently. |
