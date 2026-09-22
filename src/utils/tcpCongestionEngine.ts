/**
 * Pure Functional TCP Congestion Control, Flow Control, and Reliability Engine
 * Implements RFC 5681 (TCP Congestion Control), RFC 2018 (TCP SACK), and RFC 793.
 */

import {
  TcpAlgorithm,
  TcpCongestionPhase,
  TcpRttDataPoint,
  TcpSegmentBlock,
  TcpLossScenarioStep,
} from '../types/network';

export interface TcpEngineState {
  readonly algorithm: TcpAlgorithm;
  readonly phase: TcpCongestionPhase;
  readonly cwndMss: number;
  readonly ssthreshMss: number;
  readonly currentRtt: number;
  readonly rwndMss: number;
  readonly mssBytes: number;
  readonly rttHistory: readonly TcpRttDataPoint[];
  readonly lastEvent: string;
}

export const INITIAL_TCP_STATE: TcpEngineState = {
  algorithm: 'RENO',
  phase: 'SLOW_START',
  cwndMss: 1,
  ssthreshMss: 16,
  currentRtt: 0,
  rwndMss: 32,
  mssBytes: 1460,
  rttHistory: [
    {
      rttIndex: 0,
      cwndMss: 1,
      ssthreshMss: 16,
      phase: 'SLOW_START',
      eventDescription: 'Connexion établie (3-Way Handshake terminé) • Initial cwnd = 1 MSS',
    },
  ],
  lastEvent: 'Connexion initialisée',
};

/**
 * Computes next RTT tick for normal ACK progress
 */
export const stepTcpNormalAck = (state: TcpEngineState): TcpEngineState => {
  const nextRtt = state.currentRtt + 1;
  let nextCwnd = state.cwndMss;
  let nextSsthresh = state.ssthreshMss;
  let nextPhase = state.phase;
  let eventDesc = '';

  if (state.phase === 'SLOW_START') {
    // Exponential growth: cwnd doubles every RTT (or +1 per ACK in that RTT)
    nextCwnd = state.cwndMss * 2;
    if (nextCwnd >= state.ssthreshMss) {
      nextPhase = 'CONGESTION_AVOIDANCE';
      eventDesc = `Seuil ssthresh (${state.ssthreshMss} MSS) atteint &rarr; Bascule en Évitement de Congestion`;
    } else {
      eventDesc = `Slow Start : cwnd doublé (${state.cwndMss} &rarr; ${nextCwnd} MSS)`;
    }
  } else if (state.phase === 'CONGESTION_AVOIDANCE') {
    // Linear growth (AIMD Additive Increase): +1 MSS per RTT
    if (state.algorithm === 'CUBIC') {
      // Cubic approximation: rapid probe
      nextCwnd = Math.round(state.cwndMss + Math.max(1, (nextRtt % 4) * 0.8));
      eventDesc = `CUBIC : Croissance concave/convexe vers capacité optimale (${nextCwnd} MSS)`;
    } else if (state.algorithm === 'BBR') {
      nextCwnd = Math.min(state.rwndMss, state.cwndMss + 2);
      eventDesc = `BBR : Sondage Max Bandwidth x Min RTT (${nextCwnd} MSS)`;
    } else {
      // Reno / Tahoe: pure AIMD (+1 MSS)
      nextCwnd = state.cwndMss + 1;
      eventDesc = `Évitement de Congestion (AIMD) : +1 MSS par RTT (${state.cwndMss} &rarr; ${nextCwnd} MSS)`;
    }
  } else if (state.phase === 'FAST_RECOVERY') {
    // Coming out of fast recovery into congestion avoidance
    nextPhase = 'CONGESTION_AVOIDANCE';
    nextCwnd = state.ssthreshMss;
    eventDesc = `Sortie de Fast Recovery &rarr; Reprise en Évitement de Congestion (${nextCwnd} MSS)`;
  } else if (state.phase === 'TIMEOUT_RTO') {
    nextPhase = 'SLOW_START';
    nextCwnd = 2;
    eventDesc = `Reprise après Timeout : Slow Start depuis 1 &rarr; 2 MSS`;
  }

  // Bound by max displayable / reasonable size
  const clampedCwnd = Math.min(64, Math.max(1, nextCwnd));

  const newPoint: TcpRttDataPoint = {
    rttIndex: nextRtt,
    cwndMss: clampedCwnd,
    ssthreshMss: nextSsthresh,
    phase: nextPhase,
    eventDescription: eventDesc,
  };

  return {
    ...state,
    currentRtt: nextRtt,
    cwndMss: clampedCwnd,
    ssthreshMss: nextSsthresh,
    phase: nextPhase,
    rttHistory: [...state.rttHistory.slice(-25), newPoint],
    lastEvent: eventDesc,
  };
};

/**
 * Handles 3 Duplicate ACKs (Fast Retransmit & Fast Recovery)
 */
export const stepTcpTripleDupAck = (state: TcpEngineState): TcpEngineState => {
  const nextRtt = state.currentRtt + 1;
  const oldCwnd = state.cwndMss;
  const newSsthresh = Math.max(2, Math.floor(oldCwnd / 2));

  let nextCwnd = newSsthresh;
  let nextPhase: TcpCongestionPhase = 'FAST_RECOVERY';
  let eventDesc = '';

  if (state.algorithm === 'TAHOE') {
    // Old TCP Tahoe resets cwnd to 1 MSS on any loss
    nextCwnd = 1;
    nextPhase = 'SLOW_START';
    eventDesc = `Tahoe : 3 Dup-ACKs reçus &rarr; ssthresh=${newSsthresh} MSS, cwnd réinitialisé à 1 MSS`;
  } else {
    // TCP Reno / Modern Fast Recovery
    nextCwnd = newSsthresh + 3; // +3 for the 3 packets that escaped
    nextPhase = 'FAST_RECOVERY';
    eventDesc = `3 Dup-ACKs reçus (Perte isolée) &rarr; Fast Retransmit immédiat ! ssthresh=${newSsthresh} MSS, cwnd=${nextCwnd} MSS (Fast Recovery)`;
  }

  const newPoint: TcpRttDataPoint = {
    rttIndex: nextRtt,
    cwndMss: nextCwnd,
    ssthreshMss: newSsthresh,
    phase: nextPhase,
    eventDescription: eventDesc,
    isLossEvent: true,
  };

  return {
    ...state,
    currentRtt: nextRtt,
    cwndMss: nextCwnd,
    ssthreshMss: newSsthresh,
    phase: nextPhase,
    rttHistory: [...state.rttHistory.slice(-25), newPoint],
    lastEvent: eventDesc,
  };
};

/**
 * Handles Retransmission Timeout (RTO) - Severe Congestion / Black hole
 */
export const stepTcpTimeoutRto = (state: TcpEngineState): TcpEngineState => {
  const nextRtt = state.currentRtt + 1;
  const oldCwnd = state.cwndMss;
  const newSsthresh = Math.max(2, Math.floor(oldCwnd / 2));
  const nextCwnd = 1; // RTO always collapses cwnd to 1 MSS
  const nextPhase: TcpCongestionPhase = 'TIMEOUT_RTO';
  const eventDesc = `Expiration Minuteur RTO (Perte Majeure / Congestion Réseau) &rarr; cwnd écroulé à 1 MSS, ssthresh=${newSsthresh} MSS`;

  const newPoint: TcpRttDataPoint = {
    rttIndex: nextRtt,
    cwndMss: nextCwnd,
    ssthreshMss: newSsthresh,
    phase: nextPhase,
    eventDescription: eventDesc,
    isLossEvent: true,
  };

  return {
    ...state,
    currentRtt: nextRtt,
    cwndMss: nextCwnd,
    ssthreshMss: newSsthresh,
    phase: nextPhase,
    rttHistory: [...state.rttHistory.slice(-25), newPoint],
    lastEvent: eventDesc,
  };
};

/**
 * Generates sliding window segment blocks
 */
export const computeSlidingWindowSegments = (
  baseAckedSeq: number,
  cwndMss: number,
  rwndMss: number,
  mssBytes: number = 1460,
  totalSegments: number = 16
): {
  segments: TcpSegmentBlock[];
  effectiveWindowMss: number;
  inFlightCount: number;
  usableCount: number;
} => {
  const effectiveWindowMss = Math.min(cwndMss, rwndMss);
  const inFlightCount = Math.min(Math.ceil(effectiveWindowMss * 0.6), effectiveWindowMss);
  const usableCount = Math.max(0, effectiveWindowMss - inFlightCount);

  const segments: TcpSegmentBlock[] = [];

  for (let i = 1; i <= totalSegments; i++) {
    const seqNum = baseAckedSeq + (i - 1) * mssBytes;
    const startByte = seqNum;
    const endByte = seqNum + mssBytes - 1;
    const byteRange = `${startByte}–${endByte}`;

    let status: TcpSegmentBlock['status'] = 'BLOCKED_OUTSIDE';

    if (i <= 3) {
      status = 'ACKED';
    } else if (i <= 3 + inFlightCount) {
      status = 'IN_FLIGHT';
    } else if (i <= 3 + inFlightCount + usableCount) {
      status = 'USABLE_WINDOW';
    } else {
      status = 'BLOCKED_OUTSIDE';
    }

    segments.push({
      seqNum: i,
      byteRange,
      status,
      isLost: i === 5 && status === 'IN_FLIGHT', // visual demo lost flag
    });
  }

  return {
    segments,
    effectiveWindowMss,
    inFlightCount,
    usableCount,
  };
};

/**
 * Step-by-step Fast Retransmit Scenario (3 Duplicate ACKs)
 */
export const getFastRetransmitSteps = (): TcpLossScenarioStep[] => [
  {
    stepNumber: 1,
    title: 'Émission de la Rafale de Segments (Seq #1, #2, #3, #4, #5)',
    senderAction: 'L’émetteur expédie 5 segments consécutifs en vol sur le réseau.',
    inFlightPackets: [1, 2, 3, 4, 5],
    receiverAction: 'En attente des segments.',
    ackGenerated: { ackNum: 1, isDup: false, dupCount: 0 },
    technicalInsight: 'Le réseau achemine les paquets mais un routeur saturé subit une congestion.',
  },
  {
    stepNumber: 2,
    title: 'Perte du Segment #3 sur le Câble (Drop Réseau)',
    senderAction: 'Segments #1 et #2 arrivent à destination.',
    inFlightPackets: [3, 4, 5],
    receiverAction: 'Réception de #1 et #2 &rarr; Envoi de ACK #3 (attend le paquet 3). Le paquet #3 est détruit par le routeur !',
    ackGenerated: { ackNum: 3, isDup: false, dupCount: 0 },
    technicalInsight: 'L’émetteur reçoit ACK #3 (ACK normal cumulatif).',
  },
  {
    stepNumber: 3,
    title: 'Arrivée du Segment #4 (Hors-Séquence) &rarr; 1er Duplicate ACK #3',
    senderAction: 'L’émetteur attend les accusés de réception.',
    inFlightPackets: [4, 5],
    receiverAction: 'Réception du Segment #4. Trou détecté (Segment #3 manquant) ! Le récepteur génère un Duplicate ACK #3.',
    ackGenerated: { ackNum: 3, isDup: true, dupCount: 1 },
    technicalInsight: 'Duplicate ACK 1/3 : Le récepteur signale qu’il a reçu des octets plus loin mais attend toujours l’octet du paquet #3.',
  },
  {
    stepNumber: 4,
    title: 'Arrivée du Segment #5 (Hors-Séquence) &rarr; 2e Duplicate ACK #3',
    senderAction: 'L’émetteur reçoit le 1er Dup-ACK.',
    inFlightPackets: [5],
    receiverAction: 'Réception du Segment #5. Toujours pas de segment #3 &rarr; Génération du 2e Duplicate ACK #3.',
    ackGenerated: { ackNum: 3, isDup: true, dupCount: 2 },
    technicalInsight: 'Duplicate ACK 2/3 : La file d’attente confirme la progression des paquets ultérieurs.',
  },
  {
    stepNumber: 5,
    title: 'Arrivée d’un autre paquet &rarr; 3e Duplicate ACK #3 : Déclenchement FAST RETRANSMIT !',
    senderAction: 'L’émetteur reçoit le 3e Duplicate ACK #3. Déduction immédiate : le paquet #3 est perdu !',
    inFlightPackets: [3],
    receiverAction: 'Envoi du 3e Duplicate ACK #3.',
    ackGenerated: { ackNum: 3, isDup: true, dupCount: 3 },
    technicalInsight: 'FAST RETRANSMIT : L’émetteur n’attend PAS l’expiration du minuteur RTO (qui prendrait 200 à 500 ms). Il réexpédie le Segment #3 instantanément !',
  },
  {
    stepNumber: 6,
    title: 'Réception du Segment #3 réémis & ACK Cumulatif Global (#6)',
    senderAction: 'Segment #3 réémis arrive au récepteur.',
    inFlightPackets: [],
    receiverAction: 'Le trou est comblé ! Le récepteur possède désormais #1, #2, #3, #4, #5. Il envoie un ACK Cumulatif #6 !',
    ackGenerated: { ackNum: 6, isDup: false, dupCount: 0 },
    technicalInsight: 'FAST RECOVERY : La fenêtre cwnd est divisée par 2 (ssthresh = cwnd / 2) et la transmission reprend en Évitement de Congestion sans repasser par 1 MSS.',
  },
];

/**
 * Step-by-step SACK (Selective Acknowledgment) Scenario
 */
export const getSackSteps = (): TcpLossScenarioStep[] => [
  {
    stepNumber: 1,
    title: 'Rafale de 8 Segments (Seq 1000 à 8000)',
    senderAction: 'L’émetteur envoie les segments [1, 2, 3, 4, 5, 6, 7, 8].',
    inFlightPackets: [1, 2, 3, 4, 5, 6, 7, 8],
    receiverAction: 'En attente.',
    ackGenerated: { ackNum: 1000, isDup: false, dupCount: 0 },
    technicalInsight: 'Sous TCP classique sans SACK, si les segments 3 et 6 sont perdus, l’émetteur devrait tout réexpédier de 3 à 8 (Go-Back-N inefficace).',
  },
  {
    stepNumber: 2,
    title: 'Perte Multiple : Segments #3 et #6 jetés',
    senderAction: 'Segments transitent sur un lien avec gigue/congestion.',
    inFlightPackets: [1, 2, 4, 5, 7, 8],
    receiverAction: 'Réception de #1 et #2 &rarr; ACK=3000. Réception de #4 et #5 &rarr; Trou en #3 !',
    ackGenerated: { ackNum: 3000, isDup: true, dupCount: 1, sackBlocks: 'SACK: [4000-6000]' },
    technicalInsight: 'Le champ Option TCP SACK (RFC 2018) informe explicitement l’émetteur que les octets 4000-6000 sont bien arrivés en mémoire !',
  },
  {
    stepNumber: 3,
    title: 'Arrivée des Segments #7 et #8 & Bloc SACK Étendu',
    senderAction: 'L’émetteur lit l’option SACK dans l’en-tête TCP.',
    inFlightPackets: [7, 8],
    receiverAction: 'Réception de #7 et #8 (trou en #6). Génération d’un ACK avec 2 blocs SACK.',
    ackGenerated: { ackNum: 3000, isDup: true, dupCount: 2, sackBlocks: 'SACK: [4000-6000], [7000-9000]' },
    technicalInsight: 'Les blocs SACK cartographient les îlots de données reçues : Bloc 1: [4000-6000], Bloc 2: [7000-9000].',
  },
  {
    stepNumber: 4,
    title: 'Réémission Chirurgicale Exclusif des Trous (#3 et #6)',
    senderAction: 'L’émetteur NE renvoie PAS 4, 5, 7, 8. Il réémet UNIQUEMENT le segment #3 et le segment #6 !',
    inFlightPackets: [3, 6],
    receiverAction: 'Réception des 2 segments manquants & Réassemblage parfait dans le tampon.',
    ackGenerated: { ackNum: 9000, isDup: false, dupCount: 0 },
    technicalInsight: 'Économie massive de bande passante : aucun octet déjà reçu n’est gaspillé en réémission inutile !',
  },
];

/**
 * Step-by-step Flow Control (rwnd & Zero Window Probe) Scenario
 */
export const getFlowControlSteps = (): TcpLossScenarioStep[] => [
  {
    stepNumber: 1,
    title: 'Récepteur Rapide : Fenêtre rwnd = 64 Ko',
    senderAction: 'L’émetteur envoie des données à plein régime.',
    inFlightPackets: [1, 2, 3, 4],
    receiverAction: 'L’application du récepteur lit immédiatement les données du socket. Buffer libre.',
    ackGenerated: { ackNum: 5000, isDup: false, dupCount: 0, sackBlocks: 'rwnd=65535 (64 Ko)' },
    technicalInsight: 'Flow Control : Le champ Window Size de l’en-tête TCP indique l’espace mémoire disponible dans le tampon de réception du noyau OS.',
  },
  {
    stepNumber: 2,
    title: 'Application Réceptrice Saturée & Tampon Rempli &rarr; rwnd = 0 (Zero Window)',
    senderAction: 'L’émetteur s’apprête à envoyer la suite.',
    inFlightPackets: [],
    receiverAction: 'L’application locale est occupée (CPU à 100% ou I/O disque lent). Le tampon se remplit jusqu’au bord. Le récepteur envoie un ACK avec rwnd = 0 !',
    ackGenerated: { ackNum: 8000, isDup: false, dupCount: 0, sackBlocks: 'rwnd = 0 (ZERO WINDOW)' },
    technicalInsight: 'Fenêtre Nulle : L’émetteur a l’INTERDICTION absolue d’envoyer de nouvelles données utiles sous peine de forcer un drop récepteur.',
  },
  {
    stepNumber: 3,
    title: 'Blocage de l’Émetteur & Envoi d’une Sonde de Fenêtre Nulle (ZWP)',
    senderAction: 'L’émetteur arme son Minuteur de Persistance (Persist Timer) et envoie périodiquement une Sonde ZWP (1 octet factice).',
    inFlightPackets: [99],
    receiverAction: 'Reçoit le ZWP probe, constate que le tampon est encore saturé et renvoie rwnd = 0.',
    ackGenerated: { ackNum: 8000, isDup: false, dupCount: 0, sackBlocks: 'rwnd = 0 (En attente)' },
    technicalInsight: 'Sans la sonde Zero-Window Probe, si le message de mise à jour de fenêtre ultérieur était perdu, la connexion serait bloquée pour toujours dans un interblocage (deadlock) !',
  },
  {
    stepNumber: 4,
    title: 'L’Application Libère le Tampon & Mise à Jour de Fenêtre (Window Update)',
    senderAction: 'Reçoit l’annonce rwnd = 32 Ko et reprend immédiatement l’envoi de données.',
    inFlightPackets: [9, 10],
    receiverAction: 'L’application lit les 8 Ko en attente &rarr; Envoi spontané d’un TCP Window Update : rwnd = 32768.',
    ackGenerated: { ackNum: 8000, isDup: false, dupCount: 0, sackBlocks: 'rwnd = 32768 (32 Ko libérés)' },
    technicalInsight: 'Le contrôle de flux adapte la cadence de l’émetteur à la vitesse d’absorption du récepteur, indépendamment de la vitesse du réseau.',
  },
];
