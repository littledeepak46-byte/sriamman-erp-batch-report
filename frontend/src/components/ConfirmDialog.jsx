export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <p className="text-gray-700 mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
