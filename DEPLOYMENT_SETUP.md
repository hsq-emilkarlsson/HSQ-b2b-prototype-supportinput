# Azure Static Web App Deployment Setup

## Steg-för-steg guide för att sätta upp automatisk deploy

### 1. Skapa Azure Static Web App

```bash
# Logga in i Azure
az login

# Skapa resursgrupp (om den inte finns)
az group create --name hsq-b2b-support --location swedencentral

# Skapa Static Web App
az staticwebapp create \
  --name hsq-b2b-support-app \
  --resource-group hsq-b2b-support \
  --source https://github.com/<your-username>/HSQ-b2b-prototype-supportinput \
  --branch main \
  --location swedencentral \
  --build-properties appLocation="/" apiLocation="api" outputLocation="dist"
```

### 2. Hämta API Token

Efter att Static Web App har skapats:

```bash
# Hämta API token
az staticwebapp secrets list \
  --name hsq-b2b-support-app \
  --resource-group hsq-b2b-support
```

### 3. Lägg till GitHub Secrets

Gå till GitHub Repository → Settings → Secrets and variables → Actions

Lägg till följande secrets:

- **AZURE_STATIC_WEB_APPS_API_TOKEN**: (Värdet från az staticwebapp secrets list)
- **VITE_N8N_FORM_WEBHOOK_URL**: `https://husqvarna-prod.app.n8n.cloud/webhook/support-form/v1`
- **VITE_N8N_CHAT_WEBHOOK_URL**: `https://husqvarna-prod.app.n8n.cloud/webhook/supportchat/prototype`

### 4. Push till GitHub

```bash
# Initiera Git (om inte redan gjort)
git init
git add .
git commit -m "Initial commit with Azure deployment setup"
git branch -M main
git remote add origin https://github.com/<your-username>/HSQ-b2b-prototype-supportinput.git
git push -u origin main
```

### 5. Verifiera Deploy

- Gå till https://github.com/<your-username>/HSQ-b2b-prototype-supportinput/actions
- Se GitHub Actions köra din workflow
- Efter succesfullt build, besök din Static Web App URL (visas i Azure Portal)

## Miljökonfiguration

### Development (.env.local)
```
VITE_N8N_FORM_WEBHOOK_URL=https://husqvarna-prod.app.n8n.cloud/webhook/support-form/v1
VITE_N8N_CHAT_WEBHOOK_URL=https://husqvarna-prod.app.n8n.cloud/webhook/supportchat/prototype
```

### Production
Miljövariabler hämtas från GitHub Secrets under deployment.

## File Structure

```
.github/
  workflows/
    azure-static-web-app-deploy.yml  <- GitHub Actions workflow
src/                                  <- React app
dist/                                 <- Build output
api/                                  <- API endpoints (optional)
staticwebapp.config.json             <- Static Web App configuration
```

## Workflow Detaljer

Workflowen gör följande vid varje push till main:

1. ✅ Checka ut kod
2. ✅ Installera Node.js 18
3. ✅ Installera beroenden (`npm ci`)
4. ✅ Bygga applikationen (`npm run build`)
5. ✅ Deploya till Azure Static Web App
6. ✅ Rensa staging vid stängd Pull Request

## Felsökning

### Build misslyckas
- Kontrollera att `npm run build` fungerar lokalt
- Se GitHub Actions logs för detaljer

### Deploy misslyckas
- Verifiera API token i GitHub Secrets
- Kontrollera att Static Web App-resursen existerar
- Se Azure Portal för deployment status

### Miljövariabler inte laddas
- Verifiera att secrets är rätt namngivna i GitHub
- Kolla att env-variablerna är i use i JavaScript/TypeScript
