import { useState } from 'react'
import { Minus, Plus, Trash2, Tag, ShoppingBag } from 'lucide-react'
import { useCartStore } from '../stores/cart.store'
import { formatGHS } from '../lib/format'

interface Props {
  onCheckout: () => void
}

export default function CartPanel({ onCheckout }: Props) {
  const {
    items, customer, removeItem, updateQuantity,
    subtotal, discountValue, total,
    discountAmount, discountType, setDiscount,
  } = useCartStore()

  const [discountInput, setDiscountInput] = useState(discountAmount > 0 ? String(discountAmount) : '')
  const [discountTypeLocal, setDiscountTypeLocal] = useState<'fixed' | 'percentage'>(discountType)

  function applyDiscount() {
    const val = parseFloat(discountInput)
    if (!isNaN(val) && val >= 0) {
      setDiscount(val, discountTypeLocal)
    }
  }

  const sub = subtotal()
  const disc = discountValue()
  const tot = total()

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={16} />
            Cart
          </span>
          {customer && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {customer.name} · {customer.visitCount ?? 0} visits
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400 gap-2">
            <ShoppingBag size={32} className="text-gray-200" />
            <span>Cart is empty</span>
            <span className="text-xs text-gray-300">Tap a product to add it</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.variantId} className="px-4 py-3 flex items-center gap-3">
                {/* Color swatch */}
                <div
                  className="w-2 self-stretch rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.colorHex }}
                />

                {/* Name + size */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.size} · {item.color}</p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Line total */}
                <div className="text-right flex-shrink-0 min-w-[72px]">
                  <p className="text-sm font-medium text-gray-900">{formatGHS(item.lineTotal)}</p>
                  <p className="text-xs text-gray-400">{formatGHS(item.unitPrice)} each</p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.variantId)}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals + discount + checkout */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* Discount row */}
          <div className="flex gap-2">
            <select
              value={discountTypeLocal}
              onChange={(e) => setDiscountTypeLocal(e.target.value as 'fixed' | 'percentage')}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
            >
              <option value="fixed">GHS</option>
              <option value="percentage">%</option>
            </select>
            <input
              type="number"
              min="0"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              onBlur={applyDiscount}
              onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
              placeholder="Discount (requires manager PIN at checkout)"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button
              onClick={applyDiscount}
              className="flex items-center gap-1 text-xs px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50"
            >
              <Tag size={12} />
            </button>
          </div>

          {/* Summary */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatGHS(sub)}</span>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>−{formatGHS(disc)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{formatGHS(tot)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 active:bg-gray-700 transition-colors min-h-[44px]"
          >
            Charge {formatGHS(tot)}
          </button>
        </div>
      )}
    </div>
  )
}
