import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Landing() {
  const navigate = useNavigate();
  const [tickerData, setTickerData] = useState({
    fridge_temp: "--", humidity: "--", risk_score: "--", damage_index: "--", status: "--"
  });

  useEffect(() => {
    // Fetch once for ticker
    const fetchTicker = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/status');
        if (res.data && res.data.current) {
          const m = res.data.current;
          setTickerData({
            fridge_temp: m.temp,
            humidity: m.humidity,
            risk_score: m.risk_score,
            damage_index: m.damage_index,
            status: m.status
          });
        }
      } catch (err) {
        console.error("No ticker data", err);
      }
    };
    fetchTicker();
    const interval = setInterval(fetchTicker, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* TICKER */}
      <div className="ccg-ticker">
        <div>TEMP <span>{tickerData.fridge_temp}°C</span></div>
        <div>HUMIDITY <span>{tickerData.humidity}%</span></div>
        <div>RISK SCORE <span>{tickerData.risk_score}/100</span></div>
        <div>DAMAGE INDEX <span>{tickerData.damage_index}</span></div>
        <div>STATUS <span>{tickerData.status}</span></div>
        <div style={{ marginLeft: "auto" }}>coldchain@guardian.local &nbsp;|&nbsp; +91 984 563 6363</div>
        <button className="ccg-btn" style={{ padding: "5px 14px", fontSize: "11px" }} onClick={() => navigate('/dashboard')}>Open Dashboard</button>
      </div>

      {/* NAV */}
      <nav className="ccg-nav">
        <div className="ccg-logo">COLD<em>CHAIN</em> GUARDIAN</div>
        <div className="ccg-nav-links">
          <a href="#about">About</a>
          <a href="#how">How it works</a>
          <a href="#status">Status Levels</a>
          <a href="#contact">Contact</a>
        </div>
        <button className="ccg-btn" onClick={() => navigate('/dashboard')}>Live Dashboard →</button>
      </nav>

      {/* HERO */}
      <section className="ccg-hero">
        <svg className="ccg-hero-bg" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50,150 Q100,50 150,150 Q200,250 250,150" stroke="#c8a800" strokeWidth="1" fill="none"/>
          <path d="M30,180 Q80,80 130,180 Q180,280 230,180" stroke="#c8a800" strokeWidth="0.5" fill="none"/>
          <path d="M70,120 Q120,20 170,120 Q220,220 270,120" stroke="#c8a800" strokeWidth="0.5" fill="none"/>
          <circle cx="150" cy="150" r="60"  stroke="#c8a800" strokeWidth="0.5" fill="none"/>
          <circle cx="150" cy="150" r="100" stroke="#c8a800" strokeWidth="0.3" fill="none"/>
          <circle cx="150" cy="150" r="130" stroke="#c8a800" strokeWidth="0.2" fill="none"/>
          <line x1="20"  y1="150" x2="280" y2="150" stroke="#c8a800" strokeWidth="0.3"/>
          <line x1="150" y1="20"  x2="150" y2="280" stroke="#c8a800" strokeWidth="0.3"/>
          <circle cx="90"  cy="90"  r="3" fill="#c8a800"/>
          <circle cx="210" cy="210" r="3" fill="#c8a800"/>
          <circle cx="210" cy="90"  r="2" fill="#c8a800" opacity="0.5"/>
          <circle cx="90"  cy="210" r="2" fill="#c8a800" opacity="0.5"/>
        </svg>
        <h1>COLD<em>CHAIN</em><br/>GUARDIAN</h1>
        <p>Edge-intelligent vaccine monitoring system — protecting cold chain integrity for ASHA workers in real time, everywhere.</p>
        <button className="ccg-btn" style={{ fontSize: "15px", padding: "16px 40px" }} onClick={() => navigate('/dashboard')}>Open Live Dashboard →</button>
      </section>

      {/* WHAT IS */}
      <section className="ccg-what" id="about">
        <div className="ccg-what-left">
          <h2>WHAT IS COLD CHAIN GUARDIAN?</h2>
          <p>Cold Chain Guardian is a Raspberry Pi-powered edge intelligence system that monitors vaccine fridge temperature 24/7. It detects breaches, tracks cumulative heat damage, and alerts ASHA workers via SMS — even without internet.</p>
          <p>The system learns your fridge's normal baseline, scores risk from 0 to 100, and only alerts on state changes — preventing alarm fatigue while ensuring no breach goes undetected.</p>
          <div className="ccg-stats-row">
            <div className="ccg-stat"><div className="val">60s</div><div className="lbl">Read interval</div></div>
            <div className="ccg-stat"><div className="val">0–100</div><div className="lbl">Risk scoring</div></div>
            <div className="ccg-stat"><div className="val">₹3.5k</div><div className="lbl">Total cost</div></div>
          </div>
        </div>
        <div className="ccg-what-right">
          <div className="ccg-icon-circle">🌡️</div>
          <div style={{ fontSize: "12px", color: "#444", lineHeight: "1.8", marginTop: "8px" }}>DS18B20 + DHT22<br/>on Raspberry Pi 1GB</div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="ccg-how" id="how">
        <div className="ccg-how-header">
          <h2>HOW IT WORKS?</h2>
          <button className="ccg-btn-outline" style={{ fontSize: "11px", padding: "7px 18px" }}>View Architecture →</button>
        </div>
        <div className="ccg-steps">
          <div className="ccg-step">
            <div className="ccg-step-num">01</div>
            <h3>Sense</h3>
            <p>DS18B20 reads fridge temperature. DHT22 reads ambient temp and humidity every 60 seconds.</p>
          </div>
          <div className="ccg-step">
            <div className="ccg-step-num">02</div>
            <h3>Analyse</h3>
            <p>Edge AI engine calculates self-learning baseline, unsafe duration, VVM damage, and 0–100 risk score.</p>
          </div>
          <div className="ccg-step">
            <div className="ccg-step-num">03</div>
            <h3>Trigger</h3>
            <p>State change detector fires only when status changes — SAFE → WARNING → CRITICAL. No spam.</p>
          </div>
          <div className="ccg-step">
            <div className="ccg-step-num">04</div>
            <h3>Alert + Log</h3>
            <p>SMS sent to ASHA worker via Fast2SMS. All data logged to CSV on SD card for full audit trail.</p>
          </div>
        </div>
      </section>

      {/* STATUS LEVELS */}
      <section className="ccg-pricing" id="status">
        <div className="ccg-pricing-title">STATUS LEVELS</div>
        <div className="ccg-plans">
          <div className="ccg-plan">
            <div className="ccg-plan-name">Safe</div>
            <div className="ccg-plan-sub">Risk score: 0 – 29</div>
            <div className="ccg-plan-rate">0–29 <span>/ 100</span></div>
            <ul className="ccg-plan-features">
              <li>Temp within baseline range</li>
              <li>No unsafe duration accumulating</li>
              <li>VVM damage index stable</li>
              <li>No SMS alert triggered</li>
            </ul>
          </div>
          <div className="ccg-plan featured">
            <div className="ccg-plan-name">Warning</div>
            <div className="ccg-plan-sub">Risk score: 30 – 69</div>
            <div className="ccg-plan-rate">30–69 <span>/ 100</span></div>
            <ul className="ccg-plan-features">
              <li>Temp above safe threshold</li>
              <li>Unsafe duration timer running</li>
              <li>Damage index accumulating</li>
              <li>Logged with flag — monitor closely</li>
            </ul>
          </div>
          <div className="ccg-plan">
            <div className="ccg-plan-name">Critical</div>
            <div className="ccg-plan-sub">Risk score: 70 – 100</div>
            <div className="ccg-plan-rate">70–100 <span>/ 100</span></div>
            <ul className="ccg-plan-features">
              <li>Severe temperature breach</li>
              <li>Extended unsafe exposure</li>
              <li>High cumulative VVM damage</li>
              <li>SMS alert triggered immediately</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="ccg-contact" id="contact">
        <div className="ccg-contact-info">
          <p>+91 984 563 6363</p>
          <p><a href="mailto:coldchain@guardian.local">coldchain@guardian.local</a></p>
          <br/><br/>
          <button className="ccg-btn-outline">Request Demo →</button>
        </div>
        <div className="ccg-contact-form">
          <h3>ASK A QUESTION</h3>
          <div className="form-row">
            <input className="ccg-input" placeholder="Name" />
            <input className="ccg-input" placeholder="Subject" />
          </div>
          <input className="ccg-input" placeholder="E-mail" style={{ marginBottom: "12px" }} />
          <textarea className="ccg-textarea" placeholder="Your message..."></textarea>
          <button className="ccg-btn" style={{ width: "100%" }}>Send →</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ccg-footer">
        <div className="ccg-footer-logo">COLD<em>CHAIN</em> GUARDIAN</div>
        <p>Edge-intelligent vaccine monitoring · Built on Raspberry Pi</p>
      </footer>
    </>
  );
}

export default Landing;
