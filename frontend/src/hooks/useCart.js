import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cartAPI } from '../services/api'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'

export function useCart() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const cartStore = useCartStore()

  const { data: cartData, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await cartAPI.get()
      // Backend returns { cart: { items: [...] }, total, itemCount, discount, couponCode }
      cartStore.setCart({
        items: data.cart?.items || [],
        total: data.total || 0,
        itemCount: data.itemCount || 0,
        discount: data.discount || 0,
        coupon: data.couponCode || null,
      })
      return data
    },
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const invalidateCart = () => queryClient.invalidateQueries({ queryKey: ['cart'] })

  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity, variantId }) =>
      cartAPI.addItem(productId, quantity, variantId),
    onSuccess: () => {
      invalidateCart()
      toast.success('Added to cart!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add to cart')
    },
  })

  const removeFromCartMutation = useMutation({
    mutationFn: ({ productId, variantId }) => cartAPI.removeItem(productId, variantId),
    onSuccess: () => {
      invalidateCart()
      toast.success('Item removed from cart')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove item')
    },
  })

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity, variantId }) =>
      cartAPI.updateItem(productId, quantity, variantId),
    onSuccess: () => {
      invalidateCart()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update quantity')
    },
  })

  const applyCouponMutation = useMutation({
    mutationFn: (code) => cartAPI.applyCoupon(code),
    onSuccess: (data) => {
      cartStore.applyCoupon({ code: data.data.couponCode }, data.data.discount)
      invalidateCart()
      toast.success('Coupon applied successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid coupon code')
    },
  })

  const removeCouponMutation = useMutation({
    mutationFn: () => cartAPI.removeCoupon(),
    onSuccess: () => {
      cartStore.removeCoupon()
      invalidateCart()
      toast.success('Coupon removed')
    },
  })

  const clearCartMutation = useMutation({
    mutationFn: () => cartAPI.clear(),
    onSuccess: () => {
      cartStore.clearCart()
      invalidateCart()
    },
  })

  const addToCart = useCallback(
    (productId, quantity = 1, variantId = null) => {
      if (isAuthenticated) {
        addToCartMutation.mutate({ productId, quantity, variantId })
      } else {
        toast.error('Please login to add items to cart')
      }
    },
    [isAuthenticated, addToCartMutation]
  )

  const removeFromCart = useCallback(
    (productId, variantId = null) => {
      if (isAuthenticated) {
        removeFromCartMutation.mutate({ productId, variantId })
      } else {
        cartStore.removeItem(productId, variantId)
      }
    },
    [isAuthenticated, removeFromCartMutation, cartStore]
  )

  const updateQuantity = useCallback(
    (productId, quantity, variantId = null) => {
      if (isAuthenticated) {
        updateQuantityMutation.mutate({ productId, quantity, variantId })
      } else {
        cartStore.updateQuantity(productId, quantity, variantId)
      }
    },
    [isAuthenticated, updateQuantityMutation, cartStore]
  )

  const isInCart = useCallback(
    (productId) => cartStore.items.some((item) => item.product?._id === productId || item.product === productId),
    [cartStore.items]
  )

  return {
    items: cartStore.items,
    total: cartStore.total,
    itemCount: cartStore.itemCount,
    coupon: cartStore.coupon,
    discount: cartStore.discount,
    shippingCharge: cartStore.shippingCharge,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    isInCart,
    applyCoupon: applyCouponMutation.mutate,
    removeCoupon: removeCouponMutation.mutate,
    clearCart: clearCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isApplyingCoupon: applyCouponMutation.isPending,
  }
}

export default useCart
