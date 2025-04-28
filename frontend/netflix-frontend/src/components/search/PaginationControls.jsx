export default function PaginationControls({ page, totalPages, onPageChange }) {
    return (
        <div className="flex justify-center mt-4 space-x-2">
            <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
            >
                Prev
            </button>
            <span className="px-3 py-1 bg-gray-800 text-white rounded">
                {page} / {totalPages}
            </span>
            <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
            >
                Next
            </button>
        </div>
    );
}
