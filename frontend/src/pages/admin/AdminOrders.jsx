import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FiSearch, FiEye, FiEdit2, FiCalendar } from 'react-icons/fi'
import { adminAPI } from '../../services/api'
import Pagination from '../../components/common/Pagination'
import { TableRowSkeleton } from '../../components/common/Loader'
import { formatPrice } from '../../components/common/PriceDisplay'
import { format } from 'date-fns'

const STATUS_OPTIONS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-700',
}

export default function AdminOrders() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [updateModal, setUpdateModal] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-orders', page, statusFilter, search, dateFrom, dateTo],
    queryFn: () =>
      adminAPI.getOrders({
        page,
        limit: 15,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }).then((r) => r.data),
    keepPreviousData: true,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }) => adminAPI.updateOrderStatus(id, status, note),
    onSuccess: () => {
      toast.success('Order status updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      setUpdateModal(null)
      setNewStatus('')
      setStatusNote('')
    },
    onError: (err) => toast.error(err.message || 'Failed to update status'),
  })

  const orders = data?.orders || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  return (
    <>
      <Helmet><title>Orders - Admin | Shoppioo</title></Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-500">{total} orders total</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search order # or customer name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="input-field pl-10"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="input-field w-36"
                title="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="input-field w-36"
                title="To date"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-full capitalize font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Order #</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono font-medium text-gray-800 text-xs">
                          #{order.orderNumber || order._id.slice(-8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{order.user?.name || 'User'}</p>
                        <p className="text-xs text-gray-400">{order.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.items?.length || 0} item(s)
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs capitalize text-gray-600">{order.paymentMethod || 'online'}</span>
                          <p className={`text-xs font-medium ${order.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                            {order.isPaid ? 'Paid' : 'Pending'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/orders/${order._id}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-blue-50 rounded transition-colors"
                            title="View order"
                          >
                            <FiEye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setUpdateModal(order)
                              setNewStatus(order.status)
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Update status"
                          >
                            <FiEdit2 className="w-4 h-4" />
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

      {/* Update Status Modal */}
      {updateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Update Order Status</h3>
            <p className="text-xs text-gray-500 mb-4">
              Order #{updateModal.orderNumber || updateModal._id.slice(-8).toUpperCase()}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input-field"
                >
                  {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g., Tracking number: TRK123456"
                  className="input-field"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => updateStatusMutation.mutate({ id: updateModal._id, status: newStatus, note: statusNote })}
                  disabled={updateStatusMutation.isPending || newStatus === updateModal.status}
                  className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={() => { setUpdateModal(null); setNewStatus(''); setStatusNote('') }}
                  className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
