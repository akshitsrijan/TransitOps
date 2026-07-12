import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { SettingsProvider } from './context/SettingsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Drivers from './pages/Drivers'
import Trips from './pages/Trips'
import Maintenance from './pages/Maintenance'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="/vehicles" element={<ProtectedRoute page="vehicles"><Vehicles /></ProtectedRoute>} />
              <Route path="/drivers" element={<ProtectedRoute page="drivers"><Drivers /></ProtectedRoute>} />
              <Route path="/trips" element={<ProtectedRoute page="trips"><Trips /></ProtectedRoute>} />
              <Route path="/maintenance" element={<ProtectedRoute page="maintenance"><Maintenance /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute page="expenses"><Expenses /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute page="reports"><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute managerOnly><Settings /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
