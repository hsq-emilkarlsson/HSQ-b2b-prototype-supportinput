# Husqvarna B2B Feedback Prototype

A modern feedback collection system for Husqvarna's B2B customer portal, featuring an AI-powered conversational interface and traditional form submission with file upload support.

## ✨ Features

- **🤖 AI Chat Interface**: Natural language feedback collection with Azure OpenAI
- **🌍 Multi-language Support**: Swedish, Norwegian, English, Danish, Finnish, French, German
- **📎 File Upload**: Multiple file attachments via Databricks Files API
- **📊 Google Sheets Integration**: Automated data storage and organization
- **⚡ N8N Workflow**: Automated processing and intelligent routing

## 🚀 Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd hsq-b2b-prototyp-feedbackcollection
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Databricks credentials
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Open browser:** http://localhost:5173

📚 **Full setup guide:** [docs/QUICK_START.md](./docs/QUICK_START.md)

## 📁 Project Structure

```
/
├── src/                    # React application source
│   ├── FeedbackPage.tsx   # Main feedback interface
│   ├── App.tsx            # Application root
│   └── i18n/              # Translation files (7 languages)
├── n8n/                   # N8N workflow configuration
│   └── n8n_flow.json      # Production workflow (20 nodes)
├── api/                   # Azure Functions (upload proxy)
│   └── upload.js          # Databricks file upload endpoint
├── docs/                  # Documentation
│   ├── README.md          # Documentation index
│   ├── QUICK_START.md     # Setup guide
│   ├── deployment/        # Deployment guides
│   └── archive/           # Historical docs
└── public/                # Static assets
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + i18next
- **Backend**: N8N Cloud workflows + Azure Functions
- **Storage**: Google Sheets + Databricks Files API
- **AI**: Azure OpenAI (GPT-4.1)
- **Hosting**: Azure Static Web Apps

## 📖 Documentation

- [Quick Start Guide](./docs/QUICK_START.md) - Setup and development
- [Deployment Guide](./docs/deployment/DEPLOYMENT.md) - Azure deployment
- [N8N Setup](./docs/deployment/N8N_SETUP.md) - Workflow configuration

## 🚢 Deployment

✅ **Deployed to Azure Static Web Apps via GitHub Actions**

```bash
npm run build
# Automatically deployed via GitHub Actions on push to main
```

**Live URL:** https://witty-desert-04e4a0303.3.azurestaticapps.net/

**Deployment Method:** GitHub Actions → Azure Static Web Apps
**Build:** Vite (npm run build)
**Auto-deploy:** ✅ Enabled on every push to main

## 📝 License

Proprietary - Husqvarna Group
# HSQ-b2b-prototype-supportinput
