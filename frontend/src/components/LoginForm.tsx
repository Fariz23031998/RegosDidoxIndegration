import { useState } from 'react';
import { authApi } from '../api/documents';
import './LoginForm.css';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authApi.userLogin(username, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-form-content">
        <h2>Login</h2>
        <p className="login-form-description">
          Please enter your credentials to access the Didox Documents system.
        </p>
        
        {error && (
          <div className="error-message">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="btn-primary"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-form-info">
          <p><strong>Default credentials:</strong></p>
          <p>Username: <code>admin</code></p>
          <p>Password: <code>admin</code></p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
