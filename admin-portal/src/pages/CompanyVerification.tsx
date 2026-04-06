import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../services/api';
import './VerificationCenter.css';
import './CompanyVerification.css';

interface Company {
  id: number;
  userId: number;
  companyName: string;
  rcNumber: string;
  companyType: string;
  industry: string;
  description?: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  submittedAt?: string;
  verifiedAt?: string;
  state: string;
  lga: string;
  numberOfEmployees?: string;
  companyEmail?: string;
  companyPhone?: string;
  website?: string;
  tin?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
}

const STATUS_LABELS: Record<string, string> = {
  unsubmitted: 'Unsubmitted',
  pending: 'Pending Review',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

const STATUS_COLORS: Record<string, string> = {
  unsubmitted: 'gray',
  pending: 'warning',
  verified: 'success',
  rejected: 'error',
  suspended: 'error',
};

const CompanyVerification: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Company | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0, suspended: 0, total: 0 });

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await adminApi.get(`/admin/companies${params}`);
      if (res.data.success) setCompanies(res.data.data);
    } catch (err) {
      console.error('Load companies error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const [pending, verified, rejected, suspended, all] = await Promise.all([
        adminApi.get('/admin/companies?status=pending'),
        adminApi.get('/admin/companies?status=verified'),
        adminApi.get('/admin/companies?status=rejected'),
        adminApi.get('/admin/companies?status=suspended'),
        adminApi.get('/admin/companies'),
      ]);
      setStats({
        pending: pending.data.pagination?.total || 0,
        verified: verified.data.pagination?.total || 0,
        rejected: rejected.data.pagination?.total || 0,
        suspended: suspended.data.pagination?.total || 0,
        total: all.data.pagination?.total || 0,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadCompanies();
    loadStats();
  }, [loadCompanies, loadStats]);

  const handleAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.patch(`/admin/companies/${selected.id}/verify`, { action, notes: notes.trim() || undefined });
      setSelected(null);
      setNotes('');
      await loadCompanies();
      await loadStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = companies.filter(c =>
    !search ||
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.rcNumber.toLowerCase().includes(search.toLowerCase()) ||
    (c.userName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="verification-center">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Company Verification</h1>
          <p className="page-subtitle">Review and approve company registrations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        {[
          { key: 'total', label: 'Total Companies', icon: '🏢', cls: 'pending' },
          { key: 'pending', label: 'Pending Review', icon: '⏳', cls: 'pending' },
          { key: 'verified', label: 'Approved', icon: '✅', cls: 'verified' },
          { key: 'rejected', label: 'Rejected', icon: '❌', cls: 'rejected' },
          { key: 'suspended', label: 'Suspended', icon: '🔒', cls: 'rejected' },
        ].map(s => (
          <div className="stat-card" key={s.key}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-info">
              <h3>{stats[s.key as keyof typeof stats]}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <input
            className="search-input"
            placeholder="Search by name, RC number, contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="unsubmitted">Unsubmitted</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="queue-loading">
          <div className="spinner" />
          <span>Loading companies...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-queue">
          <span className="empty-icon">🏢</span>
          <h3>No companies found</h3>
          <p>No company registrations match the current filter.</p>
        </div>
      ) : (
        <div className="company-table-wrapper">
          <table className="company-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>RC Number</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="company-name-cell">
                      <strong>{c.companyName}</strong>
                      {c.userName && <span className="company-owner">{c.userName}</span>}
                    </div>
                  </td>
                  <td><code>{c.rcNumber}</code></td>
                  <td>{c.industry}</td>
                  <td>{c.lga}, {c.state}</td>
                  <td>{c.userPhone || c.companyPhone || '—'}</td>
                  <td>{c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`status-badge status-${STATUS_COLORS[c.verificationStatus] || 'gray'}`}>
                      {STATUS_LABELS[c.verificationStatus] || c.verificationStatus}
                    </span>
                  </td>
                  <td>
                    <button className="review-btn" onClick={() => { setSelected(c); setNotes(c.adminNotes || ''); }}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel company-review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review: {selected.companyName}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="review-grid">
                <div className="review-section">
                  <h4>Company Details</h4>
                  <div className="detail-row"><span>RC Number</span><strong>{selected.rcNumber}</strong></div>
                  <div className="detail-row"><span>Type</span><strong>{selected.companyType}</strong></div>
                  <div className="detail-row"><span>Industry</span><strong>{selected.industry}</strong></div>
                  <div className="detail-row"><span>Employees</span><strong>{selected.numberOfEmployees || '—'}</strong></div>
                  {selected.tin && <div className="detail-row"><span>TIN</span><strong>{selected.tin}</strong></div>}
                  {selected.website && <div className="detail-row"><span>Website</span><strong>{selected.website}</strong></div>}
                </div>

                <div className="review-section">
                  <h4>Contact & Location</h4>
                  <div className="detail-row"><span>Owner</span><strong>{selected.userName || '—'}</strong></div>
                  <div className="detail-row"><span>Phone</span><strong>{selected.userPhone || selected.companyPhone || '—'}</strong></div>
                  <div className="detail-row"><span>Email</span><strong>{selected.userEmail || selected.companyEmail || '—'}</strong></div>
                  <div className="detail-row"><span>State</span><strong>{selected.state}</strong></div>
                  <div className="detail-row"><span>LGA</span><strong>{selected.lga}</strong></div>
                </div>

                {(selected.bankName || selected.accountNumber) && (
                  <div className="review-section">
                    <h4>Banking Details</h4>
                    <div className="detail-row"><span>Bank</span><strong>{selected.bankName || '—'}</strong></div>
                    <div className="detail-row"><span>Account Name</span><strong>{selected.accountName || '—'}</strong></div>
                    <div className="detail-row"><span>Account No.</span><strong>{selected.accountNumber || '—'}</strong></div>
                  </div>
                )}

                {selected.description && (
                  <div className="review-section full-width">
                    <h4>Description</h4>
                    <p className="review-description">{selected.description}</p>
                  </div>
                )}
              </div>

              <div className="current-status-row">
                <span>Current Status:</span>
                <span className={`status-badge status-${STATUS_COLORS[selected.verificationStatus] || 'gray'}`}>
                  {STATUS_LABELS[selected.verificationStatus] || selected.verificationStatus}
                </span>
              </div>

              <div className="notes-section">
                <label htmlFor="admin-notes">Admin Notes / Reason</label>
                <textarea
                  id="admin-notes"
                  className="notes-textarea"
                  placeholder="Reason for rejection / suspension, or approval notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-reject" disabled={actionLoading} onClick={() => handleAction('reject')}>
                {actionLoading ? '...' : 'Reject'}
              </button>
              <button className="btn-suspend" disabled={actionLoading} onClick={() => handleAction('suspend')}>
                {actionLoading ? '...' : 'Suspend'}
              </button>
              <button className="btn-approve" disabled={actionLoading} onClick={() => handleAction('approve')}>
                {actionLoading ? '...' : '✓ Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyVerification;
