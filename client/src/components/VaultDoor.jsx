import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Unlock, KeyRound } from 'lucide-react';

const VaultDoor = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = () => {
    setIsVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      if (pin === '1234') { // Default demo pin
        onUnlock();
      } else {
        setIsError(true);
        setIsVerifying(false);
        setPin('');
        setTimeout(() => setIsError(false), 1000);
      }
    }, 1500);
  };

  return (
    <div className="vault-door-container">
      <motion.div 
        className="vault-mechanism glass"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="vault-header">
          <motion.div
            animate={isVerifying ? { rotate: 360 } : {}}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          >
            {isVerifying ? <KeyRound size={48} color="var(--accent-secure)" /> : <Shield size={48} color="var(--accent-secure)" />}
          </motion.div>
          <h2>SAFEVAULT</h2>
          <p>Secure Certificate Repository</p>
        </div>

        <div className="pin-input-area">
          <div className="dots-container">
            {[...Array(4)].map((_, i) => (
              <motion.div 
                key={i}
                className={`dot ${pin.length > i ? 'active' : ''} ${isError ? 'error' : ''}`}
                animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
              />
            ))}
          </div>

          <div className="keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((key) => (
              <button 
                key={key} 
                className="keypad-btn"
                onClick={() => {
                  if (key === 'C') setPin('');
                  else if (key === 'OK') handleUnlock();
                  else if (pin.length < 4) setPin(pin + key);
                }}
                disabled={isVerifying}
              >
                {key === 'OK' ? <Unlock size={20} /> : key}
              </button>
            ))}
          </div>
        </div>

        <div className="vault-status">
          {isError ? (
            <span className="status-text error">Access Denied</span>
          ) : isVerifying ? (
            <span className="status-text secure">Decrypting Vault...</span>
          ) : (
            <span className="status-text">Enter Security PIN (Demo: 1234)</span>
          )}
        </div>
      </motion.div>

      <style>{`
        .vault-door-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, #1A1D24 0%, #0F1115 100%);
        }
        .vault-mechanism {
          width: 380px;
          padding: 40px;
          text-align: center;
          border-radius: 24px;
        }
        .vault-header h2 {
          margin-top: 15px;
          letter-spacing: 4px;
          color: var(--text-primary);
        }
        .vault-header p {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin-bottom: 30px;
        }
        .dots-container {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 30px;
        }
        .dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          transition: var(--transition-smooth);
        }
        .dot.active {
          background: var(--accent-secure);
          box-shadow: 0 0 10px var(--accent-secure);
        }
        .dot.error {
          background: var(--accent-danger);
        }
        .keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .keypad-btn {
          height: 60px;
          border-radius: 12px;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 1.2rem;
          font-weight: 500;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .keypad-btn:hover:not(:disabled) {
          background: var(--border-color);
          transform: translateY(-2px);
        }
        .keypad-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .vault-status {
          margin-top: 30px;
          height: 20px;
        }
        .status-text {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .status-text.error { color: var(--accent-danger); }
        .status-text.secure { color: var(--accent-secure); font-weight: 600; }
      `}</style>
    </div>
  );
};

export default VaultDoor;
