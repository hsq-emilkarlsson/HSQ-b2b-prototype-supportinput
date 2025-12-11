#!/bin/bash

# Azure Blob Storage Setup Script
# Skapar storage account och container för feedback-filuppladdning

set -e  # Exit on error

echo "🚀 Azure Blob Storage Setup för Husqvarna Feedback"
echo "=================================================="
echo ""

# Variabler
RESOURCE_GROUP="rg-hsq-feedback"
STORAGE_ACCOUNT="hsqfeedbackstorage"
CONTAINER_NAME="feedback-uploads"
LOCATION="westeurope"
STATIC_WEB_APP_URL="https://white-smoke-0ae37b610.5.azurestaticapps.net"

echo "📋 Konfiguration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo "  Container: $CONTAINER_NAME"
echo "  Location: $LOCATION"
echo ""

# Steg 1: Login check
echo "1️⃣ Kontrollerar Azure login..."
if ! az account show &> /dev/null; then
    echo "❌ Du är inte inloggad. Kör: az login"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Inloggad på subscription: $SUBSCRIPTION"
echo ""

# Steg 2: Skapa resource group (om den inte finns)
echo "2️⃣ Skapar resource group..."
if az group exists --name $RESOURCE_GROUP | grep -q "true"; then
    echo "✅ Resource group $RESOURCE_GROUP finns redan"
else
    az group create \
        --name $RESOURCE_GROUP \
        --location $LOCATION \
        --output none
    echo "✅ Resource group $RESOURCE_GROUP skapad"
fi
echo ""

# Steg 3: Skapa storage account
echo "3️⃣ Skapar storage account..."
if az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "✅ Storage account $STORAGE_ACCOUNT finns redan"
else
    az storage account create \
        --name $STORAGE_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku Standard_LRS \
        --kind StorageV2 \
        --allow-blob-public-access true \
        --output none
    echo "✅ Storage account $STORAGE_ACCOUNT skapad"
fi
echo ""

# Steg 4: Hämta storage account key
echo "4️⃣ Hämtar storage account key..."
STORAGE_KEY=$(az storage account keys list \
    --resource-group $RESOURCE_GROUP \
    --account-name $STORAGE_ACCOUNT \
    --query '[0].value' \
    --output tsv)

if [ -z "$STORAGE_KEY" ]; then
    echo "❌ Kunde inte hämta storage key"
    exit 1
fi
echo "✅ Storage key hämtad"
echo ""

# Steg 5: Skapa blob container
echo "5️⃣ Skapar blob container..."
if az storage container exists \
    --name $CONTAINER_NAME \
    --account-name $STORAGE_ACCOUNT \
    --account-key "$STORAGE_KEY" \
    --query exists -o tsv | grep -q "true"; then
    echo "✅ Container $CONTAINER_NAME finns redan"
else
    az storage container create \
        --name $CONTAINER_NAME \
        --account-name $STORAGE_ACCOUNT \
        --account-key "$STORAGE_KEY" \
        --public-access blob \
        --output none
    echo "✅ Container $CONTAINER_NAME skapad med public read access"
fi
echo ""

# Steg 6: Konfigurera CORS
echo "6️⃣ Konfigurerar CORS..."
az storage cors clear \
    --services b \
    --account-name $STORAGE_ACCOUNT \
    --account-key "$STORAGE_KEY" \
    --output none

az storage cors add \
    --services b \
    --methods GET PUT OPTIONS \
    --origins "$STATIC_WEB_APP_URL" "http://localhost:5173" \
    --allowed-headers "*" \
    --exposed-headers "*" \
    --max-age 3600 \
    --account-name $STORAGE_ACCOUNT \
    --account-key "$STORAGE_KEY" \
    --output none

echo "✅ CORS konfigurerat för Static Web App och localhost"
echo ""

# Steg 7: Testa uppladdning
echo "7️⃣ Testar uppladdning..."
TEST_CONTENT="Test från setup-skript $(date)"
TEST_FILE="test_$(date +%s).txt"

echo "$TEST_CONTENT" | az storage blob upload \
    --container-name $CONTAINER_NAME \
    --name $TEST_FILE \
    --account-name $STORAGE_ACCOUNT \
    --account-key "$STORAGE_KEY" \
    --type block \
    --overwrite \
    --output none

TEST_URL="https://$STORAGE_ACCOUNT.blob.core.windows.net/$CONTAINER_NAME/$TEST_FILE"
echo "✅ Test-fil uppladdad: $TEST_FILE"
echo ""

# Steg 8: Verifiera publikt läsaccess
echo "8️⃣ Verifierar publikt läsaccess..."
if curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" | grep -q "200"; then
    echo "✅ Publikt läsaccess fungerar!"
    echo "   Test-URL: $TEST_URL"
else
    echo "⚠️  Kunde inte läsa test-filen publikt (men det kan bero på timing)"
fi
echo ""

# Steg 9: Spara credentials
echo "9️⃣ Sparar credentials..."
cat > .env.azure.storage << EOF
# Azure Blob Storage Configuration
# Genererad: $(date)

AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT
AZURE_STORAGE_KEY=$STORAGE_KEY
AZURE_STORAGE_CONTAINER=$CONTAINER_NAME
AZURE_STORAGE_URL=https://$STORAGE_ACCOUNT.blob.core.windows.net

# För n8n environment variables:
# Lägg till dessa i n8n Cloud Settings → Environment
EOF

echo "✅ Credentials sparade i .env.azure.storage"
echo ""

# Sammanfattning
echo "🎉 Setup klar!"
echo "============================================"
echo ""
echo "📝 Nästa steg:"
echo ""
echo "1. Konfigurera n8n credentials:"
echo "   - Gå till n8n Cloud → Credentials → New"
echo "   - Välj 'Azure Blob Storage API'"
echo "   - Account Name: $STORAGE_ACCOUNT"
echo "   - Account Key: [se .env.azure.storage]"
echo ""
echo "2. Lägg till environment variables i n8n:"
echo "   - Gå till n8n Cloud → Settings → Environment"
echo "   - AZURE_STORAGE_ACCOUNT = $STORAGE_ACCOUNT"
echo ""
echo "3. Importera workflow:"
echo "   - Importera n8n/n8n_flow_azure_blob.json"
echo "   - Koppla Azure Blob Storage credential"
echo "   - Aktivera workflow"
echo ""
echo "4. Testa:"
echo "   - Ladda upp fil via React-appen"
echo "   - Kolla att filen dyker upp i Azure Portal"
echo "   - Verifiera att länken i Google Sheets fungerar"
echo ""
echo "📦 Storage Account Details:"
echo "   URL: https://$STORAGE_ACCOUNT.blob.core.windows.net"
echo "   Container: $CONTAINER_NAME"
echo "   Test-fil: $TEST_URL"
echo ""
echo "🔐 Credentials-fil: .env.azure.storage"
echo "⚠️  VIKTIGT: Lägg INTE till .env.azure.storage i git!"
echo ""
