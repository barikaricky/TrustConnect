import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './JobFeedAdmin.css';

interface JobPost {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  budgetType: string;
  location: string;
  status: string;
  postedBy: number;
  posterName: string;
  posterRole: string;
  applications: any[];
  createdAt: string;
}

export default function JobFeedAdmin() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, filled: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await api.get(`/reels/admin/jobs?${params.toString()}`);
      if (res.data.success) {
        setJobs(res.data.jobs);
        setStats(res.data.stats);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchJobDetail = async (id: number) => {
    try {
      const res = await api.get(`/reels/admin/jobs/${id}`);
      if (res.data.success) setSelectedJob(res.data.job);
    } catch (err) {
      console.error('Failed to load job detail:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="jobfeed-page">
      {/* Stats Cards */}
      <div className="jobfeed-stats">
        <div className="jobfeed-stat-card">
          <div className="stat-icon total">📋</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Jobs</p>
          </div>
        </div>
        <div className="jobfeed-stat-card">
          <div className="stat-icon open">✅</div>
          <div className="stat-content">
            <h3>{stats.open}</h3>
            <p>Open</p>
          </div>
        </div>
        <div className="jobfeed-stat-card">
          <div className="stat-icon closed">⏸️</div>
          <div className="stat-content">
            <h3>{stats.closed}</h3>
            <p>Closed</p>
          </div>
        </div>
        <div className="jobfeed-stat-card">
          <div className="stat-icon filled">🎯</div>
          <div className="stat-content">
            <h3>{stats.filled}</h3>
            <p>Filled</p>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="jobfeed-table-wrapper">
        <div className="jobfeed-table-header">
          <h2>Job Postings</h2>
          <div className="jobfeed-filters">
            <input
              type="text"
              className="jobfeed-search"
              placeholder="Search jobs by title, category..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              className="jobfeed-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="jobfeed-loading">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="jobfeed-empty">
            <div className="empty-icon">📭</div>
            <h3>No Jobs Found</h3>
            <p>No job postings match your filters</p>
          </div>
        ) : (
          <>
            <table className="jobfeed-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Category</th>
                  <th>Budget</th>
                  <th>Posted By</th>
                  <th>Status</th>
                  <th>Applicants</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} onClick={() => fetchJobDetail(job.id)}>
                    <td>
                      <div className="job-title-cell">
                        <strong>{job.title}</strong>
                        <span>{job.location || 'No location'}</span>
                      </div>
                    </td>
                    <td>{job.category || '—'}</td>
                    <td>{job.budget ? formatCurrency(job.budget) : '—'}</td>
                    <td>
                      <div className="job-title-cell">
                        <strong>{job.posterName}</strong>
                        <span>{job.posterRole}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`job-badge ${job.status}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <span className="applicant-count">
                        👤 {job.applications?.length || 0}
                      </span>
                    </td>
                    <td>{formatDate(job.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="jobfeed-pagination">
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

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="job-detail-overlay" onClick={() => setSelectedJob(null)}>
          <div className="job-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="job-detail-header">
              <h2>{selectedJob.title}</h2>
              <button className="close-btn" onClick={() => setSelectedJob(null)}>✕</button>
            </div>
            <div className="job-detail-body">
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`job-badge ${selectedJob.status}`}>{selectedJob.status}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span className="detail-value">{selectedJob.category || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Budget</span>
                <span className="detail-value">{selectedJob.budget ? formatCurrency(selectedJob.budget) : 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Location</span>
                <span className="detail-value">{selectedJob.location || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Posted By</span>
                <span className="detail-value">{(selectedJob as any).posterName} ({(selectedJob as any).posterRole})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date Posted</span>
                <span className="detail-value">{formatDate(selectedJob.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value" style={{ textAlign: 'left', maxWidth: '100%', marginTop: 4 }}>
                  {selectedJob.description}
                </span>
              </div>

              {selectedJob.applications && selectedJob.applications.length > 0 && (
                <>
                  <div className="detail-section-label">
                    Applicants ({selectedJob.applications.length})
                  </div>
                  {selectedJob.applications.map((app: any, idx: number) => (
                    <div key={idx} className="applicant-row">
                      <span className="applicant-name">{app.applicantName || `Applicant #${idx + 1}`}</span>
                      <span className={`applicant-status ${app.status}`}>{app.status}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
