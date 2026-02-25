import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/api';
import './UserManagement.css';

const API_BASE_URL = '';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  verified: boolean;
  suspended: boolean;
  createdAt: string;
  avatar: string | null;
  walletBalance: number;
  artisanProfile: {
    trade: string;
    verificationStatus: string;
    yearsExperience: number;
  } | null;
}

interface UserStats {
  totalUsers: number;
  totalArtisans: number;
  totalCustomers: number;
  suspendedUsers: number;
}

interface UserDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  verified: boolean;
  suspended: boolean;
  createdAt: string;
  avatar: string | null;
  walletBalance: number;
  escrowAmount: number;
  artisanProfile: any;
  stats: {
    bookings: number;
    transactions: number;
    totalTransactionValue: number;
  };
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, totalArtisans: 0, totalCustomers: 0, suspendedUsers: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ role: 'all', status: 'all', search: '' });
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [suspendModal, setSuspendModal] = useState<{ userId: string; name: string; suspended: boolean } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.role !== 'all') params.append('role', filters.role);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));

      const response = await adminApi.get(`${API_BASE_URL}/admin/users?${params}`);

      if (response.data.success) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetail = async (userId: string) => {
    try {
      const response = await adminApi.get(`${API_BASE_URL}/admin/users/${userId}`);
      if (response.data.success) {
        setSelectedUser(response.data.user);
      }
    } catch (error) {
      console.error('Load user detail error:', error);
    }
  };

  const handleSuspendToggle = async () => {
    if (!suspendModal) return;
    try {
      setActionLoading(true);
      await adminApi.patch(
        `${API_BASE_URL}/admin/users/${suspendModal.userId}/suspend`,
        { suspended: !suspendModal.suspended, reason: suspendReason },
      );
      setSuspendModal(null);
      setSuspendReason('');
      loadUsers();
      if (selectedUser?.id === suspendModal.userId) {
        loadUserDetail(suspendModal.userId);
      }
    } catch (error) {
      console.error('Suspend toggle error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getVerifBadge = (status: string) => {
    switch (status) {
      case 'verified': return <span className="badge badge-verified">✅ Verified</span>;
      case 'pending': return <span className="badge badge-pending">⏳ Pending</span>;
      case 'rejected': return <span className="badge badge-rejected">❌ Rejected</span>;
      default: return <span className="badge badge-unsubmitted">📝 Unsubmitted</span>;
    }
  };

  return (
    <div className="um-page">
      {/* Stats */}
      <section className="um-stats">
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-label">Total Users</p>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🛠️</span>
          <div>
            <p className="stat-label">Artisans</p>
            <p className="stat-value">{stats.totalArtisans}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏠</span>
          <div>
            <p className="stat-label">Customers</p>
            <p className="stat-value">{stats.totalCustomers}</p>
          </div>
        </div>
        <div className="stat-card danger">
          <span className="stat-icon">🚫</span>
          <div>
            <p className="stat-label">Suspended</p>
            <p className="stat-value">{stats.suspendedUsers}</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="um-filters">
        <input
          type="text"
          placeholder="Search by name, phone, email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="filter-search"
        />
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="artisan">Artisans</option>
          <option value="customer">Customers</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="suspended">Suspended</option>
        </select>
      </section>

      <div className="um-content">
        {/* User List */}
        <div className="um-list">
          {loading ? (
            <div className="um-loading">
              <div className="spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="um-empty">
              <p>👥 No users found</p>
            </div>
          ) : (
            <div className="user-cards">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`user-card ${selectedUser?.id === user.id ? 'selected' : ''} ${user.suspended ? 'suspended' : ''}`}
                  onClick={() => loadUserDetail(user.id)}
                >
                  <div className="user-card-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <span>{user.name?.charAt(0) || '?'}</span>
                    )}
                    <span className={`role-dot ${user.role}`}></span>
                  </div>
                  <div className="user-card-info">
                    <h3>{user.name} {user.suspended && <span className="suspended-tag">SUSPENDED</span>}</h3>
                    <p className="user-phone">{user.phone}</p>
                    <div className="user-meta">
                      <span className={`role-tag ${user.role}`}>{user.role}</span>
                      {user.artisanProfile && getVerifBadge(user.artisanProfile.verificationStatus)}
                    </div>
                  </div>
                  <div className="user-card-actions">
                    <span className="wallet-bal">{formatCurrency(user.walletBalance)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="um-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                ←
              </button>
              <span>{pagination.page} / {pagination.pages}</span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* User Detail Panel */}
        <div className="um-detail">
          {selectedUser ? (
            <>
              <div className="detail-header">
                <div className="detail-avatar">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} />
                  ) : (
                    <span>{selectedUser.name?.charAt(0) || '?'}</span>
                  )}
                </div>
                <h2>{selectedUser.name}</h2>
                <p className="detail-role">{selectedUser.role}</p>
                {selectedUser.suspended && <span className="suspended-banner">🚫 ACCOUNT SUSPENDED</span>}
              </div>

              <div className="detail-section">
                <h3>Contact Information</h3>
                <div className="detail-row">
                  <span>Phone</span>
                  <span>{selectedUser.phone}</span>
                </div>
                <div className="detail-row">
                  <span>Email</span>
                  <span>{selectedUser.email || '—'}</span>
                </div>
                <div className="detail-row">
                  <span>Joined</span>
                  <span>{formatDate(selectedUser.createdAt)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Financial</h3>
                <div className="detail-row">
                  <span>Wallet Balance</span>
                  <span className="amount">{formatCurrency(selectedUser.walletBalance)}</span>
                </div>
                <div className="detail-row">
                  <span>Escrow Held</span>
                  <span>{formatCurrency(selectedUser.escrowAmount)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Activity</h3>
                <div className="detail-row">
                  <span>Total Bookings</span>
                  <span>{selectedUser.stats.bookings}</span>
                </div>
                <div className="detail-row">
                  <span>Transactions</span>
                  <span>{selectedUser.stats.transactions}</span>
                </div>
                <div className="detail-row">
                  <span>Total Value</span>
                  <span>{formatCurrency(selectedUser.stats.totalTransactionValue)}</span>
                </div>
              </div>

              {selectedUser.artisanProfile && (
                <div className="detail-section">
                  <h3>Artisan Profile</h3>
                  <div className="detail-row">
                    <span>Trade</span>
                    <span>{selectedUser.artisanProfile.primarySkill || selectedUser.artisanProfile.skillCategory || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Experience</span>
                    <span>{selectedUser.artisanProfile.yearsExperience || 0} years</span>
                  </div>
                  <div className="detail-row">
                    <span>Verification</span>
                    {getVerifBadge(selectedUser.artisanProfile.verificationStatus)}
                  </div>
                  <div className="detail-row">
                    <span>ID Type</span>
                    <span>{selectedUser.artisanProfile.idType || '—'}</span>
                  </div>
                </div>
              )}

              <div className="detail-actions">
                <button
                  className={`action-btn ${selectedUser.suspended ? 'unsuspend' : 'suspend'}`}
                  onClick={() => setSuspendModal({
                    userId: selectedUser.id,
                    name: selectedUser.name,
                    suspended: selectedUser.suspended,
                  })}
                >
                  {selectedUser.suspended ? '✅ Unsuspend Account' : '🚫 Suspend Account'}
                </button>
                {selectedUser.role === 'artisan' && selectedUser.artisanProfile && (
                  <button
                    className="action-btn review"
                    onClick={() => navigate(`/verification/${selectedUser.artisanProfile?.id || selectedUser.id}`)}
                  >
                    🔍 Review Artisan Profile
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="detail-placeholder">
              <p>👆 Select a user to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="modal-overlay" onClick={() => setSuspendModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{suspendModal.suspended ? 'Unsuspend' : 'Suspend'} {suspendModal.name}?</h2>
            <p className="modal-desc">
              {suspendModal.suspended
                ? 'This will restore the user\'s access to the platform.'
                : 'This will prevent the user from accessing the platform.'}
            </p>
            {!suspendModal.suspended && (
              <textarea
                placeholder="Reason for suspension (optional)..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="suspend-reason"
              />
            )}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setSuspendModal(null)}>Cancel</button>
              <button
                className={`confirm-btn ${suspendModal.suspended ? 'unsuspend' : 'suspend'}`}
                onClick={handleSuspendToggle}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : suspendModal.suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
