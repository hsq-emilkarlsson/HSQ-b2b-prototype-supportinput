#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Azure Static Web App Setup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Configuration
RESOURCE_GROUP="hsq-b2b-support"
APP_NAME="hsq-b2b-support-app"
LOCATION="swedencentral"
GITHUB_REPO="" # Will be prompted

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${YELLOW}Azure CLI not found. Installing...${NC}"
    curl -sL https://aka.ms/InstallAzureCLIDeb | bash
fi

# Login to Azure
echo -e "\n${YELLOW}Step 1: Login to Azure${NC}"
az login

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}✓ Logged in. Subscription: $SUBSCRIPTION_ID${NC}"

# Create resource group
echo -e "\n${YELLOW}Step 2: Creating resource group${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION
echo -e "${GREEN}✓ Resource group created${NC}"

# Prompt for GitHub repository
echo -e "\n${YELLOW}Step 3: GitHub Repository${NC}"
read -p "Enter your GitHub username/organization: " GITHUB_USER
read -p "Enter your repository name (default: HSQ-b2b-prototype-supportinput): " GITHUB_REPO_NAME
GITHUB_REPO_NAME=${GITHUB_REPO_NAME:-HSQ-b2b-prototype-supportinput}
GITHUB_REPO="https://github.com/${GITHUB_USER}/${GITHUB_REPO_NAME}"

echo "GitHub Repository: $GITHUB_REPO"

# Create Static Web App
echo -e "\n${YELLOW}Step 4: Creating Azure Static Web App${NC}"
az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --source $GITHUB_REPO \
  --branch main \
  --location $LOCATION \
  --build-properties appLocation="/" apiLocation="api" outputLocation="dist" \
  --standard-sku

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Static Web App created successfully${NC}"
else
    echo -e "${YELLOW}Note: Static Web App may already exist or creation failed${NC}"
fi

# Get API Token
echo -e "\n${YELLOW}Step 5: Retrieving API Token${NC}"
API_TOKEN=$(az staticwebapp secrets list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiToken" -o tsv)

if [ -z "$API_TOKEN" ]; then
    echo -e "${YELLOW}Could not retrieve API token automatically.${NC}"
    echo -e "${YELLOW}Please go to Azure Portal and copy the API token manually.${NC}"
    echo -e "Static Web App: $APP_NAME"
else
    echo -e "${GREEN}✓ API Token retrieved${NC}"
fi

# Get the default domain
echo -e "\n${YELLOW}Step 6: Getting Static Web App URL${NC}"
APP_URL=$(az staticwebapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "defaultHostname" -o tsv)

echo -e "${GREEN}✓ App URL: https://${APP_URL}${NC}"

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Go to GitHub Repository Settings → Secrets and variables → Actions"
echo -e "2. Add these secrets:"
echo -e "   - AZURE_STATIC_WEB_APPS_API_TOKEN: $API_TOKEN"
echo -e "   - VITE_N8N_FORM_WEBHOOK_URL: https://husqvarna-prod.app.n8n.cloud/webhook/support-form/v1"
echo -e "   - VITE_N8N_CHAT_WEBHOOK_URL: https://husqvarna-prod.app.n8n.cloud/webhook/supportchat/prototype"
echo -e "\n3. Push to GitHub main branch to trigger automatic deployment"
echo -e "\n4. View deployment progress at:"
echo -e "   GitHub Actions: https://github.com/${GITHUB_USER}/${GITHUB_REPO_NAME}/actions"
echo -e "   Azure Portal: https://portal.azure.com/#@/resource/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/staticSites/${APP_NAME}"
echo -e "\n5. Your app will be available at: https://${APP_URL}"
