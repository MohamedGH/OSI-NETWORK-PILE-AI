/**
 * IPv4 Fragmentation & Reassembly View (RFC 791 & RFC 1191 PMTUD)
 * Interactive MTU bottleneck splitter, 8-byte offset calculator, and out-of-order reassembly buffer.
 */

import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';

export const IpFragmentationView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const { fragOptions, fragPlan, reassemblyBuffer, isFragAutoPlaying } = state;

  const handleToggleDf = () => {
    const nextDf = !fragOptions.isDfSet;
    dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { isDfSet: nextDf } });
    notify(
      nextDf
        ? 'Drapeau DF=1 (Don’t Fragment) activé : mode Path MTU Discovery (RFC 1191)'
        : 'Drapeau DF=0 : fragmentation IPv4 autorisée sur le routeur',
      'info'
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs text-slate-400">
            <span>Couche 3 Réseau</span>
            <span className="mx-2">·</span>
            <span>RFC 791 Fragmentation IPv4</span>
            <span className="mx-2">·</span>
            <span>RFC 1191 PMTUD (ICMP Type 3 Code 4)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Fragmentation IP par Goulet MTU & Réassemblage Hôte
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ajustez la taille du paquet IP et le MTU du lien goulet pour observer la découpe en multiples de 8 octets (<code className="text-sky-300">Fragment Offset</code>), les drapeaux <code className="text-amber-300">DF / MF</code> et la reconstitution mémoire sur l’hôte cible.
          </p>
        </div>

        {/* Preset MTU Links */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {[
            { label: 'Ethernet (MTU 1500)', mtu: 1500 },
            { label: 'Tunnel GRE/IPsec (MTU 1400)', mtu: 1400 },
            { label: 'RFC 791 Min (MTU 576)', mtu: 576 },
          ].map(p => (
            <button
              key={p.mtu}
              onClick={() => dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { bottleneckMtu: p.mtu } })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                fragOptions.bottleneckMtu === p.mtu
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
        {/* Left Zone (8 cols): Interactive Fragmentation Diagram & Reassembly Buffer */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          {/* Case DF=1 Drop Alert */}
          {fragPlan.isDroppedDueToDf && fragPlan.icmpError ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-700/70 space-y-2">
              <div className="text-sm font-bold text-rose-300">
                ▲ REJET ROUTEUR : Paquet ({fragPlan.originalPacketSize} octets) &gt; MTU ({fragPlan.bottleneckMtu} octets) avec DF = 1
              </div>
              <p className="text-xs text-slate-300">{fragPlan.icmpError.description}</p>
              <div className="text-xs font-mono text-amber-300 pt-1">
                Action PMTUD : L’hôte source réduit son MSS TCP à {fragPlan.icmpError.pmtudSuggestedMtu - 40} octets.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-white">
                  Fragments IPv4 Générés ({fragPlan.totalFragmentsCount} fragments · Payload max par fragment : {fragPlan.maxFragmentDataSize} octets)
                </span>
                <span className="font-mono text-slate-400 tabular-nums">
                  ID Paquet : 0x{fragPlan.identification.toString(16).toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fragPlan.fragments.map(frag => {
                  const isReceived = reassemblyBuffer.receivedFragments.some(
                    rf => rf.fragmentIndex === frag.fragmentIndex
                  );
                  return (
                    <div
                      key={frag.fragmentIndex}
                      className={`p-3.5 rounded-lg border font-mono text-xs space-y-2 transition-colors ${
                        isReceived
                          ? 'bg-emerald-950/30 border-emerald-600/60'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-300">Fragment #{frag.fragmentIndex + 1}</span>
                        <button
                          onClick={() =>
                            dispatch({ type: 'RECEIVE_FRAGMENT_BY_INDEX', payload: frag.fragmentIndex })
                          }
                          disabled={isReceived}
                          className={`px-2.5 py-1 rounded text-[11px] font-sans font-semibold transition-colors ${
                            isReceived
                              ? 'bg-emerald-900/40 text-emerald-300 cursor-default'
                              : 'bg-sky-600 text-white hover:bg-sky-500'
                          }`}
                        >
                          {isReceived ? '● Reçu en RAM' : 'Transmettre vers Hôte B'}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 tabular-nums">
                        <div>
                          <span className="block text-slate-500">Total Len</span>
                          <span className="text-slate-200 font-semibold">{frag.totalLength} B</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Offset (×8B)</span>
                          <span className="text-amber-300 font-semibold">{frag.fragmentOffset}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Drapeau MF</span>
                          <span className="text-emerald-300 font-semibold">{frag.mf ? '1 (Suite)' : '0 (Fin)'}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Octets utiles : [{frag.byteRangeStart}..{frag.byteRangeEnd}] ({frag.payloadLength} B)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host B Reassembly Buffer Visualizer */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                Tampon de Réassemblage de l’Hôte B (Testez l’arrivée hors-ordre en cliquant les fragments dans le désordre)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: 'SET_FRAG_AUTO_PLAY', payload: !isFragAutoPlaying })}
                  disabled={fragPlan.isDroppedDueToDf || reassemblyBuffer.isComplete}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Réassemblage Auto
                </button>
                <button
                  onClick={() => dispatch({ type: 'RESET_REASSEMBLY_BUFFER' })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Vider RAM
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Octets reconstitués : <strong className="text-sky-400">{reassemblyBuffer.receivedPayloadBytes}</strong> / {reassemblyBuffer.expectedTotalPayloadBytes} octets
                </span>
                <span>
                  Trous mémoire restants :{' '}
                  <strong className={reassemblyBuffer.missingByteRanges.length === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {reassemblyBuffer.missingByteRanges.length}
                  </strong>
                </span>
              </div>

              {reassemblyBuffer.missingByteRanges.length > 0 && (
                <div className="text-[11px] text-amber-300">
                  Plages d’octets manquantes :{' '}
                  {reassemblyBuffer.missingByteRanges.map(r => `[${r.start}..${r.end}]`).join(', ')}
                </div>
              )}

              {reassemblyBuffer.isComplete && (
                <div className="p-3 rounded bg-emerald-950/50 border border-emerald-600/60 text-emerald-300 font-sans">
                  ● Datagramme IPv4 intégralement réassemblé sans trou mémoire ! Le paquet complet est remonté à la couche Transport L4.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Zone (4 cols): Sliders & RFC 791 Math */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Paramètres Paquet & MTU</h2>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="pkt-size-slider" className="text-slate-300 font-medium">
                  Taille Totale du Paquet IP
                </label>
                <span className="font-mono text-sky-400 tabular-nums">{fragOptions.packetTotalSize} octets</span>
              </div>
              <input
                id="pkt-size-slider"
                type="range"
                min={400}
                max={6000}
                step={100}
                value={fragOptions.packetTotalSize}
                onChange={e =>
                  dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { packetTotalSize: Number(e.target.value) } })
                }
                className="w-full accent-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="mtu-slider" className="text-slate-300 font-medium">
                  MTU du Lien Goulet (Routeur)
                </label>
                <span className="font-mono text-amber-400 tabular-nums">{fragOptions.bottleneckMtu} octets</span>
              </div>
              <input
                id="mtu-slider"
                type="range"
                min={296}
                max={1500}
                step={8}
                value={fragOptions.bottleneckMtu}
                onChange={e =>
                  dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { bottleneckMtu: Number(e.target.value) } })
                }
                className="w-full accent-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleToggleDf}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold border transition-colors ${
                  fragOptions.isDfSet
                    ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Drapeau DF (Don’t Fragment) : {fragOptions.isDfSet ? '1 (Activé - PMTUD)' : '0 (Désactivé - Découpe permise)'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">Règle d’Alignement sur 8 Octets</div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-sky-300">
              MaxData = ⌊(MTU - 20) / 8⌋ × 8 = {fragPlan.maxFragmentDataSize} B
            </div>
            <p className="leading-relaxed">
              Le champ <code className="text-slate-300">Fragment Offset</code> dans l’en-tête IPv4 ne dispose que de 13 bits pour adresser jusqu’à 65 535 octets. Chaque unité d’offset représente donc un bloc de 8 octets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
