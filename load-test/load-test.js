/**
 * k6 Load Test — QR Queue App (Meteor/DDP over SockJS WebSocket)
 *
 * Scenarios (run in sequence):
 *   smoke  — 2 VUs × 30s  — baseline sanity check
 *   load   — ramp 0→50 VUs over 3m, hold 1m, ramp down 30s
 *   stress — ramp 0→120 VUs over 1m, hold 2m, ramp down 30s
 *
 * Each VU simulates the full customer journey:
 *   1. Connect via SockJS WebSocket → DDP handshake
 *   2. Subscribe to "tableQueue" publication
 *   3. Call tableQueue.insert  (join the queue)
 *   4. Call tableQueue.remove  (cleanup — keeps DB clean between runs)
 *
 * Configuration (env vars):
 *   BASE_URL   — default: localhost:3000
 *   TEST_TYPE  — "smoke" | "load" | "stress" | "all" (default: "load")
 *
 * Outputs (written by handleSummary):
 *   load-test/reports/summary.json   — raw k6 summary for the HTML generator
 *   stdout                           — colour text summary
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────────
const ddpErrors          = new Counter('ddp_errors');
const ddpSuccessRate     = new Rate('ddp_success_rate');
const bookingDuration    = new Trend('booking_duration_ms',    true);
const connectDuration    = new Trend('ws_connect_duration_ms', true);
const activeConnections  = new Gauge('active_connections');

// ─── Configuration ─────────────────────────────────────────────────────────────
const BASE_URL  = __ENV.BASE_URL  || 'localhost:3000';
const TEST_TYPE = __ENV.TEST_TYPE || 'load';

// ─── Scenario definitions ──────────────────────────────────────────────────────
const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 2,
    duration: '30s',
    tags: { scenario: 'smoke' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m',   target: 20  },
      { duration: '2m',   target: 50  },
      { duration: '1m',   target: 50  },
      { duration: '30s',  target: 0   },
    ],
    tags: { scenario: 'load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m',   target: 100 },
      { duration: '2m',   target: 120 },
      { duration: '30s',  target: 0   },
    ],
    tags: { scenario: 'stress' },
  },
};

function buildScenarios() {
  if (TEST_TYPE === 'all') {
    let offset = 0;
    return Object.fromEntries(
      Object.entries(SCENARIOS).map(([name, cfg]) => {
        const entry = { ...cfg, startTime: offset + 's' };
        const duration = cfg.stages
          ? cfg.stages.reduce((s, st) => s + parseDuration(st.duration), 0)
          : parseDuration(cfg.duration);
        offset += duration + 10;
        return [name, entry];
      })
    );
  }
  const chosen = SCENARIOS[TEST_TYPE];
  if (!chosen) throw new Error(`Unknown TEST_TYPE="${TEST_TYPE}". Use smoke|load|stress|all`);
  return { [TEST_TYPE]: chosen };
}

function parseDuration(d) {
  const m = d.match(/^(\d+)(s|m)$/);
  if (!m) return 0;
  return parseInt(m[1]) * (m[2] === 'm' ? 60 : 1);
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    'ddp_success_rate':     ['rate>0.95'],
    'booking_duration_ms':  ['p(95)<5000', 'p(99)<10000'],
    'ws_connect_duration_ms': ['p(95)<2000'],
    'ddp_errors':           ['count<50'],
  },
};

// ─── DDP / SockJS helpers ──────────────────────────────────────────────────────
function sendDDP(socket, msg) {
  // SockJS frame: a["<json-string>"]
  socket.send(`a[${JSON.stringify(JSON.stringify(msg))}]`);
}

function parseSockJS(frame) {
  if (!frame.startsWith('a[')) return [];
  try {
    return JSON.parse(frame.slice(1)).map((s) => JSON.parse(s));
  } catch (_) {
    return [];
  }
}

// ─── Random data generators ────────────────────────────────────────────────────
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomPhone() {
  return `${rnd(100, 999)}-${rnd(100, 999)}-${rnd(1000, 9999)}`;
}

function randomName() {
  const first = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah',
                 'Ivan', 'Julia', 'Kevin', 'Laura', 'Mike', 'Nina', 'Oscar', 'Paula'];
  return `${first[rnd(0, first.length - 1)]} LoadTest`;
}

function randomHex(len) {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[rnd(0, 15)];
  return s;
}

// ─── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  const serverId  = rnd(100, 999).toString();
  const sessionId = randomHex(8);
  const wsUrl     = `ws://${BASE_URL}/sockjs/${serverId}/${sessionId}/websocket`;
  const visitorId = `lt-${sessionId}-${Date.now()}`;

  let connectedAt  = null;
  let methodStart  = null;
  let bookingId    = null;
  let phase        = 'connecting'; // connecting | subscribing | booking | cleanup | done
  let timedOut     = false;

  activeConnections.add(1);
  const wallStart = Date.now();

  const res = ws.connect(wsUrl, { timeout: '15s' }, function (socket) {
    connectedAt = Date.now();
    connectDuration.add(connectedAt - wallStart);

    // ── Incoming frames ────────────────────────────────────────────────────────
    socket.on('message', (frame) => {
      // SockJS opening frame
      if (frame === 'o') {
        phase = 'handshaking';
        sendDDP(socket, {
          msg:     'connect',
          version: '1',
          support: ['1', 'pre2', 'pre1'],
        });
        return;
      }

      if (frame === 'h') return; // heartbeat — ignore

      const messages = parseSockJS(frame);

      for (const msg of messages) {
        // ── DDP connected ────────────────────────────────────────────────────
        if (msg.msg === 'connected') {
          phase = 'subscribing';
          sendDDP(socket, {
            msg:    'sub',
            id:     'sub-queue',
            name:   'tableQueue',
            params: [],
          });

          // Fire the booking method immediately after subscribe
          phase = 'booking';
          methodStart = Date.now();
          sendDDP(socket, {
            msg:    'method',
            method: 'tableQueue.insert',
            params: [{
              phone:         randomPhone(),
              name:          randomName(),
              adults:        rnd(1, 6),
              children:      rnd(0, 3),
              occasion:      '',
              occasionNote:  '',
              consent:       true,
              visitorId,
              outletId:      'central',
              preferredTime: '',
            }],
            id: 'insert',
          });
        }

        // ── DDP method result ────────────────────────────────────────────────
        if (msg.msg === 'result') {
          if (msg.id === 'insert') {
            if (msg.error) {
              ddpErrors.add(1);
              ddpSuccessRate.add(false);
              socket.close();
            } else {
              bookingDuration.add(Date.now() - methodStart);
              ddpSuccessRate.add(true);
              bookingId = msg.result;

              // Clean up — remove our test entry so we don't pollute the DB
              phase = 'cleanup';
              sendDDP(socket, {
                msg:    'method',
                method: 'tableQueue.remove',
                params: [bookingId],
                id:     'remove',
              });
            }
          }

          if (msg.id === 'remove') {
            phase = 'done';
            socket.close();
          }
        }

        // ── DDP nosub / sub error ────────────────────────────────────────────
        if (msg.msg === 'nosub' && msg.error) {
          ddpErrors.add(1);
        }
      }
    });

    socket.on('error', (e) => {
      ddpErrors.add(1);
      if (phase !== 'done') ddpSuccessRate.add(false);
    });

    socket.on('close', () => {
      activeConnections.add(-1);
    });

    // Guard against stalled connections
    socket.setTimeout(() => {
      if (phase !== 'done') {
        timedOut = true;
        ddpErrors.add(1);
        ddpSuccessRate.add(false);
        socket.close();
      }
    }, 15000);
  });

  check(res, {
    'WebSocket connected (101)': (r) => r && r.status === 101,
    'booking completed without timeout': () => !timedOut,
  });

  sleep(1 + Math.random() * 2); // 1–3 s think time between iterations
}

// ─── Summary / report output ───────────────────────────────────────────────────
export function handleSummary(data) {
  // Write raw JSON for the HTML report generator
  return {
    'load-test/reports/summary.json': JSON.stringify(data, null, 2),
    stdout: formatTextSummary(data),
  };
}

function formatTextSummary(data) {
  const m = data.metrics;
  const lines = [
    '',
    '══════════════════════════════════════════════════════',
    '  QR Queue App — Load Test Summary',
    '══════════════════════════════════════════════════════',
    `  Test type : ${TEST_TYPE}`,
    `  Duration  : ${Math.round((data.state || {}).testRunDurationMs / 1000)}s`,
    '',
  ];

  const print = (label, metric, key) => {
    const v = m[metric] && m[metric].values;
    if (!v) return;
    lines.push(`  ${label.padEnd(30)} ${String(v[key] !== undefined ? v[key] : '—').padStart(12)}`);
  };

  const printTrend = (label, metric) => {
    const v = m[metric] && m[metric].values;
    if (!v) return;
    lines.push(
      `  ${label.padEnd(30)} avg=${Math.round(v.avg)}ms  p95=${Math.round(v['p(95)']+0)}ms  p99=${Math.round(v['p(99)']+0)}ms`
    );
  };

  lines.push('  ── DDP Metrics ──────────────────────────────────');
  print('  Success rate',     'ddp_success_rate',     'rate');
  print('  Total errors',     'ddp_errors',            'count');
  printTrend('  Booking latency', 'booking_duration_ms');
  printTrend('  WS connect time', 'ws_connect_duration_ms');
  lines.push('');
  lines.push('  ── Thresholds ───────────────────────────────────');

  for (const [name, th] of Object.entries(data.metrics || {})) {
    if (th.thresholds) {
      for (const [expr, result] of Object.entries(th.thresholds)) {
        const icon = result.ok ? '✓' : '✗';
        lines.push(`  ${icon} ${name}: ${expr}`);
      }
    }
  }

  lines.push('');
  lines.push(`  Report → load-test/reports/report.html`);
  lines.push('══════════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}
