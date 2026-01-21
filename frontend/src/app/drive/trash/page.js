'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sidebar, Header, FolderItem, FileItem, Loading } from '../../../components'
import api from '../../../lib/api'
import { Trash2, RotateCcw, MoreVertical } from 'lucide-react'
import { useState } from 'react'

const TRASH_RETENTION_DAYS = 30

function daysLeft(deletedAt) {
  const deleted = new Date(deletedAt)
  const expires = new Date(deleted)
  expires.setDate(expires.getDate() + TRASH_RETENTION_DAYS)

  const diff = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function TrashPage() {
  const queryClient = useQueryClient()

  /* 🗑️ Fetch trash */
  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: async () => {
      const res = await api.get('/api/trash')
      return res.data.trash
    }
  })

  const [openMenu, setOpenMenu] = useState(null);
  const toggleMenu = key =>
    setOpenMenu(prev => (prev === key ? null : key));

  const [selected, setSelected] = useState(new Set());

    const toggleSelect = (key) => {
    setSelected(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
    });
    };

    const clearSelection = () => setSelected(new Set());

    const bulkRestore = async () => {
    await Promise.all(
        [...selected].map(id => {
        const [type, resourceId] = id.split(':');
        return api.post('/api/trash/restore', {
            resourceType: type,
            resourceId
        });
        })
    );

    clearSelection();
    queryClient.invalidateQueries(['trash']);
    queryClient.invalidateQueries(['recent']);
    };

  /* ♻️ Restore */
  const restoreMutation = useMutation({
    mutationFn: ({ resourceType, resourceId }) =>
      api.post('/api/trash/restore', { resourceType, resourceId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['trash'])
      queryClient.invalidateQueries(['recent'])
    }
  })

  const deletePermanently = async (item) => {
    await api.delete('/api/trash/item', {
      data: {
        resourceType: item.type,
        resourceId: item.data.id
      }
    });

    queryClient.invalidateQueries(['trash']);
  };

  /* ❌ Empty trash */
  const emptyTrash = async () => {
    const confirmed = window.confirm(
      'All items in trash will be permanently deleted. This action cannot be undone. Continue?'
    );

    if (!confirmed) {
      return; // user clicked Cancel
    }

    await api.delete('/api/trash/empty');
    queryClient.invalidateQueries(['trash']);
  };

  if (isLoading) return <Loading fullScreen />

  const items = [
    ...(data.folders || []).map(f => ({
      type: 'folder',
      data: f
    })),
    ...(data.files || []).map(f => ({
      type: 'file',
      data: f
    }))
  ].sort(
    (a, b) => new Date(b.data.updated_at) - new Date(a.data.updated_at)
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 overflow-y-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center justify-center gap-2 rounded-md hover:bg-gray-200 text-base text-gray-600 w-20 h-10">
                <Trash2 className="w-5 h-5" />
                <h1 className="font-semibold">Trash</h1>
            </div>
          </div>

          <div className="mb-6 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-600 flex items-center justify-between">
            Items in trash will be deleted after 30 days.

            <button
              onClick={emptyTrash}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
              Empty trash
            </button>

          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-4 mb-4 bg-blue-50 px-4 py-2 rounded-md">
                <span className="text-sm">
                {selected.size} selected
                </span>

                <button
                onClick={bulkRestore}
                className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                <RotateCcw className="w-4 h-4" />
                Restore
                </button>

                <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:underline"
                >
                Clear
                </button>
            </div>
            )}

          {items.length === 0 && (
            <div className="h-[50vh] flex items-center justify-center">
              <p className="text-gray-600 text-sm">Trash is empty</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => {
                const key = `${item.type}:${item.data.id}`;

                const restore = () =>
                restoreMutation.mutate({
                    resourceType: item.type,
                    resourceId: item.data.id
                });

                const isSelected = selected.has(key);

                return (
                <div
                  key={key}
                  className={`relative rounded-lg transition
                    ${isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-white-100'
                    }`}
                >
                    {/* Selection checkbox */}
                    <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggleSelect(key)}
                    className="absolute top-2 left-2 z-10"
                    />

                    {openMenu === key && (
                      <div className="absolute right-2 top-10 bg-white border rounded-md shadow-lg z-30 w-32">
                        <button
                          onClick={() => {
                            restore();
                            setOpenMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>

                        <button
                          onClick={() => {
                            deletePermanently(item);
                            setOpenMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleMenu(key)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-transparent z-20"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    <div className="pointer-events-none">
                      {item.type === 'folder' ? (
                        <FolderItem folder={item.data} />
                      ) : (
                        <FileItem file={item.data} />
                      )}
                    </div>
                </div>
                );
            })}
            </div>
        </main>
      </div>
    </div>
  )
}
