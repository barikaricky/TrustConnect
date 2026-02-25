import React, { useState, useEffect } from 'react';
import adminApi from '../services/api';
import './TransactionLogs.css';

const API_BASE_URL = '';

interface Transaction {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: number;
  serviceFee: number;
  customerId: string;
  artisanId: string;
  customerName: string;
  artisanName: string;
  quoteId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Summary {
  totalVolume: number;
  totalEscrow: number;
  totalReleased: number;
  totalRefunded: number;
  count: number;
}

const TransactionLogs: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({
    totalVolume: 0, totalEscrow: 0, totalReleased: 0, totalRefunded: 0, count: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ type: 'all', status: 'all', search: '', startDate: '', endDate: '' });
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [filters, pagination.page]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));

      const response = await adminApi.get(`${API_BASE_URL}/admin/transactions?${params}`);

      if (response.data.success) {
        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'held_in_escrow': return 'status-escrow';
      case 'released': case 'completed': return 'status-released';
      case 'refunded': return 'status-refunded';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return 'status-default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'held_in_escrow': return 'In Escrow';
      case 'released': return 'Released';
      case 'completed': return 'Completed';
      case 'refunded': return 'Refunded';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  return (
    <div className="txn-page">
      {/* Summary Cards */}
      <section className="txn-summary">
        <div className="summary-card">
          <span className="summary-icon">💰</span>
          <div>
            <p className="summary-label">Total Volume</p>
            <p className="summary-value">{formatCurrency(summary.totalVolume)}</p>
          </div>
        </div>
        <div className="summary-card escrow">
          <span className="summary-icon">🔒</span>
          <div>
            <p className="summary-label">In Escrow</p>
            <p className="summary-value">{formatCurrency(summary.totalEscrow)}</p>
          </div>
        </div>
        <div className="summary-card released">
          <span className="summary-icon">✅</span>
          <div>
            <p className="summary-label">Released</p>
            <p className="summary-value">{formatCurrency(summary.totalReleased)}</p>
          </div>
        </div>
        <div className="summary-card refunded">
          <span className="summary-icon">↩️</span>
          <div>
            <p className="summary-label">Refunded</p>
            <p className="summary-value">{formatCurrency(summary.totalRefunded)}</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="txn-filters">
        <input
          type="text"
          placeholder="Search by reference, ID..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="filter-search"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="held_in_escrow">In Escrow</option>
          <option value="released">Released</option>
          <option value="refunded">Refunded</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="filter-date"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="filter-date"
          placeholder="End Date"
        />
      </section>

      {/* Table */}
      <section className="txn-table-wrapper">
        {loading ? (
          <div className="txn-loading">
            <div className="spinner"></div>
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="txn-empty">
            <p>💳 No transactions found</p>
          </div>
        ) : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Artisan</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id || txn.reference} onClick={() => setSelectedTxn(txn)}>
                  <td className="txn-ref">{txn.reference || txn.id?.substring(0, 12)}</td>
                  <td>{txn.customerName}</td>
                  <td>{txn.artisanName}</td>
                  <td className="txn-amount">{formatCurrency(txn.amount || 0)}</td>
                  <td className="txn-fee">{formatCurrency(txn.serviceFee || 0)}</td>
                  <td>
                    <span className={`txn-status ${getStatusColor(txn.status)}`}>
                      {getStatusLabel(txn.status)}
                    </span>
                  </td>
                  <td className="txn-date">{formatDate(txn.createdAt)}</td>
                  <td>
                    <button className="view-btn" onClick={(e) => { e.stopPropagation(); setSelectedTxn(txn); }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <section className="txn-pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            ← Previous
          </button>
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Next →
          </button>
        </section>
      )}

      {/* Detail Modal */}
      {selectedTxn && (
        <div className="txn-modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="txn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="txn-modal-header">
              <h2>Transaction Details</h2>
              <button className="modal-close" onClick={() => setSelectedTxn(null)}>✕</button>
            </div>
            <div className="txn-modal-body">
              <div className="detail-row">
                <span className="detail-label">Reference</span>
                <span className="detail-value">{selectedTxn.reference || selectedTxn.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`txn-status ${getStatusColor(selectedTxn.status)}`}>
                  {getStatusLabel(selectedTxn.status)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount</span>
                <span className="detail-value amount">{formatCurrency(selectedTxn.amount || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Service Fee</span>
                <span className="detail-value">{formatCurrency(selectedTxn.serviceFee || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Customer</span>
                <span className="detail-value">{selectedTxn.customerName} ({selectedTxn.customerId})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Artisan</span>
                <span className="detail-value">{selectedTxn.artisanName} ({selectedTxn.artisanId})</span>
              </div>
              {selectedTxn.quoteId && (
                <div className="detail-row">
                  <span className="detail-label">Quote ID</span>
                  <span className="detail-value">{selectedTxn.quoteId}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Created</span>
                <span className="detail-value">{formatDate(selectedTxn.createdAt)}</span>
              </div>
              {selectedTxn.updatedAt && (
                <div className="detail-row">
                  <span className="detail-label">Updated</span>
                  <span className="detail-value">{formatDate(selectedTxn.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionLogs;
