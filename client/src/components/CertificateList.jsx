import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Trash2, Shield, Calendar, HardDrive } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const CertificateList = ({ certificates, isLoading, refresh }) => {
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document from the secure vault?')) {
      try {
        await axios.delete(`${API_BASE}/certificates/${id}`);
        refresh();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleDownload = (id, fileName) => {
    window.open(`${API_BASE}/download/${id}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="pulse-vault"></div>
        <p>Accessing Encrypted Records...</p>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="empty-state glass">
        <Shield size={48} color="var(--bg-tertiary)" />
        <h3>Empty Vault</h3>
        <p>No secure documents found. Start by adding your first certificate.</p>
      </div>
    );
  }

  return (
    <div className="certificate-grid">
      {certificates.map((cert) => (
        <motion.div 
          key={cert.id}
          className="cert-card glass"
          whileHover={{ y: -5 }}
        >
          <div className="cert-badge">
            <div className="badge-icon">
              <FileText size={20} color="var(--accent-secure)" />
            </div>
            <div className="secure-tag">
              <Shield size={10} />
              <span>AES-256</span>
            </div>
          </div>

          <div className="cert-info">
            <h3>{cert.title}</h3>
            <p className="cert-type">{cert.type}</p>
          </div>

          <div className="cert-meta">
            <div className="meta-item">
              <Calendar size={14} />
              <span>{new Date(cert.uploadDate).toLocaleDateString()}</span>
            </div>
            <div className="meta-item">
              <HardDrive size={14} />
              <span>{(cert.fileSize / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          <div className="cert-actions">
            <button 
              className="action-btn download" 
              onClick={() => handleDownload(cert.id, cert.originalName)}
              title="Download & Decrypt"
            >
              <Download size={18} />
            </button>
            <button 
              className="action-btn delete" 
              onClick={() => handleDelete(cert.id)}
              title="Delete Permanently"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </motion.div>
      ))}

      <style>{`
        .certificate-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 25px;
        }
        .cert-card {
          padding: 25px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          position: relative;
        }
        .cert-badge {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .badge-icon {
          background: var(--accent-secure-bg);
          padding: 10px;
          border-radius: 10px;
        }
        .secure-tag {
          background: var(--bg-tertiary);
          color: var(--accent-safe);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--accent-safe);
        }
        .cert-info h3 {
          font-size: 1.1rem;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .cert-type {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .cert-meta {
          display: flex;
          gap: 15px;
          border-top: 1px solid var(--border-color);
          padding-top: 15px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .cert-actions {
          display: flex;
          gap: 10px;
          margin-top: 5px;
        }
        .action-btn {
          flex: 1;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          transition: var(--transition-smooth);
        }
        .action-btn:hover {
          color: var(--text-primary);
          background: var(--border-color);
        }
        .action-btn.delete:hover {
          color: white;
          background: var(--accent-danger);
        }
        
        .loading-state, .empty-state {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          color: var(--text-muted);
        }
        .pulse-vault {
          width: 60px;
          height: 60px;
          background: var(--accent-secure-bg);
          border-radius: 20px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(93, 135, 230, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(93, 135, 230, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(93, 135, 230, 0); }
        }
      `}</style>
    </div>
  );
};

export default CertificateList;
