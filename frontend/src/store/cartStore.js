import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      itemCount: 0,
      coupon: null,
      discount: 0,
      shippingCharge: 0,
      tax: 0,

      setCart: (cartData) => {
        set({
          items: cartData.items || [],
          total: cartData.total || 0,
          itemCount: cartData.itemCount || 0,
          coupon: cartData.coupon || null,
          discount: cartData.discount || 0,
          shippingCharge: cartData.shippingCharge || 0,
          tax: cartData.tax || 0,
        })
      },

      addItem: (product, quantity = 1, variant = null) => {
        const { items } = get()
        const existingIndex = items.findIndex(
          (item) =>
            item.product._id === product._id &&
            item.variant?._id === variant?._id
        )

        let newItems
        if (existingIndex >= 0) {
          newItems = items.map((item, idx) =>
            idx === existingIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        } else {
          newItems = [...items, { product, quantity, variant }]
        }

        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
        const total = newItems.reduce(
          (sum, item) =>
            sum + (item.product.discountPrice || item.product.price) * item.quantity,
          0
        )

        set({ items: newItems, itemCount, total })
      },

      removeItem: (productId, variantId = null) => {
        const { items } = get()
        const newItems = items.filter(
          (item) =>
            !(item.product._id === productId &&
              (variantId ? item.variant?._id === variantId : true))
        )
        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
        const total = newItems.reduce(
          (sum, item) =>
            sum + (item.product.discountPrice || item.product.price) * item.quantity,
          0
        )
        set({ items: newItems, itemCount, total })
      },

      updateQuantity: (productId, quantity, variantId = null) => {
        const { items } = get()
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        const newItems = items.map((item) =>
          item.product._id === productId &&
          (variantId ? item.variant?._id === variantId : true)
            ? { ...item, quantity }
            : item
        )
        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
        const total = newItems.reduce(
          (sum, item) =>
            sum + (item.product.discountPrice || item.product.price) * item.quantity,
          0
        )
        set({ items: newItems, itemCount, total })
      },

      applyCoupon: (coupon, discount) => {
        set({ coupon, discount })
      },

      removeCoupon: () => {
        set({ coupon: null, discount: 0 })
      },

      clearCart: () => {
        set({
          items: [],
          total: 0,
          itemCount: 0,
          coupon: null,
          discount: 0,
          shippingCharge: 0,
          tax: 0,
        })
      },

      getSubtotal: () => {
        const { items } = get()
        return items.reduce(
          (sum, item) =>
            sum + (item.product.discountPrice || item.product.price) * item.quantity,
          0
        )
      },

      getFinalTotal: () => {
        const { items, discount, shippingCharge, tax } = get()
        const subtotal = items.reduce(
          (sum, item) =>
            sum + (item.product.discountPrice || item.product.price) * item.quantity,
          0
        )
        return subtotal - discount + shippingCharge + tax
      },
    }),
    {
      name: 'shoppioo_cart',
      partialize: (state) => ({
        items: state.items,
        itemCount: state.itemCount,
        total: state.total,
        coupon: state.coupon,
        discount: state.discount,
      }),
    }
  )
)

export default useCartStore
