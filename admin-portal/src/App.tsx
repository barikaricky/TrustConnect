import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TwoFactorPage from './pages/TwoFactorPage';
import AdminDashboard from './pages/AdminDashboard';
import VerificationCenter from './pages/VerificationCenter';
import ArtisanReview from './pages/ArtisanReview';
import DisputeCenter from './pages/DisputeCenter';
import TransactionLogs from './pages/TransactionLogs';
import UserManagement from './pages/UserManagement';
import BroadcastPage from './pages/BroadcastPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PageLoader from './components/PageLoader';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PrivateRouteWithLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization (checking auth, loading config, etc.)
    const initializeApp = async () => {
      try {
        // Add any initialization logic here (e.g., checking stored auth tokens)
        await new Promise(resolve => setTimeout(resolve, 2000)); // Minimum loading time for smooth UX
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <PageLoader isLoading={isLoading} />
      {!isLoading && (
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/2fa" element={<TwoFactorPage />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRouteWithLayout>
                    <AdminDashboard />
                  </PrivateRouteWithLayout>
                }
              />
              <Route
                path="/verification"
                element={
                  <PrivateRouteWithLayout>
                    <VerificationCenter />
                  </PrivateRouteWithLayout>
                }
              />
              <Route
                path="/verification/:id"
                element={
                  <PrivateRouteWithLayout>
                    <ArtisanReview />
                  </PrivateRouteWithLayout>
                }
              />
              <Route
                path="/disputes"
                element={
                  <PrivateRouteWithLayout>
                    <DisputeCenter />
                  </PrivateRouteWithLayout>
                }
              />
              <Route
                path="/transactions"
                element={
                  <PrivateRouteWithLayout>
                    <TransactionLogs />
                  </PrivateRouteWithLayout>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRouteWithLayout>
                    <UserManagement />
                  </PrivateRouteWithLayout>
                }
              />
              <Route
                path="/broadcast"
                element={
                  <PrivateRouteWithLayout>
                    <BroadcastPage />
                  </PrivateRouteWithLayout>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      )}
    </>
  );
}

export default App;
