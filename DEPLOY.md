# Deploy to Azure (15–20 minutes)

Stack: **Azure PostgreSQL Flexible Server** → **Azure App Service** (API) → **Azure Static Web Apps** (frontend)

Prerequisite: [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in (`az login`).

---

## Step 1 — Database: Azure PostgreSQL Flexible Server

Either create one in the portal or via CLI:

```bash
az postgres flexible-server create \
  --resource-group <your-rg> \
  --name wov-db \
  --admin-user wov_admin \
  --admin-password <STRONG_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --database-name world_of_vintage \
  --public-access 0.0.0.0   # open to Azure services; tighten later
```

Your `DATABASE_URL` will be:
```
postgresql://wov_admin:<STRONG_PASSWORD>@wov-db.postgres.database.azure.com:5432/world_of_vintage?sslmode=require
```

---

## Step 2 — Backend: Azure App Service

### 2a. Create the App Service

```bash
# Create a resource group if you don't have one
az group create --name wov-rg --location westeurope

# Create App Service plan (B1 = ~$13/mo; use F1 for a free demo)
az appservice plan create \
  --name wov-plan \
  --resource-group wov-rg \
  --sku B1 \
  --is-linux

# Create the web app (Node 20)
az webapp create \
  --name wov-api \
  --resource-group wov-rg \
  --plan wov-plan \
  --runtime "NODE:20-lts"
```

### 2b. Set environment variables

```bash
az webapp config appsettings set \
  --name wov-api \
  --resource-group wov-rg \
  --settings \
    DATABASE_URL="postgresql://wov_admin:<PASSWORD>@wov-db.postgres.database.azure.com:5432/world_of_vintage?sslmode=require" \
    JWT_SECRET="<long-random-string>" \
    JWT_REFRESH_SECRET="<another-long-random-string>" \
    NODE_ENV="production" \
    CLIENT_URL="https://<your-static-web-app>.azurestaticapps.net"
```

> Generate secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2c. Set the startup command

```bash
az webapp config set \
  --name wov-api \
  --resource-group wov-rg \
  --startup-file "node server/dist/index.js"
```

### 2d. Deploy from this folder

```bash
az webapp up \
  --name wov-api \
  --resource-group wov-rg \
  --runtime "NODE:20-lts"
```

This zips and deploys the repo. The `.deployment` file tells App Service to build automatically.

### 2e. Run database migration + seed

```bash
# SSH into the app service console
az webapp ssh --name wov-api --resource-group wov-rg
# Then inside the shell:
npx prisma migrate deploy
npx tsx prisma/seed/index.ts
exit
```

Note your API URL: `https://wov-api.azurewebsites.net`

---

## Step 3 — Frontend: Azure Static Web Apps (free)

### 3a. Create the Static Web App

```bash
az staticwebapp create \
  --name wov-frontend \
  --resource-group wov-rg \
  --location "westeurope" \
  --source https://github.com/<your-org>/<your-repo> \
  --branch main \
  --app-location "client" \
  --output-location "dist" \
  --login-with-github
```

This sets up a GitHub Actions workflow automatically.

### 3b. Set the API URL environment variable

In the Azure portal → your Static Web App → **Configuration** → add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://wov-api.azurewebsites.net` |

Or via CLI:
```bash
az staticwebapp appsettings set \
  --name wov-frontend \
  --resource-group wov-rg \
  --setting-names VITE_API_URL="https://wov-api.azurewebsites.net"
```

Push to `main` — GitHub Actions will build and deploy automatically.

---

## Step 4 — Update CORS on the API

Once you have the Static Web App URL (e.g. `https://wov-frontend.azurestaticapps.net`):

```bash
az webapp config appsettings set \
  --name wov-api \
  --resource-group wov-rg \
  --settings CLIENT_URL="https://wov-frontend.azurestaticapps.net"
```

App Service restarts automatically.

---

## Done!

- Frontend: `https://wov-frontend.azurestaticapps.net`
- API: `https://wov-api.azurewebsites.net/health`

**Default logins (after seed):**
| Name | Role | PIN |
|------|------|-----|
| Abena Agyemang | Manager | `1234` |
| Kweku Darko | Cashier | `5678` |
