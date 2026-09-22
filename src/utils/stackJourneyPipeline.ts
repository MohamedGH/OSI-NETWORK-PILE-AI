/**
 * Pure Functional Stack-to-Stack Journey Pipeline
 * Computes all 10 stages of a packet traveling from Host A TCP/IP Stack -> Wire / L2 / L3 Transit -> Host B TCP/IP Stack.
 */

import {
  StackToStackStep,
  PacketBuilderOptions,
  WireTrameSlice,
} from '../types/network';
import { stringToBytes, stringToBinary, toHex16, toHex32 } from './functional';
import { calculateCrc32Bytes, calculateInternetChecksum } from './errorDetection';

export const generateStackJourneySteps = (options: PacketBuilderOptions): StackToStackStep[] => {
  const payloadBytes = stringToBytes(options.payloadText || 'GET / HTTP/1.1');
  const payloadLen = payloadBytes.length;
  const payloadHex = payloadBytes
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  // Compute checksums for original packet
  const dummyIpHeader = [
    0x45, 0x00, 0x00, 20 + 20 + payloadLen,
    0x1c, 0x46, 0x40, 0x00,
    options.ttl, options.transportProtocol === 'TCP' ? 6 : 17,
    0x00, 0x00, // zero checksum during calculation
    192, 168, 1, 10,
    198, 51, 100, 25,
  ];
  const ipChecksumInt = calculateInternetChecksum(dummyIpHeader);
  const ipChecksumHex = '0x' + toHex16(ipChecksumInt);

  // Compute mutated router checksum (TTL - 1 = 63)
  const dummyIpHeaderRouter = [
    0x45, 0x00, 0x00, 20 + 20 + payloadLen,
    0x1c, 0x46, 0x40, 0x00,
    options.ttl - 1, options.transportProtocol === 'TCP' ? 6 : 17,
    0x00, 0x00,
    192, 168, 1, 10,
    198, 51, 100, 25,
  ];
  const ipChecksumRouterHex = '0x' + toHex16(calculateInternetChecksum(dummyIpHeaderRouter));

  // Frame 1 FCS (Host A to Router R1)
  const frame1Bytes = [
    ...stringToBytes('AABBCC112233'),
    ...stringToBytes(options.sourceMac.replace(/:/g, '')),
    0x08, 0x00,
    ...dummyIpHeader,
    ...payloadBytes,
  ];
  const fcs1Int = calculateCrc32Bytes(frame1Bytes);
  const fcs1Hex = toHex32(fcs1Int);

  // Frame 2 FCS (Router R1 to Server B with new MACs and TTL-1)
  const frame2Bytes = [
    ...stringToBytes('EEFF00112233'), // Server MAC
    ...stringToBytes('AABBCC445566'), // Router R1 eth1 MAC
    0x08, 0x00,
    ...dummyIpHeaderRouter,
    ...payloadBytes,
  ];
  const fcs2Int = calculateCrc32Bytes(frame2Bytes);
  const fcs2Hex = toHex32(fcs2Int);

  const totalWireBytes1 = 8 + 14 + 20 + (options.transportProtocol === 'TCP' ? 20 : 8) + payloadLen + 4 + 12;

  // Base Trame Slices builder
  const makePreambleSlice = (isAdded = false): WireTrameSlice => ({
    id: 'preamble',
    name: 'Préambule + SFD',
    byteSize: 8,
    byteRange: 'Octets 0-7',
    hexSample: '55 55 55 55 55 55 55 D5',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    layerLevel: 'L1',
    description: 'Synchronisation d’horloge (7x 0x55) et Start Frame Delimiter (0xD5)',
    isAddedAtThisStep: isAdded,
  });

  const makeMacSlice = (src: string, dst: string, isAdded = false, isModified = false): WireTrameSlice => ({
    id: 'mac-header',
    name: 'En-tête Ethernet MAC',
    byteSize: 14,
    byteRange: 'Octets 8-21',
    hexSample: `${dst.slice(0, 8)}... ${src.slice(0, 8)}... 08 00`,
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    layerLevel: 'L2',
    description: `MAC Dest: ${dst} | MAC Src: ${src} | EtherType: 0x0800 (IPv4)`,
    isAddedAtThisStep: isAdded,
    isModifiedAtThisStep: isModified,
  });

  const makeIpSlice = (ttlVal: number, chk: string, isAdded = false, isModified = false): WireTrameSlice => ({
    id: 'ip-header',
    name: 'En-tête IPv4 (Réseau)',
    byteSize: 20,
    byteRange: 'Octets 22-41',
    hexSample: `45 00 ... TTL=${ttlVal} Chk=${chk}`,
    colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    layerLevel: 'L3',
    description: `IP Src: ${options.sourceIp} &rarr; IP Dest: ${options.destinationIp} | TTL: ${ttlVal} | Checksum: ${chk}`,
    isAddedAtThisStep: isAdded,
    isModifiedAtThisStep: isModified,
  });

  const makeTransportSlice = (isAdded = false): WireTrameSlice => ({
    id: 'transport-header',
    name: `En-tête ${options.transportProtocol} (Transport)`,
    byteSize: options.transportProtocol === 'TCP' ? 20 : 8,
    byteRange: options.transportProtocol === 'TCP' ? 'Octets 42-61' : 'Octets 42-49',
    hexSample: `SrcPort=${options.sourcePort} DstPort=${options.destinationPort}`,
    colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    layerLevel: 'L4',
    description: `Port Source: ${options.sourcePort} (Client Éphémère) &rarr; Port Dest: ${options.destinationPort} (${options.appProtocol})`,
    isAddedAtThisStep: isAdded,
  });

  const makePayloadSlice = (isAdded = false): WireTrameSlice => ({
    id: 'payload-data',
    name: 'Données Applicatives (Payload)',
    byteSize: payloadLen,
    byteRange: `Octets 62-${61 + payloadLen}`,
    hexSample: `${payloadHex}... ("${options.payloadText.slice(0, 16)}")`,
    colorClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    layerLevel: 'L7',
    description: `Charge utile applicative : ${options.payloadText}`,
    isAddedAtThisStep: isAdded,
  });

  const makeFcsSlice = (fcsHex: string, isAdded = false, isModified = false): WireTrameSlice => ({
    id: 'fcs-trailer',
    name: 'Trailer FCS CRC32 (Contrôle)',
    byteSize: 4,
    byteRange: `Octets ${62 + payloadLen}-${65 + payloadLen}`,
    hexSample: fcsHex,
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    layerLevel: 'TRAILER',
    description: `Somme polynomiale CRC32 calculée sur toute la trame : ${fcsHex}`,
    isAddedAtThisStep: isAdded,
    isModifiedAtThisStep: isModified,
  });

  // 10 Progressive steps definition
  return [
    // Step 1: Host A - Layer 7/6/5
    {
      stepNumber: 1,
      phase: 'HOST_A_ENCAPSULATION',
      title: 'Hôte A (Client) : Création du Message Applicatif',
      subtitle: 'Couche 7 (Application) &bull; Processus Navigateur / Client',
      locationBadge: 'Ordinateur A • Couches 7-5',
      activeHostALayer: 7,
      activeHostBLayer: null,
      activeTransitNodeId: 'pc1',
      pduName: 'Message / Donnée Applicative',
      frameSummary: {
        srcMac: '—',
        dstMac: '—',
        srcIp: '—',
        dstIp: '—',
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl,
        fcsCrc32Hex: '—',
        totalBytesOnWire: payloadLen,
        isCrcValid: true,
      },
      keyActions: [
        `L’application cliente génère le message brut : "${options.payloadText}" (${payloadLen} octets).`,
        `La couche Présentation (L6) sérialise les caractères en encodage UTF-8/ASCII binaire.`,
        `La couche Session (L5) initialise le descripteur de socket local pour la communication.`,
      ],
      technicalDeepDive: 'À ce stade, aucune information de transport, d’adresse IP ou d’adresse MAC n’est encore associée au message. La mémoire vive du processus client contient uniquement la charge utile applicative.',
      trameSlices: [makePayloadSlice(true)],
    },

    // Step 2: Host A - Layer 4
    {
      stepNumber: 2,
      phase: 'HOST_A_ENCAPSULATION',
      title: 'Hôte A (Client) : Encapsulation Transport (Segment TCP)',
      subtitle: 'Couche 4 (Transport) &bull; Adressage des Ports & Fiabilité',
      locationBadge: 'Ordinateur A • Couche 4',
      activeHostALayer: 4,
      activeHostBLayer: null,
      activeTransitNodeId: 'pc1',
      pduName: 'Segment TCP',
      frameSummary: {
        srcMac: '—',
        dstMac: '—',
        srcIp: '—',
        dstIp: '—',
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl,
        fcsCrc32Hex: '—',
        totalBytesOnWire: payloadLen + 20,
        isCrcValid: true,
      },
      keyActions: [
        `La pile TCP/IP du noyau système ajoute l’en-tête TCP de 20 octets.`,
        `Attribution du Port Source éphémère (${options.sourcePort}) et du Port Destination standard (${options.destinationPort} pour ${options.appProtocol}).`,
        `Génération du numéro de séquence TCP (SEQ #1001) et initialisation de la fenêtre de réception (Window Size 64 Ko).`,
      ],
      technicalDeepDive: 'L’en-tête de transport garantit que le paquet atteindra le bon processus logiciel sur le serveur distant et permettra le réordonnancement en cas de segmentation.',
      trameSlices: [makeTransportSlice(true), makePayloadSlice(false)],
    },

    // Step 3: Host A - Layer 3
    {
      stepNumber: 3,
      phase: 'HOST_A_ENCAPSULATION',
      title: 'Hôte A (Client) : Encapsulation Réseau (Paquet IPv4)',
      subtitle: 'Couche 3 (Réseau) &bull; Adressage Logique Universel & TTL',
      locationBadge: 'Ordinateur A • Couche 3',
      activeHostALayer: 3,
      activeHostBLayer: null,
      activeTransitNodeId: 'pc1',
      pduName: 'Paquet IPv4',
      frameSummary: {
        srcMac: '—',
        dstMac: '—',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl,
        fcsCrc32Hex: '—',
        totalBytesOnWire: payloadLen + 20 + 20,
        isCrcValid: true,
      },
      keyActions: [
        `Le module IP ajoute l’en-tête IPv4 standard de 20 octets.`,
        `Inclusion de l’IP Source (${options.sourceIp}) et de l’IP Destination finale (${options.destinationIp}).`,
        `Initialisation du champ TTL à ${options.ttl} (Time-To-Live anti-bouclage).`,
        `Calcul de la somme de contrôle IP (Checksum RFC 1071 : ${ipChecksumHex}).`,
      ],
      technicalDeepDive: 'L’Hôte A consulte sa table de routage locale : l’IP destination (198.51.100.25) étant hors du sous-réseau local (192.168.1.0/24), le paquet doit être transmis à la passerelle par défaut (Routeur R1).',
      trameSlices: [makeIpSlice(options.ttl, ipChecksumHex, true), makeTransportSlice(false), makePayloadSlice(false)],
    },

    // Step 4: Host A - Layer 2
    {
      stepNumber: 4,
      phase: 'HOST_A_ENCAPSULATION',
      title: 'Hôte A (Client) : Encapsulation Liaison (Trame Ethernet II)',
      subtitle: 'Couche 2 (Liaison de Données) &bull; Adresses MAC & CRC32 FCS',
      locationBadge: 'Ordinateur A • Couche 2 (NIC)',
      activeHostALayer: 2,
      activeHostBLayer: null,
      activeTransitNodeId: 'pc1',
      pduName: 'Trame Ethernet II (Frame)',
      frameSummary: {
        srcMac: options.sourceMac,
        dstMac: 'AA:BB:CC:11:22:33 (Passerelle R1)',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl,
        fcsCrc32Hex: fcs1Hex,
        totalBytesOnWire: totalWireBytes1,
        isCrcValid: true,
      },
      keyActions: [
        `La carte réseau (NIC) encapsule le paquet IP dans une trame Ethernet II.`,
        `Résolution ARP : MAC Dest = Passerelle locale (AA:BB:CC:11:22:33) | MAC Src = Client A (${options.sourceMac}).`,
        `Champ EtherType fixé à 0x0800 (indique que le contenu est un paquet IPv4).`,
        `Calcul matériel du Frame Check Sequence (FCS) par algorithme polynomial CRC32 : ${fcs1Hex}.`,
      ],
      technicalDeepDive: 'Règle fondamentale : La MAC destination est celle de la PASSERELLE R1, et NON celle du serveur final, car les trames Ethernet ne franchissent jamais un routeur L3 !',
      trameSlices: [
        makeMacSlice(options.sourceMac, 'AA:BB:CC:11:22:33', true),
        makeIpSlice(options.ttl, ipChecksumHex, false),
        makeTransportSlice(false),
        makePayloadSlice(false),
        makeFcsSlice(fcs1Hex, true),
      ],
    },

    // Step 5: Host A - Layer 1
    {
      stepNumber: 5,
      phase: 'HOST_A_ENCAPSULATION',
      title: 'Hôte A (Client) : Sérialisation Physique & Émission sur le Câble',
      subtitle: 'Couche 1 (Physique) &bull; Train de Bits & Signaux Électriques',
      locationBadge: 'Câble LAN 1 • Couche 1',
      activeHostALayer: 1,
      activeHostBLayer: null,
      activeTransitNodeId: 'cable-1',
      pduName: 'Train Binaire (Bits / Impulsions)',
      frameSummary: {
        srcMac: options.sourceMac,
        dstMac: 'AA:BB:CC:11:22:33',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl,
        fcsCrc32Hex: fcs1Hex,
        totalBytesOnWire: totalWireBytes1,
        isCrcValid: true,
      },
      keyActions: [
        `Ajout du Préambule (7 octets 0x55) et du Start Frame Delimiter (1 octet 0xD5) pour synchroniser l’horloge réceptrice.`,
        `Conversion de la trame entière en signaux différentiels (ex: 1000BASE-T modulation PAM-5 sur paires torsadées).`,
        `Respect de l’espace inter-trame obligatoire IFG (Inter-Frame Gap de 12 octets / 96 temps bit).`,
      ],
      technicalDeepDive: 'La trame complète circule sur le support physique à la vitesse de la lumière dans le cuivre (~200 000 km/s).',
      trameSlices: [
        makePreambleSlice(true),
        makeMacSlice(options.sourceMac, 'AA:BB:CC:11:22:33', false),
        makeIpSlice(options.ttl, ipChecksumHex, false),
        makeTransportSlice(false),
        makePayloadSlice(false),
        makeFcsSlice(fcs1Hex, false),
      ],
    },

    // Step 6: Network Transit - Switch SW1
    {
      stepNumber: 6,
      phase: 'NETWORK_TRANSIT',
      title: 'Traversée Réseau : Commutateur L2 LAN 1 (Switch SW1)',
      subtitle: 'Commutation de Trame L2 &bull; Table CAM MAC & Port',
      locationBadge: 'Commutateur SW1 • Niveau 2',
      activeHostALayer: null,
      activeHostBLayer: null,
      activeTransitNodeId: 'sw1',
      pduName: 'Trame Ethernet Commutée',
      frameSummary: {
        srcMac: options.sourceMac,
        dstMac: 'AA:BB:CC:11:22:33',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl,
        fcsCrc32Hex: fcs1Hex,
        totalBytesOnWire: totalWireBytes1,
        isCrcValid: true,
      },
      keyActions: [
        `Le commutateur reçoit les bits sur son port Fa0/1 et inspecte UNIQUEMENT l’en-tête MAC de Couche 2.`,
        `Apprentissage : SW1 enregistre dans sa table CAM que l’adresse ${options.sourceMac} est sur le port Fa0/1.`,
        `Commutation : SW1 consulte sa table CAM pour ${options.destinationMac} &rarr; trouvé sur le port Gi0/1 (vers Routeur R1).`,
        `CONSERVATION ABSOLUE : Ni l’IP, ni le TTL (${options.ttl}), ni le CRC32 ne sont modifiés par le switch L2 !`,
      ],
      technicalDeepDive: 'Un commutateur de niveau 2 est transparent pour la couche réseau IP : il ne lit ni ne modifie aucun champ de niveau 3 ou supérieur.',
      trameSlices: [
        makePreambleSlice(false),
        makeMacSlice(options.sourceMac, 'AA:BB:CC:11:22:33', false),
        makeIpSlice(options.ttl, ipChecksumHex, false),
        makeTransportSlice(false),
        makePayloadSlice(false),
        makeFcsSlice(fcs1Hex, false),
      ],
    },

    // Step 7: Network Transit - Router R1
    {
      stepNumber: 7,
      phase: 'NETWORK_TRANSIT',
      title: 'Traversée Réseau : Routeur Passerelle L3 (Routeur R1)',
      subtitle: 'Routage L3 &bull; Décrémentation TTL, Recalcul Checksum & Réécriture MAC',
      locationBadge: 'Routeur R1 • Niveau 3',
      activeHostALayer: null,
      activeHostBLayer: null,
      activeTransitNodeId: 'r1',
      pduName: 'Paquet IPv4 Routé & Ré-encapsulé',
      frameSummary: {
        srcMac: 'AA:BB:CC:44:55:66 (R1 eth1)',
        dstMac: 'EE:FF:00:11:22:33 (Serveur B)',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl - 1,
        fcsCrc32Hex: fcs2Hex,
        totalBytesOnWire: totalWireBytes1,
        isCrcValid: true,
      },
      keyActions: [
        `Désencapsulation L2 : R1 vérifie le FCS CRC32 (${fcs1Hex}), valide la trame et retire l’en-tête Ethernet.`,
        `Inspection L3 : R1 lit l’IP Destination (${options.destinationIp}) et consulte sa table de routage (FIB).`,
        `Décrémentation du TTL : ${options.ttl} &rarr; ${options.ttl - 1} (si TTL tombait à 0, le paquet serait détruit avec ICMP Time Exceeded).`,
        `Recalcul obligatoire du Checksum IPv4 : ${ipChecksumHex} &rarr; ${ipChecksumRouterHex}.`,
        `Ré-encapsulation L2 : Nouvelle MAC Source (R1 eth1 AA:BB:CC:44:55:66) et Nouvelle MAC Dest (Serveur B EE:FF:00:11:22:33).`,
        `Génération du NOUVEAU CRC32 FCS : ${fcs2Hex}.`,
      ],
      technicalDeepDive: 'C’est la rupture de trame : les adresses IP de bout en bout restent strictement identiques, mais les adresses MAC et le CRC32 sont totalement réécrits pour le prochain saut.',
      trameSlices: [
        makePreambleSlice(false),
        makeMacSlice('AA:BB:CC:44:55:66', 'EE:FF:00:11:22:33', false, true),
        makeIpSlice(options.ttl - 1, ipChecksumRouterHex, false, true),
        makeTransportSlice(false),
        makePayloadSlice(false),
        makeFcsSlice(fcs2Hex, false, true),
      ],
    },

    // Step 8: Network Transit - Switch SW2 to Host B
    {
      stepNumber: 8,
      phase: 'NETWORK_TRANSIT',
      title: 'Traversée Réseau : Commutateur L2 LAN 2 (SW2) & Arrivée Serveur B',
      subtitle: 'Commutation LAN 2 &bull; Livraison sur le Port Physique du Serveur',
      locationBadge: 'Commutateur SW2 • Niveau 2',
      activeHostALayer: null,
      activeHostBLayer: null,
      activeTransitNodeId: 'sw2',
      pduName: 'Trame Ethernet Réception',
      frameSummary: {
        srcMac: 'AA:BB:CC:44:55:66',
        dstMac: 'EE:FF:00:11:22:33',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl - 1,
        fcsCrc32Hex: fcs2Hex,
        totalBytesOnWire: totalWireBytes1,
        isCrcValid: true,
      },
      keyActions: [
        `Le commutateur SW2 reçoit la nouvelle trame sur son interface d’interconnexion.`,
        `SW2 lit la MAC Destination (EE:FF:00:11:22:33) et commute la trame directement vers le port Fa0/24 du Serveur HTTP.`,
        `La trame arrive intacte sur la carte d’interface réseau (NIC) de l’Ordinateur B.`,
      ],
      technicalDeepDive: 'La trame est acheminée jusqu’au contrôleur matériel (PHY/MAC) du destinataire.',
      trameSlices: [
        makePreambleSlice(false),
        makeMacSlice('AA:BB:CC:44:55:66', 'EE:FF:00:11:22:33', false),
        makeIpSlice(options.ttl - 1, ipChecksumRouterHex, false),
        makeTransportSlice(false),
        makePayloadSlice(false),
        makeFcsSlice(fcs2Hex, false),
      ],
    },

    // Step 9: Host B - Layer 1 -> Layer 2 -> Layer 3 Decapsulation
    {
      stepNumber: 9,
      phase: 'HOST_B_DECAPSULATION',
      title: 'Hôte B (Serveur) : Désencapsulation Matérielle & Validation IP',
      subtitle: 'Couches 1, 2 & 3 &bull; Validation CRC32, Retrait MAC & Vérification IP',
      locationBadge: 'Ordinateur B • Couches 1-3',
      activeHostALayer: null,
      activeHostBLayer: 3,
      activeTransitNodeId: 'server1',
      pduName: 'Paquet IPv4 Validé',
      frameSummary: {
        srcMac: 'AA:BB:CC:44:55:66',
        dstMac: 'EE:FF:00:11:22:33',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl - 1,
        fcsCrc32Hex: fcs2Hex,
        totalBytesOnWire: payloadLen + 20 + 20,
        isCrcValid: true,
      },
      keyActions: [
        `Couche 1 : La NIC du Serveur B échantillonne les signaux physiques et reconstitue la suite d’octets.`,
        `Couche 2 : Calcul matériel du CRC32 et comparaison avec le FCS (${fcs2Hex}). Intégrité validée à 100% !`,
        `Couche 2 : La NIC confirme que la MAC Dest (EE:FF:00:11:22:33) correspond à son adresse, retire l’en-tête Ethernet et remonte le paquet au noyau.`,
        `Couche 3 : La pile IP vérifie que l’IP Dest (${options.destinationIp}) est bien locale et valide la somme de contrôle IP (${ipChecksumRouterHex}).`,
        `Couche 3 : Le champ Protocole (valeur 6 = TCP) indique à qui transmettre la charge utile. L’en-tête IP est retiré.`,
      ],
      technicalDeepDive: 'Si le CRC32 avait été altéré par du bruit sur le câble, la carte réseau aurait jeté la trame immédiatement (Drop silencieux), sans consommer aucun cycle CPU.',
      trameSlices: [
        makeIpSlice(options.ttl - 1, ipChecksumRouterHex, false),
        makeTransportSlice(false),
        makePayloadSlice(false),
      ],
    },

    // Step 10: Host B - Layer 4 -> Layer 7 Delivery
    {
      stepNumber: 10,
      phase: 'HOST_B_DECAPSULATION',
      title: 'Hôte B (Serveur) : Désencapsulation Transport & Livraison Applicative',
      subtitle: 'Couches 4 & 7 &bull; Port 80, Réassemblage TCP & Traitement Web Server',
      locationBadge: 'Ordinateur B • Couches 4-7',
      activeHostALayer: null,
      activeHostBLayer: 7,
      activeTransitNodeId: 'server1',
      pduName: 'Donnée Applicative Finale',
      frameSummary: {
        srcMac: '—',
        dstMac: '—',
        srcIp: options.sourceIp,
        dstIp: options.destinationIp,
        srcPort: options.sourcePort,
        dstPort: options.destinationPort,
        ttl: options.ttl - 1,
        fcsCrc32Hex: '—',
        totalBytesOnWire: payloadLen,
        isCrcValid: true,
      },
      keyActions: [
        `Couche 4 : Le module TCP valide le Checksum de segment et vérifie le numéro de séquence attendu.`,
        `Couche 4 : Le Port Destination ${options.destinationPort} oriente le flux vers le socket du serveur Web (ex: Nginx / Node.js / Apache).`,
        `Couche 4 : Envoi automatique d’un accusé de réception TCP ACK vers l’Hôte A. L’en-tête TCP est retiré.`,
        `Couche 7 : L’application Web reçoit le message intact : "${options.payloadText}".`,
      ],
      technicalDeepDive: 'Parcours complet achevé ! Le message applicatif initial a traversé 2 piles TCP/IP complètes, 2 commutateurs L2 et 1 routeur L3 avec une intégrité parfaite.',
      trameSlices: [makePayloadSlice(false)],
    },
  ];
};
