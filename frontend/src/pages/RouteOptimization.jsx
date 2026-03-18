import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getOptimizedRoute, getRoutes, getBins, subscribeToRoute, updateRouteDriverLocation, resolveRouteAndMarkBinsCollected } from '../services/api';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Fix default marker icons in bundlers like Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function RouteOptimization() {
  const [activeRoute, setActiveRoute] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [bins, setBins] = useState([]);
  const [roadPath, setRoadPath] = useState([]); // road-following polyline
  const [routingError, setRoutingError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [driverPos, setDriverPos] = useState(null);
  const [trackError, setTrackError] = useState(null);
  const [driverCode, setDriverCode] = useState(null);
  const [currentRole, setCurrentRole] = useState('user');
  const watchIdRef = useRef(null);
  const unsubRouteRef = useRef(null);

  useEffect(() => {
    loadRouteData();
  }, []);

  const loadRouteData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [optimizedRoute, routesData, binsData] = await Promise.all([
        getOptimizedRoute(),
        getRoutes(),
        getBins(),
      ]);

      setActiveRoute(optimizedRoute);
      setAllRoutes(routesData);
      setBins(binsData);
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
      default:
        return 'status-pending';
    }
  };

  const binsByLogicalId = useMemo(() => {
    const m = new Map();
    for (const b of bins) {
      const key = b.binID || b.id;
      m.set(key, b);
    }
    return m;
  }, [bins]);

  const routeLatLngs = useMemo(() => {
    if (!activeRoute?.binSequence?.length) return [];
    const pts = [];
    for (const binId of activeRoute.binSequence) {
      const bin = binsByLogicalId.get(binId);
      const lat = bin?.location?.latitude;
      const lng = bin?.location?.longitude;
      if (typeof lat === 'number' && typeof lng === 'number') pts.push([lat, lng]);
    }
    return pts;
  }, [activeRoute, binsByLogicalId]);

  // Load current user's profile role + driverCode/employeeId (optional)
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!cancelled && snap.exists()) {
          const d = snap.data();
          setCurrentRole(d.role || 'user');
          // accept any of these keys if you store a driver identifier
          setDriverCode(d.driverCode || d.employeeId || d.driverId || null);
        }
      } catch {
        // ignore
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch a drivable route along roads (avoids cutting through buildings)
  useEffect(() => {
    let cancelled = false;

    async function fetchRoadRoute() {
      setRoutingError(null);
      setRoadPath([]);

      // Need at least 2 points
      if (routeLatLngs.length < 2) return;

      try {
        // OSRM expects lon,lat pairs separated by ';'
        const coords = routeLatLngs
          .map(([lat, lng]) => `${lng},${lat}`)
          .join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Routing API error (${res.status})`);

        const json = await res.json();
        const line = json?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(line) || line.length === 0) throw new Error('No route geometry returned');

        // GeoJSON: [lon,lat] -> Leaflet: [lat,lon]
        const latLngs = line.map(([lon, lat]) => [lat, lon]);

        if (!cancelled) setRoadPath(latLngs);
      } catch (e) {
        if (!cancelled) {
          setRoutingError(e?.message || 'Failed to compute road route');
          // Fallback: keep straight line so UI still works
          setRoadPath([]);
        }
      }
    }

    fetchRoadRoute();
    return () => {
      cancelled = true;
    };
  }, [routeLatLngs]);

  const mapCenter = useMemo(() => {
    if (routeLatLngs.length) return routeLatLngs[0];
    const first = bins.find(b => typeof b?.location?.latitude === 'number' && typeof b?.location?.longitude === 'number');
    if (first) return [first.location.latitude, first.location.longitude];
    // fallback: Bangalore-ish (matches server default)
    return [12.9716, 77.5946];
  }, [routeLatLngs, bins]);

  // Live subscribe to active route to receive driverLocation updates (for user/admin live tracking)
  useEffect(() => {
    // cleanup old subscription
    if (unsubRouteRef.current) {
      unsubRouteRef.current();
      unsubRouteRef.current = null;
    }

    if (!activeRoute?.id) return;

    unsubRouteRef.current = subscribeToRoute(
      activeRoute.id,
      (updated) => {
        if (!updated) return;
        setActiveRoute(updated);
        if (updated.driverLocation?.latitude && updated.driverLocation?.longitude) {
          setDriverPos({
            latitude: updated.driverLocation.latitude,
            longitude: updated.driverLocation.longitude,
            accuracy: updated.driverLocation.accuracy ?? null,
          });
        }
      },
      (e) => console.error('Route subscription error', e)
    );

    return () => {
      if (unsubRouteRef.current) {
        unsubRouteRef.current();
        unsubRouteRef.current = null;
      }
    };
  }, [activeRoute?.id]);

  const canDriverUpdateLocation = useMemo(() => {
    const uid = auth.currentUser?.uid;
    const routeDriver = activeRoute?.driverId;

    // Admins should always be allowed.
    const isAdmin = currentRole === 'admin';

    if (!uid || !activeRoute?.id) return false;
    if (isAdmin) return true;

    // Accept either: route.driverId is auth uid OR it matches a driverCode stored in profile.
    return routeDriver === uid || (driverCode && routeDriver === driverCode);
  }, [activeRoute?.id, activeRoute?.driverId, driverCode, currentRole]);

  async function startTracking() {
    setTrackError(null);

    if (!activeRoute?.id) {
      setTrackError('No active route to track');
      return;
    }

    if (!navigator.geolocation) {
      setTrackError('Geolocation not supported in this browser');
      return;
    }

    if (!canDriverUpdateLocation) {
      const uid = auth.currentUser?.uid;
      setTrackError(
        `Not allowed to share location for this route. Debug: uid=${uid || 'n/a'}, route.driverId=${activeRoute?.driverId || 'n/a'}, profile.driverCode=${driverCode || 'n/a'}`
      );
      return;
    }

    try {
      setTrackingEnabled(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          };
          setDriverPos(location);
          await updateRouteDriverLocation(activeRoute.id, location);
        },
        (err) => {
          setTrackError(err.message || 'Failed to read location');
          setTrackingEnabled(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );
    } catch (e) {
      setTrackError(e?.message || 'Failed to start tracking');
      setTrackingEnabled(false);
    }
  }

  function stopTracking() {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setTrackingEnabled(false);
  }

  useEffect(() => {
    return () => stopTracking();
  }, []);

  async function handleResolveRoute() {
    if (!activeRoute?.id) return;
    try {
      await resolveRouteAndMarkBinsCollected(activeRoute.id);
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to resolve route');
    }
  }

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

      {activeRoute?.id ? (
        <div className="dashboard-section" style={{ marginBottom: 16 }}>
          <h3>Live Tracking</h3>
          <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            Route driverId: <strong>{activeRoute?.driverId || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={startTracking} disabled={trackingEnabled || !activeRoute?.id}>
              {trackingEnabled ? 'Sharing location…' : 'Start sharing my location'}
            </button>
            <button className="btn" onClick={stopTracking} disabled={!trackingEnabled}>
              Stop
            </button>

            <button className="btn" onClick={handleResolveRoute}>
              Mark route as completed
            </button>

            {trackError ? <div className="error-message" style={{ margin: 0 }}>{trackError}</div> : null}
            {!canDriverUpdateLocation ? (
              <div className="info-message" style={{ margin: 0 }}>
                You can view tracking, but location sharing is enabled only for the assigned driver (or admin).
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="dashboard-section">
        <h3>Map View</h3>
        {routingError ? (
          <div className="info-message" style={{ marginBottom: 10 }}>
            Road routing unavailable: {routingError}. Showing straight-line path as fallback.
          </div>
        ) : null}
        <div style={{ height: 420, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Driver live position marker */}
            {driverPos?.latitude && driverPos?.longitude ? (
              <Marker position={[driverPos.latitude, driverPos.longitude]}>
                <Popup>
                  <div>
                    <strong>Driver location</strong>
                    {driverPos.accuracy ? <div>Accuracy: {Math.round(driverPos.accuracy)} m</div> : null}
                    {activeRoute?.driverId ? <div>Driver: {activeRoute.driverId}</div> : null}
                  </div>
                </Popup>
              </Marker>
            ) : null}

            {/* All bins as points */}
            {bins
              .filter(b => typeof b?.location?.latitude === 'number' && typeof b?.location?.longitude === 'number')
              .map((bin) => {
                const lat = bin.location.latitude;
                const lng = bin.location.longitude;
                const logicalId = bin.binID || bin.id;
                const isInRoute = activeRoute?.binSequence?.includes(logicalId);
                const isCritical = (bin.fillLevel ?? 0) >= 90 || bin.status === 'full';

                const stroke = isInRoute ? '#2563eb' : isCritical ? '#dc2626' : '#16a34a';
                const fill = isInRoute ? '#60a5fa' : isCritical ? '#ef4444' : '#22c55e';

                // Use CircleMarker for clearer data-point visualization
                return (
                  <CircleMarker
                    key={bin.id}
                    center={[lat, lng]}
                    radius={isInRoute ? 10 : 7}
                    pathOptions={{
                      color: stroke,
                      weight: 2,
                      fillColor: fill,
                      fillOpacity: 0.85,
                    }}
                  >
                    {/* Always-visible label */}
                    <Tooltip
                      permanent
                      direction="right"
                      offset={[10, 0]}
                      opacity={1}
                      className="bin-label"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: fill, border: `2px solid ${stroke}`, display: 'inline-block' }} />
                        <strong>{logicalId}</strong>
                      </span>
                    </Tooltip>

                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div><strong>Bin:</strong> {logicalId}</div>
                        <div><strong>Fill:</strong> {bin.fillLevel ?? 'N/A'}%</div>
                        <div><strong>Status:</strong> {bin.status || 'N/A'}</div>
                        {bin.zone ? <div><strong>Zone:</strong> {bin.zone}</div> : null}
                        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                          ({lat.toFixed(5)}, {lng.toFixed(5)})
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            {/* Active route polyline: prefer road-following geometry */}
            {roadPath.length >= 2 ? (
              <Polyline
                positions={roadPath}
                pathOptions={{ color: '#1d4ed8', weight: 6, opacity: 0.9 }}
              />
            ) : routeLatLngs.length >= 2 ? (
              <Polyline
                positions={routeLatLngs}
                pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.6, dashArray: '6 10' }}
              />
            ) : null}

            {/* Start marker for route */}
            {routeLatLngs.length ? (
              <Marker position={routeLatLngs[0]}>
                <Popup>
                  <strong>Route start</strong>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
          <span><strong>Legend:</strong></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: '#22c55e', display: 'inline-block' }} /> Normal bin
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: '#ef4444', display: 'inline-block' }} /> Critical/full bin
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: '#60a5fa', display: 'inline-block', border: '2px solid #2563eb' }} /> In active route
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 3, background: '#2563eb', display: 'inline-block', borderRadius: 999 }} /> Route path
          </span>
        </div>
      </div>

      {activeRoute ? (
        <div className="active-route-section">
          <h3>Active Collection Route</h3>
          <div className="route-card active">
            <div className="route-header">
              <div className="route-info">
                <span className="route-driver">Driver: {activeRoute.driverId}</span>
                <span className="route-truck">Truck: {activeRoute.truckId || 'N/A'}</span>
                <span className={`route-status ${getStatusColor(activeRoute.status)}`}>
                  {String(activeRoute.status || '').toUpperCase()}
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
                    {String(route.status || '').toUpperCase()}
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
        <h3>Route Visualization Notes</h3>
        <div className="info-content">
          <p>This map uses the open-source OpenStreetMap tile service and renders:</p>
          <ul>
            <li><strong>Bins</strong> as map points (green/ red by status)</li>
            <li><strong>Active route</strong> as a blue line in the visit order</li>
            <li>Click any point to see details</li>
          </ul>
          <p>
            If your bins don’t have <code>location.latitude</code> / <code>location.longitude</code>, add them in Firestore to enable mapping.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RouteOptimization;