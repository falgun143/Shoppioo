import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { FiSearch, FiX } from 'react-icons/fi'
import { productAPI } from '../services/api'
import ProductCard from '../components/common/ProductCard'
import ProductFilters from '../components/product/ProductFilters'
import ProductSort from '../components/product/ProductSort'
import Pagination from '../components/common/Pagination'
import { ProductGridSkeleton } from '../components/common/Loader'

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', categories: [], brands: [], minRating: null })
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [q])

  const trimmedQ = q.trim().toLowerCase()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', trimmedQ, page, sort, filters],
    queryFn: ({ signal }) =>
      productAPI.search({
        q: trimmedQ,
        page,
        limit: 24,
        sort,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        category: filters.categories.join(',') || undefined,
        brand: filters.brands.join(',') || undefined,
        minRating: filters.minRating || undefined,
      }, signal).then((r) => r.data),
    enabled: trimmedQ.length >= 2,
    keepPreviousData: true,
  })

  const products = data?.products || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  if (trimmedQ.length < 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <FiSearch className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Search for products</h2>
        <p className="text-gray-500">Type at least 2 characters to search.</p>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{q} - Search Results | Shoppioo</title>
        <meta name="description" content={`Search results for "${q}" on Shoppioo. Find best deals on ${q}.`} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Search Header */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-800">
            Search results for{' '}
            <span className="text-primary-500">"{trimmedQ}"</span>
          </h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} results found` : 'No results found'}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          {/* Desktop Filters */}
          <aside className="hidden md:block w-60 flex-shrink-0">
            <ProductFilters filters={filters} onChange={handleFilterChange} />
          </aside>

          {/* Mobile Filter Overlay */}
          {showFilters && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
              <div className="absolute inset-y-0 left-0 w-72 bg-white overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="font-semibold">Filters</span>
                  <button onClick={() => setShowFilters(false)}><FiX className="w-5 h-5" /></button>
                </div>
                <div className="p-4">
                  <ProductFilters filters={filters} onChange={handleFilterChange} />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm mb-3 overflow-hidden">
              <ProductSort
                value={sort}
                onChange={(s) => { setSort(s); setPage(1) }}
                totalResults={total}
                onFilterToggle={() => setShowFilters(true)}
              />
            </div>

            {isLoading ? (
              <ProductGridSkeleton count={24} />
            ) : products.length === 0 ? (
              <div className="bg-white rounded-sm border border-gray-100 text-center py-16 px-4">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No results for "{q}"</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Try a different spelling or fewer keywords.
                </p>
                <div className="text-sm text-gray-500">
                  <p className="font-medium mb-2">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-left max-w-xs mx-auto">
                    <li>Check your spelling</li>
                    <li>Use fewer or more general keywords</li>
                    <li>Browse categories instead</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0 }) }}
                    totalItems={total}
                    itemsPerPage={24}
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
