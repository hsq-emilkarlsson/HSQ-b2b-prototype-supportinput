# 🔄 Uppdaterad Filhantering

## Översikt
React-koden har uppdaterats för att skicka filer i **base64-format** till n8n, vilket matchar den förbättrade n8n workflow-koden.

## Vad Ändrades

### React (FeedbackPage.tsx)
**Tidigare:**
- Skickade `FormData` med multipart/form-data
- Använde `useN8nSubmit` hook
- Filer skickades som binary blobs

**Nu:**
- Skickar JSON med base64-kodade filer
- Direct fetch utan custom hook
- Filer konverteras till base64 innan submit

### Ny Implementation
```typescript
// Convert file to base64
const reader = new FileReader();
fileContentBase64 = await new Promise<string>((resolve) => {
  reader.onload = () => {
    const result = reader.result as string;
    const base64 = result.split(',')[1]; // Remove data:*/*;base64, prefix
    resolve(base64);
  };
  reader.readAsDataURL(file);
});

// Send as JSON
const payload = {
  email,
  message: feedbackText,
  sessionId,
  language: selectedLanguage,
  fileContentBase64,   // Base64 string
  fileName,            // Original filename
  fileMimeType        // MIME type
};

fetch(n8nFormWebhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

### N8N Parse Form Node
Förväntar sig nu exakt denna struktur:
```javascript
{
  email: string,
  message: string,
  sessionId: string,
  language: string,
  fileContentBase64?: string,  // Optional base64 content
  fileName?: string,            // Original filename
  fileMimeType?: string         // e.g., "image/png"
}
```

Parse Form-noden skapar sedan `binary.fileData` object för Write File node.

## Fördelar

✅ **Enklare arkitektur** - Ingen FormData parsing i n8n  
✅ **Bättre error handling** - JSON errors är lättare att debugga  
✅ **Konsekvent format** - Samma JSON-struktur som chat endpoint  
✅ **Mindre komplexitet** - Ingen custom hook behövs  
✅ **Standardiserad** - Matchar suggested improvements från expert

## Begränsningar

⚠️ **Endast en fil** - Första filen i `attachedFiles` array används  
⚠️ **Base64 overhead** - ~33% större payload (men OK för max 10MB filer)  
⚠️ **Browser memory** - FileReader läser hela filen i minnet

## Nästa Steg

1. **Importera uppdaterad n8n_flow.json** till n8n Cloud
2. **Testa file upload** via frontend
3. **Verifiera** att filen sparas korrekt i `feedback_uploads/`
4. **Kontrollera** att download-länk fungerar i Google Sheets
5. **Deploy** uppdaterad frontend till Static Web App

## Testning

### Manuell test
```bash
# 1. Start local dev server
npm run dev

# 2. Öppna http://localhost:5173
# 3. Fyll i formulär + bifoga en fil
# 4. Submit och verifiera i n8n execution logs
```

### Förväntat flöde
```
React Frontend
  ↓ (FileReader converts to base64)
  ↓ POST JSON
N8N Webhook Form
  ↓ (Parse Form extracts base64)
  ↓ Creates binary.fileData
Write File Node
  ↓ Saves to feedback_uploads/
  ↓ Returns path
Google Sheets
  ↓ Stores download URL
User clicks link
  ↓ GET /webhook/download-file?path=...
Download Endpoint
  ↓ Read File → Respond Download
```

## Backup

Om något går fel, gamla filer finns kvar:
- `src/hooks/useN8nSubmit.ts` (oanvänd men kvar)
- `src/hooks/useDatabricksUpload.tsx` (legacy, kan tas bort)
- `server.js` (backend proxy, används ej längre)

## Status

✅ React uppdaterad  
✅ Build fungerande  
✅ N8N workflow uppdaterad  
⏳ Import till n8n Cloud (pending)  
⏳ End-to-end test (pending)  
⏳ Deploy till Azure (pending)
