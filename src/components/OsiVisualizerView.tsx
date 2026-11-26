/**
 * OSI Model (Layers 7 to 1) Encapsulation & Goodput / BDP Calculator View
 */

import React from 'react';
import { useNetworkStore } from '../store/stateManager';
import { OSI_LAYERS } from '../utils/packetPipeline';
import { OsiLayerNumber } from '../types/network';

export const OsiVisualizerView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { inspectedOsiLayer, encapsulatedPacket, bandwidthParams, bandwidthResult } = state;

  const activeLayerInfo = OSI_LAYERS.find(l => l.layer === inspectedOsiLayer) || OSI_LAYERS[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="text-xs text-slate-400">
          <span>Architecture ISO/IEC 7498-1</span>
          <span className="mx-2">·</span>
          <span>Encapsulation PDU</span>
          <span className="mx-2">·</span>
          <span>Débit Nominal vs Goodput</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Encapsulation OSI (L7–L1) & Calculateur de Rendement Goodput
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          Inspectez l’ajout progressif des en-têtes (TCP, IPv4, Ethernet + FCS CRC32) et évaluez le rendement utile (<code className="text-sky-300">Goodput</code>) ainsi que le produit délai-bande passante (<code className="text-emerald-300">BDP</code>).
        </p>
      </div>

      {/* Two-Zone Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: OSI 7-Layer Stack */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-base font-semibold text-white">Pile des 7 Couches OSI (Cliquez sur une couche)</h2>
          <div className="space-y-2">
            {OSI_LAYERS.map(item => {
              const isSelected = item.layer === inspectedOsiLayer;
              return (
                <button
                  key={item.layer}
                  onClick={() => dispatch({ type: 'SET_INSPECTED_LAYER', payload: item.layer as OsiLayerNumber })}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-500 text-white'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-sky-400 w-7">L{item.layer}</span>
                    <div>
                      <div className="text-sm font-semibold">{item.nameFr}</div>
                      <div className="text-xs text-slate-400">{item.descriptionFr}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400 shrink-0">
                    <div>PDU : {item.pduName}</div>
                    {item.headerSizeTypicalBytes > 0 && (
                      <div className="text-[11px] text-amber-400">+{item.headerSizeTypicalBytes} octets</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Layer Encapsulation Header Inspector */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono tabular-nums">
            <div className="text-slate-300 font-sans font-semibold">
              En-têtes encapsulés à la couche L{activeLayerInfo.layer} ({activeLayerInfo.nameFr})
            </div>
            <div>
              L7 Charge Utile : &quot;{encapsulatedPacket.appData.payloadText}&quot; ({encapsulatedPacket.appData.payloadBytes} octets)
            </div>
            {inspectedOsiLayer <= 4 && (
              <div className="text-amber-300">
                L4 TCP : SrcPort={encapsulatedPacket.transportHeader.sourcePort} → DstPort={encapsulatedPacket.transportHeader.destinationPort} · Win={encapsulatedPacket.transportHeader.windowSize}
              </div>
            )}
            {inspectedOsiLayer <= 3 && (
              <div className="text-emerald-300">
                L3 IPv4 : Src={encapsulatedPacket.networkHeader.sourceIp} → Dst={encapsulatedPacket.networkHeader.destinationIp} · TTL={encapsulatedPacket.networkHeader.ttl} · Checksum={encapsulatedPacket.networkHeader.checksumHex}
              </div>
            )}
            {inspectedOsiLayer <= 2 && (
              <div className="text-sky-300">
                L2 Ethernet : SrcMAC={encapsulatedPacket.dataLinkHeader.sourceMac} · FCS CRC32={encapsulatedPacket.dataLinkHeader.fcsCrc32Hex}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Bandwidth, Goodput & BDP Calculator */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          <h2 className="text-base font-semibold text-white">Calculateur Débit Nominal vs Goodput</h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="bw-nominal" className="text-slate-300 font-medium">
                  Débit Nominal du Lien (L1)
                </label>
                <span className="font-mono text-sky-400 tabular-nums">{bandwidthParams.nominalBitrateMbps} Mbps</span>
              </div>
              <input
                id="bw-nominal"
                type="range"
                min={100}
                max={10000}
                step={100}
                value={bandwidthParams.nominalBitrateMbps}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_BANDWIDTH_PARAMS',
                    payload: { nominalBitrateMbps: Number(e.target.value) },
                  })
                }
                className="w-full accent-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="bw-payload" className="text-slate-300 font-medium">
                  Charge Utile Applicative (MSS L7)
                </label>
                <span className="font-mono text-emerald-400 tabular-nums">{bandwidthParams.payloadSizeBytes} octets</span>
              </div>
              <input
                id="bw-payload"
                type="range"
                min={64}
                max={1460}
                step={12}
                value={bandwidthParams.payloadSizeBytes}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_BANDWIDTH_PARAMS',
                    payload: { payloadSizeBytes: Number(e.target.value) },
                  })
                }
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="bw-rtt" className="text-slate-300 font-medium">
                  Temps d’Aller-Retour (RTT)
                </label>
                <span className="font-mono text-amber-400 tabular-nums">{bandwidthParams.rttMs} ms</span>
              </div>
              <input
                id="bw-rtt"
                type="range"
                min={1}
                max={200}
                value={bandwidthParams.rttMs}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_BANDWIDTH_PARAMS',
                    payload: { rttMs: Number(e.target.value) },
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[11px]">Taille Trame sur Fil</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{bandwidthResult.onWireFrameTotalBytes} octets</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[11px]">Efficacité Utile L7</div>
              <div className="text-sm font-bold text-sky-400 mt-0.5">{bandwidthResult.l4PayloadEfficiencyPercent}%</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[11px]">Débit Utile (Goodput)</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{bandwidthResult.goodputMbps} Mbps</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[11px]">Produit BDP (C × RTT)</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {(bandwidthResult.bdpBytes / 1024).toFixed(0)} Ko
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
