import { FiSliders } from 'react-icons/fi'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Best Rating' },
  { value: 'popular', label: 'Most Popular' },
]

export default function ProductSort({ value, onChange, totalResults, onFilterToggle }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      {/* Results count */}
      <div className="flex items-center gap-3">
        {onFilterToggle && (
          <button
            onClick={onFilterToggle}
            className="md:hidden flex items-center gap-1.5 text-primary-500 border border-primary-500 rounded px-3 py-1.5 text-sm font-medium hover:bg-primary-50 transition-colors"
          >
            <FiSliders className="w-4 h-4" />
            Filters
          </button>
        )}
        {totalResults !== undefined && (
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{totalResults.toLocaleString()}</span> results found
          </p>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Sort by:</span>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`
                whitespace-nowrap text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors
                ${value === opt.value
                  ? 'bg-primary-500 border-primary-500 text-white font-medium'
                  : 'border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-500 bg-white'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
