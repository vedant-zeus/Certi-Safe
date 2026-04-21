import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VaultDashboard from './components/VaultDashboard.jsx';
import VaultDoor from './components/VaultDoor.jsx';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUnlocked) {
      fetchCertificates();
    }
  }, [isUnlocked]);

  const fetchCertificates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/certificates`);
      setCertificates(res.data);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unlockVault = () => {
    // Simulated unlocking process
    setIsUnlocked(true);
  };

  return (
    <div className="app-container">
      {!isUnlocked ? (
        <VaultDoor onUnlock={unlockVault} />
      ) : (
        <VaultDashboard 
          certificates={certificates} 
          refreshCertificates={fetchCertificates}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default App;
