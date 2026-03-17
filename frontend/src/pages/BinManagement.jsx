import { useState, useEffect } from 'react';
import { getBins, updateBin } from '../services/api';

function BinManagement() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingBin, setUpdatingBin] = useState(null);
  const [newFillLevel, setNewFillLevel] = useState('');

  useEffect(() => {
    loadBins();
  }, []);

  const loadBins = async () => {
    try {
      setLoading(true);
      setError(null);
      const binsData = await getBins();
      setBins(binsData);
    } catch (err) {
      setError('Failed to load bins');
      console.error('Bin management error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFillLevel = async (binId) => {
    if (!newFillLevel || newFillLevel < 0 || newFillLevel > 100) {
      alert('Please enter a valid fill level between 0 and 100');
      return;
    }

    try {
      await updateBin(binId, newFillLevel);
      setUpdatingBin(null);
      setNewFillLevel('');
      loadBins(); // Refresh the data
    } catch (err) {
      alert('Failed to update bin fill level');
      console.error('Update error:', err);
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
        <h2>Bin Management</h2>
        <div className="loading">Loading bins...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Bin Management</h2>
        <div className="error-message">{error}</div>
        <button onClick={loadBins} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Bin Management</h2>

      <div className="bins-management">
        <table className="bins-table">
          <thead>
            <tr>
              <th>Bin ID</th>
              <th>Zone</th>
              <th>Current Fill Level</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bins.map(bin => (
              <tr key={bin.id}>
                <td>{bin.binID}</td>
                <td>{bin.zone || 'N/A'}</td>
                <td>
                  <div className="fill-display">
                    <div className="fill-bar">
                      <div
                        className="fill-level"
                        style={{ width: `${bin.fillLevel}%` }}
                      ></div>
                    </div>
                    <span className="fill-percentage">{bin.fillLevel}%</span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${getStatusColor(bin.status, bin.fillLevel)}`}>
                    {getStatusText(bin.status, bin.fillLevel)}
                  </span>
                </td>
                <td>
                  {bin.lastUpdated
                    ? new Date(bin.lastUpdated).toLocaleString()
                    : 'Never'
                  }
                </td>
                <td>
                  {updatingBin === bin.id ? (
                    <div className="update-form">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newFillLevel}
                        onChange={(e) => setNewFillLevel(e.target.value)}
                        placeholder="0-100"
                        className="fill-input"
                      />
                      <button
                        onClick={() => handleUpdateFillLevel(bin.id)}
                        className="btn-small"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => {
                          setUpdatingBin(null);
                          setNewFillLevel('');
                        }}
                        className="btn-small secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setUpdatingBin(bin.id)}
                      className="btn-small"
                    >
                      Update Fill Level
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="management-info">
        <h3>Instructions</h3>
        <ul>
          <li>Click "Update Fill Level" to modify a bin's current fill percentage</li>
          <li>Enter a value between 0-100%</li>
          <li>The system will automatically update the bin status based on the fill level</li>
          <li>Critical alerts are triggered for bins above 90% capacity</li>
        </ul>
      </div>
    </div>
  );
}

export default BinManagement;