import { useState } from 'react'
import { FiStar } from 'react-icons/fi'
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'

// Display-only star rating
export function StarDisplay({ rating = 0, size = 'sm', showNumber = false, count = 0 }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
  const stars = []

  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<FaStar key={i} className={`${sizeClass} text-yellow-400`} />)
    } else if (i - 0.5 <= rating) {
      stars.push(<FaStarHalfAlt key={i} className={`${sizeClass} text-yellow-400`} />)
    } else {
      stars.push(<FaRegStar key={i} className={`${sizeClass} text-yellow-400`} />)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">{stars}</div>
      {showNumber && (
        <span className="text-sm text-gray-600">
          {rating.toFixed(1)} {count > 0 && <span className="text-gray-400">({count.toLocaleString()})</span>}
        </span>
      )}
    </div>
  )
}

// Interactive star rating input
export function StarInput({ value = 0, onChange, size = 'lg', disabled = false }) {
  const [hovered, setHovered] = useState(0)
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'

  const displayed = hovered || value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => !disabled && onChange(star)}
          className={`transition-transform ${!disabled ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          aria-label={`Rate ${star} stars`}
        >
          {star <= displayed ? (
            <FaStar className={`${sizeClass} text-yellow-400`} />
          ) : (
            <FaRegStar className={`${sizeClass} text-yellow-400`} />
          )}
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-600">
        {hovered || value ? `${hovered || value} star${(hovered || value) > 1 ? 's' : ''}` : 'Select rating'}
      </span>
    </div>
  )
}

// Compact green badge (like Flipkart)
export function RatingBadge({ rating, size = 'sm' }) {
  if (!rating || rating === 0) return null

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  let bgColor = 'bg-green-600'
  if (rating < 3) bgColor = 'bg-red-500'
  else if (rating < 4) bgColor = 'bg-yellow-500'

  return (
    <div className={`inline-flex items-center gap-0.5 ${bgColor} text-white px-1.5 py-0.5 rounded ${textSize} font-medium`}>
      {rating.toFixed(1)}
      <FiStar className={`${iconSize} fill-white`} />
    </div>
  )
}

export default StarDisplay
