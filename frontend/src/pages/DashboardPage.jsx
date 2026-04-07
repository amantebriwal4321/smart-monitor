import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';

function DashboardPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsStatus, setSmsStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/status');
        if (res.data) {
          setCurrent(res.data.current);
          setHistory(res.data.history);
          setReports(res.data.reports);
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) return;
    try {
      setSmsStatus('Sending...');
      const res = await axios.post('http://localhost:5000/api/sms', { message: smsMessage });
      if (res.data.success) {
        setSmsStatus('Success! Manual SMS queued.');
        setSmsMessage('');
        setTimeout(() => setSmsStatus(''), 4000);
        
        // Optimistically reload reports
        const statsRes = await axios.get('http://localhost:5000/api/status');
        setReports(statsRes.data.reports);
      }
    } catch (err) {
      setSmsStatus('Failed to send SMS.');
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Safe': return <span className="ccg-badge ccg-badge-safe">Safe</span>;
      case 'Warning': return <span className="ccg-badge ccg-badge-warning">Warning</span>;
      case 'Critical': return <span className="ccg-badge ccg-badge-critical">Critical</span>;
      default: return <span className="ccg-badge">{status}</span>;
    }
  };

  return (
    <div>
      {/* NAV */}
      <nav className="ccg-nav">
        <div className="ccg-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          COLD<em>CHAIN</em> GUARDIAN
        </div>
        <div className="ccg-nav-links">
          <a onClick={() => navigate('/')}>Home</a>
        </div>
        <button className="ccg-btn-outline" onClick={() => navigate('/')}>← Back</button>
      </nav>

      <div className="ccg-dashboard-container">
        <div className="ccg-dashboard-header">
          <div>
            <h2>LIVE TELEMETRY</h2>
            <div style={{ fontSize: '15px', color: '#888', fontFamily: 'Rajdhani', marginTop: '8px' }}>
              Monitoring: {current ? current.name : 'Loading...'}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#666', fontFamily: 'Rajdhani' }}>Auto-updating stream • Secured session</div>
        </div>

        {/* KPI Cards */}
        {current && (
          <div className="ccg-kpi-grid">
            <div className="ccg-kpi-card" style={{ padding: '24px 20px' }}>
              <div className="ccg-kpi-title">Current Temp</div>
              <div className="ccg-kpi-val" style={{ color: current.temp > 8 || current.temp < 2 ? '#ff3333' : '#e0e0e0' }}>
                {current.temp}<span>°C</span>
              </div>
            </div>
            <div className="ccg-kpi-card" style={{ padding: '24px 20px' }}>
              <div className="ccg-kpi-title">Relative Hum</div>
              <div className="ccg-kpi-val">
                {current.humidity}<span>%</span>
              </div>
            </div>
            <div className="ccg-kpi-card" style={{ padding: '24px 20px' }}>
              <div className="ccg-kpi-title">Risk Score</div>
              <div className="ccg-kpi-val" style={{ color: current.risk_score > 70 ? '#ff3333' : current.risk_score > 30 ? '#ffcc00' : '#00ff00' }}>
                {current.risk_score}<span>/ 100</span>
              </div>
            </div>
            <div className="ccg-kpi-card" style={{ padding: '24px 20px' }}>
              <div className="ccg-kpi-title">Damage Index</div>
              <div className="ccg-kpi-val" style={{ fontSize: '24px', marginTop: '4px' }}>
                {current.damage_index.split(' ')[0]} 
                <span style={{ fontSize: '12px' }}> {current.damage_index.split(' ')[1]}</span>
              </div>
            </div>
            <div className="ccg-kpi-card" style={{ alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
              <div className="ccg-kpi-title" style={{ width: '100%', textAlign: 'center' }}>System Status</div>
              <div style={{ marginTop: '8px' }}>
                {getStatusBadge(current.status)}
              </div>
            </div>
          </div>
        )}

        {/* 3 Chart Grid */}
        <div className="ccg-charts-grid">
          {/* Chart 1: Temp */}
          <div className="ccg-chart-box">
            <div className="ccg-chart-title">TEMPERATURE TRACE</div>
            <div style={{ width: '100%', height: 220 }}>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c8a800" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#c8a800" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#e0e0e0' }} />
                    <Area type="monotone" dataKey="temp" stroke="#c8a800" fillOpacity={1} fill="url(#colorTemp)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ color: '#666', textAlign: 'center', marginTop: '100px' }}>Loading...</div>}
            </div>
          </div>

          {/* Chart 2: Humidity */}
          <div className="ccg-chart-box">
            <div className="ccg-chart-title">HUMIDITY LEVELS</div>
            <div style={{ width: '100%', height: 220 }}>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ccff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00ccff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#e0e0e0' }} />
                    <Area type="monotone" dataKey="humidity" stroke="#00ccff" fillOpacity={1} fill="url(#colorHum)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ color: '#666', textAlign: 'center', marginTop: '100px' }}>Loading...</div>}
            </div>
          </div>

          {/* Chart 3: Risk vs Damage */}
          <div className="ccg-chart-box">
            <div className="ccg-chart-title">RISK VS DAMAGE</div>
            <div style={{ width: '100%', height: 220 }}>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#ff3333" tick={{ fill: '#ff3333', fontSize: 10 }} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ff00ff" tick={{ fill: '#ff00ff', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#e0e0e0' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line yAxisId="left" type="stepAfter" dataKey="risk_score" name="Risk Score" stroke="#ff3333" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="damage_val" name="Damage" stroke="#ff00ff" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div style={{ color: '#666', textAlign: 'center', marginTop: '100px' }}>Loading...</div>}
            </div>
          </div>
        </div>

        {/* Reports and SMS Section */}
        <div className="ccg-section-grid">
          {/* Reports */}
          <div className="ccg-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Automated Logs & Alerts</h3>
              <span style={{ fontSize: '12px', color: '#888' }}>Live Streamed</span>
            </div>
            
            <ul style={{ listStyle: 'none', fontSize: '13px', color: '#888', lineHeight: '1.6', maxHeight: '180px', overflowY: 'auto' }}>
              {reports.length === 0 ? <li>No logs generated yet.</li> : reports.map((log, i) => (
                <li key={i} style={{ 
                  marginBottom: '10px', 
                  padding: '8px 12px', 
                  background: log.alert ? 'rgba(255, 51, 51, 0.1)' : '#1a1a1a',
                  borderLeft: `3px solid ${log.alert ? '#ff3333' : '#c8a800'}`,
                  color: log.alert ? '#ff9999' : '#e0e0e0'
                }}>
                  <span style={{ color: log.alert ? '#ff3333' : '#c8a800', marginRight: '8px', fontSize: '11px', fontWeight: 'bold' }}>[{log.time}]</span> 
                  {log.text}
                </li>
              ))}
            </ul>
            <button className="ccg-btn-outline" style={{ marginTop: '16px', fontSize: '11px', padding: '6px 12px' }}>Export Audit Trail</button>
          </div>

          {/* Send SMS Section */}
          <div className="ccg-card">
            <h3 style={{ marginBottom: '16px' }}>Field Communication Protocol</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
              System will automatically alert workers during a critical breach. You may use this terminal to broadcast manual directives.
            </p>
            <textarea 
              className="ccg-textarea" 
              placeholder="Enter manual directive here..."
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              style={{ height: '70px', marginBottom: '12px' }}
            ></textarea>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button className="ccg-btn" onClick={handleSendSMS}>Broadcast Message →</button>
              {smsStatus && <span style={{ fontSize: '13px', fontWeight: 'bold', color: smsStatus.includes('Failed') ? '#ff3333' : '#00ff00' }}>{smsStatus}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
