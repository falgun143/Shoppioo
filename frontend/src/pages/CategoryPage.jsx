import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { categoryAPI, productAPI } from '../services/api'
import ProductCard from '../components/common/ProductCard'
import ProductFilters from '../components/product/ProductFilters'
import ProductSort from '../components/product/ProductSort'
import Pagination from '../components/common/Pagination'
import { ProductGridSkeleton, SectionLoader } from '../components/common/Loader'
import { FiX } from 'react-icons/fi'

export default function CategoryPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', categories: [], brands: [], minRating: null })
  const [showFilters, setShowFilters] = useState(false)
  const [activeSubcategory, setActiveSubcategory] = useState(null)

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoryAPI.getBySlug(slug).then((r) => r.data),
  })

  const { data: productsData, isLoading: productsLoading, isFetching } = useQuery({
    queryKey: ['category-products', slug, page, sort, filters, activeSubcategory],
    queryFn: () =>
      productAPI.getByCategory(activeSubcategory || slug, {
        page,
        limit: 24,
        sort,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        brand: filters.brands.join(',') || undefined,
        minRating: filters.minRating || undefined,
      }).then((r) => r.data),
    keepPreviousData: true,
  })

  const category = categoryData?.category
  const subcategories = categoryData?.subcategories || []
  const products = productsData?.products || []
  const total = productsData?.total || 0
  const totalPages = productsData?.totalPages || 1

  if (categoryLoading) return <SectionLoader text="Loading category..." />

  return (
    <>
      <Helmet>
        <title>{category?.name || slug} - Shoppioo</title>
        <meta name="description" content={`Shop ${category?.name || slug} products at best prices on Shoppioo. Free delivery, easy returns.`} />
      </Helmet>

      {/* Category Hero */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-xs text-blue-200 mb-2">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-1">/</span>
            <span className="text-white">{category?.name || slug}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{category?.name || slug}</h1>
          {category?.description && (
            <p className="text-blue-200 text-sm max-w-xl">{category.description}</p>
          )}
          <p className="text-blue-200 text-sm mt-1">{total > 0 ? `${total.toLocaleString()} products` : ''}</p>
        </div>
      </div>

      {/* Subcategory Tabs */}
      {subcategories.length > 0 && (
        <div className="bg-white border-b border-gray-200 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 py-2">
            <button
              onClick={() => { setActiveSubcategory(null); setPage(1) }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !activeSubcategory ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub._id || sub.slug}
                onClick={() => { setActiveSubcategory(sub.slug); setPage(1) }}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeSubcategory === sub.slug ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-4">
          {/* Desktop Filters */}
          <aside className="hidden md:block w-60 flex-shrink-0">
            <ProductFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1) }} />
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
                  <ProductFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1) }} />
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm mb-3 overflow-hidden">
              <ProductSort
                value={sort}
                onChange={(s) => { setSort(s); setPage(1) }}
                totalResults={total}
                onFilterToggle={() => setShowFilters(true)}
              />
            </div>

            {productsLoading ? (
              <ProductGridSkeleton count={24} />
            ) : products.length === 0 ? (
              <div className="bg-white rounded-sm border text-center py-16 px-4">
                <p className="text-5xl mb-4">📦</p>
                <h3 className="text-lg font-bold text-gray-800 mb-2">No products found</h3>
                <p className="text-gray-500 text-sm">Try different filters or browse other categories.</p>
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
