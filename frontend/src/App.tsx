import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Sparkles } from 'lucide-react';

// Lazy-loaded route components for high performance and minimal initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const WizardPage = lazy(() => import('./pages/WizardPage').then((m) => ({ default: m.WizardPage })));
const ItineraryPage = lazy(() => import('./pages/ItineraryPage').then((m) => ({ default: m.ItineraryPage })));
const TripDetailsPage = lazy(() => import('./pages/TripDetailsPage').then((m) => ({ default: m.TripDetailsPage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const SharedTripPage = lazy(() => import('./pages/SharedTripPage').then((m) => ({ default: m.SharedTripPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <Sparkles className="w-8 h-8 text-forest-700 animate-spin" />
    <span className="text-sm font-medium text-slate-500">Loading view...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-sand-50">
          <Navbar />
          <main className="flex-1">
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/wizard" element={<WizardPage />} />
                <Route path="/preferences" element={<WizardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/my-trips" element={<DashboardPage />} />
                <Route path="/trips/:id" element={<TripDetailsPage />} />
                <Route path="/trips/:tripId" element={<TripDetailsPage />} />
                <Route path="/trips/:id/classic" element={<ItineraryPage />} />
                <Route path="/share/:token" element={<SharedTripPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
