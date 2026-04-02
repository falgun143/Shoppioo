import { useState, useRef, useCallback } from 'react'
import { FiUpload, FiX, FiStar, FiImage } from 'react-icons/fi'
import toast from 'react-hot-toast'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function ImageUpload({
  images = [],
  onImagesChange,
  maxImages = 6,
  label = 'Product Images',
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(`${file.name}: Only JPEG, PNG, WebP images allowed`)
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: File too large (max 5MB)`)
      return false
    }
    return true
  }

  const processFiles = useCallback(
    (files) => {
      const remaining = maxImages - images.length
      if (remaining <= 0) {
        toast.error(`Maximum ${maxImages} images allowed`)
        return
      }

      const validFiles = Array.from(files)
        .slice(0, remaining)
        .filter(validateFile)

      validFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random(),
            file,
            preview: e.target.result,
            isDefault: images.length === 0,
            isNew: true,
          }
          onImagesChange((prev) => {
            const updated = [...prev, newImage]
            if (!updated.some((img) => img.isDefault)) {
              updated[0].isDefault = true
            }
            return updated
          })
        }
        reader.readAsDataURL(file)
      })
    },
    [images.length, maxImages, onImagesChange]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileInput = (e) => {
    processFiles(e.target.files)
    e.target.value = ''
  }

  const handleRemove = (id) => {
    onImagesChange((prev) => {
      const filtered = prev.filter((img) => img.id !== id)
      if (filtered.length > 0 && !filtered.some((img) => img.isDefault)) {
        filtered[0].isDefault = true
      }
      return filtered
    })
  }

  const handleSetDefault = (id) => {
    onImagesChange((prev) =>
      prev.map((img) => ({ ...img, isDefault: img.id === id }))
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Drop Zone */}
      {images.length < maxImages && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }
          `}
        >
          <FiUpload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Drop images here or <span className="text-primary-500">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPEG, PNG, WebP • Max 5MB per image • {images.length}/{maxImages} uploaded
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                img.isDefault ? 'border-primary-500' : 'border-gray-200'
              }`}
            >
              <img
                src={img.preview || img.url}
                alt="Product"
                className="w-full h-24 object-cover"
              />

              {/* Default badge */}
              {img.isDefault && (
                <div className="absolute top-1 left-1 bg-primary-500 text-white text-xs px-1 rounded flex items-center gap-0.5">
                  <FiStar className="w-2.5 h-2.5" />
                  Main
                </div>
              )}

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {!img.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(img.id)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-xs text-gray-900 px-1.5 py-0.5 rounded font-medium"
                    title="Set as main image"
                  >
                    <FiStar className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(img.id)}
                  className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                  title="Remove image"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add more placeholder */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary-400 hover:bg-gray-50 transition-all"
            >
              <FiImage className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-400">Add More</span>
            </button>
          )}
        </div>
      )}

      {images.length === 0 && (
        <p className="text-xs text-gray-500">No images added yet. First image will be the main product image.</p>
      )}
    </div>
  )
}
