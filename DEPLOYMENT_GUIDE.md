# 🚀 Deployment Guide - Husqvarna Feedback Form

## ✅ Current Status: LIVE

Your application is **live and running** at:
- **URL:** https://witty-desert-04e4a0303.3.azurestaticapps.net/
- **Deployment:** Automatic via GitHub Actions
- **Last Deploy:** December 9, 2025

---

## How Deployment Works

### Automatic Deployment Flow

```
1. You push code to main branch (git push)
    ↓
2. GitHub Actions workflow triggers automatically
    ↓
3. npm run build (Vite compiles React app)
    ↓
4. Build output (dist/) deployed to Azure Static Web Apps
    ↓
5. App live at https://witty-desert-04e4a0303.3.azurestaticapps.net/
```

### No Manual Steps Needed!

The deployment is fully automated. Just commit and push:

```bash
git add .
git commit -m "Your changes"
git push origin main
# → Automatically deployed! ✅
```

---

## Environment Variables (Secrets)

The following secrets are configured in GitHub and automatically injected during build:

| Variable | Purpose | Status |
|----------|---------|--------|
| `VITE_N8N_FORM_WEBHOOK_URL` | Form submission to n8n | ✅ Configured |
| `VITE_N8N_CHAT_WEBHOOK_URL` | Chat assistant webhook | ✅ Configured |
| `VITE_N8N_WEBHOOK_URL` | Legacy fallback | ✅ Configured |
| `VITE_DATABRICKS_TOKEN` | File upload auth | ✅ Configured |
| `VITE_DATABRICKS_HOST` | Databricks workspace | ✅ Configured |
| `VITE_DATABRICKS_VOLUME_PATH` | Upload destination | ✅ Configured |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment auth | ✅ Configured |

**Location:** GitHub Repository → Settings → Secrets and variables → Actions

---

## File Upload Architecture

```
React Frontend
    ↓
User selects file(s)
    ↓
useDatabricksUpload hook
    ↓
Direct PUT to Databricks Files API
    ↓
File stored in Databricks Volume
    ↓
Metadata sent to n8n webhook
    ↓
Google Sheets entry created with file link
```

**Upload Destination:** `/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments/`

---

## Testing the Live App

### 1. Load the app
Visit https://witty-desert-04e4a0303.3.azurestaticapps.net/ in your browser

### 2. Test the feedback form
- Select language (7 options: SV, NO, EN, DA, FI, FR, DE)
- Fill in email and message
- Attach files (up to 5 files, 50MB total)
- Submit form

### 3. Verify file upload
- Check Databricks: `/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments/`
- Check Google Sheets: Form data with clickable file links

---

## Monitoring Deployments

### View Deployment Status

**In GitHub:**
1. Go to your repository
2. Click **Actions** tab
3. View the latest "Build and Deploy to Static Web App" workflow
4. Click on it to see build logs

**Check what was deployed:**
- **Build artifact:** `npm run build` output (Vite)
- **Deploy target:** Azure Static Web Apps
- **SPA routing:** Configured in `staticwebapp.config.json`

---

## Rollback (If Needed)

If something breaks, you can revert to a previous version:

```bash
# View commit history
git log --oneline

# Revert to previous commit (replace with actual commit hash)
git revert <commit-hash>
git push origin main

# Or reset to previous commit
git reset --hard <commit-hash>
git push origin main --force
```

Each push automatically redeploys.

---

## Troubleshooting

### 404 Error on the app URL?

1. Check the **actual deployed URL** from GitHub Actions logs
2. URLs change on each deployment (Azure generates new ones)
3. The GitHub Actions output shows the correct URL

### Build fails in GitHub Actions?

1. Check **Actions tab** → latest workflow → logs
2. Common issues:
   - Missing environment variable (check Secrets)
   - Build error (check `npm run build` locally: `npm run build`)
   - Node version mismatch (should be Node 18)

### Files not uploading to Databricks?

1. Check Databricks token is valid
2. Check Databricks volume path is correct
3. Check Databricks workspace URL is reachable
4. View browser console for error messages

---

## Project Structure

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml           # 👈 Automatic deployment config
├── src/
│   ├── App.tsx
│   ├── FeedbackPage.tsx         # Main form component
│   ├── hooks/
│   │   └── useDatabricksUpload.ts
│   └── i18n/                    # Multi-language support
├── staticwebapp.config.json     # SPA routing config
├── vite.config.ts              # Build config
├── package.json                 # Dependencies
└── index.html                   # Entry point
```

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **i18n:** i18next (7 languages)
- **File Upload:** Databricks Files API
- **Automation:** n8n Cloud
- **Hosting:** Azure Static Web Apps
- **CI/CD:** GitHub Actions
- **Data Storage:** Google Sheets

---

## Security

✅ All credentials stored securely:
- GitHub Secrets (encrypted)
- Databricks PAT token (secrets)
- n8n webhooks (public endpoints)
- No hardcoded secrets in code

---

## Support

**Documentation:**
- [Main README](./README.md)
- [Quick Start](./docs/QUICK_START.md)
- [Architecture Overview](./docs/README.md)

**Questions?**
1. Check deployment logs in GitHub Actions
2. Review `staticwebapp.config.json` for routing config
3. Check browser console for frontend errors
4. View network tab for API requests/uploads
