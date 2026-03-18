import { useState, useEffect } from 'react';
import { getBins, getAlerts } from '../services/api';

function Dashboard() {
  const [bins, setBins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

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

  const totalBins = bins.length;
  const fullBins = bins.filter(bin => bin.fillLevel >= 90).length;
  const averageFillLevel = bins.length > 0
    ? Math.round(bins.reduce((sum, bin) => sum + bin.fillLevel, 0) / bins.length)
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
            {bins.map(bin => (
              <div key={bin.id} className="bin-item">
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