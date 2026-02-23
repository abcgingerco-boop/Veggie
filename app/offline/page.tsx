'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">~</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You are offline
        </h1>
        <p className="text-gray-600 mb-6 text-sm">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
