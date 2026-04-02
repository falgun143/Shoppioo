import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FiShoppingBag, FiArrowLeft } from 'react-icons/fi'
import { useCart } from '../hooks/useCart'
import useAuthStore from '../store/authStore'
import CartItem from '../components/cart/CartItem'
import OrderSummary from '../components/cart/OrderSummary'
import { SectionLoader } from '../components/common/Loader'

const MOCK_CART_ITEMS = [
  {
    product: {
      _id: 'mock1',
      name: 'Samsung Galaxy M14 5G (Smoky Teal, 4GB, 128GB Storage)',
      slug: 'samsung-galaxy-m14-5g',
      price: 16999,
      discountPrice: 13499,
      brand: 'Samsung',
      images: [],
      stock: 10,
      freeDelivery: true,
      isAssured: true,
    },
    quantity: 1,
    variant: null,
  },
  {
    product: {
      _id: 'mock2',
      name: 'boAt Bassheads 100 in Ear Wired Earphone with Mic',
      slug: 'boat-bassheads-100',
      price: 799,
      discountPrice: 299,
      brand: 'boAt',
      images: [],
      stock: 3,
      freeDelivery: false,
      isAssured: false,
    },
    quantity: 2,
    variant: null,
  },
]

export default function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { items, isLoading } = useCart()

  // Use real items if available, mock for demo
  const cartItems = items.length > 0 ? items : (isAuthenticated ? [] : MOCK_CART_ITEMS)

  if (isLoading) return <SectionLoader text="Loading cart..." />

  return (
    <>
      <Helmet>
        <title>Shopping Cart - Shoppioo</title>
      </Helmet>

      <div className="bg-gray-50 min-h-screen py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiShoppingBag className="text-primary-500" />
              Shopping Cart
              {cartItems.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                </span>
              )}
            </h1>
          </div>

          {cartItems.length === 0 ? (
            /* Empty Cart State */
            <div className="bg-white rounded-sm border border-gray-100 text-center py-20 px-4">
              <div className="text-7xl mb-4">🛒</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty!</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                Add items to it now. Shop our best sellers, new arrivals and more.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-3 rounded-sm text-base transition-colors"
              >
                <FiShoppingBag className="w-5 h-5" />
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cart Items */}
              <div className="lg:col-span-2">
<div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
                  {cartItems.map((item) => (
                    <CartItem key={`${item.product._id}-${item.variant?._id || 'main'}`} item={item} />
                  ))}
                </div>

              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <OrderSummary
                  onCheckout={() => navigate(isAuthenticated ? '/checkout' : '/login?redirect=/checkout')}
                  checkoutLabel="Place Order"
                  showCoupon={isAuthenticated}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
