/**
 * Interactive Packet Flight Arena & Physical Wire Visualizer
 * Provides real-time animated packet capsules, flying laser signals,
 * router buffer queues, layer peeling, and live oscilloscope signal visualization.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Laptop,
  Server,
  Network,
  Radio,
  Zap,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  AlertOctagon,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';

export interface InFlightPacket {
  readonly id: number;
  readonly progress: number; // 0 to 100%
  readonly seq: number;
  readonly isAck: boolean;
  readonly isDropped?: boolean;
  readonly isCorrupted?: boolean;
  readonly ttl: number;
  readonly currentDevice: 'HOST_A' | 'CABLE_1' | 'SW_1' | 'ROUTER_1' | 'CABLE_2' | 'SW_2' | 'HOST_B';
}

export const InteractivePacketFlightArena: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();

  const [packets, setPackets] = useState<InFlightPacket[]>([
    { id: 1, progress: 15, seq: 1, isAck: false, ttl: 64, currentDevice: 'CABLE_1' },
    { id: 2, progress: 55, seq: 2, isAck: false, ttl: 63, currentDevice: 'ROUTER_1' },
    { id: 3, progress: 85, seq: 3, isAck: true, ttl: 64, currentDevice: 'SW_2' },
  ]);

  const [selectedPacket, setSelectedPacket] = useState<InFlightPacket | null>(null);
  const [wireSpeed, setWireSpeed] = useState<number>(1);
  const [wireMedium, setWireMedium] = useState<'COPPER' | 'FIBER' | 'SATELLITE'>('COPPER');
  const [autoEmit, setAutoEmit] = useState<boolean>(true);
  const [packetCounter, setPacketCounter] = useState<number>(4);

  // Animation Loop for moving packets along the wire
  useEffect(() => {
    const interval = setInterval(() => {
      setPackets(prevPackets => {
        return prevPackets
          .map(pkt => {
            if (pkt.isDropped) return pkt;
            const step = (pkt.isAck ? -1.2 : 1.2) * wireSpeed;
            let nextProgress = pkt.progress + step;

            if (nextProgress > 100) {
              // Reached Host B -> spawn returning ACK
              return {
                ...pkt,
                progress: 100,
                isAck: true,
                currentDevice: 'HOST_B',
              };
            }
            if (nextProgress < 0 && pkt.isAck) {
              // ACK reached Host A -> remove
              return null as any;
            }

            // Determine device location
            let device: InFlightPacket['currentDevice'] = 'CABLE_1';
            let currentTtl = pkt.ttl;
            if (nextProgress < 20) device = 'CABLE_1';
            else if (nextProgress < 38) device = 'SW_1';
            else if (nextProgress < 62) {
              device = 'ROUTER_1';
              if (!pkt.isAck && pkt.progress < 50 && nextProgress >= 50) {
                currentTtl = 63; // TTL decremented at router
              }
            } else if (nextProgress < 80) device = 'SW_2';
            else if (nextProgress < 95) device = 'CABLE_2';
            else device = 'HOST_B';

            return {
              ...pkt,
              progress: nextProgress,
              ttl: currentTtl,
              currentDevice: device,
            };
          })
          .filter(Boolean);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [wireSpeed]);

  // Periodic Auto-Emitter
  useEffect(() => {
    if (!autoEmit) return;
    const emitInterval = setInterval(() => {
      setPackets(prev => {
        if (prev.length >= 6) return prev;
        const newPkt: InFlightPacket = {
          id: packetCounter,
          progress: 5,
          seq: (packetCounter % 20) + 1,
          isAck: false,
          ttl: 64,
          currentDevice: 'HOST_A',
        };
        return [...prev, newPkt];
      });
      setPacketCounter(c => c + 1);
    }, 2800 / wireSpeed);

    return () => clearInterval(emitInterval);
  }, [autoEmit, packetCounter, wireSpeed]);

  const handleDropPacket = (id: number) => {
    setPackets(prev =>
      prev.map(p => (p.id === id ? { ...p, isDropped: true } : p))
    );
    notify('Paquet détruit sur la liaison physique (Simulation de Perte / Drop)', 'error');
    setTimeout(() => {
      setPackets(prev => prev.filter(p => p.id !== id));
    }, 1200);
  };

  const handleEmitManual = () => {
    const newPkt: InFlightPacket = {
      id: packetCounter,
      progress: 5,
      seq: (packetCounter % 20) + 1,
      isAck: false,
      ttl: 64,
      currentDevice: 'HOST_A',
    };
    setPackets(prev => [...prev, newPkt]);
    setPacketCounter(c => c + 1);
    notify(`Nouveau paquet Seq #${newPkt.seq} injecté sur le câble`, 'info');
  };

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Cybernetic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Arena Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Arène Physique en Temps Réel
            </span>
            <span className="text-xs text-slate-400">Propagation & Signaux L1/L2/L3</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
            Visualisateur de Trame & Signaux en Vol
          </h2>
        </div>

        {/* Medium & Speed Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Medium Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setWireMedium('COPPER')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                wireMedium === 'COPPER'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cuivre (1 Gbps)
            </button>
            <button
              onClick={() => setWireMedium('FIBER')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                wireMedium === 'FIBER'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fibre Optique (10G)
            </button>
            <button
              onClick={() => setWireMedium('SATELLITE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                wireMedium === 'SATELLITE'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite (600ms)
            </button>
          </div>

          {/* Emit Button */}
          <button
            onClick={handleEmitManual}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            Émettre Trame
          </button>

          {/* Auto Emit Toggle */}
          <button
            onClick={() => setAutoEmit(!autoEmit)}
            className={`px-3 py-1.5 rounded-xl border font-semibold transition ${
              autoEmit
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {autoEmit ? 'Auto: ACTIF' : 'Auto: PAUSE'}
          </button>
        </div>
      </div>

      {/* =========================================================================
          THE PHYSICAL CABLE & EQUIPMENT ANIMATION STAGE
         ========================================================================= */}
      <div className="relative bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 overflow-hidden shadow-inner select-none">
        {/* Physical Wire Rail (Laser Path) */}
        <div className="absolute top-1/2 left-10 right-10 h-2 -translate-y-1/2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          {/* Animated Laser Pulse */}
          <div
            className={`w-full h-full opacity-70 animate-pulse ${
              wireMedium === 'FIBER'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500'
                : wireMedium === 'SATELLITE'
                ? 'bg-gradient-to-r from-purple-500 via-pink-400 to-purple-500'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
            }`}
          />
        </div>

        {/* Equipment Nodes positioned along the wire */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* 1. Host A */}
          <div className="flex flex-col items-center text-center w-24 sm:w-28 group">
            <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/20 transition group-hover:scale-105">
              <Laptop className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <span className="text-xs font-bold text-slate-100 mt-2">Hôte A (Client)</span>
            <span className="text-[10px] text-cyan-400 font-mono">192.168.1.10</span>
            <span className="text-[9px] text-slate-500 font-mono">NIC Gi0</span>
          </div>

          {/* 2. Switch SW1 */}
          <div className="flex flex-col items-center text-center w-20 sm:w-24 group">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/60 text-emerald-400 shadow-md shadow-emerald-500/10">
              <Network className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-xs font-bold text-slate-200 mt-2">Switch SW1</span>
            <span className="text-[9px] text-emerald-400 font-mono">Layer 2 (CAM)</span>
          </div>

          {/* 3. Router R1 (Gateway) */}
          <div className="flex flex-col items-center text-center w-24 sm:w-28 group">
            <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-amber-500 text-amber-400 shadow-xl shadow-amber-500/20 animate-pulse">
              <Radio className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <span className="text-xs font-bold text-amber-200 mt-2">Routeur R1</span>
            <span className="text-[9px] text-amber-400 font-mono font-bold">L3 (TTL: 64 &rarr; 63)</span>
            <span className="text-[9px] text-slate-400 font-mono">Passerelle</span>
          </div>

          {/* 4. Switch SW2 */}
          <div className="flex flex-col items-center text-center w-20 sm:w-24 group">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/60 text-emerald-400 shadow-md shadow-emerald-500/10">
              <Network className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-xs font-bold text-slate-200 mt-2">Switch SW2</span>
            <span className="text-[9px] text-emerald-400 font-mono">Layer 2 (CAM)</span>
          </div>

          {/* 5. Host B */}
          <div className="flex flex-col items-center text-center w-24 sm:w-28 group">
            <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/20 transition group-hover:scale-105">
              <Server className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <span className="text-xs font-bold text-slate-100 mt-2">Hôte B (Serveur)</span>
            <span className="text-[10px] text-cyan-400 font-mono">198.51.100.25</span>
            <span className="text-[9px] text-slate-500 font-mono">Web Port 80</span>
          </div>
        </div>

        {/* =========================================================================
            DYNAMIC FLYING PACKETS ON WIRE
           ========================================================================= */}
        <div className="absolute top-1/2 left-12 right-12 -translate-y-1/2 pointer-events-none h-16">
          <AnimatePresence>
            {packets.map(pkt => {
              const posX = pkt.progress;
              const isSelected = selectedPacket?.id === pkt.id;

              return (
                <motion.div
                  key={pkt.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: pkt.isDropped ? 0 : 1,
                    scale: pkt.isDropped ? 1.8 : isSelected ? 1.25 : 1,
                    left: `${posX}%`,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.05 }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-30 ${
                    pkt.isAck ? '-top-3' : 'top-8'
                  }`}
                  onClick={() => setSelectedPacket(pkt)}
                >
                  <div
                    className={`px-2.5 py-1.5 rounded-xl border shadow-xl flex items-center gap-1.5 transition-transform hover:scale-110 ${
                      pkt.isDropped
                        ? 'bg-rose-500/80 border-rose-400 text-white animate-ping'
                        : pkt.isAck
                        ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-emerald-500/30'
                        : 'bg-cyan-600/90 border-cyan-400 text-white shadow-cyan-500/30'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold">
                      {pkt.isAck ? `ACK #${pkt.seq}` : `Pkt #${pkt.seq}`}
                    </span>

                    {!pkt.isAck && (
                      <span className="text-[9px] bg-slate-950/70 px-1 rounded text-cyan-200 font-mono">
                        TTL:{pkt.ttl}
                      </span>
                    )}

                    {/* Quick Drop Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDropPacket(pkt.id);
                      }}
                      className="ml-1 p-0.5 rounded hover:bg-rose-600 text-rose-200 hover:text-white transition"
                      title="Détruire ce paquet sur le câble"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* =========================================================================
          EXPLODED 3D-LAYER PACKET INSPECTOR
         ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Éclaté des Couches d'Encapsulation de la Trame en Vol
            </h3>
            <p className="text-xs text-slate-400">
              Cliquez sur un paquet en vol ou explorez la décomposition octet par octet sur le support physique.
            </p>
          </div>

          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-950 border border-cyan-500/30 text-cyan-300 font-semibold">
            Taille Totale : 1518 Octets
          </span>
        </div>

        {/* Visual Layer Stacks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Layer 2: Ethernet MAC */}
          <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/40 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">
                  L2
                </span>
                En-tête Ethernet
              </span>
              <span className="text-[10px] font-mono text-slate-400">14 Octets</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">MAC Dst:</span>
                <span className="text-blue-300">{state.packetOptions.sourceMac ? '00:1A:2B:3C:4D:5E' : 'Passerelle'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MAC Src:</span>
                <span className="text-blue-300">{state.packetOptions.sourceMac || 'AA:BB:CC:11:22:33'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">EtherType:</span>
                <span className="text-cyan-400">0x0800 (IPv4)</span>
              </div>
            </div>
          </div>

          {/* Layer 3: IPv4 Header */}
          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                  L3
                </span>
                En-tête IPv4
              </span>
              <span className="text-[10px] font-mono text-slate-400">20 Octets</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">IP Src:</span>
                <span className="text-cyan-300">{state.packetOptions.sourceIp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IP Dst:</span>
                <span className="text-cyan-300">{state.packetOptions.destinationIp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TTL / Proto:</span>
                <span className="text-amber-400">64 / TCP (6)</span>
              </div>
            </div>
          </div>

          {/* Layer 4: TCP Segment Header */}
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">
                  L4
                </span>
                En-tête TCP
              </span>
              <span className="text-[10px] font-mono text-slate-400">20 Octets</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Port S/D:</span>
                <span className="text-amber-300">{state.packetOptions.sourcePort} &rarr; {state.packetOptions.destinationPort}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seq / Ack:</span>
                <span className="text-slate-300">1000 / 0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Flags:</span>
                <span className="text-emerald-400">[ACK, PSH]</span>
              </div>
            </div>
          </div>

          {/* Layer 7: Payload Data */}
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                  L7
                </span>
                Charge Utile (Data)
              </span>
              <span className="text-[10px] font-mono text-slate-400">{state.packetOptions.payloadText.length} Octets</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 truncate">
              "{state.packetOptions.payloadText}"
            </div>
          </div>

          {/* Trailer: FCS CRC32 */}
          <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                FCS Trailer (CRC32)
              </span>
              <span className="text-[10px] font-mono text-slate-400">4 Octets</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Polynôme:</span>
                <span className="text-rose-300">IEEE 802.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Checksum:</span>
                <span className="text-emerald-400 font-bold">0x8A4B92C1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statut:</span>
                <span className="text-emerald-400 font-bold">VALIDE ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
