import { FiCreditCard, FiSmartphone, FiDollarSign, FiShield } from 'react-icons/fi'

const PAYMENT_METHODS = [
  {
    id: 'razorpay',
    label: 'Pay Online',
    description: 'Credit/Debit Card, UPI, Netbanking, Wallets',
    icon: FiCreditCard,
    badge: 'Recommended',
    badgeColor: 'bg-green-100 text-green-700',
    subOptions: [
      { icon: '💳', label: 'Credit / Debit Card' },
      { icon: '📲', label: 'UPI (PhonePe, GPay, Paytm)' },
      { icon: '🏦', label: 'Net Banking' },
      { icon: '👛', label: 'Wallets' },
      { icon: '🔄', label: 'EMI Options' },
    ],
  },
  {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay when you receive your order',
    icon: FiDollarSign,
    badge: null,
    subOptions: null,
  },
]

export default function PaymentOptions({ selectedMethod, onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">All transactions are secured and encrypted.</p>

      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon
        const isSelected = selectedMethod === method.id

        return (
          <div
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`border rounded-sm p-4 cursor-pointer transition-all ${
              isSelected
                ? 'border-primary-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Radio */}
              <div className="mt-0.5 flex-shrink-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary-500' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-800">{method.label}</span>
                  {method.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${method.badgeColor}`}>
                      {method.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{method.description}</p>

                {/* Sub-options shown when selected */}
                {isSelected && method.subOptions && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {method.subOptions.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1.5"
                      >
                        <span>{sub.icon}</span>
                        <span>{sub.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* COD Note */}
                {isSelected && method.id === 'cod' && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                    Extra ₹40 charge applicable for Cash on Delivery orders.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Security Badge */}
      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
        <FiShield className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span>
          Your payment information is encrypted and secure. We do not store your card details.
          Powered by <span className="font-semibold">Razorpay</span>.
        </span>
      </div>
    </div>
  )
}
