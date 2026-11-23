import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/layouts/Layout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { FarmerDashboard } from '@/pages/farmer/Dashboard'
import { CattleList } from '@/pages/farmer/CattleList'
import { CattleDetail } from '@/pages/farmer/CattleDetail'
import { AddCattle } from '@/pages/farmer/AddCattle'
import { HealthReportForm } from '@/pages/farmer/HealthReportForm'
import { ReportDetail } from '@/pages/farmer/ReportDetail'
import { AssessmentResult } from '@/pages/farmer/AssessmentResult'
import { VetDashboard } from '@/pages/vet/Dashboard'
import { VetReports } from '@/pages/vet/Reports'
import { VetReportReview } from '@/pages/vet/ReportReview'
import { VetConsultations } from '@/pages/vet/Consultations'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminReports } from '@/pages/admin/Reports'
import { AdminMap } from '@/pages/admin/Map'
import { AdminOutbreaks } from '@/pages/admin/Outbreaks'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function App() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected farmer routes */}
      <Route path="/farmer" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<FarmerDashboard />} />
        <Route path="cattle" element={<CattleList />} />
        <Route path="cattle/add" element={<AddCattle />} />
        <Route path="cattle/:id" element={<CattleDetail />} />
        <Route path="reports/new" element={<HealthReportForm />} />
        <Route path="reports/:id" element={<ReportDetail />} />
        <Route path="assessments/:id" element={<AssessmentResult />} />
      </Route>
      
      {/* Protected vet routes */}
      <Route path="/vet" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<VetDashboard />} />
        <Route path="reports" element={<VetReports />} />
        <Route path="reports/:id" element={<VetReportReview />} />
        <Route path="consultations" element={<VetConsultations />} />
      </Route>
      
      {/* Protected admin routes */}
      <Route path="/admin" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="map" element={<AdminMap />} />
        <Route path="outbreaks" element={<AdminOutbreaks />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
