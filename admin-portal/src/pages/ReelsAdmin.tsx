import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './ReelsAdmin.css';

interface Reel {
  id: number;
  userId: number;
  userRole: string;
  userName: string;
  userAvatar: string | null;
  videoUrl: string;
  caption: string;
  category: string;
  likes: number[];
  comments: any[];
  views: number;
  flagged: boolean;
  reported: boolean;
  status: string;
  createdAt: string;
}

interface ReelStats {
  total: number;
  active: number;
  flagged: number;
  reported: number;
  removed: number;
  recent24h: number;
  topCreators: { _id: number; count: number; userName: string; userRole: string }[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function ReelsAdmin() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [stats, setStats] = useState<ReelStats>({
    total: 0, active: 0, flagged: 0, reported: 0, removed: 0, recent24h: 0, topCreators: [],
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchReels = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await api.get(`/reels/admin/all?${params.toString()}`);
      if (res.data.success) {
        setReels(res.data.reels);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load reels:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/reels/admin/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchReels();
    fetchStats();
  }, [fetchReels]);

  const handleToggleFlag = async (id: number) => {
    try {
      await api.patch(`/reels/admin/${id}/flag`);
      fetchReels();
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm('Remove this reel? This action cannot be undone.')) return;
    try {
      await api.delete(`/reels/admin/${id}`);
      fetchReels();
      fetchStats();
    } catch (err) {
      console.error('Failed to remove reel:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getVideoUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const base = API_BASE.replace('/api', '');
    return `${base}${url}`;
  };

  return (
    <div className="reels-page">
      {/* Stats */}
      <div className="reels-stats">
        <div className="reels-stat-card">
          <div className="reels-stat-icon total">🎬</div>
          <div className="reels-stat-info">
            <h3>{stats.total}</h3>
            <p>Total Reels</p>
          </div>
        </div>
        <div className="reels-stat-card">
          <div className="reels-stat-icon active">✅</div>
          <div className="reels-stat-info">
            <h3>{stats.active}</h3>
            <p>Active</p>
          </div>
        </div>
        <div className="reels-stat-card">
          <div className="reels-stat-icon flagged">⚠️</div>
          <div className="reels-stat-info">
            <h3>{stats.flagged}</h3>
            <p>Flagged</p>
          </div>
        </div>
        <div className="reels-stat-card">
          <div className="reels-stat-icon reported">🚩</div>
          <div className="reels-stat-info">
            <h3>{stats.reported}</h3>
            <p>Reported</p>
          </div>
        </div>
        <div className="reels-stat-card">
          <div className="reels-stat-icon removed">🗑️</div>
          <div className="reels-stat-info">
            <h3>{stats.removed}</h3>
            <p>Removed</p>
          </div>
        </div>
        <div className="reels-stat-card">
          <div className="reels-stat-icon recent">⚡</div>
          <div className="reels-stat-info">
            <h3>{stats.recent24h}</h3>
            <p>Last 24h</p>
          </div>
        </div>
      </div>

      {/* Top Creators */}
      {stats.topCreators.length > 0 && (
        <div className="reels-top-creators">
          <h3>Top Creators</h3>
          <div className="creator-list">
            {stats.topCreators.map((c) => (
              <div key={c._id} className="creator-chip">
                <div className="creator-avatar">
                  {(c.userName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="creator-name">{c.userName}</span>
                <span className="creator-count">{c.count} reels</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reels Grid */}
      <div className="reels-content-area">
        <div className="reels-content-header">
          <h2>All Reels</h2>
          <div className="reels-filter-bar">
            <select
              className="reels-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="removed">Removed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="reels-loading">Loading reels...</div>
        ) : reels.length === 0 ? (
          <div className="reels-empty">
            <div className="empty-icon">🎬</div>
            <h3>No Reels Found</h3>
            <p>No reels match your filters yet</p>
          </div>
        ) : (
          <>
            <div className="reels-grid">
              {reels.map((reel) => (
                <div key={reel.id} className="reel-card">
                  <div className="reel-preview">
                    <video src={getVideoUrl(reel.videoUrl)} preload="metadata" />
                    <div className="reel-play-overlay">
                      <span className="play-icon">▶</span>
                    </div>
                    <span className={`reel-status-badge ${reel.flagged ? 'flagged' : reel.status}`}>
                      {reel.flagged ? 'Flagged' : reel.status}
                    </span>
                  </div>
                  <div className="reel-info">
                    <div className="reel-user-row">
                      <div className="reel-user-avatar">
                        {(reel.userName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="reel-user-info">
                        <div className="reel-user-name">{reel.userName}</div>
                        <div className="reel-user-role">{reel.userRole}</div>
                      </div>
                    </div>
                    {reel.caption && <div className="reel-caption">{reel.caption}</div>}
                    <div className="reel-meta">
                      <span className="reel-meta-item">❤️ {reel.likes?.length || 0}</span>
                      <span className="reel-meta-item">💬 {reel.comments?.length || 0}</span>
                      <span className="reel-meta-item">👁 {reel.views || 0}</span>
                      <span className="reel-meta-item">{formatDate(reel.createdAt)}</span>
                    </div>
                  </div>
                  <div className="reel-actions">
                    <button
                      className={`reel-action-btn flag`}
                      onClick={() => handleToggleFlag(reel.id)}
                    >
                      {reel.flagged ? '🔓 Unflag' : '⚠️ Flag'}
                    </button>
                    <button
                      className="reel-action-btn remove"
                      onClick={() => handleRemove(reel.id)}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="reels-pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = Math.max(1, page - 2) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      className={`page-btn ${pageNum === page ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
