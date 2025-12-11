# Static Web App - Deployment Status ✅

## Status: Active & Deployed 

Your feedback form is **live and running** at:
- **URL:** https://witty-desert-04e4a0303.3.azurestaticapps.net/
- **Region:** West Europe
- **Tier:** Free
- **Deployment:** GitHub Actions (automatic on push to main)

## Deployment Flow

```
Your Code (main branch)
    ↓
GitHub Actions triggered
    ↓
npm run build
    ↓
Deploy dist/ to Azure Static Web Apps
    ↓
Live at witty-desert-04e4a0303.3.azurestaticapps.net
```

## Configuration

The app is automatically deployed with these secrets/env vars:
- `VITE_N8N_FORM_WEBHOOK_URL` - Form submission webhook
- `VITE_N8N_CHAT_WEBHOOK_URL` - Chat assistant webhook  
- `VITE_DATABRICKS_TOKEN` - File upload authentication
- `VITE_DATABRICKS_HOST` - Databricks workspace
- `VITE_DATABRICKS_VOLUME_PATH` - Upload destination

All configured in GitHub Repository Settings → Secrets

## Step 1: Connect GitHub Repository

You have two options:

### Option A: Via Azure Portal (Recommended - Easiest)

1. Go to **Azure Portal** → Search for `hsq-feedback-app`
2. Click on the Static Web App resource
3. In the left sidebar, click **Source Control** (or **Settings > Source Control**)
4. Click **Connect with GitHub**
5. You'll be prompted to authorize Azure with your GitHub account
6. After authorization, select:
   - **Owner:** `hsq-emilkarlsson`
   - **Repository:** `hsq-b2b-prototyp-feedbackcollection`
   - **Branch:** `main`
   - **Build Presets:** `React`
7. Click **Review + Create**
8. Click **Create**

**This will automatically:**
- Create the deployment secret `AZURE_STATIC_WEB_APPS_API_TOKEN_HSQ_FEEDBACK_APP` in GitHub
- Trigger your GitHub Actions workflow immediately
- Start building and deploying your app

### Option B: Via Azure CLI

```bash
# This command configures GitHub connection
# Note: You may need to authenticate with GitHub via browser
az staticwebapp connect \
  --name hsq-feedback-app \
  --resource-group rg-hsq-feedback-test \
  --source https://github.com/hsq-emilkarlsson/hsq-b2b-prototyp-feedbackcollection \
  --branch main \
  --token <GITHUB_PAT_TOKEN>
```

## Step 2: Configure Environment Variables

After GitHub connection and first deployment:

1. In **Azure Portal**, go to `hsq-feedback-app`
2. Click **Configuration** (in Settings section)
3. Click **+ Add** to add a new environment variable
4. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net`
5. Click **OK**
6. Click **Save** at the top

This tells the frontend where to find your backend API.

## Step 3: Verify Deployment

After connecting GitHub, check deployment progress:

### In GitHub:
1. Go to your repository
2. Click **Actions** tab
3. You should see workflow `Deploy to Static Web App` running
4. Wait for it to complete (usually 2-3 minutes)

### In Azure:
1. Go to `hsq-feedback-app` in Portal
2. Click **Environments** to see deployment history
3. Click on latest deployment to see details

## Step 4: Test Your App

Once deployment completes:

1. Navigate to `https://witty-desert-04e4a0303.3.azurestaticapps.net/`
2. You should see your feedback form
3. Try uploading a test file
4. Check that:
   - Frontend loads successfully
   - Form fields are visible
   - File upload works
   - File appears in Databricks (if configured)

## Architecture Overview

```
┌─────────────────────────────────────────┐
│ GitHub Repository (your code)           │
│ hsq-b2b-prototyp-feedbackcollection    │
└──────────────┬──────────────────────────┘
               │ (Push to main)
               ▼
┌─────────────────────────────────────────┐
│ GitHub Actions Workflow                 │
│ ✓ Build: npm run build                  │
│ ✓ Deploy: Azure/static-web-apps-deploy  │
└──────────────┬──────────────────────────┘
               │ (Deploy to)
               ▼
┌─────────────────────────────────────────┐
│ Static Web App (PUBLIC)                 │
│ ✓ URL: witty-desert-04e4a0303.3...     │
│ ✓ React frontend                        │
│ ✓ Auto-cached JS/CSS                    │
└──────────────┬──────────────────────────┘
               │ (API calls via VITE_API_URL)
               ▼
┌─────────────────────────────────────────┐
│ App Service Backend (PRIVATE)           │
│ ✓ Express API                           │
│ ✓ Private Endpoint (10.0.1.4)           │
│ ✓ Databricks file uploads               │
│ ✓ Key Vault secrets                     │
└─────────────────────────────────────────┘
```

## Deployment Secrets

GitHub Actions needs the deployment token. This is **automatically created** when you connect GitHub via Portal.

The token is stored in GitHub as: `AZURE_STATIC_WEB_APPS_API_TOKEN_HSQ_FEEDBACK_APP`

If you need to regenerate it:
```bash
az staticwebapp secrets reset \
  --name hsq-feedback-app \
  --resource-group rg-hsq-feedback-test
```

## Troubleshooting

### Deployment fails with "Auth failed"
- Ensure GitHub connection is properly configured
- Check GitHub Actions logs for detailed error
- Verify deployment token exists: `az staticwebapp secrets list --name hsq-feedback-app --resource-group rg-hsq-feedback-test`

### Frontend loads but API calls fail
- Ensure `VITE_API_URL` is set in Static Web App configuration
- Check that App Service backend is running: `az appservice show --name app-hsq-feedback-prod-da47jmgaub6dg --resource-group rg-hsq-feedback-test`
- Test backend directly: `curl https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net/health`

### "Cannot GET /" or 404 errors
- Ensure `staticwebapp.config.json` is in repo root
- Check that SPA routing is enabled (/* → /index.html)
- Verify build output is in `dist/` folder

## Files Involved

- `.github/workflows/deploy-static-web-app.yml` - GitHub Actions workflow
- `staticwebapp.config.json` - SPA routing and caching rules
- `src/hooks/useDatabricksUpload.ts` - Uses VITE_API_URL for backend
- `.env.example` - Documents environment variables

## Next Steps

1. ✅ Connect GitHub to Static Web App (Portal or CLI)
2. ✅ Wait for GitHub Actions deployment to complete
3. ✅ Set VITE_API_URL environment variable
4. ✅ Test frontend in browser
5. ✅ Upload test file and verify backend processing

## Support

For issues with Static Web App:
- [Azure Static Web Apps docs](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions for Azure Static Web Apps](https://github.com/marketplace/actions/azure-static-web-apps-deploy)

---

**Last Updated:** $(date)  
**Architecture:** Static Web App (Frontend) + App Service (Backend) with Private Endpoint
