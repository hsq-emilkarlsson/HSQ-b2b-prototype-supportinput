# N8N Workflow Import Guide

This guide walks you through importing the feedback workflow into n8n Cloud.

## ✅ Prerequisites

- Active n8n account at https://husqvarna-prod.app.n8n.cloud/
- Google Sheets API credentials configured in n8n (OAuth2)
- Azure OpenAI credentials (ID: `N3PXzwsVJBCm6Pv9`)

## 📋 Step 1: Copy the Workflow JSON

The workflow is located at: `n8n/n8n_flow.json`

```bash
# View the workflow
cat n8n/n8n_flow.json | head -100
```

## 🚀 Step 2: Import into N8N

1. Log in to https://husqvarna-prod.app.n8n.cloud/
2. Click **Workflows** → **New** → **Import from file/URL**
3. Paste the entire `n8n_flow.json` content
4. Click **Import**

## 🔌 Step 3: Configure Credentials

The workflow expects the following credentials to be already set up:

### Google Sheets (ID: `RlSZ1rbr0eTrRjYg`)
- Already configured with Husqvarna B2B account
- Access to spreadsheet: `1NYV47SSAdoBNcXv1uo_oEtZy2XloIn9sx-bwVMaXz8g`

### Azure OpenAI (ID: `N3PXzwsVJBCm6Pv9`)
- Already configured with production credentials
- Using model: `gpt-4.1`

**If credentials are missing**, configure them in n8n settings and update the workflow JSON credential IDs.

## 📝 Step 4: Verify Workflow Structure

Your imported workflow should have:

### Chat Webhook (`/webhook/feedback-agent/prototype`)
```
Webhook Chat
  ↓
Parse Chat (extract sessionId, message, language)
  ↓
AI Agent (with Azure OpenAI + Memory Buffer)
  ↓
Format Chat Response
  ↓
Is Summary? (check if mode == 'summary')
  ├─[YES]→ Save Chat to Sheets → Respond Chat
  └─[NO]→ Respond Chat directly
```

### Form Webhook (`/webhook/feedback-form/v1`)
```
Webhook Form
  ↓
Parse Form (extract email, message, files, sessionId)
  ↓
If Has File? (check if file exists)
  ├─[YES]→ Save Binary File → Prepare Response → Save to Sheets → Respond
  └─[NO]→ Prepare Response → Save to Sheets → Respond
```

## 🧪 Step 5: Test with CURL

### Test Form Submission (with file)

```bash
# Create a test file
echo "This is a test file" > /tmp/test.txt

# Submit form with file
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "email=test@husqvarna.com" \
  -F "message=Test feedback message" \
  -F "sessionId=test-session-123" \
  -F "language=sv" \
  -F "files=@/tmp/test.txt" \
  "https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1"
```

Expected response:
```json
{
  "status": "ok",
  "sessionId": "test-session-123",
  "email": "test@husqvarna.com",
  "message": "Test feedback message",
  "fileName": "test.txt",
  "fileSaved": true,
  "downloadPath": "feedback_uploads/test-session-123_test.txt",
  "downloadUrl": "https://your-n8n-instance.app.n8n.cloud/webhook/download-file?path=feedback_uploads/test-session-123_test.txt"
}
```

### Test Chat Submission

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "message": "The search function is slow",
    "sessionId": "chat-session-123",
    "conversationHistory": [],
    "language": "sv"
  }' \
  "https://husqvarna-prod.app.n8n.cloud/webhook/feedback-agent/prototype"
```

Expected response:
```json
{
  "mode": "chat",
  "displayMessage": "Hej! Tack för att du delar detta. Kan du berätta vilka sökord eller filter du använder när det är långsamt?",
  "conversationHistory": [...]
}
```

## 📊 Step 6: Verify Google Sheets Integration

After form submission, check:
- **Form sheet**: New row with `email`, `message`, `fileName`, `fileLink`, `timestamp`, `sessionId`
- **Chat sheet**: New row with `summary`, `type`, `category`, `priority`, `timestamp`, `sessionId` (after conversation ends)

## 🎯 Step 7: Deploy React Frontend

The frontend is already configured to post to these webhooks. The React app will:

1. **On form submit**: 
   - Create FormData with email, message, files
   - POST to `VITE_N8N_FORM_WEBHOOK_URL`
   - Display response with file download URL (if file was uploaded)

2. **On chat message**:
   - POST JSON with message, sessionId, conversationHistory
   - Display AI response
   - Continue conversation

## 🔧 Troubleshooting

### Issue: "File Name" parameter required error
- Check that file is properly parsed in "Parse Form" node
- Ensure "Save Binary File" node has correct `dataPropertyName: "data"`

### Issue: Google Sheets not updating
- Verify OAuth2 credentials are valid
- Check that sheet names match exactly: `"form"` and `"chat"`
- Verify spreadsheet ID matches: `1NYV47SSAdoBNcXv1uo_oEtZy2XloIn9sx-bwVMaXz8g`

### Issue: Chat returns "Empty response"
- Check n8n execution logs for "AI Agent" node
- Verify Azure OpenAI credentials (ID: `N3PXzwsVJBCm6Pv9`)
- Ensure "Memory Buffer" is connected to "AI Agent"

### Issue: Files not saving
- Check `/tmp/n8n_uploads` directory in n8n Cloud storage
- Verify "Save Binary File" node receives binary data
- Review n8n execution logs for the form webhook

## 📱 Frontend Environment Variables

The React app uses these env vars (already configured):

```env
VITE_N8N_FORM_WEBHOOK_URL=https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1
VITE_N8N_CHAT_WEBHOOK_URL=https://husqvarna-prod.app.n8n.cloud/webhook/feedback-agent/prototype
```

## ✨ Production Checklist

- [ ] N8N workflow imported and active
- [ ] All credentials configured (Google Sheets + Azure OpenAI)
- [ ] Form webhook tested with file and without file
- [ ] Chat webhook tested with multiple messages
- [ ] Google Sheets has entries for test submissions
- [ ] Files saved to n8n Cloud storage (`/tmp/n8n_uploads/`)
- [ ] React app deployed to Static Web App
- [ ] All webhook URLs in frontend environment variables
- [ ] CORS headers set correctly (workflow has `"Access-Control-Allow-Origin": "*"`)
- [ ] File download endpoint working (if implemented)

## 📞 Support

For issues with:
- **N8N**: Check execution logs in n8n Cloud dashboard
- **React App**: Check browser console and network tab
- **Google Sheets**: Verify OAuth2 token hasn't expired
- **Azure OpenAI**: Verify credentials and model availability
