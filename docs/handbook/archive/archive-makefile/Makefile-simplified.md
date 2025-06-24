# Simplified Makefile Structure

## Core Commands (90% Usage)

### 1. Development Flow
```makefile
# Start new work
start:
	@python3 docs/scripts/ticket-manager.py start $(TYPE) $(TICKET) $(DEPENDS)

# Check status  
check:
	@python3 docs/scripts/ticket-integrity-checker.py active -v

# Save progress
checkpoint:
	@python3 docs/scripts/checkpoint.py

# Run tests
test:
	cd frontend && npm run test:ci && npm run lint && npx tsc --noEmit

# Smart commit
commit:
	@python3 docs/scripts/smart-commit.py

# Complete work
done:
	@python3 docs/scripts/ticket-manager.py complete $(TICKET)
	@git checkout main
	@git merge ticket/$(TICKET)
```

### 2. Auxiliary Commands
```makefile
# Pause/Resume
pause:
	@python3 docs/scripts/ticket-manager.py pause

resume:
	@python3 docs/scripts/ticket-manager.py resume $(TICKET)

# Change request
change-request:
	@python3 docs/scripts/change-request.py "$(DESC)"

# Rollback
rollback:
	@python3 docs/scripts/rollback.py $(COMMIT)

# View status
status:
	@python3 docs/scripts/ticket-manager.py list
```

### 3. Basic Development
```makefile
# Frontend dev
frontend:
	cd frontend && npm run dev

# Backend dev  
backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload

# Build
build:
	cd frontend && npm run build

# Deploy
deploy:
	make build-frontend-image
	make gcloud-build-and-deploy-frontend
```

## Commands to Remove/Consolidate

### Remove (Redundant/Complex):
- dev-ticket → replaced by `start`
- commit-ticket → replaced by `commit`
- merge-ticket → integrated into `done`
- list-tickets → replaced by `status`
- dev-status → replaced by `check`
- check-docs → integrated into `check`
- check-ticket → integrated into `check`
- fix-ticket → integrated into `check`
- check-all → replaced by `check`
- authorize-commit → removed (simplified)
- finalize-docs → automated
- Various legacy commands

### Consolidate:
- All test commands → single `test`
- All check commands → single `check`
- All commit commands → single `commit`

## Total Commands
- **Original**: 71+ commands
- **Simplified**: ~15 core commands

## Benefits
1. **Clear workflow**: start → check → checkpoint → test → commit → done
2. **Single responsibility**: Each command has one clear purpose
3. **No duplication**: Remove redundant variations
4. **Easy to remember**: Simple verb-based names