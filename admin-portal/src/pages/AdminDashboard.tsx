import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface DashboardStats {
  totalEscrowValue: number;
  escrowChange: number;
  pendingVerifications: number;
  activeJobs: number;
  openDisputes: number;
}

interface VerificationItem {
  id: number;
  name: string;
  trade: string;
  idStatus: string;
  submissionTime: string;
  profilePicture?: string;
}

interface ActivityItem {
  id: number;
  message: string;
  timestamp: string;
  type: 'registration' | 'payment' | 'dispute' | 'verification' | 'job';
}

interface SystemHealth {
  smileId: 'operational' | 'degraded' | 'down';
  paystack: 'operational' | 'degraded' | 'down';
  lastLogin: string;
}

const AdminDashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEscrowValue: 0,
    escrowChange: 0,
    pendingVerifications: 0,
    activeJobs: 0,
    openDisputes: 0,
  });
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    smileId: 'operational',
    paystack: 'operational',
    lastLogin: '',
  });
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, verificationsRes, activitiesRes, healthRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard/stats`, { headers }),
        axios.get(`${API_URL}/admin/dashboard/verifications`, { headers }),
        axios.get(`${API_URL}/admin/dashboard/activities`, { headers }),
        axios.get(`${API_URL}/admin/dashboard/health`, { headers }),
      ]);

      setStats(statsRes.data.stats);
      setVerifications(verificationsRes.data.verifications);
      setActivities(activitiesRes.data.activities);
      setSystemHealth(healthRes.data.health);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🛡️ TrustConnect Admin</h1>
          <span className="header-subtitle">Command Center</span>
        </div>
        <div className="header-right">
          <div className="admin-info">
            <div className="admin-avatar">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <div className="admin-details">
              <span className="admin-name">{admin?.name}</span>
              <span className="admin-role">{admin?.role?.replace('-', ' ')}</span>
            </div>
          </div>
          <button onClick={logout} className="logout-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="16 17 21 12 16 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar Navigation */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveSection('dashboard')}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Dashboard Home</span>
            </button>
            <button
              className={`nav-item ${activeSection === 'verification' ? 'active' : ''}`}
              onClick={() => navigate('/verification')}
            >
              <span className="nav-icon">🛠️</span>
              <span className="nav-text">Verification Center</span>
              {stats.pendingVerifications > 0 && (
                <span className="nav-badge">{stats.pendingVerifications}</span>
              )}
            </button>
            <button
              className={`nav-item ${activeSection === 'disputes' ? 'active' : ''}`}
              onClick={() => setActiveSection('disputes')}
            >
              <span className="nav-icon">⚖️</span>
              <span className="nav-text">Dispute Resolution</span>
              {stats.openDisputes > 0 && (
                <span className="nav-badge danger">{stats.openDisputes}</span>
              )}
            </button>
            <button
              className={`nav-item ${activeSection === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveSection('transactions')}
            >
              <span className="nav-icon">💳</span>
              <span className="nav-text">Transaction Logs</span>
            </button>
            <button
              className={`nav-item ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => setActiveSection('users')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">User Management</span>
            </button>
            <button
              className={`nav-item ${activeSection === 'broadcast' ? 'active' : ''}`}
              onClick={() => setActiveSection('broadcast')}
            >
              <span className="nav-icon">📢</span>
              <span className="nav-text">Broadcast</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Stats at a Glance */}
          <section className="stats-section">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-icon">💰</span>
                <span className="stat-title">Total Escrow Value</span>
              </div>
              <div className="stat-value">{formatCurrency(stats.totalEscrowValue)}</div>
              <div className={`stat-change ${stats.escrowChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.escrowChange >= 0 ? '↑' : '↓'} {Math.abs(stats.escrowChange)}% from yesterday
              </div>
            </div>

            <div className={`stat-card ${stats.pendingVerifications > 50 ? 'warning' : ''}`}>
              <div className="stat-header">
                <span className="stat-icon">🛠️</span>
                <span className="stat-title">Pending Verifications</span>
              </div>
              <div className="stat-value">{stats.pendingVerifications}</div>
              <div className="stat-subtitle">
                {stats.pendingVerifications > 50 ? '⚠️ High volume - team slow' : 'On track'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-icon">🏗️</span>
                <span className="stat-title">Active Jobs</span>
              </div>
              <div className="stat-value">{stats.activeJobs}</div>
              <div className="stat-subtitle">Artisans at work</div>
            </div>

            <div className={`stat-card ${stats.openDisputes > 0 ? 'danger' : ''}`}>
              <div className="stat-header">
                <span className="stat-icon">⚠️</span>
                <span className="stat-title">Open Disputes</span>
              </div>
              <div className="stat-value">{stats.openDisputes}</div>
              <div className="stat-subtitle">
                {stats.openDisputes > 0 ? '🔴 Requires immediate attention' : '✅ All resolved'}
              </div>
            </div>
          </section>

          {/* Verification Queue Table */}
          <section className="verification-section">
            <div className="section-header">
              <h2>Verification Queue</h2>
              <button className="view-all-button">View All →</button>
            </div>
            <div className="verification-table">
              <table>
                <thead>
                  <tr>
                    <th>Artisan Name</th>
                    <th>Trade</th>
                    <th>ID Status</th>
                    <th>Submission Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="no-data">
                        ✅ No pending verifications
                      </td>
                    </tr>
                  ) : (
                    verifications.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="artisan-cell">
                            <div className="artisan-avatar">
                              {item.profilePicture ? (
                                <img src={item.profilePicture} alt={item.name} />
                              ) : (
                                item.name.charAt(0)
                              )}
                            </div>
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td>{item.trade}</td>
                        <td>
                          <span className={`status-badge ${item.idStatus.toLowerCase().replace(' ', '-')}`}>
                            {item.idStatus}
                          </span>
                        </td>
                        <td>{getTimeAgo(item.submissionTime)}</td>
                        <td>
                          <button className="review-button">Review Details</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {/* Live Activity Feed */}
        <aside className="activity-sidebar">
          <div className="activity-header">
            <h3>Live Activity</h3>
            <span className="live-indicator">🔴 LIVE</span>
          </div>
          <div className="activity-feed">
            {activities.map((activity) => (
              <div key={activity.id} className={`activity-item ${activity.type}`}>
                <div className="activity-icon">
                  {activity.type === 'registration' && '👤'}
                  {activity.type === 'payment' && '💰'}
                  {activity.type === 'dispute' && '⚠️'}
                  {activity.type === 'verification' && '✅'}
                  {activity.type === 'job' && '🔨'}
                </div>
                <div className="activity-content">
                  <p className="activity-message">{activity.message}</p>
                  <span className="activity-time">{getTimeAgo(activity.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* System Health Footer */}
      <footer className="dashboard-footer">
        <div className="footer-section">
          <h4>API Status</h4>
          <div className="api-status">
            <div className={`status-item ${systemHealth.smileId}`}>
              <span className="status-dot"></span>
              <span>Smile ID</span>
            </div>
            <div className={`status-item ${systemHealth.paystack}`}>
              <span className="status-dot"></span>
              <span>Paystack</span>
            </div>
          </div>
        </div>
        <div className="footer-section">
          <h4>Admin Logs</h4>
          <p>Last login: {admin?.name} at {systemHealth.lastLogin || 'Just now'}</p>
        </div>
        <div className="footer-section">
          <p className="footer-copyright">© 2026 TrustConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
