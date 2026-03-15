import React from 'react';
import './DateSeparator.css';

function DateSeparator({ date }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="date-separator">
      <div className="date-separator-line" />
      <span className="date-separator-text">{formatDate(date)}</span>
      <div className="date-separator-line" />
    </div>
  );
}

export default DateSeparator;
