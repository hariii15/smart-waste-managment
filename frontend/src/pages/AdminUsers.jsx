import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { setUserDriverCode, setUserRole } from '../services/auth';

export default function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUid, setSavingUid] = useState(null);

  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  async function load() {
    try {
      setError('');
      setLoading(true);

      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(uid, role) {
    try {
      setSavingUid(uid);
      await setUserRole(uid, role);
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update role');
    } finally {
      setSavingUid(null);
    }
  }

  async function handleDriverCodeChange(uid, driverCode) {
    try {
      setSavingUid(uid);
      await setUserDriverCode(uid, driverCode);
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update driver code');
    } finally {
      setSavingUid(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <h2>Users</h2>
        <div className="error-message">Admin access required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <h2>Users</h2>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Users</h2>
      {error ? <div className="error-message">{error}</div> : null}

      <div className="bins-management">
        <table className="bins-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Driver Code</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid || u.id}>
                <td>{u.email || '—'}</td>
                <td>{u.displayName || '—'}</td>
                <td>{u.role || 'user'}</td>
                <td>
                  <input
                    className="fill-input"
                    style={{ width: 160 }}
                    placeholder="e.g. DRIVER_01"
                    defaultValue={u.driverCode || ''}
                    disabled={savingUid === (u.uid || u.id)}
                    onBlur={(e) => handleDriverCodeChange(u.uid || u.id, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={u.role || 'user'}
                    disabled={savingUid === (u.uid || u.id)}
                    onChange={(e) => handleRoleChange(u.uid || u.id, e.target.value)}
                    className="fill-input"
                    style={{ width: 160 }}
                  >
                    <option value="user">user</option>
                    <option value="driver">driver</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="management-info">
        <h3>Notes</h3>
        <ul>
          <li><code>driverCode</code> should match <code>routes.driverId</code> (example: <code>DRIVER_01</code>).</li>
          <li>Roles are stored in Firestore collection <code>users</code>.</li>
          <li>Default role for new sign-ins is <code>user</code>.</li>
          <li>Only admins should be allowed to change roles/codes (see Firestore rules).</li>
        </ul>
      </div>
    </div>
  );
}
