import { useState, useEffect, useMemo } from 'react';
import { getBins, getAlerts } from '../services/api';

function Dashboard({ isDriver = false /* admin is included in isDriver */, role = 'user' }) {
  const [bins, setBins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Restriction: only drivers/admins can load bin status + alerts
      if (!isDriver) {
        setBins([]);
        setAlerts([]);
        return;
      }

      const [binsData, alertsData] = await Promise.all([
        getBins(),
        getAlerts()
      ]);

      setBins(binsData);
      setAlerts(alertsData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const dedupedBins = useMemo(() => {
    const byBinId = new Map();
    for (const b of bins) {
      const key = b.binID || b.id;
      const existing = byBinId.get(key);
      if (!existing) {
        byBinId.set(key, b);
        continue;
      }
      const t1 = Date.parse(existing.lastUpdated || existing.updatedAt || existing.createdAt || 0) || 0;
      const t2 = Date.parse(b.lastUpdated || b.updatedAt || b.createdAt || 0) || 0;
      if (t2 >= t1) byBinId.set(key, b);
    }
    return Array.from(byBinId.values());
  }, [bins]);

  const getStatusColor = (status, fillLevel) => {
    if (fillLevel >= 90) return 'status-critical';
    if (status === 'full' || fillLevel >= 75) return 'status-high';
    if (status === 'partial' || fillLevel >= 50) return 'status-medium';
    return 'status-low';
  };

  const getStatusText = (status, fillLevel) => {
    if (fillLevel >= 90) return 'Critical';
    if (status === 'full' || fillLevel >= 75) return 'High';
    if (status === 'partial' || fillLevel >= 50) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <div className="error-message">{error}</div>
        <button onClick={loadDashboardData} className="btn-primary">Retry</button>
      </div>
    );
  }

  // Restriction: users should not see bin status numbers/overview.
  if (!isDriver) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <div className="info-message">
          Limited view for role: <strong>{role}</strong>. Bin status and operational metrics are available to drivers and admins only.
        </div>
      </div>
    );
  }

  const totalBins = dedupedBins.length;
  const fullBins = dedupedBins.filter(bin => bin.fillLevel >= 90).length;
  const averageFillLevel = dedupedBins.length > 0
    ? Math.round(dedupedBins.reduce((sum, bin) => sum + bin.fillLevel, 0) / dedupedBins.length)
    : 0;

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <div className="dashboard-stats">
        <div className="stat-item">
          <div className="stat-value">{totalBins}</div>
          <div className="stat-label">Total Bins</div>
        </div>
        <div className="stat-item">
          <div className="stat-value critical">{fullBins}</div>
          <div className="stat-label">Critical Bins</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{averageFillLevel}%</div>
          <div className="stat-label">Average Fill Level</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{alerts.length}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h3>Bin Status Overview</h3>
          <div className="bins-grid">
            {dedupedBins.map(bin => (
              <div key={bin.binID || bin.id} className="bin-item">
                <div className="bin-header">
                  <span className="bin-id">{bin.binID}</span>
                  <span className={`bin-status ${getStatusColor(bin.status, bin.fillLevel)}`}>
                    {getStatusText(bin.status, bin.fillLevel)}
                  </span>
                </div>
                <div className="bin-fill">
                  <div className="fill-bar">
                    <div
                      className="fill-level"
                      style={{ width: `${bin.fillLevel}%` }}
                    ></div>
                  </div>
                  <span className="fill-percentage">{bin.fillLevel}%</span>
                </div>
                <div className="bin-location">
                  {bin.zone && <span>Zone: {bin.zone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="dashboard-section">
            <h3>Critical Alerts</h3>
            <div className="alerts-list">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="alert-item critical">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;