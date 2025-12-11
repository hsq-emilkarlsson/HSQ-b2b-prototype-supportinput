# Azure Blob Storage Setup för Filuppladdning via N8N

## Översikt

Detta är en backend-fri lösning där:
- **React** → Skickar base64-kodade filer till n8n
- **n8n** → Laddar upp till Azure Blob Storage via HTTP API
- **Azure Blob Storage** → Genererar publika download-URLs

## Steg 1: Skapa Storage Account i Azure

```bash
# Logga in
az login

# Skapa resource group (om du inte redan har en)
az group create --name rg-hsq-feedback --location westeurope

# Skapa storage account
az storage account create \
  --name hsqfeedbackstorage \
  --resource-group rg-hsq-feedback \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access true
```

## Steg 2: Skapa Blob Container

```bash
# Skapa container för feedback-filer
az storage container create \
  --name feedback-uploads \
  --account-name hsqfeedbackstorage \
  --public-access blob \
  --auth-mode login

# Verifiera att containern skapades
az storage container show \
  --name feedback-uploads \
  --account-name hsqfeedbackstorage \
  --auth-mode login
```

## Steg 3: Hämta Storage Account Key

```bash
# Lista nycklar
az storage account keys list \
  --resource-group rg-hsq-feedback \
  --account-name hsqfeedbackstorage

# Spara key1 för användning i n8n
```

## Steg 4: Konfigurera CORS för Static Web App

```bash
az storage cors add \
  --services b \
  --methods GET OPTIONS \
  --origins "https://white-smoke-0ae37b610.5.azurestaticapps.net" "http://localhost:5173" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --account-name hsqfeedbackstorage
```

## Steg 5: Konfigurera N8N Credentials

I n8n Cloud (https://husqvarna-prod.app.n8n.cloud/):

1. Gå till **Credentials** → **New**
2. Välj **HTTP Header Auth**
3. Namn: "Azure Blob Storage Auth"
4. Header Name: `x-ms-version`
5. Header Value: `2020-10-02`

Skapa även en Generic Credential för Storage Account:
- **Credential Type**: Generic
- **Name**: "Azure Storage Account"
- **Fields**:
  - `accountName`: `hsqfeedbackstorage`
  - `accountKey`: `[din-key-från-steg-3]`

## Steg 6: Uppdatera N8N Workflow

Workflowet kommer att:

1. **Ta emot base64 fil** från React
2. **Generera unikt filnamn** (`sessionId_timestamp_originalfilename`)
3. **Ladda upp till Blob Storage** med HTTP PUT-request
4. **Generera publik URL**: 
   ```
   https://hsqfeedbackstorage.blob.core.windows.net/feedback-uploads/{filename}
   ```
5. **Spara URL i Google Sheets**

## Steg 7: Testa Uppladdning

```bash
# Testa direkt mot Azure Blob Storage
curl -X PUT \
  "https://hsqfeedbackstorage.blob.core.windows.net/feedback-uploads/test.txt" \
  -H "x-ms-version: 2020-10-02" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: text/plain" \
  -H "Authorization: SharedKey hsqfeedbackstorage:..." \
  --data "Hello World"

# Testa download
curl "https://hsqfeedbackstorage.blob.core.windows.net/feedback-uploads/test.txt"
```

## Säkerhetsöverväganden

### ✅ Fördelar
- Inga credentials i frontend-kod
- n8n hanterar autentisering mot Azure
- Publika URLs (läs-endast) för nedladdning
- Ingen egen backend behövs

### ⚠️ Begränsningar
- Blob Storage måste ha `--allow-blob-public-access true`
- Filerna är publikt läsbara (men URL:erna är svåra att gissa)
- Max filstorlek beror på n8n's gränser (~100MB)

### 🔒 Om du behöver privata filer

Om säkerhetspolicys kräver privata filer, använd **SAS tokens**:

```bash
# Skapa container utan public access
az storage container create \
  --name feedback-uploads-private \
  --account-name hsqfeedbackstorage \
  --public-access off

# Generera SAS token (1 år giltighet)
az storage container generate-sas \
  --account-name hsqfeedbackstorage \
  --name feedback-uploads-private \
  --permissions rwl \
  --expiry 2026-12-31 \
  --auth-mode key \
  --account-key [din-key]
```

Då måste n8n:
1. Ladda upp fil med SAS token
2. Generera temporär download-länk med ny SAS token
3. Spara den temporära länken i Google Sheets

## URL Format

**Publik blob**: 
```
https://hsqfeedbackstorage.blob.core.windows.net/feedback-uploads/session_123_document.pdf
```

**Med SAS token** (privat):
```
https://hsqfeedbackstorage.blob.core.windows.net/feedback-uploads-private/session_123_document.pdf?sv=2020-10-02&se=2026-12-31&sr=c&sp=r&sig=...
```

## Troubleshooting

### "Public access not allowed"
```bash
# Aktivera public access
az storage account update \
  --name hsqfeedbackstorage \
  --resource-group rg-hsq-feedback \
  --allow-blob-public-access true
```

### "CORS error"
```bash
# Lägg till CORS regler
az storage cors clear --services b --account-name hsqfeedbackstorage
az storage cors add \
  --services b \
  --methods GET PUT OPTIONS \
  --origins "*" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --account-name hsqfeedbackstorage
```

### "Authentication failed"
- Verifiera att account key är korrekt
- Kontrollera att `x-ms-version` header är satt
- Se till att generera korrekt SharedKey signature

## Nästa Steg

1. Kör Azure CLI-kommandon ovan
2. Hämta account name och key
3. Importera uppdaterad n8n workflow (`n8n_flow_azure_blob.json`)
4. Konfigurera credentials i n8n
5. Testa uppladdning via React-appen
