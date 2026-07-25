import { useMutation } from '@tanstack/react-query'
import { api, type LoginRequest } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

export function useLoginMutation() {
  return useMutation({
    mutationFn: (dto: LoginRequest) => api.login(dto),
  })
}

export function useLoadMeMutation() {
  const setSession = useSessionStore((s) => s.setSession)
  return useMutation({
    mutationFn: async (token: string) => {
      useSessionStore.setState({ token })
      const me = await api.me()
      setSession(token, me)
      return me
    },
  })
}
