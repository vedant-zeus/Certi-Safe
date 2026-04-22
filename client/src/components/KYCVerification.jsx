import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, UserCheck, FileText } from 'lucide-react';
import axios from 'axios';

const KYC_API_BASE = 'http://localhost:3000/api/v1/kyc';

const KYCVerification = ({ onVerified, onCancel }) => {
  const [step, setStep] = useState(1); // 1: Document, 2: Face, 3: Success
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState({ aadhaar: null, pan: null });
  const [capturedImage, setCapturedImage] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileUpload = (e, type) => {
    setFiles({ ...files, [type]: e.target.files[0] });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const captureImage = () => {
    const context = canvasRef.current.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, 400, 300);
    const data = canvasRef.current.toDataURL('image/jpeg');
    setCapturedImage(data);
    
    // Stop camera
    const stream = videoRef.current.srcObject;
    stream.getTracks().forEach(track => track.stop());
  };

  const submitOCR = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      if (files.aadhaar) formData.append('aadhaar', files.aadhaar);
      if (files.pan) formData.append('pan', files.pan);
      
      const res = await axios.post(`${KYC_API_BASE}/verify`, formData);
      if (res.data.status === 'success') {
        setStep(2);
        startCamera();
      } else {
        setError('OCR Verification failed. Please check your documents.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection to KYC service failed. Please ensure the KYC server is running on port 3000.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const submitFace = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // In a real app, we'd send the captured image to the liveness endpoint
      // For this demo, we simulate the verification success
      setTimeout(() => {
        setStep(3);
        setIsProcessing(false);
        setTimeout(onVerified, 2000);
      }, 2000);
    } catch (err) {
      setError('Face verification failed.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="kyc-overlay">
      <motion.div 
        className="kyc-modal glass"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="kyc-steps">
          <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="step-content"
            >
              <h3><FileText className="inline-icon" /> Document Verification</h3>
              <p>Upload your Aadhaar or PAN card for OCR processing.</p>
              
              <div className="upload-grid">
                <label className="upload-box">
                  <Upload size={24} />
                  <span>{files.aadhaar ? files.aadhaar.name : 'Aadhaar Card'}</span>
                  <input type="file" hidden onChange={(e) => handleFileUpload(e, 'aadhaar')} />
                </label>
                <label className="upload-box">
                  <Upload size={24} />
                  <span>{files.pan ? files.pan.name : 'PAN Card'}</span>
                  <input type="file" hidden onChange={(e) => handleFileUpload(e, 'pan')} />
                </label>
              </div>

              {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
              
              <button 
                className="kyc-btn primary" 
                onClick={submitOCR}
                disabled={isProcessing || (!files.aadhaar && !files.pan)}
              >
                {isProcessing ? <Loader2 className="spin" /> : 'Verify Documents'}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="step-content"
            >
              <h3><Camera className="inline-icon" /> Face Liveness</h3>
              <p>Look into the camera to verify your identity.</p>
              
              <div className="camera-preview">
                {!capturedImage ? (
                  <video ref={videoRef} autoPlay playsInline muted />
                ) : (
                  <img src={capturedImage} alt="Captured" />
                )}
                <canvas ref={canvasRef} width="400" height="300" style={{ display: 'none' }} />
              </div>

              {!capturedImage ? (
                <button className="kyc-btn secondary" onClick={captureImage}>
                  Capture Photo
                </button>
              ) : (
                <button className="kyc-btn primary" onClick={submitFace} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="spin" /> : 'Confirm Identity'}
                </button>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="step-content success"
            >
              <CheckCircle2 size={64} color="var(--accent-secure)" />
              <h3>Identity Verified</h3>
              <p>Welcome back! Accessing your secure vault...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        .kyc-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .kyc-modal {
          width: 450px;
          padding: 40px;
          border-radius: 28px;
          text-align: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .kyc-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 30px;
        }
        .step-indicator {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
        }
        .step-indicator.active {
          background: var(--accent-secure);
          color: white;
          box-shadow: 0 0 15px var(--accent-secure);
        }
        .step-line {
          width: 40px;
          height: 2px;
          background: rgba(255,255,255,0.1);
        }
        .step-content h3 {
          margin-bottom: 10px;
          color: var(--text-primary);
        }
        .step-content p {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 25px;
        }
        .upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .upload-box {
          padding: 20px;
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          transition: 0.3s;
        }
        .upload-box:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--accent-secure);
        }
        .upload-box span {
          font-size: 0.75rem;
          color: var(--text-muted);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .camera-preview {
          width: 100%;
          aspect-ratio: 4/3;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 20px;
          border: 2px solid var(--accent-secure);
        }
        .camera-preview video, .camera-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .kyc-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .kyc-btn.primary {
          background: var(--accent-secure);
          color: white;
        }
        .kyc-btn.secondary {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }
        .kyc-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error-msg {
          color: var(--accent-danger);
          font-size: 0.8rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .inline-icon { vertical-align: middle; margin-right: 8px; }
      `}</style>
    </div>
  );
};

export default KYCVerification;
