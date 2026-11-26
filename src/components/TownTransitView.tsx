/**
 * Intra-Town & Inter-City (Inter-Ville) Network Transit View
 * Lets the user switch between Intra-Town FTTH/5G loop and Inter-City National DWDM Backbone,
 * trigger real-world optical/radio incidents, and inspect node telemetry.
 */

import React from 'react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { TownPacketCanvas } from './TownPacketCanvas';
import {
  TOWN_NODES,
  INTERCITY_NODES,
  computeActiveTownPath,
  calculateTownPathMetrics,
} from '../utils/townJourneyEngine';
import { TownIncidentType, TownPacketType, TownSimulationScope } from '../types/network';

export const TownTransitView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const {
    townScope,
    townIncident,
    townPacketType,
    townSpeedMultiplier,
    selectedTownNodeId,
    selectedInterCityNodeId,
    townMetrics,
  } = state;

  const activePath = computeActiveTownPath(townScope, townIncident);
  const pathMetrics = calculateTownPathMetrics(activePath.pathLinks, townIncident, 1500);

  const selectedTownNode = TOWN_NODES.find(n => n.id === selectedTownNodeId) || TOWN_NODES[0];
  const selectedCityNode = INTERCITY_NODES.find(n => n.id === selectedInterCityNodeId) || INTERCITY_NODES[0];

  const handleScopeChange = (scope: TownSimulationScope) => {
    dispatch({ type: 'SET_TOWN_SCOPE', payload: scope });
    notify(
      scope === 'INTER_CITIES'
        ? 'Mode Dorsale Inter-Ville DWDM activé (Paris – Bourgogne – Lyon – Marseille)'
        : 'Mode Boucle Locale Intra-Ville activé (FTTH, 5G & Siphon fluvial)',
      'info'
    );
  };

  const handleIncident = (inc: TownIncidentType) => {
    dispatch({ type: 'SET_TOWN_INCIDENT', payload: inc });
    notify(`Scénario physique appliqué : ${inc}`, inc === 'NONE' ? 'success' : 'warning');
  };

  return (
    <div className="space-y-8">
      {/* Header & Scale Switcher */}
      <div className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs text-slate-400">
            <span>Ingénierie Télécom</span>
            <span className="mx-2">·</span>
            <span>FTTH G.652D (1310 nm)</span>
            <span className="mx-2">·</span>
            <span>DWDM Bande C (1550 nm)</span>
            <span className="mx-2">·</span>
            <span>Amplification EDFA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Traversée du Paquet : Intra-Ville & Dorsale Inter-Ville
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Observez la propagation physique à <code className="text-sky-300">204 190 km/s</code> dans le verre de silice, depuis le quartier résidentiel jusqu’aux artères nationales DWDM reliant Paris, Lyon et Marseille.
          </p>
        </div>

        {/* Scope Selector: Intra-Ville vs Inter-Ville */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start">
          {[
            { id: 'INTRA_TOWN', label: '1. Réseau Intra-Ville (Métropole)' },
            { id: 'INTER_CITIES', label: '2. Dorsale Inter-Ville (Paris–Marseille)' },
          ].map(sc => (
            <button
              key={sc.id}
              onClick={() => handleScopeChange(sc.id as TownSimulationScope)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                townScope === sc.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone (8 cols): Interactive 60 FPS Canvas & Node Inspector */}
        <div className="lg:col-span-8 space-y-6">
          <TownPacketCanvas />

          {/* Selected Infrastructure Node Inspector */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            {townScope === 'INTER_CITIES' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">{selectedCityNode.name}</h2>
                    <div className="text-xs text-slate-400">
                      {selectedCityNode.regionName} · Système Autonome BGP <span className="font-mono text-sky-400">{selectedCityNode.asName}</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 tabular-nums">
                    Capacité DWDM : {selectedCityNode.dwdmCapacityTbps} Tbps ({selectedCityNode.activeWavelengths} λ)
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedCityNode.descriptionFr}</p>
                <div className="grid grid-cols-3 gap-3 font-mono text-xs tabular-nums">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[11px]">Gain Amplificateur EDFA</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">+{selectedCityNode.edfaGainDb} dB</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[11px]">Rapport OSNR Optique</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{selectedCityNode.osnrDb} dB</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[11px]">Longueurs d’onde actives</div>
                    <div className="text-sm font-bold text-sky-400 mt-0.5">{selectedCityNode.activeWavelengths} canaux</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">{selectedTownNode.label}</h2>
                    <div className="text-xs text-slate-400">
                      {selectedTownNode.districtName} · {selectedTownNode.equipmentModel}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-sky-400">
                    Couche OSI L{selectedTownNode.osiLayer}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedTownNode.descriptionFr}</p>
                <div className="grid grid-cols-3 gap-3 font-mono text-xs tabular-nums">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[11px]">Bilan Optique</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {selectedTownNode.opticalPowerDbm !== 0 ? `${selectedTownNode.opticalPowerDbm} dBm` : 'Radio / Cuivre'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[11px]">Charge File Tampon</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">{selectedTownNode.queueLoadPercent}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[11px]">Adresse IP / MAC</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                      {selectedTownNode.ipAddress || selectedTownNode.macAddress || 'Passif L1'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Zone (4 cols): Incidents, Packet Type & Telemetry */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-6">
          {/* Incident Controls */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Incidents Physiques & Résilience</h2>
            <div className="space-y-2">
              {(townScope === 'INTER_CITIES'
                ? [
                    { id: 'NONE', label: '● Nominal : Artère LGV Fibre G.652D' },
                    { id: 'TGV_FIBER_CUT', label: '▲ Rupture LGV : Protection RTE 400 kV OPGW' },
                    { id: 'EDFA_PUMP_FAIL', label: '▲ Dégradation Pompage Laser EDFA (OSNR)' },
                  ]
                : [
                    { id: 'NONE', label: '● Nominal : Boucle FTTH & Siphon Fluvial' },
                    { id: 'FIBER_CUT', label: '▲ Coup de Pelleteuse : Basculement 5G 28 GHz' },
                    { id: 'RAIN_STORM', label: '▲ Orage 60 mm/h : Atténuation ITU-R P.838' },
                    { id: 'RUSH_HOUR', label: '▲ Heure de Pointe : Bufferbloat Routeur POP' },
                  ]
              ).map(inc => (
                <button
                  key={inc.id}
                  onClick={() => handleIncident(inc.id as TownIncidentType)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    townIncident === inc.id
                      ? 'bg-sky-950/60 border-sky-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {inc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Packet Type & Speed */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Profil de Flux Applicatif</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['HTTP_GET', 'STREAM_4K', 'ICMP_PING', 'VOIP_CALL'] as TownPacketType[]).map(pt => (
                <button
                  key={pt}
                  onClick={() => {
                    dispatch({ type: 'SET_TOWN_PACKET_TYPE', payload: pt });
                    dispatch({ type: 'EMIT_TOWN_PACKET', payload: pt });
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    townPacketType === pt
                      ? 'bg-slate-800 border-sky-500 text-sky-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Vitesse d’animation</span>
                <span className="font-mono text-sky-400">{townSpeedMultiplier}x</span>
              </div>
              <div className="flex gap-1.5">
                {[0.5, 1, 2, 4].map(spd => (
                  <button
                    key={spd}
                    onClick={() => dispatch({ type: 'SET_TOWN_SPEED', payload: spd })}
                    className={`flex-1 py-1.5 rounded text-xs font-mono font-semibold border ${
                      townSpeedMultiplier === spd
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Physical Telemetry Summary */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Bilan Physique de Traversée</h3>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Distance Optique</div>
                <div className="text-sm font-bold text-sky-400 mt-0.5">
                  {pathMetrics.totalDistanceMeters >= 10000
                    ? `${(pathMetrics.totalDistanceMeters / 1000).toFixed(0)} km`
                    : `${pathMetrics.totalDistanceMeters} m`}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Délai Propagation</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {pathMetrics.totalLatencyUs >= 1000
                    ? `${(pathMetrics.totalLatencyUs / 1000).toFixed(2)} ms`
                    : `${pathMetrics.totalLatencyUs} µs`}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Rapport OSNR / SNR</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">{pathMetrics.opticalSnrDb} dB</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[11px]">Paquets Livrés</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{townMetrics.totalPacketsDelivered}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
