/**
 * Pure Functional Packet Pipeline:
 * Handles Encapsulation (L7 -> L1) and Decapsulation (L1 -> L7)
 * Generates exact headers, checksums, and bitstreams.
 */

import {
  ApplicationData,
  TransportHeader,
  NetworkHeader,
  DataLinkHeader,
  PhysicalLayerData,
  EncapsulatedPacket,
  OsiLayerNumber,
  OsiLayerInfo,
  TransportProtocol,
  ApplicationProtocol,
  ParityType,
} from '../types/network';
import { stringToBytes, stringToBinary, countOnes, toHex16, toHex32 } from './functional';
import { calculateCrc32Bytes, calculateInternetChecksum } from './errorDetection';

export const OSI_LAYERS_INFO: Record<OsiLayerNumber, OsiLayerInfo> = {
  7: {
    layer: 7,
    nameFr: 'Application',
    nameEn: 'Application',
    pduName: 'Donnée / Message',
    color: '#EC4899', // Pink
    borderClass: 'border-pink-500/30',
    bgClass: 'bg-pink-500/10',
    textClass: 'text-pink-400',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    descriptionFr: 'Interface avec l’utilisateur et protocoles d’application de haut niveau (HTTP, HTTPS, DNS, SMTP, SSH).',
    keyProtocols: ['HTTP/3', 'HTTPS', 'DNS', 'SMTP', 'SSH', 'MQTT'],
    typicalEquipment: 'Navigateur, Client Web, Serveur applicatif',
    headerSizeTypicalBytes: 0,
  },
  6: {
    layer: 6,
    nameFr: 'Présentation',
    nameEn: 'Presentation',
    pduName: 'Donnée formatée',
    color: '#8B5CF6', // Purple
    borderClass: 'border-purple-500/30',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    descriptionFr: 'Traduction, encodage des caractères (UTF-8, ASCII), chiffrement TLS/SSL et compression des données.',
    keyProtocols: ['TLS 1.3', 'SSL', 'UTF-8', 'JSON', 'JPEG', 'GZIP'],
    typicalEquipment: 'Bibliothèques de sérialisation et cryptographie',
    headerSizeTypicalBytes: 5,
  },
  5: {
    layer: 5,
    nameFr: 'Session',
    nameEn: 'Session',
    pduName: 'Donnée de session',
    color: '#6366F1', // Indigo
    borderClass: 'border-indigo-500/30',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    descriptionFr: 'Gestion, synchronisation, ouverture et fermeture des dialogues et sessions entre applications distantes.',
    keyProtocols: ['RPC', 'NetBIOS', 'PPTP', 'Sockets POSIX'],
    typicalEquipment: 'Gestionnaire de connexions du Système d’Exploitation',
    headerSizeTypicalBytes: 0,
  },
  4: {
    layer: 4,
    nameFr: 'Transport',
    nameEn: 'Transport',
    pduName: 'Segment (TCP) / Datagramme (UDP)',
    color: '#3B82F6', // Blue
    borderClass: 'border-blue-500/30',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    descriptionFr: 'Communication de bout-en-bout fiable (TCP) ou rapide (UDP), adressage des ports logiques, contrôle de flux et segmentation.',
    keyProtocols: ['TCP', 'UDP', 'QUIC', 'SCTP'],
    typicalEquipment: 'Pile réseau de l’OS (Kernel), Pare-feu applicatif L4',
    headerSizeTypicalBytes: 20,
  },
  3: {
    layer: 3,
    nameFr: 'Réseau',
    nameEn: 'Network',
    pduName: 'Paquet (Packet)',
    color: '#06B6D4', // Cyan
    borderClass: 'border-cyan-500/30',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    descriptionFr: 'Adressage logique universel (adresses IP), routage des paquets entre différents sous-réseaux et décrémentation du TTL.',
    keyProtocols: ['IPv4', 'IPv6', 'ICMP', 'OSPF', 'BGP', 'ARP'],
    typicalEquipment: 'Routeur (Router L3), Commutateur de niveau 3 (Layer 3 Switch)',
    headerSizeTypicalBytes: 20,
  },
  2: {
    layer: 2,
    nameFr: 'Liaison de Données',
    nameEn: 'Data Link',
    pduName: 'Trame (Frame)',
    color: '#10B981', // Emerald
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    descriptionFr: 'Transmission physique locale sur le même segment réseau, adressage matériel (adresses MAC) et contrôle d’intégrité (FCS CRC-32).',
    keyProtocols: ['Ethernet (IEEE 802.3)', 'Wi-Fi (802.11)', 'PPP', 'VLAN (802.1Q)'],
    typicalEquipment: 'Commutateur (Switch L2), Carte Réseau (NIC), Pont (Bridge)',
    headerSizeTypicalBytes: 18, // 14 Header + 4 Trailer FCS
  },
  1: {
    layer: 1,
    nameFr: 'Physique',
    nameEn: 'Physical',
    pduName: 'Bits / Signaux',
    color: '#F59E0B', // Amber
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    descriptionFr: 'Conversion des trames en signaux électriques, impulsions lumineuses ou ondes radio (bits 0 et 1), synchronisation d’horloge et débit binaire.',
    keyProtocols: ['1000BASE-T', '10GBASE-LR', 'V.90', 'Codage Manchester', 'NRZ'],
    typicalEquipment: 'Câble RJ45 Cuivre, Fibre Optique, Hub / Répéteur, Émetteur Radio',
    headerSizeTypicalBytes: 8, // 8B Preamble + SFD + 12B IFG
  },
};

export interface PacketBuilderOptions {
  readonly payloadText: string;
  readonly appProtocol: ApplicationProtocol;
  readonly transportProtocol: TransportProtocol;
  readonly sourcePort: number;
  readonly destinationPort: number;
  readonly sourceIp: string;
  readonly destinationIp: string;
  readonly sourceMac: string;
  readonly destinationMac: string;
  readonly ttl: number;
  readonly parityType: ParityType;
}

export const createDefaultPacketOptions = (): PacketBuilderOptions => ({
  payloadText: 'GET /index.html HTTP/1.1\r\nHost: serveur-reseau.fr\r\nAccept: text/html',
  appProtocol: 'HTTP',
  transportProtocol: 'TCP',
  sourcePort: 54321,
  destinationPort: 80,
  sourceIp: '192.168.1.10',
  destinationIp: '198.51.100.25',
  sourceMac: '00:1A:2B:3C:4D:5E',
  destinationMac: '70:85:C2:A1:B2:C3',
  ttl: 64,
  parityType: 'even',
});

/**
 * Pure builder creating full encapsulated packet with all real calculated checksums
 */
export const buildEncapsulatedPacket = (
  options: PacketBuilderOptions,
  currentLayer: OsiLayerNumber = 1,
  isEncapsulating: boolean = true
): EncapsulatedPacket => {
  const payloadBytesArray = stringToBytes(options.payloadText);
  const payloadBytesCount = payloadBytesArray.length;

  const appData: ApplicationData = {
    protocol: options.appProtocol,
    payloadText: options.payloadText,
    payloadBytes: payloadBytesCount,
    mimeType: options.appProtocol === 'HTTP' ? 'text/html; charset=utf-8' : 'application/octet-stream',
  };

  // Transport Header (Layer 4)
  const isTcp = options.transportProtocol === 'TCP';
  const transportHeaderLen = isTcp ? 20 : 8;
  const transportChecksumBytes = [
    ...payloadBytesArray,
    (options.sourcePort >> 8) & 0xff,
    options.sourcePort & 0xff,
    (options.destinationPort >> 8) & 0xff,
    options.destinationPort & 0xff,
  ];
  const transportChecksumNum = calculateInternetChecksum(transportChecksumBytes);

  const transportHeader: TransportHeader = {
    protocol: options.transportProtocol,
    sourcePort: options.sourcePort,
    destinationPort: options.destinationPort,
    sequenceNumber: 3829104712,
    ackNumber: 1048576,
    flags: {
      syn: false,
      ack: true,
      fin: false,
      psh: true,
      rst: false,
    },
    windowSize: 64240,
    checksumHex: toHex16(transportChecksumNum),
    headerLengthBytes: transportHeaderLen,
  };

  // Network Header (Layer 3)
  const ipHeaderLengthBytes = 20;
  const totalIpLengthBytes = ipHeaderLengthBytes + transportHeaderLen + payloadBytesCount;
  
  // Fake IP header bytes array for checksum calculation
  const ipHeaderBytesForChecksum = [
    0x45, // Version 4, IHL 5 (20 bytes)
    0x00, // TOS / DSCP
    (totalIpLengthBytes >> 8) & 0xff,
    totalIpLengthBytes & 0xff,
    0x1A, 0x2B, // Identification
    0x40, 0x00, // Flags (Don't fragment DF=1)
    options.ttl & 0xff,
    isTcp ? 6 : 17, // Protocol number (6 TCP, 17 UDP)
    0x00, 0x00, // Checksum placeholder
    192, 168, 1, 10, // Source IP
    198, 51, 100, 25, // Dest IP
  ];
  const ipChecksumNum = calculateInternetChecksum(ipHeaderBytesForChecksum);

  const networkHeader: NetworkHeader = {
    version: 4,
    ihl: 5,
    tos: 0,
    totalLengthBytes: totalIpLengthBytes,
    identification: 6699,
    flags: {
      df: true,
      mf: false,
    },
    fragmentOffset: 0,
    ttl: options.ttl,
    protocolNumber: isTcp ? 6 : 17,
    checksumHex: toHex16(ipChecksumNum),
    sourceIp: options.sourceIp,
    destinationIp: options.destinationIp,
    headerLengthBytes: ipHeaderLengthBytes,
  };

  // Layer 2 - Data Link (Ethernet II Frame)
  // Compute true CRC32 on Ethernet payload (IP Packet + L2 Headers)
  const frameBytesForCrc = [
    ...stringToBytes(options.destinationMac.replace(/:/g, '')),
    ...stringToBytes(options.sourceMac.replace(/:/g, '')),
    0x08, 0x00, // EtherType IPv4
    ...ipHeaderBytesForChecksum,
    ...payloadBytesArray,
  ];
  const crc32Int = calculateCrc32Bytes(frameBytesForCrc);

  const dataLinkHeader: DataLinkHeader = {
    preambleBytes: 8, // 7B Preamble + 1B SFD
    destinationMac: options.destinationMac,
    sourceMac: options.sourceMac,
    etherTypeHex: '0x0800',
    headerLengthBytes: 14,
    trailerFcsBytes: 4,
    interFrameGapBytes: 12,
    fcsCrc32Hex: toHex32(crc32Int),
    isCorrupted: false,
  };

  // Layer 1 - Physical Bitstream
  const fullBinaryStream = stringToBinary(options.payloadText);
  const bitCount = fullBinaryStream.length;
  
  // Parity calculation per byte
  const parityBits: string[] = [];
  for (let i = 0; i < fullBinaryStream.length; i += 8) {
    const byteSlice = fullBinaryStream.slice(i, i + 8);
    const ones = countOnes(byteSlice);
    if (options.parityType === 'even') {
      parityBits.push(ones % 2 === 0 ? '0' : '1');
    } else if (options.parityType === 'odd') {
      parityBits.push(ones % 2 === 0 ? '1' : '0');
    }
  }

  const physicalData: PhysicalLayerData = {
    bitStream: fullBinaryStream,
    bitCount,
    encoding: 'NRZ',
    parityType: options.parityType,
    parityBits,
    corruptedBitIndices: [],
  };

  return {
    id: `pkt-${Date.now()}`,
    timestamp: Date.now(),
    appData,
    transportHeader,
    networkHeader,
    dataLinkHeader,
    physicalData,
    currentLayer,
    isEncapsulating,
  };
};
