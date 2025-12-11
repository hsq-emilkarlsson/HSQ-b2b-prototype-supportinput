# File Upload Architecture - Frontend to Databricks

## Overview

The feedback form now uploads files directly from the React frontend to Databricks, bypassing n8n's sandboxing limitations.

### Flow

1. **React Frontend** (FeedbackPage.tsx)
   - User selects file → converted to base64
   - `useDatabricksUpload` hook handles upload
   - Direct PUT request to Databricks Files API
   - Returns `fileLink` and `fileViewUrl`

2. **Databricks** (Files API)
   - Receives binary file at `/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments/{fileName}`
   - Returns 200 OK

3. **n8n Webhook** (feedback-form/v1)
   - Receives metadata + `fileLink` + `fileViewUrl` (no binary content)
   - Logs to Google Sheets with clickable link
   - Metadata only—no file content

4. **Google Sheets**
   - Stores: Email, Message, FileName, FileLink (clickable)

---

## Environment Variables

### Development (`.env.local`)
```env
VITE_DATABRICKS_TOKEN=dapi_YOUR_TOKEN_HERE
VITE_DATABRICKS_HOST=https://adb-2477674967236179.19.azuredatabricks.net
VITE_DATABRICKS_VOLUME_PATH=/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments
```

### Production (Azure Web Apps)

In **Azure Portal** → App Services → Configuration → Application Settings, add:

```
VITE_DATABRICKS_TOKEN=<your-pat-token>
VITE_DATABRICKS_HOST=https://<your-workspace>.azuredatabricks.net
VITE_DATABRICKS_VOLUME_PATH=/Volumes/<catalog>/<schema>/<volume-path>
```

---

## Deployment to Azure Web Apps

### 1. Build React app

```bash
npm run build
```

Output: `dist/` directory with static assets.

### 2. Create Azure App Service

```bash
az appservice plan create \
  --name feedbackPlan \
  --resource-group myResourceGroup \
  --sku B1

az webapp create \
  --resource-group myResourceGroup \
  --plan feedbackPlan \
  --name hsq-feedback-form \
  --runtime "node|18"
```

### 3. Configure App Settings

```bash
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name hsq-feedback-form \
  --settings \
    VITE_DATABRICKS_TOKEN="<your-pat>" \
    VITE_DATABRICKS_HOST="https://<workspace>.azuredatabricks.net" \
    VITE_DATABRICKS_VOLUME_PATH="/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments"
```

### 4. Deploy

```bash
az webapp up \
  --resource-group myResourceGroup \
  --name hsq-feedback-form \
  --runtime "node|18" \
  --path ./dist
```

---

## Security Considerations

⚠️ **Important**: The Databricks token is exposed in browser requests. 

For production, consider:

1. **Backend Proxy** (recommended)
   - Create Node.js/Python endpoint that handles Databricks upload
   - Frontend sends file to proxy endpoint
   - Proxy validates and uploads to Databricks with PAT
   - Frontend never sees the token

2. **Temporary Access Token**
   - Use Azure Key Vault to store PAT
   - Backend generates temporary signed URLs for Databricks
   - Frontend uses temporary token (expires after upload)

3. **Azure Managed Identity**
   - App Service uses managed identity to authenticate to Databricks
   - Removes need to store token in config

### Quick Backend Proxy Example (Node.js)

```typescript
// pages/api/upload.ts (Next.js) or routes/upload.js (Express)
import fetch from 'node-fetch';

export default async (req, res) => {
  const { fileName, fileContent } = req.body; // base64
  const DATABRICKS_PAT = process.env.DATABRICKS_TOKEN; // server-side only
  
  const binaryData = Buffer.from(fileContent, 'base64');
  const response = await fetch(
    `https://adb-xxx.azuredatabricks.net/api/2.0/fs/files/Volumes/.../${fileName}?overwrite=true`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${DATABRICKS_PAT}`,
        'Content-Type': 'application/octet-stream'
      },
      body: binaryData
    }
  );
  
  res.json({ success: response.ok });
};
```

---

## Testing Locally

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Fill form with test file
3. Open DevTools → Network tab
4. Watch for:
   - PUT request to Databricks Files API (200 OK)
   - POST request to n8n webhook (200 OK)

---

## Troubleshooting

### "401 Unauthorized" on Databricks upload
- Check PAT is valid and not expired
- Verify `VITE_DATABRICKS_TOKEN` is set

### "404 Not Found"
- Verify volume path exists in Databricks
- Check workspace URL is correct

### n8n webhook receives no `fileLink`
- Verify React upload succeeded first
- Check browser console for upload errors

