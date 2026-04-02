import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { wishlistAPI } from '../services/api'
import useWishlistStore from '../store/wishlistStore'
import useAuthStore from '../store/authStore'

export function useWishlist() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const wishlistStore = useWishlistStore()

  const { isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await wishlistAPI.get()
      wishlistStore.setWishlist(data.products || [])
      return data
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  const toggleMutation = useMutation({
    mutationFn: (productId) => wishlistAPI.toggle(productId),
    onSuccess: (data, productId) => {
      const isNowInWishlist = data.data?.added
      if (isNowInWishlist) {
        wishlistStore.addItem(data.data.product || { _id: productId })
        toast.success('Added to wishlist!')
      } else {
        wishlistStore.removeItem(productId)
        toast.success('Removed from wishlist')
      }
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update wishlist')
    },
  })

  const moveToCartMutation = useMutation({
    mutationFn: (productId) => wishlistAPI.moveToCart(productId),
    onSuccess: (_, productId) => {
      wishlistStore.removeItem(productId)
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Moved to cart!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to move to cart')
    },
  })

  const toggleWishlist = useCallback(
    (productId) => {
      if (!isAuthenticated) {
        toast.error('Please login to save items to wishlist')
        return
      }
      toggleMutation.mutate(productId)
    },
    [isAuthenticated, toggleMutation]
  )

  const moveToCart = useCallback(
    (productId) => {
      if (!isAuthenticated) {
        toast.error('Please login first')
        return
      }
      moveToCartMutation.mutate(productId)
    },
    [isAuthenticated, moveToCartMutation]
  )

  return {
    items: wishlistStore.items,
    itemCount: wishlistStore.itemCount,
    isLoading,
    toggleWishlist,
    moveToCart,
    isInWishlist: wishlistStore.isInWishlist,
    isToggling: toggleMutation.isPending,
    isMovingToCart: moveToCartMutation.isPending,
  }
}

export default useWishlist
