import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './TwoFactorPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { twoFactorToken, login } = useAuth();
  const rememberDevice = location.state?.rememberDevice || false;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!twoFactorToken) {
      navigate('/login');
    }
  }, [twoFactorToken, navigate]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every(digit => digit) && index === 5) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newCode = [...code];
    pastedData.split('').forEach((digit, i) => {
      if (i < 6) newCode[i] = digit;
    });
    setCode(newCode);

    if (pastedData.length === 6) {
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeString?: string) => {
    const finalCode = codeString || code.join('');
    
    if (finalCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/admin/auth/verify-2fa`, {
        twoFactorToken,
        code: finalCode,
        rememberDevice,
      });

      if (response.data.success) {
        login(
          response.data.admin,
          response.data.token,
          response.data.sessionToken
        );
        navigate('/dashboard');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || '2FA verification failed';
      setError(message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="twofa-container">
      <div className="grid-background"></div>
      
      <div className="twofa-content">
        {/* Header */}
        <div className="twofa-header">
          <div className="shield-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>Two-Factor Authentication</h1>
          <p>Enter the 6-digit code from your authenticator app</p>
        </div>

        {/* 2FA Card */}
        <div className="twofa-card">
          {error && (
            <div className="error-alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="code-inputs" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="code-input"
                />
              ))}
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading || code.some(d => !d)}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Enter</span>
              )}
            </button>
          </form>

          <div className="twofa-footer">
            <p>Lost access to your authenticator?</p>
            <a href="mailto:admin@trustconnect.com">Contact System Administrator</a>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="back-button"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}
