import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/api';
import './AdminDashboard.css';

const API_URL = '';

interface DashboardStats {
  totalEscrowValue: number;
  escrowChange: number;
  pendingVerifications: number;
  activeJobs: number;
  openDisputes: number;
  totalUsers: number;
  totalArtisans: number;
  totalCustomers: number;
  verifiedArtisans: number;
  totalRevenue: number;
  totalVolume: number;
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
  flutterwave: 'operational' | 'degraded' | 'down';
  verifyMe: 'operational' | 'degraded' | 'down';
  mongodb: 'operational' | 'degraded' | 'down';
  lastLogin: string;
}

const AdminDashboard: React.FC = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEscrowValue: 0,
    escrowChange: 0,
    pendingVerifications: 0,
    activeJobs: 0,
    openDisputes: 0,
    totalUsers: 0,
    totalArtisans: 0,
    totalCustomers: 0,
    verifiedArtisans: 0,
    totalRevenue: 0,
    totalVolume: 0,
  });
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    flutterwave: 'operational',
    verifyMe: 'operational',
    mongodb: 'operational',
    lastLogin: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, verificationsRes, activitiesRes, healthRes] = await Promise.all([
        adminApi.get(`${API_URL}/admin/dashboard/stats`),
        adminApi.get(`${API_URL}/admin/dashboard/verifications`),
        adminApi.get(`${API_URL}/admin/dashboard/activities`),
        adminApi.get(`${API_URL}/admin/dashboard/health`),
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

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const activityIcon = (type: string) =>
    ({ registration: '👤', payment: '💰', dispute: '⚠️', verification: '✅', job: '🔨' }[type] || '📌');

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="spinner-large" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="dash animate-in">
      {/* ── KPI Cards ── */}
      <section className="kpi-grid">
        <div className="kpi-card accent-blue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-body">
            <span className="kpi-label">Total Escrow</span>
            <span className="kpi-value">{fmt(stats.totalEscrowValue)}</span>
            <span className={`kpi-change ${stats.escrowChange >= 0 ? 'up' : 'down'}`}>
              {stats.escrowChange >= 0 ? '↑' : '↓'} {Math.abs(stats.escrowChange)}%
            </span>
          </div>
        </div>
        <div className="kpi-card accent-gold">
          <div className="kpi-icon">📊</div>
          <div className="kpi-body">
            <span className="kpi-label">Platform Revenue</span>
            <span className="kpi-value">{fmt(stats.totalRevenue)}</span>
            <span className="kpi-sub">Commission earned</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">💳</div>
          <div className="kpi-body">
            <span className="kpi-label">Total Volume</span>
            <span className="kpi-value">{fmt(stats.totalVolume)}</span>
            <span className="kpi-sub">All transactions</span>
          </div>
        </div>
        <div className={`kpi-card ${stats.pendingVerifications > 50 ? 'accent-warn' : ''}`}>
          <div className="kpi-icon">🛠️</div>
          <div className="kpi-body">
            <span className="kpi-label">Pending Verifications</span>
            <span className="kpi-value">{stats.pendingVerifications}</span>
            <span className="kpi-sub">{stats.pendingVerifications > 50 ? '⚠️ High volume' : 'On track'}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🏗️</div>
          <div className="kpi-body">
            <span className="kpi-label">Active Jobs</span>
            <span className="kpi-value">{stats.activeJobs}</span>
            <span className="kpi-sub">Artisans at work</span>
          </div>
        </div>
        <div className={`kpi-card ${stats.openDisputes > 0 ? 'accent-danger' : ''}`}>
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-body">
            <span className="kpi-label">Open Disputes</span>
            <span className="kpi-value">{stats.openDisputes}</span>
            <span className="kpi-sub">{stats.openDisputes > 0 ? '🔴 Needs attention' : '✅ All clear'}</span>
          </div>
        </div>
      </section>

      {/* ── Users Row ── */}
      <section className="kpi-grid kpi-grid-3">
        <div className="kpi-card">
          <div className="kpi-icon">👥</div>
          <div className="kpi-body">
            <span className="kpi-label">Total Users</span>
            <span className="kpi-value">{stats.totalUsers.toLocaleString()}</span>
            <span className="kpi-sub">{stats.totalCustomers} customers · {stats.totalArtisans} artisans</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🔨</div>
          <div className="kpi-body">
            <span className="kpi-label">Artisans</span>
            <span className="kpi-value">{stats.totalArtisans}</span>
            <span className="kpi-sub">✅ {stats.verifiedArtisans} verified · ⏳ {stats.totalArtisans - stats.verifiedArtisans} pending</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-body">
            <span className="kpi-label">Customers</span>
            <span className="kpi-value">{stats.totalCustomers}</span>
            <span className="kpi-sub">Active customers</span>
          </div>
        </div>
      </section>

      {/* ── Two-column: Verification Queue + Activity Feed ── */}
      <div className="dash-columns">
        {/* Verification Queue */}
        <section className="panel dash-table-panel">
          <div className="panel-header">
            <h2 className="panel-title">Verification Queue</h2>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/verification')}>View All →</button>
          </div>
          <div className="panel-body no-pad">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Artisan</th>
                  <th>Trade</th>
                  <th>ID Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {verifications.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">✅ No pending verifications</td></tr>
                ) : (
                  verifications.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="cell-artisan">
                          <div className="cell-avatar">{v.profilePicture ? <img src={v.profilePicture} alt="" /> : v.name.charAt(0)}</div>
                          <span>{v.name}</span>
                        </div>
                      </td>
                      <td>{v.trade}</td>
                      <td><span className={`badge ${v.idStatus.toLowerCase().includes('pend') ? 'warning' : v.idStatus.toLowerCase().includes('ver') ? 'success' : 'info'}`}>{v.idStatus}</span></td>
                      <td>{timeAgo(v.submissionTime)}</td>
                      <td><button className="btn btn-primary btn-sm" onClick={() => navigate(`/verification/${v.id}`)}>Review</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity Feed */}
        <aside className="panel dash-activity">
          <div className="panel-header">
            <h3 className="panel-title">Live Activity</h3>
            <span className="live-dot">● LIVE</span>
          </div>
          <div className="panel-body activity-scroll">
            {activities.map((a) => (
              <div key={a.id} className="activity-row">
                <span className="activity-emoji">{activityIcon(a.type)}</span>
                <div className="activity-text">
                  <p>{a.message}</p>
                  <small>{timeAgo(a.timestamp)}</small>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="empty-state-text">No recent activity</p>}
          </div>
        </aside>
      </div>

      {/* ── System Health Bar ── */}
      <section className="health-bar">
        <div className="health-group">
          <span className="health-label">API Status</span>
          <div className="health-items">
            {(['flutterwave', 'verifyMe', 'mongodb'] as const).map((svc) => (
              <div key={svc} className={`health-pill ${systemHealth[svc]}`}>
                <span className="health-dot" />
                <span>{svc === 'verifyMe' ? 'VerifyMe' : svc.charAt(0).toUpperCase() + svc.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="health-group">
          <span className="health-label">Last login</span>
          <span className="health-value">{admin?.name} · {systemHealth.lastLogin || 'Just now'}</span>
        </div>
        <span className="health-copy">© 2026 TrustConnect</span>
      </section>
    </div>
  );
};

export default AdminDashboard;
