import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initSessionPersistence, signInEmailPassword, signInWithGoogle } from '../services/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6 && !submitting;
  }, [email, password, submitting]);

  useEffect(() => {
    // Ensure session persistence is set before any login attempt
    initSessionPersistence().catch((e) => {
      console.error('Failed to set session persistence', e);
    });

    // If already logged in, redirect away from login
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/', { replace: true });
    });

    return () => unsub();
  }, [navigate]);

  async function handleEmailPassword(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signInEmailPassword(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setSubmitting(true);

    try {
      await signInWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__header">
          <h1 className="auth__title">Smart Waste</h1>
          <p className="auth__subtitle">Sign in to continue</p>
        </div>

        {error ? <div className="auth__error" role="alert">{error}</div> : null}

        <form className="auth__form" onSubmit={handleEmailPassword}>
          <label className="auth__label">
            Email
            <input
              className="auth__input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              required
            />
          </label>

          <label className="auth__label">
            Password
            <input
              className="auth__input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>

          <button className="btn btn--primary" type="submit" disabled={!canSubmit}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth__divider">
          <span>or</span>
        </div>

        <button className="btn btn--secondary" onClick={handleGoogle} disabled={submitting}>
          Continue with Google
        </button>

        <p className="auth__hint">
          Session persistence: <span className="auth__pill">Persistent</span>
        </p>
      </div>
    </div>
  );
}

function mapFirebaseAuthError(err) {
  const code = err?.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account is disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed.';
    case 'auth/account-exists-with-different-credential':
      return 'Account exists with a different sign-in method.';
    default:
      return err?.message || 'Sign-in failed. Please try again.';
  }
}
