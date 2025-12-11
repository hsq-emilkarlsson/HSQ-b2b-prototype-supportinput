# Azure Security Policies - Discovered & Solutions

## Overview

The Husqvarna Azure environment (tenant: `2a1c169e-715a-412b-b526-05da3f8412fa`, subscription: `c0b03b12-570f-4442-b337-c9175ad4037f`) enforces strict security policies at the management group level (`mg-development`). This document outlines the policies discovered during deployment testing and the solutions implemented.

---

## Policy 1: Deny Public Network Access for PaaS Resources

**Policy Details:**
- **Name:** `Deny public network access for PaaS resources in mg-development`
- **Assignment ID:** `/providers/Microsoft.Management/managementGroups/mg-development/providers/Microsoft.Authorization/policyAssignments/deny-paas-public-dev`
- **Definition:** `App Service apps should disable public network access`
- **Scope:** All PaaS resources in Development environment
- **Effect:** Deny

**Affected Resources:**
- Azure Key Vault
- Azure App Service
- Azure SQL Database
- Azure Cosmos DB
- etc.

**Error Message Example:**
```
(RequestDisallowedByPolicy) Resource 'app-hsq-test-10727' was disallowed by policy.
Policy: "App Service apps should disable public network access"
```

### Solution Implemented

**For Key Vault:**
```bash
az keyvault create \
  --name mykeyvault \
  --resource-group mygroup \
  --public-network-access Disabled
```

**For App Service (Bicep):**
```bicep
resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  location: location
  properties: {
    publicNetworkAccess: 'Disabled'  // ← CRITICAL: Required by policy
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
    // ... rest of properties
  }
}
```

**Key Points:**
- ✅ `publicNetworkAccess: 'Disabled'` must be set **at resource creation time** (not after)
- ✅ Network ACLs should deny by default and allow only necessary services
- ✅ This applies to **all PaaS services** not just App Service

---

## Policy 2: Runtime Version Constraints

**Limitation:**
- Node.js 18-lts is **no longer supported** on Azure App Service
- Supported versions: Node 20-lts, 22-lts, 24-lts

**Error Message:**
```
ERROR: Linux Runtime 'NODE|18-lts' is not supported.
Run 'az webapp list-runtimes --os-type linux' to cross check
```

### Solution Implemented

Updated `infrastructure/main.bicep`:
```bicep
linuxFxVersion: 'NODE|20-lts'  // Changed from NODE|18-lts
```

**Command to verify available runtimes:**
```bash
az webapp list-runtimes --os-type linux | grep -i node
```

---

## Deployment Testing Results

### ✅ Successfully Created Resources

1. **Resource Group** (`rg-hsq-feedback-test`)
   - Location: `westeurope`
   - Auto-tagged with security metadata
   - Tags: `ApplicationMaster: APP1066`, `CostCenter: 1881130`, `EnvironmentType: Dev`

2. **App Service Plan** (`plan-hsq-feedback-prod`)
   - SKU: B1 (Basic)
   - OS: Linux
   - Status: Running

3. **Key Vault** (`kvda47jmgaub6dg`)
   - SKU: Standard
   - Public Network Access: **Disabled** ✅
   - RBAC Enabled: ✅
   - Access Policies: Configured for App Service managed identity

4. **App Service** (`app-hsq-feedback-prod-da47jmgaub6dg`)
   - Runtime: Node 20-lts
   - Status: Running
   - HTTPS Only: Enabled
   - Managed Identity: System-assigned

---

## Recommended IT Approval Items

### For Your IT/Security Team

1. **Policy Exemption Request** (if needed)
   - Policy: "Deny public network access for PaaS resources in mg-development"
   - Resource: App Service and Key Vault
   - Justification: Application architecture requires Key Vault for secure credential management; no public endpoints needed

2. **Network Configuration** (Current approach - no exemption needed)
   - All resources deployed with public network access disabled ✅
   - Uses Azure Service-to-Service authentication (managed identity) ✅
   - No internet exposure required ✅

3. **RBAC Assignments**
   - App Service has system-assigned managed identity
   - Managed identity has `Get` and `List` permissions on Key Vault secrets
   - No hardcoded credentials in deployment

---

## Security Best Practices Applied

✅ **Network Security**
- Public network access disabled on all PaaS resources
- Network ACLs: Default deny, exception only for Azure services

✅ **Credential Management**
- Databricks PAT stored in Azure Key Vault (encrypted at rest)
- App Service uses managed identity (no client secrets)
- No credentials in environment variables or config files

✅ **Transport Security**
- HTTPS only enforced on App Service
- TLS 1.2 minimum on all connections
- FTP access disabled

✅ **Compliance**
- Auto-tagged resources (ApplicationMaster, CostCenter, EnvironmentType)
- Audit logging enabled on App Service
- Health check configured (/api/health)

---

## Next Steps

1. **Configure GitHub Secrets** (required for CI/CD):
   ```bash
   # In GitHub repository Settings → Secrets → Actions
   AZURE_CREDENTIALS={"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}
   DATABRICKS_PAT=your-pat-token
   ```

2. **Update Bicep Parameters:**
   - Update `infrastructure/main.bicep` with your actual Databricks credentials
   - Set production resource names

3. **Test Deployment:**
   ```bash
   az deployment group create \
     --resource-group rg-hsq-feedback-prod \
     --template-file infrastructure/main.bicep \
     --parameters databricksPATValue="<token>"
   ```

4. **Monitor in Production:**
   - Check App Service logs in Azure Portal
   - Monitor Key Vault access audit logs
   - Set up Application Insights for performance monitoring

---

## Troubleshooting

### Policy Violations

If you see:
```
(RequestDisallowedByPolicy) Resource 'xyz' was disallowed by policy
```

**Check these in your Bicep/ARM template:**
1. ✅ `publicNetworkAccess: 'Disabled'` is set
2. ✅ `networkAcls.defaultAction: 'Deny'`
3. ✅ `networkAcls.bypass: 'AzureServices'`

### App Service Cannot Access Key Vault

**Verify:**
1. App Service has System-assigned managed identity enabled
2. Key Vault has access policy for the app's principal ID:
   ```bash
   az keyvault set-policy \
     --name mykeyvault \
     --object-id <app-principal-id> \
     --secret-permissions get list
   ```

### Runtime Not Found

**Check available runtimes:**
```bash
az webapp list-runtimes --os-type linux
```

Always use supported versions (currently: Node 20, 22, 24 LTS).

---

## Questions?

Contact your Azure subscription administrator or Husqvarna IT security team for policy details and exemption requests.
