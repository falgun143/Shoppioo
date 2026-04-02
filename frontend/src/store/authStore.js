import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (data) => {
        const { user, token } = data
        localStorage.setItem('shoppioo_token', token)
        set({ user, token, isAuthenticated: true, isLoading: false })
      },

      logout: () => {
        localStorage.removeItem('shoppioo_token')
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }))
      },

      setLoading: (loading) => set({ isLoading: loading }),

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },
    }),
    {
      name: 'shoppioo_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
