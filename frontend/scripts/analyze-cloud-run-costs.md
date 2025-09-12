# Cloud Run Cost Analysis Report

## Critical Performance Issues Found

### 1. KSA File Loading (HIGH PRIORITY)
**Problem**: Loading 280KB of YAML files from filesystem on every API request
- **Location**: `/api/pbl/scenarios/[id]/route.ts` line 90-109
- **Impact**: High I/O costs, CPU spikes, memory waste
- **Solution**: Migrate KSA data to PostgreSQL

### 2. Missing Redis Configuration
**Problem**: Falling back to in-memory cache
- **Impact**: Each Cloud Run instance maintains separate cache
- **Solution**: Configure Redis for shared caching

### 3. Resource Multiplication
**Problem**: No shared state between containers
- **Cost Formula**:
  - 1 user = 1 container = 280KB KSA data
  - 100 users = 100 containers = 28MB duplicated data
  - 1000 users = 280MB wasted memory

## Cost Estimation

### Current Architecture (File-based)
- **Cold Start Cost**: ~500ms CPU for YAML parsing
- **Memory Cost**: 280KB per container instance
- **I/O Cost**: File read on every cold start
- **Monthly estimate**: $50-200 depending on traffic

### Optimized Architecture (PostgreSQL + Redis)
- **Cold Start Cost**: ~50ms database query
- **Memory Cost**: Minimal (Redis shared cache)
- **I/O Cost**: One-time database load
- **Monthly estimate**: $10-30

## Immediate Actions Required

1. **Stop using filesystem as database**
   - Move KSA data to PostgreSQL
   - Create proper indexes

2. **Configure Redis**
   - Set up Cloud Memorystore
   - Update .env with REDIS_URL

3. **Implement proper caching**
   - Use Redis for shared cache
   - Implement cache warming on deploy

4. **Monitor resource usage**
   ```bash
   gcloud run services describe ai-square-frontend \
     --region=asia-east1 \
     --format="value(status.traffic.percent)"
   ```

## Code Changes Needed

1. Create KSA database tables
2. Migration script: YAML → PostgreSQL
3. Update API to query database
4. Configure Redis connection
5. Implement cache warming

## Performance Metrics to Track

- Cold start duration
- Memory usage per container
- Number of container instances
- Cache hit ratio
- API response times

## Risk Assessment

**Without fixes**:
- ❌ Costs will scale linearly with users
- ❌ Cold starts will be slow
- ❌ Memory usage will be high
- ❌ Potential for timeouts under load

**With fixes**:
- ✅ Costs remain flat regardless of users
- ✅ Fast cold starts
- ✅ Minimal memory usage
- ✅ Can handle high load
