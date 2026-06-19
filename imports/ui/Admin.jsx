import { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useFind } from "meteor/react-meteor-data";
import * as XLSX from "xlsx";
import { TableQueueCollection } from "../api/tableQueue";
import { OUTLETS, getOutlet } from "./outlets";

const OCCASIONS = ["Birthday", "Anniversary", "Business Meeting", "Family Gathering", "Other"];

const formatPhone = (val) => {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const STATUS_CONFIG = {
  waiting:   { label: "Waiting",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   icon: "⏳" },
  serving:   { label: "Serving",   color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   icon: "🍽" },
  seated:    { label: "Seated",    color: "#10b981", bg: "rgba(16,185,129,0.1)",   icon: "✓"  },
  "no-show": { label: "No Show",   color: "#ef4444", bg: "rgba(239,68,68,0.1)",    icon: "✕"  },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: "—"  },
};

const STATUS_FLOW = ["waiting", "serving", "seated", "no-show", "cancelled"];

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #0a0a0a; min-height: 100vh; }

.aq-wrap {
  font-family: 'DM Sans', sans-serif;
  background: #0a0a0a; min-height: 100vh; color: #fff;
  display: flex; flex-direction: column;
}

.aq-topbar {
  background: #111; border-bottom: 1px solid #222; height: 56px;
  padding: 0 24px; display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 20;
}
.aq-brand { display: flex; align-items: center; gap: 12px; }
.aq-brand-icon {
  width: 30px; height: 30px; border: 1px solid #333; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Serif Display', serif; font-size: 16px; color: #d4af5f;
}
.aq-brand-name { font-family: 'DM Serif Display', serif; font-size: 17px; color: #fff; }
.aq-brand-sep { color: #333; }
.aq-brand-sub { font-size: 12px; color: #555; font-weight: 300; letter-spacing: 0.05em; }
.aq-topbar-right { display: flex; align-items: center; gap: 14px; }
.aq-clock { font-family: 'DM Mono', monospace; font-size: 12px; color: #444; }
.aq-live-pill {
  display: flex; align-items: center; gap: 5px;
  background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
  border-radius: 20px; padding: 4px 10px;
}
.aq-live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #10b981;
  animation: liveBlip 1.6s ease-in-out infinite;
}
@keyframes liveBlip { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
.aq-live-pill span { font-size: 10px; font-weight: 600; color: #10b981; letter-spacing: 0.07em; }

.aq-layout {
  flex: 1; display: grid; grid-template-columns: 264px 1fr;
  min-height: calc(100vh - 56px);
}
@media (max-width: 860px) {
  .aq-layout { grid-template-columns: 1fr; }
  .aq-sidebar { display: none; }
  .aq-mobile-bar { display: grid !important; }
}
@media (max-width: 560px) {
  .aq-topbar { padding: 0 16px; }
  .aq-brand-sub { display: none; }
  .aq-main-body { padding: 0 12px 80px !important; }
  .aq-filters { padding: 10px 12px !important; gap: 5px !important; }
  .aq-bottom-ctas { padding: 12px 16px !important; }
}

.aq-sidebar {
  background: #111; border-right: 1px solid #1e1e1e;
  padding: 20px 0; display: flex; flex-direction: column; overflow-y: auto;
}
.aq-sidebar-section { padding: 0 18px; margin-bottom: 22px; }
.aq-section-label {
  font-size: 10px; font-weight: 600; color: #444;
  letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;
}
.aq-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.aq-stat {
  background: #161616; border: 1px solid #1e1e1e;
  border-radius: 10px; padding: 12px 10px; text-align: center;
}
.aq-stat-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; line-height: 1; margin-bottom: 3px; }
.aq-stat-key { font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; }

.aq-serving-card {
  background: rgba(212,175,95,0.06); border: 1px solid #2a2a2a;
  border-radius: 10px; padding: 14px; text-align: center;
}
.aq-serving-label { font-size: 10px; color: #555; letter-spacing: 0.07em; margin-bottom: 5px; }
.aq-serving-token { font-family: 'DM Serif Display', serif; font-size: 44px; color: #d4af5f; line-height: 1; margin-bottom: 4px; }
.aq-serving-name { font-size: 12px; color: #666; }

/* ── Date filter ── */
.aq-date-presets { display: flex; gap: 5px; margin-bottom: 8px; }
.aq-date-btn {
  flex: 1; padding: 6px 4px; border-radius: 8px;
  border: 1px solid #2a2a2a; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 500;
  color: #555; cursor: pointer; text-align: center; transition: all 0.15s;
}
.aq-date-btn:hover { border-color: #444; color: #aaa; }
.aq-date-btn.active { background: #d4af5f; border-color: #d4af5f; color: #111; font-weight: 600; }
.aq-date-input {
  width: 100%; padding: 7px 10px;
  background: #161616; border: 1px solid #2a2a2a; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #777;
  outline: none; color-scheme: dark;
}
.aq-date-input:focus { border-color: #d4af5f; color: #ccc; }

.aq-sidebar-ctas { padding: 0 18px; margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
.aq-btn-gold {
  width: 100%; padding: 11px; background: #d4af5f; border: none; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: #111;
  cursor: pointer; letter-spacing: 0.03em; transition: background 0.2s, transform 0.1s;
}
.aq-btn-gold:hover { background: #e8c876; }
.aq-btn-gold:active { transform: scale(0.97); }
.aq-btn-outline {
  width: 100%; padding: 10px; background: transparent;
  border: 1px solid #2a2a2a; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
  color: #666; cursor: pointer; transition: all 0.15s;
}
.aq-btn-outline:hover { border-color: #d4af5f; color: #d4af5f; background: rgba(212,175,95,0.05); }
.aq-btn-export {
  width: 100%; padding: 10px; background: transparent;
  border: 1px solid #2a2a2a; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
  color: #555; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.aq-btn-export:hover { border-color: #10b981; color: #10b981; background: rgba(16,185,129,0.05); }

.aq-mobile-bar {
  display: none; grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: #1e1e1e; border-bottom: 1px solid #1e1e1e;
}
.aq-mobile-stat { background: #111; padding: 11px 6px; text-align: center; }
.aq-mobile-stat-val { font-family: 'DM Mono', monospace; font-size: 17px; font-weight: 500; }
.aq-mobile-stat-key { font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }

.aq-main { display: flex; flex-direction: column; overflow: hidden; background: #0a0a0a; }

.aq-filters {
  display: flex; gap: 6px; align-items: center;
  padding: 12px 20px; border-bottom: 1px solid #1a1a1a;
  background: #111; overflow-x: auto; scrollbar-width: none;
  position: sticky; top: 0; z-index: 5;
}
.aq-filters::-webkit-scrollbar { display: none; }
.aq-filter-btn {
  flex-shrink: 0; padding: 5px 13px; border-radius: 20px;
  border: 1px solid #2a2a2a; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500;
  color: #555; cursor: pointer; letter-spacing: 0.03em; transition: all 0.15s;
}
.aq-filter-btn:hover { border-color: #444; color: #aaa; }
.aq-filter-btn.active { background: #d4af5f; border-color: #d4af5f; color: #111; font-weight: 600; }

.aq-main-body { flex: 1; overflow-y: auto; padding: 0 20px 80px; }
.aq-main-body::-webkit-scrollbar { width: 3px; }
.aq-main-body::-webkit-scrollbar-track { background: transparent; }
.aq-main-body::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }

.aq-list-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 0 10px; }
.aq-list-title { font-family: 'DM Serif Display', serif; font-size: 15px; color: #555; }
.aq-count-pill {
  background: #1a1a1a; border: 1px solid #222; border-radius: 20px;
  padding: 2px 10px; font-family: 'DM Mono', monospace; font-size: 11px; color: #444;
}

.aq-card {
  background: #161616; border: 1px solid #222; border-radius: 12px;
  margin-bottom: 8px; overflow: hidden; transition: border-color 0.2s;
}
.aq-card:hover { border-color: #2e2e2e; }
.aq-card.is-serving { border-color: rgba(59,130,246,0.35); background: rgba(59,130,246,0.03); }
.aq-card.is-seated  { border-color: rgba(16,185,129,0.2); }

.aq-card-row { display: flex; align-items: center; gap: 12px; padding: 13px 15px; cursor: pointer; }

.aq-token {
  width: 42px; height: 42px; flex-shrink: 0;
  background: #1e1e1e; border: 1px solid #2a2a2a;
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
}
.aq-token span { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #d4af5f; }
.aq-card.is-serving .aq-token { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }
.aq-card.is-serving .aq-token span { color: #3b82f6; }

.aq-card-info { flex: 1; min-width: 0; }
.aq-card-name { font-size: 13px; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aq-card-meta { font-size: 11px; color: #444; margin-top: 2px; font-family: 'DM Mono', monospace; }

.aq-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.aq-badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.03em; white-space: nowrap;
}
.aq-badge-dot { width: 5px; height: 5px; border-radius: 50%; }
.aq-guests-tag { font-family: 'DM Mono', monospace; font-size: 11px; color: #444; }

.aq-panel {
  border-top: 1px solid #1e1e1e; padding: 13px 15px 15px;
  background: #111; animation: panelSlide 0.18s ease;
}
@keyframes panelSlide { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
.aq-panel-label { font-size: 10px; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 9px; }

/* ── Panel detail rows ── */
.aq-detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;
}
.aq-detail-cell {
  background: #161616; border: 1px solid #1e1e1e; border-radius: 8px; padding: 8px 10px;
}
.aq-detail-key { font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
.aq-detail-val { font-size: 12px; color: #aaa; font-family: 'DM Mono', monospace; }
.aq-detail-occasion {
  grid-column: 1 / -1; background: #161616; border: 1px solid #1e1e1e;
  border-radius: 8px; padding: 8px 10px;
}

.aq-status-row { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 11px; }
.aq-status-opt {
  flex: 1; min-width: 76px; padding: 7px 5px; border-radius: 8px;
  border: 1px solid #2a2a2a; background: #161616;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500;
  color: #555; cursor: pointer; text-align: center; transition: all 0.15s;
}
.aq-status-opt:hover { border-color: #3a3a3a; color: #aaa; }
.aq-status-opt.active { font-weight: 600; }

.aq-panel-actions { display: flex; gap: 7px; }
.aq-notify {
  flex: 1; padding: 9px; background: transparent;
  border: 1px solid #2a2a2a; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #777;
  cursor: pointer; transition: all 0.15s;
}
.aq-notify:hover { border-color: #d4af5f; color: #d4af5f; background: rgba(212,175,95,0.05); }
.aq-promote {
  flex: 1; padding: 9px; background: #1a1a1a;
  border: 1px solid #d4af5f; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; color: #d4af5f;
  cursor: pointer; transition: all 0.15s;
}
.aq-promote:hover { background: #d4af5f; color: #111; }

.aq-bottom-ctas {
  display: none; padding: 13px 20px;
  border-top: 1px solid #1e1e1e; background: #111; gap: 9px;
}
@media (max-width: 860px) { .aq-bottom-ctas { display: flex; } }

.aq-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  background: #fff; color: #111; padding: 9px 20px; border-radius: 20px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  white-space: nowrap; z-index: 200; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: toastPop 2.8s ease forwards;
}
@keyframes toastPop {
  0%   { opacity:0; transform:translateX(-50%) translateY(8px); }
  12%  { opacity:1; transform:translateX(-50%) translateY(0); }
  75%  { opacity:1; }
  100% { opacity:0; transform:translateX(-50%) translateY(-5px); }
}
.aq-empty { text-align: center; padding: 48px 20px; color: #333; font-size: 13px; }
.aq-slide-in { animation: cardIn 0.26s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes cardIn { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }

/* ── Search ── */
.aq-search-wrap { position: relative; margin-left: auto; flex-shrink: 0; }
.aq-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #444; font-size: 13px; pointer-events: none; }
.aq-search {
  padding: 5px 12px 5px 30px; border-radius: 20px;
  border: 1px solid #2a2a2a; background: #161616;
  font-family: 'DM Sans', sans-serif; font-size: 11px; color: #aaa;
  outline: none; width: 170px; transition: border-color 0.2s, width 0.2s;
}
.aq-search:focus { border-color: #d4af5f; color: #ccc; width: 210px; }
.aq-search::placeholder { color: #333; }

/* ── New booking modal ── */
.aq-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 50;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.aq-modal {
  background: #111; border: 1px solid #2a2a2a; border-radius: 16px;
  width: 100%; max-width: 400px; max-height: 88vh; overflow-y: auto; padding: 22px 20px;
}
.aq-modal::-webkit-scrollbar { width: 3px; }
.aq-modal::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
.aq-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.aq-modal-title { font-family: 'DM Serif Display', serif; font-size: 17px; color: #fff; }
.aq-modal-close { background: none; border: none; color: #444; font-size: 22px; cursor: pointer; line-height: 1; padding: 0; }
.aq-modal-close:hover { color: #aaa; }
.aq-modal-label { font-size: 10px; font-weight: 600; color: #555; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 5px; display: block; }
.aq-modal-input {
  width: 100%; padding: 10px 12px; background: #161616;
  border: 1px solid #2a2a2a; border-radius: 8px; margin-bottom: 12px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #ccc;
  outline: none; transition: border-color 0.2s;
}
.aq-modal-input:focus { border-color: #d4af5f; }
.aq-modal-input::placeholder { color: #2e2e2e; }
.aq-modal-row { display: flex; gap: 10px; }
.aq-modal-row > div { flex: 1; }
.aq-modal-stepper {
  display: flex; align-items: center; background: #161616;
  border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; margin-bottom: 12px;
}
.aq-modal-stepper button {
  width: 36px; height: 38px; background: none; border: none; cursor: pointer;
  font-size: 16px; color: #777; flex-shrink: 0; transition: background 0.15s;
  display: flex; align-items: center; justify-content: center;
}
.aq-modal-stepper button:hover { background: #1e1e1e; }
.aq-modal-stepper button:disabled { color: #2a2a2a; cursor: default; }
.aq-modal-stepper-val {
  flex: 1; text-align: center; font-size: 13px; color: #ccc; font-weight: 500;
  border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a; line-height: 38px;
}
.aq-modal-divider { height: 1px; background: #1e1e1e; margin: 4px 0 14px; }
.aq-modal-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.aq-modal-chip {
  padding: 5px 10px; border-radius: 16px; border: 1px solid #2a2a2a; background: #161616;
  font-family: 'DM Sans', sans-serif; font-size: 11px; color: #555;
  cursor: pointer; transition: all 0.15s;
}
.aq-modal-chip:hover { border-color: #3a3a3a; color: #888; }
.aq-modal-chip.active { background: #d4af5f; border-color: #d4af5f; color: #111; font-weight: 600; }
.aq-modal-error { color: #ef4444; font-size: 11px; margin-bottom: 10px; }
.aq-modal-submit {
  width: 100%; padding: 11px; margin-top: 4px; background: #d4af5f; border: none; border-radius: 9px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: #111;
  cursor: pointer; transition: background 0.2s;
}
.aq-modal-submit:hover { background: #e8c876; }
.aq-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Arrival countdown pill ── */
.aq-arrival-pill {
  font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500;
  padding: 2px 8px; border-radius: 8px; white-space: nowrap;
}
.aq-arrival-ok      { background: rgba(16,185,129,0.08);  color: #10b981; border: 1px solid rgba(16,185,129,0.18); }
.aq-arrival-soon    { background: rgba(245,158,11,0.10);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.22); }
.aq-arrival-urgent  { background: rgba(239,68,68,0.10);   color: #ef4444; border: 1px solid rgba(239,68,68,0.22); }
.aq-arrival-overdue { background: rgba(239,68,68,0.15);   color: #ef4444; border: 1px solid rgba(239,68,68,0.30); font-weight: 700; }

/* ── Outlet selector ── */
.aq-outlet-tabs { display: flex; flex-direction: column; gap: 5px; }
.aq-outlet-tab {
  width: 100%; padding: 10px 12px; border-radius: 9px;
  border: 1px solid #1e1e1e; background: #161616;
  cursor: pointer; text-align: left; transition: all 0.15s;
}
.aq-outlet-tab:hover { border-color: #2e2e2e; }
.aq-outlet-tab.active { background: rgba(212,175,95,0.07); border-color: rgba(212,175,95,0.28); }
.aq-outlet-tab-name {
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: #666;
}
.aq-outlet-tab.active .aq-outlet-tab-name { color: #d4af5f; }
.aq-outlet-tab-addr {
  font-size: 10px; color: #2e2e2e; margin-top: 2px;
  font-family: 'DM Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.aq-outlet-tab.active .aq-outlet-tab-addr { color: #555; }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (date) =>
  date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const fmtDate = (date) =>
  date ? new Date(date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "";

const todayISO = () => new Date().toISOString().slice(0, 10);

const getDateRange = (dateFilter, customDate) => {
  const now = new Date();
  if (dateFilter === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (dateFilter === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (dateFilter === "custom" && customDate) {
    const d = new Date(customDate + "T00:00:00");
    return { start: d, end: new Date(d.getTime() + 86_400_000 - 1) };
  }
  return null; // "all"
};

const getArrivalMinutes = (item, now) => {
  if (!item.preferredTime || item.status !== "waiting") return null;
  const [h, m] = item.preferredTime.split(":").map(Number);
  const base = new Date(item.createdAt);
  const arrival = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0);
  return Math.round((arrival - now) / 60000);
};

const fmtCountdown = (totalMin) => {
  const abs = Math.abs(totalMin);
  const h   = Math.floor(abs / 60);
  const m   = abs % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)          return `${h}h`;
  return `${m}m`;
};

const exportToExcel = (rows, label) => {
  const data = rows.map((item) => ({
    "Outlet":         getOutlet(item.outletId)?.name || item.outletId || "",
    "Token":          `#${item.token}`,
    "Name":           item.name || "",
    "Phone":          item.phone || "",
    "Adults":         item.adults ?? "",
    "Children":       item.children ?? "",
    "Total Guests":   item.guests ?? "",
    "Occasion":       item.occasion === "Other"
                        ? `Other — ${item.occasionNote || ""}`.trim().replace(/—\s*$/, "")
                        : (item.occasion || ""),
    "Status":         item.status || "",
    "Prioritized":    item.prioritized ? "Yes" : "No",
    "Consent":        item.consent ? "Yes" : "No",
    "Preferred Arrival": item.preferredTime || "",
    "Booked At":      item.createdAt   ? new Date(item.createdAt).toLocaleString()   : "",
    "Notified At":    item.notifiedAt  ? new Date(item.notifiedAt).toLocaleString()  : "",
    "Rating":         item.rating      ? `${item.rating}/5`                           : "",
    "Feedback":       item.comment     || "",
    "Rated At":       item.ratedAt     ? new Date(item.ratedAt).toLocaleString()     : "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Queue");
  XLSX.writeFile(wb, `queue-${label}.xlsx`);
};

// ─── Component ─────────────────────────────────────────────────────────────────
export const Admin = () => {
  const isLoading = useSubscribe("tableQueue");
  const allQueue  = useFind(() =>
    TableQueueCollection.find({}, { sort: { prioritized: -1, createdAt: 1 } })
  );

  const [expanded,     setExpanded]     = useState(null);
  const [filter,       setFilter]       = useState("all");
  const [dateFilter,   setDateFilter]   = useState("today");
  const [customDate,   setCustomDate]   = useState(todayISO());
  const [outletFilter, setOutletFilter] = useState(OUTLETS[0].id);
  const [search,       setSearch]       = useState("");
  const [toast,        setToast]        = useState(null);
  const [time,         setTime]         = useState(new Date());

  // New booking modal state
  const [showNewBooking,  setShowNewBooking]  = useState(false);
  const [nbName,          setNbName]          = useState("");
  const [nbPhone,         setNbPhone]         = useState("");
  const [nbAdults,        setNbAdults]        = useState(1);
  const [nbChildren,      setNbChildren]      = useState(0);
  const [nbOccasion,      setNbOccasion]      = useState("");
  const [nbOccasionNote,  setNbOccasionNote]  = useState("");
  const [nbPreferredTime, setNbPreferredTime] = useState("");
  const [nbLoading,       setNbLoading]       = useState(false);
  const [nbError,         setNbError]         = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (id, status) => {
    await Meteor.callAsync("tableQueue.update", id, { status });
    showToast(`Updated → ${STATUS_CONFIG[status].label}`);
  };

  const promoteToFront = async (id) => {
    await Meteor.callAsync("tableQueue.promote", id);
    showToast("⬆ Moved to front of queue");
    setExpanded(null);
  };

  const callNext = async () => {
    const next = queue.find((i) => i.status === "waiting");
    if (!next) { showToast("No guests waiting"); return; }
    await Meteor.callAsync("tableQueue.update", next._id, { status: "serving" });
    showToast(`Calling #${next.token} — ${next.name || next.phone}`);
  };

  const resetNewBooking = () => {
    setNbName(""); setNbPhone(""); setNbAdults(1); setNbChildren(0);
    setNbOccasion(""); setNbOccasionNote(""); setNbPreferredTime(""); setNbError("");
  };

  const handleNewBooking = async () => {
    if (!nbPhone && !nbName) { setNbError("Enter a name or phone number"); return; }
    setNbLoading(true); setNbError("");
    try {
      await Meteor.callAsync("tableQueue.insert", {
        phone: nbPhone, name: nbName,
        adults: nbAdults, children: nbChildren,
        occasion: nbOccasion, occasionNote: nbOccasionNote,
        preferredTime: nbPreferredTime,
        consent: true,
        visitorId: `staff-${Date.now()}`,
        outletId: outletFilter,
      });
      setShowNewBooking(false);
      resetNewBooking();
      showToast("✓ Booking added to queue");
    } catch (err) {
      setNbError(err.reason || "Failed to create booking");
    } finally {
      setNbLoading(false);
    }
  };

  // Apply outlet filter then date filter client-side
  // Bookings without outletId (created before the field existed) fall back to the default outlet
  const outletQueue = allQueue.filter((i) => (i.outletId || OUTLETS[0].id) === outletFilter);
  const range = getDateRange(dateFilter, customDate);
  const queue = range
    ? outletQueue.filter((i) => {
        const d = new Date(i.createdAt);
        return d >= range.start && d <= range.end;
      })
    : outletQueue;

  const filters = [
    { key: "all",       label: "All"       },
    { key: "waiting",   label: "Waiting"   },
    { key: "serving",   label: "Serving"   },
    { key: "seated",    label: "Seated"    },
    { key: "no-show",   label: "No Show"   },
    { key: "cancelled", label: "Cancelled" },
  ];

  const byStatus   = filter === "all" ? queue : queue.filter((i) => i.status === filter);
  const searchTerm = search.trim().toLowerCase();
  const filtered   = searchTerm
    ? byStatus.filter((i) =>
        (i.name  || "").toLowerCase().includes(searchTerm) ||
        (i.phone || "").replace(/\D/g, "").includes(search.replace(/\D/g, ""))
      )
    : byStatus;
  const counts = {
    waiting: queue.filter((i) => i.status === "waiting").length,
    serving: queue.filter((i) => i.status === "serving").length,
    seated:  queue.filter((i) => i.status === "seated").length,
    noShow:  queue.filter((i) => i.status === "no-show").length,
  };
  const nowServing = queue.find((i) => i.status === "serving");
  const clockStr   = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const exportLabel = dateFilter === "today"  ? todayISO()
                    : dateFilter === "month"  ? `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`
                    : dateFilter === "custom" ? customDate
                    : "all";

  return (
    <>
      <style>{css}</style>
      <div className="aq-wrap">

        <header className="aq-topbar">
          <div className="aq-brand">
            <div className="aq-brand-icon">S</div>
            <span className="aq-brand-name">SteamMe!</span>
            <span className="aq-brand-sep">·</span>
            <span className="aq-brand-sub">{getOutlet(outletFilter).name} · Admin</span>
          </div>
          <div className="aq-topbar-right">
            <span className="aq-clock">{clockStr}</span>
            <div className="aq-live-pill">
              <div className="aq-live-dot" />
              <span>LIVE</span>
            </div>
          </div>
        </header>

        <div className="aq-mobile-bar">
          {[
            { val: counts.waiting, label: "Waiting", color: "#f59e0b" },
            { val: counts.serving, label: "Serving", color: "#3b82f6" },
            { val: counts.seated,  label: "Seated",  color: "#10b981" },
            { val: counts.noShow,  label: "No Show", color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} className="aq-mobile-stat">
              <div className="aq-mobile-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="aq-mobile-stat-key">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="aq-layout">
          <aside className="aq-sidebar">

            {/* Outlet selector */}
            <div className="aq-sidebar-section">
              <div className="aq-section-label">Branch</div>
              <div className="aq-outlet-tabs">
                {OUTLETS.map((o) => (
                  <button
                    key={o.id}
                    className={`aq-outlet-tab${outletFilter === o.id ? " active" : ""}`}
                    onClick={() => { setOutletFilter(o.id); setExpanded(null); }}
                  >
                    <div className="aq-outlet-tab-name">{o.name}</div>
                    <div className="aq-outlet-tab-addr">{o.address}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Overview */}
            <div className="aq-sidebar-section">
              <div className="aq-section-label">Overview</div>
              <div className="aq-stat-grid">
                <div className="aq-stat"><div className="aq-stat-val" style={{ color: "#f59e0b" }}>{counts.waiting}</div><div className="aq-stat-key">Waiting</div></div>
                <div className="aq-stat"><div className="aq-stat-val" style={{ color: "#3b82f6" }}>{counts.serving}</div><div className="aq-stat-key">Serving</div></div>
                <div className="aq-stat"><div className="aq-stat-val" style={{ color: "#10b981" }}>{counts.seated}</div><div className="aq-stat-key">Seated</div></div>
                <div className="aq-stat"><div className="aq-stat-val" style={{ color: "#ef4444" }}>{counts.noShow}</div><div className="aq-stat-key">No Show</div></div>
              </div>
            </div>

            {/* Date filter */}
            <div className="aq-sidebar-section">
              <div className="aq-section-label">Date Filter</div>
              <div className="aq-date-presets">
                {[
                  { key: "today", label: "Today"  },
                  { key: "month", label: "Month"  },
                  { key: "all",   label: "All"    },
                ].map((d) => (
                  <button
                    key={d.key}
                    className={`aq-date-btn${dateFilter === d.key ? " active" : ""}`}
                    onClick={() => setDateFilter(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                className="aq-date-input"
                value={customDate}
                onChange={(e) => { setCustomDate(e.target.value); setDateFilter("custom"); }}
              />
            </div>

            {/* Now Serving */}
            <div className="aq-sidebar-section">
              <div className="aq-section-label">Now Serving</div>
              {nowServing ? (
                <div className="aq-serving-card">
                  <div className="aq-serving-label">TOKEN</div>
                  <div className="aq-serving-token">#{nowServing.token}</div>
                  <div className="aq-serving-name">{nowServing.name || nowServing.phone} · {nowServing.guests} guests</div>
                </div>
              ) : (
                <div className="aq-serving-card" style={{ opacity: 0.4 }}>
                  <div className="aq-serving-label">TOKEN</div>
                  <div className="aq-serving-token" style={{ fontSize: 28 }}>—</div>
                  <div className="aq-serving-name">No one being served</div>
                </div>
              )}
            </div>

            <div className="aq-sidebar-ctas">
              <button className="aq-btn-gold" onClick={callNext}>Call Next in Queue →</button>
              <button className="aq-btn-outline" onClick={() => { resetNewBooking(); setShowNewBooking(true); }}>+ New Booking</button>
              <button className="aq-btn-outline" onClick={() => showToast("Queue paused")}>⏸ Hold Queue</button>
              <button className="aq-btn-export" onClick={() => { exportToExcel(queue, exportLabel); showToast("Exported!"); }}>
                ↓ Export to Excel
              </button>
            </div>
          </aside>

          <main className="aq-main">
            <div className="aq-filters">
              {filters.map((f) => (
                <button
                  key={f.key}
                  className={`aq-filter-btn${filter === f.key ? " active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
              <div className="aq-search-wrap">
                <span className="aq-search-icon">⌕</span>
                <input
                  className="aq-search"
                  type="text"
                  placeholder="Name or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="aq-main-body">
              <div className="aq-list-head">
                <span className="aq-list-title">Queue · {fmtDate(range?.start) || "All time"}</span>
                <span className="aq-count-pill">{isLoading() ? "…" : `${filtered.length} guests`}</span>
              </div>

              {!isLoading() && filtered.length === 0 && (
                <div className="aq-empty">No guests in this category</div>
              )}

              {filtered.map((item, i) => {
                const sc    = STATUS_CONFIG[item.status] || STATUS_CONFIG.waiting;
                const isOpen = expanded === item._id;
                const cls   = `aq-card aq-slide-in${item.status === "serving" ? " is-serving" : ""}${item.status === "seated" ? " is-seated" : ""}`;
                const occasionDisplay = item.occasion === "Other"
                  ? (item.occasionNote || "Other")
                  : item.occasion;
                const arrivalMin = getArrivalMinutes(item, time);

                return (
                  <div key={item._id} className={cls} style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="aq-card-row" onClick={() => setExpanded(isOpen ? null : item._id)}>
                      <div className="aq-token"><span>#{item.token}</span></div>
                      <div className="aq-card-info">
                        <div className="aq-card-name">{item.name || item.phone}</div>
                        <div className="aq-card-meta">{item.phone} · {fmtTime(item.createdAt)}</div>
                      </div>
                      <div className="aq-card-right">
                        <div className="aq-badge" style={{ color: sc.color, background: sc.bg }}>
                          <div className="aq-badge-dot" style={{ background: sc.color }} />
                          {sc.label}
                        </div>
                        <div className="aq-guests-tag">👥 {item.guests} {item.guests === 1 ? "guest" : "guests"}</div>
                        {arrivalMin !== null && (
                          <div className={`aq-arrival-pill ${
                            arrivalMin < 0  ? "aq-arrival-overdue" :
                            arrivalMin < 5  ? "aq-arrival-urgent"  :
                            arrivalMin < 15 ? "aq-arrival-soon"    : "aq-arrival-ok"
                          }`}>
                            {arrivalMin < 0
                              ? `${fmtCountdown(arrivalMin)} late`
                              : arrivalMin === 0
                              ? "arriving now"
                              : `🕐 in ${fmtCountdown(arrivalMin)}`}
                          </div>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="aq-panel">

                        {/* Guest details */}
                        <div className="aq-panel-label">Guest Details</div>
                        <div className="aq-detail-grid">
                          <div className="aq-detail-cell">
                            <div className="aq-detail-key">Adults</div>
                            <div className="aq-detail-val">{item.adults ?? "—"}</div>
                          </div>
                          <div className="aq-detail-cell">
                            <div className="aq-detail-key">Children</div>
                            <div className="aq-detail-val">{item.children ?? "—"}</div>
                          </div>
                          {item.preferredTime && (
                            <div className="aq-detail-cell" style={{ gridColumn: "1 / -1" }}>
                              <div className="aq-detail-key">Preferred Arrival</div>
                              <div className="aq-detail-val" style={{
                                display: "flex", alignItems: "center", gap: 8,
                              }}>
                                {item.preferredTime}
                                {arrivalMin !== null && (
                                  <span className={`aq-arrival-pill ${
                                    arrivalMin < 0  ? "aq-arrival-overdue" :
                                    arrivalMin < 5  ? "aq-arrival-urgent"  :
                                    arrivalMin < 15 ? "aq-arrival-soon"    : "aq-arrival-ok"
                                  }`}>
                                    {arrivalMin < 0
                                      ? `${fmtCountdown(arrivalMin)} late`
                                      : arrivalMin === 0
                                      ? "arriving now"
                                      : `in ${fmtCountdown(arrivalMin)}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {occasionDisplay && (
                            <div className="aq-detail-occasion">
                              <div className="aq-detail-key">Special Occasion</div>
                              <div className="aq-detail-val">{occasionDisplay}</div>
                            </div>
                          )}
                        </div>

                        {/* Status update */}
                        <div className="aq-panel-label">Update Status</div>
                        <div className="aq-status-row">
                          {STATUS_FLOW.map((s) => {
                            const sc2      = STATUS_CONFIG[s];
                            const isActive = item.status === s;
                            return (
                              <button
                                key={s}
                                className={`aq-status-opt${isActive ? " active" : ""}`}
                                style={isActive ? { background: sc2.bg, borderColor: sc2.color, color: sc2.color } : {}}
                                onClick={() => updateStatus(item._id, s)}
                              >
                                {sc2.icon} {sc2.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="aq-panel-actions">
                          <button className="aq-notify" onClick={async () => {
                            await Meteor.callAsync("tableQueue.notify", item._id);
                            showToast(`📲 Notified ${item.name || item.phone}`);
                          }}>
                            📲 Notify Guest
                          </button>
                          {item.status === "waiting" && (
                            <button className="aq-promote" onClick={() => promoteToFront(item._id)}>
                              ⬆ Move to Front
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ height: 24 }} />
            </div>

            <div className="aq-bottom-ctas">
              <button className="aq-btn-outline" style={{ flex: "0 0 auto", padding: "11px 18px" }} onClick={() => showToast("Queue paused")}>
                ⏸ Hold
              </button>
              <button className="aq-btn-gold" style={{ flex: 1, padding: 12 }} onClick={callNext}>
                Call Next →
              </button>
            </div>
          </main>
        </div>

        {/* ── New Booking Modal ── */}
        {showNewBooking && (
          <div className="aq-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowNewBooking(false); resetNewBooking(); } }}>
            <div className="aq-modal">
              <div className="aq-modal-head">
                <span className="aq-modal-title">New Booking</span>
                <button className="aq-modal-close" onClick={() => { setShowNewBooking(false); resetNewBooking(); }}>×</button>
              </div>

              <label className="aq-modal-label">Name</label>
              <input className="aq-modal-input" type="text" placeholder="Guest name"
                value={nbName} onChange={(e) => setNbName(e.target.value)} />

              <label className="aq-modal-label">Phone</label>
              <input className="aq-modal-input" type="tel" placeholder="000-000-0000"
                value={nbPhone} onChange={(e) => setNbPhone(formatPhone(e.target.value))} />

              <div className="aq-modal-row">
                <div>
                  <label className="aq-modal-label">Adults</label>
                  <div className="aq-modal-stepper">
                    <button onClick={() => setNbAdults((a) => Math.max(1, a - 1))} disabled={nbAdults <= 1}>−</button>
                    <span className="aq-modal-stepper-val">{nbAdults}</span>
                    <button onClick={() => setNbAdults((a) => Math.min(20, a + 1))} disabled={nbAdults >= 20}>+</button>
                  </div>
                </div>
                <div>
                  <label className="aq-modal-label">Children</label>
                  <div className="aq-modal-stepper">
                    <button onClick={() => setNbChildren((c) => Math.max(0, c - 1))} disabled={nbChildren <= 0}>−</button>
                    <span className="aq-modal-stepper-val">{nbChildren}</span>
                    <button onClick={() => setNbChildren((c) => Math.min(20, c + 1))} disabled={nbChildren >= 20}>+</button>
                  </div>
                </div>
              </div>

              <label className="aq-modal-label">Preferred Arrival Time</label>
              <input className="aq-modal-input" type="time"
                value={nbPreferredTime} onChange={(e) => setNbPreferredTime(e.target.value)} />

              <div className="aq-modal-divider" />

              <label className="aq-modal-label">Special Occasion (Optional)</label>
              <div className="aq-modal-chips">
                {OCCASIONS.map((o) => (
                  <button key={o} type="button"
                    className={`aq-modal-chip${nbOccasion === o ? " active" : ""}`}
                    onClick={() => setNbOccasion(nbOccasion === o ? "" : o)}
                  >{o}</button>
                ))}
              </div>
              {nbOccasion === "Other" && (
                <input className="aq-modal-input" type="text" placeholder="Please specify…"
                  value={nbOccasionNote} onChange={(e) => setNbOccasionNote(e.target.value)} />
              )}

              {nbError && <div className="aq-modal-error">{nbError}</div>}
              <button className="aq-modal-submit" onClick={handleNewBooking} disabled={nbLoading}>
                {nbLoading ? "Adding…" : `Add to Queue · ${getOutlet(outletFilter).name}`}
              </button>
            </div>
          </div>
        )}

        {toast && <div className="aq-toast">{toast}</div>}
      </div>
    </>
  );
};

export default Admin;
