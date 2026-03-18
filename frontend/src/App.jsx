import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { logout } from './services/auth';

import Dashboard from './pages/Dashboard';
import BinManagement from './pages/BinManagement';
import Alerts from './pages/Alerts';
import RouteOptimization from './pages/RouteOptimization';
import CustomerReporting from './pages/CustomerReporting';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import './App.css';

function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setProfile(null);
        setReady(true);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error('Failed to load user profile', e);
        setProfile(null);
      } finally {
        setReady(true);
      }
    });

    return () => unsub();
  }, []);

  async function handleLogout() {
    await logout();
  }

  if (!ready) {
    return (
      <div className="app">
        <main className="main-content">
          <div className="loading">Loading…</div>
        </main>
      </div>
    );
  }

  const isAdmin = (profile?.role || 'user') === 'admin';

  return (
    <Router>
      <div className="app">
        {user ? (
          <nav className="navbar">
            <div className="nav-brand">
              <h1>Smart Waste</h1>
            </div>
            <ul className="nav-links">
              <li><Link to="/" className="nav-link">Dashboard</Link></li>
              <li><Link to="/bins" className="nav-link">Bins</Link></li>
              <li><Link to="/alerts" className="nav-link">Alerts</Link></li>
              <li><Link to="/routes" className="nav-link">Routes</Link></li>
              <li><Link to="/report" className="nav-link">Report</Link></li>
              {isAdmin ? <li><Link to="/admin/users" className="nav-link">Users</Link></li> : null}
            </ul>
            <div className="nav-user">
              <span className="nav-user__email" title={user.email || ''}>
                {user.email || 'Signed in'}
                {profile?.role ? ` • ${profile.role}` : ''}
              </span>
              <button className="btn btn--secondary btn--sm" onClick={handleLogout}>Sign out</button>
            </div>
          </nav>
        ) : null}

        <main className="main-content">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
            <Route path="/bins" element={user ? <BinManagement /> : <Navigate to="/login" replace />} />
            <Route path="/alerts" element={user ? <Alerts /> : <Navigate to="/login" replace />} />
            <Route path="/routes" element={user ? <RouteOptimization /> : <Navigate to="/login" replace />} />
            <Route path="/report" element={user ? <CustomerReporting /> : <Navigate to="/login" replace />} />

            <Route
              path="/admin/users"
              element={user ? <AdminUsers currentUser={profile} /> : <Navigate to="/login" replace />}
            />

            <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
