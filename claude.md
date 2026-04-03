Build a boutique Point-of-Sale (POS) system as a full-stack web application.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with Prisma ORM
- Styling: Tailwind CSS (clean, minimal — no complex animations or decorative styling)
- State: Zustand
- Real-time: Socket.io (for multi-terminal sync)

## Design philosophy
Clean and utilitarian. Think of it like a well-designed internal tool:
- White background, light gray surfaces, subtle borders
- System font stack (no custom fonts)
- Consistent 8px spacing scale
- No gradients, no shadows, no decorative elements
- Color used only for status (green = success, red = error/low stock, amber = warning)
- All interactive elements are obviously tappable (min 44px touch target)
- Works well on a tablet in portrait or landscape

## Core modules to build

### 1. Product catalog
- Default view: searchable, filterable list (not a grid)
  - Each row: category icon + color swatch | product name | variant chips (S, M, L) | stock count | price
  - Tap a row to open a variant picker drawer, then add to cart
- Category filter tabs across the top (All, Tops, Bottoms, Accessories, Footwear)
- Live search filters the list instantly
- Low-stock badge (amber) when quantity ≤ 3, out-of-stock grayed out
- Barcode/QR scan via device camera or USB scanner — scanned item goes straight to cart
- Photos are optional — display a colored icon tile per category if no image is uploaded
- Toggle between list view and grid view saved in localStorage

### 2. Cart & checkout
- Persistent right panel on tablet landscape, bottom drawer on portrait/mobile
- Cart rows: item name + variant | quantity stepper | line total | remove
- Payment methods: Cash, Card, MTN MoMo, Telecel Cash
- Split payment: allow two methods (e.g. GHS 100 cash + remainder on MoMo)
- Discount field: fixed amount or percentage, manager PIN required
- Receipt: print-ready view + WhatsApp share link (wa.me with pre-filled text)
- Keyboard shortcut: / to focus search, Escape to clear cart focus

### 3. Customer profiles
- Optional customer lookup at start of sale (search by name or phone)
- If matched: show name, visit count, last visit date, preferred sizes, style notes
- "Walk-in" default if no customer selected
- Purchase history visible on customer profile screen
- Visit count displayed on cart header for returning customers

### 4. Smart upsell suggestions
- When items are added to cart, show 1–2 subtle suggestions below the cart
- Logic: category pairings (e.g. top → suggest bottoms), frequently bought together
- Dismissible, non-intrusive — just a small text suggestion with a quick-add button

### 5. Inventory management (manager view)
- Product list with inline edit for price and stock quantity
- Add new product: name, category, variants (size + color + qty each), price, optional photo
- Markdown scheduler: set a future date + discount % per product, auto-applies at that date
- Restock alerts: configurable low-stock threshold per product
- Bulk CSV import for initial stock setup

### 6. End-of-day dashboard
- Total sales, transaction count, average transaction value
- Top 5 products by revenue and by units sold
- Payment method breakdown (cash vs card vs mobile money)
- Plain-English summary: "Your best seller today was the Linen Blazer (6 units). 
  Stock is low — 2 remaining."
- Export to CSV

### 7. Offline support
- Service worker caches product catalog and enables cart building offline
- Transactions queued locally (IndexedDB) when offline
- Auto-syncs to server on reconnect with visual indicator ("3 sales pending sync")

## Database schema

### Tables to create in Prisma:

**products**
id, name, category_id, description, image_url (nullable), base_price, 
barcode (nullable), is_active, created_at

**variants**
id, product_id, size, color, color_hex, quantity, sku, low_stock_threshold

**categories**
id, name, icon (emoji or lucide icon name), color_hex

**customers**
id, name, phone (unique), email (nullable), preferred_sizes (json), 
style_notes, created_at

**customer_visits**
id, customer_id, visited_at, transaction_id

**transactions**
id, customer_id (nullable), staff_id, subtotal, discount_amount, 
total, status (completed|voided|pending_sync), payment_method, 
payment_split (json, nullable), receipt_number, created_at

**transaction_items**
id, transaction_id, variant_id, quantity, unit_price, line_total

**discounts**
id, code, type (percentage|fixed), value, expires_at, is_active

**markdowns**
id, product_id, discount_percentage, starts_at, ends_at, is_active

**staff**
id, name, pin (hashed), role (cashier|manager), is_active

## API design
- RESTful under /api/v1/
- JWT auth (access token + refresh token)
- Role-based: cashier can sell and look up customers; 
  manager can also void, discount, manage inventory, view dashboard
- Key endpoints:
  GET    /products?search=&category=&page=&limit=
  GET    /products/:id
  POST   /products
  PUT    /products/:id
  GET    /customers?search=
  POST   /customers
  GET    /customers/:id/history
  POST   /transactions
  PUT    /transactions/:id/void
  GET    /transactions/summary?date=
  POST   /auth/login
  POST   /auth/refresh

## Project structure
/client
  /src
    /components   → reusable UI (Button, Badge, Drawer, Input, etc.)
    /pages        → Sell, Inventory, Customers, Dashboard, Login
    /stores       → Zustand stores (cart, auth, ui)
    /hooks        → useScanner, useOfflineQueue, useCustomer
    /lib          → api client, receipt generator, barcode utils
/server
  /src
    /routes
    /controllers
    /middleware   → auth, role guard
    /services     → transaction, inventory, receipt, sync
/prisma
  schema.prisma
  /migrations
  /seed           → Ghanaian boutique seed data
/shared
  /types          → Product, Variant, Transaction, Customer, etc.

## Seed data
Use realistic Ghanaian boutique data:
- Categories: Tops, Bottoms, Dresses, Accessories, Footwear
- 20 sample products with Ghanaian-relevant names and GHS pricing
- 5 sample customers with Ghanaian names
- 2 staff members: one cashier, one manager
- Currency: GHS, formatted as GHS 1,200.00 throughout

## Build order
1. Scaffold monorepo — install all dependencies, configure TypeScript, 
   Tailwind, Prisma, ESLint
2. Prisma schema — write all tables, run initial migration, run seed
3. Auth — login endpoint, JWT middleware, role guard, login page
4. Products API — GET