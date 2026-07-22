// Shapes returned by the TechStock backend (subset used by the frontend).

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface SalesAggregate {
  sales: string | number;
  profit: string | number;
  transactions: number;
}

export interface RecentSale {
  id: string;
  receiptNumber: string;
  total: string | number;
  status: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'REFUNDED';
  soldAt: string;
  customer: { id: string; name: string } | null;
  cashier: { id: string; username: string } | null;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku?: string;
  quantity?: number;
  revenue?: string | number;
}

// ── Point of Sale ────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  altText?: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  brand: string | null;
  sellingPrice: string | number;
  wholesalePrice: string | number;
  dealerPrice: string | number;
  taxRate: string | number;
  currentStock: number;
  isActive: boolean;
  category?: { id: string; name: string; slug?: string } | null;
  images?: ProductImage[];

  // Populated on the detail endpoint (GET /products/:id).
  description?: string | null;
  qrCode?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  buyingPrice?: string | number;
  minStock?: number;
  maxStock?: number;
  supplier?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  outstandingBalance: string | number;
  loyaltyPoints: number;
  createdAt?: string;
}

export interface CustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

/** A row from GET /customers/:id/purchase-history. */
export interface CustomerSale {
  id: string;
  receiptNumber: string;
  total: string | number;
  status: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'REFUNDED';
  soldAt: string;
  _count?: { items: number };
}

export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'DEALER';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MOBILE_MONEY'
  | 'BANK_TRANSFER'
  | 'CREDIT'
  | 'OTHER';

export interface CreateSalePayload {
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    priceTier?: PriceTier;
    discount?: number;
  }[];
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
  notes?: string;
  generateInvoice?: boolean;
}

export interface SaleResult {
  id: string;
  receiptNumber: string;
  invoiceNumber: string | null;
  status: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'REFUNDED';
  subtotal: string;
  taxTotal: string;
  discountTotal: string;
  total: string;
  amountPaid: string;
  changeDue: string;
  soldAt: string;
  customer: { id: string; name: string; phone?: string | null } | null;
  cashier: { id: string; username: string; firstName?: string; lastName?: string } | null;
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    lineTotal: string;
  }[];
  payments: { id: string; method: string; amount: string; reference: string | null }[];
}

// ── Suppliers & Purchase Orders ──────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  outstandingBalance?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPayload {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: string | number;
  taxRate: string | number;
  lineTotal: string | number;
  product?: { id: string; name: string; sku: string } | null;
}

/** Row shape returned by the list endpoint (GET /purchase-orders). */
export interface PurchaseOrderRow {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;
  amountPaid: string | number;
  notes: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  _count?: { items: number };
}

/** Full shape returned by the detail endpoint (GET /purchase-orders/:id). */
export interface PurchaseOrder extends PurchaseOrderRow {
  supplierId: string;
  items: PurchaseOrderItem[];
  createdBy?: { id: string; username: string } | null;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  items: { productId: string; quantity: number; unitCost: number; taxRate: number }[];
  notes?: string;
  expectedAt?: string;
  submit?: boolean;
}

export interface UpdatePurchaseOrderPayload {
  items?: { productId: string; quantity: number; unitCost: number; taxRate: number }[];
  notes?: string;
  expectedAt?: string;
}

export interface ReceivePurchaseOrderPayload {
  items: { itemId: string; receivedQuantity: number }[];
  amountPaid?: number;
  updateCostPrice?: boolean;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface ProfitReport {
  range: { from: string; to: string };
  revenue: string | number;
  tax: string | number;
  grossSales: string | number;
  costOfGoodsSold: string | number;
  grossProfit: string | number;
  expenses: string | number;
  netProfit: string | number;
  transactions: number;
}

export interface SalesSummaryPoint {
  bucket: string;
  count: number;
  revenue: string | number;
  profit: string | number;
}

export interface ReportProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue?: string | number;
  profit: string | number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  count: number;
  amount: string | number;
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  unitsSold: number;
  revenue: string | number;
  profit: string | number;
}

export interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  outstandingBalance: string | number;
}

export interface DebtorsReport {
  customers: Debtor[];
  suppliers: Debtor[];
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: string | number;
  incurredAt: string;
  createdAt?: string;
}

export interface ExpensePayload {
  category: string;
  description?: string;
  amount: number;
  incurredAt?: string;
}

// ── Inventory ────────────────────────────────────────────────────────────────

export interface StockValue {
  retailValue: string | number;
  costValue: string | number;
  totalUnits: number;
}

export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'RETURN'
  | 'DAMAGE'
  | 'ADJUSTMENT'
  | 'TRANSFER';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number; // signed: negative reduces stock
  stockBefore: number;
  stockAfter: number;
  unitCost: string | number | null;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string } | null;
}

export type AdjustmentReason =
  | 'STOCK_COUNT'
  | 'DAMAGE'
  | 'THEFT'
  | 'EXPIRY'
  | 'CORRECTION'
  | 'OTHER';

export interface InventoryAdjustment {
  id: string;
  reason: AdjustmentReason;
  reference: string;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  notes: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string } | null;
}

export interface DashboardData {
  today: SalesAggregate;
  month: SalesAggregate;
  inventory: {
    stockRetailValue: string | number;
    stockCostValue: string | number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  recentSales: RecentSale[];
  topProducts: TopProduct[];
}
