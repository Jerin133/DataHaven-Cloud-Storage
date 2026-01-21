'use client'

import { LayoutGrid, List } from 'lucide-react'

export function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1">
      <button
        onClick={() => setViewMode('grid')}
        className={`p-2 rounded ${
          viewMode === 'grid'
            ? 'bg-gray-200 text-gray-900'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      <button
        onClick={() => setViewMode('list')}
        className={`p-2 rounded ${
          viewMode === 'list'
            ? 'bg-gray-200 text-gray-900'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  )
}
