export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl animate-spin"></div>
            <div className="absolute inset-2 bg-white rounded-xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium gradient-text">
          Loading AI Square CMS
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Preparing your content management experience...
        </p>
      </div>
    </div>
  );
}
