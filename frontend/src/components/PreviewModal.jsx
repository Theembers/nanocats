import React, { useEffect, useCallback } from 'react';
import { X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import './PreviewModal.css';

function PreviewModal({ isOpen, onClose, item }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !item) return null;

  const isImage = item.type === 'image' || 
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name || item.url || '');

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="preview-modal-backdrop" onClick={handleBackdropClick}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <div className="preview-modal-title">
            {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
            <span>{item.name || 'Preview'}</span>
          </div>
          <div className="preview-modal-actions">
            {item.url && (
              <button 
                className="preview-modal-btn"
                onClick={handleDownload}
                title="Download"
              >
                <Download size={18} />
              </button>
            )}
            <button 
              className="preview-modal-btn preview-modal-close"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="preview-modal-content">
          {isImage ? (
            <div className="preview-image-container">
              <img 
                src={item.url} 
                alt={item.name || 'Preview'} 
                className="preview-image"
              />
            </div>
          ) : (
            <div className="preview-file-info">
              <div className="preview-file-icon">
                <FileText size={48} />
              </div>
              <div className="preview-file-details">
                <h4>{item.name || 'Unknown File'}</h4>
                {item.size && (
                  <p className="preview-file-size">{formatFileSize(item.size)}</p>
                )}
                {item.mime_type && (
                  <p className="preview-file-type">{item.mime_type}</p>
                )}
              </div>
              {item.url && (
                <button 
                  className="btn-primary preview-download-btn"
                  onClick={handleDownload}
                >
                  <Download size={16} />
                  Download
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PreviewModal;
