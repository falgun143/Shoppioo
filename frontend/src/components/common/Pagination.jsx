import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  totalItems,
  itemsPerPage,
}) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const delta = 2

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      pages.push(i)
    }

    if (currentPage - delta > 2) pages.unshift('...')
    if (currentPage + delta < totalPages - 1) pages.push('...')

    pages.unshift(1)
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  const pages = getPageNumbers()

  const from = (currentPage - 1) * itemsPerPage + 1
  const to = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {showInfo && totalItems && (
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{from}</span> to{' '}
          <span className="font-medium">{to}</span> of{' '}
          <span className="font-medium">{totalItems.toLocaleString()}</span> results
        </p>
      )}

      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-primary-500 hover:text-primary-500 transition-colors"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Numbers */}
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-3 py-1.5 text-gray-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`
                px-3 py-1.5 text-sm rounded border transition-colors
                ${currentPage === page
                  ? 'bg-primary-500 border-primary-500 text-white font-semibold'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-500'
                }
              `}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-primary-500 hover:text-primary-500 transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
