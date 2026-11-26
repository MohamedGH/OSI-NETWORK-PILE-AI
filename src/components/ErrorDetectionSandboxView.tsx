/**
 * Error Detection Sandbox View: IEEE 802.3 Ethernet CRC32, Even/Odd Parity & IPv4 Checksum
 * Interactive bit-flip matrix, byte-by-byte polynomial register trace, and parity verification.
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import {
  calculateCrc32,
  calculateParity,
  verifyParityCodeword,
} from '../utils/errorDetection';
import { ParityType } from '../types/network';

export const ErrorDetectionSandboxView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const { errorInputAscii, errorParityType, errorFlippedBits } = state;

  const cleanCrc = calculateCrc32(errorInputAscii, []);
  const receivedCrc = calculateCrc32(errorInputAscii, errorFlippedBits);

  const firstByteClean = cleanCrc.inputBinary.slice(0, 8) || '01000001';
  const firstByteReceived = receivedCrc.inputBinary.slice(0, 8) || '01000001';
  const parityClean = calculateParity(firstByteClean);
  const parityBitAttached = errorParityType === 'odd' ? parityClean.oddParityBit : parityClean.evenParityBit;
  const receivedCodeword = firstByteReceived + parityBitAttached;
  const isParityPassing = verifyParityCodeword(receivedCodeword, errorParityType);

  const handleToggleBit = (bitIndex: number) => {
    dispatch({ type: 'TOGGLE_FLIPPED_BIT', payload: bitIndex });
    notify(`Bit #${bitIndex} inversé sur le canal physique`, 'warning');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs text-slate-400">
            <span>Couche 2 Liaison de Données</span>
            <span className="mx-2">·</span>
            <span>IEEE 802.3 FCS CRC-32</span>
            <span className="mx-2">·</span>
            <span>Parité Paire / Impaire</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Détection d’Erreurs : CRC32 Ethernet & Bits de Parité
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Cliquez directement sur les bits transmis pour injecter du bruit électromagnétique et comparer la robustesse du contrôle polynomial CRC32 face au bit de parité simple.
          </p>
        </div>

        {/* Preset Payloads */}
        <div className="flex items-center gap-2 self-start">
          {[
            { label: 'Vecteur IEEE "123456789"', val: '123456789' },
            { label: 'Trame "HELLO"', val: 'HELLO' },
            { label: 'Trame "ACK"', val: 'ACK' },
          ].map(p => (
            <button
              key={p.val}
              onClick={() => dispatch({ type: 'SET_ERROR_INPUT', payload: p.val })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                errorInputAscii === p.val
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone (8 cols): Interactive Bit Matrix & CRC32 Register Steps */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          {/* Input & Clear */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label htmlFor="crc-ascii-input" className="block text-xs font-medium text-slate-300 mb-1">
                Charge utile ASCII à protéger (Couche L2)
              </label>
              <input
                id="crc-ascii-input"
                type="text"
                maxLength={24}
                value={errorInputAscii}
                onChange={e => dispatch({ type: 'SET_ERROR_INPUT', payload: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={() => dispatch({ type: 'CLEAR_FLIPPED_BITS' })}
              disabled={errorFlippedBits.length === 0}
              className="self-end px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurer les bits ({errorFlippedBits.length} inversés)
            </button>
          </div>

          {/* Clickable Bit Stream Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Flux Binaire Transmis (Cliquez sur un bit pour l’inverser 0 ↔ 1)
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                {receivedCrc.inputBinary.length} bits ({receivedCrc.byteSteps.length} octets)
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {Array.from(receivedCrc.inputBinary).map((bit, idx) => {
                const isFlipped = errorFlippedBits.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleToggleBit(idx)}
                    title={`Bit #${idx} (Octet ${Math.floor(idx / 8)})`}
                    className={`w-7 h-8 rounded font-mono text-xs font-bold transition-colors ${
                      isFlipped
                        ? 'bg-rose-600 text-white border border-rose-400'
                        : 'bg-slate-900 text-sky-300 border border-slate-800 hover:border-sky-500/60'
                    }`}
                  >
                    {bit}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step-by-Step Polynomial Register Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-200">
              Trace du Registre à Décalage CRC-32 (Polynôme G(x) = {cleanCrc.polynomialHex})
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-60">
              <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Étape</th>
                    <th className="py-2 px-3">Octet Entrant</th>
                    <th className="py-2 px-3">Registre Avant</th>
                    <th className="py-2 px-3">XOR Polynôme</th>
                    <th className="py-2 px-3">Registre Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {receivedCrc.byteSteps.map(st => (
                    <tr key={st.step}>
                      <td className="py-1.5 px-3 text-slate-400">Octet #{st.step}</td>
                      <td className="py-1.5 px-3 text-sky-300">{st.byteHex}</td>
                      <td className="py-1.5 px-3 text-slate-300">{st.crcBeforeHex}</td>
                      <td className="py-1.5 px-3 text-amber-300">{st.polynomialApplied ? 'Oui (0xEDB88320)' : 'Non'}</td>
                      <td className="py-1.5 px-3 text-emerald-300 font-semibold">{st.crcAfterHex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Zone (4 cols): Diagnostic Comparison CRC32 vs Parity */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          {/* FCS CRC32 Verdict */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Verdict FCS CRC-32 (Trame L2)</h2>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs tabular-nums">
              <div>
                <div className="text-slate-500 text-[11px]">FCS Émis (Intègre)</div>
                <div className="text-sm font-bold text-emerald-400">{cleanCrc.crc32Hex}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">FCS Calculé à la Réception</div>
                <div className={`text-sm font-bold ${receivedCrc.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {receivedCrc.crc32Hex}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 text-sans">
                {receivedCrc.isValid ? (
                  <span className="text-emerald-400 font-semibold">
                    ● INTÈGRE : Aucune erreur détectée, la trame est transmise à la couche L3 IP.
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold">
                    ▲ CORROMPUE : Somme FCS discordante ({errorFlippedBits.length} bit(s) altéré(s)). Trame rejetée silencieusement !
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Single Bit Parity Comparison */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Comparaison : Bit de Parité (1er Octet)</h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
                {(['even', 'odd'] as ParityType[]).map(pt => (
                  <button
                    key={pt}
                    onClick={() => dispatch({ type: 'SET_ERROR_PARITY_TYPE', payload: pt })}
                    className={`px-2 py-0.5 rounded font-medium ${
                      errorParityType === pt ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    {pt === 'even' ? 'Paire' : 'Impaire'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Octet 0 + Bit de parité :</span>
                <span className="text-sky-300">
                  {firstByteReceived}·<strong className="text-amber-400">{parityBitAttached}</strong>
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                {isParityPassing ? (
                  <span className="text-emerald-400">
                    ● Parité {errorParityType === 'even' ? 'paire' : 'impaire'} valide (Attention : si vous inversez 2 bits dans le même octet, la parité est trompée alors que CRC32 détecte la faute !)
                  </span>
                ) : (
                  <span className="text-rose-400">
                    ▲ Erreur de parité détectée (nombre impair d’inversions).
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
