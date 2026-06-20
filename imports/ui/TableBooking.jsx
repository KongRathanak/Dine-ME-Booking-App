import { useState, useEffect, useRef } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useFind } from "meteor/react-meteor-data";
import { useSearchParams } from "react-router";
import { TableQueueCollection } from "../api/tableQueue";
import { OutletSettingsCollection } from "../api/outletSettings";
import { OUTLETS, getOutlet } from "./outlets";

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');

  .tb-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .tb-root {
    font-family: 'DM Sans', sans-serif;
    background: #0d0d0d; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px;
  }

  .tb-phone {
    width: 100%; max-width: 360px; background: #111;
    border-radius: 36px; border: 1px solid #2a2a2a; overflow: hidden;
    box-shadow: 0 0 0 8px #0d0d0d, 0 32px 80px rgba(0,0,0,0.8);
  }

  /* ── Header ── */
  .tb-header {
    background: #0d0d0d; padding: 20px 24px 24px;
    position: relative; overflow: hidden;
  }
  .tb-header::before {
    content: ''; position: absolute; top: -60px; right: -60px;
    width: 160px; height: 160px;
    background: radial-gradient(circle, rgba(212,175,95,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  .tb-qr-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(212,175,95,0.12); border: 1px solid rgba(212,175,95,0.25);
    border-radius: 20px; padding: 4px 10px; margin-bottom: 12px;
  }
  .tb-qr-badge span { color: #d4af5f; font-size: 11px; font-weight: 500; letter-spacing: 0.04em; }
  .tb-restaurant { color: #fff; font-family: 'DM Serif Display', serif; font-size: 22px; line-height: 1.2; margin-bottom: 4px; }
  .tb-tagline { color: #666; font-size: 12px; font-weight: 300; letter-spacing: 0.05em; }

  .tb-outlet-addr {
    display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap;
  }
  .tb-outlet-addr span { color: #555; font-size: 11px; font-weight: 300; line-height: 1.4; }
  .tb-outlet-map {
    color: #d4af5f; font-size: 10px; font-weight: 500; text-decoration: none;
    border: 1px solid rgba(212,175,95,0.3); border-radius: 10px;
    padding: 2px 8px; white-space: nowrap; transition: background 0.15s;
  }
  .tb-outlet-map:hover { background: rgba(212,175,95,0.1); }

  .tb-branch-cards { display: flex; flex-direction: column; gap: 8px; }
  .tb-branch-card {
    width: 100%; padding: 12px 14px; border-radius: 12px;
    border: 1.5px solid #e8e2d8; background: #fff;
    cursor: pointer; text-align: left; transition: all 0.15s;
  }
  .tb-branch-card:hover { border-color: #c8c0b4; }
  .tb-branch-card.active { border-color: #1a1a1a; background: #1a1a1a; }
  .tb-branch-name { font-size: 13px; font-weight: 500; color: #1a1a1a; margin-bottom: 2px; }
  .tb-branch-card.active .tb-branch-name { color: #d4af5f; }
  .tb-branch-addr { font-size: 11px; color: #aaa; }
  .tb-branch-card.active .tb-branch-addr { color: #666; }

  /* ── Body ── */
  .tb-body { background: #f9f6f0; padding: 24px 20px 28px; border-radius: 0 0 28px 28px; }

  /* ── Form ── */
  .tb-section-label { font-size: 11px; font-weight: 500; color: #999; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }
  .tb-field { margin-bottom: 16px; }
  .tb-label { display: block; font-size: 12px; font-weight: 500; color: #555; margin-bottom: 6px; }
  .tb-input {
    width: 100%; padding: 12px 14px; background: #fff;
    border: 1.5px solid #e8e2d8; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 15px; color: #1a1a1a;
    outline: none; transition: border-color 0.2s; appearance: none; -webkit-appearance: none;
  }
  .tb-input:focus { border-color: #d4af5f; }
  .tb-input::placeholder { color: #bbb; }

  .tb-guest-row { display: flex; gap: 12px; }
  .tb-guest-row .tb-field { flex: 1; margin-bottom: 0; }

  .tb-stepper {
    display: flex; align-items: center; background: #fff;
    border: 1.5px solid #e8e2d8; border-radius: 12px; overflow: hidden; width: 100%;
  }
  .tb-stepper button {
    width: 40px; height: 42px; background: none; border: none; cursor: pointer;
    font-size: 18px; color: #1a1a1a;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; flex-shrink: 0;
  }
  .tb-stepper button:hover { background: #f5f0e8; }
  .tb-stepper button:disabled { color: #ccc; cursor: default; }
  .tb-stepper-val {
    flex: 1; text-align: center; font-size: 15px; font-weight: 500; color: #1a1a1a;
    border-left: 1px solid #e8e2d8; border-right: 1px solid #e8e2d8; line-height: 42px;
  }

  .tb-occasion-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .tb-occasion-chip {
    padding: 6px 12px; border-radius: 20px; border: 1.5px solid #e8e2d8;
    background: #fff; font-family: 'DM Sans', sans-serif; font-size: 12px; color: #666;
    cursor: pointer; transition: all 0.15s;
  }
  .tb-occasion-chip:hover { border-color: #ccc; color: #333; }
  .tb-occasion-chip.active { background: #1a1a1a; border-color: #1a1a1a; color: #d4af5f; font-weight: 500; }
  .tb-occasion-note { margin-top: 8px; }

  .tb-consent { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 16px; }
  .tb-consent-check { width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; accent-color: #1a1a1a; cursor: pointer; }
  .tb-consent-label { font-size: 12px; color: #555; line-height: 1.5; cursor: pointer; }

  .tb-notes-box {
    background: #f0ebe2; border: 1px solid #e0d8cc; border-radius: 10px;
    padding: 12px 14px; margin-bottom: 16px; font-size: 11px; color: #888; line-height: 1.7;
  }
  .tb-notes-box li { margin-left: 14px; }

  .tb-divider { height: 1px; background: #e8e2d8; margin: 16px 0; }

  .tb-cta {
    width: 100%; margin-top: 8px; padding: 14px; background: #1a1a1a; color: #d4af5f;
    border: none; border-radius: 14px; font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500; letter-spacing: 0.04em; cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }
  .tb-cta:hover { background: #2a2a2a; }
  .tb-cta:active { transform: scale(0.98); }
  .tb-cta:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Waiting queue view ── */
  .tb-queue-header { text-align: center; margin-bottom: 24px; }
  .tb-queue-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: #1a1a1a; margin-bottom: 4px; }
  .tb-queue-sub { font-size: 12px; color: #888; }

  .tb-turn-card {
    background: #1a1a1a; border-radius: 18px; padding: 20px; text-align: center;
    margin-bottom: 16px; position: relative; overflow: hidden;
  }
  .tb-turn-card::before {
    content: ''; position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
    width: 180px; height: 180px;
    background: radial-gradient(circle, rgba(212,175,95,0.18) 0%, transparent 70%);
    border-radius: 50%;
  }
  .tb-turn-label { font-size: 11px; color: #666; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  .tb-turn-number { font-family: 'DM Serif Display', serif; font-size: 56px; color: #d4af5f; line-height: 1; margin-bottom: 6px; }
  .tb-turn-current { font-size: 12px; color: #555; }
  .tb-turn-current strong { color: #d4af5f; }

  .tb-wait-row { display: flex; gap: 10px; margin-bottom: 16px; }
  .tb-wait-chip { flex: 1; background: #fff; border: 1px solid #e8e2d8; border-radius: 12px; padding: 12px 10px; text-align: center; }
  .tb-wait-chip-val { font-size: 18px; font-weight: 500; color: #1a1a1a; }
  .tb-wait-chip-key { font-size: 11px; color: #999; margin-top: 2px; }

  .tb-progress-wrap { margin-bottom: 20px; }
  .tb-progress-label { display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-bottom: 6px; }
  .tb-progress-track { background: #e8e2d8; border-radius: 99px; height: 6px; overflow: hidden; }
  .tb-progress-bar { height: 100%; background: #d4af5f; border-radius: 99px; transition: width 0.6s ease; }

  .tb-info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #ede8de; }
  .tb-info-row:last-child { border-bottom: none; }
  .tb-info-key { font-size: 12px; color: #999; }
  .tb-info-val { font-size: 13px; font-weight: 500; color: #1a1a1a; }

  .tb-notify-banner {
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; border: 1px solid #e8e2d8; border-radius: 12px;
    padding: 10px 14px; margin-bottom: 14px; gap: 10px;
  }
  .tb-notify-banner span { font-size: 12px; color: #555; }
  .tb-notify-banner button {
    padding: 5px 12px; background: #1a1a1a; color: #d4af5f;
    border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 11px; font-weight: 600; cursor: pointer; flex-shrink: 0;
    transition: background 0.15s;
  }
  .tb-notify-banner button:hover { background: #2a2a2a; }

  body { padding: 0px !important }

  .tb-cancel {
    width: 100%; margin-top: 20px; padding: 12px; background: transparent; color: #999;
    border: 1.5px solid #e0d8cc; border-radius: 12px; font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer; transition: color 0.2s, border-color 0.2s;
  }
  .tb-cancel:hover { color: #c0392b; border-color: #c0392b; }

  .tb-error { color: #c0392b; font-size: 11px; margin-top: 4px; }

  .tb-pulse-wrap { display: flex; align-items: center; gap: 6px; }
  .tb-pulse {
    width: 8px; height: 8px; border-radius: 50%; background: #d4af5f;
    display: inline-block; animation: tbPulse 1.8s ease-in-out infinite;
  }
  @keyframes tbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }

  /* ═══ BEING SERVED SCREEN ═══════════════════════════════════════════════════ */
  .tb-serve-body {
    background: #0d0d0d; border-radius: 0 0 28px 28px;
    padding: 36px 20px 32px; text-align: center;
    position: relative; overflow: hidden; min-height: 420px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }

  /* Particles */
  .tb-particles { position: absolute; inset: 0; pointer-events: none; }
  .tb-particle {
    position: absolute; width: 5px; height: 5px; border-radius: 50%;
    background: #d4af5f; opacity: 0;
  }
  .tb-particle:nth-child(1) { left: 15%; top: 75%; animation: floatUp 3.2s 0.0s ease-in-out infinite; }
  .tb-particle:nth-child(2) { left: 30%; top: 80%; animation: floatUp 2.8s 0.6s ease-in-out infinite; }
  .tb-particle:nth-child(3) { left: 50%; top: 78%; animation: floatUp 3.6s 1.1s ease-in-out infinite; }
  .tb-particle:nth-child(4) { left: 68%; top: 80%; animation: floatUp 2.9s 0.4s ease-in-out infinite; }
  .tb-particle:nth-child(5) { left: 82%; top: 74%; animation: floatUp 3.1s 0.9s ease-in-out infinite; }
  .tb-particle:nth-child(6) { left: 22%; top: 65%; animation: floatUp 2.6s 1.4s ease-in-out infinite; }
  .tb-particle:nth-child(7) { left: 74%; top: 68%; animation: floatUp 3.4s 0.2s ease-in-out infinite; }
  @keyframes floatUp {
    0%   { opacity: 0; transform: translateY(0) scale(0); }
    20%  { opacity: 0.9; transform: translateY(-24px) scale(1); }
    100% { opacity: 0; transform: translateY(-90px) scale(0.4); }
  }

  /* Orb wrapper — rings are positioned relative to this so they radiate from the orb center */
  .tb-serve-center { position: relative; z-index: 2; }
  .tb-serve-orb-wrap {
    position: relative; width: 104px; height: 104px;
    margin: 0 auto 24px;
  }

  /* Concentric pulsing rings — anchored to orb center via translate(-50%,-50%) */
  .tb-ring {
    position: absolute; top: 50%; left: 50%;
    width: 104px; height: 104px; border-radius: 50%;
    border: 1.5px solid rgba(212,175,95,0.55);
    animation: ringPulse 2.4s ease-out infinite;
    pointer-events: none;
  }
  .tb-ring:nth-child(2) { animation-delay: 0.8s; }
  .tb-ring:nth-child(3) { animation-delay: 1.6s; }
  @keyframes ringPulse {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; }
  }

  .tb-serve-orb {
    position: relative; z-index: 2;
    width: 104px; height: 104px; border-radius: 50%;
    background: linear-gradient(145deg, #d4af5f, #f0cc72, #b8963e);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 8px rgba(212,175,95,0.12), 0 0 50px rgba(212,175,95,0.45);
    animation: orbGlow 1.8s ease-in-out infinite;
  }
  @keyframes orbGlow {
    0%,100% { box-shadow: 0 0 0 8px rgba(212,175,95,0.12), 0 0 40px rgba(212,175,95,0.4); }
    50%      { box-shadow: 0 0 0 14px rgba(212,175,95,0.18), 0 0 70px rgba(212,175,95,0.7); }
  }
  .tb-serve-token {
    font-family: 'DM Serif Display', serif; font-size: 38px; color: #1a1a1a; line-height: 1;
  }
  .tb-serve-title {
    font-family: 'DM Serif Display', serif; font-size: 24px; color: #d4af5f;
    letter-spacing: 0.02em; margin-bottom: 8px;
    animation: fadeSlideUp 0.6s ease both;
  }
  .tb-serve-sub {
    font-size: 13px; color: #555; letter-spacing: 0.04em; line-height: 1.5;
    animation: fadeSlideUp 0.6s 0.1s ease both;
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ═══ SEATED / RATING SCREEN ════════════════════════════════════════════════ */
  .tb-seated-header { text-align: center; margin-bottom: 20px; }
  .tb-check-wrap { display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .tb-check-circle {
    stroke-dasharray: 166; stroke-dashoffset: 166;
    animation: drawCircle 0.7s cubic-bezier(0.65,0,0.45,1) forwards;
  }
  .tb-check-mark {
    stroke-dasharray: 48; stroke-dashoffset: 48;
    animation: drawCheck 0.4s cubic-bezier(0.65,0,0.45,1) 0.7s forwards;
  }
  @keyframes drawCircle { to { stroke-dashoffset: 0; } }
  @keyframes drawCheck  { to { stroke-dashoffset: 0; } }

  .tb-seated-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: #1a1a1a; margin-bottom: 6px; }
  .tb-seated-sub { font-size: 12px; color: #888; }

  .tb-rating-section { margin-top: 4px; }
  .tb-rating-label { font-size: 12px; font-weight: 500; color: #555; text-align: center; margin-bottom: 12px; }
  .tb-stars { display: flex; justify-content: center; gap: 6px; margin-bottom: 16px; }
  .tb-star {
    background: none; border: none; cursor: pointer; font-size: 32px; line-height: 1;
    transition: transform 0.12s, color 0.12s; color: #ddd; padding: 0;
  }
  .tb-star.filled { color: #d4af5f; transform: scale(1.15); }
  .tb-star:hover  { transform: scale(1.25); }

  .tb-comment {
    width: 100%; padding: 12px 14px; margin-bottom: 14px;
    background: #fff; border: 1.5px solid #e8e2d8; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a1a;
    outline: none; resize: none; transition: border-color 0.2s; min-height: 72px;
  }
  .tb-comment:focus { border-color: #d4af5f; }
  .tb-comment::placeholder { color: #bbb; }

  .tb-thank-you { text-align: center; padding: 20px 0; }
  .tb-thank-emoji { font-size: 44px; margin-bottom: 10px; }
  .tb-thank-title { font-family: 'DM Serif Display', serif; font-size: 18px; color: #1a1a1a; margin-bottom: 6px; }
  .tb-thank-sub { font-size: 12px; color: #888; }

  /* ── Animations ── */
  .tb-slide-in { animation: tbSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes tbSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ═══ IN-APP TURN ALERT OVERLAY ══════════════════════════════════════════════ */
  .tb-turn-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.82); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .tb-turn-overlay-card {
    background: #111; border: 1.5px solid #d4af5f; border-radius: 28px;
    padding: 36px 24px 28px; text-align: center; max-width: 320px; width: 100%;
    animation: tbSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
  }
  .tb-turn-overlay-icon { font-size: 52px; margin-bottom: 14px; }
  .tb-turn-overlay-title {
    font-family: 'DM Serif Display', serif; font-size: 24px; color: #d4af5f;
    margin-bottom: 10px;
  }
  .tb-turn-overlay-sub {
    font-size: 13px; color: #888; margin-bottom: 28px; line-height: 1.6;
  }

  /* ── iOS "Add to Home Screen" tip ── */
  .tb-ios-tip {
    background: rgba(212,175,95,0.07); border: 1.5px solid rgba(212,175,95,0.25);
    border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;
  }
  .tb-ios-tip-header {
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;
  }
  .tb-ios-tip-title { font-size: 12px; font-weight: 600; color: #d4af5f; display: flex; align-items: center; gap: 5px; }
  .tb-ios-steps { padding-left: 0; list-style: none; }
  .tb-ios-steps li {
    font-size: 11px; color: #888; margin-bottom: 4px;
    display: flex; gap: 6px; line-height: 1.5;
  }
  .tb-ios-steps li span:first-child { min-width: 14px; font-weight: 600; color: #d4af5f; }
  .tb-ios-dismiss {
    background: none; border: none; color: #555; cursor: pointer;
    font-size: 18px; line-height: 1; padding: 0; flex-shrink: 0; margin-left: 6px;
  }

  /* ── Notification permission states ── */
  .tb-notif-granted {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3);
    border-radius: 12px; font-size: 12px; color: #10b981; margin-bottom: 14px;
  }
  .tb-notif-denied {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 12px; font-size: 12px; color: #ef4444; margin-bottom: 14px;
  }

  .tb-closed-banner {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 14px; padding: 24px 20px; text-align: center; margin: 8px 0 16px;
  }
  .tb-closed-icon { font-size: 32px; margin-bottom: 10px; }
  .tb-closed-title { font-size: 16px; font-weight: 600; color: #ef4444; margin-bottom: 6px; }
  .tb-closed-msg { font-size: 12px; color: #888; line-height: 1.6; }
  .tb-closed-reason { font-size: 11px; color: #666; margin-top: 8px; font-style: italic; }
`;

// ─── Constants ─────────────────────────────────────────────────────────────────
const OCCASIONS = ["Birthday", "Anniversary", "Business Meeting", "Family Gathering", "Other"];

// ─── Platform / notification detection ─────────────────────────────────────────
const PLATFORM = (() => {
  if (typeof navigator === "undefined") return "desktop";
  if (/iP(hone|ad|od)/i.test(navigator.userAgent)) return "ios";
  if (/Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
})();

const isStandalonePWA = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(/** @type {any} */ (navigator).standalone));

const webNotifSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

const getInitialNotifPermission = () => {
  if (!webNotifSupported()) return "unsupported";
  if (PLATFORM === "ios" && !isStandalonePWA()) return "ios-browser";
  return Notification.permission;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatPhone = (val) => {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const maskPhone = (p) => p ? "***-***-" + p.replace(/\D/g, "").slice(-4) : "";

const fmtTime = (date) =>
  date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || (/** @type {any} */ (window)).webkitAudioContext;
    const ctx      = new AudioCtx();
    // C5 → E5 → G5 → C6 ascending arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.42, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch (_) { /* audio unavailable */ }
};

const requestNotificationPermission = async () => {
  if (!webNotifSupported()) return "unsupported";
  if (PLATFORM === "ios" && !isStandalonePWA()) return "ios-browser";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
};

const showWebNotification = (title, body) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/image.png" });
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────
export const TableBooking = () => {
  // Outlet — default from ?outlet= URL param (QR code), but user can change it
  const [searchParams] = useSearchParams();
  const [outletId, setOutletId] = useState(searchParams.get("outlet") || OUTLETS[0].id);
  const outlet = getOutlet(outletId);

  // Form state
  const [view, setView]               = useState("form");
  const [phone, setPhone]             = useState("");
  const [name, setName]               = useState("");
  const [adults, setAdults]           = useState(1);
  const [children, setChildren]       = useState(0);
  const [occasion, setOccasion]       = useState("");
  const [occasionNote, setOccasionNote] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [consent, setConsent]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);

  // Notification
  const [notifPermission, setNotifPermission] = useState(getInitialNotifPermission);
  const [showTurnAlert, setShowTurnAlert]     = useState(false);
  const [notifDismissed, setNotifDismissed]   = useState(false);

  // Identity & booking
  const [visitorId, setVisitorId]     = useState(null);
  const [bookingId, setBookingId]     = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Rating
  const [rating, setRating]           = useState(0);
  const [comment, setComment]         = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Subscriptions
  const isLoading         = useSubscribe("tableQueue");
  const isSettingsLoading = useSubscribe("outletSettings");
  const allQueue  = useFind(() =>
    TableQueueCollection.find({}, { sort: { prioritized: -1, createdAt: 1 } })
  );
  const allSettings = useFind(() => OutletSettingsCollection.find());

  // Cookie-based visitor identity
  useEffect(() => {
    const COOKIE_NAME = "dine_me_visitor_id";
    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1];
    if (existing) {
      setVisitorId(existing);
    } else {
      const id = crypto.randomUUID?.() ?? (() => {
        const b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        return [...b].map((v, i) => ([4,6,8,10].includes(i) ? "-" : "") + v.toString(16).padStart(2, "0")).join("");
      })();
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${COOKIE_NAME}=${id}; expires=${expires}; path=/; SameSite=Lax`;
      setVisitorId(id);
    }
  }, []);

  // Auto-restore queue view from today's booking by fingerprint
  useEffect(() => {
    if (initialized || !visitorId || isLoading()) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = allQueue.find(
      (e) => e.visitorId === visitorId && new Date(e.createdAt) >= todayStart
    );
    if (existing) {
      setBookingId(existing._id);
      setView("queue");
    }
    setInitialized(true);
  }, [visitorId, allQueue, initialized]);

  // Booking availability check
  const outletSettingsDoc  = allSettings.find((s) => s.outletId === outletId);
  const disabledPeriods    = outletSettingsDoc?.disabledPeriods || [];
  const activeDisabledPeriod = disabledPeriods.find((p) => {
    const now = new Date();
    return new Date(p.from) <= now && now <= new Date(p.to);
  });

  // Derived queue data
  const myBooking       = allQueue.find((e) => e._id === bookingId);
  const nowServingEntry = allQueue.find((e) => e.status === "serving");
  const turnsAhead      = myBooking
    ? allQueue.filter((e) => e.status === "waiting" && e.createdAt < myBooking.createdAt).length
    : 0;
  const estimatedWait = turnsAhead * 5;
  const progress = myBooking?.token && nowServingEntry?.token
    ? Math.min(99, Math.round((nowServingEntry.token / myBooking.token) * 100))
    : 0;

  // Watch notifiedAt — play chime + push notification when admin presses Notify
  const prevNotifiedAt = useRef(null);
  useEffect(() => {
    const notifiedAt = myBooking?.notifiedAt;
    if (!notifiedAt) return;
    const iso = new Date(notifiedAt).toISOString();
    if (prevNotifiedAt.current === iso) return;
    prevNotifiedAt.current = iso;
    playChime();
    setShowTurnAlert(true);
    showWebNotification(
      "Your table is ready! 🍽",
      `Token #${myBooking.token} — Please come to the front now.`
    );
  }, [myBooking?.notifiedAt]);

  // Also trigger chime + overlay when status transitions to "serving"
  const prevStatus = useRef(null);
  useEffect(() => {
    if (!myBooking) return;
    if (myBooking.status === "serving" && prevStatus.current !== "serving") {
      playChime();
      setShowTurnAlert(true);
    }
    prevStatus.current = myBooking.status;
  }, [myBooking?.status]);

  // Handlers
  const validate = () => {
    const errs = {};
    if (phone.replace(/\D/g, "").length < 9) errs.phone = "Enter a valid phone number";
    if (adults < 1) errs.adults = "At least 1 adult required";
    if (!consent) errs.consent = "Please agree to receive updates";
    return errs;
  };

  const handleRequestNotification = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result ?? "unsupported");
  };

  const handleBook = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      if (perm) setNotifPermission(perm);
      const id = await Meteor.callAsync("tableQueue.insert", {
        phone, name, adults, children, occasion, occasionNote, preferredTime, consent, visitorId, outletId,
      });
      setBookingId(id);
      setView("queue");
    } catch (err) {
      setErrors({ submit: err.reason || "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (bookingId) {
      try { await Meteor.callAsync("tableQueue.remove", bookingId); }
      catch (err) { console.error("Cancel failed:", err); }
    }
    setView("form");
    setPhone(""); setName(""); setAdults(1); setChildren(0);
    setOccasion(""); setOccasionNote(""); setPreferredTime(""); setConsent(false);
    setBookingId(null); setRating(0); setComment(""); setRatingSubmitted(false);
    setShowTurnAlert(false);
  };

  const handleRate = async () => {
    if (!rating) return;
    await Meteor.callAsync("tableQueue.rate", bookingId, { rating, comment });
    setRatingSubmitted(true);
  };

  const occasionDisplay =
    myBooking?.occasion === "Other" ? (myBooking?.occasionNote || "Other") : myBooking?.occasion;

  return (
    <>
      <style>{styles}</style>
      <div className="tb-root">
        <div className="tb-phone">

          {/* ── Header (always visible) ── */}
          <div className="tb-header">
            <div className="tb-qr-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                <rect x="19" y="14" width="2" height="2"/><rect x="17" y="19" width="4" height="2"/>
              </svg>
              <span>Scanned via QR</span>
            </div>
            <p className="tb-restaurant">{outlet.name}</p>
            <p className="tb-tagline">{outlet.tagline}</p>
            <div className="tb-outlet-addr">
              <span>📍 {outlet.address}</span>
              <a href={outlet.mapUrl} target="_blank" rel="noopener noreferrer" className="tb-outlet-map">
                Map ↗
              </a>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* LOADING                                                           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {!initialized && (
            <div className="tb-body" style={{ textAlign: "center", padding: "48px 20px", color: "#aaa", fontSize: 13 }}>
              Checking reservation…
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* FORM VIEW                                                         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {initialized && view === "form" && (
            <div className="tb-body">
              <div className="tb-slide-in">
                <p className="tb-section-label">Select branch</p>
                <div className="tb-field">
                  <div className="tb-branch-cards">
                    {OUTLETS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`tb-branch-card${outletId === o.id ? " active" : ""}`}
                        onClick={() => setOutletId(o.id)}
                      >
                        <div className="tb-branch-name">{o.name}</div>
                        <div className="tb-branch-addr">📍 {o.address}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tb-divider" />

                {activeDisabledPeriod ? (
                  <div className="tb-closed-banner">
                    <div className="tb-closed-icon">🚫</div>
                    <div className="tb-closed-title">Booking Temporarily Unavailable</div>
                    <div className="tb-closed-msg">
                      Online reservations are paused until{" "}
                      {new Date(activeDisabledPeriod.to).toLocaleString([], {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}.
                    </div>
                    {activeDisabledPeriod.reason && (
                      <div className="tb-closed-reason">{activeDisabledPeriod.reason}</div>
                    )}
                  </div>
                ) : (
                  <>
                <p className="tb-section-label">Reserve your spot</p>

                <div className="tb-field">
                  <label className="tb-label" htmlFor="tb-name">Name</label>
                  <input id="tb-name" className="tb-input" type="text" placeholder="John Doe"
                    value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="tb-field">
                  <label className="tb-label" htmlFor="tb-phone">Phone number</label>
                  <input id="tb-phone" className="tb-input" type="tel" placeholder="000-000-0000"
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatPhone(e.target.value));
                      if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                  />
                  {errors.phone && <p className="tb-error">{errors.phone}</p>}
                </div>

                <div className="tb-field">
                  <label className="tb-label">Number of Guests</label>
                  <div className="tb-guest-row">
                    <div className="tb-field">
                      <label className="tb-label" style={{ fontSize: 11, color: "#888" }}>Adults</label>
                      <div className="tb-stepper">
                        <button onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1}>−</button>
                        <span className="tb-stepper-val">{adults}</span>
                        <button onClick={() => setAdults((a) => Math.min(20, a + 1))} disabled={adults >= 20}>+</button>
                      </div>
                      {errors.adults && <p className="tb-error">{errors.adults}</p>}
                    </div>
                    <div className="tb-field">
                      <label className="tb-label" style={{ fontSize: 11, color: "#888" }}>Children</label>
                      <div className="tb-stepper">
                        <button onClick={() => setChildren((c) => Math.max(0, c - 1))} disabled={children <= 0}>−</button>
                        <span className="tb-stepper-val">{children}</span>
                        <button onClick={() => setChildren((c) => Math.min(20, c + 1))} disabled={children >= 20}>+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tb-field" style={{ marginTop: 16 }}>
                  <label className="tb-label" htmlFor="tb-time">
                    Preferred Arrival Time{" "}
                    <span style={{ color: "#bbb", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="tb-time"
                    className="tb-input"
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  />
                </div>

                <div className="tb-divider" />

                <div className="tb-field">
                  <label className="tb-label">
                    Special Occasion{" "}
                    <span style={{ color: "#bbb", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <div className="tb-occasion-chips">
                    {OCCASIONS.map((o) => (
                      <button key={o} type="button"
                        className={`tb-occasion-chip${occasion === o ? " active" : ""}`}
                        onClick={() => setOccasion(occasion === o ? "" : o)}
                      >{o}</button>
                    ))}
                  </div>
                  {occasion === "Other" && (
                    <input className="tb-input tb-occasion-note" type="text"
                      placeholder="Please specify…" value={occasionNote}
                      onChange={(e) => setOccasionNote(e.target.value)} />
                  )}
                </div>

                <div className="tb-divider" />

                <div className="tb-consent">
                  <input id="tb-consent" type="checkbox" className="tb-consent-check"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (errors.consent) setErrors((p) => ({ ...p, consent: undefined }));
                    }}
                  />
                  <label htmlFor="tb-consent" className="tb-consent-label">
                    I agree to receive reservation confirmations and updates.
                  </label>
                </div>
                {errors.consent && (
                  <p className="tb-error" style={{ marginTop: -10, marginBottom: 12 }}>{errors.consent}</p>
                )}

                <div className="tb-notes-box">
                  <ul>
                    <li>Tables are held for 15 minutes after the reservation time unless otherwise arranged.</li>
                    <li>Please notify us of any changes to your reservation as early as possible.</li>
                  </ul>
                </div>

                {errors.submit && <p className="tb-error" style={{ marginBottom: 8 }}>{errors.submit}</p>}

                <button className="tb-cta" onClick={handleBook} disabled={loading}>
                  {loading ? "Reserving…" : "Join the queue →"}
                </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* BEING SERVED SCREEN                                               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {initialized && view === "queue" && myBooking?.status === "serving" && (
            <div className="tb-serve-body tb-slide-in">
              {/* Floating gold particles */}
              <div className="tb-particles">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="tb-particle" />
                ))}
              </div>

              {/* Center orb with rings radiating from its center */}
              <div className="tb-serve-center">
                <div className="tb-serve-orb-wrap">
                  <div className="tb-ring" />
                  <div className="tb-ring" />
                  <div className="tb-ring" />
                  <div className="tb-serve-orb">
                    <span className="tb-serve-token">#{myBooking.token}</span>
                  </div>
                </div>
                <p className="tb-serve-title">Your Table is Ready!</p>
                <p className="tb-serve-sub">
                  Please proceed to the front desk now.
                  {myBooking.name ? ` Welcome, ${myBooking.name}!` : ""}
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SEATED + RATING SCREEN                                            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {initialized && view === "queue" && myBooking?.status === "seated" && (
            <div className="tb-body tb-slide-in">
              <div className="tb-seated-header">
                <div className="tb-check-wrap">
                  <svg viewBox="0 0 52 52" width="72" height="72" fill="none">
                    <circle className="tb-check-circle" cx="26" cy="26" r="25"
                      stroke="#10b981" strokeWidth="2" />
                    <path className="tb-check-mark" stroke="#10b981" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round" d="M14 27 l8 8 l16-16" />
                  </svg>
                </div>
                <p className="tb-seated-title">You're Seated!</p>
                <p className="tb-seated-sub">Enjoy your dining experience 🍽</p>
              </div>

              <div className="tb-divider" />

              {ratingSubmitted ? (
                <div className="tb-thank-you tb-slide-in">
                  <div className="tb-thank-emoji">🙏</div>
                  <p className="tb-thank-title">Thank you!</p>
                  <p className="tb-thank-sub">Your feedback helps us serve you better.</p>
                </div>
              ) : (
                <div className="tb-rating-section">
                  <p className="tb-rating-label">How was your experience today?</p>
                  <div className="tb-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} className={`tb-star${s <= rating ? " filled" : " empty"}`}
                        onClick={() => setRating(s)} type="button">
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea className="tb-comment" rows={3}
                    placeholder="Share your thoughts (optional)…"
                    value={comment} onChange={(e) => setComment(e.target.value)}
                  />
                  <button className="tb-cta" onClick={handleRate} disabled={!rating}>
                    Submit Rating
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* NO-SHOW / CANCELLED                                               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {initialized && view === "queue" &&
            (myBooking?.status === "no-show" || myBooking?.status === "cancelled") && (
            <div className="tb-body tb-slide-in" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                {myBooking.status === "no-show" ? "⏰" : "✕"}
              </div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#1a1a1a", marginBottom: 8 }}>
                {myBooking.status === "no-show" ? "Marked as No-Show" : "Reservation Cancelled"}
              </p>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 24, lineHeight: 1.6 }}>
                {myBooking.status === "no-show"
                  ? "Please speak to staff if you still need a table."
                  : "Your reservation has been cancelled."}
              </p>
              <button className="tb-cta" onClick={handleCancel}>
                Start New Booking
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* WAITING QUEUE VIEW                                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {initialized && view === "queue" && (!myBooking || myBooking?.status === "waiting") && (
            <div className="tb-body">
              <div className="tb-slide-in">
                <div className="tb-queue-header">
                  <div className="tb-pulse-wrap" style={{ justifyContent: "center", marginBottom: 10 }}>
                    <span className="tb-pulse" />
                    <span style={{ fontSize: 11, color: "#999", letterSpacing: "0.06em" }}>LIVE QUEUE</span>
                  </div>
                  <p className="tb-queue-title">You're in line!</p>
                  <p className="tb-queue-sub">We'll notify you when your table is ready</p>
                </div>

                {/* ── Notification opt-in — platform-aware ── */}
                {!notifDismissed && notifPermission === "default" && (
                  <div className="tb-notify-banner">
                    <span>🔔 Get alerted when it's your turn</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <button onClick={handleRequestNotification}>Enable</button>
                      <button
                        onClick={() => setNotifDismissed(true)}
                        style={{ background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 18, padding: "4px 2px", lineHeight: 1 }}
                      >×</button>
                    </div>
                  </div>
                )}

                {!notifDismissed && notifPermission === "ios-browser" && (
                  <div className="tb-ios-tip">
                    <div className="tb-ios-tip-header">
                      <span className="tb-ios-tip-title">🔔 Enable alerts on iOS</span>
                      <button className="tb-ios-dismiss" onClick={() => setNotifDismissed(true)}>×</button>
                    </div>
                    <ol className="tb-ios-steps">
                      <li><span>1.</span><span>Tap <strong>Share</strong> (the □↑ icon) in Safari</span></li>
                      <li><span>2.</span><span>Tap <strong>"Add to Home Screen"</strong></span></li>
                      <li><span>3.</span><span>Open the app from your home screen to get push alerts</span></li>
                    </ol>
                  </div>
                )}

                {notifPermission === "granted" && (
                  <div className="tb-notif-granted">
                    <span>✓</span>
                    <span>Notifications on — we'll alert you when it's your turn</span>
                  </div>
                )}

                {notifPermission === "denied" && (
                  <div className="tb-notif-denied">
                    <span>⚠</span>
                    <span>Notifications blocked — enable them in your browser settings to get alerts</span>
                  </div>
                )}

                <div className="tb-turn-card">
                  <p className="tb-turn-label">Your token</p>
                  <p className="tb-turn-number">{myBooking ? `#${myBooking.token}` : "…"}</p>
                  <p className="tb-turn-current">
                    Now serving <strong>{nowServingEntry ? `#${nowServingEntry.token}` : "—"}</strong>
                  </p>
                </div>

                <div className="tb-wait-row">
                  <div className="tb-wait-chip">
                    <div className="tb-wait-chip-val">{turnsAhead}</div>
                    <div className="tb-wait-chip-key">ahead of you</div>
                  </div>
                  <div className="tb-wait-chip">
                    <div className="tb-wait-chip-val">~{estimatedWait}m</div>
                    <div className="tb-wait-chip-key">est. wait</div>
                  </div>
                </div>

                <div className="tb-progress-wrap">
                  <div className="tb-progress-label">
                    <span>Queue progress</span><span>{progress}%</span>
                  </div>
                  <div className="tb-progress-track">
                    <div className="tb-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div>
                  <div className="tb-info-row">
                    <span className="tb-info-key">Branch</span>
                    <span className="tb-info-val">{outlet.name}</span>
                  </div>
                  <div className="tb-info-row">
                    <span className="tb-info-key">Booked at</span>
                    <span className="tb-info-val">{fmtTime(myBooking?.createdAt)}</span>
                  </div>
                  {myBooking?.preferredTime && (
                    <div className="tb-info-row">
                      <span className="tb-info-key">Preferred arrival</span>
                      <span className="tb-info-val">{myBooking.preferredTime}</span>
                    </div>
                  )}
                  <div className="tb-info-row">
                    <span className="tb-info-key">Adults</span>
                    <span className="tb-info-val">{myBooking?.adults ?? adults}</span>
                  </div>
                  <div className="tb-info-row">
                    <span className="tb-info-key">Children</span>
                    <span className="tb-info-val">{myBooking?.children ?? children}</span>
                  </div>
                  {occasionDisplay && (
                    <div className="tb-info-row">
                      <span className="tb-info-key">Occasion</span>
                      <span className="tb-info-val">{occasionDisplay}</span>
                    </div>
                  )}
                  <div className="tb-info-row">
                    <span className="tb-info-key">Phone</span>
                    <span className="tb-info-val">{maskPhone(myBooking?.phone ?? phone)}</span>
                  </div>
                </div>

                <button className="tb-cancel" onClick={handleCancel}>
                  Cancel reservation
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── In-app turn alert overlay (works on all platforms) ── */}
      {showTurnAlert && (
        <div className="tb-turn-overlay" onClick={() => setShowTurnAlert(false)}>
          <div className="tb-turn-overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="tb-turn-overlay-icon">🍽️</div>
            <p className="tb-turn-overlay-title">Your Table is Ready!</p>
            <p className="tb-turn-overlay-sub">
              Token #{myBooking?.token} — Please come to the front desk now.
              {myBooking?.name ? ` Welcome, ${myBooking.name}!` : ""}
            </p>
            <button className="tb-cta" onClick={() => setShowTurnAlert(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TableBooking;
