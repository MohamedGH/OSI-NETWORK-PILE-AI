/**
 * Network Journey View: Interactive Simulation of Packet Transit across L2 Switches and L3 Routers
 */

import React from 'react';
import {
  Network,
  Laptop,
  Server,
  Shuffle,
  Route,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { generateNetworkHops, NETWORK_DEVICES } from '../utils/networkTopology';

export const NetworkJourneyView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();

  const hops = generateNetworkHops();
  const currentHop = hops[state.activeJourneyStep - 1] || hops[0];

  const handleStepSelect = (step: number) => {
    dispatch({ type: 'SET_JOURNEY_STEP', payload: step });
  };

  const togglePlay = () => {
    const nextPlay = !state.isJourneyPlaying;
    dispatch({ type: 'SET_JOURNEY_PLAYING', payload: nextPlay });
    if (nextPlay) {
      notify('Lecture automatique du parcours réseau démarrée', 'info');
    }
  };

  const handleNext = () => {
    dispatch({ type: 'NEXT_JOURNEY_STEP' });
  };

  const handlePrev = () => {
    dispatch({ type: 'PREV_JOURNEY_STEP' });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_JOURNEY' });
    notify('Simulation réinitialisée au départ (PC Client A)', 'info');
  };

  // Device card helper
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'HOST':
        return <Laptop className="w-6 h-6 text-pink-400" />;
      case 'SWITCH':
        return <Shuffle className="w-6 h-6 text-emerald-400" />;
      case 'ROUTER':
        return <Route className="w-6 h-6 text-cyan-400" />;
      case 'SERVER':
        return <Server className="w-6 h-6 text-purple-400" />;
      default:
        return <Network className="w-6 h-6 text-blue-400" />;
    }
  };

  const deviceList = [
    NETWORK_DEVICES.pc1,
    NETWORK_DEVICES.sw1,
    NETWORK_DEVICES.r1,
    NETWORK_DEVICES.sw2,
    NETWORK_DEVICES.server1,
  ];

  return (
    <div id="network-journey-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Network className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Traversée Réseau : Commutateurs L2 vs Routeurs L3
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Observez comment les adresses MAC sont réécrites à chaque saut de routeur (L3), tandis que le commutateur (L2) transmet la trame sans modifier aucun en-tête ni décrémenter le TTL.
            </p>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2">
            <button
              id="journey-prev-btn"
              onClick={handlePrev}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
              title="Étape précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              id="journey-play-btn"
              onClick={togglePlay}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                state.isJourneyPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {state.isJourneyPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Lancer Animation</span>
                </>
              )}
            </button>

            <button
              id="journey-next-btn"
              onClick={handleNext}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
              title="Étape suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              id="journey-reset-btn"
              onClick={handleReset}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition"
              title="Recommencer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Topology Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Topologie Réseau Active (Étape {state.activeJourneyStep} / 5)
          </span>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
            {currentHop.actionType}
          </span>
        </div>

        {/* Device Row */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative py-2">
          {deviceList.map((dev, idx) => {
            const stepNumber = idx + 1;
            const isProcessing = currentHop.deviceProcessingId === dev.id;
            const isPast = state.activeJourneyStep > stepNumber;

            return (
              <div
                key={dev.id}
                id={`topology-node-${dev.id}`}
                onClick={() => handleStepSelect(stepNumber)}
                className={`cursor-pointer rounded-xl p-3.5 border transition-all text-center relative flex flex-col items-center justify-between min-h-[140px] ${
                  isProcessing
                    ? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/20 scale-[1.03]'
                    : isPast
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400 opacity-90'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Step badge */}
                <span
                  className={`absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isProcessing
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  #{stepNumber}
                </span>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 mt-2">
                  {getDeviceIcon(dev.type)}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-white truncate max-w-[120px]">{dev.name}</h4>
                  <p className="text-[10px] text-cyan-400 font-mono font-semibold mt-0.5">
                    Niveau OSI : L{dev.osiLayerMax}
                  </p>
                  {dev.ipAddress && (
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{dev.ipAddress}</p>
                  )}
                </div>

                {isProcessing && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute top-2 right-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Progression Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
          <span>PC1 (Client)</span>
          <span className="text-cyan-400">&rarr; LAN 1 (Switch) &rarr; Routeur Core &rarr; LAN 2 (Switch) &rarr;</span>
          <span>Serveur HTTP (198.51.100.25)</span>
        </div>
      </div>

      {/* Deep Hop Analysis: Before vs After Header Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Headers Mutation Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Mutation des En-têtes à cette étape ({currentHop.descriptionFr})
              </h3>
            </div>

            {/* Header Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-left">
                    <th className="py-2 px-2">Champ d'En-tête</th>
                    <th className="py-2 px-2 text-rose-300">À l'Entrée du Périphérique</th>
                    <th className="py-2 px-2 text-emerald-300">À la Sortie du Périphérique</th>
                    <th className="py-2 px-2 text-slate-400">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="py-2.5 px-2 font-bold text-slate-200">MAC Source (L2)</td>
                    <td className="py-2.5 px-2 text-slate-300">{currentHop.beforeHeaders.srcMac}</td>
                    <td className="py-2.5 px-2 text-emerald-400 font-bold">{currentHop.afterHeaders.srcMac}</td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400">
                      {currentHop.beforeHeaders.srcMac === currentHop.afterHeaders.srcMac
                        ? 'Inchangée (L2)'
                        : 'Réécrite par le Routeur L3'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 font-bold text-slate-200">MAC Dest (L2)</td>
                    <td className="py-2.5 px-2 text-slate-300">{currentHop.beforeHeaders.dstMac}</td>
                    <td className="py-2.5 px-2 text-emerald-400 font-bold">{currentHop.afterHeaders.dstMac}</td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400">
                      {currentHop.beforeHeaders.dstMac === currentHop.afterHeaders.dstMac
                        ? 'Inchangée (L2)'
                        : 'Résolue vers Prochain Saut'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 font-bold text-slate-200">IP Source (L3)</td>
                    <td className="py-2.5 px-2 text-cyan-300">{currentHop.beforeHeaders.srcIp}</td>
                    <td className="py-2.5 px-2 text-cyan-300">{currentHop.afterHeaders.srcIp}</td>
                    <td className="py-2.5 px-2 text-[11px] text-cyan-400/80">Intacte de bout en bout</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 font-bold text-slate-200">IP Destination (L3)</td>
                    <td className="py-2.5 px-2 text-cyan-300">{currentHop.beforeHeaders.dstIp}</td>
                    <td className="py-2.5 px-2 text-cyan-300">{currentHop.afterHeaders.dstIp}</td>
                    <td className="py-2.5 px-2 text-[11px] text-cyan-400/80">Intacte de bout en bout</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 font-bold text-slate-200">TTL (Time to Live)</td>
                    <td className="py-2.5 px-2 text-amber-300">{currentHop.beforeHeaders.ttl}</td>
                    <td className="py-2.5 px-2 text-amber-400 font-bold">{currentHop.afterHeaders.ttl}</td>
                    <td className="py-2.5 px-2 text-[11px] text-amber-400/80">
                      {currentHop.beforeHeaders.ttl === currentHop.afterHeaders.ttl
                        ? 'Inchangé (Switch L2)'
                        : 'Décrémenté de 1 (Routeur L3)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 font-bold text-slate-200">Trailer FCS (CRC32)</td>
                    <td className="py-2.5 px-2 text-slate-400">{currentHop.beforeHeaders.crc32}</td>
                    <td className="py-2.5 px-2 text-emerald-400 font-bold">{currentHop.afterHeaders.crc32}</td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400">
                      {currentHop.beforeHeaders.crc32 === currentHop.afterHeaders.crc32
                        ? 'Identique'
                        : 'Recalculé sur nouvelle trame'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pedagogical Explanation Bullet Points */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Détails du traitement interne :
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {currentHop.explanationFr.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Hardware Tables (CAM Table for Switch & Routing Table for Router) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Switch CAM Table Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-emerald-400" />
                Table CAM / Table MAC (Switch SW1)
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono">Couche 2</span>
            </div>
            <p className="text-xs text-slate-400">
              Le switch associe chaque adresse MAC apprise au port physique correspondant.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
              <div className="grid grid-cols-2 text-slate-400 border-b border-slate-800 pb-1 font-bold">
                <span>Adresse MAC</span>
                <span>Port Physique</span>
              </div>
              <div className="grid grid-cols-2 text-slate-200">
                <span>00:1A:2B:3C:4D:5E</span>
                <span className="text-cyan-400">Fa0/1 (PC1)</span>
              </div>
              <div className="grid grid-cols-2 text-slate-200">
                <span>AA:BB:CC:11:22:33</span>
                <span className="text-emerald-400">Gi0/1 (Routeur R1)</span>
              </div>
            </div>
          </div>

          {/* Router Routing Table Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Route className="w-4 h-4 text-cyan-400" />
                Table de Routage (Routeur R1)
              </h4>
              <span className="text-[10px] text-cyan-400 font-mono">Couche 3 (FIB)</span>
            </div>
            <p className="text-xs text-slate-400">
              Le routeur détermine l'interface de sortie et le prochain saut (Next Hop) selon l'IP destination.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2">
              <div className="grid grid-cols-3 text-slate-400 border-b border-slate-800 pb-1 font-bold">
                <span>Réseau Dest</span>
                <span>Prochain Saut</span>
                <span>Interface</span>
              </div>
              <div className="grid grid-cols-3 text-slate-200">
                <span>192.168.1.0/24</span>
                <span className="text-slate-400">Direct</span>
                <span className="text-cyan-300">eth0</span>
              </div>
              <div className="grid grid-cols-3 text-emerald-300 font-bold bg-emerald-950/30 p-1 rounded">
                <span>198.51.100.0/24</span>
                <span className="text-slate-300">Direct</span>
                <span className="text-emerald-300">eth1 (Serveur)</span>
              </div>
              <div className="grid grid-cols-3 text-slate-200">
                <span>0.0.0.0/0 (Default)</span>
                <span className="text-amber-400">203.0.113.1</span>
                <span className="text-slate-300">wan0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
