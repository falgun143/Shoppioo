import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { FiX, FiSliders } from 'react-icons/fi'
import { productAPI } from '../services/api'
import ProductCard from '../components/common/ProductCard'
import ProductFilters from '../components/product/ProductFilters'
import ProductSort from '../components/product/ProductSort'
import Pagination from '../components/common/Pagination'
import { ProductGridSkeleton } from '../components/common/Loader'

const ITEMS_PER_PAGE = 24

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    categories: searchParams.getAll('category') || [],
    brands: searchParams.getAll('brand') || [],
    minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : null,
    minDiscount: searchParams.get('minDiscount') ? Number(searchParams.get('minDiscount')) : null,
  })

  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    filters.categories.forEach((c) => params.append('category', c))
    filters.brands.forEach((b) => params.append('brand', b))
    if (filters.minRating) params.set('minRating', filters.minRating)
    if (filters.minDiscount) params.set('minDiscount', filters.minDiscount)
    if (sort !== 'newest') params.set('sort', sort)
    if (page > 1) params.set('page', page)

    setSearchParams(params, { replace: true })
  }, [filters, sort, page, setSearchParams])

  const queryParams = {
    page,
    limit: ITEMS_PER_PAGE,
    sort,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    category: filters.categories.join(',') || undefined,
    brand: filters.brands.join(',') || undefined,
    minRating: filters.minRating || undefined,
    minDiscount: filters.minDiscount || undefined,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productAPI.getAll(queryParams).then((r) => r.data),
    keepPreviousData: true,
  })

  const products = data?.products || []
  const totalProducts = data?.total || 0
  const totalPages = data?.totalPages || Math.ceil(totalProducts / ITEMS_PER_PAGE)

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  const handleSortChange = useCallback((newSort) => {
    setSort(newSort)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const activeFiltersCount = [
    filters.minPrice || filters.maxPrice,
    filters.categories.length > 0,
    filters.brands.length > 0,
    filters.minRating,
    filters.minDiscount,
  ].filter(Boolean).length

  return (
    <>
      <Helmet>
        <title>All Products - Shoppioo</title>
        <meta name="description" content="Shop from thousands of products on Shoppioo. Best prices, free delivery, easy returns." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-4">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block w-60 flex-shrink-0">
            <ProductFilters filters={filters} onChange={handleFilterChange} />
          </aside>

          {/* Mobile Filters Overlay */}
          {showFilters && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
              <div className="absolute inset-y-0 left-0 w-72 bg-white overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <span className="font-semibold text-gray-800">Filters</span>
                  <button onClick={() => setShowFilters(false)} className="p-1.5 hover:bg-gray-100 rounded">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4">
                  <ProductFilters filters={filters} onChange={handleFilterChange} />
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Sort Bar */}
            <div className="bg-white rounded-sm shadow-sm border border-gray-100 mb-3 overflow-hidden">
              <ProductSort
                value={sort}
                onChange={handleSortChange}
                totalResults={totalProducts}
                onFilterToggle={() => setShowFilters(true)}
              />
            </div>

            {/* Active Filter Tags */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(filters.categories || []).map((cat) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 bg-blue-100 text-primary-700 text-xs px-2 py-1 rounded-full"
                  >
                    {cat}
                    <button
                      onClick={() =>
                        handleFilterChange({
                          ...filters,
                          categories: filters.categories.filter((c) => c !== cat),
                        })
                      }
                      className="hover:text-red-600"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(filters.brands || []).map((brand) => (
                  <span
                    key={brand}
                    className="flex items-center gap-1 bg-blue-100 text-primary-700 text-xs px-2 py-1 rounded-full"
                  >
                    {brand}
                    <button
                      onClick={() =>
                        handleFilterChange({
                          ...filters,
                          brands: filters.brands.filter((b) => b !== brand),
                        })
                      }
                      className="hover:text-red-600"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {filters.minRating && (
                  <span className="flex items-center gap-1 bg-blue-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                    {filters.minRating}★ & above
                    <button
                      onClick={() => handleFilterChange({ ...filters, minRating: null })}
                      className="hover:text-red-600"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Product Grid */}
            {isLoading ? (
              <ProductGridSkeleton count={ITEMS_PER_PAGE} />
            ) : products.length === 0 ? (
              <div className="bg-white rounded-sm border border-gray-100 text-center py-16 px-4">
                <p className="text-5xl mb-4">🔍</p>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={() => {
                    handleFilterChange({
                      minPrice: '', maxPrice: '', categories: [],
                      brands: [], minRating: null, minDiscount: null,
                    })
                    setSort('newest')
                  }}
                  className="btn-primary"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalProducts}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
