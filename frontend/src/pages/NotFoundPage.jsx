import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FiArrowLeft, FiHome, FiSearch, FiShoppingBag } from 'react-icons/fi'

const QUICK_LINKS = [
  { label: 'Electronics', href: '/category/electronics' },
  { label: 'Fashion', href: '/category/fashion' },
  { label: 'Home & Kitchen', href: '/category/home-kitchen' },
  { label: 'Best Deals', href: '/products?deals=true' },
]

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <>
      <Helmet><title>Page Not Found - Shoppioo</title></Helmet>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center">
          {/* 404 Graphic */}
          <div className="mb-6">
            <div className="text-[120px] font-extrabold text-gray-200 leading-none select-none">
              404
            </div>
            <div className="text-6xl -mt-4">😕</div>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Oops! The page you're looking for doesn't exist or has been moved.
            Don't worry, let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold py-2.5 px-5 rounded-sm text-sm transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 btn-primary py-2.5 px-5 text-sm font-bold"
            >
              <FiHome className="w-4 h-4" />
              Go to Home
            </Link>
            <Link
              to="/products"
              className="flex items-center justify-center gap-2 btn-secondary py-2.5 px-5 text-sm font-bold"
            >
              <FiShoppingBag className="w-4 h-4" />
              Browse Products
            </Link>
          </div>


          {/* Shoppioo Branding */}
          <p className="text-gray-400 text-xs mt-6">
            <Link to="/" className="text-primary-500 font-bold text-sm">
              Shoppi<span className="text-yellow-400">oo</span>
            </Link>
            {' '}— India's favourite online shopping destination
          </p>
        </div>
      </div>
    </>
  )
}
