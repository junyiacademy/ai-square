# GitHub Token Setup for Prompt-to-Course

This guide explains how to configure GitHub API access for the Prompt-to-Course feature's "Publish to GitHub" functionality.

## Overview

The Prompt-to-Course feature can automatically:
1. Create a feature branch (e.g., `feature/scenario-{id}`)
2. Commit the generated YAML scenario file
3. Create a Pull Request to the `staging` branch

This requires a GitHub Personal Access Token with appropriate permissions.

## Prerequisites

- GitHub account with write access to `junyiacademy/ai-square` repository
- Admin permissions to configure repository secrets (or contact repository admin)

## Step 1: Create GitHub Personal Access Token

### Fine-grained Personal Access Token (Recommended)

1. Navigate to: https://github.com/settings/tokens?type=beta

2. Click **"Generate new token"**

3. Configure the token:
   - **Token name**: `AI-Square-Prompt-to-Course`
   - **Expiration**: 90 days (or custom)
   - **Description**: "API token for Prompt-to-Course GitHub integration"
   - **Repository access**: Select "Only select repositories"
     - Choose: `junyiacademy/ai-square`

4. Set **Repository permissions**:
   - **Contents**: Read and write ✅
   - **Pull requests**: Read and write ✅
   - **Metadata**: Read (automatic) ✅

5. Click **"Generate token"**

6. **IMPORTANT**: Copy the token immediately (starts with `github_pat_`)
   - Save it securely - you won't see it again!

### Classic Personal Access Token (Alternative)

1. Navigate to: https://github.com/settings/tokens

2. Click **"Generate new token (classic)"**

3. Configure:
   - **Note**: `AI-Square-Prompt-to-Course`
   - **Expiration**: 90 days
   - **Scopes**: Select:
     - ✅ `repo` (Full control of private repositories)
       - This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`

4. Click **"Generate token"**

5. Copy the token (starts with `ghp_`)

## Step 2: Add Token to GitHub Secrets (Production)

For production deployments on Cloud Run:

1. Navigate to: https://github.com/junyiacademy/ai-square/settings/secrets/actions

2. Click **"New repository secret"**

3. Configure:
   - **Name**: `GITHUB_API_TOKEN`
   - **Secret**: Paste your token

4. Click **"Add secret"**

## Step 3: Add Token to Local Environment (Development)

For local development:

1. Create/edit `.env.local` in `frontend/` directory:
   ```bash
   cd /Users/young/project/ai-square/frontend
   nano .env.local
   ```

2. Add the token:
   ```env
   # GitHub API for Prompt-to-Course
   GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
   # or
   GITHUB_API_TOKEN=ghp_YOUR_CLASSIC_TOKEN_HERE
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Step 4: Verify Configuration

### Local Testing

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to: http://localhost:3000/admin/scenarios/create

3. Generate a scenario using the AI

4. Click **"Publish to GitHub"**

5. Expected behavior:
   - ✅ Success message appears
   - ✅ PR link is displayed
   - ✅ Branch created on GitHub
   - ✅ PR appears in repository

### Production Testing

1. Deploy to staging:
   ```bash
   npm run staging:deploy
   ```

2. Navigate to staging URL

3. Test the publish flow

4. Verify PR is created successfully

## Troubleshooting

### Error: "GitHub integration not configured"

**Cause**: Token environment variable is not set

**Solutions**:
- Local: Check `.env.local` contains `GITHUB_TOKEN` or `GITHUB_API_TOKEN`
- Production: Verify secret is added to GitHub repository secrets
- Restart server after adding environment variable

### Error: "GitHub authentication failed"

**Cause**: Token is invalid or expired

**Solutions**:
1. Generate a new token following Step 1
2. Update the secret/environment variable
3. Verify token has correct permissions

### Error: "GitHub API rate limit exceeded"

**Cause**: Too many API requests in short time

**Solutions**:
- Wait 1 hour for rate limit reset
- Use authenticated requests (which you are - check token is valid)
- Classic tokens have 5000 req/hour, fine-grained tokens vary

### Error: "Scenario ID already exists"

**Cause**: A scenario with that ID already exists in the repository

**Solutions**:
- Choose a different scenario ID
- Check existing scenarios: `backend/src/content/scenarios/`
- Delete the existing file if it was created in error

### Error: "Branch already exists"

**Cause**: Feature branch was created but PR failed

**Solutions**:
1. Go to GitHub repository
2. Delete the branch manually: https://github.com/junyiacademy/ai-square/branches
3. Try publishing again with same scenario ID

## Security Best Practices

### ⚠️ DO NOT:
- Commit tokens to git
- Share tokens publicly
- Use tokens with broader permissions than needed
- Store tokens in client-side code

### ✅ DO:
- Use fine-grained tokens when possible
- Set expiration dates (max 90 days recommended)
- Rotate tokens regularly
- Use different tokens for dev/staging/prod
- Store tokens in `.env.local` (gitignored)
- Add tokens to GitHub Secrets for CI/CD

## Token Permissions Explained

### Why "Contents: Read and Write"?
- **Read**: Check if scenario file already exists
- **Write**: Create new scenario YAML file

### Why "Pull Requests: Read and Write"?
- **Read**: Verify PR doesn't already exist
- **Write**: Create new PR for review

### Why Repository-scoped?
- Limits access to only `junyiacademy/ai-square`
- Follows principle of least privilege
- Reduces risk if token is compromised

## Workflow Details

When you click "Publish to GitHub", the system:

1. **Validates** the YAML using existing validation API
2. **Checks** if scenario ID already exists
3. **Creates** feature branch from `staging`
4. **Commits** YAML file to `backend/src/content/scenarios/{id}.yml`
5. **Creates** Pull Request with:
   - Title: `Add {mode} scenario: {id}`
   - Base branch: `staging`
   - Checklist for reviewers
   - Link to Claude Code co-authorship

## Related Documentation

- [Prompt-to-Course Feature Guide](./prompt-to-course.md)
- [GitHub Fine-grained Tokens Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify token permissions match this guide
3. Check server logs for detailed error messages
4. Contact DevOps team if production secrets need rotation

---

**Last Updated**: 2025-11-29
**Version**: Phase 2 - GitHub Integration
