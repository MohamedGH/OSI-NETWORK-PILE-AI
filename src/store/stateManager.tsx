/**
 * Central Functional State Manager (Reducer + Context Provider)
 * Manages TCP CUBIC/Reno/Tahoe/BBR, Sliding Window, CRC32 & Parity Sandbox,
 * Intra-Town & Inter-City Transit, IPv4 Fragmentation, OSI Stack, and Automated Tests.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  OsiLayerNumber,
  PacketBuilderOptions,
  EncapsulatedPacket,
  BandwidthCalculationParams,
  BandwidthCalculationResult,
  ParityType,
  TestSuiteReport,
  TcpAlgorithm,
  TcpScenarioTab,
  IpFragmentationPlan,
  ReassemblyBufferState,
  TownIncidentType,
  TownPacketType,
  TownFlightPacket,
  TownSimulationMetrics,
  TownSimulationScope,
} from '../types/network';
import {
  TcpEngineState,
  createInitialTcpState,
  stepTcpNormalAck,
  stepTcpTripleDupAck,
  stepTcpTimeoutRto,
} from '../utils/tcpCongestionEngine';
import {
  FragmentationInputOptions,
  calculateIpFragmentation,
  createInitialReassemblyBuffer,
  insertFragmentIntoBuffer,
  tickReassemblyBufferTimer,
} from '../utils/ipFragmentationEngine';
import {
  computeActiveTownPath,
  calculateTownPathMetrics,
  createFlightPacket,
  stepTownPackets,
} from '../utils/townJourneyEngine';
import {
  createDefaultPacketOptions,
  buildEncapsulatedPacket,
  calculateBandwidthMetrics,
} from '../utils/packetPipeline';
import { runAutomatedTestSuite } from '../tests/testSuite';

export interface NetworkState {
  // 1. TCP Congestion (CUBIC, Reno, Tahoe, BBR) & Sliding Window
  readonly tcpEngine: TcpEngineState;
  readonly isTcpPlaying: boolean;
  readonly activeTcpTab: TcpScenarioTab;
  readonly activeSackStep: number;

  // 2. CRC32 & Parity Error Detection Sandbox
  readonly errorInputAscii: string;
  readonly errorParityType: ParityType;
  readonly errorFlippedBits: number[];

  // 3. Intra-Town & Inter-City (Inter-Ville) Transit
  readonly townScope: TownSimulationScope;
  readonly townIncident: TownIncidentType;
  readonly townPacketType: TownPacketType;
  readonly isTownPlaying: boolean;
  readonly townSpeedMultiplier: number;
  readonly selectedTownNodeId: string;
  readonly selectedInterCityNodeId: string;
  readonly showSubterraneanCutaway: boolean;
  readonly townFlightPackets: TownFlightPacket[];
  readonly townMetrics: TownSimulationMetrics;

  // 4. IPv4 Fragmentation & Reassembly (MTU / PMTUD)
  readonly fragOptions: FragmentationInputOptions;
  readonly fragPlan: IpFragmentationPlan;
  readonly reassemblyBuffer: ReassemblyBufferState;
  readonly isFragAutoPlaying: boolean;

  // 5. OSI Stack & Bandwidth / Goodput
  readonly packetOptions: PacketBuilderOptions;
  readonly encapsulatedPacket: EncapsulatedPacket;
  readonly inspectedOsiLayer: OsiLayerNumber;
  readonly bandwidthParams: BandwidthCalculationParams;
  readonly bandwidthResult: BandwidthCalculationResult;

  // 6. Automated Unit Tests
  readonly testReport: TestSuiteReport;
}

export type NetworkAction =
  // TCP Actions
  | { type: 'SET_TCP_ALGO'; payload: TcpAlgorithm }
  | { type: 'STEP_TCP_ACK' }
  | { type: 'INJECT_TCP_DUP_ACK' }
  | { type: 'INJECT_TCP_RTO' }
  | { type: 'SET_TCP_RWND'; payload: number }
  | { type: 'SET_TCP_IN_FLIGHT'; payload: number }
  | { type: 'SET_TCP_TAB'; payload: TcpScenarioTab }
  | { type: 'SET_TCP_PLAYING'; payload: boolean }
  | { type: 'SET_SACK_STEP'; payload: number }
  | { type: 'RESET_TCP_ENGINE' }

  // Error Detection Actions
  | { type: 'SET_ERROR_INPUT'; payload: string }
  | { type: 'SET_ERROR_PARITY_TYPE'; payload: ParityType }
  | { type: 'TOGGLE_FLIPPED_BIT'; payload: number }
  | { type: 'CLEAR_FLIPPED_BITS' }

  // Town & Inter-City Actions
  | { type: 'SET_TOWN_SCOPE'; payload: TownSimulationScope }
  | { type: 'SET_TOWN_INCIDENT'; payload: TownIncidentType }
  | { type: 'SET_TOWN_PACKET_TYPE'; payload: TownPacketType }
  | { type: 'SET_TOWN_PLAYING'; payload: boolean }
  | { type: 'SET_TOWN_SPEED'; payload: number }
  | { type: 'SELECT_TOWN_NODE'; payload: string }
  | { type: 'SELECT_INTERCITY_NODE'; payload: string }
  | { type: 'TOGGLE_SUBTERRANEAN_CUTAWAY' }
  | { type: 'EMIT_TOWN_PACKET'; payload?: TownPacketType }
  | { type: 'STEP_TOWN_SIMULATION' }

  // IP Fragmentation Actions
  | { type: 'UPDATE_FRAG_OPTIONS'; payload: Partial<FragmentationInputOptions> }
  | { type: 'RECEIVE_FRAGMENT_BY_INDEX'; payload: number }
  | { type: 'RECEIVE_NEXT_FRAGMENT' }
  | { type: 'RESET_REASSEMBLY_BUFFER' }
  | { type: 'SET_FRAG_AUTO_PLAY'; payload: boolean }
  | { type: 'TICK_REASSEMBLY_TIMER' }

  // OSI & Bandwidth Actions
  | { type: 'UPDATE_PACKET_OPTIONS'; payload: Partial<PacketBuilderOptions> }
  | { type: 'SET_INSPECTED_LAYER'; payload: OsiLayerNumber }
  | { type: 'UPDATE_BANDWIDTH_PARAMS'; payload: Partial<BandwidthCalculationParams> }

  // Global & Test Actions
  | { type: 'RUN_TEST_SUITE' }
  | { type: 'RESET_ALL' };

const createInitialState = (): NetworkState => {
  const defaultPacketOpts = createDefaultPacketOptions();
  const initialFragOpts: FragmentationInputOptions = {
    packetTotalSize: 4000,
    bottleneckMtu: 1500,
    ingressMtu: 1500,
    isDfSet: false,
    identification: 0x4a2f,
    payloadText: 'HTTP_PAYLOAD_STREAM_DATA_BLOCKS_FOR_IPV4_FRAGMENTATION_AND_REASSEMBLY_RFC791',
    sourceIp: '192.168.1.100',
    destinationIp: '198.51.100.25',
    protocol: 'TCP',
    ttl: 64,
  };
  const initialFragPlan = calculateIpFragmentation(initialFragOpts);
  const initialReassembly = createInitialReassemblyBuffer(initialFragPlan.originalPayloadSize);

  const initialTownPath = computeActiveTownPath('INTRA_TOWN', 'NONE');
  const initialTownCalc = calculateTownPathMetrics(initialTownPath.pathLinks, 'NONE', 540);

  const initialBwParams: BandwidthCalculationParams = {
    nominalBitrateMbps: 1000,
    payloadSizeBytes: 1460,
    mtuBytes: 1500,
    transportProtocol: 'TCP',
    packetLossRatePercent: 0,
    rttMs: 16,
    windowSizeBytes: 65536,
    enableJumboFrames: false,
  };

  // Pre-step CUBIC a few RTTs so the chart has rich initial data on first load
  let initialTcp = createInitialTcpState('CUBIC');
  for (let i = 0; i < 6; i++) {
    initialTcp = stepTcpNormalAck(initialTcp);
  }

  return {
    tcpEngine: initialTcp,
    isTcpPlaying: false,
    activeTcpTab: 'CONGESTION_GRAPH',
    activeSackStep: 1,

    errorInputAscii: '123456789',
    errorParityType: 'even',
    errorFlippedBits: [],

    townScope: 'INTRA_TOWN',
    townIncident: 'NONE',
    townPacketType: 'HTTP_GET',
    isTownPlaying: true,
    townSpeedMultiplier: 1,
    selectedTownNodeId: 'home_laptop',
    selectedInterCityNodeId: 'city_paris_ixp',
    showSubterraneanCutaway: true,
    townFlightPackets: [createFlightPacket('HTTP_GET', initialTownPath.pathLinks)],
    townMetrics: {
      totalPacketsEmitted: 1,
      totalPacketsDelivered: 1,
      totalPacketsDropped: 0,
      totalPacketsRerouted: 0,
      averageTransitLatencyUs: initialTownCalc.totalLatencyUs,
      currentPhysicalPathLengthMeters: initialTownCalc.totalDistanceMeters,
      opticalSignalQualityDb: initialTownCalc.opticalSnrDb,
    },

    fragOptions: initialFragOpts,
    fragPlan: initialFragPlan,
    reassemblyBuffer: initialReassembly,
    isFragAutoPlaying: false,

    packetOptions: defaultPacketOpts,
    encapsulatedPacket: buildEncapsulatedPacket(defaultPacketOpts, 4, true),
    inspectedOsiLayer: 4,
    bandwidthParams: initialBwParams,
    bandwidthResult: calculateBandwidthMetrics(initialBwParams),

    testReport: runAutomatedTestSuite(),
  };
};

export const networkReducer = (state: NetworkState, action: NetworkAction): NetworkState => {
  switch (action.type) {
    case 'SET_TCP_ALGO': {
      let fresh = createInitialTcpState(action.payload);
      for (let i = 0; i < 5; i++) fresh = stepTcpNormalAck(fresh);
      return { ...state, tcpEngine: fresh };
    }
    case 'STEP_TCP_ACK':
      return { ...state, tcpEngine: stepTcpNormalAck(state.tcpEngine) };
    case 'INJECT_TCP_DUP_ACK':
      return { ...state, tcpEngine: stepTcpTripleDupAck(state.tcpEngine) };
    case 'INJECT_TCP_RTO':
      return { ...state, tcpEngine: stepTcpTimeoutRto(state.tcpEngine) };
    case 'SET_TCP_RWND': {
      const rwndMss = Math.max(0, Math.min(36, action.payload));
      return {
        ...state,
        tcpEngine: {
          ...state.tcpEngine,
          rwndMss,
        },
      };
    }
    case 'SET_TCP_IN_FLIGHT': {
      return {
        ...state,
        tcpEngine: {
          ...state.tcpEngine,
          inFlightMss: Math.max(0, action.payload),
        },
      };
    }
    case 'SET_TCP_TAB':
      return { ...state, activeTcpTab: action.payload };
    case 'SET_TCP_PLAYING':
      return { ...state, isTcpPlaying: action.payload };
    case 'SET_SACK_STEP':
      return { ...state, activeSackStep: Math.max(1, Math.min(5, action.payload)) };
    case 'RESET_TCP_ENGINE':
      return { ...state, tcpEngine: createInitialTcpState(state.tcpEngine.algorithm), isTcpPlaying: false };

    // CRC32 & Parity Actions
    case 'SET_ERROR_INPUT':
      return { ...state, errorInputAscii: action.payload, errorFlippedBits: [] };
    case 'SET_ERROR_PARITY_TYPE':
      return { ...state, errorParityType: action.payload };
    case 'TOGGLE_FLIPPED_BIT': {
      const idx = action.payload;
      const exists = state.errorFlippedBits.includes(idx);
      const nextBits = exists
        ? state.errorFlippedBits.filter(b => b !== idx)
        : [...state.errorFlippedBits, idx];
      return { ...state, errorFlippedBits: nextBits };
    }
    case 'CLEAR_FLIPPED_BITS':
      return { ...state, errorFlippedBits: [] };

    // Town & Inter-City Actions
    case 'SET_TOWN_SCOPE': {
      const nextScope = action.payload;
      const defaultIncident: TownIncidentType = 'NONE';
      const pathData = computeActiveTownPath(nextScope, defaultIncident);
      const calc = calculateTownPathMetrics(pathData.pathLinks, defaultIncident, 540);
      return {
        ...state,
        townScope: nextScope,
        townIncident: defaultIncident,
        townFlightPackets: [createFlightPacket(state.townPacketType, pathData.pathLinks)],
        townMetrics: {
          ...state.townMetrics,
          averageTransitLatencyUs: calc.totalLatencyUs,
          currentPhysicalPathLengthMeters: calc.totalDistanceMeters,
          opticalSignalQualityDb: calc.opticalSnrDb,
        },
      };
    }
    case 'SET_TOWN_INCIDENT': {
      const incident = action.payload;
      const pathData = computeActiveTownPath(state.townScope, incident);
      const calc = calculateTownPathMetrics(pathData.pathLinks, incident, 540);
      return {
        ...state,
        townIncident: incident,
        townFlightPackets: [createFlightPacket(state.townPacketType, pathData.pathLinks)],
        townMetrics: {
          ...state.townMetrics,
          averageTransitLatencyUs: calc.totalLatencyUs,
          currentPhysicalPathLengthMeters: calc.totalDistanceMeters,
          opticalSignalQualityDb: calc.opticalSnrDb,
        },
      };
    }
    case 'SET_TOWN_PACKET_TYPE':
      return { ...state, townPacketType: action.payload };
    case 'SET_TOWN_PLAYING':
      return { ...state, isTownPlaying: action.payload };
    case 'SET_TOWN_SPEED':
      return { ...state, townSpeedMultiplier: action.payload };
    case 'SELECT_TOWN_NODE':
      return { ...state, selectedTownNodeId: action.payload };
    case 'SELECT_INTERCITY_NODE':
      return { ...state, selectedInterCityNodeId: action.payload };
    case 'TOGGLE_SUBTERRANEAN_CUTAWAY':
      return { ...state, showSubterraneanCutaway: !state.showSubterraneanCutaway };
    case 'EMIT_TOWN_PACKET': {
      const pType = action.payload ?? state.townPacketType;
      const pathData = computeActiveTownPath(state.townScope, state.townIncident);
      const pkt = createFlightPacket(pType, pathData.pathLinks);
      return {
        ...state,
        townFlightPackets: [...state.townFlightPackets.slice(-10), pkt],
        townMetrics: {
          ...state.townMetrics,
          totalPacketsEmitted: state.townMetrics.totalPacketsEmitted + 1,
        },
      };
    }
    case 'STEP_TOWN_SIMULATION': {
      const pathData = computeActiveTownPath(state.townScope, state.townIncident);
      const stepped = stepTownPackets(
        state.townFlightPackets,
        pathData.pathLinks,
        state.townIncident,
        state.townSpeedMultiplier
      );
      const deliv = stepped.newlyDelivered.length;
      const drop = stepped.newlyDropped.length;
      const activeList =
        stepped.updatedPackets.length === 0
          ? [createFlightPacket(state.townPacketType, pathData.pathLinks)]
          : stepped.updatedPackets;

      return {
        ...state,
        townFlightPackets: activeList,
        townMetrics: {
          ...state.townMetrics,
          totalPacketsDelivered: state.townMetrics.totalPacketsDelivered + deliv,
          totalPacketsDropped: state.townMetrics.totalPacketsDropped + drop,
          totalPacketsRerouted: pathData.isRerouted
            ? state.townMetrics.totalPacketsRerouted + deliv
            : state.townMetrics.totalPacketsRerouted,
        },
      };
    }

    // IPv4 Fragmentation Actions
    case 'UPDATE_FRAG_OPTIONS': {
      const nextOpts: FragmentationInputOptions = { ...state.fragOptions, ...action.payload };
      const nextPlan = calculateIpFragmentation(nextOpts);
      return {
        ...state,
        fragOptions: nextOpts,
        fragPlan: nextPlan,
        reassemblyBuffer: createInitialReassemblyBuffer(nextPlan.originalPayloadSize),
        isFragAutoPlaying: false,
      };
    }
    case 'RECEIVE_FRAGMENT_BY_INDEX': {
      const frag = state.fragPlan.fragments[action.payload];
      if (!frag) return state;
      return {
        ...state,
        reassemblyBuffer: insertFragmentIntoBuffer(state.reassemblyBuffer, frag),
      };
    }
    case 'RECEIVE_NEXT_FRAGMENT': {
      const nextFrag = state.fragPlan.fragments.find(
        f => !state.reassemblyBuffer.receivedFragments.some(rf => rf.fragmentIndex === f.fragmentIndex)
      );
      if (!nextFrag) return { ...state, isFragAutoPlaying: false };
      return {
        ...state,
        reassemblyBuffer: insertFragmentIntoBuffer(state.reassemblyBuffer, nextFrag),
      };
    }
    case 'RESET_REASSEMBLY_BUFFER':
      return {
        ...state,
        reassemblyBuffer: createInitialReassemblyBuffer(state.fragPlan.originalPayloadSize),
        isFragAutoPlaying: false,
      };
    case 'SET_FRAG_AUTO_PLAY':
      return { ...state, isFragAutoPlaying: action.payload };
    case 'TICK_REASSEMBLY_TIMER':
      return {
        ...state,
        reassemblyBuffer: tickReassemblyBufferTimer(state.reassemblyBuffer),
      };

    // OSI & Bandwidth Actions
    case 'UPDATE_PACKET_OPTIONS': {
      const nextOpts = { ...state.packetOptions, ...action.payload };
      return {
        ...state,
        packetOptions: nextOpts,
        encapsulatedPacket: buildEncapsulatedPacket(nextOpts, state.inspectedOsiLayer, true),
      };
    }
    case 'SET_INSPECTED_LAYER':
      return {
        ...state,
        inspectedOsiLayer: action.payload,
        encapsulatedPacket: buildEncapsulatedPacket(state.packetOptions, action.payload, true),
      };
    case 'UPDATE_BANDWIDTH_PARAMS': {
      const nextBw = { ...state.bandwidthParams, ...action.payload };
      return {
        ...state,
        bandwidthParams: nextBw,
        bandwidthResult: calculateBandwidthMetrics(nextBw),
      };
    }

    case 'RUN_TEST_SUITE':
      return { ...state, testReport: runAutomatedTestSuite() };
    case 'RESET_ALL':
      return createInitialState();
    default:
      return state;
  }
};

interface NetworkStoreContextValue {
  readonly state: NetworkState;
  readonly dispatch: React.Dispatch<NetworkAction>;
}

const NetworkStoreContext = createContext<NetworkStoreContextValue | null>(null);

export const NetworkStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(networkReducer, undefined, createInitialState);

  useEffect(() => {
    if (!state.isTcpPlaying) return;
    const timer = setInterval(() => {
      dispatch({ type: 'STEP_TCP_ACK' });
    }, 1200);
    return () => clearInterval(timer);
  }, [state.isTcpPlaying]);

  useEffect(() => {
    if (!state.isTownPlaying) return;
    const timer = setInterval(() => {
      dispatch({ type: 'STEP_TOWN_SIMULATION' });
    }, 60);
    return () => clearInterval(timer);
  }, [state.isTownPlaying, state.townScope, state.townIncident, state.townSpeedMultiplier]);

  useEffect(() => {
    if (!state.isFragAutoPlaying) return;
    const timer = setInterval(() => {
      dispatch({ type: 'RECEIVE_NEXT_FRAGMENT' });
    }, 900);
    return () => clearInterval(timer);
  }, [state.isFragAutoPlaying]);

  return (
    <NetworkStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </NetworkStoreContext.Provider>
  );
};

export const useNetworkStore = (): NetworkStoreContextValue => {
  const ctx = useContext(NetworkStoreContext);
  if (!ctx) {
    throw new Error('useNetworkStore must be used within a NetworkStoreProvider');
  }
  return ctx;
};
