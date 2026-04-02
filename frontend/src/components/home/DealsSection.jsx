import { Link } from 'react-router-dom'
import ProductCard from '../common/ProductCard'
import { ProductCardSkeleton } from '../common/Loader'

// Renders "Best Deals" section — products come entirely from the backend (isFeatured or deals tag).
// No countdown timer. No mock/hardcoded products.
export default function DealsSection({ products, isLoading }) {
  if (!isLoading && (!products || products.length === 0)) return null

  return (
    <section className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-accent rounded-full" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Best Deals</h2>
              <p className="text-xs text-gray-500">Limited stock — grab them fast</p>
            </div>
          </div>
          <Link
            to="/products"
            className="text-sm text-primary-500 font-semibold hover:underline whitespace-nowrap"
          >
            View All →
          </Link>
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 divide-x divide-gray-100">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3">
                  <ProductCardSkeleton />
                </div>
              ))
            : products.slice(0, 6).map((product) => (
                <div key={product._id} className="p-2 sm:p-3 border-b border-gray-100 sm:border-b-0">
                  <ProductCard product={product} />
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}
