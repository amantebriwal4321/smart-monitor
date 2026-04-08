/**
 * Smart Vaccine Monitor — Premium Dashboard JavaScript
 * Handles WebSocket, Chart.js, real-time UI, toast notifications,
 * count-up animations, critical flash, and Sehat Saathi chatbot.
 */

// ============================================================
// CONFIGURATION
// ============================================================
const WS_URL = `ws://${window.location.host}/ws`;
const API_BASE = window.location.origin;
const MAX_CHART_POINTS = 60;
const MAX_TABLE_ROWS = 10;

// ============================================================
// STATE
// ============================================================
let ws = null;
let reconnectDelay = 1000;
const maxReconnectDelay = 30000;
let chartInstance = null;
let chartLabels = [];
let chartTempData = [];
let chartSafeMaxData = [];
let chartSafeMinData = [];
let previousStatus = null;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchInitialData();
    fetchReport();
    fetchHealthStatus();
    connectWebSocket();
    checkPdfStatus();
    init3DTilt();

    // Refresh report button
    document.getElementById('refresh-report-btn').addEventListener('click', fetchReport);
});

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = 'info', icon = 'ℹ️', duration = 5000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ============================================================
// CRITICAL FLASH EFFECT
// ============================================================
function triggerCriticalFlash() {
    const flash = document.getElementById('critical-flash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 600);
}

// ============================================================
// WEBSOCKET CONNECTION
// ============================================================
function connectWebSocket() {
    try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('WebSocket connected');
            reconnectDelay = 1000;
            updateConnectionStatus(true);
            showToast('Connected to live data stream', 'safe', '🟢', 3000);

            setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                if (event.data === 'pong') return;
                const data = JSON.parse(event.data);

                // Check if this is a trigger event (not a sensor reading)
                if (data._trigger_event) {
                    handleTriggerEvent(data);
                    return;
                }

                handleDataUpdate(data);
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            updateConnectionStatus(false);
            scheduleReconnect();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus(false);
        };
    } catch (e) {
        console.error('WebSocket connection failed:', e);
        updateConnectionStatus(false);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
        connectWebSocket();
    }, reconnectDelay);
}

function updateConnectionStatus(online) {
    const badge = document.getElementById('connection-status');
    const text = document.getElementById('connection-text');
    if (online) {
        badge.className = 'connection-badge online';
        text.textContent = 'LIVE';
    } else {
        badge.className = 'connection-badge offline';
        text.textContent = 'OFFLINE';
    }
}

// ============================================================
// DATA FETCHING
// ============================================================
async function fetchInitialData() {
    try {
        const response = await fetch(`${API_BASE}/api/readings?limit=${MAX_CHART_POINTS}`);
        if (!response.ok) return;
        const readings = await response.json();

        if (readings && readings.length > 0) {
            readings.forEach(r => {
                addChartPoint(r.timestamp, r.temp_internal);
            });
            chartInstance.update('none');

            const latest = readings[readings.length - 1];
            handleDataUpdate(latest);

            readings.slice(-MAX_TABLE_ROWS).forEach(r => {
                addTableRow(r);
            });
        }
    } catch (e) {
        console.error('Failed to fetch initial data:', e);
    }
}

async function fetchReport() {
    try {
        const response = await fetch(`${API_BASE}/api/report/latest`);
        if (!response.ok) return;
        const data = await response.json();

        const reportEl = document.getElementById('report-content');
        if (data.report) {
            reportEl.innerHTML = '';
            reportEl.textContent = data.report;
        }
    } catch (e) {
        console.error('Failed to fetch report:', e);
    }
}

async function fetchHealthStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) return;
        const data = await response.json();

        const modeText = document.getElementById('mode-text');
        const dataSourceText = document.getElementById('data-source-text');
        const isLive = data.mode !== 'simulation';
        modeText.textContent = isLive ? 'LIVE' : 'SIMULATION';
        dataSourceText.textContent = isLive ? 'Data Source: Live Sensor' : 'Data Source: Simulation';
    } catch (e) {
        console.error('Failed to fetch health status:', e);
    }
}

// ============================================================
// TRIGGER EVENT HANDLING (WebSocket)
// ============================================================
function handleTriggerEvent(data) {
    console.log('Trigger event received:', data);

    const fromStatus = data.from || '?';
    const toStatus = data.to || '?';

    // Show status change toast
    showToast(
        `🚨 Status changed: ${fromStatus} → ${toStatus}`,
        toStatus === 'CRITICAL' ? 'critical' : (toStatus === 'WARNING' ? 'warning' : 'safe'),
        toStatus === 'CRITICAL' ? '🚨' : (toStatus === 'WARNING' ? '⚠️' : '✅'),
        6000
    );

    // Show SMS result toast
    if (data.sms_sent) {
        showToast('📱 SMS alert delivered to your phone!', 'safe', '📱', 5000);
    } else {
        showToast('📱 SMS alert logged (check server logs)', 'info', '📱', 4000);
    }

    // Show PDF result toast, enable download button, and auto-download
    if (data.pdf_generated) {
        showToast('📄 PDF incident report generated — downloading...', 'safe', '📄', 5000);
        showDownloadButton();

        // Auto-download the PDF (visible browser download)
        setTimeout(() => {
            autoDownloadPdf();
        }, 1500);
    }

    // Refresh the incident report text
    setTimeout(fetchReport, 1000);
}

function autoDownloadPdf() {
    // Create a temporary link to trigger browser download
    const link = document.createElement('a');
    link.href = `${API_BASE}/api/pdf/latest/download`;
    link.download = '';  // Triggers download instead of navigation
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('⬇️ PDF report download started!', 'safe', '⬇️', 3000);
}

function showDownloadButton() {
    const btn = document.getElementById('download-pdf-btn');
    if (btn) {
        btn.style.display = 'inline-flex';
        btn.classList.add('pulse');
        // Remove pulse after animation completes
        setTimeout(() => btn.classList.remove('pulse'), 6000);
    }
}

async function checkPdfStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/pdf/latest/status`);
        if (!response.ok) return;
        const data = await response.json();

        if (data.available) {
            showDownloadButton();
        }
    } catch (e) {
        console.error('Failed to check PDF status:', e);
    }
}

// ============================================================
// DATA HANDLING
// ============================================================
function handleDataUpdate(data) {
    updateTemperature(data);
    updateRiskGauge(data);
    updateStatusHero(data);
    updateVVM(data);
    updateETA(data);
    updateHumidity(data);
    addChartPoint(data.timestamp, data.temp_internal);
    addTableRow(data);

    // Status change detection → toast + flash
    if (previousStatus && previousStatus !== data.status) {
        if (data.status === 'CRITICAL') {
            showToast('⚠️ Status changed to CRITICAL — Immediate action required!', 'critical', '🚨', 8000);
            triggerCriticalFlash();
        } else if (data.status === 'WARNING') {
            showToast('Status changed to WARNING — Monitor closely', 'warning', '⚠️', 6000);
        } else if (data.status === 'SAFE') {
            showToast('Status restored to SAFE — All parameters normal', 'safe', '✅', 4000);
        }
    }
    previousStatus = data.status;

    // Fetch updated report on status change
    if (data.status === 'WARNING' || data.status === 'CRITICAL') {
        setTimeout(fetchReport, 2000);
    }
}

// ============================================================
// ANIMATED NUMBER UPDATE
// ============================================================
function animateValue(element, start, end, duration = 600, decimals = 1, suffix = '') {
    const startTime = performance.now();
    const diff = end - start;

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = start + diff * ease;
        element.textContent = current.toFixed(decimals) + suffix;
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

// ============================================================
// UI UPDATE FUNCTIONS
// ============================================================
function updateTemperature(data) {
    const tempValue = document.getElementById('temp-value');
    const tempExt = document.getElementById('temp-ext');
    const tempCard = document.getElementById('temp-card');
    const anomalyBadge = document.getElementById('anomaly-badge');

    // Animated number
    const oldVal = parseFloat(tempValue.textContent) || 0;
    const newVal = data.temp_internal;
    if (oldVal !== newVal && !isNaN(oldVal)) {
        animateValue(tempValue, oldVal, newVal, 500, 1);
    } else {
        tempValue.textContent = newVal.toFixed(1);
    }

    tempExt.textContent = `Ext: ${data.temp_external.toFixed(1)}°C`;

    tempCard.classList.remove('warning', 'critical', 'anomaly');
    if (data.status === 'CRITICAL') {
        tempCard.classList.add('critical');
    } else if (data.status === 'WARNING') {
        tempCard.classList.add('warning');
    }

    if (data.is_anomaly) {
        tempCard.classList.add('anomaly');
        anomalyBadge.style.display = 'block';
    } else {
        anomalyBadge.style.display = 'none';
    }
}

function updateRiskGauge(data) {
    const score = Math.min(100, Math.max(0, data.risk_score));
    const gaugeText = document.getElementById('risk-gauge-text');
    const gaugeFill = document.getElementById('gauge-fill');

    gaugeText.textContent = Math.round(score);

    const arcLength = (score / 100) * 142;
    gaugeFill.setAttribute('stroke-dasharray', `${arcLength} 142`);

    if (score < 30) {
        gaugeText.style.fill = '#22C55E';
    } else if (score < 70) {
        gaugeText.style.fill = '#F59E0B';
    } else {
        gaugeText.style.fill = '#EF4444';
    }
}

function updateStatusHero(data) {
    const badge = document.getElementById('status-badge');
    const text = document.getElementById('status-text');
    const hero = document.getElementById('status-card');
    const heroIcon = document.getElementById('status-hero-icon');
    const heroSub = document.getElementById('status-hero-sub');

    text.textContent = data.status;
    badge.className = 'status-badge-large ' + data.status.toLowerCase();
    hero.classList.remove('safe-glow', 'warning-glow', 'critical-glow');

    if (data.status === 'SAFE') {
        hero.classList.add('safe-glow');
        heroIcon.textContent = '🛡️';
        heroSub.textContent = 'All parameters within safe range';
    } else if (data.status === 'WARNING') {
        hero.classList.add('warning-glow');
        heroIcon.textContent = '⚠️';
        heroSub.textContent = 'Temperature excursion detected — monitoring closely';
    } else {
        hero.classList.add('critical-glow');
        heroIcon.textContent = '🚨';
        heroSub.textContent = 'IMMEDIATE ACTION REQUIRED — Isolate affected batches';
    }

    // Also update the old status badge function for compatibility
    updateStatusBadge(data);
}

// Keep for backward compatibility
function updateStatusBadge(data) {
    // Already handled in updateStatusHero
}

function updateVVM(data) {
    const fill = document.getElementById('vvm-fill');
    const damageText = document.getElementById('vvm-damage-text');
    const potencyText = document.getElementById('potency-text');

    const damagePercent = Math.min(100, data.vvm_damage * 100);
    fill.style.width = `${damagePercent}%`;

    damageText.textContent = `VVM: ${data.vvm_damage.toFixed(6)}`;

    const potency = data.potency_percent;
    potencyText.textContent = `${potency.toFixed(1)}%`;

    if (potency > 80) {
        potencyText.style.color = '#22C55E';
    } else if (potency > 50) {
        potencyText.style.color = '#F59E0B';
    } else {
        potencyText.style.color = '#EF4444';
    }
}

function updateETA(data) {
    const etaValue = document.getElementById('eta-value');
    const etaUnit = document.getElementById('eta-unit');
    const etaSub = document.getElementById('eta-sub');
    const etaCard = document.getElementById('eta-card');
    const exposureDisplay = document.getElementById('exposure-display');

    etaCard.classList.remove('warning', 'critical');

    if (data.status === 'CRITICAL') {
        etaValue.textContent = '!!';
        etaUnit.textContent = '';
        etaSub.textContent = 'CRITICAL NOW';
        etaCard.classList.add('critical');
    } else if (data.eta_to_critical !== null && data.eta_to_critical !== undefined) {
        etaValue.textContent = data.eta_to_critical;
        etaUnit.textContent = 'min';
        etaSub.textContent = 'until CRITICAL status';
        etaCard.classList.add('warning');
    } else {
        etaValue.textContent = '--';
        etaUnit.textContent = 'min';
        etaSub.textContent = 'No risk detected';
    }

    exposureDisplay.textContent = `Exposure: ${data.exposure_minutes} min`;
}

function updateHumidity(data) {
    const humidityValue = document.getElementById('humidity-value');
    const humidityDisplay = document.getElementById('humidity-display');

    if (humidityValue) {
        const oldVal = parseFloat(humidityValue.textContent) || 0;
        const newVal = data.humidity;
        if (oldVal !== newVal && !isNaN(oldVal) && oldVal > 0) {
            animateValue(humidityValue, oldVal, newVal, 500, 1);
        } else {
            humidityValue.textContent = newVal.toFixed(1);
        }
    }
    // Keep hidden element for backward compat
    if (humidityDisplay) {
        humidityDisplay.textContent = `Humidity: ${data.humidity.toFixed(1)}%`;
    }
}

// ============================================================
// CHART.JS (Enhanced with gradient fill)
// ============================================================
function initChart() {
    const ctx = document.getElementById('temp-chart').getContext('2d');

    // Create deep immersive gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    // Use the CSS custom variable or fallback to a soft glow
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Internal Temp (°C)',
                    data: chartTempData,
                    borderColor: '#ffffff', // Stark white premium line
                    backgroundColor: gradient,
                    borderWidth: 3, // slightly thicker
                    fill: true,
                    tension: 0.5, // Buttery smooth curves
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: 'rgba(255,255,255,0.3)',
                    pointHoverBorderWidth: 6,
                },
                {
                    label: 'Safe Max (8°C)',
                    data: chartSafeMaxData,
                    borderColor: 'rgba(251, 113, 133, 0.3)', // Red
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
                {
                    label: 'Safe Min (2°C)',
                    data: chartSafeMinData,
                    borderColor: 'rgba(96, 165, 250, 0.3)', // Blue
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutQuart',
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false, // Clean minimal look
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.4)',
                        font: { family: 'Rajdhani', size: 12 },
                        maxRotation: 0,
                        maxTicksLimit: 7,
                    },
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: { family: 'Rajdhani', size: 13, weight: '600' },
                        callback: (v) => v + '°C',
                        padding: 10
                    },
                    suggestedMin: 0,
                    suggestedMax: 15,
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { family: 'Inter', size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 24,
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 18, 25, 0.85)',
                    titleColor: '#ffffff',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    titleFont: { family: 'Inter', weight: '600', size: 14 },
                    bodyFont: { family: 'JetBrains Mono', size: 13 },
                    padding: 16,
                    cornerRadius: 12,
                    displayColors: true,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}°C`,
                    },
                },
            },
        },
    });
}

function addChartPoint(timestamp, temp) {
    const label = formatTime(timestamp);

    chartLabels.push(label);
    chartTempData.push(temp);
    chartSafeMaxData.push(8);
    chartSafeMinData.push(2);

    if (chartLabels.length > MAX_CHART_POINTS) {
        chartLabels.shift();
        chartTempData.shift();
        chartSafeMaxData.shift();
        chartSafeMinData.shift();
    }

    if (chartInstance) {
        chartInstance.update('none');
    }
}

function formatTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    } catch {
        return timestamp.substring(11, 19);
    }
}

// ============================================================
// TABLE
// ============================================================
function addTableRow(data) {
    const tbody = document.getElementById('readings-tbody');

    const emptyRow = tbody.querySelector('.empty-table');
    if (emptyRow) {
        emptyRow.parentElement.remove();
    }

    const row = document.createElement('tr');
    row.className = `row-${data.status.toLowerCase()}`;

    const statusClass = data.status.toLowerCase();
    const anomalyHtml = data.is_anomaly
        ? '<span class="anomaly-dot" title="Anomaly detected"></span>'
        : '<span class="anomaly-none">—</span>';

    row.innerHTML = `
        <td>${formatTime(data.timestamp)}</td>
        <td>${data.temp_internal.toFixed(1)}</td>
        <td>${data.temp_external.toFixed(1)}</td>
        <td>${data.humidity.toFixed(1)}</td>
        <td>${data.risk_score.toFixed(1)}</td>
        <td><span class="status-pill ${statusClass}">${data.status}</span></td>
        <td>${data.vvm_damage.toFixed(4)}</td>
        <td>${anomalyHtml}</td>
    `;

    tbody.insertBefore(row, tbody.firstChild);

    while (tbody.children.length > MAX_TABLE_ROWS) {
        tbody.removeChild(tbody.lastChild);
    }

    // Entrance animation
    row.style.opacity = '0';
    row.style.transform = 'translateY(-10px)';
    requestAnimationFrame(() => {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
    });
}

// ============================================================
// SEHAT SAATHI — MULTILINGUAL CHATBOT
// ============================================================
(function initChatbot() {
    const toggle = document.getElementById('chatbot-toggle');
    const panel = document.getElementById('chatbot-panel');
    const closeBtn = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    const messages = document.getElementById('chatbot-messages');
    const suggestions = document.getElementById('chatbot-suggestions');
    const toggleIcon = document.getElementById('chatbot-toggle-icon');
    const langSelect = document.getElementById('language-select');
    const subtitle = document.getElementById('chatbot-subtitle');
    const welcomeBubble = document.getElementById('chatbot-welcome');

    let isOpen = false;
    let currentLang = 'en';

    // ── Multilingual Suggestions ──
    const suggestionsMap = {
        en: [
            { icon: '🛡️', label: 'Is it safe?', query: 'Is the vaccine safe?' },
            { icon: '🌡️', label: 'Temperature', query: 'Current temperature' },
            { icon: '📊', label: 'Risk analysis', query: 'Why is risk high?' },
            { icon: '⏱️', label: 'ETA to critical', query: 'When will it become critical?' },
            { icon: '💉', label: 'Potency', query: 'Potency and VVM damage' },
            { icon: '🏗️', label: 'How it works', query: 'How does the system work?' },
            { icon: '🔌', label: 'Sensors', query: 'What sensors are used?' },
            { icon: '🧠', label: 'ML models', query: 'What ML models are used?' },
        ],
        hi: [
            { icon: '🛡️', label: 'सुरक्षित है?', query: 'क्या वैक्सीन सुरक्षित है?' },
            { icon: '🌡️', label: 'तापमान', query: 'वर्तमान तापमान क्या है?' },
            { icon: '📊', label: 'जोखिम', query: 'जोखिम क्यों बढ़ा है?' },
            { icon: '⏱️', label: 'कब गंभीर?', query: 'कब गंभीर होगा?' },
            { icon: '💉', label: 'क्षमता', query: 'वैक्सीन क्षमता और VVM' },
            { icon: '🏗️', label: 'कैसे काम करता है', query: 'सिस्टम कैसे काम करता है?' },
            { icon: '🔌', label: 'सेंसर', query: 'कौन से सेंसर हैं?' },
            { icon: '🧠', label: 'ML मॉडल', query: 'कौन से ML मॉडल हैं?' },
        ],
        kn: [
            { icon: '🛡️', label: 'ಸುರಕ್ಷಿತವೇ?', query: 'ಲಸಿಕೆ ಸುರಕ್ಷಿತವೇ?' },
            { icon: '🌡️', label: 'ತಾಪಮಾನ', query: 'ಪ್ರಸ್ತುತ ತಾಪಮಾನ ಏನು?' },
            { icon: '📊', label: 'ಅಪಾಯ', query: 'ಅಪಾಯ ಏಕೆ ಹೆಚ್ಚಾಗಿದೆ?' },
            { icon: '⏱️', label: 'ಯಾವಾಗ ಗಂಭೀರ?', query: 'ಯಾವಾಗ ಗಂಭೀರವಾಗುತ್ತದೆ?' },
            { icon: '💉', label: 'ಸಾಮರ್ಥ್ಯ', query: 'ಲಸಿಕೆ ಸಾಮರ್ಥ್ಯ ಮತ್ತು VVM' },
            { icon: '🏗️', label: 'ಹೇಗೆ ಕೆಲಸ', query: 'ವ್ಯವಸ್ಥೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?' },
            { icon: '🔌', label: 'ಸೆನ್ಸರ್', query: 'ಯಾವ ಸೆನ್ಸರ್‌ಗಳನ್ನು ಬಳಸಲಾಗಿದೆ?' },
            { icon: '🧠', label: 'ML ಮಾಡೆಲ್', query: 'ಯಾವ ML ಮಾಡೆಲ್‌ಗಳನ್ನು ಬಳಸಲಾಗಿದೆ?' },
        ],
    };

    const uiStrings = {
        en: { subtitle: 'Online • Ask me anything', placeholder: 'Ask about temperature, safety, system...',
              welcome: '👋 Hi! I\'m <strong>Sehat Saathi</strong> — your Vaccine Monitor Assistant.<br><br>Ask anything or click a suggestion!' },
        hi: { subtitle: 'ऑनलाइन • कुछ भी पूछें', placeholder: 'तापमान, सुरक्षा, सिस्टम के बारे में पूछें...',
              welcome: '👋 नमस्ते! मैं <strong>सेहत साथी</strong> हूँ — आपका वैक्सीन मॉनिटर सहायक।<br><br>कोई भी सवाल पूछें या सुझाव पर क्लिक करें!' },
        kn: { subtitle: 'ಆನ್‌ಲೈನ್ • ಏನಾದರೂ ಕೇಳಿ', placeholder: 'ತಾಪಮಾನ, ಸುರಕ್ಷತೆ, ವ್ಯವಸ್ಥೆ ಬಗ್ಗೆ ಕೇಳಿ...',
              welcome: '👋 ನಮಸ್ಕಾರ! ನಾನು <strong>ಸೆಹತ್ ಸಾಥಿ</strong> — ನಿಮ್ಮ ಲಸಿಕೆ ಮಾನಿಟರ್ ಸಹಾಯಕ.<br><br>ಏನಾದರೂ ಕೇಳಿ ಅಥವಾ ಸಲಹೆಯ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ!' },
    };

    function renderSuggestions() {
        const items = suggestionsMap[currentLang] || suggestionsMap.en;
        suggestions.innerHTML = items.map(s =>
            `<button class="suggestion-btn" data-query="${s.query}">${s.icon} ${s.label}</button>`
        ).join('');
    }

    function updateUILanguage() {
        const strings = uiStrings[currentLang] || uiStrings.en;
        subtitle.textContent = strings.subtitle;
        input.placeholder = strings.placeholder;
        welcomeBubble.innerHTML = strings.welcome;
        renderSuggestions();
    }

    renderSuggestions();

    langSelect.addEventListener('change', () => {
        currentLang = langSelect.value;
        updateUILanguage();
    });

    toggle.addEventListener('click', () => {
        isOpen = !isOpen;
        panel.classList.toggle('open', isOpen);
        toggle.classList.toggle('active', isOpen);
        toggleIcon.textContent = isOpen ? '✕' : '💬';
        if (isOpen) {
            setTimeout(() => input.focus(), 300);
        }
    });

    closeBtn.addEventListener('click', () => {
        isOpen = false;
        panel.classList.remove('open');
        toggle.classList.remove('active');
        toggleIcon.textContent = '💬';
    });

    function sendMessage(text) {
        if (!text.trim()) return;

        appendMessage(text, 'user');
        input.value = '';

        const typingEl = showTyping();

        fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text, language: currentLang }),
        })
        .then(res => res.json())
        .then(data => {
            removeTyping(typingEl);
            appendMessage(data.response || data.reply, 'bot');
        })
        .catch(err => {
            removeTyping(typingEl);
            const errMsg = {
                en: '❌ Failed to get response. Is the backend running?',
                hi: '❌ प्रतिक्रिया प्राप्त करने में विफल। क्या बैकएंड चल रहा है?',
                kn: '❌ ಪ್ರತಿಕ್ರಿಯೆ ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ. ಬ್ಯಾಕೆಂಡ್ ಚಾಲನೆಯಲ್ಲಿದೆಯೇ?',
            };
            appendMessage(errMsg[currentLang] || errMsg.en, 'bot');
            console.error('Chat error:', err);
        });
    }

    function appendMessage(text, sender) {
        const wrapper = document.createElement('div');
        wrapper.className = `chat-msg ${sender}`;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = formatBotText(text);

        wrapper.appendChild(bubble);
        messages.appendChild(wrapper);

        wrapper.style.opacity = '0';
        wrapper.style.transform = sender === 'user' ? 'translateX(20px)' : 'translateX(-20px)';
        requestAnimationFrame(() => {
            wrapper.style.transition = 'all 0.3s ease';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateX(0)';
        });

        messages.scrollTop = messages.scrollHeight;
    }

    function formatBotText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function showTyping() {
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg bot typing-wrapper';
        wrapper.innerHTML = `
            <div class="chat-bubble bot typing">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        messages.appendChild(wrapper);
        messages.scrollTop = messages.scrollHeight;
        return wrapper;
    }

    function removeTyping(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    sendBtn.addEventListener('click', () => sendMessage(input.value));

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage(input.value);
        }
    });

    suggestions.addEventListener('click', (e) => {
        const btn = e.target.closest('.suggestion-btn');
        if (btn) sendMessage(btn.getAttribute('data-query'));
    });
})();

// ============================================================
// 3D SPATIAL TILT EFFECT
// ============================================================
function init3DTilt() {
    // Select all cards, hero status, and chart cards for 3D treatment
    const tiltElements = document.querySelectorAll('.card, .status-hero, .chart-section');

    tiltElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            // Calculate mouse position relative to the element (0 to 1)
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;

            // Offset to range -1 to 1
            const offsetX = (x - 0.5) * 2;
            const offsetY = (y - 0.5) * 2;

            // Calculate rotation degrees (max 10 degrees)
            const degreeX = offsetY * -8;
            const degreeY = offsetX * 8;

            // Apply transform physics
            el.style.transform = `perspective(1000px) rotateX(${degreeX}deg) rotateY(${degreeY}deg) scale3d(1.02, 1.02, 1.02)`;

            // Adjust internal glow/glare if it exists
            const glow = el.querySelector('.card-glow, .status-hero-glow');
            if (glow) {
                glow.style.transform = `translate(${offsetX * 30}%, ${offsetY * 30}%)`;
                glow.style.opacity = '0.3';
            }
        });

        // Reset when mouse leaves
        el.addEventListener('mouseleave', () => {
            el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            const glow = el.querySelector('.card-glow, .status-hero-glow');
            if (glow) {
                glow.style.opacity = '0';
            }
        });
    });
}
