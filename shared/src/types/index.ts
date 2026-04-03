// ─── Enums ────────────────────────────────────────────────────────────────────

export type StaffRole = 'cashier' | 'manager'
export type TransactionStatus = 'completed' | 'voided' | 'pending_sync'
export type DiscountType = 'percentage' | 'fixed'
export type PaymentMethod = 'cash' | 'card' | 'mtn_momo' | 'telecel_cash'

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  icon: string
  colorHex: string
}

export interface Product {
  id: string
  name: string
  categoryId: string
  category?: Category
  description?: string | null
  imageUrl?: string | null
  basePrice: number
  barcode?: string | null
  isActive: boolean
  createdAt: string
  variants?: Variant[]
  markdowns?: Markdown[]
}

export interface Variant {
  id: string
  productId: string
  product?: Product
  size: string
  color: string
  colorHex: string
  quantity: number
  sku: string
  lowStockThreshold: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string | null
  preferredSizes: string[]
  styleNotes?: string | null
  createdAt: string
  visitCount?: number
  lastVisit?: string | null
}

export interface CustomerVisit {
  id: string
  customerId: string
  visitedAt: string
  transactionId?: string | null
}

export interface Transaction {
  id: string
  customerId?: string | null
  customer?: Customer | null
  staffId: string
  staff?: Staff
  subtotal: number
  discountAmount: number
  total: number
  status: TransactionStatus
  paymentMethod: PaymentMethod
  paymentSplit?: PaymentSplit | null
  receiptNumber: string
  createdAt: string
  items?: TransactionItem[]
}

export interface PaymentSplit {
  method1: PaymentMethod
  amount1: number
  method2: PaymentMethod
  amount2: number
}

export interface TransactionItem {
  id: string
  transactionId: string
  variantId: string
  variant?: Variant
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Discount {
  id: string
  code: string
  type: DiscountType
  value: number
  expiresAt?: string | null
  isActive: boolean
}

export interface Markdown {
  id: string
  productId: string
  discountPercentage: number
  startsAt: string
  endsAt: string
  isActive: boolean
}

export interface Staff {
  id: string
  name: string
  role: StaffRole
  isActive: boolean
}

// ─── Cart (client-side only) ──────────────────────────────────────────────────

export interface CartItem {
  variantId: string
  productId: string
  productName: string
  size: string
  color: string
  colorHex: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  staff: Staff
  tokens: AuthTokens
}

export interface SummaryStats {
  totalSales: number
  transactionCount: number
  averageTransactionValue: number
  topProductsByRevenue: Array<{ name: string; revenue: number }>
  topProductsByUnits: Array<{ name: string; units: number }>
  paymentBreakdown: Record<PaymentMethod, number>
}
