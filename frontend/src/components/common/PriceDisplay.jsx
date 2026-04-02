function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

export default function PriceDisplay({
  price,
  discountPrice,
  size = 'md',
  showSavings = true,
  className = '',
}) {
  const hasDiscount = discountPrice && discountPrice < price
  const discountPercent = hasDiscount
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0
  const savings = hasDiscount ? price - discountPrice : 0

  const finalPrice = discountPrice || price

  const priceSize =
    size === 'sm' ? 'text-base' :
    size === 'md' ? 'text-xl' :
    size === 'lg' ? 'text-2xl' : 'text-3xl'

  const originalSize =
    size === 'sm' ? 'text-xs' :
    size === 'md' ? 'text-sm' :
    size === 'lg' ? 'text-base' : 'text-lg'

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      {/* Final/Discounted Price */}
      <span className={`font-bold text-gray-900 ${priceSize}`}>
        {formatPrice(finalPrice)}
      </span>

      {hasDiscount && (
        <>
          {/* Original Price Strikethrough */}
          <span className={`text-gray-400 line-through ${originalSize}`}>
            {formatPrice(price)}
          </span>

          {/* Discount % */}
          <span className="text-green-600 font-semibold text-sm">
            {discountPercent}% off
          </span>
        </>
      )}

      {/* Savings callout */}
      {showSavings && hasDiscount && savings > 100 && (
        <span className="text-green-700 bg-green-50 text-xs font-medium px-2 py-0.5 rounded-full">
          You save {formatPrice(savings)}!
        </span>
      )}
    </div>
  )
}

export { formatPrice }
