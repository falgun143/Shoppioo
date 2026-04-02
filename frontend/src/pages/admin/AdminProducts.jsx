import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter,
  FiEye, FiPackage, FiAlertCircle
} from 'react-icons/fi'
import { productAPI, categoryAPI } from '../../services/api'
import Pagination from '../../components/common/Pagination'
import { TableRowSkeleton } from '../../components/common/Loader'
import { formatPrice } from '../../components/common/PriceDisplay'
import useDebounce from '../../hooks/useDebounce'

export default function AdminProducts() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const search = useDebounce(searchInput, 400)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories-filter'],
    queryFn: () => categoryAPI.getAll().then((r) => r.data),
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-products', page, search, categoryFilter],
    queryFn: () => {
      if (search.length >= 2) {
        return productAPI.search({
          q: search,
          page,
          limit: 15,
          category: categoryFilter || undefined,
        }).then((r) => r.data)
      }
      return productAPI.getAll({
        page,
        limit: 15,
        category: categoryFilter || undefined,
      }).then((r) => r.data)
    },
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.delete(id),
    onSuccess: () => {
      toast.success('Product deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setDeleteConfirm(null)
    },
    onError: (err) => toast.error(err.message || 'Delete failed'),
  })

  const products = data?.products || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || data?.pagination?.totalPages || 1

  return (
    <>
      <Helmet><title>Products - Admin | Shoppioo</title></Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Products</h1>
            <p className="text-sm text-gray-500">{total} products total</p>
          </div>
          <Link to="/admin/products/new" className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm self-start sm:self-auto">
            <FiPlus className="w-4 h-4" />
            Add Product
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
              className="input-field pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
            className="input-field sm:w-48"
          >
            <option value="">All Categories</option>
            {(categoriesData?.categories || []).map((cat) => (
              <option key={cat._id} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      <FiPackage className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>No products found</p>
                      {search && (
                        <button onClick={() => setSearchInput('')} className="text-primary-500 text-sm mt-1 hover:underline">
                          Clear search
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {product.images?.[0]?.url ? (
                              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
                            ) : (
                              <FiPackage className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 line-clamp-1 max-w-[160px]">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.brand}</p>
                            {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3 text-gray-600">
                        {product.category?.name || 'Uncategorized'}
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-semibold text-gray-900">{formatPrice(product.discountPrice || product.price)}</span>
                          {product.discountPrice && (
                            <p className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</p>
                          )}
                        </div>
                      </td>
                      {/* Stock */}
                      <td className="px-4 py-3">
                        <span className={`font-medium ${product.stock <= 5 ? 'text-red-600' : product.stock <= 20 ? 'text-orange-600' : 'text-green-600'}`}>
                          {product.stock}
                        </span>
                        {product.stock <= 5 && (
                          <div className="flex items-center gap-0.5 text-red-500 text-xs mt-0.5">
                            <FiAlertCircle className="w-3 h-3" />
                            Low
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {product.isFeatured && (
                          <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Featured</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/products/${product.slug || product._id}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-blue-50 rounded transition-colors"
                            title="View on store"
                          >
                            <FiEye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/products/edit/${product._id}`}
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(product)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            itemsPerPage={15}
          />
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Product?</h3>
            <p className="text-gray-500 text-sm mb-1">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-800">"{deleteConfirm.name}"</span>?
            </p>
            <p className="text-red-500 text-xs mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-sm text-sm"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
