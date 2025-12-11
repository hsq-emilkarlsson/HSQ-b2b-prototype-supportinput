# Husqvarna B2B Feedback Prototype - Documentation

## Quick Links

- [Quick Start Guide](./QUICK_START.md) - Start here for setup instructions
- [Deployment Guide](./deployment/DEPLOYMENT.md) - How to deploy to Azure
- [N8N Setup](./deployment/N8N_SETUP.md) - Configure the N8N workflow

## Project Structure

```
/
├── src/              # React frontend source
├── n8n/              # N8N workflow configuration
├── api/              # Azure Functions API (file upload proxy)
├── docs/             # All documentation
└── public/           # Static assets
```

## Key Features

- **Multi-language feedback form** (SV, NO, EN, DA, FI, FR, DE)
- **AI-powered chat** for collecting detailed feedback
- **File uploads** with multiple file support (via Databricks)
- **Google Sheets integration** for data storage
- **Azure Static Web Apps** deployment ready

## Development

```bash
npm install
npm run dev
```

## Deployment

See [Deployment Guide](./deployment/DEPLOYMENT.md) for complete instructions.
