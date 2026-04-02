import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,

      setWishlist: (items) => {
        set({ items, itemCount: items.length })
      },

      addItem: (product) => {
        const { items } = get()
        const exists = items.find((item) => item._id === product._id)
        if (!exists) {
          const newItems = [...items, product]
          set({ items: newItems, itemCount: newItems.length })
        }
      },

      removeItem: (productId) => {
        const { items } = get()
        const newItems = items.filter((item) => item._id !== productId)
        set({ items: newItems, itemCount: newItems.length })
      },

      toggleItem: (product) => {
        const { items } = get()
        const exists = items.find((item) => item._id === product._id)
        if (exists) {
          get().removeItem(product._id)
          return false
        } else {
          get().addItem(product)
          return true
        }
      },

      isInWishlist: (productId) => {
        const { items } = get()
        return items.some((item) => item._id === productId)
      },

      clearWishlist: () => {
        set({ items: [], itemCount: 0 })
      },
    }),
    {
      name: 'shoppioo_wishlist',
    }
  )
)

export default useWishlistStore
