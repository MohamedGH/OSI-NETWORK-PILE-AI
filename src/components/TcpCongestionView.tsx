/**
 * Interactive TCP Engine & Congestion Control Visualizer
 * Explains how TCP manages congestion, flow control, packet loss, SACK, and reliability with live animations.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  AlertTriangle,
  Flame,
  Gauge,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Clock,
  Radio,
  ArrowRight,
  ShieldCheck,
  Server,
  Laptop,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import {
  TcpAlgorithm,
  TcpScenarioTab,
  TcpCongestionPhase,
} from '../types/network';
import {
  computeSlidingWindowSegments,
  getFastRetransmitSteps,
  getSackSteps,
  getFlowControlSteps,
} from '../utils/tcpCongestionEngine';
import { InteractiveTcpFlightCannon } from './InteractiveTcpFlightCannon';

export const TcpCongestionView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();

  const {
    tcpEngine,
    isTcpEnginePlaying,
    activeTcpTab,
    activeTcpScenarioStep,
  } = state;

  const {
    algorithm,
    phase,
    cwndMss,
    ssthreshMss,
    currentRtt,
    rwndMss,
    mssBytes,
    rttHistory,
    lastEvent,
  } = tcpEngine;

  const effectiveWindowMss = Math.min(cwndMss, rwndMss);
  const effectiveWindowKb = ((effectiveWindowMss * mssBytes) / 1024).toFixed(1);
  const cwndKb = ((cwndMss * mssBytes) / 1024).toFixed(1);
  const ssthreshKb = ((ssthreshMss * mssBytes) / 1024).toFixed(1);
  const rwndKb = ((rwndMss * mssBytes) / 1024).toFixed(1);

  // Sliding window segments calculation
  const slidingWindowData = useMemo(() => {
    return computeSlidingWindowSegments(1000, cwndMss, rwndMss, mssBytes, 16);
  }, [cwndMss, rwndMss, mssBytes]);

  // Scenario steps
  const fastRetransmitSteps = useMemo(() => getFastRetransmitSteps(), []);
  const sackSteps = useMemo(() => getSackSteps(), []);
  const flowControlSteps = useMemo(() => getFlowControlSteps(), []);

  const getPhaseBadge = (p: TcpCongestionPhase) => {
    switch (p) {
      case 'SLOW_START':
        return {
          label: 'Slow Start (Croissance Exponentielle x2)',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: <Flame className="w-4 h-4 text-emerald-400" />,
        };
      case 'CONGESTION_AVOIDANCE':
        return {
          label: 'Évitement de Congestion (AIMD : +1 MSS / RTT)',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          icon: <Gauge className="w-4 h-4 text-blue-400" />,
        };
      case 'FAST_RECOVERY':
        return {
          label: 'Fast Retransmit & Fast Recovery (3 Dup-ACKs)',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          icon: <Zap className="w-4 h-4 text-amber-400" />,
        };
      case 'TIMEOUT_RTO':
        return {
          label: 'Timeout RTO (Effondrement & Retransmission)',
          color: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
        };
    }
  };

  const currentBadge = getPhaseBadge(phase);

  // SVG Congestion Graph dimensions
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const maxDisplayRtt = Math.max(12, rttHistory.length);
  const maxDisplayCwnd = 40;

  const points = rttHistory.map((pt, idx) => {
    const x = paddingX + (idx / Math.max(1, rttHistory.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (Math.min(pt.cwndMss, maxDisplayCwnd) / maxDisplayCwnd) * (svgHeight - paddingY * 2);
    return { ...pt, x, y };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '')
    : '';

  // ssthresh line Y
  const ssthreshY = svgHeight - paddingY - (Math.min(ssthreshMss, maxDisplayCwnd) / maxDisplayCwnd) * (svgHeight - paddingY * 2);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div
        id="tcp-engine-hero"
        className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Transport Layer (L4) • RFC 5681 / RFC 793
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${currentBadge.color}`}>
                {currentBadge.icon}
                {currentBadge.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Moteur TCP : Congestion, Flux & Fiabilité
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Observez comment TCP garantit une livraison ordonnée et sans perte, s’adapte dynamiquement à la capacité du réseau (Congestion Control) et empêche la submersion du récepteur (Flow Control).
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center p-1.5 bg-slate-900/50 rounded-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">cwnd (Congestion)</span>
              <span className="text-base font-bold text-amber-400 font-mono">{cwndMss} MSS</span>
              <span className="text-[10px] text-slate-500 block">{cwndKb} Ko</span>
            </div>
            <div className="text-center p-1.5 bg-slate-900/50 rounded-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">ssthresh (Seuil)</span>
              <span className="text-base font-bold text-blue-400 font-mono">{ssthreshMss} MSS</span>
              <span className="text-[10px] text-slate-500 block">{ssthreshKb} Ko</span>
            </div>
            <div className="text-center p-1.5 bg-slate-900/50 rounded-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">rwnd (Récepteur)</span>
              <span className="text-base font-bold text-emerald-400 font-mono">{rwndMss} MSS</span>
              <span className="text-[10px] text-slate-500 block">{rwndKb} Ko</span>
            </div>
            <div className="text-center p-1.5 bg-slate-900/50 rounded-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Fenêtre Utile</span>
              <span className="text-base font-bold text-cyan-400 font-mono">{effectiveWindowMss} MSS</span>
              <span className="text-[10px] text-slate-500 block">min(cwnd, rwnd)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'CONGESTION_GRAPH', label: '📊 Courbe de Congestion & AIMD', desc: 'Slow Start, Évitement & Effondrement' },
          { id: 'SLIDING_WINDOW', label: '🪟 Fenêtre Glissante & Tampon', desc: 'Gestion des octets en vol & ACK' },
          { id: 'FAST_RETRANSMIT', label: '⚡ Fast Retransmit (3 Dup-ACKs)', desc: 'Perte isolée sans attendre le minuteur RTO' },
          { id: 'SACK_SIMULATION', label: '🧩 SACK (Acquittement Sélectif)', desc: 'RFC 2018 : Réémission chirurgicale des trous' },
          { id: 'FLOW_CONTROL_RWND', label: '🛑 Contrôle de Flux (rwnd=0)', desc: 'Zero Window Probe & Anti-Deadlock' },
          { id: 'HANDSHAKE', label: '🤝 3-Way Handshake & FIN', desc: 'SYN, SYN-ACK, ACK & Teardown' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id.toLowerCase()}`}
            onClick={() => dispatch({ type: 'SET_TCP_TAB', payload: tab.id as TcpScenarioTab })}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTcpTab === tab.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CONGESTION CONTROL GRAPH & ENGINE CONTROLS */}
      {activeTcpTab === 'CONGESTION_GRAPH' && (
        <div className="space-y-6">
          {/* Live Dynamic Flight Cannon & Router Buffer Visualizer */}
          <InteractiveTcpFlightCannon />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Graph Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    Évolution Temporelle de la Fenêtre de Congestion (cwnd vs RTT)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Surveillez la courbe AIMD en temps réel : croissance exponentielle puis linéaire, et réaction aux pertes.
                  </p>
                </div>

                {/* Algorithm Selector */}
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Algorithme :</span>
                  {(['RENO', 'TAHOE', 'CUBIC', 'BBR'] as TcpAlgorithm[]).map((algo) => (
                    <button
                      key={algo}
                      id={`algo-${algo.toLowerCase()}`}
                      onClick={() => {
                        dispatch({ type: 'SET_TCP_ALGO', payload: algo });
                        notify(`Algorithme TCP commuté vers ${algo}`, 'info');
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                        algorithm === algo
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {algo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic SVG Graph */}
              <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800/80 overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-56 sm:h-64 select-none"
                >
                  {/* Grid Lines */}
                  {[0, 10, 20, 30, 40].map((val) => {
                    const y = svgHeight - paddingY - (val / maxDisplayCwnd) * (svgHeight - paddingY * 2);
                    return (
                      <g key={val}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={svgWidth - paddingX}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="4,4"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="10"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val}M
                        </text>
                      </g>
                    );
                  })}

                  {/* ssthresh Horizontal Line */}
                  <line
                    x1={paddingX}
                    y1={ssthreshY}
                    x2={svgWidth - paddingX}
                    y2={ssthreshY}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                  />
                  <text
                    x={svgWidth - paddingX - 4}
                    y={ssthreshY - 6}
                    fill="#60a5fa"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    ssthresh = {ssthreshMss} MSS
                  </text>

                  {/* Area fill under curve */}
                  {points.length > 1 && (
                    <path
                      d={`${pathD} L ${points[points.length - 1].x},${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`}
                      fill="url(#cwndGradient)"
                      opacity="0.25"
                    />
                  )}

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="cwndGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Path line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {points.map((pt, idx) => (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.isLossEvent ? 6 : idx === points.length - 1 ? 5 : 3.5}
                        fill={pt.isLossEvent ? '#ef4444' : idx === points.length - 1 ? '#fbbf24' : '#f59e0b'}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      {pt.isLossEvent && (
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          fill="#f87171"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          Perte!
                        </text>
                      )}
                    </g>
                  ))}
                </svg>

                {/* Graph Legend */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 px-2 border-t border-slate-900 gap-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-amber-500 rounded" /> cwnd (MSS)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 border-b border-blue-500 border-dashed" /> ssthresh (Seuil)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Perte / Retransmission
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono">RTT Actuel : #{currentRtt}</span>
                </div>
              </div>

              {/* Live Event Log */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Dernier Événement Réseau :</span>
                  <p className="text-xs text-amber-200/90 font-mono mt-0.5" dangerouslySetInnerHTML={{ __html: lastEvent }} />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Action Panel */}
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Contrôles de Simulation & Perturbations
              </h2>
              <p className="text-xs text-slate-400">
                Injectez manuellement des événements pour tester les mécanismes de résilience de TCP.
              </p>

              {/* Main Playback Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-tcp-play"
                  onClick={() => dispatch({ type: 'SET_TCP_ENGINE_PLAYING', payload: !isTcpEnginePlaying })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md ${
                    isTcpEnginePlaying
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {isTcpEnginePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTcpEnginePlaying ? 'Pause Flux' : 'Flux Continu'}
                </button>

                <button
                  id="btn-tcp-step-ack"
                  disabled={isTcpEnginePlaying}
                  onClick={() => dispatch({ type: 'STEP_TCP_ACK' })}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <SkipForward className="w-4 h-4 text-cyan-400" />
                  Rafale Suivante (ACK)
                </button>
              </div>

              {/* Loss Injection Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Injection d'Incidents Réseau
                </span>

                <button
                  id="btn-inject-3dup-ack"
                  onClick={() => {
                    dispatch({ type: 'INJECT_TCP_TRIPLE_DUP_ACK' });
                    notify('3 Duplicate ACKs injectés : Déclenchement Fast Retransmit & Fast Recovery', 'warning');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-between transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="block font-bold">Injecter 3 Duplicate ACKs</span>
                      <span className="text-[10px] text-amber-400/80">Perte isolée &rarr; Fast Retransmit (ssthresh = cwnd/2)</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  id="btn-inject-rto"
                  onClick={() => {
                    dispatch({ type: 'INJECT_TCP_RTO_TIMEOUT' });
                    notify('Minuteur RTO expiré : Effondrement de cwnd à 1 MSS', 'error');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 flex items-center justify-between transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="block font-bold">Injecter Expiration RTO</span>
                      <span className="text-[10px] text-rose-400/80">Congestion majeure &rarr; cwnd écroulé à 1 MSS</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>

                <button
                  id="btn-reset-tcp"
                  onClick={() => {
                    dispatch({ type: 'RESET_TCP_ENGINE' });
                    notify('Moteur TCP réinitialisé', 'info');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réinitialiser la Session TCP
                </button>
              </div>

              {/* Educational Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <HelpCircle className="w-4 h-4" />
                  Principe AIMD (Reno) :
                </div>
                <p className="text-slate-400 leading-relaxed">
                  <strong>Additive Increase</strong> (+1 MSS par RTT) pour sonder la bande passante avec douceur. <strong>Multiplicative Decrease</strong> (division par 2 de ssthresh) dès qu’une perte est signalée par 3 Dup-ACKs.
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB 2: SLIDING WINDOW & FLOW CONTROL BUFFER */}
      {activeTcpTab === 'SLIDING_WINDOW' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Visualisation de la Fenêtre Glissante (Sliding Window) & Tampon Mémoire
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  L’émetteur ne peut envoyer que les segments situés à l’intérieur de la fenêtre active <code className="text-amber-300 font-mono">min(rwnd, cwnd)</code>.
                </p>
              </div>

              {/* Slider for Receiver Window rwnd */}
              <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                  Tampon Récepteur (<code className="text-emerald-400 font-mono">rwnd</code>) :
                </span>
                <input
                  type="range"
                  min="0"
                  max="32"
                  step="2"
                  value={rwndMss}
                  onChange={(e) => dispatch({ type: 'SET_TCP_RWND', payload: parseInt(e.target.value, 10) })}
                  className="w-28 sm:w-36 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-400 font-mono w-14">
                  {rwndMss} MSS
                </span>
              </div>
            </div>

            {/* Visual Segments Track */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-[700px]">
                {slidingWindowData.segments.map((seg) => {
                  let badgeColor = 'bg-slate-800 text-slate-500 border-slate-700';
                  let statusLabel = 'Bloqué';

                  if (seg.status === 'ACKED') {
                    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                    statusLabel = 'Acquitté (ACK)';
                  } else if (seg.status === 'IN_FLIGHT') {
                    badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                    statusLabel = 'En Vol (In-Flight)';
                  } else if (seg.status === 'USABLE_WINDOW') {
                    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                    statusLabel = 'Prêt à Émettre';
                  }

                  return (
                    <div
                      key={seg.seqNum}
                      className={`flex-1 min-w-[100px] p-3 rounded-xl border flex flex-col items-center justify-between text-center transition ${badgeColor}`}
                    >
                      <span className="text-xs font-bold font-mono">Seq #{seg.seqNum}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{seg.byteRange}</span>
                      <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800">
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Window Bracket Indicator */}
              <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-400 pt-3 border-t border-slate-900">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" /> Acquitté & Libéré en RAM
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500/50" /> En Vol (Attente d'ACK)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" /> Utilisable dans Fenêtre Active
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" /> Hors-Fenêtre (Interdit d'envoi)
                </span>
              </div>
            </div>

            {/* Explanation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" /> Congestion Window (cwnd) :
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Estimé dynamiquement par l’émetteur. Il reflète le débit maximal absorbable par les routeurs et liaisons physiques du réseau sans saturation.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Receiver Window (rwnd) :
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Annoncé par le récepteur dans l’en-tête TCP. Il protège le tampon de la machine distante si son application consomme les données plus lentement que leur arrivée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FAST RETRANSMIT (3 DUPLICATE ACKS) SCENARIO */}
      {activeTcpTab === 'FAST_RETRANSMIT' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Mécanisme Fast Retransmit : Détection de Perte par 3 Duplicate ACKs
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Étape par étape : comment TCP réagit immédiatement sans attendre l'expiration lente du minuteur RTO.
                </p>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-fast-prev"
                  onClick={() => dispatch({ type: 'PREV_TCP_SCENARIO_STEP', payload: fastRetransmitSteps.length })}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-amber-400 font-bold px-2">
                  Étape {activeTcpScenarioStep} / {fastRetransmitSteps.length}
                </span>
                <button
                  id="btn-fast-next"
                  onClick={() => dispatch({ type: 'NEXT_TCP_SCENARIO_STEP', payload: fastRetransmitSteps.length })}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Step Visual Presentation */}
            {(() => {
              const currentStep = fastRetransmitSteps[activeTcpScenarioStep - 1] || fastRetransmitSteps[0];
              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-mono border border-amber-500/30">
                          {currentStep.stepNumber}
                        </span>
                        {currentStep.title}
                      </span>

                      {currentStep.ackGenerated.isDup && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          Duplicate ACK #{currentStep.ackGenerated.dupCount}/3
                        </span>
                      )}
                    </div>

                    {/* Interactive Transit Visual */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      {/* Sender */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center space-y-1">
                        <Laptop className="w-6 h-6 text-blue-400 mx-auto" />
                        <span className="text-xs font-bold text-slate-200 block">Émetteur TCP</span>
                        <p className="text-[11px] text-slate-400">{currentStep.senderAction}</p>
                      </div>

                      {/* In-Flight Packets on Medium */}
                      <div className="text-center space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Liaison Réseau</span>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {currentStep.inFlightPackets.length > 0 ? (
                            currentStep.inFlightPackets.map((pkt) => (
                              <span
                                key={pkt}
                                className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${
                                  pkt === 3 && activeTcpScenarioStep === 2
                                    ? 'bg-rose-500/30 text-rose-300 border-rose-500/60 line-through'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                }`}
                              >
                                Pkt #{pkt}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 italic">Aucun paquet en vol</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400">
                          <ArrowRight className="w-4 h-4 text-amber-400" />
                          <span>ACK = {currentStep.ackGenerated.ackNum}</span>
                        </div>
                      </div>

                      {/* Receiver */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center space-y-1">
                        <Server className="w-6 h-6 text-emerald-400 mx-auto" />
                        <span className="text-xs font-bold text-slate-200 block">Récepteur TCP</span>
                        <p className="text-[11px] text-slate-400">{currentStep.receiverAction}</p>
                      </div>
                    </div>

                    {/* Technical Deep Dive */}
                    <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold block">Pourquoi ce comportement ?</span>
                        <p className="text-slate-300 mt-0.5">{currentStep.technicalInsight}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: SACK (SELECTIVE ACKNOWLEDGMENTS) SCENARIO */}
      {activeTcpTab === 'SACK_SIMULATION' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  SACK (Selective Acknowledgment - RFC 2018)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Résout le gaspillage de bande passante : l'émetteur ne réexpédie QUE les fragments manquants au lieu de tout renvoyer.
                </p>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: 'PREV_TCP_SCENARIO_STEP', payload: sackSteps.length })}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-emerald-400 font-bold px-2">
                  Étape {activeTcpScenarioStep} / {sackSteps.length}
                </span>
                <button
                  onClick={() => dispatch({ type: 'NEXT_TCP_SCENARIO_STEP', payload: sackSteps.length })}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active SACK Step */}
            {(() => {
              const currentStep = sackSteps[activeTcpScenarioStep - 1] || sackSteps[0];
              return (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-mono border border-emerald-500/30">
                        {currentStep.stepNumber}
                      </span>
                      {currentStep.title}
                    </span>

                    {currentStep.ackGenerated.sackBlocks && (
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Option TCP : {currentStep.ackGenerated.sackBlocks}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200">Action Émetteur :</span>
                      <p className="text-slate-400">{currentStep.senderAction}</p>
                    </div>
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200">Action Récepteur & Blocs SACK :</span>
                      <p className="text-slate-400">{currentStep.receiverAction}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold block">Gain d'Efficacité Réseau :</span>
                      <p className="text-slate-300 mt-0.5">{currentStep.technicalInsight}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 5: FLOW CONTROL & ZERO WINDOW PROBE */}
      {activeTcpTab === 'FLOW_CONTROL_RWND' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  Contrôle de Flux : rwnd = 0 et Sondes Zero-Window Probe (ZWP)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comment TCP évite la perte de données lorsque l’application réceptrice est ralentie ou saturée.
                </p>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: 'PREV_TCP_SCENARIO_STEP', payload: flowControlSteps.length })}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-rose-400 font-bold px-2">
                  Étape {activeTcpScenarioStep} / {flowControlSteps.length}
                </span>
                <button
                  onClick={() => dispatch({ type: 'NEXT_TCP_SCENARIO_STEP', payload: flowControlSteps.length })}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Flow Control Step */}
            {(() => {
              const currentStep = flowControlSteps[activeTcpScenarioStep - 1] || flowControlSteps[0];
              return (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-mono border border-rose-500/30">
                        {currentStep.stepNumber}
                      </span>
                      {currentStep.title}
                    </span>

                    {currentStep.ackGenerated.sackBlocks && (
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {currentStep.ackGenerated.sackBlocks}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200">Émetteur & Minuteur de Persistance :</span>
                      <p className="text-slate-400">{currentStep.senderAction}</p>
                    </div>
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200">Récepteur & État Tampon Socket :</span>
                      <p className="text-slate-400">{currentStep.receiverAction}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs text-rose-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold block">Sécurité Anti-Interblocage (Deadlock) :</span>
                      <p className="text-slate-300 mt-0.5">{currentStep.technicalInsight}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 6: 3-WAY HANDSHAKE & 4-WAY TEARDOWN */}
      {activeTcpTab === 'HANDSHAKE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 3-Way Handshake Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Établissement de Connexion (3-Way Handshake)
            </h2>
            <p className="text-xs text-slate-400">
              Synchronisation des numéros de séquence initiaux (ISN) et négociation MSS / Window Scale.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-cyan-400 font-bold block">1. Client &rarr; Serveur : SYN</span>
                  <span className="text-[11px] text-slate-400">Flags: [SYN], Seq = 1000, Win = 65535</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">SYN_SENT</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 font-bold block">2. Serveur &rarr; Client : SYN-ACK</span>
                  <span className="text-[11px] text-slate-400">Flags: [SYN, ACK], Seq = 5000, Ack = 1001</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">SYN_RCVD</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold block">3. Client &rarr; Serveur : ACK</span>
                  <span className="text-[11px] text-slate-400">Flags: [ACK], Seq = 1001, Ack = 5001</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">ESTABLISHED</span>
              </div>
            </div>
          </div>

          {/* 4-Way Teardown Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Fermeture Propre (4-Way Teardown & TIME_WAIT)
            </h2>
            <p className="text-xs text-slate-400">
              Fermeture indépendante des deux sens de communication (Full-Duplex).
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <span className="text-rose-400 font-bold block">1. Client &rarr; Serveur : FIN</span>
                  <span className="text-[11px] text-slate-400">Flags: [FIN, ACK], Seq = 2000, Ack = 6000</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">FIN_WAIT_1</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-bold block">2. Serveur &rarr; Client : ACK</span>
                  <span className="text-[11px] text-slate-400">Flags: [ACK], Ack = 2001</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">CLOSE_WAIT</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <span className="text-rose-400 font-bold block">3. Serveur &rarr; Client : FIN</span>
                  <span className="text-[11px] text-slate-400">Flags: [FIN, ACK], Seq = 6000, Ack = 2001</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">LAST_ACK</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold block">4. Client &rarr; Serveur : ACK + TIME_WAIT</span>
                  <span className="text-[11px] text-slate-400">Attente 2 x MSL (60s) pour absorber les paquets retardés</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">TIME_WAIT</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
