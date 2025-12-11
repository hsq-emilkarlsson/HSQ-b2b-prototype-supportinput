# N8N Flödes-Integreringsguide

## Vad som uppdaterades i `n8n_flow.json`

Ditt befintliga flöde har utökats med **filhantering** (Write Binary File + Read Binary File):

### 📋 Flödes-struktur

#### **Form-webhook** (`/webhook/feedback-form/v1`)
```
POST /webhook/feedback-form/v1
├─ Parse Form
├─ Normalize Upload File  [NY]
├─ If File Exists  [NY]
│  ├─ Write Binary File  [NY] → Spara fil till persistent storage
│  └─ (eller skip om ingen fil)
├─ Prepare Form Response  [NY]
├─ Save Form to Google Sheets
└─ Respond to Form
```

#### **Chat-webhook** (`/webhook/feedback-agent/prototype`)
```
POST /webhook/feedback-agent/prototype
├─ Parse & Detect Language
├─ AI Agent (Azure OpenAI)
├─ Format Response
├─ Only Save Summaries
├─ Prepare Summary for Sheets
├─ Save to Google Sheets
└─ Respond to Chat
```

#### **Download-webhook** (`/webhook/download-file`) [NY]
```
GET /webhook/download-file?path=feedback_uploads/session_123_file.pdf
├─ Parse Download Request
├─ Read Binary File  [NY]
└─ Respond Download File  [NY]
```

---

## Nya Noder

| Nod | Typ | Funktion |
|-----|-----|----------|
| **Normalize Upload File** | Code | Hanterar multipart + base64 filer, normaliserar till binary |
| **If File Exists** | Condition | Branch: fil exists → Write, no file → skip |
| **Write Binary File** | File I/O | Sparar fil till n8n Cloud persistent storage |
| **Prepare Form Response** | Code | Bygger JSON-response med downloadUrl |
| **Webhook Download** | Webhook | GET `/download-file?path=...` endpoint |
| **Parse Download Request** | Code | Extraherar filPath från query parameter |
| **Read Binary File** | File I/O | Läser fil från persistent storage för download |
| **Respond Download File** | Webhook | Skickar fil som binary-respons |

---

## Användarflöde

### 1. **Form-submission MED fil**

```
Frontend (React)
├─ Skapa FormData
│  ├─ email: "test@example.com"
│  ├─ message: "Feedback text"
│  ├─ sessionId: "session_123"
│  └─ files: [File1, File2, ...]  (multipart)
│
└─ POST https://n8n-instance.app.n8n.cloud/webhook/feedback-form/v1

N8N Workflow
├─ Parse Form → Extrahera fields
├─ Normalize Upload File → Konvertera fil till binary
├─ If File Exists → JA
├─ Write Binary File → Spara at `feedback_uploads/session_123_file.pdf`
├─ Prepare Form Response → Bygga response + downloadUrl
├─ Save Form to Google Sheets → Logga metadata
└─ Respond → 
   {
     "status": "ok",
     "sessionId": "session_123",
     "fileSaved": true,
     "fileName": "file.pdf",
     "localFilePath": "feedback_uploads/session_123_file.pdf",
     "downloadUrl": "https://.../download-file?path=feedback_uploads%2Fsession_123_file.pdf"
   }

Google Sheets
└─ Ny rad: [Timestamp, SessionID, Email, Message, FileName, FileLink]
```

### 2. **Form-submission UTAN fil**

```
Frontend (React)
├─ Skapa FormData (bara email + message)
│
└─ POST https://n8n-instance.app.n8n.cloud/webhook/feedback-form/v1

N8N Workflow
├─ Parse Form
├─ Normalize Upload File → INGEN FIL
├─ If File Exists → NEJ
├─ (Skip Write Binary File)
├─ Prepare Form Response → 
   {
     "status": "ok",
     "sessionId": "session_123",
     "fileSaved": false,
     "downloadUrl": ""
   }
└─ Respond → success
```

### 3. **Download fil senare**

```
Frontend (eller vem som helst)
└─ GET https://n8n-instance.app.n8n.cloud/webhook/download-file?path=feedback_uploads%2Fsession_123_file.pdf

N8N Workflow
├─ Parse Download Request → Dekoda path-parameter
├─ Read Binary File → Läs från persistent storage
├─ Respond Download File → Skicka file binary med Content-Disposition header
```

---

## Installationssteg

### 1. Importera i n8n
1. Öppna n8n Cloud
2. **New Workflow** → **Import**
3. Klistra in JSON från `n8n_flow.json`
4. Spara som "B2B Feedback Chat Workflow"

### 2. Konfigurera Credentials
- ✅ **Azure OpenAI** → Redan konfigurerad (se `credentials` i AI Agent nod)
- ✅ **Google Sheets OAuth2** → Redan konfigurerad
- ⚠️ **Uppdatera** `documentId` och `sheetName` för dina Sheets!

### 3. Uppdatera Download URL
I noden **"Prepare Form Response"**, uppdatera denna rad:
```javascript
const downloadUrl = hasFile 
  ? `https://YOUR_N8N_INSTANCE.app.n8n.cloud/webhook/download-file?path=${encodeURIComponent(filePath)}`
  : '';
```

Ersätt `YOUR_N8N_INSTANCE` med din faktiska instans (t.ex. `husqvarna-prod`)

### 4. Aktivera Workflow
- Klicka **Save**
- Klicka **Activate**
- Kontrollera att webhooks är "Active" (grön ljus)

---

## Test

### Test Form-submission MED fil

```bash
# Multipart upload
curl -X POST https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1 \
  -F "email=test@example.com" \
  -F "message=Test feedback" \
  -F "sessionId=session_test_001" \
  -F "files=@/path/to/testfile.pdf"
```

**Expected Response:**
```json
{
  "status": "ok",
  "sessionId": "session_test_001",
  "fileSaved": true,
  "fileName": "testfile.pdf",
  "localFilePath": "feedback_uploads/session_test_001_testfile.pdf",
  "downloadUrl": "https://husqvarna-prod.app.n8n.cloud/webhook/download-file?path=feedback_uploads%2Fsession_test_001_testfile.pdf"
}
```

### Test Form-submission UTAN fil

```bash
curl -X POST https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "message": "Test feedback without file",
    "sessionId": "session_test_002"
  }'
```

### Test File Download

```bash
curl -X GET "https://husqvarna-prod.app.n8n.cloud/webhook/download-file?path=feedback_uploads%2Fsession_test_001_testfile.pdf" \
  -O -J
```

---

## Environment Variables (React Frontend)

Uppdatera `.env.local`:

```env
# N8N Webhooks
VITE_N8N_FORM_WEBHOOK_URL=https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1
VITE_N8N_CHAT_WEBHOOK_URL=https://husqvarna-prod.app.n8n.cloud/webhook/feedback-agent/prototype

# Legacy (optional - kan tas bort)
VITE_DATABRICKS_TOKEN=...
VITE_DATABRICKS_HOST=...
```

---

## Dataflöde Google Sheets

### "form" sheet
```
Timestamp | SessionID | Email | Message | FileName | FileLink
----------|-----------|-------|---------|----------|----------
2025-01-15T10:30:00Z | session_123 | test@example.com | Feedback text | file.pdf | https://.../feedback_uploads/session_123_file.pdf
```

### "chat" sheet
```
Timestamp | SessionID | Type | Category | Summary | Impact | Priority | Context | Suggested_Action | Frequency | Language | Conversation
```

---

## Felsökning

### "File not saved"
- Kontrollera att **Write Binary File**-noden inte returnerar error
- Verifiera att filePath är giltigt (ingen invalid characters)
- Se n8n execution logs för detaljer

### "Download returns 404"
- Kontrollera att path-parametern är korrekt URL-encoded
- Verifiera att fil faktiskt sparades (kolla "Save Form to Google Sheets")
- Test med enkelt curl-kommando ovan

### "Multipart upload fails"
- Verifiera att FormData har `files` key för bifogade filer
- Browser sätter automatiskt `Content-Type: multipart/form-data`
- Se n8n logs för parse-fel

---

## Nästa Steg

1. ✅ Importera flödet i n8n
2. ✅ Uppdatera Google Sheets IDs
3. ✅ Uppdatera Download URL i "Prepare Form Response"
4. ✅ Test med curl-kommandon
5. ✅ Integrera med React Frontend (använd env vars)
6. ✅ Deploy till Static Web App
