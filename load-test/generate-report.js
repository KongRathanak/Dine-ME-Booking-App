#!/usr/bin/env node
/**
 * HTML Report Generator — reads load-test/reports/summary.json produced by k6
 * and writes load-test/reports/report.html
 *
 * Usage: node load-test/generate-report.js [summary-path] [report-path]
 */

const fs   = require('fs');
const path = require('path');

const summaryPath = process.argv[2] || path.join(__dirname, 'reports', 'summary.json');
const reportPath  = process.argv[3] || path.join(__dirname, 'reports', 'report.html');

if (!fs.existsSync(summaryPath)) {
  console.error(`Summary file not found: ${summaryPath}`);
  process.exit(1);
}

const data    = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const metrics = data.metrics || {};
const state   = data.state   || {};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function val(metricName, key) {
  const m = metrics[metricName];
  if (!m || !m.values) return null;
  return m.values[key];
}

function fmt(n, unit = '') {
  if (n === null || n === undefined) return '—';
  if (unit === 'ms')  return `${Math.round(n)} ms`;
  if (unit === '%')   return `${(n * 100).toFixed(1)} %`;
  if (unit === 'rps') return `${n.toFixed(2)} req/s`;
  return typeof n === 'number' ? n.toFixed(2) : String(n);
}

function thresholdRows() {
  const rows = [];
  for (const [name, m] of Object.entries(metrics)) {
    if (!m.thresholds) continue;
    for (const [expr, res] of Object.entries(m.thresholds)) {
      rows.push({ name, expr, ok: res.ok });
    }
  }
  return rows;
}

function trendCard(label, metric) {
  const avg  = val(metric, 'avg');
  const med  = val(metric, 'med');
  const p90  = val(metric, 'p(90)');
  const p95  = val(metric, 'p(95)');
  const p99  = val(metric, 'p(99)');
  const max  = val(metric, 'max');
  if (avg === null) return '';
  return `
    <div class="card">
      <h3>${label}</h3>
      <table class="stat-table">
        <tr><td>avg</td><td class="val">${fmt(avg, 'ms')}</td></tr>
        <tr><td>median</td><td class="val">${fmt(med, 'ms')}</td></tr>
        <tr><td>p90</td><td class="val">${fmt(p90, 'ms')}</td></tr>
        <tr><td>p95</td><td class="val">${fmt(p95, 'ms')}</td></tr>
        <tr><td>p99</td><td class="val">${fmt(p99, 'ms')}</td></tr>
        <tr><td>max</td><td class="val">${fmt(max, 'ms')}</td></tr>
      </table>
    </div>`;
}

const successRate  = val('ddp_success_rate', 'rate');
const errorCount   = val('ddp_errors', 'count');
const durationSec  = Math.round((state.testRunDurationMs || 0) / 1000);
const vusMax       = val('vus_max', 'value');
const iterations   = val('iterations', 'count');
const iterRate     = val('iterations', 'rate');

const statusColor = successRate !== null
  ? (successRate >= 0.98 ? '#10b981' : successRate >= 0.95 ? '#f59e0b' : '#ef4444')
  : '#6b7280';

const allOk = thresholdRows().every(r => r.ok);
const testEnv  = process.env.TEST_TYPE || '—';

// ─── HTML ─────────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QR Queue — Load Test Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f0f0f; color: #e5e5e5; min-height: 100vh; }

  header {
    background: linear-gradient(135deg, #1a1a1a 0%, #111 100%);
    border-bottom: 1px solid #2a2a2a;
    padding: 32px 40px;
  }
  header h1 { font-size: 26px; font-weight: 600; color: #d4af5f; letter-spacing: 0.02em; }
  header p  { color: #666; font-size: 13px; margin-top: 4px; }

  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px;
    font-weight: 600; margin-left: 10px; vertical-align: middle;
  }
  .badge-pass { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
  .badge-fail { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }

  main { max-width: 1100px; margin: 0 auto; padding: 36px 40px; }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 36px;
  }
  .kpi {
    background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 14px;
    padding: 20px 22px;
  }
  .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .kpi-value { font-size: 28px; font-weight: 700; }
  .kpi-sub   { font-size: 11px; color: #555; margin-top: 4px; }

  .section-title {
    font-size: 13px; font-weight: 600; color: #888;
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 16px; margin-top: 36px;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .card {
    background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 14px;
    padding: 20px 22px;
  }
  .card h3 { font-size: 14px; font-weight: 600; color: #d4af5f; margin-bottom: 14px; }

  .stat-table { width: 100%; border-collapse: collapse; }
  .stat-table td { padding: 5px 0; font-size: 13px; color: #aaa; border-bottom: 1px solid #242424; }
  .stat-table tr:last-child td { border-bottom: none; }
  .stat-table .val { text-align: right; font-weight: 600; color: #e5e5e5; font-variant-numeric: tabular-nums; }

  .threshold-table { width: 100%; border-collapse: collapse; }
  .threshold-table th { text-align: left; padding: 8px 12px; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #2a2a2a; }
  .threshold-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #1f1f1f; }
  .threshold-table tr:last-child td { border-bottom: none; }
  .threshold-table .metric { color: #d4af5f; font-family: monospace; font-size: 12px; }
  .threshold-table .expr   { color: #888; font-family: monospace; font-size: 12px; }
  .threshold-table .pass   { color: #10b981; font-weight: 600; }
  .threshold-table .fail   { color: #ef4444; font-weight: 600; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-item { }
  .info-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .info-value { font-size: 14px; color: #e5e5e5; }

  .note { background: #161616; border: 1px solid #2a2a2a; border-radius: 10px; padding: 16px 20px; font-size: 13px; color: #666; line-height: 1.7; }
  .note strong { color: #888; }

  footer { text-align: center; padding: 32px; font-size: 12px; color: #3a3a3a; border-top: 1px solid #1a1a1a; margin-top: 40px; }
</style>
</head>
<body>

<header>
  <h1>QR Queue App — Load Test Report
    <span class="badge ${allOk ? 'badge-pass' : 'badge-fail'}">${allOk ? 'ALL PASSED' : 'THRESHOLDS FAILED'}</span>
  </h1>
  <p>Generated ${new Date().toLocaleString()}  ·  k6 performance test against Meteor/DDP WebSocket server</p>
</header>

<main>

  <!-- ── KPI row ── -->
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Success Rate</div>
      <div class="kpi-value" style="color:${statusColor}">${fmt(successRate, '%')}</div>
      <div class="kpi-sub">DDP method calls</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Iterations</div>
      <div class="kpi-value">${iterations !== null ? Math.round(iterations) : '—'}</div>
      <div class="kpi-sub">${fmt(iterRate, 'rps')} iter/s</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Peak VUs</div>
      <div class="kpi-value">${vusMax !== null ? Math.round(vusMax) : '—'}</div>
      <div class="kpi-sub">virtual users</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Errors</div>
      <div class="kpi-value" style="color:${errorCount > 0 ? '#ef4444' : '#10b981'}">${errorCount !== null ? Math.round(errorCount) : '—'}</div>
      <div class="kpi-sub">DDP failures</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Test Duration</div>
      <div class="kpi-value">${durationSec}s</div>
      <div class="kpi-sub">${Math.floor(durationSec / 60)}m ${durationSec % 60}s</div>
    </div>
  </div>

  <!-- ── Latency cards ── -->
  <div class="section-title">Latency Breakdown</div>
  <div class="cards">
    ${trendCard('Booking Duration (insert method)', 'booking_duration_ms')}
    ${trendCard('WebSocket Connect Time', 'ws_connect_duration_ms')}
  </div>

  <!-- ── Thresholds ── -->
  <div class="section-title">Thresholds</div>
  <div class="card">
    <table class="threshold-table">
      <thead>
        <tr><th>Metric</th><th>Expression</th><th>Result</th></tr>
      </thead>
      <tbody>
        ${thresholdRows().map(r => `
        <tr>
          <td class="metric">${r.name}</td>
          <td class="expr">${r.expr}</td>
          <td class="${r.ok ? 'pass' : 'fail'}">${r.ok ? '✓ Passed' : '✗ Failed'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ── Test info ── -->
  <div class="section-title">Test Configuration</div>
  <div class="card">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Scenario</div>
        <div class="info-value">${testEnv || '—'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Target</div>
        <div class="info-value">ws://${process.env.BASE_URL || 'localhost:3000'} (SockJS/DDP)</div>
      </div>
      <div class="info-item">
        <div class="info-label">Methods tested</div>
        <div class="info-value">tableQueue.insert, tableQueue.remove</div>
      </div>
      <div class="info-item">
        <div class="info-label">Publication tested</div>
        <div class="info-value">tableQueue</div>
      </div>
    </div>
  </div>

  <!-- ── Notes ── -->
  <div class="section-title">Notes</div>
  <div class="note">
    <strong>Protocol:</strong> Each virtual user connects via SockJS WebSocket, performs DDP handshake, subscribes to the
    <code>tableQueue</code> publication, calls <code>tableQueue.insert</code> to join the queue, then calls
    <code>tableQueue.remove</code> to clean up the test entry. Think time between iterations is 1–3 seconds.
    <br><br>
    <strong>Interpreting results:</strong> The p95 booking duration represents the 95th-percentile end-to-end latency for a customer
    joining the queue. Values under 2 000 ms are excellent; 2 000–5 000 ms acceptable; above 5 000 ms warrants investigation.
  </div>

</main>

<footer>QR Queue Load Test · k6 · ${new Date().getFullYear()}</footer>
</body>
</html>`;

fs.writeFileSync(reportPath, html);
console.log(`Report written → ${reportPath}`);
