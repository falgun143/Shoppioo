import { useState } from 'react'
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import { categoryAPI, productAPI } from '../../services/api'

const RATINGS = [
  { value: 4, label: '4★ & above' },
  { value: 3, label: '3★ & above' },
  { value: 2, label: '2★ & above' },
  { value: 1, label: '1★ & above' },
]

function FilterSection({ title, isOpen, onToggle, children }) {
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        {isOpen ? (
          <FiChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  )
}

export default function ProductFilters({ filters, onChange, activeCategory }) {
  const [openSections, setOpenSections] = useState({
    price: true,
    category: true,
    brand: true,
    rating: true,
    discount: false,
  })

  // Fetch categories from DB
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-filter'],
    queryFn: () => categoryAPI.getAll().then((r) => r.data),
  })

  // Fetch brands dynamically from products in DB (optionally scoped to active category)
  const { data: brandsData } = useQuery({
    queryKey: ['brands-filter', activeCategory],
    queryFn: () => productAPI.getBrands(activeCategory).then((r) => r.data),
  })

  const categories = categoriesData?.categories || []
  const brands = brandsData?.brands || []

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handlePriceChange = (field, value) => {
    onChange({ ...filters, [field]: value })
  }

  const handleCategoryChange = (slug) => {
    const current = filters.categories || []
    const updated = current.includes(slug)
      ? current.filter((c) => c !== slug)
      : [...current, slug]
    onChange({ ...filters, categories: updated })
  }

  const handleBrandChange = (brand) => {
    const current = filters.brands || []
    const updated = current.includes(brand)
      ? current.filter((b) => b !== brand)
      : [...current, brand]
    onChange({ ...filters, brands: updated })
  }

  const handleRatingChange = (rating) => {
    onChange({ ...filters, minRating: filters.minRating === rating ? null : rating })
  }

  const handleDiscountChange = (discount) => {
    onChange({ ...filters, minDiscount: filters.minDiscount === discount ? null : discount })
  }

  const activeFiltersCount = [
    filters.minPrice || filters.maxPrice,
    (filters.categories || []).length > 0,
    (filters.brands || []).length > 0,
    filters.minRating,
    filters.minDiscount,
  ].filter(Boolean).length

  const clearAll = () => {
    onChange({
      minPrice: '',
      maxPrice: '',
      categories: [],
      brands: [],
      minRating: null,
      minDiscount: null,
    })
  }

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-primary-500 font-medium hover:underline flex items-center gap-1"
          >
            <FiX className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <FilterSection
        title="Price Range"
        isOpen={openSections.price}
        onToggle={() => toggleSection('price')}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Min (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPrice || ''}
                onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Max (₹)</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPrice || ''}
                onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
          {/* Quick price presets */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Under ₹1K', min: 0, max: 1000 },
              { label: '₹1K–₹5K', min: 1000, max: 5000 },
              { label: '₹5K–₹15K', min: 5000, max: 15000 },
              { label: 'Above ₹15K', min: 15000, max: '' },
            ].map((range) => (
              <button
                key={range.label}
                onClick={() => onChange({ ...filters, minPrice: range.min, maxPrice: range.max })}
                className="text-xs border border-gray-300 rounded px-2 py-1 hover:border-primary-500 hover:text-primary-500 hover:bg-blue-50 transition-colors"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </FilterSection>

      {/* Category — only show when not already on a category page */}
      {categories.length > 0 && !activeCategory && (
        <FilterSection
          title="Category"
          isOpen={openSections.category}
          onToggle={() => toggleSection('category')}
        >
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <label key={cat._id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(filters.categories || []).includes(cat.slug)}
                  onChange={() => handleCategoryChange(cat.slug)}
                  className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">
                  {cat.name}
                </span>
                {cat.productCount > 0 && (
                  <span className="text-xs text-gray-400">({cat.productCount})</span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Brand — fetched live from products in DB */}
      {brands.length > 0 && (
        <FilterSection
          title="Popular Filters"
          isOpen={openSections.brand}
          onToggle={() => toggleSection('brand')}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {brands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(filters.brands || []).includes(brand)}
                  onChange={() => handleBrandChange(brand)}
                  className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {brand}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Customer Rating */}
      <FilterSection
        title="Customer Rating"
        isOpen={openSections.rating}
        onToggle={() => toggleSection('rating')}
      >
        <div className="space-y-2">
          {RATINGS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={filters.minRating === r.value}
                onChange={() => handleRatingChange(r.value)}
                className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 flex items-center gap-1">
                <span className="text-yellow-400">{'★'.repeat(r.value)}</span>
                {r.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Discount */}
      <FilterSection
        title="Discount"
        isOpen={openSections.discount}
        onToggle={() => toggleSection('discount')}
      >
        <div className="space-y-2">
          {[10, 20, 30, 40, 50, 60].map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="discount"
                checked={filters.minDiscount === d}
                onChange={() => handleDiscountChange(d)}
                className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                {d}% or more
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Clear button */}
      {activeFiltersCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 rounded-sm text-sm transition-colors mt-3"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )
}
