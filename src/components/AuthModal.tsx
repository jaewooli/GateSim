import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignUp ? '/gatesimulator/api/auth/register' : '/gatesimulator/api/auth/login';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isSignUp) {
        // Automatically log in after registration
        const loginResponse = await fetch('/gatesimulator/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
          throw new Error(loginData.error || 'Failed to login after signup');
        }
        onLoginSuccess(loginData.token, loginData.username);
        onClose();
      } else {
        onLoginSuccess(data.token, data.username);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              fontSize: '11px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontWeight: 800
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Username Input */}
          <div className="inspector-group">
            <label className="inspector-label" htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              className="inspector-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              maxLength={20}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div className="inspector-group">
            <label className="inspector-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="inspector-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          {/* Toggle Login/Signup */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={{ color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer" style={{ marginTop: '8px' }}>
            <button type="button" className="outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
