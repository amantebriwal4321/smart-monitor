const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Main fridge state
let currentData = {
  id: 1,
  name: "Main Vaccine Fridge",
  temp: 4.2,
  humidity: 45,
  risk_score: 12,
  damage_index: "0.01 (Stable)",
  status: "Safe"
};

let historyData = [];
let reportsLog = [
  { time: new Date().toLocaleTimeString(), text: "System initialized. Monitoring active.", alert: false },
  { time: new Date().toLocaleTimeString(), text: "Daily recalibration completed.", alert: false },
  { time: new Date().toLocaleTimeString(), text: "Main Vaccine Fridge passed integrity check.", alert: false }
];

let cycleCounter = 0;
let alertSentForSpike = false;
let damageVisualNum = 0.01;

function updateData() {
  cycleCounter = (cycleCounter + 1) % 20; // 100 sec cycle
  
  let newTemp = 4.2 + (Math.random() - 0.5); 
  let newHum = 45 + Math.floor(Math.random() * 5) - 2;
  
  // Simulate SPIKE between step 10 and 13
  let isSpike = (cycleCounter >= 10 && cycleCounter <= 13);
  
  if (isSpike) {
    newTemp = 12.5 + (Math.random() - 0.5); // Spikes to 12.5°C
    damageVisualNum += 0.35; // accumulates damage
  } else {
    // recovery phase
    if (damageVisualNum > 0.05 && cycleCounter > 13) {
      damageVisualNum -= 0.05; // slowly recovers but permanently somewhat damaged
    }
  }

  let newTempFixed = +(newTemp).toFixed(1);

  let risk = currentData.risk_score;
  if (newTempFixed > 8 || newTempFixed < 2) {
    risk = Math.min(100, risk + 25);
  } else {
    risk = Math.max(0, risk - 15);
  }

  let newStatus = "Safe";
  let newDamageStr = `${damageVisualNum.toFixed(2)} (Stable)`;
  
  if (risk > 70) {
    newStatus = "Critical";
    newDamageStr = `${damageVisualNum.toFixed(2)} (Critical)`;
  } else if (risk > 30) {
    newStatus = "Warning";
    newDamageStr = `${damageVisualNum.toFixed(2)} (Rising)`;
  } else {
    newStatus = "Safe";
    if (damageVisualNum > 0.5) {
      newDamageStr = `${damageVisualNum.toFixed(2)} (Degraded)`;
    }
  }

  currentData = {
    ...currentData,
    temp: newTempFixed,
    humidity: newHum,
    risk_score: risk,
    damage_index: newDamageStr,
    status: newStatus
  };

  const timestamp = new Date().toLocaleTimeString();
  
  historyData.push({
    time: timestamp,
    temp: newTempFixed,
    humidity: newHum,
    risk_score: risk,
    damage_val: parseFloat(damageVisualNum.toFixed(2))
  });

  if (historyData.length > 50) {
    historyData.shift();
  }
  
  // Trigger auto alert logically
  if (isSpike && !alertSentForSpike) {
    reportsLog.unshift({
      time: timestamp,
      text: `CRITICAL BREACH: Temp spiked to ${newTempFixed}°C. Auto-SMS triggered to worker!`,
      alert: true
    });
    console.log("------------------------");
    console.log(`Mock Auto SMS Sent! Time: ${timestamp}`);
    console.log(`Message: Critical Temp Breach ${newTempFixed}°C`);
    console.log("------------------------");
    alertSentForSpike = true;
  }
  
  if (!isSpike && alertSentForSpike && currentData.status === 'Safe') {
    reportsLog.unshift({
      time: timestamp,
      text: `Fridge recovered to Safe baseline (${newTempFixed}°C).`,
      alert: false
    });
    alertSentForSpike = false;
  }
  
  if (reportsLog.length > 8) reportsLog.pop();
}

// Initial history population so graph isn't empty, simulating a spike early on
for (let i = 0; i < 20; i++) {
  updateData();
}

// Update data every 5 seconds
setInterval(updateData, 5000);

// Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    current: currentData,
    history: historyData,
    reports: reportsLog
  });
});

app.post('/api/sms', (req, res) => {
  const { message } = req.body;
  
  const timestamp = new Date().toLocaleTimeString();
  reportsLog.unshift({
    time: timestamp,
    text: `Manual SMS Sent: "${message}"`,
    alert: false
  });
  
  setTimeout(() => {
    res.json({ success: true, mockResult: "SMS sent successfully." });
  }, 1000);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
