# Azure Static Web App Deployment Guide for HSQ B2B Support App

## Quick Start

Snabbaste sättet att sätta upp automatisk deploy:

### 1. Förberedelser

```bash
# Se till att du är i projektets root
cd /Users/emilkarlsson/Desktop/hsq-b2b-prototype-supportinput

# Gör deployment scriptet körbart
chmod +x setup-azure-static-webapp.sh
```

### 2. Kör deployment setup

```bash
# Kör setup scriptet (GUI-guidad)
./setup-azure-static-webapp.sh
```

Scriptet kommer att:
- ✅ Logga in dig i Azure
- ✅ Skapa resursgrupp (`hsq-b2b-support`)
- ✅ Skapa Azure Static Web App (`hsq-b2b-support-app`)
- ✅ Hämta API token automatiskt
- ✅ Visa instruktioner för GitHub Secrets

### 3. Lägg till GitHub Secrets

1. Gå till: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

2. Lägg till dessa 3 secrets:

| Secret Name | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | (Från scriptet ovan) |
| `VITE_N8N_FORM_WEBHOOK_URL` | `https://husqvarna-prod.app.n8n.cloud/webhook/support-form/v1` |
| `VITE_N8N_CHAT_WEBHOOK_URL` | `https://husqvarna-prod.app.n8n.cloud/webhook/supportchat/prototype` |

### 4. Push till GitHub

```bash
git add .
git commit -m "Add Azure deployment setup"
git push origin main
```

### 5. Verifiera deployment

- **GitHub Actions:** https://github.com/YOUR_USERNAME/HSQ-b2b-prototype-supportinput/actions
- **Azure Portal:** https://portal.azure.com (sök efter `hsq-b2b-support-app`)

Din app blir live på Static Web App URL efter ~2-3 minuter!

---

## Deployment Architecture

```
GitHub (Main Branch)
    ↓ (Push)
GitHub Actions Workflow
    ↓
npm ci        (Install dependencies)
npm run build (Build React app → dist/)
    ↓
Azure Static Web App
    ↓
https://hsq-b2b-support-app.azurestaticapps.net
```

## GitHub Actions Workflow

Filen `.github/workflows/azure-static-web-app-deploy.yml` definierar:

```yaml
On: Push to main branch
  1. Checkout kod
  2. Setup Node.js 18
  3. npm ci (clean install)
  4. npm run build (with env variables)
  5. Deploy to Azure using API token
  6. Auto-cleanup på closed PRs
```

## Environment Variables

### Byggs in under build-tid (Production)

```javascript
// I koden används:
const chatWebhook = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL
const formWebhook = import.meta.env.VITE_N8N_FORM_WEBHOOK_URL
```

### Sätts via GitHub Secrets

Secrets konverteras automatiskt till environment variables under GitHub Actions build.

## Static Web App Config

Filen `staticwebapp.config.json` konfigurerar:

- **Routing:** SPA routing (allt pekar till index.html)
- **API:** Proxy för `/api` endpoints
- **CORS:** Tillåter n8n webhooks
- **CSP:** Security headers för scripts & content

## Monitorering

### GitHub Actions Logs
```
GitHub Repo → Actions → Se den senaste workflowen
Klicka på job för detaljerade logs
```

### Azure Portal
```
Static Web Apps → hsq-b2b-support-app
  → Deployments: Se alla tidigare deployments
  → Logs: Debugging
  → Custom Domain: Lägg till eget domännamn
```

## Custom Domain (Valfritt)

```bash
# I Azure Portal:
1. Static Web App → Settings → Custom domains
2. Lägg till din domän (t.ex. support.husqvarna.se)
3. Följ DNS-instruktionerna
```

## Rollback till tidigare version

```bash
# I Azure Portal:
Static Web Apps → Deployments → Klicka på tidigare version → Restore
```

## Performance Tips

1. **Gzippa assets:** Redan inbyggt i Static Web App
2. **CDN:** Globalt distribuerat automatiskt
3. **Caching:** Konfigureras i `staticwebapp.config.json`
4. **Build optimization:** 
   ```bash
   npm run build  # Redan optimerad med Vite
   ```

## Kostnader

**Azure Static Web Apps Free Tier:**
- ✅ 1 GiB bandbredd/månad
- ✅ Unlimited deployments
- ✅ 1 custom domain
- ✅ Github Actions integration
- ✅ HTTPS/SSL inbyggt

Om du behöver mer än 1 GiB bandbredd → Upgrade till Standard SKU

## Felsökning

### Build misslyckades
```bash
# Testa lokalt först:
npm run build
# Kontrollera output i .github/workflows/azure-static-web-app-deploy.yml logs
```

### Environment variables inte laddas
```
1. Verifiera secret names i GitHub (case-sensitive!)
2. Verifiera att Vite läser: import.meta.env.VITE_*
3. Kolla GitHub Actions logs för env variable values
```

### Static Web App säger 404
```
1. Verifiera build output: npm run build
2. dist/ folder bör finnas och innehålla index.html
3. Kontrollera staticwebapp.config.json navigationFallback
```

### Webhooks får 404
```
1. Verifiera att n8n webhooks är rätt i GitHub Secrets
2. Testa webhooks lokalt: curl -X POST https://husqvarna-prod.app.n8n.cloud/webhook/...
3. Kontrollera CSP headers i staticwebapp.config.json
```

## Nästa steg

1. ✅ Köra `./setup-azure-static-webapp.sh`
2. ✅ Lägga till GitHub Secrets
3. ✅ Göra en test push
4. ✅ Verifiera deployment i GitHub Actions
5. ✅ Testa appen på Azure Static Web App URL
6. (Valfritt) Lägg till custom domain

---

**Support:** Kontakta din Azure administrator eller se Azure Static Web App dokumentation
