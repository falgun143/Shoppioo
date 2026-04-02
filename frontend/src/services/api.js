import axios from 'axios'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shoppioo_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong'

    if (error.response?.status === 401) {
      localStorage.removeItem('shoppioo_token')
      localStorage.removeItem('shoppioo_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?redirect=' + window.location.pathname
      }
    }

    return Promise.reject({ ...error, message })
  }
)

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (phone) => api.post('/auth/forgot-password', phone),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateAvatar: (formData) =>
    api.put('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAddresses: () => api.get('/auth/addresses'),
  addAddress: (data) => api.post('/auth/addresses', data),
  updateAddress: (id, data) => api.put(`/auth/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}`),
  setDefaultAddress: (id) => api.put(`/auth/addresses/${id}/default`),
}

// ─── Product API ─────────────────────────────────────────────────────────────
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  getById: (id) => api.get(`/products/id/${id}`),
  getFeatured: () => api.get('/products/featured'),
  getDeals: () => api.get('/products/deals'),
  search: (params, signal) => api.get('/products/search', { params, signal }),
  getByCategory: (slug, params) => api.get(`/products/category/${slug}`, { params }),
  create: (formData) =>
    api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) =>
    api.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/products/${id}`),
  checkDelivery: (productId, pincode) =>
    api.get(`/products/${productId}/delivery`, { params: { pincode } }),
  getBrands: (category) =>
    api.get('/products/brands', { params: category ? { category } : {} }),
}

// ─── Category API ────────────────────────────────────────────────────────────
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  create: (formData) =>
    api.post('/categories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) =>
    api.put(`/categories/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/categories/${id}`),
}

// ─── Cart API ────────────────────────────────────────────────────────────────
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (productId, quantity, variantId) =>
    api.post('/cart/add', { productId, quantity, variantId }),
  updateItem: (productId, quantity, variantId) =>
    api.put('/cart/update', { productId, quantity, variantId }),
  removeItem: (productId) =>
    api.delete(`/cart/remove/${productId}`),
  clear: () => api.delete('/cart/clear'),
  applyCoupon: (code) => api.post('/cart/coupon', { code }),
  removeCoupon: () => api.delete('/cart/coupon'),
}

// ─── Wishlist API ────────────────────────────────────────────────────────────
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  add: (productId) => api.post('/wishlist/add', { productId }),
  remove: (productId) => api.delete(`/wishlist/remove/${productId}`),
  toggle: (productId) => api.post(`/wishlist/toggle/${productId}`),
  moveToCart: (productId) => api.post(`/wishlist/move-to-cart/${productId}`),
}

// ─── Order API ───────────────────────────────────────────────────────────────
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),
  requestReturn: (id, data) => api.put(`/orders/${id}/return`, data),
  track: (id) => api.get(`/orders/${id}/track`),
}

// ─── Payment API ─────────────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (data) => api.post('/payment/create-order', data),
  verifyPayment: (data) => api.post('/payment/verify', data),
  getKey: () => api.get('/payment/key'),
}

// ─── Review API ──────────────────────────────────────────────────────────────
export const reviewAPI = {
  getByProduct: (productId, params) =>
    api.get(`/reviews/product/${productId}`, { params }),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`),
}

// ─── Coupon API ──────────────────────────────────────────────────────────────
export const couponAPI = {
  getAll: (params) => api.get('/coupons', { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  validate: (code, amount) => api.post('/coupons/validate', { code, amount }),
}

// ─── Admin API ───────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getRevenue: (params) => api.get('/admin/reports/revenue', { params }),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, status, note) =>
    api.put(`/admin/orders/${id}/status`, { status, note }),
  createUser: (data) => api.post('/admin/users', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  blockUser: (id) => api.put(`/admin/users/${id}/block`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getSalesReport: (params) => api.get('/admin/reports/sales', { params }),
  getTopProducts: (params) => api.get('/admin/reports/top-products', { params }),
}

// ─── Shipping API ────────────────────────────────────────────────────────────
export const shippingAPI = {
  checkPincode: (pincode) => api.get(`/shipping/pincode/${pincode}`),
  getEstimate: (data) => api.post('/shipping/estimate', data),
}

export default api
