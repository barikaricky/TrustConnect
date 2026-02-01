import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ArtisanReview.css';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

interface ArtisanDetails {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  email?: string;
  idType: string;
  idNumber: string;
  governmentIdUrl?: string;
  profilePhotoUrl?: string;
  faceMatchScore?: number;
  ninVerified: boolean;
  primarySkill: string;
  skillCategory: string;
  yearsExperience?: number;
  workshopAddress?: string;
  portfolioPhotos: string[];
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankNameMatch: boolean;
  verificationStatus: string;
  adminNotes?: string;
  submittedAt: string;
  history: any[];
  internalNotes: any[];
  trustAccepted?: boolean;
  unionId?: string;
  unionChairman?: string;
}

const ArtisanReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState<ArtisanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'identity' | 'portfolio' | 'financial' | 'history'>('identity');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'correction' | 'reject' | null>(null);
  const [badgeLevel, setBadgeLevel] = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [correctionReason, setCorrectionReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [blacklist, setBlacklist] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  useEffect(() => {
    loadArtisanDetails();
  }, [id]);

  const loadArtisanDetails = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_BASE_URL}/admin/verification/artisan/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setArtisan(response.data.artisan);
      }
    } catch (error) {
      console.error('Load artisan error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken');
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');

      const response = await axios.post(
        `${API_BASE_URL}/admin/verification/approve`,
        {
          artisanId: artisan?.id,
          badgeLevel,
          adminId: admin.id,
          adminEmail: admin.email,
          notes: internalNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`✅ Artisan approved with ${badgeLevel.toUpperCase()} badge!`);
        navigate('/verification');
      }
    } catch (error: any) {
      alert('Failed to approve artisan: ' + error.response?.data?.message);
    } finally {
      setProcessing(false);
      setShowDecisionModal(false);
    }
  };

  const handleRequestCorrection = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken');
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');

      const response = await axios.post(
        `${API_BASE_URL}/admin/verification/request-correction`,
        {
          artisanId: artisan?.id,
          reason: correctionReason,
          adminId: admin.id,
          adminEmail: admin.email
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('✅ Correction request sent to artisan!');
        navigate('/verification');
      }
    } catch (error: any) {
      alert('Failed to request correction: ' + error.response?.data?.message);
    } finally {
      setProcessing(false);
      setShowDecisionModal(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken');
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');

      const response = await axios.post(
        `${API_BASE_URL}/admin/verification/reject`,
        {
          artisanId: artisan?.id,
          reason: rejectReason,
          adminId: admin.id,
          adminEmail: admin.email,
          blacklist
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(blacklist ? '✅ Artisan rejected and blacklisted!' : '✅ Artisan rejected!');
        navigate('/verification');
      }
    } catch (error: any) {
      alert('Failed to reject artisan: ' + error.response?.data?.message);
    } finally {
      setProcessing(false);
      setShowDecisionModal(false);
    }
  };

  const handleAddNote = async () => {
    if (!internalNote.trim()) return;

    try {
      const token = localStorage.getItem('adminToken');
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');

      await axios.post(
        `${API_BASE_URL}/admin/verification/note`,
        {
          artisanId: artisan?.id,
          note: internalNote,
          adminId: admin.id,
          adminName: admin.name
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Note added successfully!');
      setInternalNote('');
      loadArtisanDetails();
    } catch (error) {
      alert('Failed to add note');
    }
  };

  const openDecisionModal = (type: 'approve' | 'correction' | 'reject') => {
    setDecisionType(type);
    setShowDecisionModal(true);
  };

  if (loading) {
    return (
      <div className="review-loading">
        <div className="spinner"></div>
        <p>Loading artisan details...</p>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="review-error">
        <h2>Artisan not found</h2>
        <button onClick={() => navigate('/verification')}>Back to Queue</button>
      </div>
    );
  }

  return (
    <div className="artisan-review">
      {/* Header */}
      <div className="review-header">
        <button className="back-btn" onClick={() => navigate('/verification')}>
          ← Back to Queue
        </button>
        <div className="artisan-summary">
          <div className="summary-left">
            {artisan.profilePhotoUrl ? (
              <img src={artisan.profilePhotoUrl} alt={artisan.fullName} className="summary-avatar" />
            ) : (
              <div className="summary-avatar-placeholder">{artisan.fullName.charAt(0)}</div>
            )}
            <div className="summary-info">
              <h1>{artisan.fullName}</h1>
              <p className="summary-trade">{artisan.primarySkill}</p>
              <p className="summary-contact">{artisan.phone} • {artisan.email}</p>
            </div>
          </div>
          <div className="summary-right">
            <div className="status-badge status-pending">Pending Review</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="review-tabs">
        <button 
          className={`tab ${activeTab === 'identity' ? 'active' : ''}`}
          onClick={() => setActiveTab('identity')}
        >
          🪪 Identity & Face Match
        </button>
        <button 
          className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          📸 Portfolio Inspection
        </button>
        <button 
          className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          💳 Financial Cross-Check
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 History & Notes
        </button>
      </div>

      {/* Content */}
      <div className="review-content">
        {/* Identity Tab */}
        {activeTab === 'identity' && (
          <div className="identity-section">
            <div className="side-by-side-comparison">
              <div className="comparison-card">
                <h3>Government ID Photo</h3>
                {artisan.governmentIdUrl ? (
                  <img src={artisan.governmentIdUrl} alt="Government ID" className="id-photo" />
                ) : (
                  <div className="no-photo">No ID photo uploaded</div>
                )}
                <div className="id-details">
                  <p><strong>ID Type:</strong> {artisan.idType}</p>
                  <p><strong>ID Number:</strong> {artisan.idNumber}</p>
                </div>
              </div>

              <div className="comparison-arrow">↔️</div>

              <div className="comparison-card">
                <h3>Live Selfie</h3>
                {artisan.profilePhotoUrl ? (
                  <img src={artisan.profilePhotoUrl} alt="Live Selfie" className="id-photo" />
                ) : (
                  <div className="no-photo">No selfie uploaded</div>
                )}
                <div className="confidence-score">
                  {artisan.faceMatchScore ? (
                    <div className={`score ${artisan.faceMatchScore >= 80 ? 'high' : 'low'}`}>
                      <span className="score-label">AI Confidence:</span>
                      <span className="score-value">{artisan.faceMatchScore}% Match</span>
                    </div>
                  ) : (
                    <div className="score pending">
                      <span>Face match not yet performed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="identity-confirmation">
              <label className="confirmation-toggle">
                <input 
                  type="checkbox" 
                  checked={identityConfirmed}
                  onChange={(e) => setIdentityConfirmed(e.target.checked)}
                />
                <span className="toggle-text">✅ Identity Confirmed - The person in both photos is the same</span>
              </label>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="portfolio-section">
            <h3>Professional Work Gallery</h3>
            {artisan.portfolioPhotos && artisan.portfolioPhotos.length > 0 ? (
              <div className="portfolio-gallery">
                {artisan.portfolioPhotos.map((photo, index) => (
                  <div key={index} className="portfolio-item">
                    <img src={photo} alt={`Work ${index + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-portfolio">
                <p>No portfolio photos uploaded</p>
              </div>
            )}

            <div className="trade-info">
              <h3>Trade Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Primary Skill:</span>
                  <span className="info-value">{artisan.primarySkill}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Category:</span>
                  <span className="info-value">{artisan.skillCategory}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Experience:</span>
                  <span className="info-value">{artisan.yearsExperience || 'N/A'} years</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Workshop:</span>
                  <span className="info-value">{artisan.workshopAddress || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {artisan.unionId && (
              <div className="union-info">
                <h3>Trade Union Verification</h3>
                <p><strong>Union ID:</strong> {artisan.unionId}</p>
                <p><strong>Chairman:</strong> {artisan.unionChairman}</p>
                <button className="call-btn">📞 Click to Call Chairman</button>
              </div>
            )}
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="financial-section">
            <h3>Bank Account Cross-Check</h3>
            <div className="bank-details">
              <div className="bank-item">
                <span className="bank-label">Bank Name:</span>
                <span className="bank-value">{artisan.bankName || 'Not provided'}</span>
              </div>
              <div className="bank-item">
                <span className="bank-label">Account Number:</span>
                <span className="bank-value">{artisan.accountNumber || 'Not provided'}</span>
              </div>
              <div className="bank-item">
                <span className="bank-label">Account Name:</span>
                <span className="bank-value">{artisan.accountName || 'Not provided'}</span>
              </div>
            </div>

            <div className={`name-match ${artisan.bankNameMatch ? 'match' : 'mismatch'}`}>
              {artisan.bankNameMatch ? (
                <>
                  <span className="match-icon">✅</span>
                  <span className="match-text">Bank Account Name matches NIN Name</span>
                </>
              ) : (
                <>
                  <span className="match-icon">⚠️</span>
                  <span className="match-text">Third-Party Account Risk - Names do not match</span>
                </>
              )}
            </div>

            <div className="comparison-names">
              <div className="name-box">
                <h4>NIN Name</h4>
                <p>{artisan.fullName}</p>
              </div>
              <div className="name-box">
                <h4>Bank Account Name</h4>
                <p>{artisan.accountName || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            <h3>Verification History</h3>
            {artisan.history && artisan.history.length > 0 ? (
              <div className="history-timeline">
                {artisan.history.map((event, index) => (
                  <div key={index} className="history-event">
                    <div className="event-date">{new Date(event.createdAt).toLocaleString()}</div>
                    <div className="event-content">
                      <strong>{event.changedBy}</strong> changed status from <em>{event.previousStatus}</em> to <em>{event.newStatus}</em>
                      {event.reason && <p className="event-reason">{event.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-history">No verification history yet</p>
            )}

            <h3>Internal Notes</h3>
            <div className="notes-section">
              {artisan.internalNotes && artisan.internalNotes.length > 0 && (
                <div className="notes-list">
                  {artisan.internalNotes.map((note: any, index) => (
                    <div key={index} className="note-item">
                      <div className="note-header">
                        <strong>{note.adminName}</strong>
                        <span className="note-date">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="note-text">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-note">
                <textarea
                  className="note-textarea"
                  placeholder="Add an internal note for other admins..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={3}
                />
                <button className="add-note-btn" onClick={handleAddNote}>
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decision Console */}
      <div className="decision-console">
        <h3>Decision Console</h3>
        <div className="decision-buttons">
          <button 
            className="decision-btn approve-btn"
            onClick={() => openDecisionModal('approve')}
          >
            ✅ Approve & Badge
          </button>
          <button 
            className="decision-btn correction-btn"
            onClick={() => openDecisionModal('correction')}
          >
            📝 Request Correction
          </button>
          <button 
            className="decision-btn reject-btn"
            onClick={() => openDecisionModal('reject')}
          >
            ❌ Reject & Blacklist
          </button>
        </div>
      </div>

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="modal-overlay" onClick={() => setShowDecisionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {decisionType === 'approve' && (
              <>
                <h2>Approve Artisan</h2>
                <p>Select the badge level for this artisan:</p>
                <div className="badge-selector">
                  <label className="badge-option">
                    <input
                      type="radio"
                      name="badge"
                      value="bronze"
                      checked={badgeLevel === 'bronze'}
                      onChange={(e) => setBadgeLevel(e.target.value as any)}
                    />
                    <span className="badge-bronze">🥉 Bronze</span>
                    <span className="badge-desc">Basic verification</span>
                  </label>
                  <label className="badge-option">
                    <input
                      type="radio"
                      name="badge"
                      value="silver"
                      checked={badgeLevel === 'silver'}
                      onChange={(e) => setBadgeLevel(e.target.value as any)}
                    />
                    <span className="badge-silver">🥈 Silver</span>
                    <span className="badge-desc">Verified with portfolio</span>
                  </label>
                  <label className="badge-option">
                    <input
                      type="radio"
                      name="badge"
                      value="gold"
                      checked={badgeLevel === 'gold'}
                      onChange={(e) => setBadgeLevel(e.target.value as any)}
                    />
                    <span className="badge-gold">🥇 Gold</span>
                    <span className="badge-desc">Highly verified & skilled</span>
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="modal-btn cancel-btn" onClick={() => setShowDecisionModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="modal-btn confirm-btn" 
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Confirm Approval'}
                  </button>
                </div>
              </>
            )}

            {decisionType === 'correction' && (
              <>
                <h2>Request Correction</h2>
                <p>Explain what needs to be corrected:</p>
                <textarea
                  className="modal-textarea"
                  placeholder="E.g., 'Please re-upload a clear photo of your NIN'"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={4}
                />
                <div className="modal-actions">
                  <button className="modal-btn cancel-btn" onClick={() => setShowDecisionModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="modal-btn confirm-btn" 
                    onClick={handleRequestCorrection}
                    disabled={processing || !correctionReason.trim()}
                  >
                    {processing ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </>
            )}

            {decisionType === 'reject' && (
              <>
                <h2>Reject Artisan</h2>
                <p>Explain the reason for rejection:</p>
                <textarea
                  className="modal-textarea"
                  placeholder="E.g., 'Fraudulent documents detected'"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                />
                <label className="blacklist-checkbox">
                  <input
                    type="checkbox"
                    checked={blacklist}
                    onChange={(e) => setBlacklist(e.target.checked)}
                  />
                  <span>🚫 Blacklist this phone number and NIN (permanent ban)</span>
                </label>
                <div className="modal-actions">
                  <button className="modal-btn cancel-btn" onClick={() => setShowDecisionModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="modal-btn confirm-btn reject-confirm" 
                    onClick={handleReject}
                    disabled={processing || !rejectReason.trim()}
                  >
                    {processing ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtisanReview;
