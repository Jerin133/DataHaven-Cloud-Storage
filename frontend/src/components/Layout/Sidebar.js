'use client'

import { Folder, Star, Clock, Trash2, Share2, HardDrive } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const navItems = [
  { id: 'drive', label: 'My Drive', icon: HardDrive, path: '/drive' },
  { id: 'shared', label: 'Shared with me', icon: Share2, path: '/drive/shared' },
  { id: 'starred', label: 'Starred', icon: Star, path: '/drive/starred' },
  { id: 'recent', label: 'Recent', icon: Clock, path: '/drive/recent' },
  { id: 'trash', label: 'Trash', icon: Trash2, path: '/drive/trash' },
]

export function Sidebar() {
  const pathname = usePathname()

  const { data } = useQuery({
    queryKey: ['storage'],
    queryFn: async () => {
      const res = await api.get('/api/users/storage');
      return res.data;
    }
  });

  const used = data?.used || 0;
  const limit = data?.limit || 1;
  const percent = Math.min((used / limit) * 100, 100);

  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-screen flex flex-col">
      <nav className="p-4 space-y-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex items-center space-x-3 px-4 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Storage Info */}
      <div className="mx-3 mb-4 p-4 rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Storage usage
          </span>
          <span className="text-xs font-semibold text-primary-600">
            {Math.round(percent)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="text-xs text-gray-500 mt-2">
          {formatBytes(used)} of {formatBytes(limit)} used
        </div>
      </div>
    </aside>
  )
}
