/**
 * OSI Encapsulation Pipeline (Layers 7 to 1) & Bandwidth / Goodput Calculator
 * Pure functional transformations.
 */

import {
  OsiLayerInfo,
  OsiLayerNumber,
  PacketBuilderOptions,
  EncapsulatedPacket,
  BandwidthCalculationParams,
  BandwidthCalculationResult,
} from '../types/network';
import { calculateCrc32, calculateInternetChecksum, calculateParity, asciiToBinary } from './errorDetection';
import { roundTo } from './functional';

export const OSI_LAYERS: OsiLayerInfo[] = [
  {
    layer: 7,
    nameFr: 'Application',
    nameEn: 'Application',
    pduName: 'Données (Message)',
    accentColor: '#38bdf8',
    descriptionFr: 'Interface directe avec les processus applicatifs et protocoles de haut niveau.',
    keyProtocols: ['HTTP/3', 'DNS', 'TLS', 'SSH', 'SMTP'],
    typicalEquipment: 'Passerelle applicative, Proxy inverse, Serveur Web',
    headerSizeTypicalBytes: 0,
  },
  {
    layer: 6,
    nameFr: 'Présentation',
    nameEn: 'Presentation',
    pduName: 'Données formatées',
    accentColor: '#60a5fa',
    descriptionFr: 'Traduction syntaxique, encodage UTF-8/JSON, compression et chiffrement TLS.',
    keyProtocols: ['TLS 1.3', 'UTF-8', 'JSON', 'Protobuf'],
    typicalEquipment: 'Terminateur TLS, Codec matériel',
    headerSizeTypicalBytes: 0,
  },
  {
    layer: 5,
    nameFr: 'Session',
    nameEn: 'Session',
    pduName: 'Données de session',
    accentColor: '#818cf8',
    descriptionFr: 'Ouverture, maintien, synchronisation et reprise des dialogues entre hôtes.',
    keyProtocols: ['NetBIOS', 'RPC', 'SOCKS5'],
    typicalEquipment: 'Pare-feu à états (Stateful Firewall)',
    headerSizeTypicalBytes: 0,
  },
  {
    layer: 4,
    nameFr: 'Transport',
    nameEn: 'Transport',
    pduName: 'Segment (TCP) / Datagramme (UDP)',
    accentColor: '#f59e0b',
    descriptionFr: 'Multiplexage par ports, fiabilité de bout en bout, fenêtre glissante et contrôle de congestion (CUBIC, BBR).',
    keyProtocols: ['TCP (RFC 9293)', 'UDP', 'QUIC', 'SCTP'],
    typicalEquipment: 'Équilibreur de charge L4 (Load Balancer)',
    headerSizeTypicalBytes: 20,
  },
  {
    layer: 3,
    nameFr: 'Réseau',
    nameEn: 'Network',
    pduName: 'Paquet IP',
    accentColor: '#10b981',
    descriptionFr: 'Adressage logique IPv4/IPv6, routage inter-réseaux (OSPF, BGP), gestion du TTL et fragmentation MTU.',
    keyProtocols: ['IPv4 (RFC 791)', 'IPv6', 'ICMP', 'OSPF', 'BGP-4'],
    typicalEquipment: 'Routeur L3, Commutateur multicouche',
    headerSizeTypicalBytes: 20,
  },
  {
    layer: 2,
    nameFr: 'Liaison de données',
    nameEn: 'Data Link',
    pduName: 'Trame Ethernet',
    accentColor: '#ec4899',
    descriptionFr: 'Adressage physique MAC (48 bits), commutation locale et détection d’erreurs par FCS CRC32.',
    keyProtocols: ['Ethernet IEEE 802.3', 'Wi-Fi 802.11ax', 'VLAN 802.1Q', 'ARP'],
    typicalEquipment: 'Commutateur L2 (Switch), Pont réseau, Carte NIC',
    headerSizeTypicalBytes: 18,
  },
  {
    layer: 1,
    nameFr: 'Physique',
    nameEn: 'Physical',
    pduName: 'Flux de Bits / Symboles',
    accentColor: '#a855f7',
    descriptionFr: 'Transmission physique des bits sur le médium (impulsions laser 1310/1550 nm, codage NRZ/PAM4, radio).',
    keyProtocols: ['10GBASE-SR/LR', 'ITU-T G.652D', 'DWDM', 'NRZ / Manchester'],
    typicalEquipment: 'Transceiver SFP+/QSFP28, Répéteur optique EDFA, Fibre',
    headerSizeTypicalBytes: 20,
  },
];

export const createDefaultPacketOptions = (): PacketBuilderOptions => ({
  payloadText: 'GET /api/telemetry HTTP/1.1',
  appProtocol: 'HTTP',
  transportProtocol: 'TCP',
  sourcePort: 54321,
  destinationPort: 443,
  sourceIp: '192.168.1.100',
  destinationIp: '198.51.100.25',
  sourceMac: 'BC:24:11:99:A1:04',
  destinationMac: '00:1C:73:FA:90:01',
  ttl: 64,
  parityType: 'even',
});

export const buildEncapsulatedPacket = (
  options: PacketBuilderOptions,
  currentLayer: OsiLayerNumber = 7,
  isEncapsulating = true
): EncapsulatedPacket => {
  const payloadBytes = new TextEncoder().encode(options.payloadText).length;
  const transportHeaderLen = options.transportProtocol === 'TCP' ? 20 : 8;
  const ipTotalLen = 20 + transportHeaderLen + payloadBytes;

  const ipBytesSample = [
    0x45, 0x00, (ipTotalLen >> 8) & 0xff, ipTotalLen & 0xff,
    0x4a, 0x2f, 0x40, 0x00,
    options.ttl & 0xff, options.transportProtocol === 'TCP' ? 6 : 17,
  ];
  const ipChecksum = calculateInternetChecksum(ipBytesSample);
  const crcResult = calculateCrc32(`${options.sourceMac}${options.destinationMac}${options.sourceIp}${options.payloadText}`);
  const bitStream = asciiToBinary(options.payloadText).slice(0, 64) || '0100100001010100';
  const parityRes = calculateParity(bitStream.slice(0, 8));

  return {
    id: 'pkt-osi-1',
    timestamp: Date.now(),
    appData: {
      protocol: options.appProtocol,
      payloadText: options.payloadText,
      payloadBytes,
    },
    transportHeader: {
      protocol: options.transportProtocol,
      sourcePort: options.sourcePort,
      destinationPort: options.destinationPort,
      sequenceNumber: 1048576,
      ackNumber: 2097152,
      flags: { syn: false, ack: true, fin: false, psh: true, rst: false },
      windowSize: 65535,
      checksumHex: '0x9A4C',
      headerLengthBytes: transportHeaderLen,
    },
    networkHeader: {
      version: 4,
      ihl: 5,
      tos: 0,
      totalLengthBytes: ipTotalLen,
      identification: 0x4a2f,
      flags: { df: true, mf: false },
      fragmentOffset: 0,
      ttl: options.ttl,
      protocolNumber: options.transportProtocol === 'TCP' ? 6 : 17,
      checksumHex: ipChecksum,
      sourceIp: options.sourceIp,
      destinationIp: options.destinationIp,
      headerLengthBytes: 20,
    },
    dataLinkHeader: {
      preambleBytes: 8,
      destinationMac: options.destinationMac,
      sourceMac: options.sourceMac,
      etherTypeHex: '0x0800',
      headerLengthBytes: 14,
      trailerFcsBytes: 4,
      interFrameGapBytes: 12,
      fcsCrc32Hex: crcResult.crc32Hex,
    },
    physicalData: {
      bitStream,
      bitCount: bitStream.length,
      encoding: 'Manchester',
      parityType: options.parityType,
      parityBits: [parityRes.evenParityBit],
    },
    currentLayer,
    isEncapsulating,
  };
};

export const calculateBandwidthMetrics = (
  params: BandwidthCalculationParams
): BandwidthCalculationResult => {
  const preambleBytes = 8;
  const ifgBytes = 12;
  const ethernetHeaderBytes = 14;
  const fcsBytes = 4;
  const totalL2OverheadBytes = preambleBytes + ifgBytes + ethernetHeaderBytes + fcsBytes; // 38B

  const ipHeaderBytes = 20;
  const transportHeaderBytes = params.transportProtocol === 'TCP' ? 20 : 8;
  const totalHeadersBytes = ethernetHeaderBytes + fcsBytes + ipHeaderBytes + transportHeaderBytes;
  const onWireFrameTotalBytes = preambleBytes + ifgBytes + totalHeadersBytes + params.payloadSizeBytes;

  const l2EfficiencyPercent = roundTo(
    ((params.payloadSizeBytes + ipHeaderBytes + transportHeaderBytes) / onWireFrameTotalBytes) * 100,
    2
  );
  const l4PayloadEfficiencyPercent = roundTo(
    (params.payloadSizeBytes / onWireFrameTotalBytes) * 100,
    2
  );

  const lossFactor = Math.max(0, 1 - params.packetLossRatePercent / 100);
  const realThroughputMbps = roundTo(params.nominalBitrateMbps * lossFactor, 2);
  const goodputMbps = roundTo(realThroughputMbps * (l4PayloadEfficiencyPercent / 100), 2);
  const goodputMBS = roundTo(goodputMbps / 8, 2);

  const nominalBitrateBps = params.nominalBitrateMbps * 1_000_000;
  const maxPacketsPerSecond = Math.floor(nominalBitrateBps / (onWireFrameTotalBytes * 8));

  // Bandwidth-Delay Product (BDP) in Bytes = (Bitrate_bps * RTT_sec) / 8
  const bdpBytes = Math.round((nominalBitrateBps * (params.rttMs / 1000)) / 8);

  return {
    nominalBitrateBps,
    preambleBytes,
    ifgBytes,
    ethernetHeaderBytes,
    fcsBytes,
    totalL2OverheadBytes,
    ipHeaderBytes,
    transportHeaderBytes,
    totalHeadersBytes,
    onWireFrameTotalBytes,
    l2EfficiencyPercent,
    l4PayloadEfficiencyPercent,
    realThroughputMbps,
    goodputMbps,
    goodputMBS,
    maxPacketsPerSecond,
    bdpBytes,
  };
};
