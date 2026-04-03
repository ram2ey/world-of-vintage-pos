import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Sell from './pages/Sell'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">
          World of Vintage POS
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
        <p className="text-sm text-gray-400 mt-1">Coming soon</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — wrapped in sidebar layout */}
        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <Layout><Sell /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Layout><ComingSoon name="Customers" /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute requireManager>
              <Layout><ComingSoon name="Inventory" /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireManager>
              <Layout><ComingSoon name="Dashboard" /></Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/sell" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
