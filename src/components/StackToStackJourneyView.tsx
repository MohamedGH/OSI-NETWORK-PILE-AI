/**
 * StackToStackJourneyView Component:
 * Comprehensive visualizer of a packet traveling from Computer A's TCP/IP stack
 * down through physical cables, switches, and routers, and up Computer B's TCP/IP stack.
 */

import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sliders,
  Workflow,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Server,
  Laptop,
  Network,
  Radio,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { generateStackJourneySteps } from '../utils/stackJourneyPipeline';
import { WireTrameSlice, StackToStackStep } from '../types/network';
import { InteractivePacketFlightArena } from './InteractivePacketFlightArena';

export const StackToStackJourneyView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const [showConfig, setShowConfig] = useState(false);
  const [selectedTrameSlice, setSelectedTrameSlice] = useState<WireTrameSlice | null>(null);

  // Generate all 10 steps dynamically based on current packet builder options
  const steps = useMemo(() => generateStackJourneySteps(state.packetOptions), [state.packetOptions]);
  const currentStepIndex = Math.max(0, Math.min(steps.length - 1, state.stackJourneyStep - 1));
  const currentStep: StackToStackStep = steps[currentStepIndex];

  const handleStepSelect = (stepNum: number) => {
    dispatch({ type: 'SET_STACK_JOURNEY_STEP', payload: stepNum });
  };

  const handleTogglePlay = () => {
    const nextPlaying = !state.isStackJourneyPlaying;
    dispatch({ type: 'SET_STACK_JOURNEY_PLAYING', payload: nextPlaying });
    notify(nextPlaying ? 'Lecture automatique démarrée' : 'Animation en pause', 'info');
  };

  const handleNext = () => {
    dispatch({ type: 'NEXT_STACK_JOURNEY_STEP' });
  };

  const handlePrev = () => {
    dispatch({ type: 'PREV_STACK_JOURNEY_STEP' });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_STACK_JOURNEY' });
    notify('Parcours réinitialisé à l’étape 1', 'info');
  };

  const handleSpeedChange = (speed: number) => {
    dispatch({ type: 'SET_STACK_JOURNEY_SPEED', payload: speed });
    notify(`Vitesse réglée à ${speed}x`, 'info');
  };

  const handlePayloadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_PACKET_OPTIONS',
      payload: { payloadText: e.target.value },
    });
  };

  const handlePortChange = (field: 'sourcePort' | 'destinationPort', val: number) => {
    if (isNaN(val) || val < 1 || val > 65535) return;
    dispatch({
      type: 'UPDATE_PACKET_OPTIONS',
      payload: { [field]: val },
    });
  };

  const handleIpChange = (field: 'sourceIp' | 'destinationIp', val: string) => {
    dispatch({
      type: 'UPDATE_PACKET_OPTIONS',
      payload: { [field]: val },
    });
  };

  const getPhaseColor = (phase: StackToStackStep['phase']) => {
    switch (phase) {
      case 'HOST_A_ENCAPSULATION':
        return 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300';
      case 'NETWORK_TRANSIT':
        return 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300';
      case 'HOST_B_DECAPSULATION':
        return 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300';
    }
  };

  const getPhaseBadge = (phase: StackToStackStep['phase']) => {
    switch (phase) {
      case 'HOST_A_ENCAPSULATION':
        return 'Phase 1 : Encapsulation Hôte A (Descente L7 &rarr; L1)';
      case 'NETWORK_TRANSIT':
        return 'Phase 2 : Traversée Réseau (L2 Switch & L3 Routeur)';
      case 'HOST_B_DECAPSULATION':
        return 'Phase 3 : Désencapsulation Hôte B (Montée L1 &rarr; L7)';
    }
  };

  // Stack layers definition
  const hostALayers = [
    { level: 7, label: 'L7 Application', pdu: 'Donnée HTTP', color: 'pink', active: currentStep.activeHostALayer === 7 },
    { level: 4, label: 'L4 Transport', pdu: 'Segment TCP (Port 54321 &rarr; 80)', color: 'blue', active: currentStep.activeHostALayer === 4 },
    { level: 3, label: 'L3 Réseau / IP', pdu: 'Paquet IPv4 (TTL 64)', color: 'cyan', active: currentStep.activeHostALayer === 3 },
    { level: 2, label: 'L2 Liaison MAC', pdu: 'Trame Ethernet II + CRC32', color: 'emerald', active: currentStep.activeHostALayer === 2 },
    { level: 1, label: 'L1 Physique', pdu: 'Train Binaire (Bits / Câble)', color: 'amber', active: currentStep.activeHostALayer === 1 },
  ];

  const hostBLayers = [
    { level: 7, label: 'L7 Application', pdu: 'Processus Web Daemon (HTTP 200 OK)', color: 'pink', active: currentStep.activeHostBLayer === 7 },
    { level: 4, label: 'L4 Transport', pdu: 'Validation Checksum & Socket Port 80', color: 'blue', active: currentStep.activeHostBLayer === 4 },
    { level: 3, label: 'L3 Réseau / IP', pdu: 'Vérification IP Dest & Checksum', color: 'cyan', active: currentStep.activeHostBLayer === 3 },
    { level: 2, label: 'L2 Liaison MAC', pdu: 'Vérification FCS CRC32 & Retrait MAC', color: 'emerald', active: currentStep.activeHostBLayer === 2 },
    { level: 1, label: 'L1 Physique', pdu: 'Échantillonnage Électrique / Optique', color: 'amber', active: currentStep.activeHostBLayer === 1 },
  ];

  return (
    <div id="stack-to-stack-journey-view" className="space-y-6 pb-12">
      {/* View Header & Status Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Workflow className="w-3.5 h-3.5" />
                Pile à Pile TCP/IP
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r border ${getPhaseColor(currentStep.phase)}`}>
                <span dangerouslySetInnerHTML={{ __html: getPhaseBadge(currentStep.phase) }} />
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Étape {currentStep.stepNumber} / 10
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentStep.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              <span dangerouslySetInnerHTML={{ __html: currentStep.subtitle }} />
            </p>
          </div>

          {/* Stepper Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="stack-prev-btn"
              onClick={handlePrev}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition active:scale-95"
              title="Étape précédente"
            >
              <SkipBack className="w-4 h-4" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            <button
              id="stack-play-toggle-btn"
              onClick={handleTogglePlay}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg active:scale-95 ${
                state.isStackJourneyPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
              }`}
            >
              {state.isStackJourneyPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Lecture Auto</span>
                </>
              )}
            </button>

            <button
              id="stack-next-btn"
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition active:scale-95"
              title="Étape suivante"
            >
              <span className="hidden sm:inline">Suivant</span>
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              id="stack-reset-btn"
              onClick={handleReset}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
              title="Réinitialiser le voyage"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-mono">
              {[0.5, 1, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    state.stackJourneySpeed === speed
                      ? 'bg-cyan-500 text-slate-950 font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Config Toggle */}
            <button
              id="stack-config-toggle-btn"
              onClick={() => setShowConfig(!showConfig)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                showConfig
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paramètres</span>
            </button>
          </div>
        </div>

        {/* Interactive 10-Step Timeline Scrubber */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
            {steps.map((s, idx) => {
              const isCurrent = currentStepIndex === idx;
              const isPassed = currentStepIndex > idx;
              return (
                <button
                  key={s.stepNumber}
                  id={`timeline-step-${s.stepNumber}`}
                  onClick={() => handleStepSelect(s.stepNumber)}
                  className={`flex flex-col items-center text-center p-2 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400 scale-[1.02]'
                      : isPassed
                      ? 'bg-slate-950/70 border-emerald-500/40 text-emerald-300 hover:bg-slate-800'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono font-bold mb-1">
                    {isPassed ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        isCurrent ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {s.stepNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-tight line-clamp-1 w-full">
                    {s.stepNumber <= 5 ? `A: ${s.pduName.split(' ')[0]}` : s.stepNumber <= 8 ? `Réseau` : `B: ${s.pduName.split(' ')[0]}`}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono hidden md:block">
                    {s.locationBadge.split('•')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optional Configuration Drawer */}
      {showConfig && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-xl animate-in slide-in-from-top-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Personnaliser les Paramètres du Paquet & Adresses Réseau
            </h3>
            <span className="text-xs text-slate-400">Recalcul automatique instantané</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Message Applicatif (Payload L7)</label>
              <input
                type="text"
                value={state.packetOptions.payloadText}
                onChange={handlePayloadChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="GET /index.html HTTP/1.1"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">IP Source &rarr; IP Destination</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={state.packetOptions.sourceIp}
                  onChange={e => handleIpChange('sourceIp', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                  placeholder="192.168.1.10"
                />
                <input
                  type="text"
                  value={state.packetOptions.destinationIp}
                  onChange={e => handleIpChange('destinationIp', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                  placeholder="198.51.100.25"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Port TCP Src &rarr; Port TCP Dst</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  value={state.packetOptions.sourcePort}
                  onChange={e => handlePortChange('sourcePort', parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={state.packetOptions.destinationPort}
                  onChange={e => handlePortChange('destinationPort', parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">MAC Source Hôte A</label>
              <input
                type="text"
                value={state.packetOptions.sourceMac}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_PACKET_OPTIONS',
                    payload: { sourceMac: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE REAL-TIME PHYSICAL FLIGHT & EQUIPMENT ARENA
         ========================================================================= */}
      <InteractivePacketFlightArena />

      {/* =========================================================================
          THE DUAL-STACK & NETWORK TRANSIT GRAND DIAGRAM
         ========================================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-stretch">
          {/* =========================================
              1. LEFT: HOST A TCP/IP STACK (CLIENT)
             ========================================= */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div>
              {/* Host A Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Ordinateur Source (Client A)
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h2>
                    <p className="text-[11px] font-mono text-cyan-400/90">
                      IP: {state.packetOptions.sourceIp} &bull; Port: {state.packetOptions.sourcePort}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">MAC Interface</span>
                  <span className="text-[10px] font-mono text-slate-300">{state.packetOptions.sourceMac}</span>
                </div>
              </div>

              {/* Host A Stack Layers */}
              <div className="space-y-2">
                {hostALayers.map(layer => {
                  const isActive = layer.active;
                  return (
                    <div
                      key={layer.level}
                      id={`host-a-layer-${layer.level}`}
                      className={`p-3 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400 scale-[1.02]'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {layer.level}
                          </span>
                          <span className={`text-xs font-bold ${isActive ? 'text-cyan-200' : 'text-slate-300'}`}>
                            {layer.label}
                          </span>
                        </div>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                            <ArrowDown className="w-3 h-3" /> Encapsulation
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono mt-1 text-slate-400 pl-8">
                        {layer.pdu}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host A Footer indicator */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Descente dans la pile (L7 &rarr; L1)</span>
              <span className="text-cyan-400 font-mono font-semibold">Émission</span>
            </div>
          </div>

          {/* =========================================
              2. MIDDLE: NETWORK TRANSIT (EQUIPMENT)
             ========================================= */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Traversée Réseau & Câbles</h2>
                    <p className="text-[11px] text-slate-400">Commutateurs L2 & Routeur L3</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  L2 / L3
                </span>
              </div>

              {/* Network Devices Flow */}
              <div className="space-y-3">
                {/* Cable 1 / LAN 1 */}
                <div
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    currentStep.activeTransitNodeId === 'cable-1'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-lg'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      Câble LAN 1 (1000BASE-T)
                    </span>
                    <span className="text-[10px] font-mono">1 Gbps</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Propagation physique du signal binaire</p>
                </div>

                {/* Switch SW1 */}
                <div
                  id="transit-sw1-node"
                  className={`p-3 rounded-xl border transition-all ${
                    currentStep.activeTransitNodeId === 'sw1'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400 shadow-lg scale-[1.02]'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]">
                        L2
                      </span>
                      <span className="font-bold text-xs text-white">Commutateur SW1 (Switch)</span>
                    </div>
                    {currentStep.activeTransitNodeId === 'sw1' && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300">
                        CAM Match
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-7">
                    Lit MAC Dest &rarr; Commute vers Port Gi0/1 (Passerelle). Aucun en-tête IP/TTL modifié.
                  </p>
                </div>

                {/* Router R1 */}
                <div
                  id="transit-r1-node"
                  className={`p-3 rounded-xl border transition-all ${
                    currentStep.activeTransitNodeId === 'r1'
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400 shadow-xl shadow-cyan-500/25 scale-[1.03]'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">
                        L3
                      </span>
                      <span className="font-bold text-xs text-cyan-200">Routeur Passerelle R1</span>
                    </div>
                    {currentStep.activeTransitNodeId === 'r1' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 animate-pulse">
                        Rupture de Trame
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1.5 pl-7 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                      <span>TTL: 64 &rarr; 63</span>
                      <span>Checksum recalculé</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Réécriture MAC : Src = R1 eth1 &bull; Dst = Serveur B &bull; Nouveau CRC32
                    </p>
                  </div>
                </div>

                {/* Switch SW2 */}
                <div
                  id="transit-sw2-node"
                  className={`p-3 rounded-xl border transition-all ${
                    currentStep.activeTransitNodeId === 'sw2'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400 shadow-lg scale-[1.02]'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]">
                        L2
                      </span>
                      <span className="font-bold text-xs text-white">Commutateur SW2 (Switch LAN 2)</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-7">
                    Commute la nouvelle trame directement vers le port du Serveur Web.
                  </p>
                </div>
              </div>
            </div>

            {/* Network In-Flight Trame Badge */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">État de la trame :</span>
              <span className="font-mono font-bold text-amber-300">
                {currentStep.frameSummary.totalBytesOnWire} Octets en vol
              </span>
            </div>
          </div>

          {/* =========================================
              3. RIGHT: HOST B TCP/IP STACK (SERVER)
             ========================================= */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div>
              {/* Host B Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Ordinateur Dest. (Serveur B)
                      {currentStep.activeHostBLayer !== null && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                      )}
                    </h2>
                    <p className="text-[11px] font-mono text-teal-400/90">
                      IP: {state.packetOptions.destinationIp} &bull; Port: {state.packetOptions.destinationPort}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">MAC Interface</span>
                  <span className="text-[10px] font-mono text-slate-300">EE:FF:00:11:22:33</span>
                </div>
              </div>

              {/* Host B Stack Layers (Bottom-to-Top orientation) */}
              <div className="space-y-2">
                {hostBLayers.map(layer => {
                  const isActive = layer.active;
                  return (
                    <div
                      key={layer.level}
                      id={`host-b-layer-${layer.level}`}
                      className={`p-3 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'bg-teal-500/20 border-teal-400 text-white shadow-lg shadow-teal-500/20 ring-1 ring-teal-400 scale-[1.02]'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isActive ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {layer.level}
                          </span>
                          <span className={`text-xs font-bold ${isActive ? 'text-teal-200' : 'text-slate-300'}`}>
                            {layer.label}
                          </span>
                        </div>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 animate-pulse">
                            <ArrowUp className="w-3 h-3" /> Désencapsulation
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono mt-1 text-slate-400 pl-8">
                        {layer.pdu}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host B Footer indicator */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Remontée dans la pile (L1 &rarr; L7)</span>
              <span className="text-teal-400 font-mono font-semibold">Réception & Livraison</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIVE "TRAME EN VOL SUR LE CÂBLE" (WIRE FRAME ANATOMY INSPECTOR)
         ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Anatomie de la Trame en Vol (Visualisation Bit-à-Bit)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cliquez sur un bloc d'en-tête pour inspecter ses octets, son rôle et son état d'intégrité à l'étape {currentStep.stepNumber}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-mono">
              Total : {currentStep.frameSummary.totalBytesOnWire} Octets
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> CRC32 Valide
            </span>
          </div>
        </div>

        {/* Visual Multi-Segment Wire Trame Bar */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
            <span>&larr; Début de Trame (PHY / MAC)</span>
            <span>Fin de Trame (FCS CRC32) &rarr;</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            {currentStep.trameSlices.map(slice => {
              const isSelected = selectedTrameSlice?.id === slice.id;
              return (
                <button
                  key={slice.id}
                  id={`trame-slice-${slice.id}`}
                  onClick={() => setSelectedTrameSlice(slice)}
                  className={`p-3 rounded-xl border text-left transition-all ${slice.colorClass} ${
                    isSelected ? 'ring-2 ring-white scale-[1.02] shadow-xl' : 'hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-950/60">
                      {slice.layerLevel}
                    </span>
                    <span className="text-[10px] font-mono opacity-90">{slice.byteSize} Octets</span>
                  </div>
                  <h4 className="text-xs font-bold leading-tight line-clamp-1">{slice.name}</h4>
                  <p className="text-[10px] font-mono mt-1 opacity-80 truncate">{slice.byteRange}</p>

                  {slice.isAddedAtThisStep && (
                    <span className="inline-block mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                      + Ajouté ici
                    </span>
                  )}
                  {slice.isModifiedAtThisStep && (
                    <span className="inline-block mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/40">
                      ~ Modifié (Routeur)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Trame Slice Deep Dive Card */}
        {selectedTrameSlice && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 animate-in fade-in-50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  {selectedTrameSlice.layerLevel} &bull; {selectedTrameSlice.name}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {selectedTrameSlice.byteRange} ({selectedTrameSlice.byteSize} Octets)
                </span>
              </div>
              <button
                onClick={() => setSelectedTrameSlice(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Fermer
              </button>
            </div>
            <p className="text-xs text-slate-300">{selectedTrameSlice.description}</p>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 break-all">
              <span className="text-slate-500 mr-2">HEX PREVIEW:</span>
              {selectedTrameSlice.hexSample}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          TECHNICAL EXPLANATIONS & KEY ACTIONS FOR THIS EXACT STEP
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Key Actions List */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3>Opérations Réalisées à cette Micro-Étape</h3>
          </div>

          <div className="space-y-2.5">
            {currentStep.keyActions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Deep-Dive Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2.5">
            <Info className="w-4 h-4 text-amber-400" />
            <h3>Zoom Théorique & Normes RFC</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentStep.technicalDeepDive}
          </p>

          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">PDU Active :</span>
              <span className="font-mono font-bold text-cyan-300">{currentStep.pduName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Localisation :</span>
              <span className="font-mono text-slate-300">{currentStep.locationBadge}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">FCS CRC32 en-tête :</span>
              <span className="font-mono text-emerald-400">{currentStep.frameSummary.fcsCrc32Hex}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
