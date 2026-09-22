/**
 * Interactive TCP Flight Cannon & Router Buffer Simulator
 * Real-time flying TCP segments, animated router FIFO queue (Bufferbloat demo),
 * in-flight drop triggers, and return ACK streams.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Laptop,
  Server,
  Radio,
  Zap,
  Flame,
  Gauge,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Activity,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';

interface SegmentInFlight {
  id: number;
  seq: number;
  progress: number; // 0 to 100
  isAck: boolean;
  ackNum?: number;
  isDropped?: boolean;
  inRouterQueue?: boolean;
}

export const InteractiveTcpFlightCannon: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();

  const { cwndMss, ssthreshMss, rwndMss } = state.tcpEngine;

  const [segments, setSegments] = useState<SegmentInFlight[]>([
    { id: 1, seq: 1000, progress: 20, isAck: false },
    { id: 2, seq: 2460, progress: 45, isAck: false, inRouterQueue: true },
    { id: 3, seq: 1000, progress: 75, isAck: true, ackNum: 2460 },
  ]);

  const [routerQueueCapacity, setRouterQueueCapacity] = useState<number>(6);
  const [routerQueue, setRouterQueue] = useState<number[]>([]);
  const [nextSeq, setNextSeq] = useState<number>(3920);
  const [lossRate, setLossRate] = useState<number>(0);
  const [autoFlight, setAutoFlight] = useState<boolean>(true);

  // Flight animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSegments((prev) => {
        return prev
          .map((seg) => {
            if (seg.isDropped) return seg;

            // Router queue pause zone: between 45% and 55%
            const isNearRouter = seg.progress >= 45 && seg.progress <= 55 && !seg.isAck;

            let speed = 1.5;
            if (isNearRouter && routerQueue.length > 2) {
              speed = 0.6; // delay in queue
            }

            const step = (seg.isAck ? -speed : speed);
            let nextProgress = seg.progress + step;

            if (nextProgress > 100) {
              // Reached Server -> generate ACK
              return {
                ...seg,
                progress: 100,
                isAck: true,
                ackNum: seg.seq + 1460,
              };
            }
            if (nextProgress < 0 && seg.isAck) {
              // Reached Sender -> advance cwnd and trigger state ACK
              dispatch({ type: 'STEP_TCP_ACK' });
              return null as any;
            }

            return {
              ...seg,
              progress: nextProgress,
              inRouterQueue: isNearRouter,
            };
          })
          .filter(Boolean);
      });
    }, 45);

    return () => clearInterval(interval);
  }, [dispatch, routerQueue.length]);

  // Periodic automatic segment emission based on cwnd
  useEffect(() => {
    if (!autoFlight) return;
    const emitInterval = setInterval(() => {
      setSegments((prev) => {
        // Max concurrent in-flight segments capped by effective window
        const effectiveLimit = Math.min(cwndMss, rwndMss);
        const forwardCount = prev.filter((s) => !s.isAck && !s.isDropped).length;
        if (forwardCount >= Math.min(effectiveLimit, 8)) return prev;

        const newSeg: SegmentInFlight = {
          id: Date.now() + Math.random(),
          seq: nextSeq,
          progress: 5,
          isAck: false,
        };

        // Check router buffer overflow (Bufferbloat drop)
        if (prev.filter((s) => s.inRouterQueue).length >= routerQueueCapacity) {
          // Drop at router queue
          notify('Bufferbloat : Débordement du tampon du routeur ! Paquet rejeté (Tail Drop)', 'warning');
          dispatch({ type: 'INJECT_TCP_TRIPLE_DUP_ACK' });
          return [
            ...prev,
            { ...newSeg, progress: 50, isDropped: true },
          ];
        }

        return [...prev, newSeg];
      });

      setNextSeq((s) => s + 1460);
    }, 1200);

    return () => clearInterval(emitInterval);
  }, [autoFlight, nextSeq, cwndMss, rwndMss, routerQueueCapacity, dispatch, notify]);

  const handleManualDrop = (id: number) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isDropped: true } : s))
    );
    notify('Perte manuelle de segment : Déclenchement de 3 Duplicate ACKs et Fast Recovery !', 'error');
    dispatch({ type: 'INJECT_TCP_TRIPLE_DUP_ACK' });

    setTimeout(() => {
      setSegments((prev) => prev.filter((s) => s.id !== id));
    }, 1000);
  };

  const handleManualEmit = () => {
    const newSeg: SegmentInFlight = {
      id: Date.now(),
      seq: nextSeq,
      progress: 5,
      isAck: false,
    };
    setSegments((prev) => [...prev, newSeg]);
    setNextSeq((s) => s + 1460);
    notify(`Segment Seq #${newSeg.seq} propulsé sur le réseau`, 'info');
  };

  const queuedPacketsCount = segments.filter((s) => s.inRouterQueue && !s.isAck && !s.isDropped).length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Simulateur Dynamique de Flux & Tampon Réseau
            </span>
            <span className="text-xs text-slate-400">Segments & ACKs en Vol</span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1">
            Visualisation Temps Réel des Segments, Files d'Attente & Pertes
          </h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualEmit}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            Envoyer Segment (MSS)
          </button>

          <button
            onClick={() => setAutoFlight(!autoFlight)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              autoFlight
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            {autoFlight ? 'Auto: ACTIF' : 'Auto: PAUSE'}
          </button>
        </div>
      </div>

      {/* Flight Canvas Rail */}
      <div className="relative bg-slate-950 rounded-2xl p-6 border border-slate-800/90 overflow-hidden select-none min-h-[200px]">
        {/* Wire Path */}
        <div className="absolute top-1/2 left-8 right-8 h-2 -translate-y-1/2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-cyan-500/30 via-amber-500/40 to-emerald-500/30 animate-pulse" />
        </div>

        {/* Three Anchor Stations: Client -> Router FIFO -> Server */}
        <div className="relative z-10 flex items-center justify-between">
          {/* Station 1: Client Socket */}
          <div className="flex flex-col items-center text-center w-28">
            <div className="p-3 rounded-2xl bg-slate-900 border-2 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Laptop className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-slate-100 mt-2">Client TCP</span>
            <span className="text-[10px] text-amber-400 font-mono">cwnd = {cwndMss} MSS</span>
          </div>

          {/* Station 2: Router Queue Buffer (Bufferbloat) */}
          <div className="flex flex-col items-center text-center w-40 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">File Tampon Routeur</span>
            </div>

            {/* Queue Slots Indicator */}
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800 w-full justify-center">
              {Array.from({ length: routerQueueCapacity }).map((_, idx) => {
                const isOccupied = idx < queuedPacketsCount;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-6 rounded transition-all ${
                      isOccupied
                        ? 'bg-amber-500 shadow-sm shadow-amber-500/50 scale-105'
                        : 'bg-slate-800/80 border border-slate-700/50'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-mono mt-1 px-1">
              <span>{queuedPacketsCount}/{routerQueueCapacity} Segments</span>
              {queuedPacketsCount >= routerQueueCapacity && (
                <span className="text-rose-400 font-bold animate-pulse">Saturé!</span>
              )}
            </div>
          </div>

          {/* Station 3: Server Socket */}
          <div className="flex flex-col items-center text-center w-28">
            <div className="p-3 rounded-2xl bg-slate-900 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Server className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-slate-100 mt-2">Serveur TCP</span>
            <span className="text-[10px] text-emerald-400 font-mono">rwnd = {rwndMss} MSS</span>
          </div>
        </div>

        {/* Flying Packets & ACKs */}
        <div className="absolute top-1/2 left-10 right-10 -translate-y-1/2 pointer-events-none h-20">
          <AnimatePresence>
            {segments.map((seg) => {
              const posX = seg.progress;

              return (
                <motion.div
                  key={seg.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: seg.isDropped ? 0 : 1,
                    scale: seg.isDropped ? 2 : 1,
                    left: `${posX}%`,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.04 }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-30 ${
                    seg.isAck ? '-top-3' : 'top-9'
                  }`}
                  onClick={() => handleManualDrop(seg.id)}
                  title="Cliquer pour détruire et provoquer une perte"
                >
                  <div
                    className={`px-2.5 py-1 rounded-xl border shadow-xl flex items-center gap-1.5 transition-transform hover:scale-110 ${
                      seg.isDropped
                        ? 'bg-rose-600 border-rose-400 text-white animate-ping'
                        : seg.isAck
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/40'
                        : 'bg-amber-600 border-amber-400 text-slate-950 font-extrabold shadow-amber-500/40'
                    }`}
                  >
                    <span className="text-[10px] font-mono">
                      {seg.isAck ? `ACK ${seg.ackNum}` : `Seq #${seg.seq}`}
                    </span>

                    {!seg.isAck && (
                      <span className="p-0.5 rounded bg-slate-950/80 text-amber-300">
                        <Zap className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Info Footnote */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 gap-2">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Astuce : <strong>Cliquez directement sur un segment jaune en vol</strong> pour simuler une perte de paquet et observer la réaction immédiate de TCP !
        </span>
        <span className="font-mono text-cyan-400 font-semibold">
          MSS Standard : 1460 Octets
        </span>
      </div>
    </div>
  );
};
