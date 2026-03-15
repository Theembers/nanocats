import React from 'react';

function Avatar({ name, size = 'medium' }) {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'medium':
        return 40;
      case 'large':
        return 64;
      default:
        return 40;
    }
  };

  const sizeValue = getSize();
  const initials = name ? name.substring(0, 2).toUpperCase() : 'NA';
  
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ 
        width: sizeValue, 
        height: sizeValue,
        background: 'var(--color-accent)',
        color: 'var(--text-inverse)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: sizeValue * 0.4,
        borderRadius: '50%'
      }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
