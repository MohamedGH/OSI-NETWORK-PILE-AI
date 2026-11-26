/**
 * 60 FPS Hardware-Accelerated HTML5 Canvas for Intra-Town & Inter-City (Inter-Ville) Packet Transit
 * Renders either the local metropolitan loop (FTTH, Manholes, PM48, 5G Tower, River Siphon, Datacenter)
 * or the National Inter-City DWDM Backbone (Paris IXP -> Dijon EDFA -> Lyon POP -> Marseille Subsea Hub).
 */

import React, { useRef, useEffect } from 'react';
import { Play, Pause, Sparkles } from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import {
  TOWN_NODES,
  TOWN_LINKS,
  INTERCITY_NODES,
  INTERCITY_LINKS,
  computeActiveTownPath,
  convertInterCityToTownLinks,
} from '../utils/townJourneyEngine';

export const TownPacketCanvas: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    townScope,
    townIncident,
    isTownPlaying,
    selectedTownNodeId,
    selectedInterCityNodeId,
    townFlightPackets,
  } = state;

  const activePath = computeActiveTownPath(townScope, townIncident);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;
      const sx = w / 1000;
      const sy = h / 540;

      ctx.clearRect(0, 0, w, h);

      // Background Canvas
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Subtle Blueprint Coordinate Grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50 * sx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 50 * sy) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const isInterCity = townScope === 'INTER_CITIES';
      const allLinks = isInterCity ? convertInterCityToTownLinks(INTERCITY_LINKS) : TOWN_LINKS;

      if (!isInterCity) {
        // Draw River Canal & Street Boulevard for Intra-Town
        const riverX = 650 * sx;
        const riverW = 70 * sx;
        ctx.fillStyle = 'rgba(14, 116, 144, 0.22)';
        ctx.fillRect(riverX, 0, riverW, h);

        // Street Boulevard
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 415 * sy, w, 42 * sy);
      } else {
        // Draw Mediterranean Coastline at bottom-right for Inter-Ville
        ctx.fillStyle = 'rgba(2, 132, 199, 0.16)';
        ctx.beginPath();
        ctx.moveTo(740 * sx, h);
        ctx.quadraticCurveTo(820 * sx, 430 * sy, w, 420 * sy);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }

      // Draw Network Links (Fiber / 5G / DWDM / OPGW)
      for (const link of allLinks) {
        const isActive = activePath.pathLinks.some(al => al.id === link.id);
        const isSevered =
          (townIncident === 'FIBER_CUT' && link.id === 'link_pm_to_siphon') ||
          (townIncident === 'TGV_FIBER_CUT' && link.id === 'ic_paris_dijon_tgv');

        ctx.beginPath();
        link.waypoints.forEach((pt, i) => {
          const px = pt.x * sx;
          const py = pt.y * sy;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });

        if (isSevered) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3 * sx;
          ctx.setLineDash([6 * sx, 6 * sx]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw Fault Marker at midpoint
          const mid = link.waypoints[1] || link.waypoints[0];
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(mid.x * sx, mid.y * sy, 8 * sx, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${10 * sx}px IBM Plex Mono, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('COUPURE FIBRE', mid.x * sx, (mid.y - 14) * sy);
        } else if (isActive) {
          ctx.strokeStyle = link.isBackupRoute ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = 3 * sx;
          if (link.isWireless || link.isBackupRoute) {
            ctx.setLineDash([8 * sx, 5 * sx]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
          ctx.lineWidth = 1.75 * sx;
          ctx.stroke();
        }
      }

      // Draw Nodes
      if (isInterCity) {
        for (const city of INTERCITY_NODES) {
          const cx = city.x * sx;
          const cy = city.y * sy;
          const isSelected = selectedInterCityNodeId === city.id;

          if (isSelected) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 22 * sx, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx, cy, 14 * sx, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle =
            city.role === 'NATIONAL_IXP'
              ? '#38bdf8'
              : city.role === 'SUBMARINE_LANDING'
              ? '#10b981'
              : '#f59e0b';
          ctx.lineWidth = 2.5 * sx;
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = `600 ${11 * sx}px Plus Jakarta Sans, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(city.name, cx, cy - 20 * sy);

          ctx.fillStyle = '#94a3b8';
          ctx.font = `500 ${9.5 * sx}px IBM Plex Mono, monospace`;
          ctx.fillText(`AS${city.bgpAsNumber} · ${city.dwdmCapacityTbps} Tbps`, cx, cy + 28 * sy);
        }
      } else {
        for (const node of TOWN_NODES) {
          const nx = node.x * sx;
          const ny = node.y * sy;
          const isSelected = selectedTownNodeId === node.id;

          if (isSelected) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(nx, ny, 20 * sx, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(nx, ny, 13 * sx, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle =
            node.type === 'CELL_TOWER_5G'
              ? '#f59e0b'
              : node.type === 'MUNICIPAL_DATACENTER'
              ? '#10b981'
              : '#38bdf8';
          ctx.lineWidth = 2.5 * sx;
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = `600 ${10.5 * sx}px Plus Jakarta Sans, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, nx, ny - 18 * sy);

          ctx.fillStyle = '#94a3b8';
          ctx.font = `500 ${9 * sx}px IBM Plex Mono, monospace`;
          ctx.fillText(`L${node.osiLayer}`, nx, ny + 25 * sy);
        }
      }

      // Draw Packets in Flight
      for (const pkt of townFlightPackets) {
        const curLink = activePath.pathLinks[pkt.currentLinkIndex];
        if (!curLink || curLink.waypoints.length < 2) continue;

        const pts = curLink.waypoints;
        const segs = pts.length - 1;
        const scaled = pkt.progress * segs;
        const idx = Math.min(Math.floor(scaled), segs - 1);
        const sub = scaled - idx;

        const p1 = pts[idx];
        const p2 = pts[idx + 1];
        const px = (p1.x + (p2.x - p1.x) * sub) * sx;
        const py = (p1.y + (p2.y - p1.y) * sub) * sy;

        // Outer Pulse
        ctx.fillStyle = pkt.color;
        ctx.beginPath();
        ctx.arc(px, py, (6 + Math.sin(tick * 0.2) * 1.5) * sx, 0, Math.PI * 2);
        ctx.fill();

        // Inner White Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 2.5 * sx, 0, Math.PI * 2);
        ctx.fill();

        // Label above packet
        ctx.fillStyle = pkt.color;
        ctx.font = `600 ${9 * sx}px IBM Plex Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${pkt.packetType} (TTL:${pkt.ttl})`, px, py - 12 * sy);
      }

      rafId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, [townScope, townIncident, selectedTownNodeId, selectedInterCityNodeId, townFlightPackets, activePath]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 1000;
    const cy = ((e.clientY - rect.top) / rect.height) * 540;

    if (townScope === 'INTER_CITIES') {
      const hitCity = INTERCITY_NODES.find(n => Math.hypot(n.x - cx, n.y - cy) < 34);
      if (hitCity) dispatch({ type: 'SELECT_INTERCITY_NODE', payload: hitCity.id });
    } else {
      const hitTown = TOWN_NODES.find(n => Math.hypot(n.x - cx, n.y - cy) < 34);
      if (hitTown) dispatch({ type: 'SELECT_TOWN_NODE', payload: hitTown.id });
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
      {/* Top Bar inside Stage */}
      <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-300 font-medium">{activePath.summaryFr}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_TOWN_PLAYING', payload: !isTownPlaying })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors font-medium"
          >
            {isTownPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isTownPlaying ? 'Pause' : 'Reprendre'}
          </button>
          <button
            onClick={() => dispatch({ type: 'EMIT_TOWN_PACKET' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" /> Émettre Paquet
          </button>
        </div>
      </div>

      {/* Canvas Element */}
      <div className="w-full aspect-[16/9] max-h-[480px] bg-slate-950">
        <canvas
          ref={canvasRef}
          width={1000}
          height={540}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-pointer"
        />
      </div>
    </div>
  );
};
