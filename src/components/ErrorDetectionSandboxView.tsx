/**
 * Error Detection Sandbox View: Interactive Parity Bit, CRC32, and Error Injection
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Binary,
  Cpu,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wand2,
  Sliders,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import {
  calculateCrc32,
  calculateParity,
  generateCrcToySteps,
  verifyParityStream,
  injectBitFlips,
} from '../utils/errorDetection';
import { stringToBinary, countOnes } from '../utils/functional';
import { ParityType } from '../types/network';

export const ErrorDetectionSandboxView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const [activeTab, setActiveTab] = useState<'crc32' | 'parity' | 'toyDivision'>('crc32');

  const { errorSandboxInput, errorSandboxParityType, errorSandboxFlippedBits } = state;

  // Base computations
  const crcResult = calculateCrc32(errorSandboxInput);
  const rawBinary = stringToBinary(errorSandboxInput || 'A');
  const parityResult = calculateParity(rawBinary);

  // Apply flipped bits simulation
  const noisyBinary = injectBitFlips(rawBinary, errorSandboxFlippedBits);
  const parityCheck = verifyParityStream(
    noisyBinary + (errorSandboxParityType === 'even' ? parityResult.evenParityBit : parityResult.oddParityBit),
    errorSandboxParityType === 'even' ? 'even' : 'odd'
  );

  // Toy CRC division steps for visualization
  const toySteps = generateCrcToySteps(rawBinary.slice(0, 16) || '11010011', '10011');

  const handleToggleBit = (idx: number) => {
    dispatch({ type: 'TOGGLE_FLIPPED_BIT', payload: idx });
  };

  const handleClearFlips = () => {
    dispatch({ type: 'CLEAR_FLIPPED_BITS' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_ERROR_INPUT', payload: e.target.value });
  };

  return (
    <div id="error-detection-sandbox-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Contrôle d'Intégrité : CRC32 & Bit de Parité
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Expérimentez la détection d'erreurs en injectant du bruit (inversion de bits 0&harr;1) et comparez la robustesse du polynôme CRC32 (utilisé par Ethernet) face à la parité simple.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('crc32')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'crc32'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CRC32 Ethernet (IEEE 802.3)
            </button>
            <button
              onClick={() => setActiveTab('parity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'parity'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bit de Parité (Paire / Impaire)
            </button>
            <button
              onClick={() => setActiveTab('toyDivision')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'toyDivision'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Division Polynomiale XOR
            </button>
          </div>
        </div>
      </div>

      {/* Input Text Controller */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-2/3 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Texte d'entrée à encoder & protéger :
          </label>
          <input
            type="text"
            value={errorSandboxInput}
            onChange={handleInputChange}
            placeholder="Tapez un message..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {errorSandboxFlippedBits.length > 0 && (
            <button
              onClick={handleClearFlips}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réinitialiser le Bruit ({errorSandboxFlippedBits.length} bit(s) inversé(s))
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: CRC32 Ethernet deep dive */}
      {activeTab === 'crc32' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: CRC32 Results Card */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-400" />
                  Calculateur CRC32 FCS Ethernet
                </h3>
                <span className="text-[10px] text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  IEEE 802.3
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">Polynôme Générateur Standard (Hex) :</span>
                  <span className="text-white font-bold text-sm">0xEDB88320</span>
                  <span className="text-[10px] text-slate-400 font-sans block">
                    Représente : x³² + x²⁶ + x²³ + x²² + x¹⁶ + x¹² + x¹¹ + x¹⁰ + x⁸ + x⁷ + x⁵ + x⁴ + x² + x + 1
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 space-y-1 bg-gradient-to-r from-rose-950/20 to-slate-950">
                  <span className="text-rose-400 text-[10px] block font-bold">Valeur FCS CRC32 Résultante :</span>
                  <span className="text-2xl font-black text-rose-300 block">{crcResult.crc32Hex}</span>
                  <span className="text-[10px] text-slate-400 block break-all font-mono">
                    Binaire : {crcResult.crc32Binary}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">Octets en Hexadécimal :</span>
                  <span className="text-slate-200 block">{crcResult.inputHex}</span>
                </div>
              </div>
            </div>

            {/* Right: Noise & Error Injection Simulator */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-cyan-400" />
                  Simulateur d'Injection de Bruit (Bit Flipper)
                </h3>
                <span className="text-xs text-slate-400">Cliquez sur un bit pour l'inverser</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Flux binaire de la trame. Les bits colorés en rouge sont inversés par le bruit électromagnétique :
                </p>

                {/* Interactive Bit Stream Matrix */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {noisyBinary.split('').map((bit, idx) => {
                    const isFlipped = errorSandboxFlippedBits.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleBit(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center ${
                          isFlipped
                            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={`Bit #${idx + 1} - Cliquer pour inverser`}
                      >
                        {bit}
                      </button>
                    );
                  })}
                </div>

                {/* Live Diagnostic */}
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    errorSandboxFlippedBits.length === 0
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {errorSandboxFlippedBits.length === 0 ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Trame 100% Intègre (Aucun bit altéré)</p>
                        <p className="text-[11px] text-slate-400">
                          Le FCS calculé à la réception correspond parfaitement au CRC32 transmis.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold font-mono">
                          ERREUR DÉTECTÉE PAR CRC32 ! ({errorSandboxFlippedBits.length} bit(s) corrompu(s))
                        </p>
                        <p className="text-[11px] text-slate-300">
                          Le commutateur ou la carte réseau réceptrice détecte instantanément l'incohérence FCS et <strong>rejette la trame silencieusement (Drop)</strong>.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Parity Bit deep dive */}
      {activeTab === 'parity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Binary className="w-4 h-4 text-amber-400" />
                Calcul du Bit de Parité
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => dispatch({ type: 'SET_ERROR_PARITY_TYPE', payload: 'even' })}
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    errorSandboxParityType === 'even' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Paire (Even)
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_ERROR_PARITY_TYPE', payload: 'odd' })}
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    errorSandboxParityType === 'odd' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Impaire (Odd)
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Nombre de bits à '1' (Poids de Hamming) :</span>
                <span className="font-mono text-white font-bold text-base block">{parityResult.onesCount}</span>
                <span className="text-[11px] text-slate-400">
                  {parityResult.onesCount % 2 === 0 ? 'Le nombre de 1 est PAIR' : 'Le nombre de 1 est IMPAIR'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-semibold">Bit Parité Paire :</span>
                  <span className="font-mono text-amber-400 font-black text-2xl">
                    {parityResult.evenParityBit}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    (Total '1' = {parityResult.onesCount + parseInt(parityResult.evenParityBit)}, pair)
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-semibold">Bit Parité Impaire :</span>
                  <span className="font-mono text-amber-400 font-black text-2xl">
                    {parityResult.oddParityBit}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    (Total '1' = {parityResult.onesCount + parseInt(parityResult.oddParityBit)}, impair)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Démonstration de la Faiblesse de la Parité Simple
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                La parité simple ajoute 1 bit par mot. Elle est capable de détecter tout nombre <strong>impair</strong> d'erreurs (1 bit, 3 bits...).
              </p>
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1">
                <span className="font-bold text-amber-300 block">La faille critique :</span>
                <p className="text-slate-300 text-[11px]">
                  Si un nombre <strong>pair</strong> de bits est inversé (ex: 2 bits simultanés), la parité totale ne change pas et l'erreur passe totalement inaperçue !
                </p>
              </div>

              {/* Status of current injected flips */}
              <div
                className={`p-3 rounded-xl border font-mono ${
                  parityCheck.isValid && errorSandboxFlippedBits.length > 0 && errorSandboxFlippedBits.length % 2 === 0
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : parityCheck.isValid
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}
              >
                {errorSandboxFlippedBits.length === 0 ? (
                  'Aucune erreur injectée.'
                ) : parityCheck.isValid && errorSandboxFlippedBits.length % 2 === 0 ? (
                  `⚠️ DANGER : ${errorSandboxFlippedBits.length} bits inversés mais Parité Validée (Faux Positif) !`
                ) : (
                  `✅ Erreur bien interceptée par le bit de parité (${errorSandboxFlippedBits.length} bit(s)).`
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Toy polynomial division steps */}
      {activeTab === 'toyDivision' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Visualisation Pas à Pas de la Division Modulo 2 (XOR)
            </h3>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              Générateur : 10011 (x⁴ + x + 1)
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Le calcul du CRC s'appuie sur une division polynomiale sans retenue dans le corps de Galois GF(2). L'opération fondamentale est le XOR binaire (0⊕0=0, 1⊕1=0, 1⊕0=1).
          </p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-64 overflow-y-auto font-mono text-xs space-y-1.5">
            {toySteps.steps.map(step => (
              <div
                key={step.step}
                className="flex items-center justify-between py-1 px-2 border-b border-slate-900 hover:bg-slate-900/60 rounded"
              >
                <span className="text-slate-400">Étape #{step.step} :</span>
                <span className="text-slate-200">Reste courant: {step.remainderBinary}</span>
                <span className={step.xorApplied ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                  {step.xorApplied ? 'XOR 10011 appliqué (bit=1)' : 'Décalage (bit=0)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
