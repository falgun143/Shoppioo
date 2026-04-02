import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { FiPackage, FiChevronRight, FiSearch } from 'react-icons/fi'
import { orderAPI } from '../services/api'
import Pagination from '../components/common/Pagination'
import { SectionLoader } from '../components/common/Loader'
import { format } from 'date-fns'
import { formatPrice } from '../components/common/PriceDisplay'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
}

const STATUS_FILTERS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function OrderHistoryPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, statusFilter, searchQuery],
    queryFn: () =>
      orderAPI.getAll({
        page,
        limit: 10,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: searchQuery || undefined,
      }).then((r) => r.data),
    keepPreviousData: true,
  })

  const orders = data?.orders || []
  const totalOrders = data?.total || 0
  const totalPages = data?.totalPages || 1

  return (
    <>
      <Helmet><title>My Orders - Shoppioo</title></Helmet>

      <div className="bg-gray-50 min-h-screen py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FiPackage className="text-primary-500" /> My Orders
          </h1>

          {/* Filters */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  placeholder="Search by order ID or product name..."
                  className="input-field pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1) }}
                    className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                      statusFilter === s
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <SectionLoader text="Loading orders..." />
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm text-center py-16 px-4">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
              <p className="text-gray-500 text-sm mb-6">
                {statusFilter !== 'All'
                  ? `No ${statusFilter} orders found.`
                  : "You haven't placed any orders yet. Start shopping!"}
              </p>
              <Link to="/products" className="btn-primary px-6 py-2.5 text-sm">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">ORDER #</span>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">
                          {order.orderNumber || order._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">PLACED ON</span>
                        <p className="font-medium text-gray-700 text-xs sm:text-sm">
                          {order.createdAt
                            ? format(new Date(order.createdAt), 'dd MMM yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">TOTAL</span>
                        <p className="font-bold text-gray-800 text-xs sm:text-sm">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status}
                      </span>
                      <Link
                        to={`/orders/${order._id}`}
                        className="flex items-center gap-1 text-primary-500 text-xs font-semibold hover:underline"
                      >
                        View Details <FiChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y divide-gray-50">
                    {(order.items || []).slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          {item.product?.images?.[0]?.url ? (
                            <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">
                            {item.product?.name || 'Product'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        {order.status === 'delivered' && (
                          <Link
                            to={`/products/${item.product?.slug}#reviews`}
                            className="text-xs text-primary-500 font-medium hover:underline whitespace-nowrap"
                          >
                            Rate Product
                          </Link>
                        )}
                      </div>
                    ))}
                    {order.items?.length > 2 && (
                      <div className="px-4 py-2 text-xs text-gray-500">
                        +{order.items.length - 2} more item(s)
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0 }) }}
                totalItems={totalOrders}
                itemsPerPage={10}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
