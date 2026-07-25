/** Garde de route par capacité — équivalent de PermissionGate (SARIS), adapté au modèle ULAMU. */
import { Navigate } from 'react-router-dom'
import { useCapabilities, type Capability } from '@/hooks/useCapabilities'

export function CapabilityGate({
  any,
  redirect = '/dashboard',
  children,
}: {
  any: Capability[]
  redirect?: string
  children: React.ReactNode
}) {
  const { hasAny } = useCapabilities()
  if (!hasAny(...any)) return <Navigate to={redirect} replace />
  return <>{children}</>
}
