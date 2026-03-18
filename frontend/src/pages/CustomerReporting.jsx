import { useState, useEffect } from 'react';
import { getBins, createUserReport } from '../services/api';

function CustomerReporting() {
  const [bins, setBins] = useState([]);
  const [formData, setFormData] = useState({
    binId: '',
    message: '',
    reporterName: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBins();
  }, []);

  const loadBins = async () => {
    try {
      const binsData = await getBins();
      setBins(binsData);
    } catch (err) {
      console.error('Error loading bins:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.binId || !formData.message.trim()) {
      setError('Please select a bin and provide a message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createUserReport({
        binId: formData.binId,
        description: formData.message.trim(),
        reporterName: formData.reporterName.trim() || 'Anonymous'
      });

      setSuccess(true);
      setFormData({
        binId: '',
        message: '',
        reporterName: ''
      });

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      setError('Failed to submit report. Please try again.');
      console.error('Report submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="page">
      <h2>Report Waste Collection Issue</h2>

      <div className="reporting-container">
        <div className="reporting-form-section">
          <h3>Submit a Report</h3>
          <p>Report overflowing bins, damaged containers, or other waste collection issues in your area.</p>

          {success && (
            <div className="success-message">
              Thank you! Your report has been submitted successfully. Our team will review it shortly.
            </div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="report-form">
            <div className="form-group">
              <label htmlFor="binId">Bin ID *</label>
              <select
                id="binId"
                name="binId"
                value={formData.binId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a bin...</option>
                {bins.map(bin => (
                  <option key={bin.id} value={bin.binID}>
                    {bin.binID} - {bin.zone || 'Unknown Zone'} ({bin.fillLevel}% full)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reporterName">Your Name (Optional)</label>
              <input
                type="text"
                id="reporterName"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleInputChange}
                placeholder="Enter your name or leave blank for anonymous"
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Describe the issue (e.g., bin is overflowing, damaged, bad smell, etc.)"
                rows="4"
                maxLength="500"
                required
              />
              <div className="character-count">
                {formData.message.length}/500 characters
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary submit-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        <div className="reporting-info-section">
          <h3>How It Works</h3>
          <div className="info-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Select the Bin</h4>
                <p>Choose the waste bin ID that has the issue</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Describe the Problem</h4>
                <p>Provide details about the overflow, damage, or other issues</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Submit Report</h4>
                <p>Our team reviews and prioritizes collection</p>
              </div>
            </div>
          </div>

          <div className="reporting-tips">
            <h4>Tips for Better Reports</h4>
            <ul>
              <li>Include specific details about the problem</li>
              <li>Mention if there are safety concerns</li>
              <li>Take photos if possible (future feature)</li>
              <li>Reports are anonymous if you prefer</li>
            </ul>
          </div>

          <div className="contact-info">
            <h4>Emergency Contact</h4>
            <p>For immediate safety concerns, call emergency services.</p>
            <p>Non-emergency issues: Submit report above or call waste management office.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerReporting;