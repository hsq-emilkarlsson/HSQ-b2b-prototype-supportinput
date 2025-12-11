# 🚀 Snabbguide - Private Endpoint Test & Åtkomst

## 📍 Private Endpoint-information

```
Namn:        pe-hsq-feedback-appservice
IP-adress:   10.0.1.4
VNet:        vnet-hsq-feedback-prod (10.0.0.0/22)
Subnet:      subnet-hsq-feedback (10.0.1.0/24)
App Service: app-hsq-feedback-prod-da47jmgaub6dg
Status:      ✅ Operational
```

## 🔌 Åtkomst - Tre Alternativ

### **Alternativ 1: Jump Host VM (Snabbaste)**

```bash
# 1. Skapa VM i VNet
az vm create \
  --resource-group rg-hsq-feedback-test \
  --name app-jump-host \
  --vnet-name vnet-hsq-feedback-prod \
  --subnet subnet-hsq-feedback \
  --image UbuntuLTS \
  --admin-username azureuser \
  --public-ip-address app-jump-pip \
  --generate-ssh-keys

# 2. SSH till VM:n
ssh -i ~/.ssh/id_rsa azureuser@<PUBLIC_IP_OF_VM>

# 3. Från VM - testa Private Endpoint
curl -k https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net/api/health

# 4. Skicka request till feedback API
curl -X POST https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "language": "sv",
    "feedback": "Test feedback",
    "email": "test@example.com"
  }'
```

### **Alternativ 2: Azure Bastion (Säkrast)**

```bash
# 1. Skapa Azure Bastion
az network bastion create \
  --resource-group rg-hsq-feedback-test \
  --name bastion-feedback \
  --vnet-name vnet-hsq-feedback-prod \
  --public-ip-address bastion-pip

# 2. Via Azure Portal:
# - Go to rg-hsq-feedback-test
# - Find app-jump-host VM
# - Click "Connect" → "Bastion"
# - Open terminal
# - Run curl commands from VM terminal

curl -k https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net/api/health
```

### **Alternativ 3: ExpressRoute/VPN (Produktion)**

Om din organisation redan har ExpressRoute till Azure:
```
Your Corporate Network
    ↓ (VPN/ExpressRoute)
Azure Virtual Network (10.0.0.0/22)
    ↓
Private Endpoint (10.0.1.4)
    ↓
App Service (No public IP)
```

## 📋 Checklista - Åtkomst Setup

- [ ] **Jump Host VM skapad** (eller annan åtkomstmetod)
- [ ] **SSH/RDP-åtkomst verifierad** till VM
- [ ] **curl-kommando testats** från VM
- [ ] **API-hälsocheck** returnerar HTTP 200
- [ ] **Databricks-token uppdaterad** i Key Vault (från placeholder)

## 🧪 Test-kommandot

Från en VM i VNet, kör:

```bash
# Test 1: Health Check
curl -k -v https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net/api/health

# Förväntat svar:
# HTTP/1.1 200 OK
# {"status":"healthy"}

# Test 2: Skicka feedback
curl -X POST https://app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "language": "sv",
    "feedback": "Test från Private Endpoint",
    "email": "test@husqvarna.com"
  }'
```

## 🔒 Säkerhetsstatus

| Kontroll | Status | Detalj |
|----------|--------|--------|
| Public Network Access | ❌ Disabled | App Service är INTE på internet |
| Private Endpoint | ✅ Active | Ansluten via 10.0.1.4 |
| VNet Address Space | ✅ /22 | Policy-kompatibel |
| Key Vault | ✅ Private | Endast åtkomst via Private Endpoint |
| Managed Identity | ✅ Active | System-assigned för Key Vault |

## 📊 Nätverksarkitektur

```
┌─────────────────────────────────────┐
│  Virtual Network: 10.0.0.0/22       │
├─────────────────────────────────────┤
│  Subnet: 10.0.1.0/24                │
│  ├─ Jump Host VM: 10.0.1.5          │ ← Du ansluter här
│  ├─ Private Endpoint: 10.0.1.4      │ ← Private Endpoint IP
│  └─ App Service (bakom PE)          │ ← Din app
│                                     │
│  DNS Mapping:                       │
│  app-hsq...azurewebsites.net → 10. │
│  0.1.4                              │
└─────────────────────────────────────┘
         ↑
    Endast åtkomst
    från VNet eller
    via Bastion/VPN
```

## ⚠️ Vanliga Problem & Lösningar

### Problem: "Connection refused" från Jump Host

```bash
# Lösning: Verifiera att Private Endpoint är aktiv
az network private-endpoint show \
  --resource-group rg-hsq-feedback-test \
  --name pe-hsq-feedback-appservice \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status"
```

### Problem: DNS-fel från VM

```bash
# Lösning: Använd IP-adress direkt (temporal)
curl -k https://10.0.1.4/api/health -H "Host: app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net"

# Eller lägg till i /etc/hosts:
echo "10.0.1.4 app-hsq-feedback-prod-da47jmgaub6dg.azurewebsites.net" | sudo tee -a /etc/hosts
```

### Problem: Databricks-anslutning misslyckas

```bash
# Lösning: Uppdatera Key Vault-token
az keyvault secret set \
  --vault-name kvda47jmgaub6dg \
  --name databricks-token \
  --value "dapi_YOUR_REAL_TOKEN"
```

## 📞 Nästa Steg

1. ✅ **Verifiera Private Endpoint status** (se ovan)
2. ⏳ **Skapa Jump Host VM** eller Bastion
3. ⏳ **Uppdatera Databricks-token** i Key Vault
4. ⏳ **Testa app-åtkomst** från VM
5. ⏳ **Konfigurera CI/CD** för privat deployment

---

**Aktuell Status:** 
- ✅ Private Endpoint: Operational
- ✅ VNet: Konfigurerad & Policy-kompatibel
- ✅ App Service: Körande (privat endast)
- ⏳ Datakällor: Behöver verifiera från VNet

**Nästa:** Skapa Jump Host för att verifiera full-stack-funktion
