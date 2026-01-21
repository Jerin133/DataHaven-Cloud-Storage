'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Sidebar, Header, FolderItem, FileItem, Loading } from '../../../components'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../lib/api'
import { ChevronRight, Clock } from 'lucide-react'

function groupRecentItems(items) {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groups = {
    today: [],
    yesterday: [],
    last7Days: [],
    last30Days: [],
    older: []
  };

  items.forEach(item => {
    const date = new Date(item.lastOpenedAt);

    if (date >= startOfToday) {
      groups.today.push(item);
    } else if (date >= startOfYesterday) {
      groups.yesterday.push(item);
    } else if (date >= sevenDaysAgo) {
      groups.last7Days.push(item);
    } else if (date >= thirtyDaysAgo) {
      groups.last30Days.push(item);
    } else {
      groups.older.push(item);
    }
  });

  return groups;
}

export default function RecentPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])

  /* ⭐ starred items */
  const { data: starredItems = [] } = useQuery({
    queryKey: ['stars'],
    queryFn: async () => {
      const res = await api.get('/api/stars')
      return [
        ...(res.data.folders || []).map(f => ({
          resource_type: 'folder',
          resource_id: f.id
        })),
        ...(res.data.files || []).map(f => ({
          resource_type: 'file',
          resource_id: f.id
        }))
      ]
    },
    enabled: !!user
  })

  /* 🕒 recent items */
  const { data, isLoading } = useQuery({
    queryKey: ['recent', currentFolderId],
    queryFn: async () => {
      const res = await api.get('/api/recent', {
        params: currentFolderId ? { folderId: currentFolderId } : {}
      });
      return res.data.items || [];
    },
    enabled: !!user
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  if (authLoading || isLoading) return <Loading fullScreen />

  const grouped = groupRecentItems(data);

  /* split ordered items */
  const folders = data.filter(i => i.type === 'folder').map(i => i.data)
  const files = data.filter(i => i.type === 'file').map(i => i.data)

  const openFolder = async (folder) => {
    await api.post('/api/recent/touch', {
      resourceType: 'folder',
      resourceId: folder.id
    })

    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
  }

  const downloadFile = async (file) => {
    await api.post('/api/recent/touch', {
      resourceType: 'file',
      resourceId: file.id
    })

    const res = await api.get(`/api/files/${file.id}/download`)
    window.open(res.data.downloadUrl, '_blank')
  }

  const openFilePreview = async (file) => {
    // mark recent
    await api.post('/api/recent/touch', {
      resourceType: 'file',
      resourceId: file.id
    })

    // get signed URL
    const res = await api.get(`/api/files/${file.id}/download`)
    const fileUrl = res.data.downloadUrl

    const mime = file.mime_type || ''

    // 🔹 Word / Excel → Google Docs Viewer
    if (
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('sheet')
    ) {
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
        fileUrl
      )}&embedded=true`

      window.open(viewerUrl, '_blank')
      return
    }

    // 🔹 Everything else → normal preview
    window.open(fileUrl, '_blank')
  }

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setBreadcrumbs([])
      setCurrentFolderId(null)
      return
    }
    const next = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(next)
    setCurrentFolderId(next[index].id)
  }

  const isStarred = (item, type) => {
    if (!item?.id) return false

    return starredItems.some(
      s => s.resource_type === type && s.resource_id === item.id
    )
  }

  const renderSection = (title, items) => {
    if (!items.length) return null;

    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => {
            if (item.type === 'folder') {
              return (
                <FolderItem
                  key={`folder-${item.data.id}`}
                  folder={item.data}
                  onClick={openFolder}
                  isStarred={isStarred(item.data, 'folder')}
                />
              );
            }

            return (
              <FileItem
                key={`file-${item.data.id}`}
                file={item.data}
                onOpen={openFilePreview}
                onDownload={downloadFile}
                isStarred={isStarred(item.data, 'file')}
              />
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header hideUpload hideCreateFolder />

        <main className="flex-1 overflow-y-auto">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-base text-gray-600 pt-4 pl-3">
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200"
            >
              <Clock className="w-5 h-5" />
              <span className="font-medium">Recent</span>
            </button>

            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`px-3 py-2 rounded-md ${
                    index === breadcrumbs.length - 1
                      ? 'bg-gray-200 font-medium'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-8">

            {renderSection('Today', grouped.today)}
            {renderSection('Yesterday', grouped.yesterday)}
            {renderSection('Last 7 days', grouped.last7Days)}
            {renderSection('Last 30 days', grouped.last30Days)}
            {renderSection('Older', grouped.older)}

          </div>
        </main>
      </div>
    </div>
  )
}
