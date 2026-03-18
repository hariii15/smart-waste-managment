import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { logout } from './services/auth';

import DriverHome from './pages/DriverHome';
import UserHome from './pages/UserHome';
import BinManagement from './pages/BinManagement';
import Alerts from './pages/Alerts';
import RouteOptimization from './pages/RouteOptimization';
import CustomerReporting from './pages/CustomerReporting';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setProfile(null);
        setProfileReady(true);
        setReady(true);
        return;
      }

      setProfileReady(false);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error('Failed to load user profile', e);
        setProfile(null);
      } finally {
        setProfileReady(true);
        setReady(true);
      }
    });

    return () => unsub();
  }, []);

  async function handleLogout() {
    await logout();
  }

  if (!ready || (user && !profileReady)) {
    return (
      <div className="app">
        <main className="main-content">
          <div className="loading">Loading…</div>
        </main>
      </div>
    );
  }

  const role = profile?.role || 'user';
  const isAdmin = role === 'admin';
  const isDriver = role === 'driver' || role === 'admin';

  const homePath = isDriver ? '/driver' : '/user';

  return (
    <Router>
      <div className="app">
        {user ? (
          <nav className="navbar">
            <div className="nav-brand">
              <h1>Smart Waste</h1>
            </div>
            <ul className="nav-links">
              <li><Link to={homePath} className="nav-link">Home</Link></li>
              {isDriver ? <li><Link to="/bins" className="nav-link">Bins</Link></li> : null}
              {isDriver ? <li><Link to="/alerts" className="nav-link">Alerts</Link></li> : null}
              {isDriver ? <li><Link to="/routes" className="nav-link">Routes</Link></li> : null}
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
            <Route path="/login" element={user ? <Navigate to={homePath} replace /> : <Login />} />

            {/* Default route: send to role home */}
            <Route path="/" element={user ? <Navigate to={homePath} replace /> : <Navigate to="/login" replace />} />

            {/* Shared dashboard route (restricted content inside component) */}
            <Route path="/dashboard" element={user ? <Dashboard isDriver={isDriver} isAdmin={isAdmin} role={role} /> : <Navigate to="/login" replace />} />

            {/* Role homes */}
            <Route path="/user" element={user ? <UserHome /> : <Navigate to="/login" replace />} />
            <Route path="/driver" element={user ? (isDriver ? <DriverHome role={role} isDriver={isDriver} /> : <Navigate to="/user" replace />) : <Navigate to="/login" replace />} />

            {/* Driver-only tools */}
            <Route path="/bins" element={user ? (isDriver ? <BinManagement /> : <Navigate to="/user" replace />) : <Navigate to="/login" replace />} />
            <Route path="/alerts" element={user ? (isDriver ? <Alerts /> : <Navigate to="/user" replace />) : <Navigate to="/login" replace />} />
            <Route path="/routes" element={user ? (isDriver ? <RouteOptimization /> : <Navigate to="/user" replace />) : <Navigate to="/login" replace />} />

            {/* Everyone signed-in can report */}
            <Route path="/report" element={user ? <CustomerReporting /> : <Navigate to="/login" replace />} />

            {/* Admin only */}
            <Route path="/admin/users" element={user ? (isAdmin ? <AdminUsers currentUser={profile} /> : <Navigate to={homePath} replace />) : <Navigate to="/login" replace />} />

            <Route path="*" element={<Navigate to={user ? homePath : '/login'} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
