# 🚀 Azure Deployment Guide

This guide walks you through deploying the HSQ B2B Feedback Collection system to Azure with GitHub Actions CI/CD.

## Prerequisites

- Azure Subscription
- GitHub repository access
- Azure CLI installed locally (optional, for testing)
- Databricks PAT token

## Step 1: Create Azure Credentials for GitHub

1. **Open Azure Portal** and navigate to **Azure Active Directory → App registrations**

2. **Create a new app registration:**
   - Name: `github-actions-hsq-feedback`
   - Account type: Single tenant
   - Redirect URI: Leave empty

3. **Create a client secret:**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Expiration: 24 months
   - **Copy the secret value** (save it, you'll only see it once)

4. **Create the credentials JSON:**
   ```json
   {
     "clientId": "YOUR_CLIENT_ID",
     "clientSecret": "YOUR_CLIENT_SECRET",
     "subscriptionId": "YOUR_SUBSCRIPTION_ID",
     "tenantId": "YOUR_TENANT_ID"
   }
   ```

5. **Get values from Azure Portal:**
   - `clientId`: App registration → Overview → Application (client) ID
   - `tenantId`: App registration → Overview → Directory (tenant) ID
   - `subscriptionId`: Subscriptions → Your subscription → Subscription ID

## Step 2: Grant Azure AD App Required Permissions

1. Go to **Azure Portal → Subscriptions → Your subscription**

2. Click **Access control (IAM) → Add role assignment**

3. Assign these roles to your app:
   - **Contributor** (for creating resources)
   - **App Service Contributor**
   - **Key Vault Administrator**

## Step 3: Store Secrets in GitHub

1. Go to your GitHub repository

2. **Settings → Secrets and variables → Actions**

3. **Add these secrets:**

   | Secret Name | Value |
   |-------------|-------|
   | `AZURE_CREDENTIALS` | The JSON from Step 1 (entire JSON as one line) |
   | `DATABRICKS_PAT` | Your Databricks personal access token |

   **Example AZURE_CREDENTIALS value:**
   ```
   {"clientId":"xxxx","clientSecret":"xxxx","subscriptionId":"xxxx","tenantId":"xxxx"}
   ```

## Step 4: Customize Deployment Variables

Edit `.github/workflows/deploy-azure.yml` if needed:

```yaml
env:
  AZURE_RESOURCE_GROUP: 'rg-hsq-feedback-prod'  # Your resource group name
  AZURE_LOCATION: 'westeurope'                   # Azure region
  PROJECT_NAME: 'hsq-feedback'                   # Project identifier
```

## Step 5: Deploy via GitHub Actions

1. **Automatic deployment:**
   - Push to `main` branch
   - GitHub Actions automatically triggers deployment

2. **Manual deployment:**
   - Go to **Actions tab**
   - Select **"Deploy to Azure"** workflow
   - Click **Run workflow**

3. **Monitor deployment:**
   - Watch the workflow run in real-time
   - Check logs for errors
   - Deployment takes ~5-10 minutes

## Step 6: Verify Deployment

Once deployment completes:

1. Go to **Azure Portal → Resource groups**

2. Find your resource group (`rg-hsq-feedback-prod`)

3. Check resources created:
   - **App Service**: Running Node.js backend
   - **Key Vault**: Stores Databricks token securely
   - **App Service Plan**: Compute resources

4. Test the app:
   ```bash
   # Get App Service URL from Azure Portal
   curl https://your-app-name.azurewebsites.net/api/health
   # Should return: {"status":"ok",...}
   ```

## Security Features

✅ **Databricks token stored in Key Vault** (not in code/env vars)
✅ **Managed identity** - App Service authenticates automatically
✅ **HTTPS enforced** - All traffic encrypted
✅ **Health checks** - Automatic recovery on failures
✅ **Logging enabled** - All activity tracked

## Troubleshooting

### GitHub Actions fails with "access denied"
- Verify AZURE_CREDENTIALS secret is set correctly
- Check Azure AD app has required roles

### Deployment succeeds but app is unhealthy
- Check Key Vault access: `az keyvault secret show --vault-name <vault-name> --name databricks-token`
- Verify Databricks token is valid
- Check Application logs in Azure Portal

### App can't connect to Databricks
- Verify Databricks host in `infrastructure/main.bicep`
- Check network connectivity (may need firewall rules)
- Ensure Databricks token has correct permissions

### To rollback:
```bash
# Deploy previous version
git revert <commit-hash>
git push origin main
```

## Manual Azure Deployment (without GitHub Actions)

If you prefer to deploy manually:

```bash
# 1. Install Azure CLI
brew install azure-cli  # macOS
# or apt-get install azure-cli  # Linux

# 2. Login to Azure
az login

# 3. Create resource group
az group create \
  --name rg-hsq-feedback-prod \
  --location westeurope

# 4. Deploy Bicep template
az deployment group create \
  --resource-group rg-hsq-feedback-prod \
  --template-file infrastructure/main.bicep \
  --parameters \
    projectName=hsq-feedback \
    environment=prod \
    databricksPATValue='your-databricks-token'

# 5. Deploy code to App Service
az webapp deployment source config-zip \
  --resource-group rg-hsq-feedback-prod \
  --name your-app-service-name \
  --src dist.zip
```

## Monitoring & Logs

**View app logs:**
```bash
az webapp log tail \
  --resource-group rg-hsq-feedback-prod \
  --name your-app-service-name
```

**View Key Vault access:**
```bash
az monitor activity-log list \
  --resource-group rg-hsq-feedback-prod \
  --resource-type Microsoft.KeyVault/vaults
```

## Cost Estimation

| Resource | Tier | Cost/Month |
|----------|------|-----------|
| App Service Plan | B1 (Basic) | ~$10 |
| Key Vault | Standard | ~$0.60 |
| **Total** | | **~$11** |

Costs can vary based on actual usage. Free tier eligible: None in this setup.

## Next Steps

1. ✅ Deploy to Azure
2. ⏭️ Configure custom domain
3. ⏭️ Enable Azure AD authentication
4. ⏭️ Set up monitoring alerts
5. ⏭️ Configure backup/disaster recovery
