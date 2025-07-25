# Database Migration Pre-Production Checklist

## 🔍 Current Issues to Resolve

### 1. Staging Environment Issues
- [ ] **Cloud SQL Connection Issues**
  - [ ] Fix Unix socket timeout issues
  - [ ] Resolve "relation does not exist" errors
  - [ ] Ensure stable connection pooling
  
- [ ] **Region Alignment**
  - [ ] Verify Cloud SQL instance region
  - [ ] Verify Cloud Run service region
  - [ ] Migrate if regions don't match

### 2. Code Issues to Fix
- [ ] **TypeScript Errors**
  - [ ] Fix remaining type errors in repositories
  - [ ] Remove all `any` types
  - [ ] Ensure proper type safety

- [ ] **Repository Pattern**
  - [ ] Complete PostgreSQL repository implementations
  - [ ] Add missing methods (updateStatus, etc.)
  - [ ] Ensure all modules use unified interface

### 3. Testing Gaps
- [ ] **Unit Tests**
  - [ ] Add repository layer tests
  - [ ] Test error handling scenarios
  - [ ] Mock database connections properly

- [ ] **Integration Tests**
  - [ ] Test all API endpoints with real DB
  - [ ] Test transaction rollbacks
  - [ ] Test concurrent access scenarios

- [ ] **E2E Tests**
  - [ ] Full user journey with DB
  - [ ] Multi-language content tests
  - [ ] Performance under load

## 📊 Migration Risk Assessment

### High Risk Areas
1. **Data Consistency**
   - User progress data
   - Multi-language content
   - Relationships between entities

2. **Performance Impact**
   - Complex queries with JOINs
   - Large JSONB operations
   - Concurrent user access

3. **Integration Points**
   - Authentication flow
   - AI service callbacks
   - CMS content updates

### Mitigation Strategies
1. **Dual-mode Operation**
   ```typescript
   // Allow switching between YAML and DB
   const dataSource = process.env.DATA_SOURCE || 'yaml';
   if (dataSource === 'db') {
     return postgresRepo.getScenarios();
   } else {
     return yamlLoader.getScenarios();
   }
   ```

2. **Gradual Migration**
   - Start with read-only operations
   - Move write operations gradually
   - Keep YAML as fallback

3. **Comprehensive Monitoring**
   - Query performance tracking
   - Error rate monitoring
   - Resource usage alerts

## 🛠️ Technical Debt to Address

### Before Production
1. **Remove GCS v2 remnants**
   - [ ] Clean up unused imports
   - [ ] Remove deprecated services
   - [ ] Update documentation

2. **Standardize error handling**
   - [ ] Consistent error types
   - [ ] Proper error logging
   - [ ] User-friendly messages

3. **Optimize queries**
   - [ ] Add missing indexes
   - [ ] Optimize N+1 queries
   - [ ] Implement query caching

### Can Wait Until After Launch
1. Advanced caching strategies
2. Read replica configuration
3. Automated performance tuning

## 🚀 Go/No-Go Criteria

### Must Have for Production
- [ ] All E2E tests passing
- [ ] < 200ms API response time (P95)
- [ ] Zero data loss during migration
- [ ] Rollback plan tested
- [ ] 24-hour stable staging run

### Nice to Have
- [ ] Automated migration scripts
- [ ] Performance dashboard
- [ ] Advanced monitoring

## 📅 Daily Standup Topics

### Week 1 Focus
- Connection stability
- Performance benchmarks
- Security audit results

### Week 2 Focus
- Migration progress
- Production readiness
- Launch preparations

## 🆘 Contingency Plans

### If Staging Still Unstable by Day 3
1. Consider alternative hosting (e.g., Cloud SQL Proxy)
2. Evaluate managed connection pooling services
3. Worst case: Delay by 1 week

### If Performance Issues Persist
1. Implement aggressive caching
2. Consider database sharding
3. Optimize critical queries only

### If Migration Fails
1. Continue with YAML for reads
2. Only migrate writes to DB
3. Plan phased migration over 4 weeks

---

**Key Message**: 穩定性優先於時程。寧願延後一週，也要確保上線後不會有問題。