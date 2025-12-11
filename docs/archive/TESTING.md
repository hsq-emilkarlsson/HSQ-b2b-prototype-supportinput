# 🧪 Testing Guide - File Upload Flow

## Step 1: Start the Dev Server

```bash
npm run dev
```

This will start the React app on `http://localhost:3001` and automatically open it in your browser.

## Step 2: Test the Upload

1. **Fill in the form:**
   - Email: `test@example.com` (or your email)
   - Message: `Test message with file upload`
   - File: Select any file (image, PDF, text, etc.)

2. **Click "Skicka" (Submit) button**

3. **What you should see:**
   - ⏳ Spinning loader with "Skickar..." message
   - ✅ Green success box: "Feedback skickat" message
   - No error alerts (if there are, check console with F12)

## Step 3: Verify Results

### Check 1: Databricks Volume
Go to: https://adb-2477674967236179.19.azuredatabricks.net/browse/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments

You should see your file here:
- Look for filenames like: `test_*.txt` or your actual filename

### Check 2: Google Sheets
Go to: https://docs.google.com/spreadsheets/d/1NYV47SSAdoBNcXv1uo_oEtZy2XloIn9sx-bwVMaXz8g/edit

Look for a new row:
- **Timestamp**: Current date/time
- **Email**: Your email
- **Message**: Your message
- **FileName**: Your uploaded file name
- **FileLink**: Should be a clickable link to your file in Databricks

### Check 3: n8n Workflow
Go to: https://husqvarna-prod.app.n8n.cloud

Look for "B2B Feedback Form Workflow" → Executions:
- Should show recent execution
- No errors in the workflow

## Troubleshooting

### Problem: "Fel: File upload to Databricks failed"

**Cause:** Databricks API error
- Check browser console (F12 → Console tab)
- Check that VITE_DATABRICKS_TOKEN is set in `.env.local`

### Problem: "Fel: n8n submission failed"

**Cause:** n8n webhook error
- Check n8n workflow is active
- Check webhook URL is correct: `https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1`

### Problem: File uploaded but Google Sheets is empty

**Cause:** n8n workflow didn't process the webhook
- Check n8n execution logs
- Verify the webhook is connected to "Save Form to Google Sheets" node

### Problem: Blank page or won't load

**Cause:** Dev server issues
```bash
# Kill any existing process
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Try again
npm run dev
```

## Expected Flow

```
React Form (localhost:3001)
         ↓
    [Input data]
         ↓
    [Upload file to Databricks] ← HTTP PUT with binary data
         ↓ (returns fileLink + fileViewUrl)
    [Send metadata to n8n webhook] ← HTTP POST with JSON
         ↓ (gets 200 OK)
    [Show success message]
         ↓
Databricks + Google Sheets updated
```

## Check Network Tab (DevTools)

Press F12 in browser → Network tab:

You should see TWO successful requests:

1. **PUT request** to:
   ```
   https://adb-2477674967236179.19.azuredatabricks.net/api/2.0/fs/files/Volumes/...
   ```
   - Status: 204 No Content ✅

2. **POST request** to:
   ```
   https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1
   ```
   - Status: 200 OK ✅

If either shows error status (401, 403, 500), check the response body for details.

---

**Need help?** Check the error message in:
- Browser alert popup
- Browser console (F12 → Console)
- Network tab (F12 → Network)
