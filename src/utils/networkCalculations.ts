/**
 * Pure Functional Network Bandwidth, Throughput & Unit Conversions:
 * - Débit Nominal (Theoretical Link Rate)
 * - Débit Réel (Wire/Physical Throughput)
 * - Débit Utile (Goodput)
 * - Overheads protocolaires (L2 Ethernet + IFG + Préambule + L3 IP + L4 TCP/UDP + FCS CRC32)
 * - Décomposition des unités (bps, Kbps, Mbps, Gbps, Kibit/s, Mibit/s, Ko/s, Mo/s, Kio/s, Mio/s)
 */

import { BandwidthCalculationParams, BandwidthCalculationResult } from '../types/network';
import { formatBitrateFr } from './functional';

// Protocol Constant Overheads in Bytes
export const ETHERNET_PREAMBLE_SFD_BYTES = 8; // 7 bytes preamble + 1 byte SFD
export const ETHERNET_MAC_HEADER_BYTES = 14; // 6B Dst MAC + 6B Src MAC + 2B EtherType
export const ETHERNET_FCS_CRC32_BYTES = 4; // 4B CRC32
export const ETHERNET_IFG_BYTES = 12; // 12 bytes Inter-Frame Gap (96 bit-times)
export const TOTAL_L2_PHYSICAL_OVERHEAD =
  ETHERNET_PREAMBLE_SFD_BYTES +
  ETHERNET_MAC_HEADER_BYTES +
  ETHERNET_FCS_CRC32_BYTES +
  ETHERNET_IFG_BYTES; // 38 Bytes

export const IPV4_HEADER_MIN_BYTES = 20;
export const TCP_HEADER_MIN_BYTES = 20;
export const UDP_HEADER_BYTES = 8;

/**
 * Pure calculation of comprehensive network throughput, goodput, and overheads
 */
export const calculateBandwidthMetrics = (
  params: BandwidthCalculationParams
): BandwidthCalculationResult => {
  const {
    nominalBitrateMbps,
    payloadSizeBytes,
    mtuBytes,
    transportProtocol,
    packetLossRatePercent,
    rttMs,
    windowSizeBytes,
  } = params;

  const nominalBitrateBps = nominalBitrateMbps * 1_000_000;
  const transportHeaderBytes = transportProtocol === 'TCP' ? TCP_HEADER_MIN_BYTES : UDP_HEADER_BYTES;
  const ipHeaderBytes = IPV4_HEADER_MIN_BYTES;

  // Maximum Payload per packet constrained by MTU (MSS)
  const maxPayloadPerPacket = Math.min(
    payloadSizeBytes,
    mtuBytes - ipHeaderBytes - transportHeaderBytes
  );

  const effectivePayload = Math.max(1, maxPayloadPerPacket);

  // Per packet byte breakdown
  const ethernetHeaderBytes = ETHERNET_MAC_HEADER_BYTES;
  const fcsBytes = ETHERNET_FCS_CRC32_BYTES;
  const preambleBytes = ETHERNET_PREAMBLE_SFD_BYTES;
  const ifgBytes = ETHERNET_IFG_BYTES;
  const totalL2OverheadBytes = TOTAL_L2_PHYSICAL_OVERHEAD;

  const totalHeadersBytes = ethernetHeaderBytes + ipHeaderBytes + transportHeaderBytes + fcsBytes;
  const onWireFrameTotalBytes = totalL2OverheadBytes + ipHeaderBytes + transportHeaderBytes + effectivePayload;

  // Layer 2 / Physical wire efficiency
  const l2FrameBytes = ethernetHeaderBytes + ipHeaderBytes + transportHeaderBytes + effectivePayload + fcsBytes;
  const l2EfficiencyPercent = (l2FrameBytes / onWireFrameTotalBytes) * 100;

  // Payload (Goodput) Efficiency: payload / total wire bytes
  const l4PayloadEfficiencyPercent = (effectivePayload / onWireFrameTotalBytes) * 100;

  // Real physical link throughput considering packet loss
  const lossFactor = Math.max(0, 1 - packetLossRatePercent / 100);
  
  // TCP Window & RTT bottleneck consideration (Bandwidth-Delay Product)
  let tcpWindowLimitMbps = nominalBitrateMbps;
  if (transportProtocol === 'TCP' && rttMs > 0 && windowSizeBytes > 0) {
    const windowBits = windowSizeBytes * 8;
    const rttSec = rttMs / 1000;
    const maxBdpMbps = (windowBits / rttSec) / 1_000_000;
    tcpWindowLimitMbps = Math.min(nominalBitrateMbps, maxBdpMbps);
  }

  // Real wire throughput
  const realThroughputMbps = tcpWindowLimitMbps * lossFactor;

  // Goodput (Useful throughput of raw user data)
  const goodputMbps = realThroughputMbps * (l4PayloadEfficiencyPercent / 100);
  const goodputMBS = (goodputMbps * 1_000_000) / (8 * 1_000_000); // Decimal MB/s
  const goodputMibS = (goodputMbps * 1_000_000) / (8 * 1024 * 1024); // Binary MiB/s

  // Max packets per second on the link
  const maxPacketsPerSecond = Math.floor(nominalBitrateBps / (onWireFrameTotalBytes * 8));

  // Time calculations
  const totalBits100MB = 100 * 1_000_000 * 8;
  const timeToTransfer100MBSeconds = goodputMbps > 0 ? (totalBits100MB / (goodputMbps * 1_000_000)) : 0;

  const totalBits1GB = 1 * 1_000_000_000 * 8;
  const timeToTransfer1GBSeconds = goodputMbps > 0 ? (totalBits1GB / (goodputMbps * 1_000_000)) : 0;

  return {
    nominalBitrateBps,
    nominalBitrateFormatted: formatBitrateFr(nominalBitrateBps),
    preambleBytes,
    ifgBytes,
    ethernetHeaderBytes,
    fcsBytes,
    totalL2OverheadBytes,
    ipHeaderBytes,
    transportHeaderBytes,
    totalHeadersBytes,
    onWireFrameTotalBytes,
    l2EfficiencyPercent: parseFloat(l2EfficiencyPercent.toFixed(2)),
    l4PayloadEfficiencyPercent: parseFloat(l4PayloadEfficiencyPercent.toFixed(2)),
    realThroughputMbps: parseFloat(realThroughputMbps.toFixed(2)),
    goodputMbps: parseFloat(goodputMbps.toFixed(2)),
    goodputMBS: parseFloat(goodputMBS.toFixed(2)),
    goodputMibS: parseFloat(goodputMibS.toFixed(2)),
    maxPacketsPerSecond,
    timeToTransfer100MBSeconds: parseFloat(timeToTransfer100MBSeconds.toFixed(3)),
    timeToTransfer1GBSeconds: parseFloat(timeToTransfer1GBSeconds.toFixed(3)),
  };
};

/**
 * Unit conversion helper table across all standard networking units
 */
export interface UnitConversionRow {
  readonly unitName: string;
  readonly symbol: string;
  readonly baseType: 'bits' | 'bytes' | 'binary_bits' | 'binary_bytes';
  readonly valueFormatted: string;
  readonly rawValue: number;
  readonly descriptionFr: string;
}

export const convertBitrateUnits = (nominalBps: number): UnitConversionRow[] => [
  {
    unitName: 'Bits par seconde (Standard SI)',
    symbol: 'bps ou bit/s',
    baseType: 'bits',
    rawValue: nominalBps,
    valueFormatted: `${nominalBps.toLocaleString('fr-FR')} bps`,
    descriptionFr: 'Unité fondamentale de débit physique binaire',
  },
  {
    unitName: 'Kilobits par seconde (10³ bits)',
    symbol: 'Kbps ou kbit/s',
    baseType: 'bits',
    rawValue: nominalBps / 1_000,
    valueFormatted: `${(nominalBps / 1_000).toLocaleString('fr-FR')} Kbps`,
    descriptionFr: 'Utilisé pour la voix sur IP (VoIP) et codecs audio',
  },
  {
    unitName: 'Mégabits par seconde (10⁶ bits)',
    symbol: 'Mbps ou Mbit/s',
    baseType: 'bits',
    rawValue: nominalBps / 1_000_000,
    valueFormatted: `${(nominalBps / 1_000_000).toLocaleString('fr-FR')} Mbps`,
    descriptionFr: 'Unité usuelle des FAI (ADSL, 4G, Fibre grand public)',
  },
  {
    unitName: 'Gigabits par seconde (10⁹ bits)',
    symbol: 'Gbps ou Gbit/s',
    baseType: 'bits',
    rawValue: nominalBps / 1_000_000_000,
    valueFormatted: `${(nominalBps / 1_000_000_000).toLocaleString('fr-FR')} Gbps`,
    descriptionFr: 'Fibre optique moderne, réseaux d’entreprise 10G/100G',
  },
  {
    unitName: 'Kibibits par seconde (2¹⁰ bits = 1024 b)',
    symbol: 'Kibit/s',
    baseType: 'binary_bits',
    rawValue: nominalBps / 1024,
    valueFormatted: `${(nominalBps / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Kibit/s`,
    descriptionFr: 'Norme CEI / IEC binaire informatique',
  },
  {
    unitName: 'Mebibits par seconde (2²⁰ bits)',
    symbol: 'Mibit/s',
    baseType: 'binary_bits',
    rawValue: nominalBps / (1024 * 1024),
    valueFormatted: `${(nominalBps / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mibit/s`,
    descriptionFr: 'Unité exacte utilisée par les systèmes d’exploitation',
  },
  {
    unitName: 'Kilo-octets par seconde (10³ Octets)',
    symbol: 'Ko/s ou kB/s',
    baseType: 'bytes',
    rawValue: nominalBps / 8 / 1000,
    valueFormatted: `${(nominalBps / 8 / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Ko/s`,
    descriptionFr: 'Débit en volume d’octets (1 Octet = 8 bits)',
  },
  {
    unitName: 'Méga-octets par seconde (10⁶ Octets)',
    symbol: 'Mo/s ou MB/s',
    baseType: 'bytes',
    rawValue: nominalBps / 8 / 1_000_000,
    valueFormatted: `${(nominalBps / 8 / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mo/s`,
    descriptionFr: 'Vitesse de téléchargement de fichiers affichée dans le navigateur',
  },
  {
    unitName: 'Mebioctets par seconde (2²⁰ Octets = 1 048 576 B)',
    symbol: 'Mio/s ou MiB/s',
    baseType: 'binary_bytes',
    rawValue: nominalBps / 8 / (1024 * 1024),
    valueFormatted: `${(nominalBps / 8 / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mio/s`,
    descriptionFr: 'Taux réel binaire de transfert de fichiers (Linux, Windows)',
  },
];
