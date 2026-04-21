import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Identity');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.split('.')[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('category', category);

    try {
      await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        className="modal-content glass"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
      >
        <div className="modal-header">
          <div className="header-icon">
            <Upload size={22} color="var(--accent-secure)" />
          </div>
          <h3>Secure Upload</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="security-notice">
          <Shield size={16} />
          <span>Files are encrypted with AES-256 before storage.</span>
        </div>

        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Document Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passport, Degree Certificate"
              required 
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Identity">Identity Document</option>
              <option value="Education">Educational certificate</option>
              <option value="Professional">Professional License</option>
              <option value="Financial">Financial Record</option>
            </select>
          </div>

          <div className={`file-dropzone ${file ? 'has-file' : ''}`}>
            <input type="file" onChange={handleFileChange} id="file-input" hidden />
            <label htmlFor="file-input">
              {file ? (
                <div className="file-info">
                  <CheckCircle size={32} color="var(--accent-safe)" />
                  <p>{file.name}</p>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="drop-prompt">
                  <Upload size={32} />
                  <p>Click to browse or drag file here</p>
                  <span>PDF, PNG, JPG (Max 5MB)</span>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={isUploading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={`submit-btn ${isSuccess ? 'success' : ''}`} 
              disabled={!file || isUploading}
            >
              {isSuccess ? 'Encrypted & Saved!' : isUploading ? 'Securing...' : 'Add to Vault'}
            </button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 450px;
          padding: 30px;
          border-radius: 20px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
          position: relative;
        }
        .header-icon {
          background: var(--accent-secure-bg);
          padding: 8px;
          border-radius: 8px;
        }
        .close-btn {
          position: absolute;
          right: -10px;
          top: -10px;
          background: transparent;
          color: var(--text-muted);
        }
        .security-notice {
          background: var(--accent-safe-bg);
          color: var(--accent-safe);
          padding: 10px 15px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          margin-bottom: 25px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .form-group input, .form-group select {
          width: 100%;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          color: var(--text-primary);
          outline: none;
        }
        .file-dropzone {
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin-bottom: 25px;
          transition: var(--transition-smooth);
          cursor: pointer;
        }
        .file-dropzone:hover {
          border-color: var(--accent-secure);
          background: var(--accent-secure-bg);
        }
        .file-dropzone.has-file {
          border-style: solid;
          border-color: var(--accent-safe);
          background: var(--accent-safe-bg);
        }
        .drop-prompt p { margin: 10px 0 5px; color: var(--text-primary); }
        .drop-prompt span { font-size: 0.75rem; color: var(--text-muted); }
        .file-info p { margin: 10px 0 5px; font-weight: 500; }
        .file-info span { font-size: 0.75rem; color: var(--text-muted); }
        
        .error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--accent-danger);
          font-size: 0.8rem;
          margin-bottom: 20px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }
        .cancel-btn {
          flex: 1;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          padding: 12px;
          border-radius: 10px;
        }
        .submit-btn {
          flex: 2;
          background: var(--accent-secure);
          color: white;
          padding: 12px;
          border-radius: 10px;
          font-weight: 600;
          transition: var(--transition-smooth);
        }
        .submit-btn.success {
          background: var(--accent-safe);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default UploadModal;
