'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import api from '../lib/api'

export function useAuth() {
  const queryClient = useQueryClient()
  const pathname = usePathname()

  const isAuthPage = pathname.startsWith('/auth')

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    enabled: !isAuthPage,
    queryFn: async () => {
      try {
        const response = await api.get('/api/auth/me')
        return response.data.user
      } catch {
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    queryClient.setQueryData(['auth', 'me'], response.data.user)
    return response.data
  }

  const register = async (email, password, name) => {
    const response = await api.post('/api/auth/register', { email, password, name })
    queryClient.setQueryData(['auth', 'me'], response.data.user)
    return response.data
  }

  const logout = async () => {
    await api.post('/api/auth/logout')
    queryClient.setQueryData(['auth', 'me'], null)
    queryClient.clear()
  }

  return {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  }
}
