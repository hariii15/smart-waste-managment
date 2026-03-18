export default function UserHome() {
  return (
    <div className="page">
      <h2>Home</h2>
      <p style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
        You are signed in as a user.
      </p>
      <div className="management-info">
        <h3>What you can do</h3>
        <ul>
          <li>Submit issues via <strong>Report</strong>.</li>
          <li>Track updates once a driver is assigned.</li>
        </ul>
      </div>
    </div>
  );
}
