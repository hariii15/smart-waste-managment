import Dashboard from './Dashboard';

export default function DriverHome({ role = 'driver', isDriver = true }) {
  // Driver/admin home shows the operational dashboard.
  return <Dashboard role={role} isDriver={isDriver} />;
}
