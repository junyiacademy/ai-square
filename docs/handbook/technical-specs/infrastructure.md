# Infrastructure Technical Specification

## Overview

This document outlines the technical infrastructure architecture for AI Square, following the phased approach defined in the PRD. The system evolves from GitHub Pages hosting (Phase 1, $0/month) to enterprise-grade GCP infrastructure (Phase 4+, $1000+/month).

## Architecture Design

### 漸進式基礎設施演進

#### Phase 1-2: GitHub Pages + Cloud Run (現況)
```
┌────────────────────────────────────────────────────────┐
│                    Simple Setup                         │
├────────────────────────────────────────────────────────┤
│   GitHub Pages    │    Cloud Run     │   Vertex AI     │
│   (Static Host)   │    (Backend)     │   (AI APIs)     │
│   Cost: $0        │   Cost: ~$10/mo  │  Cost: Usage    │
└────────────────────────────────────────────────────────┘
```

#### Phase 3: Production Infrastructure
```
┌────────────────────────────────────────────────────────┐
│                 Google Cloud Platform                   │
├────────────────────────────────────────────────────────┤
│                    Load Balancer                        │
│                         ↓                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Cloud Run  │  │  Cloud Run  │  │ Memory Store│   │
│  │  (Frontend) │  │  (Backend)  │  │   (Redis)   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│                   Data Layer                            │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ Cloud SQL   │  │   Cloud     │                     │
│  │(PostgreSQL) │  │  Storage    │                     │
│  └─────────────┘  └─────────────┘                     │
└────────────────────────────────────────────────────────┘
Cost: ~$200/month
```

#### Phase 4+: Enterprise Scale
```
┌────────────────────────────────────────────────────────┐
│                 Google Cloud Platform                   │
├────────────────────────────────────────────────────────┤
│                    Global Load Balancer                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  US-East1   │  │  Europe-W1  │  │  Asia-NE1   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│                  Kubernetes Clusters                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Frontend  │  │   Backend   │  │   Workers   │   │
│  │   (GKE)     │  │   (GKE)     │  │   (GKE)     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│                   Data Layer                            │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ PostgreSQL  │  │    Redis    │                     │
│  │  Cloud SQL  │  │  Memorystore│                     │
│  └─────────────┘  └─────────────┘                     │
└────────────────────────────────────────────────────────┘
Cost: $1000+/month
```

## Technical Requirements

### Core Infrastructure Components

1. **Compute Resources**
   - GKE clusters for container orchestration
   - Cloud Run for serverless workloads
   - Compute Engine for specialized workloads
   - Auto-scaling configuration

2. **Data Storage**
   - Cloud SQL for PostgreSQL (primary database)
   - Memorystore for Redis (caching)
   - Cloud Storage for objects
   - BigQuery for analytics

3. **Networking**
   - Global Load Balancer
   - Cloud CDN
   - VPC with private subnets
   - Cloud Armor for DDoS protection

4. **Security**
   - Identity & Access Management (IAM)
   - Secret Manager
   - Cloud KMS for encryption
   - Security Command Center

## Implementation Details

### 1. GCP Project Structure (根據階段)

#### Phase 1-2: Minimal Setup
> **Note**: Infrastructure is managed via GitHub Actions + gcloud CLI. Examples below are for reference only.

```yaml
# Historical example (not in use)
# Infrastructure managed via .github/workflows/
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Single project for MVP
resource "google_project" "ai_square_mvp" {
  name       = "AI Square MVP"
  project_id = "ai-square-mvp"
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "aiplatform.googleapis.com"
  ])

  project = google_project.ai_square_mvp.project_id
  service = each.key
}
```

#### Phase 3+: Full Project Structure
> **Note**: Infrastructure is managed via GitHub Actions + gcloud CLI.

```yaml
# Historical example (not in use)
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Project hierarchy
resource "google_project" "ai_square_prod" {
  name       = "AI Square Production"
  project_id = "ai-square-prod"
  folder_id  = google_folder.production.name
}

resource "google_project" "ai_square_staging" {
  name       = "AI Square Staging"
  project_id = "ai-square-staging"
  folder_id  = google_folder.staging.name
}

resource "google_project" "ai_square_dev" {
  name       = "AI Square Development"
  project_id = "ai-square-dev"
  folder_id  = google_folder.development.name
}

# Enable required APIs
locals {
  apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "storage-api.googleapis.com",
    "bigquery.googleapis.com",
    "cloudkms.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com"
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.apis)
  project  = google_project.ai_square_prod.project_id
  service  = each.key
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "ai-square-vpc"
  project                 = google_project.ai_square_prod.project_id
  auto_create_subnetworks = false
}

# Regional subnets
resource "google_compute_subnetwork" "us_east1" {
  name          = "subnet-us-east1"
  project       = google_project.ai_square_prod.project_id
  network       = google_compute_network.vpc.id
  region        = "us-east1"
  ip_cidr_range = "10.0.1.0/24"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

resource "google_compute_subnetwork" "europe_west1" {
  name          = "subnet-europe-west1"
  project       = google_project.ai_square_prod.project_id
  network       = google_compute_network.vpc.id
  region        = "europe-west1"
  ip_cidr_range = "10.0.2.0/24"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.3.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.4.0.0/16"
  }
}

# Cloud Load Balancer
resource "google_compute_global_address" "default" {
  name    = "ai-square-global-ip"
  project = google_project.ai_square_prod.project_id
}

resource "google_compute_backend_service" "default" {
  name                  = "ai-square-backend"
  project               = google_project.ai_square_prod.project_id
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    client_ttl                   = 7200
    max_ttl                      = 86400
    negative_caching            = true
    serve_while_stale           = 86400
  }

  health_checks = [google_compute_health_check.default.id]

  backend {
    group = google_compute_instance_group_manager.frontend.instance_group
  }
}
```

### 2. Kubernetes Configuration

```yaml
# k8s/clusters/production/cluster-config.yaml
apiVersion: container.gke.io/v1beta1
kind: Cluster
metadata:
  name: ai-square-prod
spec:
  initialNodeCount: 3
  nodeConfig:
    machineType: n2-standard-4
    diskSizeGb: 100
    diskType: pd-ssd
    imageType: COS_CONTAINERD
    labels:
      env: production
      team: platform
    metadata:
      disable-legacy-endpoints: "true"
    serviceAccount: ai-square-gke-sa@ai-square-prod.iam.gserviceaccount.com

  # Cluster autoscaling
  autoscaling:
    enabled: true
    minNodeCount: 3
    maxNodeCount: 100
    autoprovisioning:
      enabled: true
      resourceLimits:
        - resourceType: cpu
          minimum: 10
          maximum: 1000
        - resourceType: memory
          minimum: 40
          maximum: 4000

  # Network configuration
  network: ai-square-vpc
  subnetwork: subnet-us-east1
  ipAllocationPolicy:
    clusterSecondaryRangeName: pods
    servicesSecondaryRangeName: services

  # Security
  privateClusterConfig:
    enablePrivateNodes: true
    enablePrivateEndpoint: false
    masterIpv4CidrBlock: 172.16.0.0/28

  masterAuthorizedNetworksConfig:
    cidrBlocks:
      - displayName: office
        cidrBlock: 203.0.113.0/24

  # Addons
  addonsConfig:
    httpLoadBalancing:
      disabled: false
    horizontalPodAutoscaling:
      disabled: false
    networkPolicyConfig:
      disabled: false
    cloudRunConfig:
      disabled: false

---
# k8s/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: production
    istio-injection: enabled

---
# k8s/deployments/frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        version: v1
    spec:
      containers:
      - name: frontend
        image: gcr.io/ai-square-prod/frontend:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_URL
          value: "https://api.aisquare.com"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/deployments/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        version: v1
    spec:
      containers:
      - name: backend
        image: gcr.io/ai-square-prod/backend:latest
        ports:
        - containerPort: 8000
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/services/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: production
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8000
    name: http

---
# k8s/hpa/backend-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

### 3. Database Architecture

```python
# infrastructure/database/postgresql.py
from typing import Dict, List, Optional
import asyncpg
import asyncio

class DatabaseConfiguration:
    """PostgreSQL configuration for Cloud SQL"""

    def __init__(self):
        self.primary_config = {
            "instance_name": "ai-square-prod:us-east1:primary",
            "tier": "db-custom-16-65536",  # 16 vCPUs, 64GB RAM
            "disk_size": 1000,  # GB
            "disk_type": "PD-SSD",
            "backup_configuration": {
                "enabled": True,
                "start_time": "03:00",
                "location": "us",
                "point_in_time_recovery_enabled": True,
                "transaction_log_retention_days": 7
            },
            "high_availability": {
                "enabled": True,
                "type": "REGIONAL"
            }
        }

        self.read_replica_configs = [
            {
                "name": "replica-us-west1",
                "region": "us-west1",
                "tier": "db-custom-8-32768"
            },
            {
                "name": "replica-europe-west1",
                "region": "europe-west1",
                "tier": "db-custom-8-32768"
            },
            {
                "name": "replica-asia-northeast1",
                "region": "asia-northeast1",
                "tier": "db-custom-8-32768"
            }
        ]

class DatabaseConnectionPool:
    """Manages database connection pooling"""

    def __init__(self, config: Dict):
        self.config = config
        self.write_pool: Optional[asyncpg.Pool] = None
        self.read_pools: Dict[str, asyncpg.Pool] = {}

    async def initialize(self):
        """Initialize connection pools"""

        # Create write pool (primary)
        self.write_pool = await asyncpg.create_pool(
            dsn=self.config["primary_dsn"],
            min_size=10,
            max_size=50,
            max_queries=50000,
            max_inactive_connection_lifetime=300,
            command_timeout=60
        )

        # Create read pools (replicas)
        for replica in self.config["replicas"]:
            pool = await asyncpg.create_pool(
                dsn=replica["dsn"],
                min_size=5,
                max_size=25,
                max_queries=50000,
                max_inactive_connection_lifetime=300,
                command_timeout=60
            )
            self.read_pools[replica["region"]] = pool

    async def get_read_connection(
        self,
        region: Optional[str] = None
    ) -> asyncpg.Connection:
        """Get connection from nearest read replica"""

        if region and region in self.read_pools:
            pool = self.read_pools[region]
        else:
            # Select pool with lowest latency
            pool = await self._select_optimal_read_pool()

        return await pool.acquire()

    async def get_write_connection(self) -> asyncpg.Connection:
        """Get connection to primary for writes"""
        return await self.write_pool.acquire()

# Database schema management
class SchemaManager:
    """Manages database schema and migrations"""

    async def create_schema(self):
        """Create initial database schema"""

        schema_sql = """
        -- Enable extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

        -- Create schemas
        CREATE SCHEMA IF NOT EXISTS app;
        CREATE SCHEMA IF NOT EXISTS analytics;
        CREATE SCHEMA IF NOT EXISTS audit;

        -- Partitioned tables for time-series data
        CREATE TABLE analytics.events (
            id UUID DEFAULT uuid_generate_v4(),
            event_type VARCHAR(50) NOT NULL,
            user_id UUID,
            session_id VARCHAR(100),
            data JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);

        -- Create monthly partitions
        CREATE TABLE analytics.events_2024_01
        PARTITION OF analytics.events
        FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

        -- Indexes for performance
        CREATE INDEX CONCURRENTLY idx_events_user_created
        ON analytics.events (user_id, created_at);

        CREATE INDEX CONCURRENTLY idx_events_type_created
        ON analytics.events (event_type, created_at);

        CREATE INDEX CONCURRENTLY idx_events_data_gin
        ON analytics.events USING gin(data);

        -- Materialized views for analytics
        CREATE MATERIALIZED VIEW analytics.daily_active_users AS
        SELECT
            DATE(created_at) as date,
            COUNT(DISTINCT user_id) as dau,
            COUNT(*) as total_events
        FROM analytics.events
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(created_at);

        CREATE UNIQUE INDEX ON analytics.daily_active_users (date);

        -- Table for sharding user data
        CREATE TABLE app.users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            shard_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CHECK (shard_id >= 0 AND shard_id < 100)
        );

        -- Create function for automatic sharding
        CREATE OR REPLACE FUNCTION app.get_shard_id(user_id UUID)
        RETURNS INTEGER AS $$
        BEGIN
            RETURN abs(hashtext(user_id::text)) % 100;
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
        """

        # Execute schema creation
        async with self.pool.get_write_connection() as conn:
            await conn.execute(schema_sql)

# Query optimization
class QueryOptimizer:
    """Optimizes database queries"""

    def __init__(self, connection_pool: DatabaseConnectionPool):
        self.pool = connection_pool

    async def analyze_slow_queries(self) -> List[Dict]:
        """Analyze slow queries using pg_stat_statements"""

        query = """
        SELECT
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            stddev_exec_time,
            rows
        FROM pg_stat_statements
        WHERE mean_exec_time > 100  -- queries slower than 100ms
        ORDER BY mean_exec_time DESC
        LIMIT 20
        """

        async with self.pool.get_read_connection() as conn:
            results = await conn.fetch(query)

        return [dict(r) for r in results]

    async def create_missing_indexes(self):
        """Identify and create missing indexes"""

        # Find missing indexes
        missing_indexes_query = """
        SELECT
            schemaname,
            tablename,
            attname,
            n_distinct,
            most_common_vals
        FROM pg_stats
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND n_distinct > 100
        AND tablename || '.' || attname NOT IN (
            SELECT
                tablename || '.' || column_name
            FROM information_schema.constraint_column_usage
        )
        ORDER BY n_distinct DESC
        """

        async with self.pool.get_read_connection() as conn:
            candidates = await conn.fetch(missing_indexes_query)

        # Create indexes for high-cardinality columns
        for candidate in candidates:
            if candidate['n_distinct'] > 1000:
                index_sql = f"""
                CREATE INDEX CONCURRENTLY idx_{candidate['tablename']}_{candidate['attname']}
                ON {candidate['schemaname']}.{candidate['tablename']} ({candidate['attname']})
                """

                async with self.pool.get_write_connection() as conn:
                    await conn.execute(index_sql)
```

### 4. Caching Infrastructure

```python
# infrastructure/caching/redis.py
from typing import Dict, List, Optional, Any
import redis.asyncio as redis
import msgpack
import json

class CacheConfiguration:
    """Redis cache configuration"""

    def __init__(self):
        self.redis_configs = {
            "primary": {
                "host": "10.0.1.10",  # Memorystore IP
                "port": 6379,
                "tier": "standard",
                "memory_size_gb": 16,
                "version": "6.x",
                "high_availability": True,
                "replica_count": 1
            },
            "session": {
                "host": "10.0.1.11",
                "port": 6379,
                "tier": "basic",
                "memory_size_gb": 8,
                "version": "6.x",
                "maxmemory_policy": "allkeys-lru"
            },
            "cache": {
                "host": "10.0.1.12",
                "port": 6379,
                "tier": "standard",
                "memory_size_gb": 32,
                "version": "6.x",
                "maxmemory_policy": "allkeys-lfu"
            }
        }

class CacheManager:
    """Manages distributed caching"""

    def __init__(self, config: Dict):
        self.config = config
        self.clients: Dict[str, redis.Redis] = {}
        self.serializer = msgpack

    async def initialize(self):
        """Initialize Redis connections"""

        for name, cfg in self.config.items():
            client = redis.Redis(
                host=cfg["host"],
                port=cfg["port"],
                decode_responses=False,
                max_connections=50,
                health_check_interval=30
            )
            self.clients[name] = client

            # Test connection
            await client.ping()

    async def get(
        self,
        key: str,
        cache_name: str = "cache"
    ) -> Optional[Any]:
        """Get value from cache"""

        client = self.clients[cache_name]
        value = await client.get(key)

        if value:
            return self.serializer.unpackb(value)

        return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600,
        cache_name: str = "cache"
    ):
        """Set value in cache"""

        client = self.clients[cache_name]
        packed_value = self.serializer.packb(value)

        await client.setex(key, ttl, packed_value)

    async def delete_pattern(
        self,
        pattern: str,
        cache_name: str = "cache"
    ):
        """Delete keys matching pattern"""

        client = self.clients[cache_name]

        # Use SCAN to avoid blocking
        cursor = 0
        while True:
            cursor, keys = await client.scan(
                cursor,
                match=pattern,
                count=100
            )

            if keys:
                await client.delete(*keys)

            if cursor == 0:
                break

class CacheWarmer:
    """Preloads cache with frequently accessed data"""

    def __init__(self, cache_manager: CacheManager, db_pool):
        self.cache = cache_manager
        self.db = db_pool

    async def warm_cache(self):
        """Warm cache with critical data"""

        tasks = [
            self._warm_user_cache(),
            self._warm_content_cache(),
            self._warm_config_cache()
        ]

        await asyncio.gather(*tasks)

    async def _warm_user_cache(self):
        """Warm user-related cache"""

        # Get recently active users
        query = """
        SELECT id, email, name, preferences
        FROM users
        WHERE last_login > NOW() - INTERVAL '7 days'
        LIMIT 10000
        """

        async with self.db.get_read_connection() as conn:
            users = await conn.fetch(query)

        # Cache user data
        for user in users:
            cache_key = f"user:{user['id']}"
            await self.cache.set(
                cache_key,
                dict(user),
                ttl=3600
            )

    async def _warm_content_cache(self):
        """Warm content cache"""

        # Get popular content
        query = """
        SELECT c.*, COUNT(v.id) as view_count
        FROM content c
        LEFT JOIN content_views v ON c.id = v.content_id
        WHERE v.created_at > NOW() - INTERVAL '24 hours'
        GROUP BY c.id
        ORDER BY view_count DESC
        LIMIT 1000
        """

        async with self.db.get_read_connection() as conn:
            content_items = await conn.fetch(query)

        # Cache content
        for content in content_items:
            cache_key = f"content:{content['id']}"
            await self.cache.set(
                cache_key,
                dict(content),
                ttl=7200
            )

# Multi-level caching strategy
class MultiLevelCache:
    """Implements L1/L2 caching strategy"""

    def __init__(self, local_cache_size: int = 1000):
        self.l1_cache = LRUCache(maxsize=local_cache_size)  # In-memory
        self.l2_cache = CacheManager(config)  # Redis

    async def get(self, key: str) -> Optional[Any]:
        """Get from L1, fallback to L2"""

        # Check L1 (local memory)
        value = self.l1_cache.get(key)
        if value is not None:
            return value

        # Check L2 (Redis)
        value = await self.l2_cache.get(key)
        if value is not None:
            # Promote to L1
            self.l1_cache.set(key, value)

        return value

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ):
        """Set in both L1 and L2"""

        # Set in L1
        self.l1_cache.set(key, value, ttl)

        # Set in L2
        await self.l2_cache.set(key, value, ttl)
```

### 5. Monitoring and Observability

```yaml
# monitoring/prometheus/config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

---
# monitoring/grafana/dashboards/infrastructure.json
{
  "dashboard": {
    "title": "AI Square Infrastructure",
    "panels": [
      {
        "title": "Cluster CPU Usage",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)"
          }
        ]
      },
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname='aisquare'}"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)"
          }
        ]
      }
    ]
  }
}

---
# monitoring/alerts/infrastructure.yaml
groups:
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: |
          100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High CPU usage detected
          description: "CPU usage is above 80% (current value: {{ $value }}%)"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High number of database connections
          description: "Database connections are above 80 (current value: {{ $value }})"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Pod is crash looping
          description: "Pod {{ $labels.pod }} is crash looping"

      - alert: DiskSpaceRunningOut
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Disk space running out
          description: "Disk space is below 10% (current value: {{ $value }}%)"
```

## API Gateway Configuration

```yaml
# infrastructure/api-gateway/kong.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
  namespace: kong
data:
  kong.yml: |
    _format_version: "2.1"

    services:
      - name: backend-api
        url: http://backend.production.svc.cluster.local
        routes:
          - name: api-route
            paths:
              - /api
        plugins:
          - name: rate-limiting
            config:
              minute: 60
              hour: 10000
              policy: local
          - name: jwt
            config:
              secret_is_base64: false
              claims_to_verify:
                - exp
          - name: cors
            config:
              origins:
                - https://aisquare.com
                - https://*.aisquare.com
              methods:
                - GET
                - POST
                - PUT
                - DELETE
                - OPTIONS
              headers:
                - Accept
                - Accept-Version
                - Content-Length
                - Content-MD5
                - Content-Type
                - Date
                - X-Auth-Token
              exposed_headers:
                - X-Auth-Token
              credentials: true
              max_age: 3600

      - name: websocket-api
        url: http://websocket.production.svc.cluster.local
        routes:
          - name: ws-route
            paths:
              - /ws
        plugins:
          - name: websocket-size-limit
            config:
              client_max_payload: 1048576  # 1MB
              upstream_max_payload: 1048576
```

## Disaster Recovery

```python
# infrastructure/disaster-recovery/backup.py
class DisasterRecoveryManager:
    """Manages disaster recovery procedures"""

    def __init__(self):
        self.backup_config = {
            "database": {
                "frequency": "daily",
                "retention_days": 30,
                "point_in_time_recovery": True,
                "cross_region_replication": True
            },
            "storage": {
                "versioning": True,
                "lifecycle_rules": [
                    {
                        "action": "SetStorageClass",
                        "storage_class": "NEARLINE",
                        "age_days": 30
                    },
                    {
                        "action": "SetStorageClass",
                        "storage_class": "COLDLINE",
                        "age_days": 90
                    }
                ]
            },
            "compute": {
                "snapshot_frequency": "daily",
                "snapshot_retention": 7
            }
        }

    async def perform_backup(self):
        """Perform full system backup"""

        tasks = [
            self._backup_database(),
            self._backup_storage(),
            self._backup_configurations(),
            self._backup_secrets()
        ]

        results = await asyncio.gather(*tasks)

        # Verify backups
        verification = await self._verify_backups(results)

        return {
            "timestamp": datetime.utcnow(),
            "backups": results,
            "verification": verification
        }

    async def test_disaster_recovery(self):
        """Test DR procedures"""

        test_results = {
            "database_restore": await self._test_database_restore(),
            "failover": await self._test_failover(),
            "data_integrity": await self._test_data_integrity(),
            "rto_achieved": False,  # Recovery Time Objective
            "rpo_achieved": False   # Recovery Point Objective
        }

        # Calculate RTO/RPO
        test_results["rto_achieved"] = test_results["failover"]["time"] < 3600  # 1 hour
        test_results["rpo_achieved"] = test_results["data_integrity"]["data_loss"] < 3600  # 1 hour

        return test_results
```

## Performance Optimization

### Infrastructure Optimization
```yaml
performance_optimizations:
  compute:
    - Use preemptible instances for batch workloads
    - Implement cluster autoscaling
    - Use node pools with different machine types
    - Enable vertical pod autoscaling

  network:
    - Use regional load balancers
    - Enable Cloud CDN for static assets
    - Implement connection pooling
    - Use HTTP/2 and gRPC where applicable

  storage:
    - Use SSD persistent disks
    - Enable parallel processing
    - Implement data partitioning
    - Use appropriate storage classes

  database:
    - Connection pooling
    - Read replicas for read-heavy workloads
    - Query optimization and indexing
    - Materialized views for analytics
```

## Security Hardening

```yaml
# infrastructure/security/policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

## Cost Optimization

```python
# infrastructure/cost-optimization/analyzer.py
class CostOptimizer:
    """Analyzes and optimizes infrastructure costs"""

    async def analyze_costs(self) -> Dict:
        """Analyze current infrastructure costs"""

        # Get cost data from billing API
        costs = await self._get_billing_data()

        # Analyze by service
        service_costs = self._analyze_by_service(costs)

        # Find optimization opportunities
        optimizations = {
            "unused_resources": await self._find_unused_resources(),
            "oversized_resources": await self._find_oversized_resources(),
            "commitment_opportunities": await self._analyze_commitment_opportunities(),
            "storage_optimization": await self._analyze_storage_costs()
        }

        # Calculate potential savings
        potential_savings = sum(
            opt["monthly_savings"]
            for opt in optimizations.values()
        )

        return {
            "current_monthly_cost": costs["total_monthly"],
            "potential_monthly_savings": potential_savings,
            "optimization_recommendations": optimizations,
            "cost_breakdown": service_costs
        }
```

## Infrastructure as Code

### GitHub Actions + gcloud CLI
> **Note**: Infrastructure is managed via GitHub Actions workflows using gcloud CLI commands.

```yaml
# .github/workflows/deploy.yml
# Infrastructure deployment handled by GitHub Actions
# See .github/workflows/ for actual implementation

  project_id     = var.project_id
  region         = var.region
  cluster_name   = var.cluster_name
  network        = var.network
  subnetwork     = var.subnetwork

  node_pools = [
    {
      name               = "default-pool"
      machine_type       = "n2-standard-4"
      min_count         = 3
      max_count         = 10
      disk_size_gb      = 100
      disk_type         = "pd-ssd"
      preemptible       = false
    },
    {
      name               = "spot-pool"
      machine_type       = "n2-standard-2"
      min_count         = 0
      max_count         = 20
      disk_size_gb      = 50
      disk_type         = "pd-standard"
      preemptible       = true
      taint = [{
        key    = "preemptible"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  ]
}
```

## Scaling Strategy

### Auto-scaling Configuration
```yaml
scaling_strategy:
  horizontal_scaling:
    metrics:
      - cpu_utilization: 70%
      - memory_utilization: 80%
      - request_rate: 1000/s
      - queue_depth: 100

  vertical_scaling:
    enable_vpa: true
    update_mode: "Auto"

  cluster_autoscaling:
    min_nodes: 3
    max_nodes: 100
    scale_down_delay: 10m

  database_scaling:
    read_replica_autoscaling: true
    connection_pool_sizing: dynamic
```

## Implementation Roadmap (根據 PRD)

### Phase 1-2: MVP (2025/01-06) - 極簡基礎設施
- [x] GitHub Pages 靜態託管
- [x] Cloud Run 後端部署
- [x] Vertex AI API 整合
- [ ] 基礎 CI/CD (GitHub Actions)
- [ ] 簡單監控 (Uptime checks)
**成本**: ~$10/月

### Phase 2: Enhanced MVP (2025/07-09) - 生產就緒
- [ ] Cloud SQL PostgreSQL (最小規格)
- [ ] Memory Store Redis (最小規格)
- [ ] Cloud Load Balancer
- [ ] Cloud CDN 整合
- [ ] 基礎備份策略
**成本**: ~$50/月

### Phase 3: Production (2025/10-12) - 規模化準備
- [ ] 多區域部署
- [ ] Auto-scaling 設定
- [ ] 完整監控系統 (Cloud Monitoring)
- [ ] 災難復原計劃
- [ ] 安全強化 (Cloud Armor)
**成本**: ~$200/月

### Phase 4+: Scale (2026+) - 企業級基礎設施
- [ ] GKE Kubernetes 叢集
- [ ] 全球負載平衡
- [ ] 多雲端策略
- [ ] 進階安全 (Zero Trust)
- [ ] BigQuery 數據倉儲
**成本**: $1000+/月

## 成本優化策略

### 現階段 (Phase 1-2)
1. **使用免費層級**：善用 GCP 免費額度
2. **按需擴展**：只在需要時開啟資源
3. **靜態優先**：盡可能使用 GitHub Pages
4. **Spot 實例**：開發環境使用 Spot VM

### 未來優化 (Phase 3+)
1. **Committed Use Discounts**：長期承諾折扣
2. **自動擴展**：根據流量動態調整
3. **區域優化**：選擇成本效益最高的區域
4. **資源標記**：精確追蹤成本

## 技術債務管理

### 優先處理
1. **基礎設施即代碼**：所有配置 Terraform 化
2. **自動化部署**：減少手動操作
3. **監控覆蓋**：確保所有服務可觀測
4. **安全加固**：定期安全審計
