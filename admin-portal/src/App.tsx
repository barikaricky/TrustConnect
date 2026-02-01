import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TwoFactorPage from './pages/TwoFactorPage';
import AdminDashboard from './pages/AdminDashboard';
import VerificationCenter from './pages/VerificationCenter';
import ArtisanReview from './pages/ArtisanReview';
import { AuthProvider, useAuth } from './context/AuthContext';
import PageLoader from './components/PageLoader';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
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
                  <PrivateRoute>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/verification"
                element={
                  <PrivateRoute>
                    <VerificationCenter />
                  </PrivateRoute>
                }
              />
              <Route
                path="/verification/:id"
                element={
                  <PrivateRoute>
                    <ArtisanReview />
                  </PrivateRoute>
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
