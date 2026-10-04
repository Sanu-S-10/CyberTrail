// src/App.tsx
// Root application for the temporary analysis workflow.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Layouts & Providers
import { AppShell } from '@/layouts/AppShell'
import { AnalysisProvider } from '@/contexts/AnalysisContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Pages
import { HomePage } from '@/pages/HomePage'
import { UploadPage } from '@/pages/UploadPage'
import { ProcessingPage } from '@/pages/ProcessingPage'
import { MoneyTrailPage } from '@/pages/MoneyTrailPage'
import { TransactionExplorerPage } from '@/pages/TransactionExplorerPage'
import { EvidencePage } from '@/pages/EvidencePage'
import { ReportsPage } from '@/pages/ReportsPage'

export default function App() {
  return (
    <ThemeProvider>
      <AnalysisProvider>
        <BrowserRouter>
          <Routes>
            {/* Standalone Home Landing Page */}
            <Route path="/" element={<HomePage />} />

            {/* Application Shell Routes */}
            <Route element={<AppShell />}>
              <Route path="/cases/upload" element={<UploadPage />} />
              <Route path="/cases/:id/processing" element={<ProcessingPage />} />
              <Route path="/cases/:id/money-trail" element={<MoneyTrailPage />} />
              <Route path="/transactions" element={<TransactionExplorerPage />} />
              <Route path="/money-trail"  element={<MoneyTrailPage />} />
              <Route path="/evidence"     element={<EvidencePage />} />
              <Route path="/reports"      element={<ReportsPage />} />
            </Route>

            {/* Catch-all redirect to Home Page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AnalysisProvider>
    </ThemeProvider>
  )
}
