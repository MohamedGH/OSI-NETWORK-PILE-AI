/**
 * IPv4 Fragmentation & Reassembly Engine (RFC 791 & RFC 1191 PMTUD)
 * Pure functional calculation of 8-byte fragment offsets, DF/MF flags, and out-of-order reassembly.
 */

import {
  IpFragment,
  IpFragmentationPlan,
  ReassemblyBufferState,
  IcmpFragNeededMessage,
} from '../types/network';
import { roundTo } from './functional';

export interface FragmentationInputOptions {
  readonly packetTotalSize: number; // IPv4 total length (20B header + payload)
  readonly bottleneckMtu: number;
  readonly ingressMtu: number;
  readonly isDfSet: boolean;
  readonly identification: number;
  readonly payloadText: string;
  readonly sourceIp: string;
  readonly destinationIp: string;
  readonly protocol: 'TCP' | 'UDP' | 'ICMP';
  readonly ttl: number;
}

export const IP_HEADER_SIZE_BYTES = 20;

export const calculateIpFragmentation = (options: FragmentationInputOptions): IpFragmentationPlan => {
  const originalPacketSize = Math.max(28, options.packetTotalSize);
  const originalPayloadSize = originalPacketSize - IP_HEADER_SIZE_BYTES;
  const bottleneckMtu = Math.max(68, options.bottleneckMtu); // RFC 791 min MTU = 68 bytes

  // Case 1: Packet fits within bottleneck MTU without fragmentation
  if (originalPacketSize <= bottleneckMtu) {
    const singleFragment: IpFragment = {
      fragmentIndex: 0,
      totalFragments: 1,
      identification: options.identification,
      totalLength: originalPacketSize,
      headerLength: IP_HEADER_SIZE_BYTES,
      payloadLength: originalPayloadSize,
      df: options.isDfSet,
      mf: false,
      fragmentOffset: 0,
      byteRangeStart: 0,
      byteRangeEnd: originalPayloadSize - 1,
      payloadText: options.payloadText,
      ttl: Math.max(1, options.ttl - 1),
      protocol: options.protocol,
      sourceIp: options.sourceIp,
      destinationIp: options.destinationIp,
      status: 'PENDING',
    };

    return {
      originalPacketSize,
      originalPayloadSize,
      ingressMtu: options.ingressMtu,
      bottleneckMtu,
      identification: options.identification,
      isDfSet: options.isDfSet,
      isDroppedDueToDf: false,
      maxFragmentDataSize: bottleneckMtu - IP_HEADER_SIZE_BYTES,
      fragments: [singleFragment],
      totalFragmentsCount: 1,
      totalOverheadBytes: IP_HEADER_SIZE_BYTES,
      efficiencyPercentage: roundTo((originalPayloadSize / originalPacketSize) * 100, 2),
    };
  }

  // Case 2: Packet exceeds MTU AND Don't Fragment (DF=1) is set -> Router drops & sends ICMP Type 3 Code 4
  if (options.isDfSet) {
    const icmpError: IcmpFragNeededMessage = {
      type: 3,
      code: 4,
      nextHopMtu: bottleneckMtu,
      routerIp: '10.0.0.1',
      description: `ICMP Type 3 Code 4 (Fragmentation Needed and DF Set) : Le paquet de ${originalPacketSize} octets dépasse le MTU du lien (${bottleneckMtu} octets).`,
      pmtudSuggestedMtu: bottleneckMtu,
    };

    return {
      originalPacketSize,
      originalPayloadSize,
      ingressMtu: options.ingressMtu,
      bottleneckMtu,
      identification: options.identification,
      isDfSet: true,
      isDroppedDueToDf: true,
      maxFragmentDataSize: Math.floor((bottleneckMtu - IP_HEADER_SIZE_BYTES) / 8) * 8,
      fragments: [],
      totalFragmentsCount: 0,
      totalOverheadBytes: 0,
      efficiencyPercentage: 0,
      icmpError,
    };
  }

  // Case 3: RFC 791 Fragmentation (every non-final fragment payload must be a multiple of 8 bytes)
  const rawMaxPayload = bottleneckMtu - IP_HEADER_SIZE_BYTES;
  const maxFragmentDataSize = Math.max(8, Math.floor(rawMaxPayload / 8) * 8);
  const totalFragmentsCount = Math.ceil(originalPayloadSize / maxFragmentDataSize);

  const fragments: IpFragment[] = [];
  let cursorByte = 0;

  for (let idx = 0; idx < totalFragmentsCount; idx++) {
    const isLast = idx === totalFragmentsCount - 1;
    const remainingBytes = originalPayloadSize - cursorByte;
    const fragPayloadBytes = isLast ? remainingBytes : maxFragmentDataSize;
    const offsetIn8ByteUnits = cursorByte / 8;

    const textStart = Math.floor((cursorByte / originalPayloadSize) * options.payloadText.length);
    const textEnd = isLast
      ? options.payloadText.length
      : Math.max(textStart + 1, Math.floor(((cursorByte + fragPayloadBytes) / originalPayloadSize) * options.payloadText.length));

    fragments.push({
      fragmentIndex: idx,
      totalFragments: totalFragmentsCount,
      identification: options.identification,
      totalLength: fragPayloadBytes + IP_HEADER_SIZE_BYTES,
      headerLength: IP_HEADER_SIZE_BYTES,
      payloadLength: fragPayloadBytes,
      df: false,
      mf: !isLast,
      fragmentOffset: offsetIn8ByteUnits,
      byteRangeStart: cursorByte,
      byteRangeEnd: cursorByte + fragPayloadBytes - 1,
      payloadText: options.payloadText.slice(textStart, textEnd) || `FRAG_${idx}`,
      ttl: Math.max(1, options.ttl - 1),
      protocol: options.protocol,
      sourceIp: options.sourceIp,
      destinationIp: options.destinationIp,
      status: 'PENDING',
    });

    cursorByte += fragPayloadBytes;
  }

  const totalOverheadBytes = totalFragmentsCount * IP_HEADER_SIZE_BYTES;
  const totalWireBytes = originalPayloadSize + totalOverheadBytes;
  const efficiencyPercentage = roundTo((originalPayloadSize / totalWireBytes) * 100, 2);

  return {
    originalPacketSize,
    originalPayloadSize,
    ingressMtu: options.ingressMtu,
    bottleneckMtu,
    identification: options.identification,
    isDfSet: false,
    isDroppedDueToDf: false,
    maxFragmentDataSize,
    fragments,
    totalFragmentsCount,
    totalOverheadBytes,
    efficiencyPercentage,
  };
};

export const createInitialReassemblyBuffer = (expectedTotalPayloadBytes: number): ReassemblyBufferState => ({
  expectedTotalPayloadBytes,
  receivedPayloadBytes: 0,
  receivedFragments: [],
  missingByteRanges: expectedTotalPayloadBytes > 0 ? [{ start: 0, end: expectedTotalPayloadBytes - 1 }] : [],
  isComplete: false,
  isTimedOut: false,
  reassembledPayload: null,
  timerSecondsRemaining: 30,
  logMessages: [`Tampon de réassemblage initialisé : attente de ${expectedTotalPayloadBytes} octets utiles.`],
});

/**
 * Pure insertion of an arriving IPv4 fragment (supports out-of-order arrival and duplicate suppression)
 */
export const insertFragmentIntoBuffer = (
  buffer: ReassemblyBufferState,
  fragment: IpFragment
): ReassemblyBufferState => {
  if (buffer.isTimedOut || buffer.isComplete) return buffer;

  const alreadyPresent = buffer.receivedFragments.some(f => f.fragmentIndex === fragment.fragmentIndex);
  if (alreadyPresent) return buffer;

  const updatedReceived = [...buffer.receivedFragments, { ...fragment, status: 'RECEIVED' as const }];
  const sortedFragments = [...updatedReceived].sort((a, b) => a.byteRangeStart - b.byteRangeStart);

  // Recompute missing byte holes
  const missingByteRanges: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (const frag of sortedFragments) {
    if (frag.byteRangeStart > cursor) {
      missingByteRanges.push({ start: cursor, end: frag.byteRangeStart - 1 });
    }
    cursor = Math.max(cursor, frag.byteRangeEnd + 1);
  }

  if (cursor < buffer.expectedTotalPayloadBytes) {
    missingByteRanges.push({ start: cursor, end: buffer.expectedTotalPayloadBytes - 1 });
  }

  const receivedPayloadBytes = sortedFragments.reduce((sum, f) => sum + f.payloadLength, 0);
  const hasLastFragmentArrived = sortedFragments.some(f => f.mf === false);
  const isComplete = missingByteRanges.length === 0 && hasLastFragmentArrived && receivedPayloadBytes === buffer.expectedTotalPayloadBytes;

  const reassembledPayload = isComplete ? sortedFragments.map(f => f.payloadText).join('') : null;
  const logEntry = isComplete
    ? `Fragment #${fragment.fragmentIndex} reçu (Offset=${fragment.fragmentOffset}, MF=0). Réassemblage complet réussi !`
    : `Fragment #${fragment.fragmentIndex} inséré [${fragment.byteRangeStart}..${fragment.byteRangeEnd}] (Offset=${fragment.fragmentOffset}, MF=${fragment.mf ? 1 : 0}).`;

  return {
    ...buffer,
    receivedPayloadBytes,
    receivedFragments: updatedReceived,
    missingByteRanges,
    isComplete,
    reassembledPayload,
    logMessages: [...buffer.logMessages.slice(-8), logEntry],
  };
};

export const tickReassemblyBufferTimer = (buffer: ReassemblyBufferState): ReassemblyBufferState => {
  if (buffer.isComplete || buffer.isTimedOut) return buffer;
  const nextSec = Math.max(0, buffer.timerSecondsRemaining - 1);
  if (nextSec === 0) {
    return {
      ...buffer,
      timerSecondsRemaining: 0,
      isTimedOut: true,
      logMessages: [
        ...buffer.logMessages.slice(-8),
        'Expiration du délai RFC 791 (30s) : fragments incomplets purgés de la mémoire et envoi ICMP Time Exceeded (Type 11 Code 1).',
      ],
    };
  }
  return {
    ...buffer,
    timerSecondsRemaining: nextSec,
  };
};
