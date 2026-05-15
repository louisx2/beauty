import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Sun, Moon } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);
  const storeError = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.loading);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/admin/citas', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Clear error when user starts typing again
  const handleEmailChange = (v: string) => { clearError(); setEmail(v); };
  const handlePassChange = (v: string) => { clearError(); setPassword(v); };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="login__spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    if (ok) navigate('/admin/citas');
    setLoading(false);
  };

  return (
    <div className="login">
      <div className="login__bg">
        <div className="blob" style={{ width: 600, height: 600, background: '#B2967D', top: '-20%', right: '-15%' }} />
        <div className="blob" style={{ width: 500, height: 500, background: '#7D5A44', bottom: '-15%', left: '-10%' }} />
      </div>

      {/* Theme toggle — top right corner */}
      <button
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 10,
          background: theme === 'light' ? 'rgba(61,46,36,0.1)' : 'rgba(255,255,255,0.12)',
          border: theme === 'light' ? '1px solid rgba(61,46,36,0.2)' : '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme === 'light' ? 'rgba(61,46,36,0.7)' : 'rgba(255,255,255,0.8)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login__card glass">
        <div className="login__header">
          <div className="login__logo">
            <span className="login__logo-icon">N</span>
          </div>
          <h1 className="login__title">Anadsll</h1>
          <p className="login__subtitle">Beauty Esthetic — Panel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="login__form" id="login-form">
          {storeError && (
            <div className="login__error">
              <AlertCircle size={16} />
              {storeError}
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
              onChange={(e) => handleEmailChange(e.target.value)}
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
                onChange={(e) => handlePassChange(e.target.value)}
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
