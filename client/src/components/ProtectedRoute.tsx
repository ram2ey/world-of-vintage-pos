import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

interface Props {
  children: React.ReactNode
  requireManager?: boolean
}

export default function ProtectedRoute({ children, requireManager = false }: Props) {
  const staff = useAuthStore((s) => s.staff)

  if (!staff) return <Navigate to="/login" replace />
  if (requireManager && staff.role !== 'manager') return <Navigate to="/sell" replace />

  return <>{children}</>
}
