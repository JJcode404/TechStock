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
  outstandingBalance: string | number;
  loyaltyPoints: number;
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
