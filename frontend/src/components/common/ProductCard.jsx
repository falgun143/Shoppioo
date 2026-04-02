import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiHeart, FiStar } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { useWishlist } from '../../hooks/useWishlist'
import useWishlistStore from '../../store/wishlistStore'

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

function getDiscountPercent(price, discountPrice) {
  if (!discountPrice || discountPrice >= price) return 0
  return Math.round(((price - discountPrice) / price) * 100)
}

export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const { toggleWishlist } = useWishlist()
  const { isInWishlist } = useWishlistStore()
  const [imgError, setImgError] = useState(false)

  const inWishlist = isInWishlist(product._id)
  const discountPercent = getDiscountPercent(product.price, product.discountPrice)
  const finalPrice = product.discountPrice || product.price
  const primaryImage = product.images?.[0]?.url || product.image

  const handleWishlistToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product._id)
  }

  const handleCardClick = () => {
    navigate(`/products/${product.slug || product._id}`)
  }

  return (
    <div
      className="bg-white rounded-sm shadow-sm border border-gray-100 cursor-pointer relative group overflow-hidden flex flex-col h-full"
      onClick={handleCardClick}
    >
      {/* Discount Badge */}
      {discountPercent > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {discountPercent}% off
          </span>
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={handleWishlistToggle}
        className={`
          absolute top-2 right-2 z-10 p-1.5 rounded-full shadow-sm transition-all duration-200
          ${inWishlist ? 'bg-red-50 text-red-500' : 'bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'}
        `}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {inWishlist ? (
          <FaHeart className="w-4 h-4 text-red-500" />
        ) : (
          <FiHeart className="w-4 h-4" />
        )}
      </button>

      {/* Product Image */}
      <div className="product-img-wrapper overflow-hidden h-52 sm:h-56 flex items-center justify-center bg-gray-50 flex-shrink-0">
        {primaryImage && !imgError ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="product-img w-full h-full object-contain p-2"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <span className="text-5xl">📦</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 flex flex-col flex-1">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
            {product.brand}
          </p>
        )}

        {/* Product Name */}
        <h3 className="text-sm text-gray-800 font-medium line-clamp-2 leading-snug mb-1 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating?.average > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex items-center gap-0.5 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
              <span className="font-medium">{product.rating.average.toFixed(1)}</span>
              <FiStar className="w-3 h-3 fill-white" />
            </div>
            {product.rating.count > 0 && (
              <span className="text-gray-400 text-xs">({product.rating.count.toLocaleString()})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap mt-auto">
          <span className="text-base font-bold text-gray-900">{formatPrice(finalPrice)}</span>
          {discountPercent > 0 && (
            <>
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
            </>
          )}
        </div>

        {/* Assured Badge + Stock */}
        <div className="flex items-center justify-between mt-1.5">
          {product.isAssured && (
            <span className="text-xs text-primary-500 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
              ✓ Assured
            </span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="text-xs text-orange-600 font-medium">Only {product.stock} left!</span>
          )}
          {product.stock === 0 && (
            <span className="text-xs text-red-500 font-medium">Out of Stock</span>
          )}
        </div>

        {/* Delivery badge */}
        <p className="text-xs text-gray-500 mt-1">Free Delivery</p>
      </div>

    </div>
  )
}
