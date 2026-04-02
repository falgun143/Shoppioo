import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  FiSearch, FiShoppingCart, FiHeart, FiUser, FiChevronDown,
  FiMenu, FiX, FiLogOut, FiPackage, FiSettings, FiMapPin
} from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import useWishlistStore from '../../store/wishlistStore'
import { useAuth } from '../../hooks/useAuth'
import { categoryAPI } from '../../services/api'
import SearchBar from './SearchBar'

const NAV_CATEGORIES = [
  { label: 'Electronics', slug: 'electronics' },
  { label: 'Fashion', slug: 'fashion' },
  { label: 'Home & Kitchen', slug: 'home-kitchen' },
  { label: 'Beauty', slug: 'beauty' },
  { label: 'Sports', slug: 'sports' },
  { label: 'Books', slug: 'books' },
  { label: 'Toys', slug: 'toys' },
  { label: 'Grocery', slug: 'grocery' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuthStore()
  const { logout } = useAuth()
  const { items: cartItems } = useCartStore()
  const itemCount = cartItems.length
  const { itemCount: wishlistCount } = useWishlistStore()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 })

  const userDropdownRef = useRef(null)
  const categoryNavRef = useRef(null)
  const itemRefs = useRef([])

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-nav'],
    queryFn: () => categoryAPI.getAll().then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })

  const categories = categoriesData?.categories || NAV_CATEGORIES

  // Set indicator on active category after render
  useEffect(() => {
    const activeSlug = location.pathname.split('/category/')[1]
    const activeIndex = categories.findIndex((c) => (c.slug || c._id) === activeSlug)
    if (activeIndex >= 0 && itemRefs.current[activeIndex] && categoryNavRef.current) {
      const item = itemRefs.current[activeIndex]
      const containerLeft = categoryNavRef.current.getBoundingClientRect().left
      setIndicatorStyle({ left: item.getBoundingClientRect().left - containerLeft, width: item.offsetWidth, opacity: 1 })
    } else {
      setIndicatorStyle((s) => ({ ...s, opacity: 0 }))
    }
  }, [location.pathname, categories])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsUserDropdownOpen(false)
    await logout()
  }

  return (
    <header className={`sticky top-0 z-50 transition-shadow duration-200 ${isScrolled ? 'shadow-md' : ''}`}>
      {/* Main Navbar */}
      <div className="bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-white font-bold text-2xl tracking-tight">
                  Shoppi<span className="text-yellow-300">oo</span>
                </span>
                <span className="hidden sm:block text-blue-200 text-xs mt-1 font-medium">.in</span>
              </div>
            </Link>

            {/* Search Bar */}
            <SearchBar className="flex-1 max-w-2xl mx-2 sm:mx-4" />

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {/* User Account */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-1 text-white hover:text-yellow-300 transition-colors px-2 py-1 rounded"
                >
                  <FiUser className="w-5 h-5" />
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-xs text-blue-200">
                      {isAuthenticated ? 'Account' : 'Login'}
                    </span>
                    <span className="text-sm font-semibold">
                      {isAuthenticated ? user?.name?.split(' ')[0] : 'Sign In'}
                    </span>
                  </div>
                  <FiChevronDown className="hidden sm:block w-3 h-3" />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-sm shadow-lg border border-gray-100 py-1 z-50">
                    {isAuthenticated ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiUser className="w-4 h-4 text-gray-500" />
                          My Profile
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiPackage className="w-4 h-4 text-gray-500" />
                          My Orders
                        </Link>
                        <Link
                          to="/wishlist"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiHeart className="w-4 h-4 text-gray-500" />
                          Wishlist
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiMapPin className="w-4 h-4 text-gray-500" />
                          Saved Addresses
                        </Link>
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-500 hover:bg-gray-50 font-medium transition-colors"
                          >
                            <FiSettings className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <FiLogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-3">
                          <Link
                            to="/login"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="block w-full text-center bg-primary-500 text-white py-2 rounded-sm text-sm font-semibold hover:bg-primary-600 transition-colors"
                          >
                            Login
                          </Link>
                          <p className="text-center text-xs text-gray-500 mt-2">
                            New user?{' '}
                            <Link
                              to="/register"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="text-primary-500 font-medium hover:underline"
                            >
                              Sign Up
                            </Link>
                          </p>
                        </div>
                        <hr className="border-gray-100" />
                        <Link
                          to="/orders"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <FiPackage className="w-4 h-4" /> My Orders
                        </Link>
                        <Link
                          to="/wishlist"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <FiHeart className="w-4 h-4" /> Wishlist
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="relative flex items-center gap-1 text-white hover:text-yellow-300 transition-colors px-2 py-1 rounded"
              >
                <FiHeart className="w-5 h-5" />
                <span className="hidden sm:block text-sm font-semibold">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative flex items-center gap-1 text-white hover:text-yellow-300 transition-colors px-2 py-1 rounded"
              >
                <FiShoppingCart className="w-5 h-5" />
                <span className="hidden sm:block text-sm font-semibold">Cart</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 right-5 sm:right-auto sm:-top-1 sm:left-3 bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-white p-1 rounded"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Nav Bar — Flipkart style */}
      <div className={`bg-white border-b border-gray-200 shadow-sm hidden md:block${['/login', '/register', '/forgot-password'].some(p => location.pathname.startsWith(p)) ? ' !hidden' : ''}`}>
        <div
          ref={categoryNavRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 relative"
          onMouseLeave={() => {
            const activeSlug = location.pathname.split('/category/')[1]
            const activeIndex = categories.findIndex((c) => (c.slug || c._id) === activeSlug)
            if (activeIndex >= 0 && itemRefs.current[activeIndex] && categoryNavRef.current) {
              const item = itemRefs.current[activeIndex]
              const containerLeft = categoryNavRef.current.getBoundingClientRect().left
              setIndicatorStyle({ left: item.getBoundingClientRect().left - containerLeft, width: item.offsetWidth, opacity: 1 })
            } else {
              setIndicatorStyle((s) => ({ ...s, opacity: 0 }))
            }
          }}
        >
          <div className="flex items-center justify-evenly overflow-x-auto scrollbar-hide">
            {categories.slice(0, 10).map((cat, i) => {
              const slug = cat.slug || cat._id
              const isActive = location.pathname === `/category/${slug}`
              return (
                <Link
                  key={slug}
                  ref={(el) => (itemRefs.current[i] = el)}
                  to={`/category/${slug}`}
                  onMouseEnter={() => {
                    const item = itemRefs.current[i]
                    if (item && categoryNavRef.current) {
                      const containerLeft = categoryNavRef.current.getBoundingClientRect().left
                      setIndicatorStyle({ left: item.getBoundingClientRect().left - containerLeft, width: item.offsetWidth, opacity: 1 })
                    }
                  }}
                  className={`flex flex-col items-center gap-1 px-3 pt-2 pb-1 whitespace-nowrap transition-colors ${isActive ? 'text-primary-500' : 'text-gray-700 hover:text-primary-500'}`}
                >
                  <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-colors border-2 ${isActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-gray-50'}`}>
                    {cat.image?.url ? (
                      <img src={cat.image.url} alt={cat.name || cat.label} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">📦</span>
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{cat.name || cat.label}</span>
                </Link>
              )
            })}
            <Link
              ref={(el) => (itemRefs.current[categories.slice(0, 10).length] = el)}
              to="/products"
              onMouseEnter={() => {
                const i = categories.slice(0, 10).length
                const item = itemRefs.current[i]
                if (item && categoryNavRef.current) {
                  const containerLeft = categoryNavRef.current.getBoundingClientRect().left
                  setIndicatorStyle({ left: item.getBoundingClientRect().left - containerLeft, width: item.offsetWidth, opacity: 1 })
                }
              }}
              className="flex flex-col items-center gap-1 px-3 pt-2 pb-1 whitespace-nowrap text-gray-500 hover:text-primary-500 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                <span className="text-xl">🛍️</span>
              </div>
              <span className="text-xs font-medium">All →</span>
            </Link>
          </div>

          {/* Sliding blue underline indicator */}
          <div
            className="absolute bottom-0 h-[3px] bg-primary-500 rounded-t transition-all duration-200 ease-out pointer-events-none"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              opacity: indicatorStyle.opacity,
              boxShadow: '0 0 8px 1px rgba(59,130,246,0.5)',
            }}
          />
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-3">
            <div className="mb-4">
              <SearchBar />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.slug || cat._id}
                  to={`/category/${cat.slug}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-gray-700 text-sm py-2 px-3 bg-gray-50 rounded hover:bg-primary-50 hover:text-primary-500 transition-colors"
                >
                  {cat.label || cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
