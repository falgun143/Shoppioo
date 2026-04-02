import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import ProductCard from '../common/ProductCard'
import { ProductCardSkeleton } from '../common/Loader'

export default function FeaturedProducts({ title, products, isLoading, viewAllLink }) {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  // Don't render section if not loading and no products
  if (!isLoading && (!products || products.length === 0)) return null

  return (
    <section className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{title || 'Featured Products'}</h2>
          <div className="flex items-center gap-3">
            <Link
              to={viewAllLink || '/products'}
              className="text-sm text-primary-500 font-semibold hover:underline"
            >
              View All →
            </Link>
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="Scroll left"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="Scroll right"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Products Scroll */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide p-4 sm:p-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44 sm:w-48">
                  <ProductCardSkeleton />
                </div>
              ))
            : products.map((product) => (
                <div key={product._id} className="flex-shrink-0 w-44 sm:w-48">
                  <ProductCard product={product} />
                </div>
              ))
          }
        </div>
      </div>
    </section>
  )
}
