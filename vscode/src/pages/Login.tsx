import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  // If already logged in, redirect to citas (only after auth finishes loading)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/admin/citas', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="login__spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate('/admin/citas');
    } else {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    }
    setLoading(false);
  };

  return (
    <div className="login">
      <div className="login__bg">
        <div className="blob" style={{ width: 600, height: 600, background: '#B2967D', top: '-20%', right: '-15%' }} />
        <div className="blob" style={{ width: 500, height: 500, background: '#7D5A44', bottom: '-15%', left: '-10%' }} />
      </div>

      <div className="login__card glass">
        <div className="login__header">
          <div className="login__logo">
            <span className="login__logo-icon">N</span>
          </div>
          <h1 className="login__title">Anadsll</h1>
          <p className="login__subtitle">Beauty Esthetic — Panel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="login__form" id="login-form">
          {error && (
            <div className="login__error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="login__field">
            <label htmlFor="login-email">
              <Mail size={16} /> Correo electrónico
            </label>
            <input
              type="email"
              id="login-email"
              placeholder="admin@anadsll.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="login__field">
            <label htmlFor="login-password">
              <Lock size={16} /> Contraseña
            </label>
            <div className="login__password-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                id="login-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login__password-toggle"
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login__submit"
            disabled={loading}
            id="login-submit"
          >
            {loading ? (
              <span className="login__spinner" />
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="login__demo">
          <p>Credenciales de prueba:</p>
          <code>admin@anadsll.com / admin123</code>
        </div>
      </div>
    </div>
  );
}
