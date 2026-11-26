/**
 * Automated Unit Test Suite Runner
 * Validates TCP CUBIC/Reno/Tahoe/BBR, Sliding Window, IEEE 802.3 CRC32, Parity,
 * RFC 791 IPv4 Fragmentation & Reassembly, Intra-Town & Inter-City DWDM Physics, and OSI Bandwidth.
 */

import { TestCaseResult, TestSuiteReport } from '../types/network';
import {
  calculateCubicWindow,
  createInitialTcpState,
  stepTcpNormalAck,
  stepTcpTripleDupAck,
  stepTcpTimeoutRto,
  computeSlidingWindowSegments,
} from '../utils/tcpCongestionEngine';
import {
  calculateCrc32,
  calculateParity,
  verifyParityCodeword,
  calculateInternetChecksum,
} from '../utils/errorDetection';
import {
  calculateIpFragmentation,
  createInitialReassemblyBuffer,
  insertFragmentIntoBuffer,
  tickReassemblyBufferTimer,
} from '../utils/ipFragmentationEngine';
import {
  calculatePropagationDelayUs,
  calculateOpticalAttenuationDb,
  calculateRainAttenuationDb,
  computeActiveTownPath,
  SPEED_OF_LIGHT_FIBER_KM_S,
} from '../utils/townJourneyEngine';
import { calculateBandwidthMetrics } from '../utils/packetPipeline';

export const runAutomatedTestSuite = (): TestSuiteReport => {
  const startTime = performance.now();
  const results: TestCaseResult[] = [];

  const addTest = (
    id: string,
    name: string,
    category: TestCaseResult['category'],
    passed: boolean,
    expected: string,
    actual: string,
    details: string
  ) => {
    results.push({
      id,
      name,
      category,
      passed,
      expected,
      actual,
      executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
      details,
    });
  };

  // ========================================================
  // 1. TCP CUBIC, Reno, Tahoe, BBR & Sliding Window Tests
  // ========================================================
  const cubicAtK = calculateCubicWindow(2.47, 20);
  addTest(
    'tcp-01',
    'Formule TCP CUBIC RFC 8312 : Plateau concave autour de W_max lorsque t ≈ K',
    'TCP_CUBIC_WINDOW',
    Math.abs(cubicAtK.wCubicMss - 20) < 0.2,
    'W_cubic(K) ≈ 20 MSS',
    `W_cubic = ${cubicAtK.wCubicMss} MSS (K = ${cubicAtK.kFactor})`,
    'W_cubic(t) = C*(t - K)^3 + W_max atteint son point d’inflexion en t = K'
  );

  let cubicState = createInitialTcpState('CUBIC');
  for (let i = 0; i < 4; i++) cubicState = stepTcpNormalAck(cubicState); // cwnd = 16 MSS
  const afterCubicLoss = stepTcpTripleDupAck(cubicState);
  addTest(
    'tcp-02',
    'TCP CUBIC vs Reno sur 3 Dup-ACK : Réduction multiplicative β = 0.7 (70%)',
    'TCP_CUBIC_WINDOW',
    afterCubicLoss.cwndMss === 11.2 && afterCubicLoss.wMaxMss === 16,
    'cwnd = 11.2 MSS (16 * 0.7), W_max = 16 MSS',
    `cwnd = ${afterCubicLoss.cwndMss} MSS, W_max = ${afterCubicLoss.wMaxMss} MSS`,
    'CUBIC conserve 70% de la fenêtre avant perte contre 50% pour TCP Reno'
  );

  let tahoeState = createInitialTcpState('TAHOE');
  for (let i = 0; i < 4; i++) tahoeState = stepTcpNormalAck(tahoeState);
  const afterTahoeDup = stepTcpTripleDupAck(tahoeState);
  addTest(
    'tcp-03',
    'TCP Tahoe sur 3 Dup-ACK : Réinitialisation stricte cwnd = 1 MSS (Slow Start)',
    'TCP_CUBIC_WINDOW',
    afterTahoeDup.cwndMss === 1 && afterTahoeDup.ssthreshMss === 8,
    'cwnd = 1 MSS, ssthresh = 8 MSS',
    `cwnd = ${afterTahoeDup.cwndMss} MSS, ssthresh = ${afterTahoeDup.ssthreshMss} MSS`,
    'Tahoe ne possède pas de Fast Recovery et repart systématiquement à 1 MSS'
  );

  const winSegments = computeSlidingWindowSegments(100, 8, 5, 16);
  const inFlightCount = winSegments.filter(s => s.status === 'IN_FLIGHT').length;
  const usableCount = winSegments.filter(s => s.status === 'USABLE_WINDOW').length;
  addTest(
    'tcp-04',
    'Fenêtre Glissante (Sliding Window) : Partitionnement En-Vol / Utilisable / Bloqué',
    'TCP_CUBIC_WINDOW',
    inFlightCount === 5 && usableCount === 3,
    '5 segments IN_FLIGHT, 3 segments USABLE_WINDOW (W_eff = 8 MSS)',
    `IN_FLIGHT = ${inFlightCount}, USABLE = ${usableCount}`,
    'La fenêtre effective W = min(cwnd, rwnd) borne strictement les octets non acquittés'
  );

  // ========================================================
  // 2. IEEE 802.3 CRC32, Parity & Checksum Tests
  // ========================================================
  const crcStd = calculateCrc32('123456789');
  addTest(
    'crc-01',
    'Vecteur Standard IEEE 802.3 CRC32 ("123456789" -> 0xCBF43926)',
    'CRC32_PARITY',
    crcStd.crc32Hex === '0xCBF43926' && crcStd.isValid,
    '0xCBF43926',
    crcStd.crc32Hex,
    'Polynôme générateur Ethernet G(x) = 0x04C11DB7 (réfléchi 0xEDB88320)'
  );

  const crcCorrupted = calculateCrc32('123456789', [12]);
  addTest(
    'crc-02',
    'Détection d’inversion de bit par FCS CRC32 (Bit #12 corrompu)',
    'CRC32_PARITY',
    crcCorrupted.isValid === false && crcCorrupted.crc32Hex !== '0xCBF43926',
    'isValid = false (empreinte modifiée)',
    `isValid = ${crcCorrupted.isValid}, CRC = ${crcCorrupted.crc32Hex}`,
    'Toute erreur simple, double ou en rafale ≤ 32 bits est détectée à 100%'
  );

  const parityCheck = calculateParity('0110001'); // three '1' bits
  addTest(
    'crc-03',
    'Bit de Parité Paire et Impaire (Séquence "0110001" contenant trois 1)',
    'CRC32_PARITY',
    parityCheck.evenParityBit === '1' && parityCheck.oddParityBit === '0' && verifyParityCodeword(parityCheck.encodedEven, 'even'),
    'Parité paire = 1, Parité impaire = 0',
    `Paire = ${parityCheck.evenParityBit}, Impaire = ${parityCheck.oddParityBit}`,
    'Complète le nombre total de bits à 1 pour atteindre une somme paire ou impaire'
  );

  // ========================================================
  // 3. IPv4 Fragmentation (MTU) & Reassembly (RFC 791)
  // ========================================================
  const fragPlan = calculateIpFragmentation({
    packetTotalSize: 4000,
    bottleneckMtu: 1500,
    ingressMtu: 1500,
    isDfSet: false,
    identification: 0x4a2f,
    payloadText: 'PAYLOAD_TEST_4000_BYTES',
    sourceIp: '192.168.1.10',
    destinationIp: '198.51.100.25',
    protocol: 'TCP',
    ttl: 64,
  });
  addTest(
    'frag-01',
    'Découpe RFC 791 (Paquet 4000 octets sur lien MTU 1500 -> 3 fragments alignés sur 8 octets)',
    'IP_FRAGMENTATION',
    fragPlan.totalFragmentsCount === 3 &&
      fragPlan.fragments[0].fragmentOffset === 0 &&
      fragPlan.fragments[1].fragmentOffset === 185 &&
      fragPlan.fragments[2].fragmentOffset === 370 &&
      fragPlan.fragments[2].mf === false,
    '3 fragments : Offsets [0, 185, 370], MF=[1, 1, 0]',
    `Fragments=${fragPlan.totalFragmentsCount}, Offsets=[${fragPlan.fragments.map(f => f.fragmentOffset).join(', ')}]`,
    '1480 octets utiles par fragment / 8 = 185 unités d’offset'
  );

  const dfDropPlan = calculateIpFragmentation({
    packetTotalSize: 2000,
    bottleneckMtu: 1500,
    ingressMtu: 1500,
    isDfSet: true,
    identification: 0x4a2f,
    payloadText: 'PMTUD_TEST',
    sourceIp: '192.168.1.10',
    destinationIp: '198.51.100.25',
    protocol: 'TCP',
    ttl: 64,
  });
  addTest(
    'frag-02',
    'PMTUD RFC 1191 (Drapeau DF=1 + Paquet > MTU -> Rejet ICMP Type 3 Code 4)',
    'IP_FRAGMENTATION',
    dfDropPlan.isDroppedDueToDf && dfDropPlan.icmpError?.type === 3 && dfDropPlan.icmpError?.code === 4,
    'Rejet + ICMP Type 3 Code 4 (MTU suggéré 1500B)',
    `isDropped=${dfDropPlan.isDroppedDueToDf}, ICMP=${dfDropPlan.icmpError?.type}/${dfDropPlan.icmpError?.code}`,
    'Permet la découverte dynamique du Path MTU sans fragmentation intermédiaire'
  );

  let reassemblyBuf = createInitialReassemblyBuffer(fragPlan.originalPayloadSize);
  reassemblyBuf = insertFragmentIntoBuffer(reassemblyBuf, fragPlan.fragments[2]); // arrive out-of-order (#2 first)
  reassemblyBuf = insertFragmentIntoBuffer(reassemblyBuf, fragPlan.fragments[0]);
  reassemblyBuf = insertFragmentIntoBuffer(reassemblyBuf, fragPlan.fragments[1]);
  addTest(
    'frag-03',
    'Réassemblage Hors-Ordre (Out-of-Order #2 -> #0 -> #1) sans trou mémoire résiduel',
    'IP_FRAGMENTATION',
    reassemblyBuf.isComplete && reassemblyBuf.missingByteRanges.length === 0,
    'isComplete = true, 0 trou restant',
    `isComplete = ${reassemblyBuf.isComplete}, trous = ${reassemblyBuf.missingByteRanges.length}`,
    'Le tampon de l’hôte récepteur réordonne les fragments via leur champ Fragment Offset'
  );

  // ========================================================
  // 4. Intra-Town & Inter-City (Inter-Ville) Optical Physics
  // ========================================================
  const fiberDelay1Km = calculatePropagationDelayUs(1000, SPEED_OF_LIGHT_FIBER_KM_S);
  addTest(
    'town-01',
    'Propagation Optique Silice G.652D (Indice n = 1.4682 -> ~4.897 µs/km)',
    'TOWN_INTERCITY',
    fiberDelay1Km >= 4.89 && fiberDelay1Km <= 4.91,
    '4.897 µs/km',
    `${fiberDelay1Km} µs/km`,
    'Vitesse dans le cœur de silice v = c / 1.4682 ≈ 204 190 km/s'
  );

  const interCityReroute = computeActiveTownPath('INTER_CITIES', 'TGV_FIBER_CUT');
  addTest(
    'town-02',
    'Basculement Inter-Ville ROADM : Contournement LGV coupée via câble haute tension RTE 400 kV (OPGW)',
    'TOWN_INTERCITY',
    interCityReroute.isRerouted && interCityReroute.pathLinks.some(l => l.id === 'ic_paris_alps_opgw'),
    'isRerouted = true via liaison RTE OPGW',
    `isRerouted = ${interCityReroute.isRerouted}, liens = ${interCityReroute.pathLinks.length}`,
    'Protection anneau optique DWDM inter-villes (< 50 ms)'
  );

  // ========================================================
  // 5. OSI Encapsulation & Goodput Efficiency
  // ========================================================
  const bw = calculateBandwidthMetrics({
    nominalBitrateMbps: 1000,
    payloadSizeBytes: 1460,
    mtuBytes: 1500,
    transportProtocol: 'TCP',
    packetLossRatePercent: 0,
    rttMs: 20,
    windowSizeBytes: 65536,
    enableJumboFrames: false,
  });
  addTest(
    'osi-01',
    'Rendement Utile (Goodput TCP/IPv4/Ethernet sur MTU 1500 : 1460 / 1538 octets = 94.93%)',
    'OSI_BANDWIDTH',
    bw.onWireFrameTotalBytes === 1538 && bw.goodputMbps === 949.28,
    'Trame sur fil = 1538B, Goodput = 949.28 Mbps',
    `Trame = ${bw.onWireFrameTotalBytes}B, Goodput = ${bw.goodputMbps} Mbps`,
    'Inclut Préambule (8B) + IFG (12B) + Ethernet (14B) + FCS (4B) + IPv4 (20B) + TCP (20B)'
  );

  const passedTests = results.filter(r => r.passed).length;
  return {
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    executionTimeTotalMs: parseFloat((performance.now() - startTime).toFixed(2)),
    results,
  };
};
