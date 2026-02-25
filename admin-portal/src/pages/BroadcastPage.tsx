import React, { useState, useEffect } from 'react';
import adminApi from '../services/api';
import './BroadcastPage.css';

const API_BASE_URL = '';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  target: string;
  targetCount: number;
  sentBy: string;
  sentAt: string;
  status: string;
}

const BroadcastPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await adminApi.get(`${API_BASE_URL}/admin/broadcasts`);
      if (response.data.success) {
        setHistory(response.data.broadcasts);
      }
    } catch (err) {
      console.error('Load broadcast history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');

      const response = await adminApi.post(
        `${API_BASE_URL}/admin/broadcast`,
        { title: title.trim(), message: message.trim(), target },
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setTitle('');
        setMessage('');
        setTarget('all');
        loadHistory();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const getTargetLabel = (t: string) => {
    switch (t) {
      case 'artisans': return '🛠️ Artisans';
      case 'customers': return '🏠 Customers';
      default: return '👥 All Users';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="bc-page">
      <div className="bc-content">
        {/* Compose Section */}
        <div className="bc-compose">
          <h2>New Broadcast</h2>

          {error && <div className="bc-error">{error}</div>}
          {success && <div className="bc-success">{success}</div>}

          <div className="bc-field">
            <label>Target Audience</label>
            <div className="target-options">
              {['all', 'artisans', 'customers'].map((t) => (
                <button
                  key={t}
                  className={`target-btn ${target === t ? 'active' : ''}`}
                  onClick={() => setTarget(t)}
                >
                  {getTargetLabel(t)}
                </button>
              ))}
            </div>
          </div>

          <div className="bc-field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              maxLength={100}
            />
          </div>

          <div className="bc-field">
            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your broadcast message..."
              maxLength={500}
              rows={5}
            />
            <span className="char-count">{message.length}/500</span>
          </div>

          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
          >
            {sending ? '📡 Sending...' : '📢 Send Broadcast'}
          </button>
        </div>

        {/* History Section */}
        <div className="bc-history">
          <h2>Broadcast History</h2>
          {loadingHistory ? (
            <div className="bc-loading">
              <div className="spinner"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="bc-empty">
              <p>No broadcasts sent yet</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((bc) => (
                <div key={bc.id} className="history-card">
                  <div className="history-header">
                    <h3>{bc.title}</h3>
                    <span className="history-target">{getTargetLabel(bc.target)}</span>
                  </div>
                  <p className="history-message">{bc.message}</p>
                  <div className="history-meta">
                    <span>Sent to {bc.targetCount} users</span>
                    <span>by {bc.sentBy}</span>
                    <span>{formatDate(bc.sentAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastPage;
