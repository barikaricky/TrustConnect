import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import adminApi from '../services/api';
import './DisputeCenter.css';

const API_URL = '';

interface Dispute {
  id: number;
  bookingId: number;
  raisedBy: number;
  artisanUserId: number;
  category: string;
  description: string;
  evidenceUrls: string[];
  artisanResponse?: string;
  artisanEvidenceUrls?: string[];
  status: string;
  negotiationDeadline: string;
  settlementOffers: any[];
  adminVerdict?: string;
  adminVerdictNote?: string;
  splitPercentage?: number;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  artisanName?: string;
  escrowAmount?: number;
}

const DisputeCenter: React.FC = () => {
  const { admin } = useAuth();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [verdictType, setVerdictType] = useState<string>('');
  const [verdictNote, setVerdictNote] = useState('');
  const [splitPercent, setSplitPercent] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
    const interval = setInterval(loadDisputes, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadDisputes = useCallback(async () => {
    try {
      const params: any = { page: 1, limit: 50 };
      if (filter !== 'all') params.status = filter;
      const res = await adminApi.get(`${API_URL}/dispute/admin/all`, {
        params,
      });
      setDisputes(res.data.disputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleVerdict = async () => {
    if (!selectedDispute || !verdictType) return;
    if (verdictType === 'split_payment' && (splitPercent < 1 || splitPercent > 99)) {
      alert('Split percentage must be between 1-99%');
      return;
    }

    const confirmMsg = verdictType === 'release_to_artisan'
      ? 'Release all escrow funds to the artisan?'
      : verdictType === 'refund_to_customer'
        ? 'Refund all escrow funds to the customer?'
        : `Split ${splitPercent}% to customer / ${100 - splitPercent}% to artisan?`;

    if (!window.confirm(`VERDICT: ${confirmMsg}\n\nThis action cannot be undone.`)) return;

    setSubmitting(true);
    try {
      await adminApi.post(
        `${API_URL}/dispute/${selectedDispute.id}/verdict`,
        {
          adminId: admin?.id,
          verdict: verdictType,
          note: verdictNote,
          ...(verdictType === 'split_payment' ? { splitPercentage: splitPercent } : {}),
        },
      );
      alert('Verdict issued successfully.');
      setSelectedDispute(null);
      setVerdictType('');
      setVerdictNote('');
      await loadDisputes();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Failed to issue verdict');
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { expired: true, text: 'EXPIRED' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${minutes}m` };
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const statusColors: Record<string, string> = {
    open: '#F57C00',
    negotiating: '#1565C0',
    escalated: '#7B1FA2',
    resolved: '#2E7D32',
    closed: '#78909C',
  };

  if (loading) {
    return (
      <div className="dispute-loading">
        <div className="spinner-large"></div>
        <p>Loading disputes...</p>
      </div>
    );
  }

  return (
    <div className="dispute-center">
      {/* Filter Bar */}
      <div className="filter-bar">
        {['all', 'escalated', 'open', 'negotiating', 'resolved', 'closed'].map(f => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Disputes' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'escalated' && (
              <span className="chip-badge">{disputes.filter(d => d.status === 'escalated').length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="dispute-layout">
        {/* Dispute List */}
        <div className="dispute-list">
          {disputes.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✅</span>
              <h3>No disputes found</h3>
              <p>All clear! No disputes match this filter.</p>
            </div>
          ) : (
            disputes.map(d => {
              const timer = getTimeRemaining(d.negotiationDeadline);
              return (
                <div
                  key={d.id}
                  className={`dispute-card ${selectedDispute?.id === d.id ? 'selected' : ''} ${d.status === 'escalated' ? 'escalated' : ''}`}
                  onClick={() => setSelectedDispute(d)}
                >
                  <div className="card-top">
                    <span className="dispute-id">#{d.id}</span>
                    <span
                      className="dispute-status"
                      style={{ backgroundColor: statusColors[d.status] || '#78909C' }}
                    >
                      {d.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="card-category">{d.category.replace(/_/g, ' ')}</div>
                  <div className="card-parties">
                    <span>👤 {d.customerName || `User #${d.raisedBy}`}</span>
                    <span className="vs">vs</span>
                    <span>🛠️ {d.artisanName || `Artisan #${d.artisanUserId}`}</span>
                  </div>
                  {d.escrowAmount && (
                    <div className="card-escrow">💰 {formatCurrency(d.escrowAmount)}</div>
                  )}
                  <div className="card-footer">
                    <span className="card-date">{new Date(d.createdAt).toLocaleDateString()}</span>
                    {(d.status === 'open' || d.status === 'negotiating') && (
                      <span className={`card-timer ${timer.expired ? 'expired' : ''}`}>
                        ⏱️ {timer.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="dispute-detail">
          {!selectedDispute ? (
            <div className="no-selection">
              <span className="no-selection-icon">📋</span>
              <h3>Select a dispute</h3>
              <p>Click on a dispute from the list to view details and issue a verdict</p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="detail-header">
                <div>
                  <h2>Dispute #{selectedDispute.id}</h2>
                  <span className="detail-category">{selectedDispute.category.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <span
                  className="detail-status"
                  style={{ backgroundColor: statusColors[selectedDispute.status] || '#78909C' }}
                >
                  {selectedDispute.status.toUpperCase()}
                </span>
              </div>

              {/* Description */}
              <div className="detail-section">
                <h3>📝 Customer's Complaint</h3>
                <p className="detail-desc">{selectedDispute.description}</p>
                <span className="detail-meta">
                  Filed by {selectedDispute.customerName || `User #${selectedDispute.raisedBy}`} on{' '}
                  {new Date(selectedDispute.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Evidence Board */}
              <div className="evidence-board">
                <div className="evidence-column">
                  <h4>📸 Customer Evidence ({selectedDispute.evidenceUrls?.length || 0})</h4>
                  <div className="evidence-grid">
                    {selectedDispute.evidenceUrls?.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Customer evidence ${i + 1}`}
                        className="evidence-img"
                        onClick={() => setLightboxImage(url)}
                      />
                    ))}
                    {(!selectedDispute.evidenceUrls || selectedDispute.evidenceUrls.length === 0) && (
                      <p className="no-evidence">No evidence uploaded</p>
                    )}
                  </div>
                </div>
                <div className="evidence-divider"></div>
                <div className="evidence-column">
                  <h4>🛠️ Artisan Evidence ({selectedDispute.artisanEvidenceUrls?.length || 0})</h4>
                  <div className="evidence-grid">
                    {selectedDispute.artisanEvidenceUrls?.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Artisan evidence ${i + 1}`}
                        className="evidence-img"
                        onClick={() => setLightboxImage(url)}
                      />
                    ))}
                    {(!selectedDispute.artisanEvidenceUrls || selectedDispute.artisanEvidenceUrls.length === 0) && (
                      <p className="no-evidence">No response / evidence yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Artisan Response */}
              {selectedDispute.artisanResponse && (
                <div className="detail-section">
                  <h3>🛠️ Artisan's Response</h3>
                  <p className="detail-desc">{selectedDispute.artisanResponse}</p>
                </div>
              )}

              {/* Settlement History */}
              {selectedDispute.settlementOffers && selectedDispute.settlementOffers.length > 0 && (
                <div className="detail-section">
                  <h3>🤝 Settlement Offers</h3>
                  <div className="offer-list">
                    {selectedDispute.settlementOffers.map((offer, i) => (
                      <div key={i} className={`offer-item ${offer.status}`}>
                        <div className="offer-from">
                          {offer.offeredBy === selectedDispute.raisedBy ? '👤 Customer' : '🛠️ Artisan'}
                        </div>
                        <div className="offer-amount">{formatCurrency(offer.amount)}</div>
                        {offer.message && <div className="offer-msg">{offer.message}</div>}
                        <span className={`offer-status ${offer.status}`}>{offer.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escrow Info */}
              {selectedDispute.escrowAmount && (
                <div className="escrow-info">
                  <span className="escrow-label">Escrow Amount:</span>
                  <span className="escrow-value">{formatCurrency(selectedDispute.escrowAmount)}</span>
                </div>
              )}

              {/* Verdict Panel - only show for escalated/open */}
              {(selectedDispute.status === 'escalated' || selectedDispute.status === 'open' || selectedDispute.status === 'negotiating') && (
                <div className="verdict-panel">
                  <h3>⚖️ Issue Verdict</h3>

                  <div className="verdict-options">
                    <button
                      className={`verdict-btn release ${verdictType === 'release_to_artisan' ? 'selected' : ''}`}
                      onClick={() => setVerdictType('release_to_artisan')}
                    >
                      <span className="verdict-icon">🛠️</span>
                      <span className="verdict-label">Release to Artisan</span>
                      <span className="verdict-desc">Full payment to artisan (minus 10% commission)</span>
                    </button>

                    <button
                      className={`verdict-btn refund ${verdictType === 'refund_to_customer' ? 'selected' : ''}`}
                      onClick={() => setVerdictType('refund_to_customer')}
                    >
                      <span className="verdict-icon">👤</span>
                      <span className="verdict-label">Refund to Customer</span>
                      <span className="verdict-desc">Full escrow refund to customer</span>
                    </button>

                    <button
                      className={`verdict-btn split ${verdictType === 'split_payment' ? 'selected' : ''}`}
                      onClick={() => setVerdictType('split_payment')}
                    >
                      <span className="verdict-icon">⚖️</span>
                      <span className="verdict-label">Split Payment</span>
                      <span className="verdict-desc">Divide funds between both parties</span>
                    </button>
                  </div>

                  {verdictType === 'split_payment' && (
                    <div className="split-slider-section">
                      <label>Split Ratio: {splitPercent}% Customer / {100 - splitPercent}% Artisan</label>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={splitPercent}
                        onChange={(e) => setSplitPercent(Number(e.target.value))}
                        className="split-slider"
                      />
                      {selectedDispute.escrowAmount && (
                        <div className="split-preview">
                          <span>Customer gets: {formatCurrency(Math.round(selectedDispute.escrowAmount * splitPercent / 100))}</span>
                          <span>Artisan gets: {formatCurrency(Math.round(selectedDispute.escrowAmount * (100 - splitPercent) / 100))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <textarea
                    className="verdict-note"
                    placeholder="Add verdict notes (reason for decision)..."
                    value={verdictNote}
                    onChange={(e) => setVerdictNote(e.target.value)}
                    rows={3}
                  />

                  <button
                    className={`submit-verdict ${submitting ? 'submitting' : ''} ${!verdictType ? 'disabled' : ''}`}
                    onClick={handleVerdict}
                    disabled={submitting || !verdictType}
                  >
                    {submitting ? 'Issuing Verdict...' : '⚖️ Issue Final Verdict'}
                  </button>
                </div>
              )}

              {/* Existing Verdict Display */}
              {selectedDispute.adminVerdict && (
                <div className="existing-verdict">
                  <h3>✅ Verdict Issued</h3>
                  <div className="verdict-result">
                    <span className="verdict-result-type">
                      {selectedDispute.adminVerdict.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {selectedDispute.splitPercentage && (
                      <span className="verdict-split">
                        Split: {selectedDispute.splitPercentage}% / {100 - selectedDispute.splitPercentage}%
                      </span>
                    )}
                    {selectedDispute.adminVerdictNote && (
                      <p className="verdict-note-display">{selectedDispute.adminVerdictNote}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Evidence" className="lightbox-img" />
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default DisputeCenter;
