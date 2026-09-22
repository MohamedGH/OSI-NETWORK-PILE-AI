/**
 * Network Simulator Central State Manager (Pure Functional State & Reducer)
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
} from '../types/network';
import { createDefaultPacketOptions, buildEncapsulatedPacket } from '../utils/packetPipeline';
import { calculateBandwidthMetrics } from '../utils/networkCalculations';
import { runAutomatedTestSuite } from '../tests/testSuite';
import {
  TcpEngineState,
  INITIAL_TCP_STATE,
  stepTcpNormalAck,
  stepTcpTripleDupAck,
  stepTcpTimeoutRto,
} from '../utils/tcpCongestionEngine';

export interface NetworkState {
  // OSI & Packet Pipeline
  readonly packetOptions: PacketBuilderOptions;
  readonly encapsulatedPacket: EncapsulatedPacket;
  readonly inspectedOsiLayer: OsiLayerNumber;
  readonly isEncapsulationDirection: boolean; // true = L7 -> L1, false = L1 -> L7
  readonly isOsiPlaying: boolean;

  // Stack-to-Stack Full Journey (Host A Stack -> Network Wire -> Host B Stack)
  readonly stackJourneyStep: number; // 1 to 10
  readonly isStackJourneyPlaying: boolean;
  readonly stackJourneySpeed: number; // 0.5, 1, 1.5, 2

  // TCP Congestion, Flow Control & Reliability Engine
  readonly tcpEngine: TcpEngineState;
  readonly isTcpEnginePlaying: boolean;
  readonly activeTcpTab: TcpScenarioTab;
  readonly activeTcpScenarioStep: number;

  // Network Journey (L2/L3 Hops)
  readonly activeJourneyStep: number;
  readonly isJourneyPlaying: boolean;

  // Bandwidth & Throughput Simulator
  readonly bandwidthParams: BandwidthCalculationParams;
  readonly bandwidthResult: BandwidthCalculationResult;

  // Error Detection Sandbox
  readonly errorSandboxInput: string;
  readonly errorSandboxParityType: ParityType;
  readonly errorSandboxFlippedBits: number[];

  // Tests
  readonly testReport: TestSuiteReport;
}

export type NetworkAction =
  | { type: 'UPDATE_PACKET_OPTIONS'; payload: Partial<PacketBuilderOptions> }
  | { type: 'SET_INSPECTED_LAYER'; payload: OsiLayerNumber }
  | { type: 'SET_ENCAPSULATION_DIRECTION'; payload: boolean }
  | { type: 'SET_OSI_PLAYING'; payload: boolean }
  | { type: 'STEP_OSI_LAYER' }
  | { type: 'RESET_PACKET' }
  
  // Stack-to-Stack Journey Actions
  | { type: 'SET_STACK_JOURNEY_STEP'; payload: number }
  | { type: 'SET_STACK_JOURNEY_PLAYING'; payload: boolean }
  | { type: 'SET_STACK_JOURNEY_SPEED'; payload: number }
  | { type: 'NEXT_STACK_JOURNEY_STEP' }
  | { type: 'PREV_STACK_JOURNEY_STEP' }
  | { type: 'RESET_STACK_JOURNEY' }

  // TCP Congestion Engine Actions
  | { type: 'SET_TCP_ALGO'; payload: TcpAlgorithm }
  | { type: 'STEP_TCP_ACK' }
  | { type: 'INJECT_TCP_TRIPLE_DUP_ACK' }
  | { type: 'INJECT_TCP_RTO_TIMEOUT' }
  | { type: 'RESET_TCP_ENGINE' }
  | { type: 'SET_TCP_ENGINE_PLAYING'; payload: boolean }
  | { type: 'SET_TCP_RWND'; payload: number }
  | { type: 'SET_TCP_TAB'; payload: TcpScenarioTab }
  | { type: 'SET_TCP_SCENARIO_STEP'; payload: number }
  | { type: 'NEXT_TCP_SCENARIO_STEP'; payload: number } // max steps
  | { type: 'PREV_TCP_SCENARIO_STEP'; payload: number }

  // Journey Actions
  | { type: 'SET_JOURNEY_STEP'; payload: number }
  | { type: 'SET_JOURNEY_PLAYING'; payload: boolean }
  | { type: 'NEXT_JOURNEY_STEP' }
  | { type: 'PREV_JOURNEY_STEP' }
  | { type: 'RESET_JOURNEY' }
  
  // Bandwidth Actions
  | { type: 'UPDATE_BANDWIDTH_PARAMS'; payload: Partial<BandwidthCalculationParams> }
  
  // Error Sandbox Actions
  | { type: 'SET_ERROR_INPUT'; payload: string }
  | { type: 'SET_ERROR_PARITY_TYPE'; payload: ParityType }
  | { type: 'TOGGLE_FLIPPED_BIT'; payload: number }
  | { type: 'CLEAR_FLIPPED_BITS' }
  
  // Test Actions
  | { type: 'RUN_TEST_SUITE' };

const initialDefaultOptions = createDefaultPacketOptions();
const initialPacket = buildEncapsulatedPacket(initialDefaultOptions, 7, true);

const initialBandwidthParams: BandwidthCalculationParams = {
  nominalBitrateMbps: 1000, // 1 Gbps
  payloadSizeBytes: 1460, // Standard MSS
  mtuBytes: 1500,
  transportProtocol: 'TCP',
  packetLossRatePercent: 0,
  rttMs: 15,
  windowSizeBytes: 65536,
  enableJumboFrames: false,
  useBinaryUnits: false,
};

const initialBandwidthResult = calculateBandwidthMetrics(initialBandwidthParams);
const initialTestReport = runAutomatedTestSuite();

const initialNetworkState: NetworkState = {
  packetOptions: initialDefaultOptions,
  encapsulatedPacket: initialPacket,
  inspectedOsiLayer: 7,
  isEncapsulationDirection: true,
  isOsiPlaying: false,

  stackJourneyStep: 1,
  isStackJourneyPlaying: false,
  stackJourneySpeed: 1,

  tcpEngine: INITIAL_TCP_STATE,
  isTcpEnginePlaying: false,
  activeTcpTab: 'CONGESTION_GRAPH',
  activeTcpScenarioStep: 1,

  activeJourneyStep: 1,
  isJourneyPlaying: false,

  bandwidthParams: initialBandwidthParams,
  bandwidthResult: initialBandwidthResult,

  errorSandboxInput: 'HELLO NETWORK',
  errorSandboxParityType: 'even',
  errorSandboxFlippedBits: [],

  testReport: initialTestReport,
};

export const networkReducer = (state: NetworkState, action: NetworkAction): NetworkState => {
  switch (action.type) {
    case 'UPDATE_PACKET_OPTIONS': {
      const updatedOptions: PacketBuilderOptions = {
        ...state.packetOptions,
        ...action.payload,
      };
      const updatedPacket = buildEncapsulatedPacket(
        updatedOptions,
        state.inspectedOsiLayer,
        state.isEncapsulationDirection
      );
      return {
        ...state,
        packetOptions: updatedOptions,
        encapsulatedPacket: updatedPacket,
      };
    }

    case 'SET_INSPECTED_LAYER':
      return {
        ...state,
        inspectedOsiLayer: action.payload,
        encapsulatedPacket: {
          ...state.encapsulatedPacket,
          currentLayer: action.payload,
        },
      };

    case 'SET_ENCAPSULATION_DIRECTION':
      return {
        ...state,
        isEncapsulationDirection: action.payload,
        encapsulatedPacket: {
          ...state.encapsulatedPacket,
          isEncapsulating: action.payload,
        },
      };

    case 'SET_OSI_PLAYING':
      return {
        ...state,
        isOsiPlaying: action.payload,
      };

    case 'STEP_OSI_LAYER': {
      if (state.isEncapsulationDirection) {
        // Going down 7 -> 1
        const nextLayer = (state.inspectedOsiLayer > 1 ? state.inspectedOsiLayer - 1 : 7) as OsiLayerNumber;
        return {
          ...state,
          inspectedOsiLayer: nextLayer,
          encapsulatedPacket: {
            ...state.encapsulatedPacket,
            currentLayer: nextLayer,
          },
        };
      } else {
        // Going up 1 -> 7 (Decapsulation)
        const nextLayer = (state.inspectedOsiLayer < 7 ? state.inspectedOsiLayer + 1 : 1) as OsiLayerNumber;
        return {
          ...state,
          inspectedOsiLayer: nextLayer,
          encapsulatedPacket: {
            ...state.encapsulatedPacket,
            currentLayer: nextLayer,
          },
        };
      }
    }

    case 'RESET_PACKET': {
      const resetOpts = createDefaultPacketOptions();
      const resetPkt = buildEncapsulatedPacket(resetOpts, 7, true);
      return {
        ...state,
        packetOptions: resetOpts,
        encapsulatedPacket: resetPkt,
        inspectedOsiLayer: 7,
        isEncapsulationDirection: true,
        isOsiPlaying: false,
      };
    }

    // Stack-to-Stack Full Journey Actions
    case 'SET_STACK_JOURNEY_STEP':
      return {
        ...state,
        stackJourneyStep: Math.max(1, Math.min(10, action.payload)),
      };

    case 'SET_STACK_JOURNEY_PLAYING':
      return {
        ...state,
        isStackJourneyPlaying: action.payload,
      };

    case 'SET_STACK_JOURNEY_SPEED':
      return {
        ...state,
        stackJourneySpeed: action.payload,
      };

    case 'NEXT_STACK_JOURNEY_STEP':
      return {
        ...state,
        stackJourneyStep: state.stackJourneyStep < 10 ? state.stackJourneyStep + 1 : 1,
      };

    case 'PREV_STACK_JOURNEY_STEP':
      return {
        ...state,
        stackJourneyStep: state.stackJourneyStep > 1 ? state.stackJourneyStep - 1 : 10,
      };

    case 'RESET_STACK_JOURNEY':
      return {
        ...state,
        stackJourneyStep: 1,
        isStackJourneyPlaying: false,
      };

    // TCP Engine Actions
    case 'SET_TCP_ALGO':
      return {
        ...state,
        tcpEngine: {
          ...state.tcpEngine,
          algorithm: action.payload,
          lastEvent: `Algorithme sélectionné : TCP ${action.payload}`,
        },
      };

    case 'STEP_TCP_ACK':
      return {
        ...state,
        tcpEngine: stepTcpNormalAck(state.tcpEngine),
      };

    case 'INJECT_TCP_TRIPLE_DUP_ACK':
      return {
        ...state,
        tcpEngine: stepTcpTripleDupAck(state.tcpEngine),
      };

    case 'INJECT_TCP_RTO_TIMEOUT':
      return {
        ...state,
        tcpEngine: stepTcpTimeoutRto(state.tcpEngine),
      };

    case 'RESET_TCP_ENGINE':
      return {
        ...state,
        tcpEngine: INITIAL_TCP_STATE,
        isTcpEnginePlaying: false,
        activeTcpScenarioStep: 1,
      };

    case 'SET_TCP_ENGINE_PLAYING':
      return {
        ...state,
        isTcpEnginePlaying: action.payload,
      };

    case 'SET_TCP_RWND':
      return {
        ...state,
        tcpEngine: {
          ...state.tcpEngine,
          rwndMss: Math.max(0, Math.min(64, action.payload)),
          lastEvent: `Fenêtre récepteur rwnd ajustée à ${action.payload} MSS`,
        },
      };

    case 'SET_TCP_TAB':
      return {
        ...state,
        activeTcpTab: action.payload,
        activeTcpScenarioStep: 1,
      };

    case 'SET_TCP_SCENARIO_STEP':
      return {
        ...state,
        activeTcpScenarioStep: action.payload,
      };

    case 'NEXT_TCP_SCENARIO_STEP':
      return {
        ...state,
        activeTcpScenarioStep:
          state.activeTcpScenarioStep < action.payload ? state.activeTcpScenarioStep + 1 : 1,
      };

    case 'PREV_TCP_SCENARIO_STEP':
      return {
        ...state,
        activeTcpScenarioStep:
          state.activeTcpScenarioStep > 1 ? state.activeTcpScenarioStep - 1 : action.payload,
      };

    // Journey Actions
    case 'SET_JOURNEY_STEP':
      return {
        ...state,
        activeJourneyStep: Math.max(1, Math.min(5, action.payload)),
      };

    case 'SET_JOURNEY_PLAYING':
      return {
        ...state,
        isJourneyPlaying: action.payload,
      };

    case 'NEXT_JOURNEY_STEP':
      return {
        ...state,
        activeJourneyStep: state.activeJourneyStep < 5 ? state.activeJourneyStep + 1 : 1,
      };

    case 'PREV_JOURNEY_STEP':
      return {
        ...state,
        activeJourneyStep: state.activeJourneyStep > 1 ? state.activeJourneyStep - 1 : 5,
      };

    case 'RESET_JOURNEY':
      return {
        ...state,
        activeJourneyStep: 1,
        isJourneyPlaying: false,
      };

    // Bandwidth Actions
    case 'UPDATE_BANDWIDTH_PARAMS': {
      const updatedParams: BandwidthCalculationParams = {
        ...state.bandwidthParams,
        ...action.payload,
      };
      const updatedResult = calculateBandwidthMetrics(updatedParams);
      return {
        ...state,
        bandwidthParams: updatedParams,
        bandwidthResult: updatedResult,
      };
    }

    // Error Sandbox Actions
    case 'SET_ERROR_INPUT':
      return {
        ...state,
        errorSandboxInput: action.payload,
        errorSandboxFlippedBits: [],
      };

    case 'SET_ERROR_PARITY_TYPE':
      return {
        ...state,
        errorSandboxParityType: action.payload,
      };

    case 'TOGGLE_FLIPPED_BIT': {
      const bitIdx = action.payload;
      const alreadyFlipped = state.errorSandboxFlippedBits.includes(bitIdx);
      const newFlipped = alreadyFlipped
        ? state.errorSandboxFlippedBits.filter(i => i !== bitIdx)
        : [...state.errorSandboxFlippedBits, bitIdx];
      return {
        ...state,
        errorSandboxFlippedBits: newFlipped,
      };
    }

    case 'CLEAR_FLIPPED_BITS':
      return {
        ...state,
        errorSandboxFlippedBits: [],
      };

    case 'RUN_TEST_SUITE':
      return {
        ...state,
        testReport: runAutomatedTestSuite(),
      };

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
  const [state, dispatch] = useReducer(networkReducer, initialNetworkState);

  // Auto-play timer for OSI encapsulation animation
  useEffect(() => {
    if (!state.isOsiPlaying) return;
    const interval = setInterval(() => {
      dispatch({ type: 'STEP_OSI_LAYER' });
    }, 2000);
    return () => clearInterval(interval);
  }, [state.isOsiPlaying]);

  // Auto-play timer for Network Journey animation
  useEffect(() => {
    if (!state.isJourneyPlaying) return;
    const interval = setInterval(() => {
      dispatch({ type: 'NEXT_JOURNEY_STEP' });
    }, 3500);
    return () => clearInterval(interval);
  }, [state.isJourneyPlaying]);

  // Auto-play timer for Stack-to-Stack Full Journey animation
  useEffect(() => {
    if (!state.isStackJourneyPlaying) return;
    const baseDuration = 3200;
    const intervalDuration = baseDuration / (state.stackJourneySpeed || 1);
    const interval = setInterval(() => {
      dispatch({ type: 'NEXT_STACK_JOURNEY_STEP' });
    }, intervalDuration);
    return () => clearInterval(interval);
  }, [state.isStackJourneyPlaying, state.stackJourneySpeed]);

  // Auto-play timer for TCP Congestion Engine
  useEffect(() => {
    if (!state.isTcpEnginePlaying) return;
    const interval = setInterval(() => {
      dispatch({ type: 'STEP_TCP_ACK' });
    }, 1800);
    return () => clearInterval(interval);
  }, [state.isTcpEnginePlaying]);

  return (
    <NetworkStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </NetworkStoreContext.Provider>
  );
};

export const useNetworkStore = (): NetworkStoreContextValue => {
  const context = useContext(NetworkStoreContext);
  if (!context) {
    throw new Error('useNetworkStore must be used within a NetworkStoreProvider');
  }
  return context;
};
