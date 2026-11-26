/**
 * TCP Congestion Control (CUBIC RFC 8312, Reno, Tahoe, BBR) & Sliding Window Sandbox
 * Interactive Two-Zone Sandbox with live SVG congestion graph, sliding window byte strip,
 * multi-protocol comparator, and Fast Retransmit / SACK step inspector.
 */

import React from 'react';
import { Play, Pause, RotateCcw, StepForward } from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import {
  computeSlidingWindowSegments,
  generateAlgorithmComparisonCurves,
  getFastRetransmitSackSteps,
  calculateCubicWindow,
} from '../utils/tcpCongestionEngine';
import { TcpAlgorithm, TcpScenarioTab } from '../types/network';

export const TcpCongestionView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const { tcpEngine, isTcpPlaying, activeTcpTab, activeSackStep } = state;

  const effectiveWindowMss = Math.min(tcpEngine.cwndMss, tcpEngine.rwndMss);
  const slidingSegments = computeSlidingWindowSegments(
    tcpEngine.baseSeqNum,
    effectiveWindowMss,
    tcpEngine.inFlightMss,
    16
  );
  const comparisonRows = generateAlgorithmComparisonCurves();
  const sackSteps = getFastRetransmitSackSteps();
  const currentSack = sackSteps[activeSackStep - 1] || sackSteps[0];
  const cubicMath = calculateCubicWindow(
    Math.max(0, tcpEngine.currentRtt - tcpEngine.epochStartRtt),
    tcpEngine.wMaxMss
  );

  const handleSelectAlgo = (algo: TcpAlgorithm) => {
    dispatch({ type: 'SET_TCP_ALGO', payload: algo });
    notify(`Algorithme TCP sélectionné : ${algo}`, 'info');
  };

  const handleDupAck = () => {
    dispatch({ type: 'INJECT_TCP_DUP_ACK' });
    notify(`3 Dup-ACK injectés (${tcpEngine.algorithm}) : Fast Retransmit déclenché`, 'warning');
  };

  const handleRto = () => {
    dispatch({ type: 'INJECT_TCP_RTO' });
    notify(`Expiration du délai RTO (${tcpEngine.algorithm}) : retour à cwnd = 1 MSS`, 'error');
  };

  // SVG Chart Geometry
  const chartW = 720;
  const chartH = 270;
  const padL = 44;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxY = 36;

  const pts = tcpEngine.history;
  const toX = (idx: number) =>
    padL + (pts.length <= 1 ? 0 : (idx / (pts.length - 1)) * plotW);
  const toY = (val: number) => padT + plotH - (Math.min(maxY, val) / maxY) * plotH;

  const cwndPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.cwndMss).toFixed(1)}`)
    .join(' ');
  const ssthreshPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.ssthreshMss).toFixed(1)}`)
    .join(' ');
  const rwndY = toY(tcpEngine.rwndMss);

  return (
    <div className="space-y-8">
      {/* Header & Clean Metadata */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs text-slate-400">
            <span>Couche 4 Transport</span>
            <span className="mx-2">·</span>
            <span>RFC 8312 (CUBIC)</span>
            <span className="mx-2">·</span>
            <span>RFC 5681 (Reno)</span>
            <span className="mx-2">·</span>
            <span>RFC 2018 (SACK)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Moteur TCP : CUBIC, Reno, Tahoe, BBR & Fenêtre Glissante
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Explorez la dynamique de la fenêtre de congestion <code className="text-sky-300">cwnd</code>, le contrôle de flux récepteur <code className="text-emerald-300">rwnd</code> et la fenêtre effective d’émission <code className="text-amber-300">W = min(cwnd, rwnd)</code>.
          </p>
        </div>

        {/* Segmented Protocol Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start">
          {(['CUBIC', 'RENO', 'TAHOE', 'BBR'] as TcpAlgorithm[]).map(algo => (
            <button
              key={algo}
              onClick={() => handleSelectAlgo(algo)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tcpEngine.algorithm === algo
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              TCP {algo}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone (8 cols): Interactive Stage */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[
                { id: 'CONGESTION_GRAPH', label: 'Courbe cwnd & CUBIC' },
                { id: 'SLIDING_WINDOW', label: 'Fenêtre Glissante' },
                { id: 'ALGO_COMPARATOR', label: 'Comparateur 4 Protocoles' },
                { id: 'FAST_RETRANSMIT_SACK', label: 'Fast Retransmit & SACK' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => dispatch({ type: 'SET_TCP_TAB', payload: t.id as TcpScenarioTab })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTcpTab === t.id
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-slate-400 tabular-nums">
              RTT #{tcpEngine.currentRtt} · Phase : <span className="text-sky-300 font-semibold">{tcpEngine.phase}</span>
            </div>
          </div>

          {/* TAB 1: Live Congestion Graph */}
          {activeTcpTab === 'CONGESTION_GRAPH' && (
            <div className="space-y-4">
              <div className="w-full overflow-x-auto bg-slate-950 border border-slate-800/80 rounded-lg p-3">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto min-w-[480px]">
                  {/* Horizontal Grid Lines */}
                  {[0, 8, 16, 24, 32].map(val => {
                    const y = toY(val);
                    return (
                      <g key={val}>
                        <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Receiver Window (rwnd) Ceiling Line */}
                  <line
                    x1={padL}
                    y1={rwndY}
                    x2={chartW - padR}
                    y2={rwndY}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x={chartW - padR - 4} y={rwndY - 6} textAnchor="end" className="fill-emerald-400 text-[10px] font-mono">
                    Plafond rwnd ({tcpEngine.rwndMss} MSS)
                  </text>

                  {/* ssthresh Path */}
                  <path d={ssthreshPath} fill="none" stroke="#f59e0b" strokeWidth="1.75" strokeDasharray="4 4" />

                  {/* cwnd Path */}
                  <path d={cwndPath} fill="none" stroke="#38bdf8" strokeWidth="2.75" />

                  {/* Data Points */}
                  {pts.map((p, i) => (
                    <g key={p.rttIndex}>
                      <circle
                        cx={toX(i)}
                        cy={toY(p.cwndMss)}
                        r={p.isLossEvent ? 5 : 3.5}
                        fill={p.isLossEvent ? '#f43f5e' : '#38bdf8'}
                      />
                    </g>
                  ))}

                  <text x={padL} y={chartH - 8} className="fill-slate-400 text-[11px] font-mono">
                    Axe X : Temps en RTT (Round-Trip Time) · Axe Y : Taille de fenêtre (MSS = 1460 octets)
                  </text>
                </svg>
              </div>

              {/* Legend & Current Event */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 bg-slate-950/70 px-4 py-3 rounded-lg border border-slate-800">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-400 inline-block" /> cwnd ({tcpEngine.cwndMss} MSS)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block" /> ssthresh ({tcpEngine.ssthreshMss} MSS)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> rwnd ({tcpEngine.rwndMss} MSS)
                  </span>
                </div>
                <div className="font-mono text-slate-400">
                  {pts[pts.length - 1]?.eventDescription}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sliding Window (Fenêtre Glissante) Interactive Strip */}
          {activeTcpTab === 'SLIDING_WINDOW' && (
            <div className="space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">
                    Ruban des Séquences TCP (Fenêtre Effective W = min({tcpEngine.cwndMss}, {tcpEngine.rwndMss}) = {effectiveWindowMss} MSS)
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    Capacité : {Math.round(effectiveWindowMss * 1460).toLocaleString('fr-FR')} octets
                  </span>
                </div>

                {/* Visual Sliding Window Bracket */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {slidingSegments.map(seg => {
                    const styleMap = {
                      ACKED: 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300',
                      IN_FLIGHT: 'bg-sky-950/60 border-sky-500 text-sky-200',
                      USABLE_WINDOW: 'bg-amber-950/40 border-amber-500/60 text-amber-200',
                      BLOCKED_OUTSIDE: 'bg-slate-900 border-slate-800 text-slate-500',
                    };
                    const labelMap = {
                      ACKED: 'ACK reçu',
                      IN_FLIGHT: 'En vol',
                      USABLE_WINDOW: 'Émissible',
                      BLOCKED_OUTSIDE: 'Hors fenêtre',
                    };
                    return (
                      <div
                        key={seg.seqNum}
                        className={`p-2 rounded-lg border text-center font-mono transition-colors ${styleMap[seg.status]}`}
                      >
                        <div className="text-xs font-bold">#{seg.seqNum}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">{labelMap[seg.status]}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Window Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="rwnd-slider" className="text-slate-300 font-medium">
                        Fenêtre Récepteur (rwnd Flow Control)
                      </label>
                      <span className="font-mono text-emerald-400 tabular-nums">{tcpEngine.rwndMss} MSS</span>
                    </div>
                    <input
                      id="rwnd-slider"
                      type="range"
                      min={1}
                      max={32}
                      value={tcpEngine.rwndMss}
                      onChange={e => dispatch({ type: 'SET_TCP_RWND', payload: Number(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="inflight-slider" className="text-slate-300 font-medium">
                        Segments en vol non acquittés (Bytes In Flight)
                      </label>
                      <span className="font-mono text-sky-400 tabular-nums">{tcpEngine.inFlightMss} MSS</span>
                    </div>
                    <input
                      id="inflight-slider"
                      type="range"
                      min={0}
                      max={Math.max(1, Math.round(effectiveWindowMss))}
                      value={Math.min(tcpEngine.inFlightMss, Math.round(effectiveWindowMss))}
                      onChange={e => dispatch({ type: 'SET_TCP_IN_FLIGHT', payload: Number(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 4-Algorithm Side-by-Side Comparator */}
          {activeTcpTab === 'ALGO_COMPARATOR' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Comparaison déterministe sur 18 RTT avec injection d’une perte (3 Dup-ACK) au RTT #8 : observez le maintien supérieur de CUBIC (<code className="text-sky-300">β = 0.7</code>) et BBR face à Reno (<code className="text-amber-300">β = 0.5</code>) et Tahoe (<code className="text-rose-300">retour à 1 MSS</code>).
              </p>
              <div className="overflow-x-auto max-h-64 border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">RTT</th>
                      <th className="py-2 px-3 text-sky-400">CUBIC (RFC 8312)</th>
                      <th className="py-2 px-3 text-amber-400">Reno (AIMD)</th>
                      <th className="py-2 px-3 text-rose-400">Tahoe</th>
                      <th className="py-2 px-3 text-emerald-400">BBR (ProbeBW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
                    {comparisonRows.map(row => (
                      <tr key={row.rtt} className={row.rtt === 8 ? 'bg-rose-950/30 font-semibold' : ''}>
                        <td className="py-1.5 px-3 text-slate-300">
                          RTT #{row.rtt} {row.rtt === 8 ? '(Perte 3 Dup-ACK)' : ''}
                        </td>
                        <td className="py-1.5 px-3 text-sky-300">{row.cubic} MSS</td>
                        <td className="py-1.5 px-3 text-amber-300">{row.reno} MSS</td>
                        <td className="py-1.5 px-3 text-rose-300">{row.tahoe} MSS</td>
                        <td className="py-1.5 px-3 text-emerald-300">{row.bbr} MSS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Fast Retransmit & SACK Inspector */}
          {activeTcpTab === 'FAST_RETRANSMIT_SACK' && (
            <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Étape {currentSack.stepNumber}/5 : {currentSack.title}
                </h3>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => dispatch({ type: 'SET_SACK_STEP', payload: n })}
                      className={`w-7 h-7 rounded text-xs font-mono font-semibold transition-colors ${
                        activeSackStep === n
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-medium">Action Émetteur</div>
                  <div className="text-slate-200">{currentSack.senderAction}</div>
                  <div className="font-mono text-sky-400 pt-1">
                    Segments en vol : [{currentSack.inFlightPackets.map(p => `#${p}`).join(', ')}]
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-medium">Récepteur & Option SACK</div>
                  <div className="text-slate-200">{currentSack.receiverAction}</div>
                  <div className="font-mono text-emerald-400 pt-1">
                    ACK #{currentSack.ackGenerated.ackNum}{' '}
                    {currentSack.ackGenerated.isDup ? `(Dup-ACK #${currentSack.ackGenerated.dupCount})` : '(Cumulatif)'}{' '}
                    {currentSack.ackGenerated.sackBlocks ?? ''}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">
                {currentSack.technicalInsight}
              </p>
            </div>
          )}
        </div>

        {/* Right Zone (4 cols): Control & Mathematical Deck */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Commandes d’Émission & Pertes</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => dispatch({ type: 'SET_TCP_PLAYING', payload: !isTcpPlaying })}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-colors whitespace-nowrap"
              >
                {isTcpPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isTcpPlaying ? 'Pause RTT' : 'Lecture Auto'}
              </button>
              <button
                onClick={() => dispatch({ type: 'STEP_TCP_ACK' })}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap"
              >
                <StepForward className="w-3.5 h-3.5" /> +1 RTT (ACK)
              </button>
              <button
                onClick={handleDupAck}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-700/60 hover:bg-amber-900/50 transition-colors whitespace-nowrap"
              >
                Injecter 3 Dup-ACK
              </button>
              <button
                onClick={handleRto}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-700/60 hover:bg-rose-900/50 transition-colors whitespace-nowrap"
              >
                Timeout RTO
              </button>
            </div>
            <button
              onClick={() => dispatch({ type: 'RESET_TCP_ENGINE' })}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser la courbe TCP
            </button>
          </div>

          {/* Live Telemetry Readout */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Variables d’État Courantes</h3>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Fenêtre Congestion (cwnd)</div>
                <div className="text-base font-bold text-sky-400 mt-0.5">{tcpEngine.cwndMss} MSS</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Seuil (ssthresh)</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">{tcpEngine.ssthreshMss} MSS</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Fenêtre Effective W</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{effectiveWindowMss} MSS</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Dernier Max (W_max)</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{tcpEngine.wMaxMss} MSS</div>
              </div>
            </div>
          </div>

          {/* Mathematical Formula Box */}
          <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">Loi Cubique RFC 8312</div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-sky-300">
              W_cubic(t) = C · (t - K)³ + W_max
            </div>
            <p className="leading-relaxed">
              Avec <code className="text-slate-300">C = 0.4</code>, <code className="text-slate-300">β = 0.7</code> et point d’inflexion <code className="text-slate-300">K = {cubicMath.kFactor} RTT</code>. Contrairement à Reno qui croît linéairement, CUBIC croît rapidement vers <code className="text-slate-300">W_max</code>, stagne en plateau concave pour éviter une nouvelle perte, puis sonde à nouveau la capacité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
