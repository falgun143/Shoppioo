import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiSearch, FiX, FiLoader } from 'react-icons/fi'
import { productAPI } from '../../services/api'
import useDebounce from '../../hooks/useDebounce'

function PriceTag({ product }) {
  const price = product.discountPrice || product.price
  return (
    <span className="text-sm font-semibold text-gray-800">
      ₹{price.toLocaleString('en-IN')}
    </span>
  )
}

export default function SearchBar({ className = '' }) {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Trim + normalize before debouncing
  const normalized = inputValue.trim().toLowerCase()
  const debouncedQuery = useDebounce(normalized, 300)

  // Only fetch when query >= 2 chars (after debounce)
  const shouldFetch = debouncedQuery.length >= 2

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search-suggest', debouncedQuery],
    queryFn: ({ signal }) =>
      productAPI.search({ q: debouncedQuery, limit: 6 }, signal).then((r) => r.data),
    enabled: shouldFetch,
    retry: false,
  })

  const suggestions = data?.products || []
  const showDropdown = isOpen && inputValue.trim().length >= 2

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = inputValue.trim()
    if (q.length < 2) return
    setIsOpen(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleChange = (e) => {
    setInputValue(e.target.value)
    setIsOpen(true)
  }

  const handleClear = () => {
    setInputValue('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleSuggestionClick = useCallback((slug) => {
    setIsOpen(false)
    navigate(`/products/${slug}`)
  }, [navigate])

  const handleSeeAll = () => {
    const q = inputValue.trim()
    if (!q) return
    setIsOpen(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const isSpinning = (isLoading || isFetching) && shouldFetch

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex rounded-sm overflow-hidden">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleChange}
              onFocus={() => inputValue.trim().length >= 2 && setIsOpen(true)}
              placeholder="Search for products, brands and more"
              className="w-full px-3 py-2.5 pr-8 text-sm text-gray-800 outline-none bg-white"
              autoComplete="off"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-500 px-4 flex items-center transition-colors flex-shrink-0"
            aria-label="Search"
          >
            <FiSearch className="text-gray-800 w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 bg-white rounded-b-sm shadow-xl border border-gray-200 z-50 max-h-[420px] overflow-y-auto">

          {/* Min length hint */}
          {inputValue.trim().length < 2 && (
            <div className="px-4 py-3 text-sm text-gray-400">
              Type at least 2 characters to search
            </div>
          )}

          {/* Loading */}
          {isSpinning && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
              <svg className="animate-spin w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Searching...
            </div>
          )}

          {/* No results */}
          {!isSpinning && shouldFetch && suggestions.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-500">
                No results for <span className="font-semibold text-gray-700">"{inputValue.trim()}"</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Try fewer or different keywords</p>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <>
              <ul>
                {suggestions.map((product) => {
                  const image = product.images?.find((i) => i.isDefault)?.url || product.images?.[0]?.url
                  return (
                    <li key={product._id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSuggestionClick(product.slug)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded border border-gray-100 flex-shrink-0 overflow-hidden bg-gray-50">
                          {image ? (
                            <img src={image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <FiSearch className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{product.name}</p>
                          {product.brand && (
                            <p className="text-xs text-gray-400 truncate">{product.brand}</p>
                          )}
                        </div>
                        <PriceTag product={product} />
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* See all results */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSeeAll}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm text-primary-500 font-medium hover:bg-blue-50 border-t border-gray-100 transition-colors"
              >
                <FiSearch className="w-4 h-4" />
                See all results for "{inputValue.trim()}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
