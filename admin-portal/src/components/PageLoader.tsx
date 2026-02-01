import React from 'react';
import './PageLoader.css';

interface PageLoaderProps {
  isLoading: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="page-loader">
      <div className="loader-content">
        {/* Animated Logo Container */}
        <div className="logo-container">
          <div className="logo-shield">
            <svg
              className="shield-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z"
                fill="url(#shieldGradient)"
                stroke="#FFC107"
                strokeWidth="1"
              />
              <path
                d="M10 14L7 11L8.41 9.59L10 11.17L15.59 5.58L17 7L10 14Z"
                fill="#FFFFFF"
                className="check-icon"
              />
              <defs>
                <linearGradient id="shieldGradient" x1="4" y1="2" x2="20" y2="23">
                  <stop offset="0%" stopColor="#1a237e" />
                  <stop offset="50%" stopColor="#283593" />
                  <stop offset="100%" stopColor="#3949ab" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="pulse-ring"></div>
          <div className="pulse-ring pulse-ring-2"></div>
        </div>

        {/* Brand Name */}
        <div className="brand-name">
          <h1 className="brand-title">TrustConnect</h1>
          <p className="brand-subtitle">Admin Command Center</p>
        </div>

        {/* Loading Animation */}
        <div className="loading-animation">
          <div className="spinner">
            <div className="spinner-circle"></div>
            <div className="spinner-circle spinner-circle-2"></div>
            <div className="spinner-circle spinner-circle-3"></div>
          </div>
          <p className="loading-text">Initializing secure connection...</p>
        </div>

        {/* Security Badge */}
        <div className="security-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z"
              fill="#4CAF50"
            />
            <path d="M10 14L7 11L8.41 9.59L10 11.17L15.59 5.58L17 7L10 14Z" fill="#FFF" />
          </svg>
          <span>256-bit Encrypted</span>
        </div>
      </div>

      {/* Animated Background */}
      <div className="loader-background">
        <div className="grid-lines"></div>
        <div className="floating-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
