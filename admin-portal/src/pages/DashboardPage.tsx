import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { admin, logout } = useAuth();

  useEffect(() => {
    // Session timeout after 30 minutes of inactivity
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        alert('Session expired due to inactivity');
        logout();
        navigate('/login');
      }, 30 * 60 * 1000); // 30 minutes
    };

    resetTimeout();
    
    // Reset timeout on user activity
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keypress', resetTimeout);
    window.addEventListener('click', resetTimeout);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('click', resetTimeout);
    };
  }, [logout, navigate]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const getRoleDisplay = (role: string) => {
    const roles: Record<string, string> = {
      'super-admin': 'Super Administrator',
      'verification-officer': 'Verification Officer',
      'support-admin': 'Support Administrator',
      'finance-admin': 'Finance Administrator',
    };
    return roles[role] || role;
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2"/>
              <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>TrustConnect Admin</span>
          </div>
        </div>

        <div className="header-right">
          <div className="admin-info">
            <div className="admin-details">
              <span className="admin-name">{admin?.name}</span>
              <span className="admin-role">{getRoleDisplay(admin?.role || '')}</span>
            </div>
            <button onClick={handleLogout} className="logout-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h1>Welcome to the Admin Console</h1>
          <p>Secure management interface for TrustConnect platform operations</p>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          {admin?.role === 'super-admin' && (
            <>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2"/>
                    <circle cx="9" cy="7" r="4" strokeWidth="2"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Users</p>
                  <p className="stat-value">Coming Soon</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Active Jobs</p>
                  <p className="stat-value">Coming Soon</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Escrow Balance</p>
                  <p className="stat-value">Coming Soon</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">System Health</p>
                  <p className="stat-value">Operational</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Role-specific message */}
        <div className="info-card">
          <h2>🚀 Dashboard Under Construction</h2>
          <p>
            Your role: <strong>{getRoleDisplay(admin?.role || '')}</strong>
          </p>
          <p>
            Full dashboard features are being developed. You will have access to:
          </p>
          <ul>
            {admin?.role === 'super-admin' && (
              <>
                <li>✅ Complete system overview</li>
                <li>✅ All administrative functions</li>
                <li>✅ Audit logs and security monitoring</li>
                <li>✅ User and staff management</li>
              </>
            )}
            {admin?.role === 'verification-officer' && (
              <>
                <li>✅ Pending artisan verifications</li>
                <li>✅ Document review interface</li>
                <li>✅ Verification history</li>
              </>
            )}
            {admin?.role === 'support-admin' && (
              <>
                <li>✅ Customer support tickets</li>
                <li>✅ Live chat interface</li>
                <li>✅ Dispute resolution</li>
              </>
            )}
            {admin?.role === 'finance-admin' && (
              <>
                <li>✅ Escrow wallet management</li>
                <li>✅ Payout processing</li>
                <li>✅ Financial reports</li>
              </>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
