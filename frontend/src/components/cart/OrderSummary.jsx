import { useState } from 'react'
import { FiTag, FiX, FiChevronDown, FiChevronUp, FiShield } from 'react-icons/fi'
import { useCart } from '../../hooks/useCart'
import { formatPrice } from '../common/PriceDisplay'

export default function OrderSummary({ onCheckout, checkoutLabel = 'Proceed to Checkout', showCoupon = true }) {
  const {
    items,
    coupon,
    discount,
    applyCoupon,
    removeCoupon,
    isApplyingCoupon,
  } = useCart()

  const [couponCode, setCouponCode] = useState('')
  const [isOpen, setIsOpen] = useState(true)

  const subtotal = items.reduce(
    (sum, item) =>
      sum + (item.product.discountPrice || item.product.price) * item.quantity,
    0
  )

  const mrpTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  const mrpDiscount = mrpTotal - subtotal
  const taxAmount = Math.round((subtotal - discount) * 0.18)
  const finalTotal = subtotal - discount

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      applyCoupon(couponCode.trim().toUpperCase())
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-sm shadow-sm sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">
          Price Details ({totalItems} {totalItems === 1 ? 'Item' : 'Items'})
        </h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-gray-600 sm:hidden"
        >
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {(isOpen || window.innerWidth >= 640) && (
        <div className="px-4 py-3 space-y-3">
          {/* Price Rows */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Price ({totalItems} items)</span>
              <span>{formatPrice(mrpTotal)}</span>
            </div>

            {mrpDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>− {formatPrice(mrpDiscount)}</span>
              </div>
            )}

            <div className={`flex justify-between text-sm text-green-600 transition-opacity duration-200 ${discount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
              <span className="flex items-center gap-1">
                <FiTag className="w-3.5 h-3.5" />
                Coupon Discount
                {coupon && (
                  <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-medium">
                    {coupon.code}
                  </span>
                )}
              </span>
              <span>− {formatPrice(discount)}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-700">
              <span>Delivery Charges</span>
              <span className="text-green-600 font-medium">FREE</span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Total */}
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total Amount</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>

          <div className={`bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700 font-medium transition-opacity duration-200 ${mrpDiscount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
            You will save {formatPrice(mrpDiscount + discount)} on this order!
          </div>

          {/* Coupon */}
          {showCoupon && (
            <div className="border-t border-gray-100 pt-3">
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <FiTag className="w-4 h-4" />
                    <span className="font-semibold">{coupon.code}</span>
                    <span>applied!</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-green-600 hover:text-red-500 transition-colors"
                    aria-label="Remove coupon"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-gray-300 rounded-sm px-3 py-1.5 text-sm uppercase focus:outline-none focus:border-primary-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || isApplyingCoupon}
                    className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-sm text-sm font-semibold transition-colors"
                  >
                    {isApplyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Checkout Button */}
          {onCheckout && (
            <button
              onClick={onCheckout}
              disabled={items.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-sm text-base transition-colors shadow-md"
            >
              {checkoutLabel}
            </button>
          )}

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-1">
            <FiShield className="w-4 h-4 text-green-500" />
            Safe and Secure Payments. 100% Authentic Products.
          </div>
        </div>
      )}
    </div>
  )
}
