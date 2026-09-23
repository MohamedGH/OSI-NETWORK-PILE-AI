/**
 * High-Standard HTML5 Canvas & Particle Physics Engine for IP Fragmentation & MTU Slicing
 * Features:
 * - 60 FPS requestAnimationFrame loop with high-DPI retina display scaling
 * - Dynamic laser slicer physics at Router R1 with cutting sparks and 8-byte alignment guides
 * - In-flight fragment capsules with glowing photon trails, velocity vectors, and drag physics
 * - Interactive canvas click sabotage: Click on any flying fragment to trigger packet loss and debris explosion!
 * - DF=1 shockwave simulation with particle disintegration and ICMP Type 3 Code 4 return flight
 * - Destination Host B RAM matrix with fluid slot-filling animations, missing hole alerts, and golden reassembly wave
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Scissors,
  ShieldAlert,
  Sliders,
  Maximize2,
  Minimize2,
  Info,
  Radio,
  Eye,
  Bomb,
  FastForward,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { IpFragment } from '../types/network';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FlyingCanvasFragment {
  id: number;
  fragmentIndex: number;
  totalFragments: number;
  x: number; // 0 to 1 normalized
  y: number;
  targetY: number;
  speed: number;
  width: number;
  height: number;
  fragment: IpFragment;
  isDropped: boolean;
  isReceived: boolean;
  color: string;
  glowColor: string;
  sparkTimer: number;
  pulsePhase: number;
}

export const InteractiveFragmentationCanvas: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const { fragOptions, fragPlan, reassemblyBuffer } = state;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Canvas interactive simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [enableGlow, setEnableGlow] = useState<boolean>(true);
  const [enableParticles, setEnableParticles] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredFrag, setHoveredFrag] = useState<FlyingCanvasFragment | null>(null);
  const [activeSabotageMode, setActiveSabotageMode] = useState<boolean>(false);

  // References for animation loop
  const flyingFragmentsRef = useRef<FlyingCanvasFragment[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const laserAngleRef = useRef<number>(0);
  const shockwavesRef = useRef<Array<{ x: number; y: number; radius: number; maxRadius: number; color: string; alpha: number }>>([]);
  const icmpPacketRef = useRef<{ x: number; y: number; active: boolean; progress: number } | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize or re-emit fragments when fragmentation plan changes
  const spawnPacketFlight = useCallback(() => {
    if (fragPlan.isDroppedDueToDf) {
      // Spawn ICMP rejection shockwave at router position
      shockwavesRef.current.push({
        x: 0.5,
        y: 0.5,
        radius: 5,
        maxRadius: 180,
        color: '#f43f5e',
        alpha: 1,
      });

      // Spawn fiery rejection debris particles
      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        particlesRef.current.push({
          x: 0.5,
          y: 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          color: i % 2 === 0 ? '#ef4444' : '#f97316',
          alpha: 1,
          life: 0,
          maxLife: 40 + Math.random() * 30,
        });
      }

      // Launch ICMP Type 3 Code 4 return packet flying back from Router to Host A
      icmpPacketRef.current = {
        x: 0.5,
        y: 0.5,
        active: true,
        progress: 0,
      };
      flyingFragmentsRef.current = [];
      return;
    }

    // Normal fragmentation flight: create individual fragment capsules
    const colors = ['#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#14b8a6', '#eab308'];
    const newFrags: FlyingCanvasFragment[] = fragPlan.fragments.map((frag, idx) => {
      // Stagger initial x positions slightly to simulate sequential pipe transit
      const staggerOffset = -(idx * 0.08);
      return {
        id: Math.random(),
        fragmentIndex: frag.fragmentIndex,
        totalFragments: frag.totalFragments,
        x: staggerOffset,
        y: 0.5,
        targetY: 0.5,
        speed: 0.0035 + (idx % 2 === 0 ? 0.0002 : -0.0002), // slight organic jitter
        width: Math.max(36, Math.min(68, (frag.payloadLength / (fragPlan.maxFragmentDataSize || 1)) * 55)),
        height: 28,
        fragment: frag,
        isDropped: false,
        isReceived: false,
        color: colors[idx % colors.length],
        glowColor: colors[idx % colors.length],
        sparkTimer: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    flyingFragmentsRef.current = newFrags;
  }, [fragPlan]);

  // Trigger spawn when plan changes or user clicks Emit
  useEffect(() => {
    spawnPacketFlight();
  }, [spawnPacketFlight]);

  // Main 60 FPS HTML5 Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const dt = Math.min(32, currentTime - lastTime);
      lastTime = currentTime;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Draw Deep Cyberpunk Background with Grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Compute Physical Node Positions on Canvas
      const hostAX = width * 0.12;
      const hostAY = height * 0.5;

      const routerX = width * 0.5;
      const routerY = height * 0.5;

      const hostBX = width * 0.88;
      const hostBY = height * 0.5;

      // 3. Draw High-Capacity Ingress Pipe (Host A -> Router R1)
      const pipeGradient1 = ctx.createLinearGradient(hostAX, 0, routerX, 0);
      pipeGradient1.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      pipeGradient1.addColorStop(1, 'rgba(236, 72, 153, 0.3)');

      ctx.strokeStyle = pipeGradient1;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hostAX, hostAY);
      ctx.lineTo(routerX, routerY);
      ctx.stroke();

      // Inner glowing laser wire 1
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hostAX, hostAY);
      ctx.lineTo(routerX, routerY);
      ctx.stroke();

      // 4. Draw Bottleneck WAN Pipe (Router R1 -> Host B)
      // Visual width of pipe directly scales with MTU size!
      const bottleneckPipeThickness = Math.max(6, Math.min(16, (fragOptions.bottleneckMtu / 1500) * 14));
      const pipeGradient2 = ctx.createLinearGradient(routerX, 0, hostBX, 0);
      pipeGradient2.addColorStop(0, 'rgba(236, 72, 153, 0.4)');
      pipeGradient2.addColorStop(1, 'rgba(16, 185, 129, 0.4)');

      ctx.strokeStyle = pipeGradient2;
      ctx.lineWidth = bottleneckPipeThickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(routerX, routerY);
      ctx.lineTo(hostBX, hostBY);
      ctx.stroke();

      // Inner glowing laser wire 2
      ctx.strokeStyle = fragOptions.isDfSet ? '#f43f5e' : '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(routerX, routerY);
      ctx.lineTo(hostBX, hostBY);
      ctx.stroke();

      // 5. Draw Traveling Photon Energy Pulses along wires
      const timePhase = currentTime * 0.003;
      for (let i = 0; i < 4; i++) {
        const pulseProgress1 = (timePhase + i * 0.25) % 1;
        const px1 = hostAX + (routerX - hostAX) * pulseProgress1;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.beginPath();
        ctx.arc(px1, hostAY, 3, 0, Math.PI * 2);
        ctx.fill();

        const pulseProgress2 = (timePhase * 1.2 + i * 0.25) % 1;
        const px2 = routerX + (hostBX - routerX) * pulseProgress2;
        ctx.fillStyle = fragOptions.isDfSet ? 'rgba(244, 63, 94, 0.7)' : 'rgba(16, 185, 129, 0.7)';
        ctx.beginPath();
        ctx.arc(px2, routerY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Draw Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(sw => {
        const swX = sw.x * width;
        const swY = sw.y * height;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3 * sw.alpha;
        ctx.globalAlpha = sw.alpha;
        ctx.beginPath();
        ctx.arc(swX, swY, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (isPlaying) {
          sw.radius += 3.5 * simSpeed;
          sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        }
        return sw.alpha > 0.02;
      });

      // 7. Update & Draw Particles (Sparks, Explosions)
      if (enableParticles) {
        particlesRef.current = particlesRef.current.filter(p => {
          const px = p.x * width;
          const py = p.y * height;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          if (isPlaying) {
            p.x += (p.vx / width) * simSpeed;
            p.y += (p.vy / height) * simSpeed;
            p.life += 1 * simSpeed;
            p.alpha = Math.max(0, 1 - p.life / p.maxLife);
            p.size = Math.max(0.5, p.size * 0.98);
          }
          return p.life < p.maxLife && p.alpha > 0.05;
        });
      }

      // 8. Draw ICMP Return Packet (if DF=1 rejection active)
      if (icmpPacketRef.current && icmpPacketRef.current.active) {
        const icmp = icmpPacketRef.current;
        if (isPlaying) {
          icmp.progress += 0.012 * simSpeed;
        }

        const icmpX = routerX - (routerX - hostAX) * icmp.progress;
        const icmpY = routerY - 24;

        // ICMP capsule
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(icmpX - 22, icmpY - 12, 44, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ICMP 3/4', icmpX, icmpY);

        // Particle trail
        if (enableParticles && Math.random() < 0.6) {
          particlesRef.current.push({
            x: icmpX / width,
            y: icmpY / height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            size: 2,
            color: '#f87171',
            alpha: 0.9,
            life: 0,
            maxLife: 20,
          });
        }

        if (icmp.progress >= 1) {
          icmp.active = false;
        }
      }

      // 9. Update & Draw Flying In-Flight Fragment Capsules
      if (!fragPlan.isDroppedDueToDf) {
        flyingFragmentsRef.current.forEach(pkt => {
          if (pkt.isDropped) {
            // Draw dropped ghost
            const posX = hostAX + (hostBX - hostAX) * pkt.x;
            const posY = hostAY;
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(posX - pkt.width / 2, posY - pkt.height / 2, pkt.width, pkt.height);
            ctx.setLineDash([]);
            return;
          }

          if (isPlaying) {
            pkt.x += pkt.speed * simSpeed;

            // Trigger router slice laser sparks as fragment crosses router threshold (x ≈ 0.5)
            if (pkt.x > 0.46 && pkt.x < 0.54) {
              pkt.sparkTimer += 1;
              if (enableParticles && Math.random() < 0.7) {
                particlesRef.current.push({
                  x: routerX / width,
                  y: routerY / height + (Math.random() - 0.5) * 0.08,
                  vx: (Math.random() - 0.3) * 3,
                  vy: (Math.random() - 0.5) * 4,
                  size: 2 + Math.random() * 3,
                  color: '#ec4899',
                  alpha: 1,
                  life: 0,
                  maxLife: 25,
                });
              }
            }

            // Check if fragment arrived at Host B (x >= 1.0)
            if (pkt.x >= 1.0 && !pkt.isReceived) {
              pkt.isReceived = true;
              dispatch({ type: 'RECEIVE_FRAGMENT_BY_INDEX', payload: pkt.fragmentIndex });

              // Golden arrival burst
              if (enableParticles) {
                for (let k = 0; k < 12; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  particlesRef.current.push({
                    x: hostBX / width,
                    y: hostBY / height,
                    vx: Math.cos(angle) * (2 + Math.random() * 3),
                    vy: Math.sin(angle) * (2 + Math.random() * 3),
                    size: 2.5,
                    color: '#10b981',
                    alpha: 1,
                    life: 0,
                    maxLife: 30,
                  });
                }
              }
            }
          }

          // Only draw if inside visible wire corridor
          if (pkt.x >= 0 && pkt.x <= 1.05) {
            const posX = hostAX + (hostBX - hostAX) * pkt.x;
            const posY = hostAY + Math.sin(currentTime * 0.005 + pkt.pulsePhase) * 2;

            // Check if before or after router
            const isFragmentedZone = pkt.x >= 0.5;

            // Capsule Shadow Glow
            if (enableGlow) {
              ctx.shadowColor = pkt.glowColor;
              ctx.shadowBlur = isFragmentedZone ? 12 : 6;
            }

            // Capsule Body
            ctx.fillStyle = isFragmentedZone ? pkt.color : '#0284c7';
            ctx.beginPath();
            ctx.roundRect(posX - pkt.width / 2, posY - pkt.height / 2, pkt.width, pkt.height, 6);
            ctx.fill();

            // Border
            ctx.strokeStyle = isFragmentedZone ? '#ffffff' : '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0; // reset shadow

            // Text Label inside capsule
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isFragmentedZone) {
              ctx.fillText(`#${pkt.fragmentIndex + 1} (${pkt.fragment.payloadLength}B)`, posX, posY - 3);
              ctx.font = '8px monospace';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillText(`Off:${pkt.fragment.fragmentOffset} MF:${pkt.fragment.mf ? 1 : 0}`, posX, posY + 7);
            } else {
              ctx.fillText(`IP [${fragOptions.packetTotalSize}B]`, posX, posY);
            }

            // Sabotage Crosshair Indicator if hover or active sabotage
            if (activeSabotageMode) {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(posX, posY, pkt.width / 2 + 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        });
      }

      // 10. Draw Hardware Nodes (Host A, Router R1, Host B)

      // Node A: Host A (Source)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(hostAX - 42, hostAY - 42, 84, 84, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HÔTE A', hostAX, hostAY - 14);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('MTU: 1500B', hostAX, hostAY + 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(`ID:0x${fragPlan.identification.toString(16).toUpperCase()}`, hostAX, hostAY + 18);

      // Node R1: Router Slicer Node (The MTU Guillotine)
      laserAngleRef.current += 0.04 * simSpeed;
      const routerPulse = Math.sin(laserAngleRef.current) * 3;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = fragOptions.isDfSet ? '#f43f5e' : '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(routerX - 48, routerY - 48, 96, 96, 16);
      ctx.fill();
      ctx.stroke();

      // Router Central Guillotine / Slicer Blades Animation
      ctx.strokeStyle = fragOptions.isDfSet ? '#ef4444' : '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(routerX, routerY - 32 + routerPulse);
      ctx.lineTo(routerX, routerY + 32 - routerPulse);
      ctx.stroke();

      ctx.fillStyle = fragOptions.isDfSet ? '#f43f5e' : '#f472b6';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ROUTEUR R1', routerX, routerY - 22);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#fbcfe8';
      ctx.fillText(`MTU: ${fragOptions.bottleneckMtu}B`, routerX, routerY - 6);

      ctx.font = '9px monospace';
      ctx.fillStyle = fragOptions.isDfSet ? '#fca5a5' : '#34d399';
      ctx.fillText(fragOptions.isDfSet ? 'DF=1 (REJET)' : `Max:${fragPlan.maxFragmentDataSize}B`, routerX, routerY + 12);

      ctx.font = '8px monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Align: 8-octets', routerX, routerY + 26);

      // Node B: Host B (Destination Reassembler RAM)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = reassemblyBuffer.isComplete ? '#10b981' : '#059669';
      ctx.lineWidth = reassemblyBuffer.isComplete ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.roundRect(hostBX - 46, hostBY - 46, 92, 92, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HÔTE B (RAM)', hostBX, hostBY - 24);

      // Micro Reassembly Matrix inside Host B
      const totalSlots = fragPlan.totalFragmentsCount || 1;
      const slotW = Math.min(14, 60 / totalSlots);
      const startSlotX = hostBX - (totalSlots * (slotW + 2)) / 2;

      for (let s = 0; s < totalSlots; s++) {
        const isSlotFilled = reassemblyBuffer.receivedFragments.some(rf => rf.fragmentIndex === s);
        ctx.fillStyle = isSlotFilled ? '#10b981' : 'rgba(239, 68, 68, 0.4)';
        ctx.strokeStyle = isSlotFilled ? '#34d399' : '#f87171';
        ctx.lineWidth = 1;
        ctx.fillRect(startSlotX + s * (slotW + 2), hostBY - 8, slotW, 16);
        ctx.strokeRect(startSlotX + s * (slotW + 2), hostBY - 8, slotW, 16);
      }

      ctx.font = '9px monospace';
      ctx.fillStyle = reassemblyBuffer.isComplete ? '#34d399' : '#fbbf24';
      ctx.fillText(
        reassemblyBuffer.isComplete
          ? 'RECONSTITUÉ ✓'
          : `${reassemblyBuffer.receivedPayloadBytes}/${reassemblyBuffer.expectedTotalPayloadBytes}B`,
        hostBX,
        hostBY + 22
      );

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    fragOptions,
    fragPlan,
    reassemblyBuffer,
    isPlaying,
    simSpeed,
    enableGlow,
    enableParticles,
    activeSabotageMode,
    dispatch,
  ]);

  // Handle Canvas Click (Interactive Sabotage / Fragment Drop or Inspection)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const hostAX = width * 0.12;
    const hostBX = width * 0.88;

    // Check if clicked any in-flight fragment
    let hitFragment: FlyingCanvasFragment | null = null;
    flyingFragmentsRef.current.forEach(pkt => {
      if (pkt.isDropped) return;
      const posX = hostAX + (hostBX - hostAX) * pkt.x;
      const posY = height * 0.5;

      const halfW = pkt.width / 2 + 10;
      const halfH = pkt.height / 2 + 10;

      const clickPxX = e.clientX - rect.left;
      const clickPxY = e.clientY - rect.top;

      if (
        clickPxX >= posX - halfW &&
        clickPxX <= posX + halfW &&
        clickPxY >= posY - halfH &&
        clickPxY <= posY + halfH
      ) {
        hitFragment = pkt;
      }
    });

    if (hitFragment) {
      const target = hitFragment as FlyingCanvasFragment;
      // Trigger destruction particles
      target.isDropped = true;
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x: (hostAX + (hostBX - hostAX) * target.x) / width,
          y: 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5,
          color: '#ef4444',
          alpha: 1,
          life: 0,
          maxLife: 35,
        });
      }
      notify(`💥 Fragment #${target.fragmentIndex + 1} détruit en vol ! Simulation de perte de paquet IPv4.`, 'warning');
      return;
    }

    // If clicked near Router R1 (x ≈ 0.5)
    if (Math.abs(clickX - 0.5) < 0.08 && Math.abs(clickY - 0.5) < 0.15) {
      dispatch({ type: 'UPDATE_FRAG_OPTIONS', payload: { isDfSet: !fragOptions.isDfSet } });
      notify(
        !fragOptions.isDfSet
          ? 'Routeur R1 : Drapeau DF armé à 1 ! Rejet PMTUD déclenché.'
          : 'Routeur R1 : Drapeau DF désactivé. Fragmentation active.',
        'info'
      );
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      }`}
    >
      {/* Top Interactive Canvas Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/40">
            <Scissors className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
              Arène Physique Canvas 60 FPS : Découpage MTU & Reconstitution RAM
            </h3>
            <span className="text-[10px] text-slate-400">
              Interagissez en direct : cliquez sur un fragment pour le détruire ou sur le routeur pour commuter le DF bit.
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isPlaying
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
            }`}
            title={isPlaying ? 'Mettre en pause' : 'Reprendre la simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Lecture'}</span>
          </button>

          {/* Emit New Packet */}
          <button
            onClick={spawnPacketFlight}
            className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
            title="Émettre un nouveau datagramme complet"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Émettre Paquet</span>
          </button>

          {/* Sabotage Tool Toggle */}
          <button
            onClick={() => setActiveSabotageMode(!activeSabotageMode)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeSabotageMode
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
            title="Mode Saboteur : Cliquez sur n'importe quel fragment pour le détruire"
          >
            <Bomb className="w-4 h-4" />
            <span className="hidden md:inline">Sabotage</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-[11px] font-mono">
            {[0.5, 1, 2].map(s => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`px-2 py-0.5 rounded-lg transition ${
                  simSpeed === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset Buffer */}
          <button
            onClick={() => {
              dispatch({ type: 'RESET_REASSEMBLY_BUFFER' });
              spawnPacketFlight();
              notify('Tampon récepteur vidé et nouveau paquet initialisé', 'info');
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Vider le tampon de réassemblage"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* The Interactive Canvas Area */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-950 cursor-crosshair">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full block"
        />

        {/* Live Overlay HUD Hints */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-[11px] font-mono">
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300 backdrop-blur-sm">
            <span className="text-slate-400">Goulet Actuel :</span>{' '}
            <strong className="text-pink-400">{fragOptions.bottleneckMtu} Octets</strong>{' '}
            <span className="text-slate-500">|</span>{' '}
            <span className="text-slate-400">Fragments :</span>{' '}
            <strong className="text-emerald-400">
              {fragPlan.isDroppedDueToDf ? 'REJETÉ (DF=1)' : `${fragPlan.totalFragmentsCount} unité(s)`}
            </strong>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300 backdrop-blur-sm">
            <span className="text-slate-400">Tampon Hôte B :</span>{' '}
            <strong className={reassemblyBuffer.isComplete ? 'text-emerald-400' : 'text-amber-400'}>
              {reassemblyBuffer.isComplete
                ? '100% RECONSTITUÉ'
                : `${reassemblyBuffer.receivedPayloadBytes} / ${reassemblyBuffer.expectedTotalPayloadBytes} Octets`}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
