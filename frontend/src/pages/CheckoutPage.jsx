import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiCheck, FiChevronRight } from 'react-icons/fi'
import { paymentAPI, orderAPI } from '../services/api'
import { useCart } from '../hooks/useCart'
import useAuthStore from '../store/authStore'
import AddressList from '../components/checkout/AddressList'
import PaymentOptions from '../components/checkout/PaymentOptions'
import { formatPrice } from '../components/common/PriceDisplay'

const STEPS = [
  { id: 1, label: 'Delivery Address' },
  { id: 2, label: 'Order Summary' },
  { id: 3, label: 'Payment' },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, discount, coupon, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [isProcessing, setIsProcessing] = useState(false)

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.discountPrice || item.product.price) * item.quantity,
    0
  )
  const shippingCharge = 0
  const finalTotal = subtotal - discount

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => orderAPI.create(orderData),
  })

  const handleRazorpayPayment = async () => {
    setIsProcessing(true)
    try {
      // 1. Create Razorpay order
      const { data: rzpOrder } = await paymentAPI.createOrder({
        amount: finalTotal,
        currency: 'INR',
      })

      // 2. Get Razorpay key
      const { data: keyData } = await paymentAPI.getKey()

      // 3. Open Razorpay modal
      const options = {
        key: keyData.key || 'rzp_test_YourKeyHere',
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        name: 'Shoppioo',
        description: `Order of ${items.length} item(s)`,
        image: '/favicon.svg',
        order_id: rzpOrder.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || selectedAddress?.phone || '',
        },
        notes: {
          addressId: selectedAddress?._id || '',
        },
        theme: { color: '#2874f0' },
        handler: async (response) => {
          try {
            // 4. Verify payment + create order
            const { data: verifyData } = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              addressId: selectedAddress?._id,
              items: items.map((i) => ({
                product: i.product._id,
                quantity: i.quantity,
                variant: i.variant?._id,
                price: i.product.discountPrice || i.product.price,
              })),
              couponCode: coupon?.code,
              discount,
              shippingCharge,
            })

            clearCart()
            toast.success('Order placed successfully!')
            navigate(`/order-success?orderId=${verifyData.order._id}`)
          } catch (err) {
            toast.error('Payment verified but order failed. Please contact support.')
          } finally {
            setIsProcessing(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            toast.error('Payment cancelled')
          },
        },
      }

      if (!window.Razorpay) {
        toast.error('Payment gateway unavailable. Please try again.')
        setIsProcessing(false)
        return
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setIsProcessing(false)
      toast.error(err.message || 'Failed to initiate payment')
    }
  }

  const handleCODOrder = async () => {
    setIsProcessing(true)
    try {
      const { data } = await createOrderMutation.mutateAsync({
        addressId: selectedAddress._id,
        items: items.map((i) => ({
          product: i.product._id,
          quantity: i.quantity,
          variant: i.variant?._id,
          price: i.product.discountPrice || i.product.price,
        })),
        paymentMethod: 'cod',
        couponCode: coupon?.code,
        discount,
        shippingCharge,
      })

      clearCart()
      toast.success('Order placed successfully!')
      navigate(`/order-success?orderId=${data.order._id}`)
    } catch (err) {
      toast.error(err.message || 'Failed to place order')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address')
      return
    }
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment()
    } else {
      handleCODOrder()
    }
  }

  return (
    <>
      <Helmet><title>Checkout - Shoppioo</title></Helmet>

      <div className="bg-gray-50 min-h-screen py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Checkout Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 text-xl font-bold text-gray-800">
              <span className="text-primary-500">Shoppi</span>
              <span className="text-yellow-400">oo</span>
              <span className="text-gray-400 text-base ml-2 font-normal">Secure Checkout</span>
            </div>

            {/* Step Indicator */}
            <div className="hidden sm:flex items-center gap-1">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-1">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium ${
                      step > s.id
                        ? 'bg-green-100 text-green-700'
                        : step === s.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {step > s.id ? (
                      <FiCheck className="w-3.5 h-3.5" />
                    ) : (
                      <span>{s.id}</span>
                    )}
                    {s.label}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Checkout Area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Step 1: Delivery Address */}
              <div className={`bg-white rounded-sm border shadow-sm ${step >= 1 ? '' : 'opacity-60 pointer-events-none'}`}>
                <div
                  className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer"
                  onClick={() => step > 1 && setStep(1)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > 1 ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'}`}>
                      {step > 1 ? <FiCheck className="w-3.5 h-3.5" /> : '1'}
                    </div>
                    <h2 className="font-semibold text-gray-800">Delivery Address</h2>
                  </div>
                  {step > 1 && selectedAddress && (
                    <button className="text-primary-500 text-sm font-medium hover:underline">
                      Change
                    </button>
                  )}
                </div>

                {step === 1 ? (
                  <div className="p-4">
                    <AddressList
                      selectedId={selectedAddress?._id}
                      onSelect={(addr) => setSelectedAddress(addr)}
                    />
                    {selectedAddress && (
                      <button
                        onClick={() => setStep(2)}
                        className="mt-4 btn-primary py-2.5 px-6 text-sm"
                      >
                        Deliver to this Address
                      </button>
                    )}
                  </div>
                ) : selectedAddress ? (
                  <div className="p-4 text-sm text-gray-600">
                    <span className="font-semibold text-gray-800">{selectedAddress.fullName}</span>
                    {' — '}
                    {selectedAddress.addressLine1}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                  </div>
                ) : null}
              </div>

              {/* Step 2: Order Summary */}
              <div className={`bg-white rounded-sm border shadow-sm ${step >= 2 ? '' : 'opacity-60 pointer-events-none'}`}>
                <div
                  className="flex items-center p-4 border-b border-gray-100 cursor-pointer gap-2"
                  onClick={() => step > 2 && setStep(2)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > 2 ? 'bg-green-500 text-white' : step === 2 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > 2 ? <FiCheck className="w-3.5 h-3.5" /> : '2'}
                  </div>
                  <h2 className="font-semibold text-gray-800">Order Summary</h2>
                </div>

                {step >= 2 && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.product._id} className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            {item.product.images?.[0]?.url ? (
                              <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-2xl">📦</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium line-clamp-1">{item.product.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice((item.product.discountPrice || item.product.price) * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {step === 2 && (
                      <button
                        onClick={() => setStep(3)}
                        className="mt-4 btn-primary py-2.5 px-6 text-sm"
                      >
                        Continue to Payment
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Payment */}
              <div className={`bg-white rounded-sm border shadow-sm ${step >= 3 ? '' : 'opacity-60 pointer-events-none'}`}>
                <div className="flex items-center p-4 border-b border-gray-100 gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    3
                  </div>
                  <h2 className="font-semibold text-gray-800">Payment Options</h2>
                </div>

                {step === 3 && (
                  <div className="p-4 space-y-4">
                    <PaymentOptions
                      selectedMethod={paymentMethod}
                      onSelect={setPaymentMethod}
                    />
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-wait text-white font-bold py-3.5 rounded-sm text-base transition-colors shadow-md"
                    >
                      {isProcessing
                        ? 'Processing...'
                        : paymentMethod === 'cod'
                        ? `Place Order (COD) — ${formatPrice(finalTotal + 40)}`
                        : `Pay Now — ${formatPrice(finalTotal)}`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm sticky top-20">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">
                    Price Details ({items.length} items)
                  </h3>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>− {formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Delivery</span>
                    <span className={shippingCharge === 0 ? 'text-green-600 font-medium' : ''}>
                      {shippingCharge === 0 ? 'FREE' : formatPrice(shippingCharge)}
                    </span>
                  </div>
                  {paymentMethod === 'cod' && (
                    <div className="flex justify-between text-gray-700">
                      <span>COD Charge</span>
                      <span>{formatPrice(40)}</span>
                    </div>
                  )}
                  <hr className="border-gray-100" />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total Amount</span>
                    <span>{formatPrice(paymentMethod === 'cod' ? finalTotal + 40 : finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
