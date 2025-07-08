export default function Chat() {
  return (
    <div className="flex flex-col h-full border rounded p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        <p className="text-sm text-gray-500">No messages yet.</p>
      </div>
      <form className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 p-2 rounded"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
