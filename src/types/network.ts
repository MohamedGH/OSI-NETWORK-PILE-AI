/**
 * Network Simulation & OSI Model Types
 */

export type OsiLayerNumber = 7 | 6 | 5 | 4 | 3 | 2 | 1;

export interface OsiLayerInfo {
  readonly layer: OsiLayerNumber;
  readonly nameFr: string;
  readonly nameEn: string;
  readonly pduName: string; // e.g. "Donnée", "Segment", "Paquet", "Trame", "Bits"
  readonly color: string;
  readonly borderClass: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly badgeClass: string;
  readonly descriptionFr: string;
  readonly keyProtocols: string[];
  readonly typicalEquipment: string;
  readonly headerSizeTypicalBytes: number;
}

export type TransportProtocol = 'TCP' | 'UDP';
export type ApplicationProtocol = 'HTTP' | 'DNS' | 'ICMP_ECHO' | 'CUSTOM';

export interface ApplicationData {
  readonly protocol: ApplicationProtocol;
  readonly payloadText: string;
  readonly payloadBytes: number;
  readonly mimeType?: string;
}

export interface TransportHeader {
  readonly protocol: TransportProtocol;
  readonly sourcePort: number;
  readonly destinationPort: number;
  readonly sequenceNumber: number; // For TCP
  readonly ackNumber: number; // For TCP
  readonly flags: {
    readonly syn: boolean;
    readonly ack: boolean;
    readonly fin: boolean;
    readonly psh: boolean;
    readonly rst: boolean;
  };
  readonly windowSize: number; // For TCP (bytes)
  readonly checksumHex: string;
  readonly headerLengthBytes: number; // 20 for TCP min, 8 for UDP
}

export interface NetworkHeader {
  readonly version: 4;
  readonly ihl: number; // Internet Header Length (words of 32 bits, default 5 = 20B)
  readonly tos: number; // Type of service / DSCP
  readonly totalLengthBytes: number;
  readonly identification: number;
  readonly flags: {
    readonly df: boolean; // Don't Fragment
    readonly mf: boolean; // More Fragments
  };
  readonly fragmentOffset: number;
  readonly ttl: number; // Time to Live
  readonly protocolNumber: number; // 6 = TCP, 17 = UDP, 1 = ICMP
  readonly checksumHex: string;
  readonly sourceIp: string;
  readonly destinationIp: string;
  readonly headerLengthBytes: number; // 20 standard
}

export interface DataLinkHeader {
  readonly preambleBytes: number; // 7 bytes preamble + 1 byte SFD = 8B
  readonly destinationMac: string;
  readonly sourceMac: string;
  readonly etherTypeHex: string; // 0x0800 for IPv4, 0x0806 for ARP
  readonly headerLengthBytes: number; // 14 bytes (6 MAC dest + 6 MAC src + 2 Type)
  readonly trailerFcsBytes: number; // 4 bytes (CRC32)
  readonly interFrameGapBytes: number; // 12 bytes standard Ethernet IFG
  readonly fcsCrc32Hex: string;
  readonly isCorrupted?: boolean;
}

export type ParityType = 'even' | 'odd' | 'none';

export interface PhysicalLayerData {
  readonly bitStream: string; // raw string of '0' and '1'
  readonly bitCount: number;
  readonly encoding: 'NRZ' | 'Manchester' | 'MLT-3';
  readonly parityType: ParityType;
  readonly parityBits: string[]; // Parity bit calculated per byte/block
  readonly corruptedBitIndices: number[];
}

export interface EncapsulatedPacket {
  readonly id: string;
  readonly timestamp: number;
  readonly appData: ApplicationData;
  readonly transportHeader: TransportHeader;
  readonly networkHeader: NetworkHeader;
  readonly dataLinkHeader: DataLinkHeader;
  readonly physicalData: PhysicalLayerData;
  readonly currentLayer: OsiLayerNumber;
  readonly isEncapsulating: boolean; // true = down stack, false = up stack
}

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

// Network Topology & Journey Types
export type DeviceType = 'HOST' | 'SWITCH' | 'ROUTER' | 'SERVER';

export interface NetworkDevice {
  readonly id: string;
  readonly name: string;
  readonly type: DeviceType;
  readonly osiLayerMax: 2 | 3 | 7;
  readonly ipAddress?: string;
  readonly macAddress: string;
  readonly interfaces: Array<{
    readonly portName: string;
    readonly ip?: string;
    readonly mac: string;
    readonly connectedToDeviceId?: string;
  }>;
  readonly macTable?: Record<string, string>; // Switch: MAC -> Port
  readonly routingTable?: Array<{
    readonly destinationNet: string;
    readonly netmask: string;
    readonly nextHop: string;
    readonly interfaceName: string;
  }>;
}

export interface NetworkHop {
  readonly stepIndex: number;
  readonly fromDeviceId: string;
  readonly toDeviceId: string;
  readonly deviceProcessingId: string;
  readonly descriptionFr: string;
  readonly layerInspected: OsiLayerNumber;
  readonly actionType: 'GENERATE' | 'L2_COMMUTATION' | 'L3_ROUTING' | 'RECEPTION' | 'ERROR_DROP';
  readonly beforeHeaders: {
    readonly srcMac: string;
    readonly dstMac: string;
    readonly srcIp: string;
    readonly dstIp: string;
    readonly ttl: number;
    readonly crc32: string;
  };
  readonly afterHeaders: {
    readonly srcMac: string;
    readonly dstMac: string;
    readonly srcIp: string;
    readonly dstIp: string;
    readonly ttl: number;
    readonly crc32: string;
  };
  readonly explanationFr: string[];
}

// Bandwidth & Throughput Types
export interface BandwidthCalculationParams {
  readonly nominalBitrateMbps: number; // e.g., 100 Mbps, 1000 Mbps (1 Gbps)
  readonly payloadSizeBytes: number; // e.g. 1460 bytes (MSS)
  readonly mtuBytes: number; // e.g. 1500 bytes standard Ethernet
  readonly transportProtocol: TransportProtocol;
  readonly packetLossRatePercent: number; // 0 to 100%
  readonly rttMs: number; // Round Trip Time
  readonly windowSizeBytes: number; // TCP Window Size (e.g. 64KB)
  readonly enableJumboFrames: boolean; // 9000 bytes
  readonly useBinaryUnits: boolean; // MiB vs MB
}

export interface BandwidthCalculationResult {
  readonly nominalBitrateBps: number;
  readonly nominalBitrateFormatted: string;
  
  // Per packet byte breakdown
  readonly preambleBytes: number; // 8B
  readonly ifgBytes: number; // 12B
  readonly ethernetHeaderBytes: number; // 14B
  readonly fcsBytes: number; // 4B
  readonly totalL2OverheadBytes: number; // 38B
  
  readonly ipHeaderBytes: number; // 20B
  readonly transportHeaderBytes: number; // 20B for TCP, 8B for UDP
  readonly totalHeadersBytes: number; // L2(14) + L3(20) + L4(20/8) + FCS(4) = 58/46 B
  readonly onWireFrameTotalBytes: number; // Preamble(8) + IFG(12) + Eth(14) + IP(20) + L4(20/8) + Payload + FCS(4)
  
  // Efficiencies
  readonly l2EfficiencyPercent: number;
  readonly l4PayloadEfficiencyPercent: number; // Goodput efficiency
  
  // Throughputs
  readonly realThroughputMbps: number; // Physical wire throughput considering channel/losses
  readonly goodputMbps: number; // Actual application data delivered
  readonly goodputMBS: number; // MegaBytes / second (MB/s)
  readonly goodputMibS: number; // MebiBytes / second (MiB/s)
  
  readonly maxPacketsPerSecond: number;
  readonly timeToTransfer100MBSeconds: number;
  readonly timeToTransfer1GBSeconds: number;
}

// Error Detection Types
export interface ParityResult {
  readonly inputBinary: string;
  readonly onesCount: number;
  readonly evenParityBit: '0' | '1';
  readonly oddParityBit: '0' | '1';
  readonly encodedEven: string;
  readonly encodedOdd: string;
  readonly isValidEven: boolean;
  readonly isValidOdd: boolean;
}

export interface CrcStep {
  readonly step: number;
  readonly remainderBinary: string;
  readonly currentBit: string;
  readonly quotientBit: string;
  readonly xorApplied: boolean;
}

export interface Crc32Result {
  readonly inputAscii: string;
  readonly inputBinary: string;
  readonly inputHex: string;
  readonly polynomialHex: string; // 0xEDB88320 (reversed) or 0x04C11DB7
  readonly crc32Hex: string;
  readonly crc32Binary: string;
  readonly crc32Int: number;
  readonly isValid: boolean;
  readonly detailedStepsCount: number;
}

// Route Type
export type AppRoute = 'osi' | 'stack-journey' | 'tcp-engine' | 'journey' | 'bandwidth' | 'errors' | 'tests' | 'glossary';

// TCP Congestion & Reliability Types
export type TcpAlgorithm = 'RENO' | 'TAHOE' | 'CUBIC' | 'BBR';
export type TcpCongestionPhase = 'SLOW_START' | 'CONGESTION_AVOIDANCE' | 'FAST_RECOVERY' | 'TIMEOUT_RTO';

export interface TcpRttDataPoint {
  readonly rttIndex: number;
  readonly cwndMss: number;
  readonly ssthreshMss: number;
  readonly phase: TcpCongestionPhase;
  readonly eventDescription: string;
  readonly isLossEvent?: boolean;
}

export type TcpSegmentStatus = 'ACKED' | 'IN_FLIGHT' | 'USABLE_WINDOW' | 'BLOCKED_OUTSIDE';

export interface TcpSegmentBlock {
  readonly seqNum: number;
  readonly byteRange: string;
  readonly status: TcpSegmentStatus;
  readonly isLost?: boolean;
  readonly isSacked?: boolean;
  readonly isRetransmitted?: boolean;
}

export type TcpScenarioTab = 'CONGESTION_GRAPH' | 'SLIDING_WINDOW' | 'FAST_RETRANSMIT' | 'SACK_SIMULATION' | 'FLOW_CONTROL_RWND' | 'HANDSHAKE';

export interface TcpLossScenarioStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly senderAction: string;
  readonly inFlightPackets: number[];
  readonly receiverAction: string;
  readonly ackGenerated: { ackNum: number; isDup: boolean; dupCount: number; sackBlocks?: string };
  readonly technicalInsight: string;
}

// Stack-to-Stack Visualizer Types
export type StackJourneyPhase = 'HOST_A_ENCAPSULATION' | 'NETWORK_TRANSIT' | 'HOST_B_DECAPSULATION';

export interface WireTrameSlice {
  readonly id: string;
  readonly name: string;
  readonly byteSize: number;
  readonly byteRange: string;
  readonly hexSample: string;
  readonly colorClass: string;
  readonly layerLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L7' | 'TRAILER';
  readonly description: string;
  readonly isAddedAtThisStep?: boolean;
  readonly isModifiedAtThisStep?: boolean;
  readonly isRemovedAtThisStep?: boolean;
}

export interface StackToStackStep {
  readonly stepNumber: number; // 1 to 10
  readonly phase: StackJourneyPhase;
  readonly title: string;
  readonly subtitle: string;
  readonly locationBadge: string;
  
  // Layer highlights
  readonly activeHostALayer: OsiLayerNumber | null;
  readonly activeHostBLayer: OsiLayerNumber | null;
  readonly activeTransitNodeId: string | null; // e.g. 'pc1', 'cable-1', 'sw1', 'cable-2', 'r1', 'cable-3', 'sw2', 'cable-4', 'server1'
  readonly pduName: string; // Message, Segment TCP, Paquet IP, Trame Ethernet, Bits
  
  // Live Frame state on wire / memory
  readonly frameSummary: {
    readonly srcMac: string;
    readonly dstMac: string;
    readonly srcIp: string;
    readonly dstIp: string;
    readonly srcPort: number;
    readonly dstPort: number;
    readonly ttl: number;
    readonly fcsCrc32Hex: string;
    readonly totalBytesOnWire: number;
    readonly isCrcValid: boolean;
  };
  
  // Detailed explanation bullet points
  readonly keyActions: string[];
  readonly technicalDeepDive: string;
  
  // Trame byte breakdown
  readonly trameSlices: WireTrameSlice[];
}

// Test Suite Types
export interface TestCaseResult {
  readonly id: string;
  readonly name: string;
  readonly category: 'OSI_ENCAPSULATION' | 'CRC32_PARITY' | 'L2_SWITCH' | 'L3_ROUTING' | 'BANDWIDTH_MATH' | 'UNITS_CONVERSION';
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
  readonly executionTimeMs: number;
  readonly details?: string;
}

export interface TestSuiteReport {
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly executionTimeTotalMs: number;
  readonly results: TestCaseResult[];
}
