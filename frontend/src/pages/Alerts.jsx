import { useState, useEffect } from 'react';
import { getAlerts } from '../services/api';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const alertsData = await getAlerts();
      setAlerts(alertsData);
    } catch (err) {
      setError('Failed to load alerts');
      console.error('Alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'alert-critical';
      case 'medium':
        return 'alert-medium';
      case 'low':
        return 'alert-low';
      default:
        return 'alert-low';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'high':
        return 'High Priority';
      case 'critical':
        return 'Critical';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
      default:
        return 'Low Priority';
    }
  };

  if (loading) {
    return (
      <div className="page">
        <h2>Alerts</h2>
        <div className="loading">Loading alerts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Alerts</h2>
        <div className="error-message">{error}</div>
        <button onClick={loadAlerts} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>System Alerts</h2>

      <div className="alerts-summary">
        <div className="summary-item">
          <span className="summary-value critical">{alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length}</span>
          <span className="summary-label">Critical/High Priority</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{alerts.filter(a => a.severity === 'medium').length}</span>
          <span className="summary-label">Medium Priority</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{alerts.length}</span>
          <span className="summary-label">Total Alerts</span>
        </div>
      </div>

      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <p>No active alerts at this time.</p>
            <p>All waste bins are within acceptable fill levels.</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map(alert => (
              <div key={alert.id} className={`alert-item ${getSeverityColor(alert.severity)}`}>
                <div className="alert-header">
                  <span className="alert-severity">{getSeverityText(alert.severity)}</span>
                  <span className="alert-bin">Bin {alert.binId}</span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-details">
                  <span className="alert-fill-level">Fill Level: {alert.fillLevel}%</span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alerts-info">
        <h3>Alert System</h3>
        <div className="alert-types">
          <div className="alert-type">
            <span className="alert-type-indicator critical"></span>
            <div className="alert-type-info">
              <strong>Critical:</strong> Bins at 90%+ capacity requiring immediate attention
            </div>
          </div>
          <div className="alert-type">
            <span className="alert-type-indicator high"></span>
            <div className="alert-type-info">
              <strong>High Priority:</strong> Bins at 75-89% capacity
            </div>
          </div>
          <div className="alert-type">
            <span className="alert-type-indicator medium"></span>
            <div className="alert-type-info">
              <strong>Medium Priority:</strong> Bins at 50-74% capacity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Alerts;