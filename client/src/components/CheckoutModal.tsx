import { useState } from 'react'
import { X, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import api from '../lib/api'
import { useCartStore } from '../stores/cart.store'
import { formatGHS } from '../lib/format'
import type { PaymentMethod } from '@world-of-vintage/shared'

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash',         label: 'Cash' },
  { id: 'card',         label: 'Card' },
  { id: 'mtn_momo',     label: 'MTN MoMo' },
  { id: 'telecel_cash', label: 'Telecel Cash' },
]

interface Props {
  onClose: () => void
}

type Step = 'payment' | 'processing' | 'receipt'

interface ReceiptData {
  receiptNumber: string
  total: number
  items: Array<{ productName: string; size: string; quantity: number; lineTotal: number }>
  paymentMethod: string
  customerName?: string
}

export default function CheckoutModal({ onClose }: Props) {
  const { items, customer, total, discountValue, subtotal, discountAmount, discountType, clearCart } = useCartStore()

  const [step, setStep] = useState<Step>('payment')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [method2, setMethod2] = useState<PaymentMethod>('mtn_momo')
  const [split1, setSplit1] = useState('')
  const [managerPin, setManagerPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const tot = total()
  const sub = subtotal()
  const disc = discountValue()
  const needsManagerPin = discountAmount > 0

  async function handleCharge() {
    setError(null)
    setStep('processing')

    const paymentSplit = splitEnabled && split1
      ? {
          method1: method,
          amount1: parseFloat(split1),
          method2,
          amount2: tot - parseFloat(split1),
        }
      : null

    try {
      const res = await api.post<{ data: { receiptNumber: string; total: number; items: Array<{ variant: { product: { name: string }; size: string }; quantity: number; lineTotal: number }>; paymentMethod: string; customer?: { name: string } } }>('/transactions', {
        customerId: customer?.id ?? null,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        paymentMethod: method,
        paymentSplit,
        discountAmount: disc,
        managerPin: needsManagerPin ? managerPin : undefined,
      })

      const tx = res.data.data
      setReceipt({
        receiptNumber: tx.receiptNumber,
        total: tx.total,
        items: tx.items.map((i) => ({
          productName: i.variant.product.name,
          size: i.variant.size,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
        paymentMethod: tx.paymentMethod,
        customerName: tx.customer?.name,
      })
      setStep('receipt')
      clearCart()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Payment failed. Try again.'
      setError(msg)
      setStep('payment')
    }
  }

  function whatsappLink() {
    if (!receipt) return ''
    const lines = [
      `*World of Vintage — Receipt*`,
      `Receipt: ${receipt.receiptNumber}`,
      ``,
      ...receipt.items.map((i) => `${i.productName} (${i.size}) x${i.quantity} — ${formatGHS(i.lineTotal)}`),
      ``,
      `*Total: ${formatGHS(receipt.total)}*`,
      `Payment: ${receipt.paymentMethod.replace('_', ' ')}`,
    ]
    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={step === 'receipt' ? onClose : undefined} />
      <div className="relative bg-white rounded-xl w-full max-w-sm mx-4 shadow-xl">

        {/* ── Processing ────────────────────────────────────────────────── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={36} className="animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Processing payment…</p>
          </div>
        )}

        {/* ── Receipt ───────────────────────────────────────────────────── */}
        {step === 'receipt' && receipt && (
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              <CheckCircle size={40} className="text-green-500 mb-3" />
              <p className="font-semibold text-gray-900 text-lg">Payment complete</p>
              <p className="text-sm text-gray-500">#{receipt.receiptNumber}</p>
            </div>

            <div className="space-y-1.5 mb-4">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{item.productName} ({item.size}) ×{item.quantity}</span>
                  <span className="font-medium text-gray-900 ml-2 flex-shrink-0">{formatGHS(item.lineTotal)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatGHS(receipt.total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                New sale
              </button>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-green-600"
              >
                <ExternalLink size={14} />
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* ── Payment ───────────────────────────────────────────────────── */}
        {step === 'payment' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-900">Checkout</h2>
              <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 mb-5 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatGHS(sub)}</span>
              </div>
              {disc > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span><span>−{formatGHS(disc)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 text-base">
                <span>Total</span><span>{formatGHS(tot)}</span>
              </div>
            </div>

            {/* Payment method */}
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Payment method</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  className={`py-2.5 px-3 border rounded-lg text-sm font-medium transition-colors ${
                    method === pm.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {/* Split payment toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setSplitEnabled(!splitEnabled)}
                className={`w-9 h-5 rounded-full transition-colors relative ${splitEnabled ? 'bg-gray-900' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${splitEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-gray-600">Split payment</span>
            </div>

            {splitEnabled && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">{PAYMENT_METHODS.find(m => m.id === method)?.label} amount</p>
                  <input
                    type="number"
                    value={split1}
                    onChange={(e) => setSplit1(e.target.value)}
                    placeholder={`GHS`}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Second method</p>
                  <select
                    value={method2}
                    onChange={(e) => setMethod2(e.target.value as PaymentMethod)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none bg-white"
                  >
                    {PAYMENT_METHODS.filter((m) => m.id !== method).map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Manager PIN for discount */}
            {needsManagerPin && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Manager PIN (required for discount)</p>
                <input
                  type="password"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleCharge}
              disabled={needsManagerPin && !managerPin}
              className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Charge {formatGHS(tot)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
