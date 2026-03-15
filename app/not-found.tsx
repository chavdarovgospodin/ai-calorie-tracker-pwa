import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
          404
        </h1>
        <p className="text-lg font-semibold text-[#F8FAFC] mb-1">Page not found</p>
        <p className="text-sm text-[#64748B] mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-2.5 font-semibold transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
