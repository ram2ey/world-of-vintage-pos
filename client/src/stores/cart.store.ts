import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Customer } from '@world-of-vintage/shared'

interface CartState {
  items: CartItem[]
  customer: Customer | null
  discountAmount: number
  discountType: 'fixed' | 'percentage'

  setCustomer: (c: Customer | null) => void
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, qty: number) => void
  setDiscount: (amount: number, type: 'fixed' | 'percentage') => void
  clearCart: () => void

  // Computed
  subtotal: () => number
  discountValue: () => number
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      discountAmount: 0,
      discountType: 'fixed',

      setCustomer: (customer) => set({ customer }),

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: i.quantity + item.quantity,
                      lineTotal: (i.quantity + item.quantity) * i.unitPrice,
                    }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),

      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

      updateQuantity: (variantId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId
                    ? { ...i, quantity: qty, lineTotal: qty * i.unitPrice }
                    : i
                ),
        })),

      setDiscount: (amount, type) => set({ discountAmount: amount, discountType: type }),

      clearCart: () =>
        set({ items: [], customer: null, discountAmount: 0, discountType: 'fixed' }),

      subtotal: () => get().items.reduce((s, i) => s + i.lineTotal, 0),

      discountValue: () => {
        const { discountAmount, discountType } = get()
        const sub = get().subtotal()
        if (discountType === 'percentage') return (sub * discountAmount) / 100
        return discountAmount
      },

      total: () => Math.max(0, get().subtotal() - get().discountValue()),
    }),
    {
      name: 'wov-cart',
      partialize: (state) => ({ items: state.items, customer: state.customer }),
    }
  )
)
