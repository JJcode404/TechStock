# TechStock API Reference (v1)

Base URL: `http://<host>:<port>/api/v1`

## Conventions

- **Auth**: send `Authorization: Bearer <accessToken>` on protected routes.
- **Headers**: `X-Device-Id` (offline attribution), `X-Request-Id` (tracing,
  echoed back on the response).
- **Response envelope**:
  ```jsonc
  { "success": true,  "message": "…", "data": {…}, "meta": {…} }   // success
  { "success": false, "message": "…", "errors": [{ "field": "…", "message": "…" }] } // error
  ```
- **Pagination** (list endpoints): `?page=1&pageSize=25&sortBy=name&sortOrder=asc&search=foo`.
  Paginated responses include `meta: { page, pageSize, total, totalPages, hasNext, hasPrev }`.
- **Status codes**: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized,
  `403` Forbidden, `404` Not Found, `409` Conflict, `422` Validation, `429` Rate limited, `500` Server error.

## Roles & permissions

| Role    | Summary                                                        |
| ------- | ------------------------------------------------------------- |
| ADMIN   | Full access (bypasses permission checks).                     |
| MANAGER | Catalog, inventory, sales, purchases, customers, reports.     |
| CASHIER | Read products, create sales & returns, manage customers.      |

---

## Auth — `/auth`

| Method | Path               | Auth  | Description                              |
| ------ | ------------------ | ----- | --------------------------------------- |
| POST   | `/register`        | none¹ | Create a user (defaults to CASHIER).    |
| POST   | `/login`           | none  | Log in with email/username + password.  |
| POST   | `/refresh`         | none  | Rotate tokens using a refresh token.    |
| POST   | `/logout`          | user  | Revoke current (or all) refresh tokens. |
| GET    | `/me`              | user  | Current user profile + permissions.     |
| POST   | `/change-password` | user  | Change password (revokes all sessions). |

¹ In production, restrict `/register` to Admins (or disable) — provision users via a protected admin route.

**POST /login**
```jsonc
// request
{ "identifier": "admin", "password": "Admin@12345" }
// response.data
{ "user": { "id", "email", "role", "permissions": [...] },
  "tokens": { "accessToken", "refreshToken", "tokenType": "Bearer", "expiresIn": 900 } }
```

**POST /refresh** — `{ "refreshToken": "…" }` → new `{ tokens }`. The old token is
revoked; presenting it again triggers reuse detection and revokes the session family.

---

## Categories — `/categories`

| Method | Path    | Permission        | Description                    |
| ------ | ------- | ----------------- | ------------------------------ |
| GET    | `/`     | `product:read`    | List (supports `parentId`).    |
| POST   | `/`     | `product:create`  | Create (auto-slug).            |
| GET    | `/:id`  | `product:read`    | Get one.                       |
| PATCH  | `/:id`  | `product:update`  | Update.                        |
| DELETE | `/:id`  | `product:delete`  | Soft delete (blocked if products attached). |

---

## Suppliers — `/suppliers`

| Method | Path                       | Permission        | Description                |
| ------ | -------------------------- | ----------------- | -------------------------- |
| GET    | `/`                        | `supplier:manage` | List / search.             |
| POST   | `/`                        | `supplier:manage` | Create.                    |
| GET    | `/:id`                     | `supplier:manage` | Get one.                   |
| GET    | `/:id/purchase-history`    | `supplier:manage` | Purchase orders (paged).   |
| GET    | `/:id/outstanding-balance` | `supplier:manage` | Balance owed to supplier.  |
| PATCH  | `/:id`                     | `supplier:manage` | Update.                    |
| DELETE | `/:id`                     | `supplier:manage` | Soft delete.               |

---

## Products — `/products`

| Method | Path                     | Permission       | Description                                   |
| ------ | ------------------------ | ---------------- | --------------------------------------------- |
| GET    | `/`                      | `product:read`   | List. Filters: `categoryId`, `supplierId`, `brand`, `lowStock`, `outOfStock`, `isActive`, `search`. |
| GET    | `/low-stock`             | `inventory:read` | Products at/below `minStock`.                 |
| GET    | `/out-of-stock`          | `inventory:read` | Products with `currentStock ≤ 0`.             |
| GET    | `/barcode/:barcode`      | `product:read`   | Lookup by barcode (POS scan).                 |
| POST   | `/`                      | `product:create` | Create. Auto-SKU if omitted; `generateBarcode:true` mints an EAN-13. |
| GET    | `/:id`                   | `product:read`   | Get one (with category, supplier, images).    |
| PATCH  | `/:id`                   | `product:update` | Update (stock is NOT editable here).          |
| DELETE | `/:id`                   | `product:delete` | Soft delete.                                  |
| POST   | `/:id/images`            | `product:update` | Upload image (`multipart/form-data`, field `image`). |
| DELETE | `/:id/images/:imageId`   | `product:update` | Remove an image.                              |

**POST /products** (key fields)
```jsonc
{ "name": "Dell XPS 15", "sellingPrice": 250000, "buyingPrice": 200000,
  "wholesalePrice": 240000, "dealerPrice": 235000, "taxRate": 16,
  "currentStock": 10, "minStock": 3, "maxStock": 50,
  "categoryId": "<uuid>", "supplierId": "<uuid>",
  "brand": "Dell", "location": "Shelf A1", "generateBarcode": true }
```

---

## Inventory — `/inventory`

| Method | Path            | Permission          | Description                                  |
| ------ | --------------- | ------------------- | -------------------------------------------- |
| GET    | `/movements`    | `inventory:read`    | Stock movement ledger. Filters: `productId`, `type`, `from`, `to`. |
| GET    | `/adjustments`  | `inventory:read`    | Adjustment history.                          |
| POST   | `/adjustments`  | `inventory:adjust`  | Set a product's absolute stock; records a movement + adjustment. |
| GET    | `/stock-value`  | `inventory:read`    | Retail & cost valuation, total units.        |

**POST /inventory/adjustments**
```jsonc
{ "productId": "<uuid>", "newQuantity": 25, "reason": "STOCK_COUNT", "notes": "Q3 count" }
```
Movement types: `SALE`, `PURCHASE`, `RETURN`, `DAMAGE`, `ADJUSTMENT`, `TRANSFER`.

---

## Sales / POS — `/sales`

| Method | Path            | Permission     | Description                          |
| ------ | --------------- | -------------- | ------------------------------------ |
| GET    | `/`             | `sale:read`    | Sales history. Filters: `customerId`, `cashierId`, `status`, `from`, `to`. |
| POST   | `/`             | `sale:create`  | Create a sale (deducts stock).       |
| GET    | `/:id`          | `sale:read`    | Get a sale.                          |
| GET    | `/:id/receipt`  | `sale:read`    | Formatted receipt payload.           |
| POST   | `/:id/cancel`   | `sale:cancel`  | Cancel (restocks, reverses balances).|
| POST   | `/:id/return`   | `sale:return`  | Full/partial return.                 |

**POST /sales**
```jsonc
{ "customerId": "<uuid?>",
  "items": [ { "productId": "<uuid>", "quantity": 2,
               "priceTier": "RETAIL", "unitPrice": 250000, "discount": 0 } ],
  "payments": [ { "method": "CASH", "amount": 600000, "reference": "…" } ],
  "generateInvoice": false, "notes": "…" }
```
Line math: `net = unitPrice·qty − discount`, `tax = net·taxRate%`, `lineTotal = net + tax`.
`paymentStatus` is derived (`PAID` / `PARTIAL` / `UNPAID`); credit/partial sales require a customer.

**POST /sales/:id/return**
```jsonc
{ "items": [ { "saleItemId": "<uuid>", "quantity": 1 } ], "restock": true, "reason": "Defective" }
```

---

## Purchases — `/purchase-orders`

| Method | Path           | Permission          | Description                                  |
| ------ | -------------- | ------------------- | -------------------------------------------- |
| GET    | `/`            | `purchase:read`     | List. Filters: `supplierId`, `status`.       |
| POST   | `/`            | `purchase:create`   | Create PO (`submit:true` → ORDERED, else DRAFT). |
| GET    | `/:id`         | `purchase:read`     | Get PO (with items).                         |
| PATCH  | `/:id`         | `purchase:update`   | Edit (DRAFT only).                           |
| POST   | `/:id/receive` | `purchase:receive`  | Receive items → increases stock, updates supplier balance. |
| POST   | `/:id/cancel`  | `purchase:update`   | Cancel (not if received).                    |

**POST /purchase-orders**
```jsonc
{ "supplierId": "<uuid>", "submit": true,
  "items": [ { "productId": "<uuid>", "quantity": 10, "unitCost": 190000, "taxRate": 16 } ],
  "expectedAt": "2026-08-01T00:00:00Z", "notes": "…" }
```
**POST /:id/receive** — `{ "items": [ { "itemId": "<uuid>", "receivedQuantity": 10 } ], "amountPaid": 1000000, "updateCostPrice": true }`

---

## Customers — `/customers`

| Method | Path                       | Permission        | Description               |
| ------ | -------------------------- | ----------------- | ------------------------- |
| GET    | `/`                        | `customer:manage` | List (`hasBalance` filter).|
| POST   | `/`                        | `customer:manage` | Create.                   |
| GET    | `/:id`                     | `customer:manage` | Get one.                  |
| GET    | `/:id/purchase-history`    | `customer:manage` | Sales history (paged).    |
| GET    | `/:id/outstanding-balance` | `customer:manage` | Credit balance.           |
| POST   | `/:id/loyalty`             | `customer:manage` | Adjust points (`+/-`).    |
| PATCH  | `/:id`                     | `customer:manage` | Update.                   |
| DELETE | `/:id`                     | `customer:manage` | Soft delete (blocked if balance > 0). |

---

## Expenses — `/expenses`

| Method | Path   | Permission    | Description             |
| ------ | ------ | ------------- | ----------------------- |
| GET    | `/`    | `report:view` | List (filters: `category`, `from`, `to`). |
| POST   | `/`    | `report:view` | Record an expense.      |
| GET    | `/:id` | `report:view` | Get one.                |
| PATCH  | `/:id` | `report:view` | Update.                 |
| DELETE | `/:id` | `report:view` | Soft delete.            |

---

## Reports — `/reports` (all require `report:view`)

| Method | Path                        | Description                                   |
| ------ | --------------------------- | --------------------------------------------- |
| GET    | `/dashboard`                | Today/month sales & profit, stock, low-stock, recent, top products. |
| GET    | `/sales/today`              | Today's sales aggregate.                      |
| GET    | `/sales/monthly`            | This month's aggregate.                       |
| GET    | `/sales/recent?limit=`      | Recent sales.                                 |
| GET    | `/sales/summary`            | Time-series (`groupBy=day|week|month`, `from`, `to`). |
| GET    | `/products/top`             | Top sellers (`by=quantity|revenue`, `limit`, range). |
| GET    | `/products/most-profitable` | Highest gross-profit products.                |
| GET    | `/profit`                   | Profit report (revenue, COGS, expenses, net). |

---

## Sync & Backup — `/sync`

| Method | Path       | Auth                 | Description                              |
| ------ | ---------- | -------------------- | --------------------------------------- |
| GET    | `/pull`    | user                 | Changes since `?since=<ISO>` for `?entities=`. |
| POST   | `/push`    | user                 | Push master-data changes (LWW).         |
| POST   | `/backup`  | ADMIN + `backup:run` | Create a `pg_dump` backup.              |
| GET    | `/backup`  | ADMIN + `backup:run` | List existing backups.                  |

**POST /sync/push**
```jsonc
{ "deviceId": "pos-01",
  "changes": [ { "entity": "products", "id": "<uuid>", "updatedAt": "<ISO>",
                 "isDeleted": false, "data": { "name": "New name", "sellingPrice": 123 } } ] }
// response.data: { applied: [...], conflicts: [...], rejected: [...] }
```

---

## Health — `/health`

| Method | Path       | Description                        |
| ------ | ---------- | --------------------------------- |
| GET    | `/live`    | Liveness (no dependencies).       |
| GET    | `/ready`   | Readiness (checks DB); `503` if down. |
| GET    | `/metrics` | Process + business metrics.       |
