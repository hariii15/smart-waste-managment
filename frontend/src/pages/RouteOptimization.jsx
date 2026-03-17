import { useState, useEffect } from 'react';
import { getOptimizedRoute, getRoutes } from '../services/api';

function RouteOptimization() {
  const [activeRoute, setActiveRoute] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRouteData();
  }, []);

  const loadRouteData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [optimizedRoute, routesData] = await Promise.all([
        getOptimizedRoute(),
        getRoutes()
      ]);

      setActiveRoute(optimizedRoute);
      setAllRoutes(routesData);
    } catch (err) {
      setError('Failed to load route data');
      console.error('Route optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-pending';
    }
  };

  if (loading) {
    return (
      <div className="page">
        <h2>Route Optimization</h2>
        <div className="loading">Loading route data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Route Optimization</h2>
        <div className="error-message">{error}</div>
        <button onClick={loadRouteData} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Route Optimization</h2>

      {activeRoute ? (
        <div className="active-route-section">
          <h3>Active Collection Route</h3>
          <div className="route-card active">
            <div className="route-header">
              <div className="route-info">
                <span className="route-driver">Driver: {activeRoute.driverId}</span>
                <span className="route-truck">Truck: {activeRoute.truckId || 'N/A'}</span>
                <span className={`route-status ${getStatusColor(activeRoute.status)}`}>
                  {activeRoute.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="route-details">
              <div className="route-metrics">
                {activeRoute.metrics && (
                  <>
                    <div className="metric">
                      <span className="metric-label">Distance:</span>
                      <span className="metric-value">{activeRoute.metrics.totalDistance || 0} km</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Estimated Time:</span>
                      <span className="metric-value">{activeRoute.metrics.estimatedTime || 0} min</span>
                    </div>
                  </>
                )}
              </div>

              <div className="route-sequence">
                <h4>Collection Sequence</h4>
                <div className="bin-sequence-list">
                  {activeRoute.binSequence.map((binId, index) => (
                    <div key={binId} className="sequence-item">
                      <span className="sequence-number">{index + 1}</span>
                      <span className="sequence-bin">{binId}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-active-route">
          <p>No active collection route at this time.</p>
          <p>The system will automatically assign routes when bins reach critical levels.</p>
        </div>
      )}

      <div className="all-routes-section">
        <h3>All Routes</h3>
        <div className="routes-list">
          {allRoutes.map(route => (
            <div key={route.id} className={`route-card ${route.status === 'active' ? 'active' : ''}`}>
              <div className="route-header">
                <div className="route-info">
                  <span className="route-driver">Driver: {route.driverId}</span>
                  <span className="route-truck">Truck: {route.truckId || 'N/A'}</span>
                  <span className={`route-status ${getStatusColor(route.status)}`}>
                    {route.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="route-summary">
                <div className="route-metrics">
                  {route.metrics && (
                    <>
                      <span>{route.metrics.totalDistance || 0} km</span>
                      <span>{route.metrics.estimatedTime || 0} min</span>
                    </>
                  )}
                </div>
                <div className="route-bins-count">
                  {route.binSequence.length} bins
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="route-info">
        <h3>Route Optimization System</h3>
        <div className="info-content">
          <p>The route optimization system automatically creates efficient collection paths based on:</p>
          <ul>
            <li>Bin fill levels and priority</li>
            <li>Geographic location and traffic patterns</li>
            <li>Driver availability and truck capacity</li>
            <li>Time windows and operational constraints</li>
          </ul>
          <p>Routes are activated when bins reach critical fill levels (90%+) to ensure timely collection.</p>
        </div>
      </div>
    </div>
  );
}

export default RouteOptimization;