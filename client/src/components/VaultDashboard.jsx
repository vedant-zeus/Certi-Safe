import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderLock, 
  Upload, 
  ShieldCheck, 
  User, 
  LogOut, 
  Plus,
  RefreshCw
} from 'lucide-react';
import CertificateList from './CertificateList.jsx';
import UploadModal from './UploadModal.jsx';

const VaultDashboard = ({ certificates, refreshCertificates, isLoading }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="sidebar-logo">
          <ShieldCheck color="var(--accent-secure)" size={32} />
          <span>SafeVault</span>
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <FolderLock size={20} />
            <span>My Documents</span>
          </button>
          <button className="nav-item">
            <ShieldCheck size={20} />
            <span>KYC Link</span>
          </button>
          <button className="nav-item">
            <User size={20} />
            <span>Identity</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => window.location.reload()}>
            <LogOut size={18} />
            <span>Lock Vault</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-title">
            <h1>Secure Vault</h1>
            <p>Managed encrypted certificates and identifying documents.</p>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={refreshCertificates} title="Refresh">
              <RefreshCw size={20} className={isLoading ? 'spinning' : ''} />
            </button>
            <button className="primary-btn" onClick={() => setIsUploadOpen(true)}>
              <Plus size={20} />
              <span>Add Document</span>
            </button>
          </div>
        </header>

        <section className="content-body">
          <CertificateList 
            certificates={certificates} 
            isLoading={isLoading} 
            refresh={refreshCertificates} 
          />
        </section>
      </main>

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={() => {
            setIsUploadOpen(false);
            refreshCertificates();
          }}
        />
      )}

      <style>{`
        .dashboard-container {
          display: flex;
          height: 100vh;
          background-color: var(--bg-primary);
        }
        .sidebar {
          width: 280px;
          height: calc(100vh - 40px);
          margin: 20px;
          margin-right: 0;
          display: flex;
          flex-direction: column;
          padding: 30px;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 50px;
        }
        .sidebar-logo span {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-grow: 1;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 14px 20px;
          border-radius: 12px;
          color: var(--text-secondary);
          background: transparent;
          transition: var(--transition-smooth);
        }
        .nav-item:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }
        .nav-item.active {
          color: var(--text-primary);
          background: var(--accent-secure-bg);
          border-left: 3px solid var(--accent-secure);
        }
        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
        }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--accent-danger);
          background: transparent;
          width: 100%;
          padding: 10px;
        }
        .main-content {
          flex-grow: 1;
          padding: 40px 60px;
          overflow-y: auto;
        }
        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        .header-title h1 {
          font-size: 2.2rem;
          margin-bottom: 8px;
        }
        .header-title p {
          color: var(--text-muted);
        }
        .header-actions {
          display: flex;
          gap: 15px;
        }
        .primary-btn {
          background: var(--accent-secure);
          color: white;
          padding: 12px 24px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          transition: var(--transition-smooth);
        }
        .primary-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }
        .refresh-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 12px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VaultDashboard;
