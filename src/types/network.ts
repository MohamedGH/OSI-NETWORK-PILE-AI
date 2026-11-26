/**
 * Network Simulation, TCP Congestion (CUBIC, Reno, Tahoe, BBR), Sliding Window,
 * CRC32, IP Fragmentation (MTU), OSI Stack, and Town / Inter-City Transit Types
 */

export type OsiLayerNumber = 7 | 6 | 5 | 4 | 3 | 2 | 1;

export interface OsiLayerInfo {
  readonly layer: OsiLayerNumber;
  readonly nameFr: string;
  readonly nameEn: string;
  readonly pduName: string;
  readonly accentColor: string;
  readonly descriptionFr: string;
  readonly keyProtocols: string[];
  readonly typicalEquipment: string;
  readonly headerSizeTypicalBytes: number;
}

export type TransportProtocol = 'TCP' | 'UDP';
export type ApplicationProtocol = 'HTTP' | 'DNS' | 'ICMP_ECHO' | 'CUSTOM';
export type ParityType = 'even' | 'odd' | 'none';

export interface ApplicationData {
  readonly protocol: ApplicationProtocol;
  readonly payloadText: string;
  readonly payloadBytes: number;
}

export interface TransportHeader {
  readonly protocol: TransportProtocol;
  readonly sourcePort: number;
  readonly destinationPort: number;
  readonly sequenceNumber: number;
  readonly ackNumber: number;
  readonly flags: {
    readonly syn: boolean;
    readonly ack: boolean;
    readonly fin: boolean;
    readonly psh: boolean;
    readonly rst: boolean;
  };
  readonly windowSize: number;
  readonly checksumHex: string;
  readonly headerLengthBytes: number;
}

export interface NetworkHeader {
  readonly version: 4;
  readonly ihl: number;
  readonly tos: number;
  readonly totalLengthBytes: number;
  readonly identification: number;
  readonly flags: {
    readonly df: boolean;
    readonly mf: boolean;
  };
  readonly fragmentOffset: number;
  readonly ttl: number;
  readonly protocolNumber: number;
  readonly checksumHex: string;
  readonly sourceIp: string;
  readonly destinationIp: string;
  readonly headerLengthBytes: number;
}

export interface DataLinkHeader {
  readonly preambleBytes: number;
  readonly destinationMac: string;
  readonly sourceMac: string;
  readonly etherTypeHex: string;
  readonly headerLengthBytes: number;
  readonly trailerFcsBytes: number;
  readonly interFrameGapBytes: number;
  readonly fcsCrc32Hex: string;
}

export interface PhysicalLayerData {
  readonly bitStream: string;
  readonly bitCount: number;
  readonly encoding: 'NRZ' | 'Manchester' | 'MLT-3';
  readonly parityType: ParityType;
  readonly parityBits: string[];
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
  readonly isEncapsulating: boolean;
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

// ========================================================
// TCP Congestion (CUBIC, Reno, Tahoe, BBR) & Sliding Window
// ========================================================

export type TcpAlgorithm = 'CUBIC' | 'RENO' | 'TAHOE' | 'BBR';
export type TcpCongestionPhase = 'SLOW_START' | 'CONGESTION_AVOIDANCE' | 'FAST_RECOVERY' | 'TIMEOUT_RTO' | 'BBR_PROBE_BW';

export interface TcpRttDataPoint {
  readonly rttIndex: number;
  readonly cwndMss: number;
  readonly ssthreshMss: number;
  readonly rwndMss: number;
  readonly effectiveWindowMss: number;
  readonly phase: TcpCongestionPhase;
  readonly eventDescription: string;
  readonly isLossEvent?: boolean;
  readonly wMaxMss?: number;
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

export type TcpScenarioTab =
  | 'CONGESTION_GRAPH'
  | 'SLIDING_WINDOW'
  | 'ALGO_COMPARATOR'
  | 'FAST_RETRANSMIT_SACK'
  | 'FLOW_CONTROL_RWND';

export interface TcpLossScenarioStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly senderAction: string;
  readonly inFlightPackets: number[];
  readonly receiverAction: string;
  readonly ackGenerated: {
    readonly ackNum: number;
    readonly isDup: boolean;
    readonly dupCount: number;
    readonly sackBlocks?: string;
  };
  readonly technicalInsight: string;
}

// ========================================================
// CRC32, Parity & Checksum Error Detection Types
// ========================================================

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
  readonly byteIndex: number;
  readonly byteHex: string;
  readonly crcBeforeHex: string;
  readonly crcAfterHex: string;
  readonly polynomialApplied: boolean;
}

export interface Crc32Result {
  readonly inputAscii: string;
  readonly inputBinary: string;
  readonly inputHex: string;
  readonly polynomialHex: string;
  readonly crc32Hex: string;
  readonly crc32Binary: string;
  readonly crc32Int: number;
  readonly isValid: boolean;
  readonly byteSteps: CrcStep[];
}

// ========================================================
// IP Fragmentation & Reassembly (RFC 791 / PMTUD)
// ========================================================

export interface IpFragment {
  readonly fragmentIndex: number;
  readonly totalFragments: number;
  readonly identification: number;
  readonly totalLength: number;
  readonly headerLength: number;
  readonly payloadLength: number;
  readonly df: boolean;
  readonly mf: boolean;
  readonly fragmentOffset: number;
  readonly byteRangeStart: number;
  readonly byteRangeEnd: number;
  readonly payloadText: string;
  readonly ttl: number;
  readonly protocol: 'TCP' | 'UDP' | 'ICMP';
  readonly sourceIp: string;
  readonly destinationIp: string;
  readonly status: 'PENDING' | 'IN_FLIGHT' | 'RECEIVED' | 'DROPPED';
}

export interface IcmpFragNeededMessage {
  readonly type: number;
  readonly code: number;
  readonly nextHopMtu: number;
  readonly routerIp: string;
  readonly description: string;
  readonly pmtudSuggestedMtu: number;
}

export interface IpFragmentationPlan {
  readonly originalPacketSize: number;
  readonly originalPayloadSize: number;
  readonly ingressMtu: number;
  readonly bottleneckMtu: number;
  readonly identification: number;
  readonly isDfSet: boolean;
  readonly isDroppedDueToDf: boolean;
  readonly maxFragmentDataSize: number;
  readonly fragments: IpFragment[];
  readonly totalFragmentsCount: number;
  readonly totalOverheadBytes: number;
  readonly efficiencyPercentage: number;
  readonly icmpError?: IcmpFragNeededMessage;
}

export interface ReassemblyBufferState {
  readonly expectedTotalPayloadBytes: number;
  readonly receivedPayloadBytes: number;
  readonly receivedFragments: IpFragment[];
  readonly missingByteRanges: Array<{ readonly start: number; readonly end: number }>;
  readonly isComplete: boolean;
  readonly isTimedOut: boolean;
  readonly reassembledPayload: string | null;
  readonly timerSecondsRemaining: number;
  readonly logMessages: string[];
}

// ========================================================
// Intra-Town & Inter-City (Inter-Ville) Transit Types
// ========================================================

export type TownSimulationScope = 'INTRA_TOWN' | 'INTER_CITIES' | 'GLOBAL_SEAMLESS';

export type TownNodeType =
  | 'SMART_HOME'
  | 'MANHOLE_TELECOM'
  | 'STREET_CABINET'
  | 'CELL_TOWER_5G'
  | 'RIVER_SIPHON'
  | 'METRO_POP'
  | 'MUNICIPAL_DATACENTER';

export type TownMediumType =
  | 'WIFI_6_RADIO'
  | 'G652_SINGLEMODE_FIBER'
  | 'MICROWAVE_5G'
  | 'SUBMARINE_RIVER_FIBER'
  | 'CAT6A_COPPER'
  | 'DWDM_LONG_HAUL';

export type TownIncidentType =
  | 'NONE'
  | 'FIBER_CUT'
  | 'RAIN_STORM'
  | 'RUSH_HOUR'
  | 'TGV_FIBER_CUT'
  | 'EDFA_PUMP_FAIL';

export type TownPacketType =
  | 'HTTP_GET'
  | 'STREAM_4K'
  | 'ICMP_PING'
  | 'IOT_TELEMETRY'
  | 'VOIP_CALL';

export interface TownNode {
  readonly id: string;
  readonly label: string;
  readonly districtName: string;
  readonly type: TownNodeType;
  readonly x: number;
  readonly y: number;
  readonly osiLayer: OsiLayerNumber;
  readonly ipAddress?: string;
  readonly macAddress?: string;
  readonly status: 'ONLINE' | 'CONGESTED' | 'DISRUPTED';
  readonly equipmentModel: string;
  readonly queueLoadPercent: number;
  readonly opticalPowerDbm: number;
  readonly temperatureC: number;
  readonly descriptionFr: string;
}

export interface TownLink {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly mediumType: TownMediumType;
  readonly mediumNameFr: string;
  readonly distanceMeters: number;
  readonly propagationSpeedKmS: number;
  readonly nominalBitrateGbps: number;
  readonly attenuationDbPerKm: number;
  readonly isBackupRoute: boolean;
  readonly isSubterranean: boolean;
  readonly isWireless: boolean;
  readonly waypoints: Array<{ readonly x: number; readonly y: number }>;
  readonly descriptionFr: string;
}

export interface InterCityNode {
  readonly id: string;
  readonly name: string;
  readonly regionName: string;
  readonly role: 'NATIONAL_IXP' | 'REGIONAL_POP' | 'SUBMARINE_LANDING' | 'OPTICAL_AMPLIFIER_SHELTER';
  readonly x: number;
  readonly y: number;
  readonly bgpAsNumber: number;
  readonly asName: string;
  readonly dwdmCapacityTbps: number;
  readonly activeWavelengths: number;
  readonly edfaGainDb: number;
  readonly osnrDb: number;
  readonly descriptionFr: string;
}

export interface InterCityLink {
  readonly id: string;
  readonly fromCityId: string;
  readonly toCityId: string;
  readonly nameFr: string;
  readonly infraType: 'TGV_RAILWAY_FIBER' | 'HIGHWAY_CONDUIT' | 'RTE_HIGH_VOLTAGE_OPGW' | 'SUBSEA_MEDITERRANEAN';
  readonly distanceKm: number;
  readonly fiberStandard: string;
  readonly dwdmCapacityTbps: number;
  readonly edfaAmplifiersCount: number;
  readonly propagationSpeedKmS: number;
  readonly isBackupRing: boolean;
  readonly waypoints: Array<{ readonly x: number; readonly y: number }>;
  readonly descriptionFr: string;
}

export interface TownFlightPacket {
  readonly id: string;
  readonly packetType: TownPacketType;
  readonly color: string;
  readonly progress: number;
  readonly currentLinkIndex: number;
  readonly totalLinksInPath: number;
  readonly currentHopNodeId: string;
  readonly currentHopName: string;
  readonly currentMedium: string;
  readonly accumulatedLatencyUs: number;
  readonly payloadBytes: number;
  readonly ttl: number;
  readonly status: 'TRAVELLING' | 'DELIVERED' | 'DROPPED_CONGESTION' | 'REROUTED' | 'DROPPED_CUT';
  readonly pathLinkIds: string[];
}

export interface TownSimulationMetrics {
  readonly totalPacketsEmitted: number;
  readonly totalPacketsDelivered: number;
  readonly totalPacketsDropped: number;
  readonly totalPacketsRerouted: number;
  readonly averageTransitLatencyUs: number;
  readonly currentPhysicalPathLengthMeters: number;
  readonly opticalSignalQualityDb: number;
}

// ========================================================
// Bandwidth & Throughput Calculation Types
// ========================================================

export interface BandwidthCalculationParams {
  readonly nominalBitrateMbps: number;
  readonly payloadSizeBytes: number;
  readonly mtuBytes: number;
  readonly transportProtocol: TransportProtocol;
  readonly packetLossRatePercent: number;
  readonly rttMs: number;
  readonly windowSizeBytes: number;
  readonly enableJumboFrames: boolean;
}

export interface BandwidthCalculationResult {
  readonly nominalBitrateBps: number;
  readonly preambleBytes: number;
  readonly ifgBytes: number;
  readonly ethernetHeaderBytes: number;
  readonly fcsBytes: number;
  readonly totalL2OverheadBytes: number;
  readonly ipHeaderBytes: number;
  readonly transportHeaderBytes: number;
  readonly totalHeadersBytes: number;
  readonly onWireFrameTotalBytes: number;
  readonly l2EfficiencyPercent: number;
  readonly l4PayloadEfficiencyPercent: number;
  readonly realThroughputMbps: number;
  readonly goodputMbps: number;
  readonly goodputMBS: number;
  readonly maxPacketsPerSecond: number;
  readonly bdpBytes: number;
}

// ========================================================
// Route & Automated Test Suite Types
// ========================================================

export type AppRoute =
  | 'tcp-engine'
  | 'errors'
  | 'town-transit'
  | 'fragmentation'
  | 'osi'
  | 'tests';

export interface TestCaseResult {
  readonly id: string;
  readonly name: string;
  readonly category:
    | 'TCP_CUBIC_WINDOW'
    | 'CRC32_PARITY'
    | 'TOWN_INTERCITY'
    | 'IP_FRAGMENTATION'
    | 'OSI_BANDWIDTH';
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
  readonly executionTimeMs: number;
  readonly details: string;
}

export interface TestSuiteReport {
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly executionTimeTotalMs: number;
  readonly results: TestCaseResult[];
}
