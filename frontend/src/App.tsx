import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DocumentsList from './components/DocumentsList';
import DocumentDetail from './components/DocumentDetail';
import CertificateSelector from './components/CertificateSelector';
import LoginForm from './components/LoginForm';
import { authApi } from './api/documents';
import './App.css';

type AuthState = 'login' | 'certificate' | 'authenticated';

function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      // Check if user has completed Didox login by trying to get documents
      try {
        // Try to fetch documents to verify Didox token exists
        const response = await fetch('http://localhost:8000/api/documents?limit=1', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          setAuthState('authenticated');
        } else {
          setAuthState('certificate');
        }
      } catch (error) {
        // JWT token exists but might need Didox login
        setAuthState('certificate');
      }
    } else {
      setAuthState('login');
    }
    setIsLoading(false);
  };

  const handleUserLoginSuccess = () => {
    setAuthState('certificate');
  };

  const handleCertificateSelect = async (certificate: any, taxId: string) => {
    try {
      setIsLoading(true);
      
      // Base64 encode TAX_ID
      const taxIdB64 = btoa(taxId);
      
      // Sign with E-IMZO
      const origin = window.location.origin;
      const { signWithEimzo } = await import('./services/eimzo');
      const [pkcs7, signatureHex] = await signWithEimzo(taxIdB64, origin, certificate);
      
      // Send signed data to backend for Didox login
      await authApi.didoxLogin(pkcs7, signatureHex, taxId);
      setAuthState('authenticated');
    } catch (error: any) {
      console.error('Didox authentication failed:', error);
      alert(error.message || 'Failed to authenticate with Didox');
      // Stay on certificate selector
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setAuthState('login');
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (authState === 'login') {
    return <LoginForm onLoginSuccess={handleUserLoginSuccess} />;
  }

  if (authState === 'certificate') {
    return (
      <CertificateSelector
        onSelect={handleCertificateSelect}
        onCancel={() => {
          handleLogout();
        }}
      />
    );
  }

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>
            <Link to="/">Didox Documents Viewer</Link>
          </h1>
          <nav>
            <Link to="/">Documents</Link>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<DocumentsList />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
