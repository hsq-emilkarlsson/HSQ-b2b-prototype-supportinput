# File Upload Refactor - Frontend Direct to Databricks

## What Changed

### Problem
- n8n Cloud Code nodes sandbox HTTP APIs (axios, fetch, $http all blocked)
- Databricks Files API PUT requests failed in n8n
- File uploads were stuck with no workaround

### Solution
**Moved file upload from n8n to React frontend** using Databricks Files API directly

### Architecture

```
React Frontend (FeedbackPage.tsx)
  ↓
  ├─→ useDatabricksUpload hook
  │   └─→ Direct PUT to Databricks Files API
  │       (with Authorization Bearer token)
  ↓
  └─→ POST metadata + fileLink to n8n webhook
      (no file content, just metadata + link)
```

## Files Modified

### New Files
- `src/hooks/useDatabricksUpload.ts` - Databricks upload hook with browser-safe base64 handling
- `DEPLOYMENT.md` - Complete deployment guide for Azure Web Apps
- `test-upload.sh` - Test script to verify upload flow
- `.env.local` - Local development environment variables

### Modified Files

#### `src/FeedbackPage.tsx`
- Added `useDatabricksUpload` hook import
- Modified `handleFeedbackSubmit` to:
  1. Upload file to Databricks first (returns fileLink + fileViewUrl)
  2. Send metadata + fileLink to n8n (no base64 content)
- Removed unused Power Automate environment variables

#### `n8n/n8n_flow.json`
- Removed **"Upload to Databricks"** Code node (sandboxing blocked all HTTP)
- Updated **"Parse Form"** to accept `fileLink` + `fileViewUrl` from React
- Changed form flow: **Parse Form → [Google Sheets + Respond]** (removed middle upload step)
- Google Sheets now stores clickable FileLink instead of raw data

## Configuration

### Development
Create `.env.local`:
```env
VITE_DATABRICKS_TOKEN=<your-pat>
VITE_DATABRICKS_HOST=https://<workspace>.azuredatabricks.net
VITE_DATABRICKS_VOLUME_PATH=/Volumes/<catalog>/<schema>/<path>
```

### Production (Azure Web Apps)
Set App Settings in Azure Portal or via CLI:
```bash
az webapp config appsettings set \
  --resource-group myRg \
  --name myApp \
  --settings VITE_DATABRICKS_TOKEN="..." VITE_DATABRICKS_HOST="..."
```

## Testing

```bash
# Build
npm run build

# Run local tests
./test-upload.sh

# Start dev server
npm run dev
```

## Benefits

✅ **No n8n sandboxing** - Full control of HTTP requests  
✅ **Faster uploads** - Direct to Databricks (no n8n middleman)  
✅ **Clickable links** - Google Sheets stores Databricks file URLs  
✅ **Simpler n8n flow** - Only logs metadata  
✅ **Azure-ready** - Environment variables for secure deployment  

## Security Notes

⚠️ Databricks PAT is exposed in browser requests.

For production, consider:
1. **Backend proxy** - Recommended (see DEPLOYMENT.md)
2. **Temporary tokens** - Use Azure Key Vault to generate short-lived tokens
3. **Managed identity** - App Service uses Azure AD instead of hardcoded token

## Next Steps

1. Test locally: `npm run dev` → fill form with file
2. Check Browser DevTools → Network tab for Databricks PUT request
3. Deploy to Azure Web Apps with environment variables set
4. Monitor Databricks volume for new files
