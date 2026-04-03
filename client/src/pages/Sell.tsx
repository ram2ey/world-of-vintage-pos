import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ShoppingCart, ChevronDown } from 'lucide-react'
import api from '../lib/api'
import { useCartStore } from '../stores/cart.store'
import { formatGHS } from '../lib/format'
import type { Product, Category, Customer, Variant } from '@world-of-vintage/shared'
import CartPanel from '../components/CartPanel'
import CustomerSearch from '../components/CustomerSearch'
import CheckoutModal from '../components/CheckoutModal'

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Dresses', 'Accessories', 'Footwear']

export default function Sell() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { items, addItem, customer, setCustomer } = useCartStore()

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '100' }
      if (search) params.search = search
      if (activeCategory !== 'All') params.category = activeCategory
      const res = await api.get<{ data: Product[] }>('/products', { params })
      setProducts(res.data.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [search, activeCategory])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    api.get<{ data: Category[] }>('/products/categories').then((r) => setCategories(r.data.data))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setVariantProduct(null)
        setCartOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleAddVariant(product: Product, variant: Variant) {
    // Get active markdown discount if any
    const activeMarkdown = product.markdowns?.[0]
    const unitPrice = activeMarkdown
      ? Number(product.basePrice) * (1 - Number(activeMarkdown.discountPercentage) / 100)
      : Number(product.basePrice)

    addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex,
      quantity: 1,
      unitPrice,
      lineTotal: unitPrice,
    })
    setVariantProduct(null)
  }

  const getCategoryColor = (catName: string) => {
    return categories.find((c) => c.name === catName)?.colorHex ?? '#6B7280'
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* ── Left: Product catalog ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200">
        {/* Search + category bar */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products… ( / )"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Cart button — mobile / portrait only */}
            <button
              onClick={() => setCartOpen(true)}
              className="lg:hidden relative flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
            >
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Customer strip */}
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3">
          <CustomerSearch onSelect={setCustomer} selected={customer} />
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Loading…
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              No products found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  categoryColor={getCategoryColor(product.category?.name ?? '')}
                  onSelect={() => setVariantProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart (desktop) ────────────────────────────────────────── */}
      <div className="hidden lg:flex w-96 flex-shrink-0">
        <CartPanel onCheckout={() => setCheckoutOpen(true)} />
      </div>

      {/* ── Cart drawer (mobile) ─────────────────────────────────────────── */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-900">Cart</span>
              <button onClick={() => setCartOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <CartPanel onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} />
          </div>
        </div>
      )}

      {/* ── Variant picker drawer ────────────────────────────────────────── */}
      {variantProduct && (
        <VariantDrawer
          product={variantProduct}
          onAdd={handleAddVariant}
          onClose={() => setVariantProduct(null)}
        />
      )}

      {/* ── Checkout modal ───────────────────────────────────────────────── */}
      {checkoutOpen && (
        <CheckoutModal onClose={() => setCheckoutOpen(false)} />
      )}
    </div>
  )
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductRow({
  product,
  categoryColor,
  onSelect,
}: {
  product: Product
  categoryColor: string
  onSelect: () => void
}) {
  const variants = product.variants ?? []
  const totalStock = variants.reduce((s, v) => s + v.quantity, 0)
  const isOutOfStock = totalStock === 0
  const isLowStock = !isOutOfStock && totalStock <= 3
  const activeMarkdown = product.markdowns?.[0]
  const displayPrice = activeMarkdown
    ? Number(product.basePrice) * (1 - Number(activeMarkdown.discountPercentage) / 100)
    : Number(product.basePrice)

  return (
    <button
      onClick={isOutOfStock ? undefined : onSelect}
      disabled={isOutOfStock}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors min-h-[56px] ${
        isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      {/* Color swatch */}
      <div
        className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: categoryColor }}
      >
        {product.category?.name?.[0] ?? '?'}
      </div>

      {/* Name + variants */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {variants.slice(0, 6).map((v) => (
            <span
              key={v.id}
              className={`text-xs px-1.5 py-0.5 rounded border ${
                v.quantity === 0
                  ? 'text-gray-300 border-gray-200'
                  : v.quantity <= v.lowStockThreshold
                  ? 'text-amber-600 border-amber-200 bg-amber-50'
                  : 'text-gray-500 border-gray-200 bg-gray-50'
              }`}
            >
              {v.size}
            </span>
          ))}
          {variants.length > 6 && (
            <span className="text-xs text-gray-400">+{variants.length - 6}</span>
          )}
        </div>
      </div>

      {/* Stock */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium text-gray-900">{formatGHS(displayPrice)}</p>
        <p
          className={`text-xs mt-0.5 ${
            isOutOfStock
              ? 'text-gray-400'
              : isLowStock
              ? 'text-amber-600 font-medium'
              : 'text-gray-400'
          }`}
        >
          {isOutOfStock ? 'Out of stock' : isLowStock ? `Low — ${totalStock} left` : `${totalStock} in stock`}
        </p>
        {activeMarkdown && (
          <p className="text-xs text-red-500 line-through">{formatGHS(Number(product.basePrice))}</p>
        )}
      </div>

      <ChevronDown size={14} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ─── Variant picker drawer ────────────────────────────────────────────────────

function VariantDrawer({
  product,
  onAdd,
  onClose,
}: {
  product: Product
  onAdd: (p: Product, v: Variant) => void
  onClose: () => void
}) {
  const variants = product.variants ?? []
  const activeMarkdown = product.markdowns?.[0]
  const displayPrice = activeMarkdown
    ? Number(product.basePrice) * (1 - Number(activeMarkdown.discountPercentage) / 100)
    : Number(product.basePrice)

  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-sm max-h-[70vh] flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatGHS(displayPrice)}
              {activeMarkdown && (
                <span className="ml-2 text-xs text-red-500 line-through">
                  {formatGHS(Number(product.basePrice))}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">
            Select size
          </p>
          <div className="grid grid-cols-3 gap-2">
            {variants.map((v) => {
              const outOfStock = v.quantity === 0
              const lowStock = !outOfStock && v.quantity <= v.lowStockThreshold
              return (
                <button
                  key={v.id}
                  onClick={() => !outOfStock && onAdd(product, v)}
                  disabled={outOfStock}
                  className={`relative flex flex-col items-center justify-center p-3 border rounded-lg min-h-[64px] transition-colors ${
                    outOfStock
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full mb-1"
                    style={{ backgroundColor: v.colorHex }}
                  />
                  <span className="text-sm font-medium text-gray-900">{v.size}</span>
                  <span
                    className={`text-xs mt-0.5 ${
                      outOfStock
                        ? 'text-gray-300'
                        : lowStock
                        ? 'text-amber-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {outOfStock ? 'Out' : lowStock ? `${v.quantity} left` : v.quantity}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
