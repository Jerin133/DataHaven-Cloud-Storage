'use client'

import { useAuth } from '../../hooks/useAuth'
import { Search, Upload, FolderPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export function Header({ onUpload, onCreateFolder, onSearch, hideUpload = false, hideCreateFolder = false }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleSearch = (value) => {
    const params = new URLSearchParams(window.location.search)

    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }

    router.replace(`${window.location.pathname}?${params.toString()}`)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              <Image
                src="/logo.svg"
                alt="DataHaven Logo"
                width={55}
                height={55}
                className="object-contain"
                priority
              />
              <h1 className="text-xl font-semibold text-gray-900">
                DataHaven
              </h1>
            </div>
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md pl-40">
              <div className="absolute inset-y-0 left-0 pl-44 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search in Haven"
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-96 pl-12 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {!hideCreateFolder && (
              <button
                onClick={onCreateFolder}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="New Folder"
              >
                <FolderPlus className="h-5 w-5" />
              </button>
            )}
            
            {!hideUpload && (
              <button
                onClick={onUpload}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Upload"
              >
                <Upload className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center space-x-4 ml-4 border-l border-gray-200 pl-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
