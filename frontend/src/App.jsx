import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BinManagement from './pages/BinManagement';
import Alerts from './pages/Alerts';
import RouteOptimization from './pages/RouteOptimization';
import CustomerReporting from './pages/CustomerReporting';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>Smart Waste Management</h1>
          </div>
          <ul className="nav-links">
            <li><Link to="/" className="nav-link">Dashboard</Link></li>
            <li><Link to="/bins" className="nav-link">Bin Management</Link></li>
            <li><Link to="/alerts" className="nav-link">Alerts</Link></li>
            <li><Link to="/routes" className="nav-link">Routes</Link></li>
            <li><Link to="/report" className="nav-link">Report Issue</Link></li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bins" element={<BinManagement />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/routes" element={<RouteOptimization />} />
            <Route path="/report" element={<CustomerReporting />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
