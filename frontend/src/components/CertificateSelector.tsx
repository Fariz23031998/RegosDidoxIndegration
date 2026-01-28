import { useState, useEffect } from 'react';
import { listEimzoCertificates, EimzoCertificate } from '../services/eimzo';
import './CertificateSelector.css';

interface CertificateSelectorProps {
  onSelect: (certificate: EimzoCertificate, taxId: string) => void;
  onCancel?: () => void;
}

const CertificateSelector = ({ onSelect, onCancel }: CertificateSelectorProps) => {
  const [certificates, setCertificates] = useState<EimzoCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [taxId, setTaxId] = useState<string>('');

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get origin from current window location
      const origin = window.location.origin;
      const certs = await listEimzoCertificates(origin);
      setCertificates(certs);
      if (certs.length > 0) {
        setSelectedIndex(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load certificates. Make sure E-IMZO client is running.');
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedIndex === null || !certificates[selectedIndex]) {
      setError('Please select a certificate');
      return;
    }
    
    if (!taxId.trim()) {
      setError('Please enter TAX ID');
      return;
    }
    
    onSelect(certificates[selectedIndex], taxId.trim());
  };

  const getCertificateDisplayName = (cert: EimzoCertificate, index: number): string => {
    if (cert.cn) return cert.cn;
    if (cert.name) return cert.name;
    if (cert.alias) return cert.alias;
    return `Certificate ${index + 1}`;
  };

  const getCertificateDetails = (cert: EimzoCertificate): string => {
    const parts: string[] = [];
    if (cert.serial) parts.push(`Serial: ${cert.serial}`);
    if (cert.disk) parts.push(`Disk: ${cert.disk}`);
    if (cert.path) parts.push(`Path: ${cert.path}`);
    return parts.join(' • ') || 'No additional details';
  };

  if (loading) {
    return (
      <div className="certificate-selector">
        <div className="certificate-selector-content">
          <h2>Loading Certificates...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-selector">
        <div className="certificate-selector-content">
          <h2>Certificate Selection</h2>
          <div className="error-message">{error}</div>
          <div className="certificate-actions">
            <button onClick={loadCertificates} className="btn-primary">
              Retry
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="certificate-selector">
        <div className="certificate-selector-content">
          <h2>No Certificates Found</h2>
          <p>No E-IMZO certificates are available. Please ensure E-IMZO client is running and certificates are installed.</p>
          <div className="certificate-actions">
            <button onClick={loadCertificates} className="btn-primary">
              Refresh
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-selector">
      <div className="certificate-selector-content">
        <h2>Select Certificate</h2>
        <p className="certificate-selector-description">
          Please enter your TAX ID and select the certificate you want to use for authentication:
        </p>

        <div className="tax-id-input-group">
          <label htmlFor="tax-id">TAX ID (ИНН):</label>
          <input
            id="tax-id"
            type="text"
            value={taxId}
            onChange={(e) => {
              setTaxId(e.target.value);
              setError(null);
            }}
            placeholder="Enter TAX ID"
            className="tax-id-input"
            required
          />
        </div>
        
        <div className="certificate-list">
          {certificates.map((cert, index) => (
            <div
              key={index}
              className={`certificate-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <div className="certificate-radio">
                <input
                  type="radio"
                  name="certificate"
                  value={index}
                  checked={selectedIndex === index}
                  onChange={() => setSelectedIndex(index)}
                />
              </div>
              <div className="certificate-info">
                <div className="certificate-name">
                  {getCertificateDisplayName(cert, index)}
                </div>
                <div className="certificate-details">
                  {getCertificateDetails(cert)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="certificate-actions">
          <button
            onClick={handleSelect}
            disabled={selectedIndex === null || !taxId.trim()}
            className="btn-primary"
          >
            Use Selected Certificate
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateSelector;
