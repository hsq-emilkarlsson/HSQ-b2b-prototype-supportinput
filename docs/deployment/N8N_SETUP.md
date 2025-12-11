# N8N Workflow Setup

## Import Workflow

1. Open your n8n instance: https://husqvarna-prod.app.n8n.cloud/
2. Go to **Workflows** → **Import from file**
3. Select `/n8n/n8n_flow.json`
4. Activate the workflow

## Configure Credentials

The workflow requires:
- **Google Sheets OAuth2** (ID: RlSZ1rbr0eTrRjYg)
- **Azure OpenAI** (ID: N3PXzwsVJBCm6Pv9)

## Webhook URLs

After import, note these webhook URLs:
- Chat: `https://husqvarna-prod.app.n8n.cloud/webhook/feedback-agent/prototype`
- Form: `https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1`
- Download: `https://husqvarna-prod.app.n8n.cloud/webhook/download-file`

## Google Sheets Structure

The workflow uses sheet: `1NYV47SSAdoBNcXv1uo_oEtZy2XloIn9sx-bwVMaXz8g`

### "chat" tab columns:
- Timestamp, SessionID, Type, Category, Summary, Impact, Priority, Language

### "form" tab columns:
- Timestamp, SessionID, Email, Message, FileName, FileBase64, FileLink

## Testing

Test the chat endpoint:
```bash
curl -X POST https://husqvarna-prod.app.n8n.cloud/webhook/feedback-agent/prototype \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","sessionId":"test123","language":"sv"}'
```
