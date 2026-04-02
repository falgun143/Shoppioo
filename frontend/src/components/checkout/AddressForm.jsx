import { useForm } from 'react-hook-form'

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
]

export default function AddressForm({ onSubmit, onCancel, defaultValues, isLoading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
        <div className="flex gap-3">
          {['Home', 'Work', 'Other'].map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                {...register('type', { required: 'Select address type' })}
                type="radio"
                value={type.toLowerCase()}
                className="w-4 h-4 text-primary-500"
              />
              <span className="text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
        {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name', { required: 'Name is required' })}
            type="text"
            placeholder="Enter full name"
            className="input-field"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            {...register('phone', {
              required: 'Phone number required',
              pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit Indian mobile number' },
            })}
            type="tel"
            placeholder="10-digit mobile number"
            className="input-field"
            maxLength={10}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Pincode + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            {...register('pincode', {
              required: 'Pincode is required',
              pattern: { value: /^\d{6}$/, message: 'Enter valid 6-digit pincode' },
            })}
            type="text"
            placeholder="6-digit pincode"
            className="input-field"
            maxLength={6}
          />
          {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            {...register('city', { required: 'City is required' })}
            type="text"
            placeholder="Enter city"
            className="input-field"
          />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
        </div>
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          {...register('addressLine1', { required: 'Address is required', minLength: { value: 10, message: 'Please enter complete address' } })}
          type="text"
          placeholder="House/Flat No., Building Name, Street"
          className="input-field"
        />
        {errors.addressLine1 && <p className="text-red-500 text-xs mt-1">{errors.addressLine1.message}</p>}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 2 <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          {...register('addressLine2')}
          type="text"
          placeholder="Area, Colony, Locality"
          className="input-field"
        />
      </div>

      {/* State + Landmark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            {...register('state', { required: 'State is required' })}
            className="input-field"
          >
            <option value="">Select State</option>
            {STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Landmark <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            {...register('landmark')}
            type="text"
            placeholder="Nearby landmark"
            className="input-field"
          />
        </div>
      </div>

      {/* Default */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            {...register('isDefault')}
            type="checkbox"
            className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Set as default delivery address</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          {isLoading ? 'Saving...' : defaultValues?._id ? 'Update Address' : 'Save Address'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-6 py-2.5 rounded-sm text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
