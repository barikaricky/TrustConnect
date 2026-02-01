import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RegisterPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'qrcode'>('form');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    staffId: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'support-admin' as 'super-admin' | 'finance-admin' | 'support-admin' | 'verification-officer',
  });
  
  // 2FA Setup state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.staffId || !formData.name || !formData.password) {
      setError('All fields are required');
      return false;
    }

    if (!formData.email.includes('@trustconnect.com')) {
      setError('Email must be a @trustconnect.com address');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Password strength check
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*]/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Register admin account
      const response = await axios.post(`${API_URL}/admin/auth/register`, {
        email: formData.email,
        staffId: formData.staffId,
        name: formData.name,
        password: formData.password,
        role: formData.role,
      });

      if (response.data.success) {
        // Move to 2FA setup
        setQrCodeUrl(response.data.qrCode);
        setSecret(response.data.secret);
        setStep('qrcode');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/admin/auth/verify-2fa-setup`, {
        email: formData.email,
        code: verificationCode,
      });

      if (response.data.success) {
        alert('Registration successful! You can now login.');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '2FA verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'qrcode') {
    return (
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <div className="shield-icon">🔐</div>
            <h1>Setup Two-Factor Authentication</h1>
            <p>Scan this QR code with Google Authenticator</p>
          </div>

          <div className="qr-section">
            <div className="qr-code">
              <img src={qrCodeUrl} alt="2FA QR Code" />
            </div>

            <div className="secret-key">
              <p className="secret-label">Manual Entry Key:</p>
              <code>{secret}</code>
            </div>

            <div className="instructions">
              <ol>
                <li>Open Google Authenticator on your phone</li>
                <li>Tap the + button to add an account</li>
                <li>Scan the QR code above OR enter the key manually</li>
                <li>Enter the 6-digit code below to verify</li>
              </ol>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleVerify2FA} className="verification-form">
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="code-input"
                autoFocus
              />
            </div>

            <button type="submit" className="verify-button" disabled={loading || verificationCode.length !== 6}>
              {loading ? 'Verifying...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="shield-icon">🛡️</div>
          <h1>Admin Registration</h1>
          <p>Create your TrustConnect admin account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Solomon Adeleke"
                required
              />
            </div>

            <div className="form-group">
              <label>Staff ID</label>
              <input
                type="text"
                name="staffId"
                value={formData.staffId}
                onChange={handleInputChange}
                placeholder="e.g., SA-002"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="yourname@trustconnect.com"
              required
            />
            <small>Must be a @trustconnect.com email</small>
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              <option value="support-admin">Support Admin</option>
              <option value="verification-officer">Verification Officer</option>
              <option value="finance-admin">Finance Admin</option>
              <option value="super-admin">Super Admin</option>
            </select>
            <small className="role-description">
              {formData.role === 'super-admin' && '• Full system access and admin management'}
              {formData.role === 'finance-admin' && '• Manage escrow, payouts, and transactions'}
              {formData.role === 'support-admin' && '• Handle disputes and customer support'}
              {formData.role === 'verification-officer' && '• Review and approve artisan applications'}
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li className={formData.password.length >= 8 ? 'met' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                One uppercase letter
              </li>
              <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
                One lowercase letter
              </li>
              <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                One number
              </li>
              <li className={/[!@#$%^&*]/.test(formData.password) ? 'met' : ''}>
                One special character (!@#$%^&*)
              </li>
            </ul>
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>

          <div className="login-link">
            Already have an account? <a href="/login">Login here</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
