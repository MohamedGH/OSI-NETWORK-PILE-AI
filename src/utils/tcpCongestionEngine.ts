/**
 * TCP Congestion Control (CUBIC RFC 8312, Reno RFC 5681, Tahoe, BBR) & Sliding Window Engine
 * Pure functional implementation with mathematical precision.
 */

import {
  TcpAlgorithm,
  TcpCongestionPhase,
  TcpRttDataPoint,
  TcpSegmentBlock,
  TcpLossScenarioStep,
} from '../types/network';
import { clamp, roundTo } from './functional';

export interface TcpEngineState {
  readonly algorithm: TcpAlgorithm;
  readonly currentRtt: number;
  readonly cwndMss: number;
  readonly ssthreshMss: number;
  readonly rwndMss: number;
  readonly wMaxMss: number;
  readonly epochStartRtt: number;
  readonly phase: TcpCongestionPhase;
  readonly history: TcpRttDataPoint[];
  readonly baseSeqNum: number;
  readonly inFlightMss: number;
  readonly mssBytes: number;
}

export const CUBIC_C = 0.4;
export const CUBIC_BETA = 0.7; // Multiplicative decrease factor in RFC 8312 (retains 70% of W_max)

/**
 * Computes CUBIC window size W_cubic(t) = C * (t - K)^3 + W_max
 * where K = cubic_root(W_max * (1 - beta) / C)
 */
export const calculateCubicWindow = (
  tRtts: number,
  wMaxMss: number,
  cParam = CUBIC_C,
  betaParam = CUBIC_BETA
): { readonly wCubicMss: number; readonly kFactor: number } => {
  const kFactor = Math.cbrt((wMaxMss * (1 - betaParam)) / cParam);
  const delta = tRtts - kFactor;
  const wCubic = cParam * Math.pow(delta, 3) + wMaxMss;
  return {
    wCubicMss: roundTo(Math.max(1, wCubic), 2),
    kFactor: roundTo(kFactor, 2),
  };
};

export const createInitialTcpState = (algorithm: TcpAlgorithm = 'CUBIC'): TcpEngineState => {
  const initialPoint: TcpRttDataPoint = {
    rttIndex: 0,
    cwndMss: 1,
    ssthreshMss: 16,
    rwndMss: 24,
    effectiveWindowMss: 1,
    phase: 'SLOW_START',
    eventDescription: `Initialisation ${algorithm} : cwnd = 1 MSS, ssthresh = 16 MSS`,
    wMaxMss: 20,
  };

  return {
    algorithm,
    currentRtt: 0,
    cwndMss: 1,
    ssthreshMss: 16,
    rwndMss: 24,
    wMaxMss: 20,
    epochStartRtt: 0,
    phase: 'SLOW_START',
    history: [initialPoint],
    baseSeqNum: 100,
    inFlightMss: 1,
    mssBytes: 1460,
  };
};

export const INITIAL_TCP_STATE: TcpEngineState = createInitialTcpState('CUBIC');

/**
 * Pure transition for a normal RTT acknowledgment without packet loss
 */
export const stepTcpNormalAck = (state: TcpEngineState): TcpEngineState => {
  const nextRtt = state.currentRtt + 1;
  let nextCwnd = state.cwndMss;
  let nextPhase: TcpCongestionPhase = state.phase;
  let nextEpochStart = state.epochStartRtt;
  let desc = '';

  if (state.algorithm === 'BBR') {
    // BBR ProbeBW pacing gain cycle: [1.25, 0.75, 1, 1, 1, 1, 1, 1]
    const bbrCycleGains = [1.25, 0.75, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const bdpEstimate = 18; // Estimated Bottleneck Bandwidth * RTprop in MSS
    if (state.cwndMss < bdpEstimate && state.phase === 'SLOW_START') {
      nextCwnd = roundTo(Math.min(bdpEstimate, state.cwndMss * 2), 2);
      nextPhase = nextCwnd >= bdpEstimate ? 'BBR_PROBE_BW' : 'SLOW_START';
      desc = `BBR Startup : recherche rapide du BDP (${nextCwnd} MSS)`;
    } else {
      nextPhase = 'BBR_PROBE_BW';
      const gain = bbrCycleGains[nextRtt % bbrCycleGains.length];
      nextCwnd = roundTo(bdpEstimate * gain, 2);
      desc = `BBR ProbeBW : pacing_gain = ${gain}x autour du BDP (${nextCwnd} MSS)`;
    }
  } else if (state.cwndMss < state.ssthreshMss) {
    // Exponential Slow Start for CUBIC, Reno, Tahoe
    nextCwnd = roundTo(Math.min(state.ssthreshMss, state.cwndMss * 2), 2);
    nextPhase = nextCwnd >= state.ssthreshMss ? 'CONGESTION_AVOIDANCE' : 'SLOW_START';
    if (nextPhase === 'CONGESTION_AVOIDANCE') {
      nextEpochStart = nextRtt;
    }
    desc = `Slow Start exponentiel : cwnd double à ${nextCwnd} MSS`;
  } else {
    nextPhase = 'CONGESTION_AVOIDANCE';
    if (state.algorithm === 'CUBIC') {
      const tElapsed = Math.max(1, nextRtt - state.epochStartRtt);
      const { wCubicMss, kFactor } = calculateCubicWindow(tElapsed, state.wMaxMss);
      // Ensure monotonic growth or concave plateau toward W_max then convex probing
      nextCwnd = roundTo(Math.max(state.cwndMss + 0.35, wCubicMss), 2);
      const region = tElapsed < kFactor ? 'profil concave vers W_max' : 'sonde convexe au-delà de W_max';
      desc = `CUBIC W(t=${tElapsed}) = ${nextCwnd} MSS (${region}, K=${kFactor})`;
    } else {
      // Reno & Tahoe AIMD: +1 MSS per RTT
      nextCwnd = roundTo(state.cwndMss + 1, 2);
      desc = `${state.algorithm} Évitement de congestion (AIMD) : +1 MSS -> ${nextCwnd} MSS`;
    }
  }

  nextCwnd = clamp(nextCwnd, 1, 42);
  const effectiveWin = roundTo(Math.min(nextCwnd, state.rwndMss), 2);

  const point: TcpRttDataPoint = {
    rttIndex: nextRtt,
    cwndMss: nextCwnd,
    ssthreshMss: state.ssthreshMss,
    rwndMss: state.rwndMss,
    effectiveWindowMss: effectiveWin,
    phase: nextPhase,
    eventDescription: desc,
    wMaxMss: state.wMaxMss,
  };

  return {
    ...state,
    currentRtt: nextRtt,
    cwndMss: nextCwnd,
    phase: nextPhase,
    epochStartRtt: nextEpochStart,
    baseSeqNum: state.baseSeqNum + Math.max(1, Math.floor(effectiveWin / 2)),
    inFlightMss: Math.min(Math.ceil(effectiveWin), Math.max(1, Math.floor(effectiveWin * 0.75))),
    history: [...state.history.slice(-28), point],
  };
};

/**
 * Pure transition when 3 Duplicate ACKs are received (Fast Retransmit / Fast Recovery)
 */
export const stepTcpTripleDupAck = (state: TcpEngineState): TcpEngineState => {
  const nextRtt = state.currentRtt + 1;
  const recordedWMax = state.cwndMss;
  let newSsthresh = state.ssthreshMss;
  let newCwnd = state.cwndMss;
  let nextPhase: TcpCongestionPhase = 'FAST_RECOVERY';
  let desc = '';

  if (state.algorithm === 'CUBIC') {
    // CUBIC RFC 8312: Multiplicative decrease by beta = 0.7
    newSsthresh = roundTo(Math.max(2, state.cwndMss * CUBIC_BETA), 2);
    newCwnd = newSsthresh;
    desc = `3 Dup-ACK (CUBIC) : W_max = ${recordedWMax} MSS, réduction 0.7x -> cwnd = ssthresh = ${newCwnd} MSS`;
  } else if (state.algorithm === 'RENO') {
    // Reno: Halve cwnd (0.5x) and enter Fast Recovery
    newSsthresh = roundTo(Math.max(2, Math.floor(state.cwndMss / 2)), 2);
    newCwnd = newSsthresh;
    desc = `3 Dup-ACK (Reno Fast Recovery) : ssthresh = cwnd = ${newCwnd} MSS (réduction 50%)`;
  } else if (state.algorithm === 'TAHOE') {
    // Tahoe: Treats 3 Dup-ACK like Timeout -> resets cwnd to 1 MSS!
    newSsthresh = roundTo(Math.max(2, Math.floor(state.cwndMss / 2)), 2);
    newCwnd = 1;
    nextPhase = 'SLOW_START';
    desc = `3 Dup-ACK (Tahoe) : ssthresh = ${newSsthresh} MSS, chute radicale cwnd = 1 MSS (Slow Start)`;
  } else {
    // BBR: Modest pacing adjustment on loss
    newSsthresh = state.ssthreshMss;
    newCwnd = roundTo(Math.max(4, state.cwndMss * 0.85), 2);
    nextPhase = 'BBR_PROBE_BW';
    desc = `3 Dup-ACK (BBR) : maintien du débit proche du BDP (${newCwnd} MSS)`;
  }

  const effectiveWin = roundTo(Math.min(newCwnd, state.rwndMss), 2);
  const point: TcpRttDataPoint = {
    rttIndex: nextRtt,
    cwndMss: newCwnd,
    ssthreshMss: newSsthresh,
    rwndMss: state.rwndMss,
    effectiveWindowMss: effectiveWin,
    phase: nextPhase,
    eventDescription: desc,
    isLossEvent: true,
    wMaxMss: recordedWMax,
  };

  return {
    ...state,
    currentRtt: nextRtt,
    cwndMss: newCwnd,
    ssthreshMss: newSsthresh,
    wMaxMss: recordedWMax,
    epochStartRtt: nextRtt,
    phase: nextPhase,
    inFlightMss: Math.max(1, Math.floor(effectiveWin / 2)),
    history: [...state.history.slice(-28), point],
  };
};

/**
 * Pure transition when Retransmission Timeout (RTO) expires
 */
export const stepTcpTimeoutRto = (state: TcpEngineState): TcpEngineState => {
  const nextRtt = state.currentRtt + 1;
  const recordedWMax = state.cwndMss;
  const factor = state.algorithm === 'CUBIC' ? CUBIC_BETA : 0.5;
  const newSsthresh = roundTo(Math.max(2, Math.floor(state.cwndMss * factor)), 2);
  const newCwnd = 1;
  const effectiveWin = roundTo(Math.min(newCwnd, state.rwndMss), 2);

  const point: TcpRttDataPoint = {
    rttIndex: nextRtt,
    cwndMss: newCwnd,
    ssthreshMss: newSsthresh,
    rwndMss: state.rwndMss,
    effectiveWindowMss: effectiveWin,
    phase: 'TIMEOUT_RTO',
    eventDescription: `Expiration RTO (${state.algorithm}) : ssthresh = ${newSsthresh} MSS, réinitialisation cwnd = 1 MSS`,
    isLossEvent: true,
    wMaxMss: recordedWMax,
  };

  return {
    ...state,
    currentRtt: nextRtt,
    cwndMss: newCwnd,
    ssthreshMss: newSsthresh,
    wMaxMss: recordedWMax,
    epochStartRtt: nextRtt,
    phase: 'SLOW_START',
    inFlightMss: 1,
    history: [...state.history.slice(-28), point],
  };
};

/**
 * Computes the Sliding Window (Fenêtre glissante) segment array
 * Effective Window W = min(cwnd, rwnd)
 */
export const computeSlidingWindowSegments = (
  baseSeqNum: number,
  effectiveWindowMss: number,
  inFlightMss: number,
  totalSlots = 18
): TcpSegmentBlock[] => {
  const ackedCount = 3;
  const winSize = Math.max(0, Math.round(effectiveWindowMss));
  const flightCount = clamp(Math.round(inFlightMss), 0, winSize);
  const usableCount = Math.max(0, winSize - flightCount);

  const segments: TcpSegmentBlock[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const seq = baseSeqNum - ackedCount + i;
    const byteStart = seq * 1460;
    const byteEnd = byteStart + 1459;
    let status: TcpSegmentBlock['status'] = 'BLOCKED_OUTSIDE';

    if (i < ackedCount) {
      status = 'ACKED';
    } else if (i < ackedCount + flightCount) {
      status = 'IN_FLIGHT';
    } else if (i < ackedCount + flightCount + usableCount) {
      status = 'USABLE_WINDOW';
    } else {
      status = 'BLOCKED_OUTSIDE';
    }

    segments.push({
      seqNum: seq,
      byteRange: `${byteStart}–${byteEnd}`,
      status,
    });
  }

  return segments;
};

/**
 * Generates comparative curves across 20 RTTs for CUBIC, Reno, Tahoe, and BBR
 * with a synthetic packet loss at RTT = 8
 */
export const generateAlgorithmComparisonCurves = (): Array<{
  readonly rtt: number;
  readonly cubic: number;
  readonly reno: number;
  readonly tahoe: number;
  readonly bbr: number;
}> => {
  let sCubic = createInitialTcpState('CUBIC');
  let sReno = createInitialTcpState('RENO');
  let sTahoe = createInitialTcpState('TAHOE');
  let sBbr = createInitialTcpState('BBR');

  const rows = [
    {
      rtt: 0,
      cubic: sCubic.cwndMss,
      reno: sReno.cwndMss,
      tahoe: sTahoe.cwndMss,
      bbr: sBbr.cwndMss,
    },
  ];

  for (let r = 1; r <= 18; r++) {
    if (r === 8) {
      // Inject 3 Dup-ACK loss event at RTT 8
      sCubic = stepTcpTripleDupAck(sCubic);
      sReno = stepTcpTripleDupAck(sReno);
      sTahoe = stepTcpTripleDupAck(sTahoe);
      sBbr = stepTcpTripleDupAck(sBbr);
    } else {
      sCubic = stepTcpNormalAck(sCubic);
      sReno = stepTcpNormalAck(sReno);
      sTahoe = stepTcpNormalAck(sTahoe);
      sBbr = stepTcpNormalAck(sBbr);
    }

    rows.push({
      rtt: r,
      cubic: sCubic.cwndMss,
      reno: sReno.cwndMss,
      tahoe: sTahoe.cwndMss,
      bbr: sBbr.cwndMss,
    });
  }

  return rows;
};

/**
 * Fast Retransmit & SACK (Selective Acknowledgment RFC 2018) Step-by-Step Trace
 */
export const getFastRetransmitSackSteps = (): TcpLossScenarioStep[] => [
  {
    stepNumber: 1,
    title: 'Émission de la rafale dans la fenêtre glissante (Seg #101 à #105)',
    senderAction: 'Envoi de 5 segments consécutifs sans attendre (pipelining TCP). Le segment #102 subit une perte en transit.',
    inFlightPackets: [101, 102, 103, 104, 105],
    receiverAction: 'Réception normale de Seg #101 (octets 1460–2919).',
    ackGenerated: { ackNum: 102, isDup: false, dupCount: 0 },
    technicalInsight: 'L’ACK 102 cumulatif confirme la bonne réception jusqu’au segment #101 et réclame le segment #102.',
  },
  {
    stepNumber: 2,
    title: 'Arrivée hors-séquence de Seg #103 -> 1er Dup-ACK + Option SACK',
    senderAction: 'Attente des acquittements en retour.',
    inFlightPackets: [103, 104, 105],
    receiverAction: 'Seg #103 arrive mais #102 manque ! Le récepteur stocke #103 en tampon hors-ordre.',
    ackGenerated: { ackNum: 102, isDup: true, dupCount: 1, sackBlocks: 'SACK=[103..103]' },
    technicalInsight: 'Grâce à RFC 2018 (SACK), le récepteur signale le trou (#102) tout en confirmant qu’il possède déjà #103.',
  },
  {
    stepNumber: 3,
    title: 'Arrivée de Seg #104 -> 2e Dup-ACK cumulatif',
    senderAction: 'Réception du 2e ACK dupliqué sur #102 (seuil Fast Retransmit = 3).',
    inFlightPackets: [104, 105],
    receiverAction: 'Seg #104 est mis en mémoire tampon à la suite de #103.',
    ackGenerated: { ackNum: 102, isDup: true, dupCount: 2, sackBlocks: 'SACK=[103..104]' },
    technicalInsight: 'L’émetteur attend un 3e Dup-ACK pour distinguer une vraie perte d’un simple réordonnancement.',
  },
  {
    stepNumber: 4,
    title: 'Arrivée de Seg #105 -> 3e Dup-ACK & Déclenchement Fast Retransmit',
    senderAction: '3 Dup-ACK reçus ! Retransmission immédiate de Seg #102 sans attendre le minuteur RTO.',
    inFlightPackets: [102],
    receiverAction: 'Seg #105 est stocké. Bloc SACK élargi à [103..105].',
    ackGenerated: { ackNum: 102, isDup: true, dupCount: 3, sackBlocks: 'SACK=[103..105]' },
    technicalInsight: 'CUBIC réduit cwnd de seulement 30% (beta=0.7) contre 50% pour Reno, préservant le débit sur liens rapides.',
  },
  {
    stepNumber: 5,
    title: 'Réception de Seg #102 retransmis -> Comblement du trou & ACK 106',
    senderAction: 'Reprise de l’émission à partir du segment #106 en phase Congestion Avoidance.',
    inFlightPackets: [106, 107],
    receiverAction: 'Seg #102 comble l’intervalle manquant ! Les segments #102 à #105 sont livrés d’un bloc à la couche L7.',
    ackGenerated: { ackNum: 106, isDup: false, dupCount: 0 },
    technicalInsight: 'Un seul segment (#102) a été retransmis grâce à SACK, évitant de renvoyer inutilement #103, #104 et #105.',
  },
];
