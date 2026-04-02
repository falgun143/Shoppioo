import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiTrash2, FiHeart, FiMinus, FiPlus } from 'react-icons/fi'
import { useCart } from '../../hooks/useCart'
import { useWishlist } from '../../hooks/useWishlist'
import { formatPrice } from '../common/PriceDisplay'

export default function CartItem({ item }) {
  const { removeFromCart, updateQuantity, isUpdatingQuantity } = useCart()
  const { toggleWishlist } = useWishlist()
  const [imgError, setImgError] = useState(false)

  const product = item.product
  const finalPrice = product.discountPrice || product.price
  const originalPrice = product.price
  const hasDiscount = originalPrice > finalPrice

  const handleMoveToWishlist = () => {
    toggleWishlist(product._id)
    removeFromCart(product._id, item.variant?._id)
  }

  return (
    <div className="bg-white border-b border-gray-100 p-4 sm:p-6">
      <div className="flex gap-4">
        {/* Product Image */}
        <Link
          to={`/products/${product.slug || product._id}`}
          className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 border border-gray-100 rounded overflow-hidden bg-gray-50 flex items-center justify-center"
        >
          {product.images?.[0]?.url && !imgError ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="w-full h-full object-contain p-1"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-4xl">📦</span>
          )}
        </Link>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/products/${product.slug || product._id}`}
            className="font-medium text-gray-800 hover:text-primary-500 transition-colors text-sm sm:text-base line-clamp-2 block"
          >
            {product.name}
          </Link>

          {/* Variant */}
          {item.variant && (
            <p className="text-xs text-gray-500 mt-0.5">
              {Object.entries(item.variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-bold text-gray-900 text-lg">{formatPrice(finalPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-sm text-gray-400 line-through">{formatPrice(originalPrice)}</span>
                <span className="text-sm text-green-600 font-medium">
                  {Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}% off
                </span>
              </>
            )}
          </div>

          {/* Delivery Info */}
          <p className="text-xs text-green-600 mt-1">Free Delivery</p>

          {/* Stock Warning */}
          {product.stock <= 5 && product.stock > 0 && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              Only {product.stock} left in stock!
            </p>
          )}

          {/* Quantity + Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* Quantity Stepper */}
            <div className="flex items-center border border-gray-300 rounded-sm overflow-hidden">
              <button
                onClick={() => updateQuantity(product._id, item.quantity - 1, item.variant?._id)}
                disabled={item.quantity <= 1 || isUpdatingQuantity}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                <FiMinus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 h-8 flex items-center justify-center text-sm font-semibold border-x border-gray-300 bg-white">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(product._id, item.quantity + 1, item.variant?._id)}
                disabled={item.quantity >= (product.stock || 10) || isUpdatingQuantity}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <FiPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-gray-300 hidden sm:block">|</span>

            {/* Remove */}
            <button
              onClick={() => removeFromCart(product._id, item.variant?._id)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Remove</span>
            </button>

            <span className="text-gray-300 hidden sm:block">|</span>

            {/* Save for Later */}
            <button
              onClick={handleMoveToWishlist}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors"
            >
              <FiHeart className="w-4 h-4" />
              <span className="hidden sm:inline">Save for Later</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
