import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/api';
import './VerificationCenter.css';

const API_BASE_URL = '';

interface Artisan {
  id: number;
  userId: number;
  name: string;
  phone: string;
  trade: string;
  location: string;
  submittedAt: string;
  profilePhoto?: string;
  idType: string;
  idNumber: string;
  priorityTag: 'urgent' | 'resubmission' | 'normal';
  yearsExperience?: number;
  verificationStatus: string;
}

const VerificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    trade: '',
    lga: '',
    priority: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
    correctionRequired: 0
  });

  useEffect(() => {
    loadVerificationQueue();
    loadStats();
  }, [filters]);

  const loadVerificationQueue = async () => {
    try {
      const params = new URLSearchParams();
      
      if (filters.trade) params.append('trade', filters.trade);
      if (filters.lga) params.append('lga', filters.lga);
      if (filters.priority) params.append('priority', filters.priority);

      const response = await adminApi.get(
        `${API_BASE_URL}/admin/verification/queue?${params}`,
      );

      if (response.data.success) {
        setArtisans(response.data.artisans);
      }
    } catch (error) {
      console.error('Load queue error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminApi.get(
        `${API_BASE_URL}/admin/verification/stats`,
      );

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const getPriorityIcon = (tag: string) => {
    switch (tag) {
      case 'urgent':
        return '⚡';
      case 'resubmission':
        return '⚠️';
      default:
        return '';
    }
  };

  const getPriorityClass = (tag: string) => {
    switch (tag) {
      case 'urgent':
        return 'priority-urgent';
      case 'resubmission':
        return 'priority-resubmission';
      default:
        return '';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredArtisans = artisans.filter(artisan =>
    searchTerm === '' || 
    artisan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    artisan.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    artisan.phone.includes(searchTerm)
  );

  const handleReviewArtisan = (artisanId: number) => {
    navigate(`/verification/${artisanId}`);
  };

  if (loading) {
    return (
      <div className="verification-center">
        <div className="queue-loading">
          <div className="spinner"></div>
          <p>Loading verification queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-center">
      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon verified">✓</div>
          <div className="stat-info">
            <h3>{stats.verified}</h3>
            <p>Verified Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon correction">📝</div>
          <div className="stat-info">
            <h3>{stats.correctionRequired}</h3>
            <p>Need Correction</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rejected">✗</div>
          <div className="stat-info">
            <h3>{stats.rejected}</h3>
            <p>Rejected Today</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <input
            type="text"
            className="filter-search"
            placeholder="🔍 Search by name, trade, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search artisans"
          />
          <select
            className="filter-select"
            value={filters.trade}
            onChange={(e) => setFilters({ ...filters, trade: e.target.value })}
            aria-label="Filter by trade"
          >
            <option value="">All Trades</option>
            <option value="Electrician">Electrician</option>
            <option value="Plumber">Plumber</option>
            <option value="Carpenter">Carpenter</option>
            <option value="Mason">Mason</option>
            <option value="Painter">Painter</option>
            <option value="Tiler">Tiler</option>
            <option value="Welder">Welder</option>
            <option value="AC Technician">AC Technician</option>
            <option value="Tailor">Tailor</option>
            <option value="Hairdresser">Hairdresser</option>
          </select>
          <select
            className="filter-select"
            value={filters.lga}
            onChange={(e) => setFilters({ ...filters, lga: e.target.value })}
            aria-label="Filter by location"
          >
            <option value="">All Locations</option>
            <option value="Lekki">Lekki</option>
            <option value="Victoria Island">Victoria Island</option>
            <option value="Ikoyi">Ikoyi</option>
            <option value="Ikeja">Ikeja</option>
            <option value="Surulere">Surulere</option>
            <option value="Yaba">Yaba</option>
            <option value="Abuja">Abuja</option>
            <option value="Banana Island">Banana Island</option>
          </select>
          <select
            className="filter-select"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value="urgent">⚡ Urgent</option>
            <option value="resubmission">⚠️ Re-submission</option>
            <option value="normal">Normal</option>
          </select>
          <button className="refresh-btn" onClick={loadVerificationQueue}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Queue Container */}
      <div className="queue-container">
        {filteredArtisans.length === 0 ? (
          <div className="queue-empty">
            <h3>📭 No Artisans Found</h3>
            <p>All caught up! No artisans match your filters.</p>
          </div>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Artisan Info</th>
                <th>Trade</th>
                <th>Location</th>
                <th>ID Info</th>
                <th>Experience</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArtisans.map((artisan) => (
                <tr key={artisan.id}>
                  <td>
                    {artisan.profilePhoto ? (
                      <img 
                        src={artisan.profilePhoto} 
                        alt={artisan.name}
                        className="artisan-photo"
                      />
                    ) : (
                      <div className="artisan-photo-placeholder">
                        {artisan.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="artisan-info">
                      <h4>{artisan.name}</h4>
                      <p>{artisan.phone}</p>
                    </div>
                  </td>
                  <td>
                    <span className="trade-badge">{artisan.trade}</span>
                  </td>
                  <td>{artisan.location || 'Not specified'}</td>
                  <td>
                    <div>
                      <strong>{artisan.idType}</strong>
                      <br />
                      <small>{artisan.idNumber}</small>
                    </div>
                  </td>
                  <td>
                    {artisan.yearsExperience ? (
                      <span className="experience-badge">
                        {artisan.yearsExperience}+ years
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    <span className={getPriorityClass(artisan.priorityTag)}>
                      {getPriorityIcon(artisan.priorityTag)}
                    </span>
                    <div className="time-ago">{getTimeAgo(artisan.submittedAt)}</div>
                  </td>
                  <td>
                    <button 
                      className="review-btn"
                      onClick={() => handleReviewArtisan(artisan.id)}
                    >
                      Review Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VerificationCenter;
