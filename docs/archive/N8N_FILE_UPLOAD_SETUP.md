# N8N File Upload Workflow Setup Guide

## Overview
En komplett n8n-workflow som hanterar:
- ✅ Bifogade filer (multipart/form-data eller base64)
- ✅ Persistent lagring i n8n Cloud
- ✅ Automatisk Google Sheets-loggning
- ✅ Public download-endpoint för hämtning av sparade filer

## Installation & Setup

### 1. Importera Workflowet
1. Öppna n8n Cloud-instansen
2. Gå till **Workflows** → **Import** 
3. Klistra in JSON från `feedback-form-file-handler.json`
4. Namnge det t.ex. `Feedback Form - File Upload Handler`

### 2. Konfigurera Credentials

#### Google Sheets OAuth2
1. Noder → `append_google_sheets` 
2. Credential: Click **Create new** → **Google Sheets OAuth2**
3. Autentisera med ditt Google-konto
4. Spara

#### Environment Variables
Lägg in dessa i n8n (Settings → Environment Variables):

```
GOOGLE_SHEETS_ID=<Din Google Sheets document ID>
N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook
```

**Hur hämta Google Sheets ID:**
- Öppna arket i Google Drive
- ID är delen mellan `/d/` och `/edit` i URL:en
- Exempel: `https://docs.google.com/spreadsheets/d/1ABC123XYZ/edit`
- ID = `1ABC123XYZ`

### 3. Förbered Google Sheets
1. Skapa ett nytt Google Sheets-ark
2. Skapa ett sheet med namn **"Feedback Logs"**
3. Lägg in headers i rad 1:
   - A: Timestamp
   - B: Email
   - C: Message
   - D: SessionId
   - E: FileName
   - F: LocalFilePath

4. **Dela arket** med n8n service account-emailen (som du får vid OAuth-setup)

### 4. Testa Workflowet Lokalt

#### POST-webhook (Form Submission med fil)

**Multipart/Form-Data:**
```bash
curl -X POST https://your-instance.app.n8n.cloud/webhook/feedback-form/v1 \
  -F "email=test@example.com" \
  -F "message=Test message" \
  -F "sessionId=session_test_123" \
  -F "source=web-feedback-form" \
  -F "files=@/path/to/file.pdf"
```

**JSON med Base64:**
```bash
curl -X POST https://your-instance.app.n8n.cloud/webhook/feedback-form/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "message": "Test message",
    "sessionId": "session_test_123",
    "source": "web-feedback-form",
    "fileName": "test.txt",
    "fileContentBase64": "dGVzdCBmaWxlIGNvbnRlbnQ="
  }'
```

**Expected Response:**
```json
{
  "status": "ok",
  "sessionId": "session_test_123",
  "fileSaved": true,
  "localFilePath": "feedback_uploads/session_test_123_file.pdf",
  "downloadUrl": "https://your-instance.app.n8n.cloud/webhook/download-file?path=feedback_uploads/session_test_123_file.pdf"
}
```

#### GET-webhook (Download File)

```bash
curl -X GET "https://your-instance.app.n8n.cloud/webhook/download-file?path=feedback_uploads/session_test_123_file.pdf" \
  -O -J
```

### 5. Integrera med React Frontend

#### useN8nSubmit Hook Update

```typescript
export function useN8nSubmit(webhookUrl: string): UseN8nSubmitResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitForm = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert FormData to multipart/form-data fetch
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData, // Browser automatically sets Content-Type: multipart/form-data
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if n8n returned an error
      if (data.status !== 'ok') {
        throw new Error(data.error || 'Workflow execution failed');
      }

      setSuccess(true);
      
      // Optionally log the file path and download URL
      console.log('File saved at:', data.localFilePath);
      console.log('Download URL:', data.downloadUrl);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    success,
    submitForm,
  };
}
```

#### FeedbackPage Integration

```tsx
const handleFeedbackSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // Create FormData to send to n8n webhook
    const formData = new FormData();
    formData.append('email', email);
    formData.append('message', feedbackText);
    formData.append('sessionId', sessionId);
    formData.append('source', 'web-feedback-form');
    
    // Add files directly to FormData (multipart)
    attachedFiles.forEach((file) => {
      formData.append('files', file); // Multiple files with same key
    });

    // Submit to n8n webhook (multipart/form-data)
    await submitForm(formData);

    // Clear form on success
    if (submitSuccess) {
      setFeedbackText('');
      setEmail('');
      setAttachedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  } catch (error) {
    console.error('Feedback submission error:', error);
  }
};
```

### 6. Environment Variables för React Frontend

Uppdatera `.env.local` och GitHub Secrets:

```
VITE_N8N_FORM_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/feedback-form/v1
VITE_N8N_CHAT_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/feedback-agent/prototype
```

### 7. Production Checklist

- [ ] Google Sheets OAuth2 konfigurerad
- [ ] Environment variables satta i n8n
- [ ] Google Sheets-arket skapad med rätt headers
- [ ] Workflow testad med POST (multipart)
- [ ] Workflow testad med POST (base64)
- [ ] Workflow testad med GET download
- [ ] Google Sheets mottog loggdata
- [ ] Frontend useN8nSubmit hook uppdaterad
- [ ] `.env.local` / GitHub Secrets har rätt URL
- [ ] Deploy till Static Web App genomförd
- [ ] End-to-end test från frontend → n8n → Sheets

## Workflow Node-detaljer

### 1. **Webhook POST** (webhook_post)
- Path: `feedback-form/v1`
- Method: `POST`
- Accepterar: multipart/form-data + JSON

### 2. **Parse Form Data** (parse_form_data)
- Extraherar: email, message, sessionId, source
- Genererar sessionId om saknas

### 3. **Check if File Exists** (check_file_exists)
- Condition: Är files-array inte tom ELLER fileContentBase64 finns?
- Om ja → normalize_file
- Om nej → no_file_branch

### 4. **Normalize File Data** (normalize_file)
- JavaScript Code node
- Hanterar: multipart binary + base64 konvertering
- Output: filePath (`feedback_uploads/<sessionId>_<fileName>`)

### 5. **Write Binary File** (write_binary_file)
- Sparar fil i n8n Cloud persistent storage
- Använder filePath från normalize_file

### 6. **Prepare Sheet Row** (prepare_sheet_row)
- Formaterar data för Google Sheets
- Columns: Timestamp, Email, Message, SessionId, FileName, LocalFilePath

### 7. **Append to Google Sheets** (append_google_sheets)
- Google Sheets-integration
- Sheet: "Feedback Logs"

### 8. **Prepare Webhook Response** (prepare_response)
- Skapar JSON-response med: status, sessionId, fileSaved, localFilePath, downloadUrl

### 9. **Respond to Form** (respond_form_submission)
- Skickar JSON tillbaka till frontend (HTTP 200)

### 10. **Webhook GET** (webhook_get)
- Path: `download-file`
- Method: `GET`
- Query param: `path` (filePath)

### 11. **Read Binary File** (read_binary_file)
- Läser fil från n8n Cloud storage
- Använder path från query-parameter

### 12. **Respond with File** (respond_file_download)
- Skickar binary data tillbaka för download

## Troubleshooting

### File not saved
- Kontrollera att `Write Binary File`-noden inte har errors
- Verifiera att filePath är giltigt (no spaces, special chars)
- Se n8n execution-loggar för detaljer

### Google Sheets logging failed
- Kontrollera OAuth2-credentials
- Verifiera att sheets-arket är delat med n8n service account
- Se till att kolumner är rätt (A-F)

### Download returns 404
- Kontrollera att filePath i query-parametern är URL-encoded
- Verifiera att fil faktiskt sparades (kolla GET-webhook POST-body i loggarna)
- File path måste matcha exakt från previous Write Binary File-execution

### Multipart upload issues
- Frontend FormData måste ha `files` key för bifogade filer
- Browser sätter automatiskt `Content-Type: multipart/form-data`
- Verifiera att `Normalize File Data`-koden kördes utan fel

## Säkerhet & Best Practices

- ✅ Filer lagras i n8n Cloud (encrypted)
- ✅ Download-URL kan begränsas (senare: lägg till autentisering)
- ✅ SessionId unikt per submission (förhindrar collisions)
- ✅ All metadata loggad i Google Sheets för audit trail
- ⚠️ Rekommendation: Senare lägg till filstorlek-validering + virus-scanning i n8n

## Support

Om du behöver hjälp:
1. Kontrollera n8n execution-historiken för fel
2. Se React console för network-errors
3. Verifiera Google Sheets-integration separat
4. Test POST/GET webhooks med curl innan frontend-test
