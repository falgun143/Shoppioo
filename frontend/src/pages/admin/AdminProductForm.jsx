import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiArrowLeft, FiSave } from 'react-icons/fi'
import { productAPI, categoryAPI } from '../../services/api'
import ImageUpload from '../../components/common/ImageUpload'
import { SectionLoader } from '../../components/common/Loader'

export default function AdminProductForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [images, setImages] = useState([])
  const [specRows, setSpecRows] = useState([{ key: '', value: '' }])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      name: '',
      brand: '',
      shortDescription: '',
      description: '',
      price: '',
      discountPrice: '',
      stock: '',
      sku: '',
      warranty: '',
      weight: '',
      dimensions: '',
      tags: '',
      isFeatured: false,
      isActive: true,
      highlights: [{ value: '' }],
    },
  })

  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control,
    name: 'highlights',
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoryAPI.getAll().then((r) => r.data),
  })

  // Fetch product for editing
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['admin-product-edit', id],
    queryFn: () => productAPI.getById(id).then((r) => r.data),
    enabled: isEdit,
    staleTime: 0,
  })

  // Populate form when editing
  useEffect(() => {
    if (productData?.product) {
      const p = productData.product
      reset({
        name: p.name || '',
        brand: p.brand || '',
        category: p.category?._id || '',
        shortDescription: p.shortDescription || '',
        description: p.description || '',
        price: p.price || '',
        discountPrice: p.discountPrice || '',
        stock: p.stock || '',
        sku: p.sku || '',
        warranty: p.warranty || '',
        weight: p.weight || '',
        dimensions: p.dimensions || '',
        tags: p.tags?.join(', ') || '',
        isFeatured: p.isFeatured || false,
        isActive: p.isActive !== false,
        highlights: p.highlights?.map((h) => ({ value: h })) || [{ value: '' }],
      })

      if (p.images?.length > 0) {
        setImages(p.images.map((img) => ({
          id: img._id || img.url,
          preview: img.url,
          url: img.url,
          isDefault: img.isDefault || false,
          isNew: false,
        })))
      }

      if (p.specifications?.length > 0) {
        setSpecRows(p.specifications.map(({ key, value }) => ({ key, value })))
      }
    }
  }, [productData, reset])

  const mutation = useMutation({
    mutationFn: (formData) =>
      isEdit ? productAPI.update(id, formData) : productAPI.create(formData),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated!' : 'Product created!')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      navigate('/admin/products')
    },
    onError: (err) => toast.error(err.message || 'Failed to save product'),
  })

  const onSubmit = (data) => {
    const formData = new FormData()

    // Basic fields
    formData.append('name', data.name)
    formData.append('brand', data.brand)
    if (data.category) formData.append('category', data.category)
    formData.append('shortDescription', data.shortDescription)
    formData.append('description', data.description)
    formData.append('price', data.price)
    if (data.discountPrice) formData.append('discountPrice', data.discountPrice)
    formData.append('stock', data.stock)
    if (data.sku) formData.append('sku', data.sku)
    if (data.warranty) formData.append('warranty', data.warranty)
    if (data.weight) formData.append('weight', data.weight)
    if (data.dimensions) formData.append('dimensions', data.dimensions)
    formData.append('isFeatured', data.isFeatured)
    formData.append('isActive', data.isActive)

    // Tags
    if (data.tags) {
      const tagsArr = data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      tagsArr.forEach((tag) => formData.append('tags[]', tag))
    }

    // Highlights
    const highlights = (data.highlights || []).map((h) => h.value).filter(Boolean)
    highlights.forEach((h) => formData.append('highlights[]', h))

    // Specifications
    const specs = {}
    specRows.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) specs[key.trim()] = value.trim()
    })
    formData.append('specifications', JSON.stringify(specs))

    // Images
    const newImages = images.filter((img) => img.isNew && img.file)
    newImages.forEach((img) => formData.append('images', img.file))

    // Existing images (not deleted)
    const existingImages = images.filter((img) => !img.isNew)
    formData.append('existingImages', JSON.stringify(existingImages.map((img) => img.url)))

    // Default image
    const defaultImg = images.find((img) => img.isDefault)
    if (defaultImg) {
      formData.append('defaultImage', defaultImg.url || defaultImg.preview)
    }

    mutation.mutate(formData)
  }

  if (isEdit && productLoading) return <SectionLoader text="Loading product..." />

  const price = watch('price')
  const discountPrice = watch('discountPrice')
  const discountPct = price && discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0

  return (
    <>
      <Helmet><title>{isEdit ? 'Edit Product' : 'New Product'} - Admin | Shoppioo</title></Helmet>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2 px-4 rounded-sm text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2 py-2 px-5 text-sm"
            >
              <FiSave className="w-4 h-4" />
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Main Info - Left Column */}
          <div className="xl:col-span-2 space-y-5">
            {/* Basic Info */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name', { required: 'Product name required', minLength: { value: 5, message: 'Too short' } })}
                  type="text"
                  placeholder="e.g., Samsung Galaxy M14 5G (Black, 4GB RAM, 128GB)"
                  className="input-field"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    {...register('brand')}
                    type="text"
                    placeholder="e.g., Samsung, Apple"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select {...register('category')} className="input-field">
                    <option value="">Select Category</option>
                    {(categoriesData?.categories || []).map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                <textarea
                  {...register('shortDescription', { maxLength: { value: 300, message: 'Max 300 characters' } })}
                  rows={2}
                  placeholder="Brief product summary (shown in search/listing)"
                  className="input-field resize-none"
                />
                {errors.shortDescription && <p className="text-red-500 text-xs mt-1">{errors.shortDescription.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Description</label>
                <textarea
                  {...register('description')}
                  rows={6}
                  placeholder="Detailed product description (supports HTML)"
                  className="input-field resize-y"
                />
              </div>
            </div>

            {/* Pricing + Inventory */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">Pricing & Inventory</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MRP (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('price', {
                      required: 'Price required',
                      min: { value: 1, message: 'Must be > 0' },
                    })}
                    type="number"
                    placeholder="0"
                    min={0}
                    className="input-field"
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price (₹)
                    {discountPct > 0 && (
                      <span className="ml-1 text-green-600 text-xs">({discountPct}% off)</span>
                    )}
                  </label>
                  <input
                    {...register('discountPrice', {
                      validate: (v) => !v || !price || Number(v) < Number(price) || 'Must be less than MRP',
                    })}
                    type="number"
                    placeholder="0"
                    min={0}
                    className="input-field"
                  />
                  {errors.discountPrice && <p className="text-red-500 text-xs mt-1">{errors.discountPrice.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('stock', { required: 'Stock required', min: { value: 0, message: 'Min 0' } })}
                    type="number"
                    placeholder="0"
                    min={0}
                    className="input-field"
                  />
                  {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input {...register('sku')} type="text" placeholder="e.g., SAM-M14-BLK-128" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
                  <input {...register('warranty')} type="text" placeholder="e.g., 1 Year Manufacturer" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input {...register('weight')} type="number" step="0.1" placeholder="e.g., 0.5" className="input-field" />
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">Product Highlights</h2>
              <p className="text-xs text-gray-500">Add key features shown on product page</p>
              {highlightFields.map((field, idx) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`highlights.${idx}.value`)}
                    type="text"
                    placeholder={`Highlight ${idx + 1}...`}
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(idx)}
                    disabled={highlightFields.length === 1}
                    className="p-2 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendHighlight({ value: '' })}
                className="flex items-center gap-1.5 text-sm text-primary-500 hover:underline"
              >
                <FiPlus className="w-4 h-4" />
                Add Highlight
              </button>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">Specifications</h2>
              <p className="text-xs text-gray-500">Add key-value specification pairs</p>
              {specRows.map((spec, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={spec.key}
                    onChange={(e) => {
                      const updated = [...specRows]
                      updated[idx].key = e.target.value
                      setSpecRows(updated)
                    }}
                    type="text"
                    placeholder="Key (e.g., Display)"
                    className="input-field flex-1"
                  />
                  <input
                    value={spec.value}
                    onChange={(e) => {
                      const updated = [...specRows]
                      updated[idx].value = e.target.value
                      setSpecRows(updated)
                    }}
                    type="text"
                    placeholder="Value (e.g., 6.6-inch FHD+)"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))}
                    disabled={specRows.length === 1}
                    className="p-2 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSpecRows([...specRows, { key: '', value: '' }])}
                className="flex items-center gap-1.5 text-sm text-primary-500 hover:underline"
              >
                <FiPlus className="w-4 h-4" />
                Add Specification
              </button>
            </div>

            {/* Images */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">Product Images</h2>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={6}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-1 space-y-5">
            {/* Status */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-gray-800">Status & Visibility</h2>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">Product visible to customers</p>
                </div>
                <input {...register('isActive')} type="checkbox" className="w-4 h-4 text-primary-500 rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">Featured</p>
                  <p className="text-xs text-gray-400">Show on homepage sections</p>
                </div>
                <input {...register('isFeatured')} type="checkbox" className="w-4 h-4 text-primary-500 rounded" />
              </label>
            </div>

            {/* Submit (mobile) */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full btn-primary py-3 font-bold xl:hidden"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
