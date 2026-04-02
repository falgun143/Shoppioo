import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import ImageGallery from 'react-image-gallery'
import 'react-image-gallery/styles/css/image-gallery.css'
import {
  FiHeart, FiShoppingCart, FiZap, FiTruck, FiShield, FiRefreshCw,
  FiStar, FiShare2, FiMinus, FiPlus, FiMapPin, FiCheck
} from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { productAPI } from '../services/api'
import { useCart } from '../hooks/useCart'
import { useWishlist } from '../hooks/useWishlist'
import useWishlistStore from '../store/wishlistStore'
import PriceDisplay from '../components/common/PriceDisplay'
import { RatingBadge } from '../components/common/StarRating'
import ReviewList from '../components/product/ReviewList'
import ReviewForm from '../components/product/ReviewForm'
import { SectionLoader } from '../components/common/Loader'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Specifications', 'Reviews']

export default function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart, removeFromCart, isAddingToCart, isRemovingFromCart, isInCart } = useCart()
  const { toggleWishlist } = useWishlist()
  const { isInWishlist } = useWishlistStore()

  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [pincode, setPincode] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productAPI.getBySlug(slug).then((r) => r.data),
    retry: 2,
  })

if (isLoading) return <SectionLoader text="Loading product..." />

  if (isError || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Product not found</h2>
        <p className="text-gray-500 mb-6">This product may have been removed or is unavailable.</p>
        <Link to="/products" className="btn-primary">Browse Products</Link>
      </div>
    )
  }

  const product = data.product
  const inWishlist = isInWishlist(product._id)
  const inCart = isInCart(product._id)

  // Build gallery items
  const galleryItems = (product.images || []).map((img) => ({
    original: img.url || img,
    thumbnail: img.url || img,
    originalAlt: product.name,
    thumbnailAlt: product.name,
  }))

  if (galleryItems.length === 0) {
    galleryItems.push({
      original: 'https://via.placeholder.com/500x500?text=No+Image',
      thumbnail: 'https://via.placeholder.com/100x100?text=No+Image',
    })
  }

  const finalPrice = selectedVariant?.discountPrice || product.discountPrice || product.price
  const originalPrice = selectedVariant?.price || product.price
  const currentStock = selectedVariant?.stock ?? product.stock

  const handleAddToCart = () => {
    if (inCart) {
      removeFromCart(product._id, selectedVariant?._id)
    } else {
      addToCart(product._id, quantity, selectedVariant?._id)
    }
  }

  const handleBuyNow = () => {
    addToCart(product._id, quantity, selectedVariant?._id)
    navigate('/checkout')
  }

  const handleCheckDelivery = async () => {
    if (!/^\d{6}$/.test(pincode)) {
      toast.error('Enter a valid 6-digit pincode')
      return
    }
    try {
      const { data } = await productAPI.checkDelivery(product._id, pincode)
      setDeliveryInfo(data)
    } catch {
      setDeliveryInfo({ available: false, message: 'Delivery not available to this pincode' })
    }
  }

  const handleWishlist = () => toggleWishlist(product._id)

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    }
  }

  return (
    <>
      <Helmet>
        <title>{product.name} - Shoppioo</title>
        <meta name="description" content={product.shortDescription || product.description?.slice(0, 160)} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary-500">Home</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link to={`/category/${product.category.slug}`} className="hover:text-primary-500">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Image Gallery */}
            <div className="p-4 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="sticky top-20">
                <ImageGallery
                  items={galleryItems}
                  showPlayButton={false}
                  showFullscreenButton={true}
                  showNav={true}
                  thumbnailPosition="left"
                  additionalClass="product-gallery"
                />

                {/* Action buttons below gallery */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={(isAddingToCart || isRemovingFromCart) || currentStock === 0}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      inCart
                        ? 'bg-green-600 hover:bg-red-600 text-white'
                        : 'btn-primary'
                    }`}
                  >
                    <FiShoppingCart className="w-5 h-5" />
                    {isAddingToCart ? 'Adding...' : isRemovingFromCart ? 'Removing...' : inCart ? 'Remove from Cart' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={currentStock === 0}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiZap className="w-5 h-5" />
                    Buy Now
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Product Info */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Brand */}
              {product.brand && (
                <p className="text-primary-500 text-sm font-semibold uppercase tracking-wide">
                  {product.brand}
                </p>
              )}

              {/* Name */}
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 leading-snug">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <RatingBadge rating={product.rating?.average} />
                  <span className="text-sm text-gray-600">
                    {product.rating?.count?.toLocaleString() || 0} ratings
                  </span>
                </div>
                {product.isAssured && (
                  <span className="text-primary-500 bg-blue-50 text-xs font-semibold px-2 py-0.5 rounded border border-primary-100">
                    ✓ Shoppioo Assured
                  </span>
                )}
                <button onClick={handleShare} className="ml-auto text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <FiShare2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleWishlist}
                  className={`p-1.5 rounded-full transition-colors ${inWishlist ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                >
                  {inWishlist ? <FaHeart className="w-4 h-4" /> : <FiHeart className="w-4 h-4" />}
                </button>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded p-3">
                <PriceDisplay
                  price={originalPrice}
                  discountPrice={finalPrice}
                  size="lg"
                  showSavings
                />
                {product.tax && (
                  <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
                )}
              </div>

              {/* Stock */}
              {currentStock === 0 ? (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm font-medium">
                  Out of Stock — We'll notify you when it's back!
                </div>
              ) : currentStock <= 5 ? (
                <p className="text-orange-600 text-sm font-medium bg-orange-50 rounded px-3 py-1.5 border border-orange-100">
                  ⚡ Only {currentStock} left in stock — order soon!
                </p>
              ) : (
                <p className="text-green-600 text-sm font-medium flex items-center gap-1">
                  <FiCheck className="w-4 h-4" /> In Stock
                </p>
              )}

              {/* Variants */}
              {product.variants?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Select Variant:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <button
                        key={variant._id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3 py-1.5 border rounded text-sm transition-all ${
                          selectedVariant?._id === variant._id
                            ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
                            : 'border-gray-300 text-gray-700 hover:border-primary-400'
                        } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                        disabled={variant.stock === 0}
                      >
                        {Object.values(variant.attributes || {}).join(' / ') || variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              {currentStock > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded-sm overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <FiMinus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 h-8 flex items-center justify-center text-sm font-semibold border-x border-gray-300">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Check */}
              <div className="border border-gray-100 rounded p-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <FiMapPin className="w-4 h-4 text-gray-500" />
                  Check Delivery
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter pincode"
                    className="flex-1 border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    maxLength={6}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckDelivery()}
                  />
                  <button
                    onClick={handleCheckDelivery}
                    className="border border-primary-500 text-primary-500 hover:bg-primary-50 px-3 py-1.5 rounded-sm text-sm font-semibold transition-colors"
                  >
                    Check
                  </button>
                </div>
                {deliveryInfo && (
                  <div className={`mt-2 text-xs ${deliveryInfo.available ? 'text-green-600' : 'text-red-500'}`}>
                    {deliveryInfo.available ? (
                      <>✓ Delivery available — {deliveryInfo.estimatedDate || 'in 3-5 days'}</>
                    ) : (
                      deliveryInfo.message || 'Delivery not available to this pincode'
                    )}
                  </div>
                )}
              </div>

              {/* Key Highlights */}
              {product.highlights?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Key Highlights</p>
                  <ul className="space-y-1">
                    {product.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Services */}
              <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                {[
                  { icon: FiTruck, text: 'Free Delivery', sub: 'On all orders' },
                  { icon: FiRefreshCw, text: 'Easy Returns', sub: '7-day return policy' },
                  { icon: FiShield, text: '1 Year Warranty', sub: product.warranty || 'Manufacturer warranty' },
                  { icon: FiStar, text: 'Authentic', sub: '100% genuine product' },
                ].map(({ icon: Icon, text, sub }) => (
                  <div key={text} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    <Icon className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{text}</p>
                      <p className="text-xs text-gray-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Overview, Specs, Reviews */}
        <div className="mt-4 bg-white rounded-sm shadow-sm border border-gray-100">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
                {tab === 'Reviews' && product.rating?.count > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {product.rating.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'Overview' && (
              <div className="prose prose-sm max-w-none text-gray-600">
                <p className="text-base text-gray-800 font-medium mb-3">
                  {product.shortDescription}
                </p>
                <div
                  dangerouslySetInnerHTML={{ __html: product.description || '<p>No description available.</p>' }}
                />
              </div>
            )}

            {activeTab === 'Specifications' && (
              <div>
                {product.specifications?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {product.specifications.map((spec) => (
                          <tr key={spec.key} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-4 font-medium text-gray-700 w-40 min-w-[120px]">{spec.key}</td>
                            <td className="py-2.5 text-gray-600">{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Specifications not available for this product.</p>
                )}
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div className="space-y-6">
                {/* Write Review Button */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Customer Reviews</h3>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="btn-outline text-sm py-1.5 px-4"
                  >
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </div>

                {showReviewForm && (
                  <ReviewForm
                    productId={product._id}
                    onClose={() => setShowReviewForm(false)}
                  />
                )}

                <ReviewList productId={product._id} rating={product.rating} />
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
