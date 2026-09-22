/**
 * OSI Visualizer View: Interactive 7-Layer Stack & Encapsulation Inspector
 */

import React, { useState } from 'react';
import {
  Layers,
  ArrowDown,
  ArrowUp,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
  CheckCircle,
  FileCode,
  Binary,
  Radio,
  Eye,
  Info,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { OSI_LAYERS_INFO } from '../utils/packetPipeline';
import { OsiLayerNumber, ApplicationProtocol, TransportProtocol, ParityType } from '../types/network';
import { bytesToHex, stringToBytes } from '../utils/functional';

export const OsiVisualizerView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const [configOpen, setConfigOpen] = useState(false);

  const {
    packetOptions,
    encapsulatedPacket,
    inspectedOsiLayer,
    isEncapsulationDirection,
    isOsiPlaying,
  } = state;

  const currentLayerInfo = OSI_LAYERS_INFO[inspectedOsiLayer];

  const handleLayerSelect = (layer: OsiLayerNumber) => {
    dispatch({ type: 'SET_INSPECTED_LAYER', payload: layer });
  };

  const toggleDirection = () => {
    const nextDir = !isEncapsulationDirection;
    dispatch({ type: 'SET_ENCAPSULATION_DIRECTION', payload: nextDir });
    notify(
      nextDir
        ? 'Mode Encapsulation actif (Émission : Couche 7 Application -> Couche 1 Physique)'
        : 'Mode Désencapsulation actif (Réception : Couche 1 Physique -> Couche 7 Application)',
      'info'
    );
  };

  const togglePlay = () => {
    dispatch({ type: 'SET_OSI_PLAYING', payload: !isOsiPlaying });
  };

  const handleStep = () => {
    dispatch({ type: 'STEP_OSI_LAYER' });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_PACKET' });
    notify('Paquet réinitialisé aux valeurs par défaut', 'info');
  };

  const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_PACKET_OPTIONS',
      payload: { payloadText: e.target.value },
    });
  };

  const rawBytes = stringToBytes(packetOptions.payloadText);
  const hexPayload = bytesToHex(rawBytes);

  return (
    <div id="osi-visualizer-view" className="space-y-6">
      {/* Top Banner & Controller Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Modèle OSI & Encapsulation des Données
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Visualisez le cheminement des données de la Couche 7 (Application) à la Couche 1 (Physique) avec
              ajout progressif des en-têtes (Headers), du trailer FCS (CRC32) et du train binaire.
            </p>
          </div>

          {/* Control Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Direction Toggle */}
            <button
              id="osi-toggle-direction-btn"
              onClick={toggleDirection}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isEncapsulationDirection
                  ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {isEncapsulationDirection ? (
                <>
                  <ArrowDown className="w-4 h-4 text-pink-400" />
                  <span>Encapsulation (L7 &rarr; L1)</span>
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4 text-emerald-400" />
                  <span>Désencapsulation (L1 &rarr; L7)</span>
                </>
              )}
            </button>

            {/* Play/Pause */}
            <button
              id="osi-play-pause-btn"
              onClick={togglePlay}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                isOsiPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {isOsiPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Animer</span>
                </>
              )}
            </button>

            {/* Step */}
            <button
              id="osi-step-btn"
              onClick={handleStep}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <SkipForward className="w-4 h-4" />
              <span>Pas à pas</span>
            </button>

            {/* Config Drawer Toggle */}
            <button
              id="osi-config-toggle-btn"
              onClick={() => setConfigOpen(!configOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                configOpen
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Configurer Paquet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Packet Config Drawer (Collapsible) */}
      {configOpen && (
        <div
          id="packet-config-panel"
          className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Personnalisation du Paquet Réseau
            </h3>
            <span className="text-xs text-slate-400">Recalcul en temps réel des checksums et CRC32</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Payload text */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Message / Donnée applicative :</label>
              <textarea
                id="config-payload-input"
                rows={2}
                value={packetOptions.payloadText}
                onChange={handlePayloadChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="Entrez votre message applicatif..."
              />
            </div>

            {/* Application Protocol */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Protocole Applicatif (L7) :</label>
              <select
                id="config-app-protocol-select"
                value={packetOptions.appProtocol}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_PACKET_OPTIONS',
                    payload: { appProtocol: e.target.value as ApplicationProtocol },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="HTTP">HTTP/1.1 (Web)</option>
                <option value="DNS">DNS (Résolution de nom)</option>
                <option value="ICMP_ECHO">ICMP Echo Request (Ping)</option>
                <option value="CUSTOM">Donnée Brute Personnalisée</option>
              </select>
            </div>

            {/* Transport Protocol */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Protocole Transport (L4) :</label>
              <select
                id="config-transport-protocol-select"
                value={packetOptions.transportProtocol}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_PACKET_OPTIONS',
                    payload: { transportProtocol: e.target.value as TransportProtocol },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="TCP">TCP (Segment fiable + Connexion)</option>
                <option value="UDP">UDP (Datagramme rapide sans état)</option>
              </select>
            </div>

            {/* Source Port & Dest Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Port Source / Destination :</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={packetOptions.sourcePort}
                  onChange={e =>
                    dispatch({
                      type: 'UPDATE_PACKET_OPTIONS',
                      payload: { sourcePort: parseInt(e.target.value) || 1024 },
                    })
                  }
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono"
                  placeholder="Src (ex: 54321)"
                />
                <input
                  type="number"
                  value={packetOptions.destinationPort}
                  onChange={e =>
                    dispatch({
                      type: 'UPDATE_PACKET_OPTIONS',
                      payload: { destinationPort: parseInt(e.target.value) || 80 },
                    })
                  }
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono"
                  placeholder="Dst (ex: 80)"
                />
              </div>
            </div>

            {/* IP Source & Dest */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">IP Source / Destination :</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={packetOptions.sourceIp}
                  onChange={e =>
                    dispatch({
                      type: 'UPDATE_PACKET_OPTIONS',
                      payload: { sourceIp: e.target.value },
                    })
                  }
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono"
                  placeholder="192.168.1.10"
                />
                <input
                  type="text"
                  value={packetOptions.destinationIp}
                  onChange={e =>
                    dispatch({
                      type: 'UPDATE_PACKET_OPTIONS',
                      payload: { destinationIp: e.target.value },
                    })
                  }
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono"
                  placeholder="198.51.100.25"
                />
              </div>
            </div>

            {/* Parity Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Bit de Parité Couche 1 :</label>
              <select
                id="config-parity-type-select"
                value={packetOptions.parityType}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_PACKET_OPTIONS',
                    payload: { parityType: e.target.value as ParityType },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="even">Parité Paire (Even Parity)</option>
                <option value="odd">Parité Impaire (Odd Parity)</option>
                <option value="none">Aucune parité</option>
              </select>
            </div>

            {/* TTL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">TTL (Time to Live) :</label>
              <input
                type="number"
                min={1}
                max={255}
                value={packetOptions.ttl}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_PACKET_OPTIONS',
                    payload: { ttl: parseInt(e.target.value) || 64 },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Grid: Left = 7-Layer OSI Stack, Right = Detailed PDU & Header Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 7-Layer OSI Model Interactive Stack */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Pile des 7 Couches OSI
            </h2>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              Couche active : L{inspectedOsiLayer} ({currentLayerInfo.pduName})
            </span>
          </div>

          {([7, 6, 5, 4, 3, 2, 1] as OsiLayerNumber[]).map(layerNum => {
            const info = OSI_LAYERS_INFO[layerNum];
            const isSelected = inspectedOsiLayer === layerNum;
            const isEncapsulatedAtThisLayer =
              isEncapsulationDirection ? layerNum >= inspectedOsiLayer : layerNum <= inspectedOsiLayer;

            return (
              <div
                key={layerNum}
                id={`osi-layer-card-${layerNum}`}
                onClick={() => handleLayerSelect(layerNum)}
                className={`cursor-pointer rounded-xl p-3.5 border transition-all relative overflow-hidden group ${
                  isSelected
                    ? `${info.bgClass} ${info.borderClass} ring-2 ring-cyan-400/40 shadow-lg scale-[1.01]`
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80'
                }`}
              >
                {/* Visual indicator bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 transition-all"
                  style={{ backgroundColor: info.color }}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shadow"
                      style={{ backgroundColor: info.color }}
                    >
                      {layerNum}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{info.nameFr}</span>
                        <span className="text-[10px] text-slate-400">({info.nameEn})</span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400">PDU :</span>
                        <span className="font-semibold text-cyan-300">{info.pduName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {info.keyProtocols[0]}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {layerNum === 7 ? 'Donnée' : `+${info.headerSizeTypicalBytes}B En-tête`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Dynamic Visual Packet PDU & Header Inspector */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Layer Deep Dive Card */}
          <div
            id="active-layer-details-card"
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                  style={{ backgroundColor: currentLayerInfo.color }}
                >
                  L{currentLayerInfo.layer}
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Couche {currentLayerInfo.layer} : {currentLayerInfo.nameFr}
                  </h3>
                  <p className="text-xs text-slate-400">{currentLayerInfo.descriptionFr}</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${currentLayerInfo.badgeClass}`}>
                {currentLayerInfo.pduName}
              </span>
            </div>

            {/* Metadata badges: Protocols & Typical Equipments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-semibold block mb-1">Protocoles associés :</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentLayerInfo.keyProtocols.map(proto => (
                    <span
                      key={proto}
                      className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[11px] font-mono border border-slate-700"
                    >
                      {proto}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-semibold block mb-1">Équipement représentatif :</span>
                <p className="text-slate-200 font-medium">{currentLayerInfo.typicalEquipment}</p>
              </div>
            </div>

            {/* Interactive Visual PDU Anatomy / Encapsulation Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Structure Visuelle du Paquet à la Couche {inspectedOsiLayer}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Taille totale : ~{rawBytes.length + (inspectedOsiLayer <= 4 ? 20 : 0) + (inspectedOsiLayer <= 3 ? 20 : 0) + (inspectedOsiLayer <= 2 ? 18 : 0)} Octets
                </span>
              </div>

              {/* Nested Encapsulation Visualizer */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 overflow-x-auto">
                <div className="flex items-stretch gap-1.5 min-w-[500px]">
                  {/* Layer 2: Ethernet Header (Visible if L <= 2) */}
                  {inspectedOsiLayer <= 2 && (
                    <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-lg p-2.5 text-center flex flex-col justify-center min-w-[120px] shrink-0 animate-in zoom-in-95">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        En-tête Ethernet L2 (14B)
                      </span>
                      <p className="text-[11px] font-mono text-emerald-200 font-semibold mt-0.5">
                        MAC: {encapsulatedPacket.dataLinkHeader.destinationMac.slice(0, 8)}...
                      </p>
                      <span className="text-[9px] text-emerald-400/80">Type: 0x0800 (IPv4)</span>
                    </div>
                  )}

                  {/* Layer 3: IP Header (Visible if L <= 3) */}
                  {inspectedOsiLayer <= 3 && (
                    <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-lg p-2.5 text-center flex flex-col justify-center min-w-[110px] shrink-0 animate-in zoom-in-95">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        En-tête IPv4 L3 (20B)
                      </span>
                      <p className="text-[11px] font-mono text-cyan-200 font-semibold mt-0.5">
                        {encapsulatedPacket.networkHeader.sourceIp} &rarr; {encapsulatedPacket.networkHeader.destinationIp}
                      </p>
                      <span className="text-[9px] text-cyan-400/80">
                        TTL: {encapsulatedPacket.networkHeader.ttl} | Chk: {encapsulatedPacket.networkHeader.checksumHex}
                      </span>
                    </div>
                  )}

                  {/* Layer 4: Transport Header (Visible if L <= 4) */}
                  {inspectedOsiLayer <= 4 && (
                    <div className="bg-blue-950/80 border border-blue-500/40 rounded-lg p-2.5 text-center flex flex-col justify-center min-w-[110px] shrink-0 animate-in zoom-in-95">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        En-tête {encapsulatedPacket.transportHeader.protocol} L4 (20B)
                      </span>
                      <p className="text-[11px] font-mono text-blue-200 font-semibold mt-0.5">
                        Port {encapsulatedPacket.transportHeader.sourcePort} &rarr; {encapsulatedPacket.transportHeader.destinationPort}
                      </p>
                      <span className="text-[9px] text-blue-400/80">
                        {packetOptions.transportProtocol === 'TCP' ? 'Flags: PSH, ACK' : 'Pas d’ACK'}
                      </span>
                    </div>
                  )}

                  {/* Layer 7/6/5: Application Payload (Always present inside) */}
                  <div className="flex-1 bg-pink-950/80 border border-pink-500/40 rounded-lg p-2.5 text-center flex flex-col justify-center min-w-[140px]">
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                      Donnée Utile ({encapsulatedPacket.appData.protocol})
                    </span>
                    <p className="text-xs font-mono text-pink-200 truncate mt-0.5 font-semibold">
                      "{packetOptions.payloadText.slice(0, 24)}..."
                    </p>
                    <span className="text-[9px] text-pink-400/80 font-mono">
                      {rawBytes.length} octets ({rawBytes.length * 8} bits)
                    </span>
                  </div>

                  {/* Layer 2 Trailer: FCS CRC-32 (Visible if L <= 2) */}
                  {inspectedOsiLayer <= 2 && (
                    <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-lg p-2.5 text-center flex flex-col justify-center min-w-[90px] shrink-0 animate-in zoom-in-95">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        FCS L2 (4B)
                      </span>
                      <p className="text-[11px] font-mono text-emerald-200 font-semibold mt-0.5">
                        CRC32
                      </p>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">
                        {encapsulatedPacket.dataLinkHeader.fcsCrc32Hex}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Layer-Specific Deep Diagnostic Field Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                Champs de l'En-tête Spécifique (Couche {inspectedOsiLayer})
              </span>

              {inspectedOsiLayer === 7 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Protocole applicatif :</span>
                    <span className="font-mono text-pink-300 font-bold">{packetOptions.appProtocol}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Taille de la charge utile (Payload) :</span>
                    <span className="font-mono text-white">{rawBytes.length} Octets</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Contenu texte :</span>
                    <pre className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-200 font-mono text-xs whitespace-pre-wrap">
                      {packetOptions.payloadText}
                    </pre>
                  </div>
                </div>
              )}

              {inspectedOsiLayer === 6 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Encodage des caractères :</span>
                    <span className="font-mono text-purple-300 font-bold">UTF-8 / ASCII Standard</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Représentation Hexadécimale brute :</span>
                    <span className="font-mono text-purple-200 font-semibold">{hexPayload}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Cette couche s'assure que les données provenant de l'application sont formatées, sérialisées et éventuellement chiffrées (TLS/SSL) avant d'être transmises à la couche session.
                  </div>
                </div>
              )}

              {inspectedOsiLayer === 5 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Type de Session :</span>
                    <span className="font-mono text-indigo-300 font-bold">Dialogue Full-Duplex Client &harr; Serveur</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Identifiant de session :</span>
                    <span className="font-mono text-white">0xFD91A-SESSION-OPEN</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    La couche session gère l’établissement, le maintien et la libération de la liaison logique entre les deux points terminaux applicatifs.
                  </div>
                </div>
              )}

              {inspectedOsiLayer === 4 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Port Source (Émetteur)</span>
                      <span className="font-mono text-blue-300 font-bold text-sm">
                        {encapsulatedPacket.transportHeader.sourcePort}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Port Destination (Service Web)</span>
                      <span className="font-mono text-blue-300 font-bold text-sm">
                        {encapsulatedPacket.transportHeader.destinationPort}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Numéro de séquence (SEQ) :</span>
                    <span className="font-mono text-white">{encapsulatedPacket.transportHeader.sequenceNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">Somme de contrôle L4 (TCP Checksum) :</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {encapsulatedPacket.transportHeader.checksumHex}
                    </span>
                  </div>
                </div>
              )}

              {inspectedOsiLayer === 3 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">IP Source</span>
                      <span className="font-mono text-cyan-300 font-bold text-xs sm:text-sm">
                        {encapsulatedPacket.networkHeader.sourceIp}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">IP Destination</span>
                      <span className="font-mono text-cyan-300 font-bold text-xs sm:text-sm">
                        {encapsulatedPacket.networkHeader.destinationIp}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">TTL (Durée de vie)</span>
                      <span className="font-mono text-white font-bold">{encapsulatedPacket.networkHeader.ttl}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Protocole L4</span>
                      <span className="font-mono text-white font-bold">
                        {encapsulatedPacket.networkHeader.protocolNumber} (TCP)
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Checksum IP</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {encapsulatedPacket.networkHeader.checksumHex}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {inspectedOsiLayer === 2 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">MAC Source (Carte Réseau)</span>
                      <span className="font-mono text-emerald-300 font-bold text-[11px] sm:text-xs">
                        {encapsulatedPacket.dataLinkHeader.sourceMac}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">MAC Destination (Passerelle / Routeur)</span>
                      <span className="font-mono text-emerald-300 font-bold text-[11px] sm:text-xs">
                        {encapsulatedPacket.dataLinkHeader.destinationMac}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-emerald-500/30">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Trailer FCS (Frame Check Sequence CRC-32 IEEE 802.3)</span>
                      <span className="font-mono text-emerald-400 font-extrabold text-sm">
                        {encapsulatedPacket.dataLinkHeader.fcsCrc32Hex}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                      Intégrité Validée
                    </span>
                  </div>
                </div>
              )}

              {inspectedOsiLayer === 1 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Train Binaire Physique (Signaux 0 / 1) :</span>
                    <span className="font-mono text-amber-300 text-xs font-bold">
                      {encapsulatedPacket.physicalData.bitCount} Bits
                    </span>
                  </div>

                  {/* Raw Bit Stream Grouped by Octet */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 max-h-24 overflow-y-auto font-mono text-[11px] leading-relaxed text-amber-200">
                    {encapsulatedPacket.physicalData.bitStream}
                  </div>

                  {/* Parity Bit per byte */}
                  {packetOptions.parityType !== 'none' && (
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-amber-500/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-300 text-xs font-semibold">
                          Bits de Parité calculés ({packetOptions.parityType === 'even' ? 'Parité Paire' : 'Parité Impaire'}) :
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">1 bit / octet</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {encapsulatedPacket.physicalData.parityBits.map((pBit, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono text-[10px]"
                          >
                            Octet {i + 1}: {pBit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
