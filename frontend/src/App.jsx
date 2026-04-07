import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Nav bar could be universal or per page it's up to design. 
            Original HTML had it on the Landing page, so let's keep it there.
            But we also want a nav for the dashboard. */}
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
