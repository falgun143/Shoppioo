import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import { useWishlist } from '../hooks/useWishlist'
import useWishlistStore from '../store/wishlistStore'
import { useCart } from '../hooks/useCart'
import { SectionLoader } from '../components/common/Loader'
import { formatPrice } from '../components/common/PriceDisplay'

export default function WishlistPage() {
  const { items, isLoading, toggleWishlist, moveToCart } = useWishlist()
  const { isInWishlist } = useWishlistStore()
  const { addToCart, isAddingToCart } = useCart()

  return (
    <>
      <Helmet><title>My Wishlist - Shoppioo</title></Helmet>

      <div className="bg-gray-50 min-h-screen py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FiHeart className="text-accent" />
            My Wishlist
            {items.length > 0 && (
              <span className="text-sm font-normal text-gray-500">({items.length} items)</span>
            )}
          </h1>

          {isLoading ? (
            <SectionLoader text="Loading wishlist..." />
          ) : items.length === 0 ? (
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm text-center py-20 px-4">
              <FiHeart className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
                Save your favourite products here so you can shop them later.
              </p>
              <Link to="/products" className="btn-primary px-8 py-3 inline-block font-bold">
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((product) => {
                const finalPrice = product.discountPrice || product.price
                const discountPct = product.discountPrice
                  ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
                  : 0

                return (
                  <div key={product._id} className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden group">
                    {/* Image */}
                    <div className="relative overflow-hidden">
                      <Link to={`/products/${product.slug || product._id}`}>
                        <div className="h-44 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <span className="text-5xl">📦</span>
                          )}
                        </div>
                      </Link>

                      {/* Discount Badge */}
                      {discountPct > 0 && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          {discountPct}% off
                        </span>
                      )}

                      {/* Remove from Wishlist */}
                      <button
                        onClick={() => toggleWishlist(product._id)}
                        className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove from wishlist"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <Link to={`/products/${product.slug || product._id}`}>
                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 hover:text-primary-500 transition-colors leading-snug">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Price */}
                      <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="font-bold text-gray-900">{formatPrice(finalPrice)}</span>
                        {discountPct > 0 && (
                          <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                        )}
                      </div>

                      {/* Stock */}
                      {product.stock === 0 ? (
                        <p className="text-xs text-red-500 font-medium mb-2">Out of Stock</p>
                      ) : null}

                      {/* Actions */}
                      <button
                        onClick={() => {
                          addToCart(product._id, 1)
                        }}
                        disabled={product.stock === 0 || isAddingToCart}
                        className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-sm transition-colors"
                      >
                        <FiShoppingCart className="w-4 h-4" />
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
