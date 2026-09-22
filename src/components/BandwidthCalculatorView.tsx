/**
 * Bandwidth, Goodput & Unit Converter View
 * Explains and calculates Nominal Bitrate, Real Throughput, Goodput, and Protocol Overheads.
 */

import React from 'react';
import {
  Gauge,
  Zap,
  HardDrive,
  Clock,
  ArrowRightLeft,
  Sliders,
  TrendingDown,
  Info,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { convertBitrateUnits } from '../utils/networkCalculations';
import { formatDurationFr, formatBytesFr } from '../utils/functional';
import { TransportProtocol } from '../types/network';

export const BandwidthCalculatorView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { bandwidthParams, bandwidthResult } = state;

  const handleUpdate = (updates: Partial<typeof bandwidthParams>) => {
    dispatch({ type: 'UPDATE_BANDWIDTH_PARAMS', payload: updates });
  };

  const unitRows = convertBitrateUnits(bandwidthResult.nominalBitrateBps);

  return (
    <div id="bandwidth-calculator-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Gauge className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Débit Nominal, Débit Réel & Débit Utile (Goodput)
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Comprenez pourquoi une connexion 1 Gbps ne télécharge jamais à 125 Mo/s : impact des en-têtes Ethernet (38B), IP (20B), TCP (20B), de la taille MTU, du RTT et de la détection d'erreurs.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Préconfigurations :</span>
            {[
              { label: 'ADSL 20M', speed: 20, mtu: 1500, payload: 1460 },
              { label: 'Fast Ethernet 100M', speed: 100, mtu: 1500, payload: 1460 },
              { label: 'Gigabit 1G', speed: 1000, mtu: 1500, payload: 1460 },
              { label: 'Fibre 2.5G', speed: 2500, mtu: 1500, payload: 1460 },
              { label: '10G Jumbo Frames', speed: 10000, mtu: 9000, payload: 8960 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() =>
                  handleUpdate({
                    nominalBitrateMbps: preset.speed,
                    mtuBytes: preset.mtu,
                    payloadSizeBytes: preset.payload,
                    enableJumboFrames: preset.mtu === 9000,
                  })
                }
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards: The 3 Core Network Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Débit Nominal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Débit Nominal</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {bandwidthParams.nominalBitrateMbps} Mbps
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Capacité physique théorique brute souscrite (vitesse du support physique).
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
            = {(bandwidthParams.nominalBitrateMbps / 8).toFixed(1)} Mo/s (théorique max)
          </div>
        </div>

        {/* 2. Débit Réel (Wire Throughput) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Débit Réel</span>
            <TrendingDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              {bandwidthResult.realThroughputMbps} Mbps
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Bande passante physique effective (tenant compte des pertes & BDP).
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
            Perte de paquets : {bandwidthParams.packetLossRatePercent}%
          </div>
        </div>

        {/* 3. Débit Utile (Goodput) */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden bg-gradient-to-br from-emerald-950/20 to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">3. Débit Utile (Goodput)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
              {bandwidthResult.goodputMbps} Mbps
            </span>
            <p className="text-xs text-slate-300 mt-1">
              Vitesse réelle de transfert des données de l'application utilisateur.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono font-bold text-emerald-400">
            👉 {bandwidthResult.goodputMBS} Mo/s (ou {bandwidthResult.goodputMibS} Mio/s)
          </div>
        </div>

        {/* 4. Efficacité Protocolaire */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Efficacité Payload</span>
            <Percent className="w-4 h-4 text-pink-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-pink-400 font-mono">
              {bandwidthResult.l4PayloadEfficiencyPercent}%
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Pourcentage de bits utiles transportés par rapport au signal physique.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
            Overhead total : {bandwidthResult.totalL2OverheadBytes + bandwidthResult.ipHeaderBytes + bandwidthResult.transportHeaderBytes} Octets / paquet
          </div>
        </div>
      </div>

      {/* Interactive Controls & Overhead Anatomy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tuning Controls */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Paramètres de la Liaison & du Trafic
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Nominal Bitrate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-300">Débit Nominal Physique :</span>
                <span className="font-mono text-amber-400 font-bold">{bandwidthParams.nominalBitrateMbps} Mbps</span>
              </div>
              <input
                type="range"
                min={10}
                max={10000}
                step={10}
                value={bandwidthParams.nominalBitrateMbps}
                onChange={e => handleUpdate({ nominalBitrateMbps: parseInt(e.target.value) || 100 })}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Payload Size (MSS) */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-300">Taille de la Charge Utile (Payload / MSS) :</span>
                <span className="font-mono text-pink-400 font-bold">{bandwidthParams.payloadSizeBytes} Octets</span>
              </div>
              <input
                type="range"
                min={64}
                max={bandwidthParams.mtuBytes - 40}
                step={1}
                value={bandwidthParams.payloadSizeBytes}
                onChange={e => handleUpdate({ payloadSizeBytes: parseInt(e.target.value) || 1460 })}
                className="w-full accent-pink-500"
              />
              <p className="text-[11px] text-slate-400">
                Note pédagogique : Réduire la taille du payload (ex: 100B) effondre l'efficacité du Goodput car l'overhead des en-têtes (78B) devient prépondérant !
              </p>
            </div>

            {/* MTU Size & Jumbo Frames Toggle */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 block">Taille MTU (L2 Ethernet) :</span>
                <select
                  value={bandwidthParams.mtuBytes}
                  onChange={e => {
                    const newMtu = parseInt(e.target.value);
                    handleUpdate({
                      mtuBytes: newMtu,
                      payloadSizeBytes: newMtu - 40,
                      enableJumboFrames: newMtu > 1500,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                >
                  <option value={1500}>1500 Octets (Standard)</option>
                  <option value={9000}>9000 Octets (Jumbo Frames)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 block">Protocole Transport :</span>
                <select
                  value={bandwidthParams.transportProtocol}
                  onChange={e => handleUpdate({ transportProtocol: e.target.value as TransportProtocol })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                >
                  <option value="TCP">TCP (En-tête 20B + ACKs)</option>
                  <option value="UDP">UDP (En-tête léger 8B)</option>
                </select>
              </div>
            </div>

            {/* Packet Loss & Latency RTT */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-300">Taux de Perte :</span>
                  <span className="font-mono text-rose-400 font-bold">{bandwidthParams.packetLossRatePercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={bandwidthParams.packetLossRatePercent}
                  onChange={e => handleUpdate({ packetLossRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full accent-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-300">Latence RTT :</span>
                  <span className="font-mono text-cyan-400 font-bold">{bandwidthParams.rttMs} ms</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={bandwidthParams.rttMs}
                  onChange={e => handleUpdate({ rttMs: parseInt(e.target.value) || 15 })}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Overhead Visual Breakdown Bar & Time Estimator */}
        <div className="lg:col-span-6 space-y-4">
          {/* Visual Byte Overhead Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              Décomposition d'une Trame sur le Câble ({bandwidthResult.onWireFrameTotalBytes} Octets)
            </h3>

            {/* Segmented Bar */}
            <div className="space-y-2">
              <div className="h-7 w-full bg-slate-950 rounded-xl overflow-hidden flex border border-slate-800">
                <div
                  title="Préambule (8B) + IFG (12B) + FCS (4B) = 24B"
                  className="bg-amber-600 flex items-center justify-center text-[10px] font-mono text-white font-bold"
                  style={{ width: `${(24 / bandwidthResult.onWireFrameTotalBytes) * 100}%` }}
                >
                  L1/FCS
                </div>
                <div
                  title="En-tête Ethernet MAC (14B)"
                  className="bg-emerald-600 flex items-center justify-center text-[10px] font-mono text-white font-bold"
                  style={{ width: `${(14 / bandwidthResult.onWireFrameTotalBytes) * 100}%` }}
                >
                  Eth
                </div>
                <div
                  title="En-tête IPv4 (20B)"
                  className="bg-cyan-600 flex items-center justify-center text-[10px] font-mono text-white font-bold"
                  style={{ width: `${(20 / bandwidthResult.onWireFrameTotalBytes) * 100}%` }}
                >
                  IP
                </div>
                <div
                  title="En-tête Transport (20B/8B)"
                  className="bg-blue-600 flex items-center justify-center text-[10px] font-mono text-white font-bold"
                  style={{ width: `${(bandwidthResult.transportHeaderBytes / bandwidthResult.onWireFrameTotalBytes) * 100}%` }}
                >
                  {bandwidthParams.transportProtocol}
                </div>
                <div
                  title={`Charge Utile Applicative (${bandwidthParams.payloadSizeBytes}B)`}
                  className="bg-pink-600 flex-1 flex items-center justify-center text-[10px] font-mono text-white font-bold truncate px-1"
                >
                  Payload Utile ({bandwidthParams.payloadSizeBytes}B)
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  IFG/FCS : 24B
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Ethernet : 14B
                </span>
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  IPv4 : 20B
                </span>
                <span className="flex items-center gap-1.5 text-pink-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  Payload : {bandwidthParams.payloadSizeBytes}B
                </span>
              </div>
            </div>

            {/* Packets per second */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <span className="text-slate-400">Débit en paquets par seconde (PPS) :</span>
              <span className="font-mono text-white font-bold">
                {bandwidthResult.maxPacketsPerSecond.toLocaleString('fr-FR')} paquets/s
              </span>
            </div>
          </div>

          {/* Transfer Time Estimator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Temps Réel Estimé de Téléchargement de Fichiers
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Fichier de 100 Mo :</span>
                <span className="text-base font-mono font-black text-cyan-300 block">
                  {formatDurationFr(bandwidthResult.timeToTransfer100MBSeconds)}
                </span>
                <span className="text-[10px] text-slate-400">au débit utile Goodput</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Fichier de 1 Go (Vidéo HD) :</span>
                <span className="text-base font-mono font-black text-emerald-300 block">
                  {formatDurationFr(bandwidthResult.timeToTransfer1GBSeconds)}
                </span>
                <span className="text-[10px] text-slate-400">au débit utile Goodput</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Unit Converter Reference Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            Tableau Comparatif & Conversion des Unités de Débit ({bandwidthParams.nominalBitrateMbps} Mbps)
          </h3>
          <span className="text-xs font-mono text-slate-400">Normes SI (10³) vs Normes CEI (2¹⁰)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="py-2.5 px-3">Nom de l'Unité</th>
                <th className="py-2.5 px-3">Symbole</th>
                <th className="py-2.5 px-3 text-cyan-300">Valeur Convertie</th>
                <th className="py-2.5 px-3">Contexte / Usage Pratique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {unitRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{row.unitName}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-400">{row.symbol}</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-bold text-sm">{row.valueFormatted}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">{row.descriptionFr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
