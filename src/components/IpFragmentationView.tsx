/**
 * IP Fragmentation & Reassembly Interactive Visualizer (RFC 791 / RFC 1191)
 * Visualizes MTU bottlenecking, 8-octet offset math, DF/MF flags,
 * out-of-order reassembly buffers, hole tracking, and Path MTU Discovery (PMTUD).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scissors,
  Layers,
  Laptop,
  Server,
  Radio,
  ArrowRight,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles,
  Info,
  ChevronRight,
  Split,
  Eye,
  Shuffle,
  FileText,
  Boxes,
} from 'lucide-react';
import { useNetworkStore, FragTab } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { FRAGMENTATION_PRESET_SCENARIOS } from '../utils/ipFragmentationEngine';
import { InteractiveFragmentationCanvas } from './InteractiveFragmentationCanvas';

export const IpFragmentationView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();

  const { fragOptions, fragPlan, reassemblyBuffer, activeFragTab, isFragAutoPlaying } = state;
  const [inspectedFragIndex, setInspectedFragIndex] = useState<number | null>(0);

  const handlePacketSizeChange = (val: number) => {
    dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { packetTotalSize: val } });
  };

  const handleBottleneckMtuChange = (val: number) => {
    dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { bottleneckMtu: val } });
  };

  const handleDfToggle = () => {
    const nextDf = !fragOptions.isDfSet;
    dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { isDfSet: nextDf } });
    if (nextDf) {
      notify('Drapeau DF (Don’t Fragment) ACTIVÉ : Le routeur rejettera tout paquet supérieur au MTU', 'warning');
    } else {
      notify('Drapeau DF DÉSACTIVÉ : Fragmentation IPv4 autorisée sur les routeurs intermédiaires', 'info');
    }
  };

  const handlePresetSelect = (presetId: string) => {
    dispatch({ type: 'LOAD_FRAG_SCENARIO', payload: presetId });
    notify(`Scénario chargé : ${presetId}`, 'info');
  };

  const handleReceiveNextFrag = () => {
    if (reassemblyBuffer.isComplete) {
      notify('Tous les fragments ont déjà été reçus et assemblés !', 'info');
      return;
    }
    dispatch({ type: 'RECEIVE_NEXT_FRAGMENT' });
    notify('Nouveau fragment inséré dans le tampon du récepteur', 'info');
  };

  const handleReceiveSpecificFrag = (idx: number) => {
    dispatch({ type: 'RECEIVE_FRAGMENT_BY_INDEX', payload: idx });
    notify(`Fragment #${idx} inséré (simulation réception asynchrone)`, 'info');
  };

  const handleResetBuffer = () => {
    dispatch({ type: 'RESET_REASSEMBLY_BUFFER' });
    notify('Tampon de réassemblage de l’hôte B réinitialisé', 'info');
  };

  const handleToggleAutoPlay = () => {
    const next = !isFragAutoPlaying;
    dispatch({ type: 'SET_FRAG_AUTO_PLAY', payload: next });
    notify(next ? 'Réassemblage automatique DÉMARRÉ' : 'Réassemblage automatique EN PAUSE', 'info');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-pink-400" />
              RFC 791 / RFC 1191
            </span>
            <span className="text-xs text-slate-400">Couche Réseau (IPv4)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-1">
            Simulateur de Fragmentation & Réassemblage IP (MTU)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprenez comment un routeur découpe un paquet IP face à un goulet MTU étroit et comment l'hôte distant reconstruit la trame.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => dispatch({ type: 'SET_FRAG_TAB', payload: 'SPLITTER' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeFragTab === 'SPLITTER'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            1. Découpe & Offsets
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_FRAG_TAB', payload: 'REASSEMBLY' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeFragTab === 'REASSEMBLY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            2. Tampon & Trous
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_FRAG_TAB', payload: 'PMTUD' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeFragTab === 'PMTUD'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            3. Drapeau DF & PMTUD
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_FRAG_TAB', payload: 'COMPARISON' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeFragTab === 'COMPARISON'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            4. Synthèse & IPv6
          </button>
        </div>
      </div>

      {/* =========================================================================
          THE MTU BOTTLENECK TOPOLOGY GRAND MAP (HTML5 CANVAS 60 FPS + INTERACTIVE HUD)
         ========================================================================= */}
      <div className="space-y-4">
        <InteractiveFragmentationCanvas />
      </div>

      {/* Preset Scenarios Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">Scénarios Pédagogiques Prédéfinis :</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {FRAGMENTATION_PRESET_SCENARIOS.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => handlePresetSelect(scenario.id)}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition group space-y-1 hover:bg-slate-850"
            >
              <span className="text-[10px] font-bold text-cyan-400 block">{scenario.category}</span>
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                {scenario.title}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">{scenario.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: FRAGMENTATION SLICER & 8-BYTE OFFSET MATH
         ========================================================================= */}
      {activeFragTab === 'SPLITTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Parameters */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-pink-400" />
                Paramètres de la Trame & MTU
              </h3>

              {/* Slider 1: Packet Total Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Taille Paquet Total :</span>
                  <span className="text-cyan-400 font-mono font-bold">{fragOptions.packetTotalSize} Octets</span>
                </div>
                <input
                  type="range"
                  min={576}
                  max={9000}
                  step={64}
                  value={fragOptions.packetTotalSize}
                  onChange={e => handlePacketSizeChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>576B (Min IPv4)</span>
                  <span>1500B (Std)</span>
                  <span>9000B (Jumbo)</span>
                </div>
              </div>

              {/* Slider 2: Bottleneck MTU */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">MTU du Lien Étroit :</span>
                  <span className="text-pink-400 font-mono font-bold">{fragOptions.bottleneckMtu} Octets</span>
                </div>
                <input
                  type="range"
                  min={576}
                  max={1500}
                  step={8}
                  value={fragOptions.bottleneckMtu}
                  onChange={e => handleBottleneckMtuChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>576B (Min)</span>
                  <span>1000B</span>
                  <span>1500B (Std)</span>
                </div>
              </div>

              {/* Toggle DF Flag */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Drapeau DF (Don't Fragment)</span>
                  <span className="text-[10px] text-slate-400">Interdire la découpe intermédiaire</span>
                </div>
                <button
                  onClick={handleDfToggle}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    fragOptions.isDfSet
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {fragOptions.isDfSet ? 'DF = 1 (ACTIF)' : 'DF = 0 (INACTIF)'}
                </button>
              </div>

              {/* Math Callout: The 8-Byte Rule */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Info className="w-4 h-4 text-amber-400" />
                  Règle Impérative RFC 791 (Multiple de 8)
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Le champ <strong>Fragment Offset</strong> ne possède que 13 bits. Pour adresser un paquet de 65 535 octets, l'offset est exprimé en <strong>blocs de 8 octets (64 bits)</strong>.
                </p>
                <div className="p-2 rounded bg-slate-950 border border-amber-500/30 text-[11px] font-mono text-amber-300">
                  Max Payload = ⌊(MTU - 20) / 8⌋ × 8 = ⌊({fragOptions.bottleneckMtu} - 20) / 8⌋ × 8 ={' '}
                  <strong className="text-emerald-400">{fragPlan.maxFragmentDataSize} octets</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Fragments Breakdown & Inspection */}
          <div className="lg:col-span-2 space-y-4">
            {fragPlan.isDroppedDueToDf ? (
              <div className="bg-rose-950/30 border-2 border-rose-500/60 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-rose-300">
                  Paquet Rejeté par le Routeur R1 (DF = 1)
                </h3>
                <p className="text-xs text-rose-200/80 max-w-lg mx-auto">
                  Le paquet mesure {fragOptions.packetTotalSize} octets et dépasse le MTU de {fragOptions.bottleneckMtu} octets. Le drapeau Don't Fragment étant armé, le routeur détruit le paquet et renvoie une alerte ICMP Type 3 Code 4.
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 text-xs font-mono text-left max-w-md mx-auto text-rose-300 space-y-1">
                  <div>Message ICMP : Destination Unreachable</div>
                  <div>Code 4 : Fragmentation Needed & DF set</div>
                  <div>Next-Hop MTU proposé : {fragPlan.icmpError?.nextHopMtu} Octets</div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Split className="w-4 h-4 text-emerald-400" />
                      Fragments Générés ({fragPlan.fragments.length} fragments)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Chaque fragment transporte son propre en-tête IPv4 (20 octets) et un morceau du flux utile.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-950 border border-emerald-500/30 text-emerald-300 font-semibold">
                    Efficacité : {fragPlan.efficiencyPercentage.toFixed(1)}%
                  </span>
                </div>

                {/* Fragments Visual List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fragPlan.fragments.map((frag, idx) => {
                    const isSelected = inspectedFragIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setInspectedFragIndex(idx)}
                        className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                          isSelected
                            ? 'bg-slate-950 border-pink-500 shadow-md shadow-pink-500/20'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center justify-center text-[11px] font-bold">
                              #{frag.fragmentIndex + 1}
                            </span>
                            Fragment {frag.fragmentIndex + 1} / {frag.totalFragments}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              frag.mf
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {frag.mf ? 'MF = 1 (Suivant)' : 'MF = 0 (Dernier)'}
                          </span>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Taille Totale :</span>
                            <span className="text-cyan-300 font-bold">{frag.totalLength} Octets</span>
                            <span className="text-slate-400 text-[10px] block">(20B IP + {frag.payloadLength}B Data)</span>
                          </div>

                          <div className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Fragment Offset :</span>
                            <span className="text-amber-300 font-bold">{frag.fragmentOffset}</span>
                            <span className="text-slate-400 text-[10px] block">({frag.byteRangeStart} / 8)</span>
                          </div>
                        </div>

                        {/* Byte Range Bar */}
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
                          <span>Plage Octets :</span>
                          <span className="text-emerald-400 font-bold">
                            [{frag.byteRangeStart} .. {frag.byteRangeEnd}]
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Header Inspector for selected fragment */}
                {inspectedFragIndex !== null && fragPlan.fragments[inspectedFragIndex] && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-pink-400" />
                        Champs En-tête IPv4 du Fragment #{inspectedFragIndex + 1}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">RFC 791 Header Inspector</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Identification (16b):</span>
                        <span className="text-cyan-300 font-bold">0x{fragPlan.identification.toString(16).toUpperCase()}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Flags (3b):</span>
                        <span className="text-amber-300 font-bold">DF=0, MF={fragPlan.fragments[inspectedFragIndex].mf ? 1 : 0}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Offset (13b):</span>
                        <span className="text-pink-300 font-bold">{fragPlan.fragments[inspectedFragIndex].fragmentOffset} (×8={fragPlan.fragments[inspectedFragIndex].byteRangeStart}B)</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">TTL / Protocole:</span>
                        <span className="text-emerald-300 font-bold">{fragPlan.fragments[inspectedFragIndex].ttl} / TCP (6)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DESTINATION REASSEMBLY BUFFER & HOLE MATRIX
         ========================================================================= */}
      {activeFragTab === 'REASSEMBLY' && (
        <div className="space-y-6">
          {/* Reassembly Grand Buffer Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5" />
                    Tampon Mémoire de l'Hôte B
                  </span>
                  <span className="text-xs text-slate-400">Reconstitution Octet par Octet</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-1">
                  Matrice de Réassemblage & Suivi des Trous (Holes)
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReceiveNextFrag}
                  disabled={reassemblyBuffer.isComplete || fragPlan.fragments.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Recevoir Fragment Suivant
                </button>

                <button
                  onClick={handleToggleAutoPlay}
                  disabled={fragPlan.fragments.length === 0}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    isFragAutoPlaying
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {isFragAutoPlaying ? 'Auto: ACTIF' : 'Auto: PAUSE'}
                </button>

                <button
                  onClick={handleResetBuffer}
                  className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Réinitialiser le tampon récepteur"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reassembly Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Progression du Tampon :{' '}
                  <strong className="text-emerald-400">
                    {reassemblyBuffer.receivedPayloadBytes} / {reassemblyBuffer.expectedTotalPayloadBytes} Octets
                  </strong>
                </span>
                <span className="text-slate-400">
                  Minuteur RFC 791 :{' '}
                  <strong
                    className={`font-bold ${
                      reassemblyBuffer.timerSecondsRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                    }`}
                  >
                    {reassemblyBuffer.timerSecondsRemaining}s
                  </strong>
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (reassemblyBuffer.receivedPayloadBytes / (reassemblyBuffer.expectedTotalPayloadBytes || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Fragment Reception Matrix (Interactive Click-to-Deliver) */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Fragments Disponibles en Transit (Cliquez pour injecter dans n'importe quel ordre) :</span>
                <span className="text-[11px] text-slate-500 font-mono">Simule le routage asynchrone / ECMP</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {fragPlan.fragments.map((frag, idx) => {
                  const isReceived = reassemblyBuffer.receivedFragments.some(
                    rf => rf.fragmentIndex === frag.fragmentIndex
                  );

                  return (
                    <button
                      key={idx}
                      onClick={() => handleReceiveSpecificFrag(frag.fragmentIndex)}
                      disabled={isReceived}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 ${
                        isReceived
                          ? 'bg-emerald-950/30 border-emerald-500/50 opacity-60 cursor-default'
                          : 'bg-slate-950 border-slate-800 hover:border-pink-500 active:scale-95 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Frag #{frag.fragmentIndex + 1}</span>
                        {isReceived ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Shuffle className="w-3.5 h-3.5 text-pink-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        [{frag.byteRangeStart}..{frag.byteRangeEnd}]
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-center ${
                          isReceived ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {isReceived ? 'EN MÉMOIRE' : 'EN TRANSIT'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Holes / Missing Byte Ranges Visualizer */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  État des Trous Mémoire (Missing Byte Intervals)
                </span>
                <span className="text-[10px] font-mono text-slate-400">Algorithme RFC 791 Reassembly</span>
              </div>

              {reassemblyBuffer.missingByteRanges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {reassemblyBuffer.missingByteRanges.map((hole, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 font-mono text-xs flex items-center gap-1.5 animate-pulse"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Trou #{i + 1} : Octets [{hole.start} .. {hole.end}] ({hole.end - hole.start + 1}B manquants)
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Aucun trou ! Tous les octets [0 .. {reassemblyBuffer.expectedTotalPayloadBytes - 1}] ont été comblés avec succès.
                </div>
              )}
            </div>

            {/* Reassembled Payload Box */}
            {reassemblyBuffer.isComplete && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Charge Utile Reconstituée (Livrée à la Couche Transport L4)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">100% INTÈGRE</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 text-xs font-mono text-emerald-200 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {reassemblyBuffer.reassembledPayload}
                </div>
              </div>
            )}

            {/* Live Terminal Event Log */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400">Journal d'Événements du Réassembleur :</span>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1 max-h-36 overflow-y-auto">
                {reassemblyBuffer.logMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-600 select-none">&gt;</span>
                    <span
                      className={
                        msg.includes('COMPLETE')
                          ? 'text-emerald-400 font-bold'
                          : msg.includes('ARRIVED')
                          ? 'text-cyan-300'
                          : msg.includes('TIMEOUT')
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-400'
                      }
                    >
                      {msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PATH MTU DISCOVERY (PMTUD) & DF BIT
         ========================================================================= */}
      {activeFragTab === 'PMTUD' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 w-fit">
              <ShieldAlert className="w-3.5 h-3.5" />
              RFC 1191 Path MTU Discovery (PMTUD)
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-2">
              Pourquoi l'Internet Moderne Évite la Fragmentation Routeur ?
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              La fragmentation par les routeurs est coûteuse en CPU et fragile : si un seul fragment est perdu, le paquet entier doit être réémis par TCP. PMTUD permet de découvrir le plus petit MTU du chemin de bout en bout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mechanism Explanation */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Le Cycle de Découverte PMTUD :
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-cyan-300">
                    <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Émission avec DF = 1
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    L'hôte source envoie tous ses paquets TCP/IP avec le drapeau <code>DF=1</code> (Don't Fragment) à la taille de son MTU local (ex. 1500B).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-pink-300">
                    <span className="w-5 h-5 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Rejet par le Routeur Étroit & ICMP 3/4
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Le routeur dont l'interface de sortie a un MTU plus faible (ex. 1400B) détruit le paquet et renvoie <strong>ICMP Type 3 Code 4</strong> contenant le MTU du saut suivant.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Ajustement Automatique du MSS TCP
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    L'hôte source réduit son MSS à <code>1400 - 40 = 1360B</code>. Plus aucune fragmentation intermédiaire n'est nécessaire !
                  </p>
                </div>
              </div>
            </div>

            {/* Black Hole Router Hazard */}
            <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Le Piège du "Black Hole Router" (Trou Noir PMTUD)
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Si un pare-feu mal configuré sur le chemin <strong>bloque les paquets ICMP</strong>, le message d'erreur ICMP Type 3 Code 4 n'arrive jamais à l'émetteur.
              </p>
              <div className="p-3 rounded bg-slate-950 border border-rose-500/30 text-[11px] font-mono text-rose-300 space-y-1">
                <div>Conséquence : La connexion TCP gèle indéfiniment lors du transfert de gros paquets (TLS Handshake ou requêtes HTTP POST).</div>
                <div className="text-amber-300 mt-1">Solution moderne : PLPMTUD (RFC 4821 - Packetization Layer PMTUD sans dépendre d'ICMP).</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SYNTHESIS & IPV4 VS IPV6 COMPARISON
         ========================================================================= */}
      {activeFragTab === 'COMPARISON' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 w-fit">
              <Info className="w-3.5 h-3.5" />
              Comparatif d'Architecture Réseau
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-2">
              Fragmentation IPv4 vs IPv6 vs Segmentation TCP
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* Card 1: IPv4 Fragmentation */}
            <div className="p-4 rounded-xl bg-slate-950 border border-pink-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-300 text-sm">IPv4 (RFC 791)</span>
                <span className="text-[10px] font-mono bg-pink-950 px-2 py-0.5 rounded text-pink-200">
                  Routeurs + Hôtes
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                <li>Champs intégrés dans l'en-tête standard (20B).</li>
                <li>Les routeurs intermédiaires <strong>ont le droit</strong> de découper les paquets si DF=0.</li>
                <li>MTU minimale garantie : <strong>576 octets</strong>.</li>
                <li>Calcul d'offsets sur multiples de 8 octets.</li>
              </ul>
            </div>

            {/* Card 2: IPv6 Fragmentation */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 text-sm">IPv6 (RFC 8200)</span>
                <span className="text-[10px] font-mono bg-cyan-950 px-2 py-0.5 rounded text-cyan-200">
                  Hôtes Uniquement
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                <li>En-tête fixe simplifié (40B) sans champs de fragmentation.</li>
                <li>Les routeurs <strong>ne fragmentent JAMAIS</strong> (rejet ICMPv6 Packet Too Big).</li>
                <li>MTU minimale garantie : <strong>1280 octets</strong>.</li>
                <li>Utilise un en-tête d'extension optionnel (Fragment Header).</li>
              </ul>
            </div>

            {/* Card 3: TCP Segmentation */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 text-sm">Segmentation TCP (L4)</span>
                <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded text-emerald-200">
                  Couche Transport
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                <li>Découpe le flux d'octets <strong>avant</strong> encapsulation IP en paquets de taille MSS.</li>
                <li>Évite totalement la fragmentation IP L3.</li>
                <li>Chaque segment TCP possède son propre numéro de séquence et accusé de réception (ACK).</li>
                <li>Beaucoup plus performant et résilient aux pertes.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
