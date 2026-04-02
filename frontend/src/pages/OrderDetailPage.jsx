import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FiPackage, FiTruck, FiCheck, FiX, FiArrowLeft, FiRefreshCw, FiPhone, FiMapPin } from 'react-icons/fi'
import { orderAPI } from '../services/api'
import { SectionLoader } from '../components/common/Loader'
import { formatPrice } from '../components/common/PriceDisplay'
import { format } from 'date-fns'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: FiPackage },
  { key: 'processing', label: 'Processing', icon: FiPackage },
  { key: 'shipped', label: 'Shipped', icon: FiTruck },
  { key: 'delivered', label: 'Delivered', icon: FiCheck },
]

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderAPI.getById(id).then((r) => r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: () => orderAPI.cancel(id, cancelReason),
    onSuccess: () => {
      toast.success('Order cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCancelModal(false)
    },
    onError: (err) => toast.error(err.message || 'Cannot cancel this order'),
  })

  if (isLoading) return <SectionLoader text="Loading order details..." />

  if (isError || !data?.order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order not found</h2>
        <Link to="/orders" className="btn-primary mt-4 inline-block px-6 py-2.5 text-sm">
          Back to Orders
        </Link>
      </div>
    )
  }

  const order = data.order
  const currentStatusIdx = STATUS_STEPS.findIndex((s) => s.key === order.status)
  const isCancellable = ['pending', 'processing'].includes(order.status)
  const isReturnable = order.status === 'delivered'

  return (
    <>
      <Helmet><title>Order #{order.orderNumber || id.slice(-8).toUpperCase()} - Shoppioo</title></Helmet>

      <div className="bg-gray-50 min-h-screen py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/orders" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Order #{order.orderNumber || id.slice(-8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-500">
                Placed on {order.createdAt ? format(new Date(order.createdAt), 'dd MMMM yyyy, hh:mm a') : 'N/A'}
              </p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {order.status}
            </span>
          </div>

          {/* Order Status Stepper (non-cancelled) */}
          {!['cancelled', 'returned'].includes(order.status) && (
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 sm:p-6 mb-4">
              <h2 className="font-semibold text-gray-800 mb-5">Order Status</h2>
              <div className="flex items-center">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon
                  const isCompleted = idx <= currentStatusIdx
                  const isCurrent = idx === currentStatusIdx
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className={`text-xs mt-2 font-medium text-center max-w-[60px] leading-tight ${
                          isCompleted ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
                        )}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 ${
                          idx < currentStatusIdx ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>

              {order.trackingNumber && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Tracking Number</p>
                    <p className="font-mono font-semibold text-gray-800">{order.trackingNumber}</p>
                  </div>
                  <a
                    href={order.trackingUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 text-sm font-semibold hover:underline flex items-center gap-1"
                  >
                    <FiTruck className="w-4 h-4" />
                    Track
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Cancelled Status */}
          {order.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 mb-4 flex items-center gap-3">
              <FiX className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Order Cancelled</p>
                {order.cancellationReason && (
                  <p className="text-sm text-red-600 mt-0.5">Reason: {order.cancellationReason}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Items + Address */}
            <div className="md:col-span-2 space-y-4">
              {/* Items */}
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800">
                    {order.items?.length} Item{order.items?.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex gap-3 p-4">
                      <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        {item.product?.images?.[0]?.url ? (
                          <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <span className="text-3xl">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.product?.slug || item.product?._id}`}
                          className="text-sm font-medium text-gray-800 hover:text-primary-500 line-clamp-2"
                        >
                          {item.product?.name || 'Product'}
                        </Link>
                        {item.variant && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {Object.entries(item.variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          <p className="font-semibold text-gray-800 text-sm">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMapPin className="text-primary-500 w-4 h-4" /> Delivery Address
                </h2>
                {order.shippingAddress ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-800">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                    <p className="flex items-center gap-1">
                      <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                      {order.shippingAddress.phone}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Address not available</p>
                )}
              </div>
            </div>

            {/* Order Summary + Payment */}
            <div className="md:col-span-1 space-y-4">
              {/* Price Breakdown */}
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Price Breakdown</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>− {formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{order.shippingCharge > 0 ? formatPrice(order.shippingCharge) : 'FREE'}</span>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total Paid</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Payment</h2>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium capitalize ${order.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                      {order.isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  {order.paymentId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment ID</span>
                      <span className="font-mono text-xs text-gray-700">{order.paymentId.slice(-12)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {(isCancellable || isReturnable) && (
                <div className="space-y-2">
                  {isCancellable && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full border border-red-400 text-red-500 hover:bg-red-50 font-semibold py-2.5 rounded-sm text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <FiX className="w-4 h-4" />
                      Cancel Order
                    </button>
                  )}
                  {isReturnable && (
                    <button className="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-sm text-sm transition-colors flex items-center justify-center gap-2">
                      <FiRefreshCw className="w-4 h-4" />
                      Return / Exchange
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Cancel Order?</h3>
            <p className="text-gray-500 text-sm mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="input-field"
              >
                <option value="">Select reason</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Found better price elsewhere">Found better price elsewhere</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Delivery time too long">Delivery time too long</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={!cancelReason || cancelMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-sm text-sm transition-colors"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-sm text-sm transition-colors"
              >
                No, Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
