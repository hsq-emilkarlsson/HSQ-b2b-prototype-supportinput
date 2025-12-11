# GitHub Actions Setup Guide

This guide will help you configure GitHub Actions to automatically deploy to Azure when you push code to the `main` branch.

---

## Step 1: Create Azure Service Principal (App Registration)

### Via Azure Portal:

1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Enter:
   - **Name:** `github-actions-hsq-feedback`
   - **Account type:** Single tenant
   - **Redirect URI:** (leave empty)
4. Click **Register**

### Create Client Secret:

1. Go to **Certificates & secrets** tab
2. Click **New client secret**
3. Enter:
   - **Description:** `GitHub Actions deployment`
   - **Expires:** 24 months
4. Click **Add**
5. **Copy the secret value** (you won't see it again!)

### Get Required IDs:

In the app registration **Overview** tab, copy these values:
- **Application (client) ID** → use as `clientId`
- **Directory (tenant) ID** → use as `tenantId`

In **Azure Portal** → **Subscriptions** → Your subscription:
- **Subscription ID** → use as `subscriptionId`

---

## Step 2: Grant Azure Permissions to Service Principal

1. Go to **Azure Portal** → **Subscriptions** → Your subscription
2. Click **Access Control (IAM)** → **Add role assignment**
3. Assign these roles to your app registration:
   - **Contributor** (for deploying all resources)
   - **User Access Administrator** (for RBAC setup)

---

## Step 3: Create Databricks PAT Token

1. Go to **Databricks workspace**
2. Click **User icon** (top right) → **User settings**
3. Click **Generate new token**
4. **Copy the token** (save it, you'll use it in the next step)

---

## Step 4: Add GitHub Secrets

1. Go to your **GitHub repository**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Add Secret 1: AZURE_CREDENTIALS

**Name:** `AZURE_CREDENTIALS`

**Value:** Paste this JSON (with your actual values):
```json
{
  "clientId": "YOUR_APP_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "subscriptionId": "YOUR_SUBSCRIPTION_ID",
  "tenantId": "YOUR_TENANT_ID"
}
```

Example:
```json
{
  "clientId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "clientSecret": "abc~defGhij1K2l3M4n5o~p6q7r8s9",
  "subscriptionId": "c0b03b12-570f-4442-b337-c9175ad4037f",
  "tenantId": "2a1c169e-715a-412b-b526-05da3f8412fa"
}
```

### Add Secret 2: DATABRICKS_PAT

**Name:** `DATABRICKS_PAT`

**Value:** Paste your Databricks PAT token
```
dapi1234567890abcdef1234567890ab
```

---

## Step 5: Verify GitHub Workflow

1. Go to **GitHub** → **Actions** tab
2. Look for **"Deploy to Azure"** workflow
3. Make sure it's showing as **enabled** (not disabled)

---

## Step 6: Test the Deployment

### Option A: Automatic (Push to main)
```bash
# Make a small change to the code
echo "# Test deployment" >> README.md

# Commit and push
git add .
git commit -m "Test GitHub Actions deployment"
git push origin main

# Watch the deployment in GitHub Actions → Actions tab
```

### Option B: Manual Trigger
1. Go to **GitHub** → **Actions**
2. Select **"Deploy to Azure"** workflow
3. Click **Run workflow** → **Run workflow**
4. Watch the execution in real-time

---

## Step 7: Monitor Deployment

1. Go to **Actions** tab → select the workflow run
2. Click **build-and-deploy** job
3. Expand each step to see logs:
   - ✅ **Checkout code** — should pass
   - ✅ **Setup Node.js** — should pass
   - ✅ **Install dependencies** — should pass
   - ✅ **Build frontend** — should pass
   - ✅ **Login to Azure** — should pass
   - ✅ **Deploy Infrastructure** — should pass
   - ✅ **Deploy Code** — should pass
   - ✅ **Health Check** — should pass (validates service is running)

---

## Step 8: Verify Deployment in Azure

Once GitHub Actions completes:

1. Go to **Azure Portal** → **Resource groups**
2. Click **rg-hsq-feedback-prod** (or your resource group)
3. Verify these resources exist:
   - App Service (`app-hsq-feedback-prod-*`)
   - App Service Plan
   - Key Vault

4. Click **App Service** → **Overview**
   - Copy the **URL** (e.g., `https://app-hsq-feedback-prod-xyz.azurewebsites.net`)
   - Visit the URL in your browser
   - You should see the feedback form!

---

## 🆘 Troubleshooting

### GitHub Actions Fails: "GitHub not authenticated"
**Solution:** Check that `AZURE_CREDENTIALS` JSON is valid and has all 4 fields

**Validate JSON:**
```bash
# On your terminal, paste the JSON to validate
echo '{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}' | jq .
```

### GitHub Actions Fails: "Policy: RequestDisallowedByPolicy"
**Solution:** See `AZURE_SECURITY_POLICIES.md` for discovered policies
- Ensure Bicep has `publicNetworkAccess: 'Disabled'` ✅
- Ensure `networkAcls.defaultAction: 'Deny'` ✅

### GitHub Actions Fails: "Insufficient permissions"
**Solution:** 
1. Verify app registration has **Contributor** role
2. Verify app registration has **User Access Administrator** role
3. Wait 1-2 minutes for Azure to propagate role assignments

### Health Check Fails: "Cannot connect to App Service"
**Solution:**
1. Verify `server.js` is deployed correctly
2. Check App Service logs: **Azure Portal** → **App Service** → **Log stream**
3. Verify backend is listening on port 3000 (or configured port)

### Health Check Fails: "Cannot reach Key Vault"
**Solution:**
1. Verify managed identity is created: `az webapp identity show --name APP_NAME --resource-group RG_NAME`
2. Verify Key Vault has access policy: `az keyvault set-policy --name VAULT_NAME --object-id PRINCIPAL_ID --secret-permissions get list`
3. Check Key Vault logs: **Azure Portal** → **Key Vault** → **Activity log**

---

## 📊 What Happens on Each Deploy

When you push to `main` or manually trigger the workflow:

1. **Build Phase**
   - Checkout your code
   - Install npm dependencies
   - Build React frontend (creates `dist/` folder)

2. **Infrastructure Phase**
   - Login to Azure using `AZURE_CREDENTIALS`
   - Create resource group if it doesn't exist
   - Deploy Bicep template (creates/updates App Service, Key Vault, etc.)
   - Add Databricks PAT to Key Vault

3. **Deployment Phase**
   - Deploy built frontend and backend to App Service
   - Configure App Service settings from GitHub secrets

4. **Validation Phase**
   - Run health check: `curl https://app-hsq-feedback-prod-xyz.azurewebsites.net/api/health`
   - Verify Key Vault connectivity
   - If all checks pass: deployment successful ✅

---

## 🔄 CI/CD Pipeline Workflow

```
Code Push to main
    ↓
GitHub Actions Triggered
    ↓
Build Frontend (Vite)
    ↓
Build Backend (Node.js)
    ↓
Deploy Bicep Infrastructure
    ↓
Deploy Code to App Service
    ↓
Run Health Checks
    ↓
✅ Deployment Complete
```

---

## 📝 Updating After Initial Setup

### To Update App Code:
```bash
# Make changes to code
git add .
git commit -m "Update feature"
git push origin main
# → GitHub Actions automatically redeploys
```

### To Update Infrastructure:
Edit `infrastructure/main.bicep` and push:
```bash
# Modify infrastructure/main.bicep
git add infrastructure/main.bicep
git commit -m "Update App Service SKU"
git push origin main
# → GitHub Actions redeploys with new infrastructure
```

### To Update Secrets:
1. Update secret in **GitHub** → **Settings** → **Secrets**
2. Push a code change or trigger workflow manually

---

## 🎯 Next: Manual Testing (Before Auto-Deployment)

If you want to test deployment manually before setting up GitHub Actions:

```bash
# Authenticate
az login --use-device-code

# Deploy infrastructure
az deployment group create \
  --resource-group rg-hsq-feedback-test \
  --template-file infrastructure/main.bicep \
  --parameters databricksPATValue="YOUR_PAT_TOKEN"

# Deploy code
az webapp deployment source config-zip \
  --resource-group rg-hsq-feedback-test \
  --name app-hsq-feedback-prod \
  --src ./dist.zip
```

---

## ✅ Checklist

- [ ] Created App Registration in Azure AD
- [ ] Generated and copied Client Secret
- [ ] Assigned Contributor role to app
- [ ] Assigned User Access Administrator role to app
- [ ] Created Databricks PAT token
- [ ] Added `AZURE_CREDENTIALS` secret to GitHub
- [ ] Added `DATABRICKS_PAT` secret to GitHub
- [ ] Verified GitHub workflow file exists: `.github/workflows/deploy-azure.yml`
- [ ] Tested with `git push` or manual workflow trigger
- [ ] Verified deployment in Azure Portal
- [ ] Visited app URL and confirmed it's running

---

**You're ready to deploy! 🚀**
