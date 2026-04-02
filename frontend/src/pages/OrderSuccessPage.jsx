import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { FiCheckCircle, FiPackage, FiShoppingBag, FiHome } from 'react-icons/fi'
import { orderAPI } from '../services/api'
import { formatPrice } from '../components/common/PriceDisplay'

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  const { data } = useQuery({
    queryKey: ['order-success', orderId],
    queryFn: () => orderAPI.getById(orderId).then((r) => r.data),
    enabled: !!orderId,
    staleTime: Infinity,
  })

  const order = data?.order

  return (
    <>
      <Helmet><title>Order Placed Successfully - Shoppioo</title></Helmet>

      <div className="bg-gray-50 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          {/* Success Animation */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-10 h-10 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Order Placed Successfully! 🎉
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Thank you for shopping with Shoppioo! Your order has been confirmed.
            </p>

            {/* Order Info */}
            {order ? (
              <div className="bg-gray-50 rounded-sm border border-gray-100 p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Number</span>
                  <span className="font-bold text-gray-800">
                    #{order.orderNumber || orderId?.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium text-gray-700">{order.items?.length} item(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="font-bold text-gray-900">{formatPrice(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment</span>
                  <span className={`font-medium capitalize ${order.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.isPaid ? 'Paid' : 'Processing'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Estimated Delivery</span>
                  <span className="font-medium text-gray-700">3-5 Business Days</span>
                </div>
              </div>
            ) : orderId ? (
              <div className="bg-gray-50 rounded-sm border border-gray-100 p-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Number</span>
                  <span className="font-bold">#{orderId.slice(-8).toUpperCase()}</span>
                </div>
              </div>
            ) : null}

            {/* Delivery Note */}
            <div className="bg-blue-50 border border-blue-100 rounded-sm p-3 mb-6 text-sm text-blue-700 text-left">
              <p className="font-semibold mb-1">What's next?</p>
              <ul className="space-y-1 text-xs">
                <li>📧 You'll receive a confirmation email shortly</li>
                <li>📦 We'll notify you when your order is shipped</li>
                <li>🚚 Track your order anytime from "My Orders"</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {orderId && (
                <Link
                  to={`/orders/${orderId}`}
                  className="flex items-center justify-center gap-2 w-full btn-primary py-3 font-bold"
                >
                  <FiPackage className="w-5 h-5" />
                  Track Your Order
                </Link>
              )}
              <Link
                to="/orders"
                className="flex items-center justify-center gap-2 w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-sm text-sm transition-colors"
              >
                <FiShoppingBag className="w-4 h-4" />
                View All Orders
              </Link>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full text-primary-500 font-semibold py-2 text-sm hover:underline"
              >
                <FiHome className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Shoppioo Branding */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Happy shopping with{' '}
            <span className="font-bold text-primary-500">
              Shoppi<span className="text-yellow-400">oo</span>
            </span>
            ! 🛍️
          </p>
        </div>
      </div>
    </>
  )
}
