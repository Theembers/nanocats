import React from 'react';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=nanocats';

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
  const avatarUrl = name
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=6366f1`
    : DEFAULT_AVATAR;

  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ width: sizeValue, height: sizeValue }}
    >
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        style={{ width: '100%', height: '100%', borderRadius: '50%' }}
      />
    </div>
  );
}

export default Avatar;
