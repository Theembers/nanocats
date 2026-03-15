import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ size = 'medium' }) {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner"></div>
    </div>
  );
}

export default LoadingSpinner;
