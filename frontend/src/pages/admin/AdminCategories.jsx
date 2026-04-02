import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiX, FiImage } from 'react-icons/fi'
import { categoryAPI } from '../../services/api'
import { TableRowSkeleton } from '../../components/common/Loader'

function CategoryModal({ category, onClose, onSave, isLoading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
    },
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(category?.image?.url || null)
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleFormSubmit = (formValues) => {
    onSave(formValues, imageFile)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-xl max-w-md w-full p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 rounded-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-lg">
            {category ? 'Edit Category' : 'New Category'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-sm p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded" />
              ) : (
                <>
                  <FiImage className="w-8 h-8 text-gray-300 mb-1" />
                  <p className="text-xs text-gray-400">Click to upload image</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imageFile && (
              <p className="text-xs text-gray-400 mt-1 truncate">{imageFile.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Name required' })}
              type="text"
              placeholder="e.g., Induction Cooktops"
              className="input-field"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {!category && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                {...register('slug')}
                type="text"
                placeholder="e.g., induction-cooktops (auto-generated if empty)"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Category description..."
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 btn-primary py-2.5 text-sm">
              {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCategories() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoryAPI.getAll().then((r) => r.data),
  })

  const categories = data?.categories || []

  const createMutation = useMutation({
    mutationFn: (formData) => categoryAPI.create(formData),
    onSuccess: () => {
      toast.success('Category created!')
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setShowModal(false)
    },
    onError: (err) => toast.error(err.message || 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoryAPI.update(id, data),
    onSuccess: () => {
      toast.success('Category updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setEditingCategory(null)
      setShowModal(false)
    },
    onError: (err) => toast.error(err.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryAPI.delete(id),
    onSuccess: () => {
      toast.success('Category deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setDeleteConfirm(null)
    },
    onError: (err) => toast.error(err.message || 'Cannot delete — may have products'),
  })

  const handleSave = (formValues, imageFile) => {
    const fd = new FormData()
    if (formValues.name) fd.append('name', formValues.name)
    if (formValues.slug) fd.append('slug', formValues.slug)
    if (formValues.description) fd.append('description', formValues.description)
    if (imageFile) fd.append('image', imageFile)

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, data: fd })
    } else {
      createMutation.mutate(fd)
    }
  }

  return (
    <>
      <Helmet><title>Categories - Admin | Shoppioo</title></Helmet>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Categories</h1>
            <p className="text-sm text-gray-500">{categories.length} categories</p>
          </div>
          <button
            onClick={() => { setEditingCategory(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm"
          >
            <FiPlus className="w-4 h-4" />
            New Category
          </button>
        </div>

        <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Slug</th>
                  <th className="text-left px-4 py-3">Products</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-500">
                      <FiTag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No categories yet. Create your first one!
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {cat.image?.url && !cat.image.url.includes('default.jpg') ? (
                            <img src={cat.image.url} alt={cat.name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-primary-100 rounded flex items-center justify-center">
                              <FiTag className="w-4 h-4 text-primary-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{cat.name}</p>
                            {cat.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{cat.slug}</td>
                      <td className="px-4 py-3 text-gray-700">{cat.productCount || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingCategory(cat); setShowModal(true) }}
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-blue-50 rounded transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(cat)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
      </div>

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => { setShowModal(false); setEditingCategory(null) }}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-800 mb-2">Delete Category?</h3>
            <p className="text-gray-500 text-sm mb-5">
              Delete "<span className="font-semibold">{deleteConfirm.name}</span>"? Products in this category will become uncategorized.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-sm text-sm"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
