import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import useCartStore from '../store/cartStore'
import useWishlistStore from '../store/wishlistStore'
import { authAPI } from '../services/api'

export function useAuth() {
  const navigate = useNavigate()
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    updateUser,
    setLoading,
    isAdmin,
  } = useAuthStore()
  const clearCart = useCartStore((s) => s.clearCart)
  const clearWishlist = useWishlistStore((s) => s.clearWishlist)

  const login = useCallback(
    async (credentials, redirectPath = '/') => {
      setLoading(true)
      try {
        const { data } = await authAPI.login(credentials)
        storeLogin(data)
        toast.success(`Welcome back, ${data.user.name}!`)
        navigate(redirectPath)
        return { success: true }
      } catch (error) {
        const message = error.message || 'Login failed'
        toast.error(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [navigate, storeLogin, setLoading]
  )

  const register = useCallback(
    async (userData) => {
      setLoading(true)
      try {
        const { data } = await authAPI.register(userData)
        storeLogin(data)
        toast.success('Account created successfully!')
        navigate('/')
        return { success: true }
      } catch (error) {
        const message = error.message || 'Registration failed'
        toast.error(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [navigate, storeLogin, setLoading]
  )

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (_) {}
    storeLogout()
    clearCart()
    clearWishlist()
    localStorage.removeItem('shoppioo_auth')
    localStorage.removeItem('shoppioo_cart')
    localStorage.removeItem('shoppioo_wishlist')
    toast.success('Logged out successfully')
    navigate('/')
  }, [navigate, storeLogout, clearCart, clearWishlist])

  const updateProfile = useCallback(
    async (profileData) => {
      setLoading(true)
      try {
        const { data } = await authAPI.updateProfile(profileData)
        updateUser(data.user)
        toast.success('Profile updated successfully!')
        return { success: true }
      } catch (error) {
        const message = error.message || 'Update failed'
        toast.error(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [updateUser, setLoading]
  )

  const changePassword = useCallback(
    async (passwordData) => {
      setLoading(true)
      try {
        await authAPI.changePassword(passwordData)
        toast.success('Password changed successfully!')
        return { success: true }
      } catch (error) {
        const message = error.message || 'Password change failed'
        toast.error(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [setLoading]
  )

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isAdmin: isAdmin(),
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    updateUser,
  }
}

export default useAuth
