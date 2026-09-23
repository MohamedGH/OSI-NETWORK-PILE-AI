/**
 * Pure Functional IP Fragmentation & Reassembly Engine (RFC 791 / RFC 1191)
 * Simulates IPv4 header manipulation, 8-octet offset alignment, DF/MF flags,
 * router packet splitting, MTU bottlenecking, and receiver reassembly hole tracking.
 */

import {
  IpFragment,
  IpFragmentationPlan,
  IcmpFragNeededMessage,
  ReassemblyBufferState,
} from '../types/network';

export interface FragmentationInputOptions {
  readonly packetTotalSize: number; // in bytes (e.g., 4000)
  readonly bottleneckMtu: number; // in bytes (e.g., 1500, 1000, 576)
  readonly ingressMtu?: number; // default 1500 or 9000
  readonly isDfSet: boolean; // Don't Fragment flag
  readonly identification?: number;
  readonly payloadText?: string;
  readonly sourceIp?: string;
  readonly destinationIp?: string;
  readonly protocol?: 'TCP' | 'UDP' | 'ICMP';
  readonly ttl?: number;
}

/**
 * Generates an IP Fragmentation Plan based on incoming packet size and bottleneck MTU.
 * Follows strict RFC 791 rules:
 * - Fragment payload size MUST be a multiple of 8 octets (except the final fragment).
 * - Fragment Offset is measured in units of 8 octets (64 bits).
 * - DF=1 causes packet drop and triggers ICMP Type 3 Code 4.
 */
export const calculateIpFragmentation = (
  options: FragmentationInputOptions
): IpFragmentationPlan => {
  const {
    packetTotalSize,
    bottleneckMtu,
    ingressMtu = 1500,
    isDfSet,
    identification = 0x4a2f,
    payloadText = 'GET /api/v1/network/telemetry?stream=full HTTP/1.1\r\nHost: server.edu\r\nUser-Agent: SimulatedHost/2.0\r\nAccept: application/json\r\nContent-Length: 3950\r\n\r\n[PAYLOAD_DATA_STREAM_SIMULATION_OCTETS_0_TO_4000...]',
    sourceIp = '192.168.1.100',
    destinationIp = '198.51.100.25',
    protocol = 'TCP',
    ttl = 64,
  } = options;

  const headerLength = 20;
  const originalPayloadSize = Math.max(0, packetTotalSize - headerLength);

  // Case 1: Packet fits in MTU without fragmentation
  if (packetTotalSize <= bottleneckMtu) {
    const singleFrag: IpFragment = {
      fragmentIndex: 0,
      totalFragments: 1,
      identification,
      totalLength: packetTotalSize,
      headerLength,
      payloadLength: originalPayloadSize,
      df: isDfSet,
      mf: false,
      fragmentOffset: 0,
      byteRangeStart: 0,
      byteRangeEnd: originalPayloadSize > 0 ? originalPayloadSize - 1 : 0,
      payloadText: payloadText.slice(0, originalPayloadSize),
      ttl,
      protocol,
      sourceIp,
      destinationIp,
      status: 'PENDING',
    };

    return {
      originalPacketSize: packetTotalSize,
      originalPayloadSize,
      ingressMtu,
      bottleneckMtu,
      identification,
      isDfSet,
      isDroppedDueToDf: false,
      maxFragmentDataSize: Math.max(0, bottleneckMtu - headerLength),
      fragments: [singleFrag],
      totalFragmentsCount: 1,
      totalOverheadBytes: headerLength,
      efficiencyPercentage: (originalPayloadSize / packetTotalSize) * 100,
    };
  }

  // Case 2: DF (Don't Fragment) is set and packet exceeds MTU -> ICMP Error (PMTUD)
  if (isDfSet) {
    const icmpError: IcmpFragNeededMessage = {
      type: 3, // Destination Unreachable
      code: 4, // Fragmentation Needed and DF set
      nextHopMtu: bottleneckMtu,
      routerIp: '192.168.1.1',
      description: `ICMP Type 3, Code 4 : Fragmentation Needed and DF set. Next-Hop MTU = ${bottleneckMtu} octets.`,
      pmtudSuggestedMtu: bottleneckMtu,
    };

    return {
      originalPacketSize: packetTotalSize,
      originalPayloadSize,
      ingressMtu,
      bottleneckMtu,
      identification,
      isDfSet: true,
      isDroppedDueToDf: true,
      maxFragmentDataSize: Math.floor((bottleneckMtu - headerLength) / 8) * 8,
      fragments: [],
      totalFragmentsCount: 0,
      totalOverheadBytes: 0,
      efficiencyPercentage: 0,
      icmpError,
    };
  }

  // Case 3: Standard Fragmentation (RFC 791)
  // Max data per fragment = floor((MTU - 20) / 8) * 8
  const maxFragmentDataSize = Math.floor((bottleneckMtu - headerLength) / 8) * 8;
  const fragments: IpFragment[] = [];

  let currentOffsetBytes = 0;
  let fragIndex = 0;

  while (currentOffsetBytes < originalPayloadSize) {
    const bytesRemaining = originalPayloadSize - currentOffsetBytes;
    const thisPayloadSize = Math.min(maxFragmentDataSize, bytesRemaining);
    const isLast = currentOffsetBytes + thisPayloadSize >= originalPayloadSize;
    const byteRangeStart = currentOffsetBytes;
    const byteRangeEnd = currentOffsetBytes + thisPayloadSize - 1;

    // Fragment Offset in units of 8 octets
    const fragmentOffsetUnits = currentOffsetBytes / 8;

    const fragText =
      payloadText.length >= originalPayloadSize
        ? payloadText.slice(byteRangeStart, byteRangeEnd + 1)
        : `[Octets ${byteRangeStart}..${byteRangeEnd}]`;

    fragments.push({
      fragmentIndex: fragIndex,
      totalFragments: 0, // updated after loop
      identification,
      totalLength: headerLength + thisPayloadSize,
      headerLength,
      payloadLength: thisPayloadSize,
      df: false,
      mf: !isLast,
      fragmentOffset: fragmentOffsetUnits,
      byteRangeStart,
      byteRangeEnd,
      payloadText: fragText,
      ttl: Math.max(1, ttl - 1), // decremented by router
      protocol,
      sourceIp,
      destinationIp,
      status: 'PENDING',
    });

    currentOffsetBytes += thisPayloadSize;
    fragIndex++;
  }

  // Update totalFragments count on all generated fragments
  const finalFragments = fragments.map(f => ({
    ...f,
    totalFragments: fragments.length,
  }));

  const totalOverheadBytes = finalFragments.length * headerLength;
  const totalTransmittedBytes = originalPayloadSize + totalOverheadBytes;
  const efficiencyPercentage = (originalPayloadSize / totalTransmittedBytes) * 100;

  return {
    originalPacketSize: packetTotalSize,
    originalPayloadSize,
    ingressMtu,
    bottleneckMtu,
    identification,
    isDfSet: false,
    isDroppedDueToDf: false,
    maxFragmentDataSize,
    fragments: finalFragments,
    totalFragmentsCount: finalFragments.length,
    totalOverheadBytes,
    efficiencyPercentage,
  };
};

/**
 * Initializes the Reassembly Buffer at the destination host.
 */
export const createInitialReassemblyBuffer = (
  expectedTotalPayloadBytes: number = 3980
): ReassemblyBufferState => {
  return {
    expectedTotalPayloadBytes,
    receivedPayloadBytes: 0,
    receivedFragments: [],
    missingByteRanges: [{ start: 0, end: Math.max(0, expectedTotalPayloadBytes - 1) }],
    isComplete: false,
    isTimedOut: false,
    reassembledPayload: null,
    timerSecondsRemaining: 30,
    logMessages: [
      `[BUFFER_INIT] Tampon de réassemblage initialisé pour ID paquet. Minuteur RFC 791 : 30s.`,
    ],
  };
};

/**
 * Inserts a received fragment into the destination reassembly buffer.
 * Performs pure functional hole-punching and calculates remaining missing ranges.
 */
export const insertFragmentIntoBuffer = (
  currentState: ReassemblyBufferState,
  fragment: IpFragment
): ReassemblyBufferState => {
  if (currentState.isComplete || currentState.isTimedOut) {
    return currentState;
  }

  // Check if already received
  const alreadyExists = currentState.receivedFragments.some(
    f => f.fragmentIndex === fragment.fragmentIndex
  );
  if (alreadyExists) {
    return {
      ...currentState,
      logMessages: [
        `[DUPLICATE_DROP] Fragment #${fragment.fragmentIndex} déjà reçu. Ignoré.`,
        ...currentState.logMessages.slice(0, 15),
      ],
    };
  }

  const updatedReceived = [...currentState.receivedFragments, { ...fragment, status: 'RECEIVED' as const }].sort(
    (a, b) => a.byteRangeStart - b.byteRangeStart
  );

  const newReceivedPayloadBytes = updatedReceived.reduce((acc, f) => acc + f.payloadLength, 0);

  // Compute missing holes/ranges from 0 to expectedTotalPayloadBytes - 1
  const totalTarget = currentState.expectedTotalPayloadBytes;
  const missingRanges: Array<{ start: number; end: number }> = [];

  let cursor = 0;
  for (const frag of updatedReceived) {
    if (frag.byteRangeStart > cursor) {
      missingRanges.push({ start: cursor, end: frag.byteRangeStart - 1 });
    }
    cursor = Math.max(cursor, frag.byteRangeEnd + 1);
  }

  if (cursor < totalTarget) {
    missingRanges.push({ start: cursor, end: totalTarget - 1 });
  }

  const isComplete = missingRanges.length === 0 && newReceivedPayloadBytes >= totalTarget;

  let reassembledPayload: string | null = null;
  if (isComplete) {
    reassembledPayload = updatedReceived.map(f => f.payloadText).join('');
  }

  const newLog = `[FRAG_ARRIVED] Fragment #${fragment.fragmentIndex} reçu (Octets [${fragment.byteRangeStart}..${fragment.byteRangeEnd}], Offset=${fragment.fragmentOffset}*8, MF=${fragment.mf ? 1 : 0}).`;
  const completionLog = isComplete
    ? `[REASSEMBLY_COMPLETE] Tous les fragments reçus ! Paquet IPv4 entièrement reconstitué (${newReceivedPayloadBytes} octets utiles). Remise au socket Transport.`
    : `[BUFFER_STATUS] ${missingRanges.length} trou(s) restant(s) à combler.`;

  return {
    ...currentState,
    receivedPayloadBytes: newReceivedPayloadBytes,
    receivedFragments: updatedReceived,
    missingByteRanges: missingRanges,
    isComplete,
    reassembledPayload,
    logMessages: [completionLog, newLog, ...currentState.logMessages.slice(0, 14)],
  };
};

/**
 * Decrements the reassembly timer. If it hits 0 before completion, all fragments are dropped.
 */
export const tickReassemblyBufferTimer = (
  currentState: ReassemblyBufferState
): ReassemblyBufferState => {
  if (currentState.isComplete || currentState.isTimedOut) {
    return currentState;
  }

  const nextTimer = currentState.timerSecondsRemaining - 1;
  if (nextTimer <= 0) {
    return {
      ...currentState,
      timerSecondsRemaining: 0,
      isTimedOut: true,
      logMessages: [
        `[TIMEOUT_EXPIRED] Minuteur de réassemblage expiré (RFC 791). Tampon vidé et émission ICMP Type 11 Code 1 (Time Exceeded during fragment reassembly).`,
        ...currentState.logMessages.slice(0, 15),
      ],
    };
  }

  return {
    ...currentState,
    timerSecondsRemaining: nextTimer,
  };
};

/**
 * Preset Real-World Fragmentation & PMTUD Scenarios
 */
export interface FragmentationScenarioPreset {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly packetTotalSize: number;
  readonly bottleneckMtu: number;
  readonly isDfSet: boolean;
  readonly payloadSample: string;
  readonly keyTakeaway: string;
}

export const FRAGMENTATION_PRESET_SCENARIOS: readonly FragmentationScenarioPreset[] = [
  {
    id: 'eth-to-min-mtu',
    title: 'Ethernet Standard (1500B) vers MTU Minimale IPv4 (576B)',
    category: 'RFC 791 Classique',
    description:
      'Un paquet de 4000 octets arrive sur un routeur avec une liaison WAN restreinte à 576 octets (MTU minimale garantie par IPv4). Le routeur découpe le flux en fragments alignés sur 8 octets.',
    packetTotalSize: 4000,
    bottleneckMtu: 576,
    isDfSet: false,
    payloadSample:
      'DATA_STREAM_CHUNK_HTTP_PAYLOAD_IMAGE_JPEG_EXIF_METADATA_AND_CONTENT_STREAM_SIMULATION_CHUNKS_OF_4000_BYTES_FOR_IP_FRAG',
    keyTakeaway:
      'Chaque fragment transporte (576 - 20) = 556 octets arrondis à 552 octets (multiple de 8). 8 fragments au total.',
  },
  {
    id: 'jumbo-to-standard',
    title: 'Jumbo Frame Datacenter (9000B) vers Ethernet Standard (1500B)',
    category: 'Datacenter & Cloud',
    description:
      'Un serveur de stockage NAS émet une trame Jumbo de 9000 octets. En sortant vers l’Internet public, le routeur frontière de MTU 1500 découpe le paquet en 7 fragments.',
    packetTotalSize: 9000,
    bottleneckMtu: 1500,
    isDfSet: false,
    payloadSample:
      'DATABASE_BACKUP_SQL_DUMP_ROW_RECORDS_LARGE_STREAM_TCP_SEGMENTATION_OFFLOAD_IN_TRANSIT_THROUGH_TRANSIT_ROUTER',
    keyTakeaway:
      'Chaque fragment transporte 1480 octets de payload (1480 est bien multiple de 8 : 1480/8 = 185). Offset augmente de +185 par fragment.',
  },
  {
    id: 'df-pmtud-trigger',
    title: 'Drapeau DF = 1 activé (Découverte Path MTU Discovery - PMTUD)',
    category: 'Path MTU Discovery (RFC 1191)',
    description:
      'Les piles TCP modernes définissent DF (Don’t Fragment) = 1 pour interdire la fragmentation intermédiaire coûteuse. Le routeur rejette le paquet et renvoie une alerte ICMP Type 3 Code 4.',
    packetTotalSize: 4000,
    bottleneckMtu: 1400,
    isDfSet: true,
    payloadSample: 'TCP_SYN_OR_TLS_CLIENT_HELLO_PROTECTED_BY_DF_BIT_FOR_PATH_MTU_PROBING',
    keyTakeaway:
      'Aucun fragment n’est généré. Le client reçoit l’ICMP contenant le Next-Hop MTU (1400B) et réduit immédiatement son MSS sans saturer les routeurs.',
  },
  {
    id: 'out-of-order-demo',
    title: 'Réassemblage avec Arrivée Hors-Ordre (Out-of-Order Delivery)',
    category: 'Comportement Récepteur',
    description:
      'Les fragments 3 et 2 arrivent avant le fragment 1 à cause d’un routage multi-chemin (ECMP). Le récepteur met en mémoire tampon, détecte le trou [0..1479], puis valide le paquet dès réception du dernier morceau.',
    packetTotalSize: 3500,
    bottleneckMtu: 1500,
    isDfSet: false,
    payloadSample: 'MULTICLOUD_DISTRIBUTED_ROUTING_PACKET_FRAGMENTATION_TEST_WITH_OUT_OF_ORDER_DELIVERY',
    keyTakeaway:
      'Le récepteur n’a pas besoin de fragments ordonnés grâce au champ Fragment Offset qui spécifie l’emplacement mémoire exact dans le tampon.',
  },
];
