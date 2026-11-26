/**
 * Intra-Town & Inter-City (Inter-Ville) Network Transit Engine
 * Pure functional physics, silica fiber refractive index propagation, ITU-R P.838 rain fading,
 * DWDM C-Band amplification (EDFA), and dynamic OSPF / BGP protection switching.
 */

import {
  TownNode,
  TownLink,
  InterCityNode,
  InterCityLink,
  TownFlightPacket,
  TownIncidentType,
  TownPacketType,
  TownSimulationScope,
} from '../types/network';
import { roundTo } from './functional';

export const SPEED_OF_LIGHT_VACUUM_KM_S = 299792.458;
export const FIBER_REFRACTIVE_INDEX = 1.4682; // Standard ITU-T G.652D silica core
export const SPEED_OF_LIGHT_FIBER_KM_S = SPEED_OF_LIGHT_VACUUM_KM_S / FIBER_REFRACTIVE_INDEX; // ~204,190.48 km/s

/**
 * Calculates propagation delay in microseconds (µs)
 */
export const calculatePropagationDelayUs = (distanceMeters: number, speedKmS: number): number => {
  if (distanceMeters <= 0 || speedKmS <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return roundTo((distanceKm / speedKmS) * 1_000_000, 3);
};

/**
 * Calculates optical fiber attenuation in dB (0.35 dB/km @ 1310nm, 0.20 dB/km @ 1550nm DWDM C-Band)
 */
export const calculateOpticalAttenuationDb = (distanceMeters: number, wavelengthNm: 1310 | 1550 = 1310): number => {
  const distanceKm = distanceMeters / 1000;
  const lossPerKm = wavelengthNm === 1310 ? 0.35 : 0.20;
  return roundTo(distanceKm * lossPerKm, 3);
};

/**
 * Calculates ITU-R P.838 Rain Fading attenuation on 28 GHz mmWave link
 */
export const calculateRainAttenuationDb = (
  rainRateMmPerHour: number,
  distanceMeters = 1800
): number => {
  if (rainRateMmPerHour <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  const k = 0.187;
  const alpha = 1.021;
  return roundTo(k * Math.pow(rainRateMmPerHour, alpha) * distanceKm, 2);
};

export const TOWN_NODES: TownNode[] = [
  {
    id: 'home_laptop',
    label: 'Poste Hôte Client',
    districtName: 'Quartier Résidentiel Les Lilas',
    type: 'SMART_HOME',
    x: 80,
    y: 370,
    osiLayer: 7,
    ipAddress: '192.168.1.100',
    macAddress: 'BC:24:11:99:A1:04',
    status: 'ONLINE',
    equipmentModel: 'Station Client Wi-Fi 6 (802.11ax)',
    queueLoadPercent: 6,
    opticalPowerDbm: 0,
    temperatureC: 37,
    descriptionFr: 'Émet la requête applicative (HTTP, flux vidéo 4K, ICMP) et encapsule de L7 vers L1.',
  },
  {
    id: 'home_onu_box',
    label: 'Terminal Optique ONT',
    districtName: 'Entrée Immeuble',
    type: 'SMART_HOME',
    x: 195,
    y: 370,
    osiLayer: 2,
    ipAddress: '192.168.1.1',
    macAddress: 'E4:8D:8C:11:22:33',
    status: 'ONLINE',
    equipmentModel: 'ONT 10G-EPON Laser DFB 1310nm',
    queueLoadPercent: 14,
    opticalPowerDbm: -18.2,
    temperatureC: 42,
    descriptionFr: 'Convertit les trames électriques en impulsions laser infrarouges dans la fibre monomode.',
  },
  {
    id: 'manhole_rue_de_paris',
    label: 'Chambre Télécom L1T',
    districtName: 'Sous-Chaussée Rue de Paris',
    type: 'MANHOLE_TELECOM',
    x: 325,
    y: 435,
    osiLayer: 1,
    status: 'ONLINE',
    equipmentModel: 'Boîtier d’Épissure Étanche PBO',
    queueLoadPercent: 0,
    opticalPowerDbm: -18.5,
    temperatureC: 16,
    descriptionFr: 'Regard souterrain abritant les soudures optiques par fusion thermique.',
  },
  {
    id: 'pm_cabinet',
    label: 'Armoire de Rue PM48',
    districtName: 'Carrefour des Arts',
    type: 'STREET_CABINET',
    x: 455,
    y: 320,
    osiLayer: 1,
    status: 'ONLINE',
    equipmentModel: 'Point de Mutualisation Optique 1:64',
    queueLoadPercent: 24,
    opticalPowerDbm: -19.6,
    temperatureC: 25,
    descriptionFr: 'Concentrateur passif mutualisant les fibres d’abonnés vers le réseau de transport.',
  },
  {
    id: 'cell_tower_5g',
    label: 'Pylône 5G mmWave',
    districtName: 'Toiture Tour Panorama',
    type: 'CELL_TOWER_5G',
    x: 490,
    y: 130,
    osiLayer: 2,
    ipAddress: '10.50.12.1',
    status: 'ONLINE',
    equipmentModel: 'Antenne Massive-MIMO 28 GHz',
    queueLoadPercent: 32,
    opticalPowerDbm: 0,
    temperatureC: 48,
    descriptionFr: 'Faisceau hertzien de secours activé automatiquement par OSPF lors d’une coupure fibre.',
  },
  {
    id: 'river_siphon',
    label: 'Siphon Sous-Fluvial',
    districtName: 'Traversée de la Seine',
    type: 'RIVER_SIPHON',
    x: 685,
    y: 390,
    osiLayer: 1,
    status: 'ONLINE',
    equipmentModel: 'Câble Armé Acier G.654E Immergé',
    queueLoadPercent: 0,
    opticalPowerDbm: -20.4,
    temperatureC: 11,
    descriptionFr: 'Fourreau haute résistance passant sous le lit du fleuve.',
  },
  {
    id: 'isp_metro_noc',
    label: 'Cœur Métropolitain POP',
    districtName: 'Cité Numérique',
    type: 'METRO_POP',
    x: 815,
    y: 230,
    osiLayer: 3,
    ipAddress: '198.51.100.1',
    macAddress: '00:1C:73:FA:90:01',
    status: 'ONLINE',
    equipmentModel: 'Routeur Bordure BGP / MPLS 400G',
    queueLoadPercent: 31,
    opticalPowerDbm: -15.1,
    temperatureC: 22,
    descriptionFr: 'Décrémente le TTL IPv4, recalcule le Checksum L3 et commute vers le Datacenter ou l’Inter-Ville.',
  },
  {
    id: 'municipal_datacenter',
    label: 'Datacenter Métropole',
    districtName: 'Parc Haute Disponibilité',
    type: 'MUNICIPAL_DATACENTER',
    x: 930,
    y: 230,
    osiLayer: 7,
    ipAddress: '198.51.100.25',
    macAddress: '52:54:00:8F:77:33',
    status: 'ONLINE',
    equipmentModel: 'Baie Serveurs Cloud & Stockage NVMe',
    queueLoadPercent: 18,
    opticalPowerDbm: -14.8,
    temperatureC: 19,
    descriptionFr: 'Réception finale : vérification CRC32, réassemblage IP, acquittement TCP et traitement L7.',
  },
];

export const TOWN_LINKS: TownLink[] = [
  {
    id: 'link_home_wifi',
    fromNodeId: 'home_laptop',
    toNodeId: 'home_onu_box',
    mediumType: 'WIFI_6_RADIO',
    mediumNameFr: 'Wi-Fi 6 (5 GHz OFDMA)',
    distanceMeters: 15,
    propagationSpeedKmS: SPEED_OF_LIGHT_VACUUM_KM_S,
    nominalBitrateGbps: 1.2,
    attenuationDbPerKm: 0,
    isBackupRoute: false,
    isSubterranean: false,
    isWireless: true,
    waypoints: [{ x: 80, y: 370 }, { x: 195, y: 370 }],
    descriptionFr: 'Liaison radio locale entre le poste client et la passerelle résidentielle.',
  },
  {
    id: 'link_drop_fiber',
    fromNodeId: 'home_onu_box',
    toNodeId: 'manhole_rue_de_paris',
    mediumType: 'G652_SINGLEMODE_FIBER',
    mediumNameFr: 'Fibre Abonné FTTH (G.657A2)',
    distanceMeters: 350,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    nominalBitrateGbps: 10,
    attenuationDbPerKm: 0.35,
    isBackupRoute: false,
    isSubterranean: true,
    isWireless: false,
    waypoints: [{ x: 195, y: 370 }, { x: 250, y: 435 }, { x: 325, y: 435 }],
    descriptionFr: 'Micro-gaine souterraine reliant l’immeuble à la chambre sous trottoir.',
  },
  {
    id: 'link_feeder_street',
    fromNodeId: 'manhole_rue_de_paris',
    toNodeId: 'pm_cabinet',
    mediumType: 'G652_SINGLEMODE_FIBER',
    mediumNameFr: 'Fibre Distribution (G.652D)',
    distanceMeters: 550,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    nominalBitrateGbps: 100,
    attenuationDbPerKm: 0.35,
    isBackupRoute: false,
    isSubterranean: true,
    isWireless: false,
    waypoints: [{ x: 325, y: 435 }, { x: 390, y: 435 }, { x: 455, y: 320 }],
    descriptionFr: 'Conduit municipal vers l’armoire de mutualisation du quartier.',
  },
  {
    id: 'link_pm_to_siphon',
    fromNodeId: 'pm_cabinet',
    toNodeId: 'river_siphon',
    mediumType: 'G652_SINGLEMODE_FIBER',
    mediumNameFr: 'Artère Transport Boulevard (G.652D)',
    distanceMeters: 1650,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    nominalBitrateGbps: 100,
    attenuationDbPerKm: 0.35,
    isBackupRoute: false,
    isSubterranean: true,
    isWireless: false,
    waypoints: [{ x: 455, y: 320 }, { x: 560, y: 435 }, { x: 685, y: 390 }],
    descriptionFr: 'Artère optique principale sous le boulevard (exposée aux travaux de voirie).',
  },
  {
    id: 'link_pm_to_5g',
    fromNodeId: 'pm_cabinet',
    toNodeId: 'cell_tower_5g',
    mediumType: 'G652_SINGLEMODE_FIBER',
    mediumNameFr: 'Colonne Montante Pylône 5G',
    distanceMeters: 120,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    nominalBitrateGbps: 25,
    attenuationDbPerKm: 0.35,
    isBackupRoute: true,
    isSubterranean: false,
    isWireless: false,
    waypoints: [{ x: 455, y: 320 }, { x: 490, y: 130 }],
    descriptionFr: 'Alimentation optique verticale vers le toit de la tour.',
  },
  {
    id: 'link_5g_to_noc',
    fromNodeId: 'cell_tower_5g',
    toNodeId: 'isp_metro_noc',
    mediumType: 'MICROWAVE_5G',
    mediumNameFr: 'Faisceau Hertzien 5G 28 GHz',
    distanceMeters: 1900,
    propagationSpeedKmS: SPEED_OF_LIGHT_VACUUM_KM_S,
    nominalBitrateGbps: 10,
    attenuationDbPerKm: 0.15,
    isBackupRoute: true,
    isSubterranean: false,
    isWireless: true,
    waypoints: [{ x: 490, y: 130 }, { x: 660, y: 150 }, { x: 815, y: 230 }],
    descriptionFr: 'Pont radioélectrique en visibilité directe franchissant le fleuve par les airs.',
  },
  {
    id: 'link_siphon_to_noc',
    fromNodeId: 'river_siphon',
    toNodeId: 'isp_metro_noc',
    mediumType: 'SUBMARINE_RIVER_FIBER',
    mediumNameFr: 'Câble Sous-Fluvial Armé (G.654E)',
    distanceMeters: 850,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    nominalBitrateGbps: 200,
    attenuationDbPerKm: 0.18,
    isBackupRoute: false,
    isSubterranean: true,
    isWireless: false,
    waypoints: [{ x: 685, y: 390 }, { x: 755, y: 310 }, { x: 815, y: 230 }],
    descriptionFr: 'Liaison optique immergée remontant vers le cœur de réseau métropolitain.',
  },
  {
    id: 'link_noc_to_dc',
    fromNodeId: 'isp_metro_noc',
    toNodeId: 'municipal_datacenter',
    mediumType: 'G652_SINGLEMODE_FIBER',
    mediumNameFr: 'Interconnexion DWDM 400G',
    distanceMeters: 300,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    nominalBitrateGbps: 400,
    attenuationDbPerKm: 0.20,
    isBackupRoute: false,
    isSubterranean: true,
    isWireless: false,
    waypoints: [{ x: 815, y: 230 }, { x: 930, y: 230 }],
    descriptionFr: 'Bus optique très haute capacité vers les baies serveurs.',
  },
];

// ========================================================
// Inter-City (Inter-Ville) National DWDM Backbone Data
// ========================================================

export const INTERCITY_NODES: InterCityNode[] = [
  {
    id: 'city_paris_ixp',
    name: 'Paris IXP (France-IX / Telehouse)',
    regionName: 'Île-de-France',
    role: 'NATIONAL_IXP',
    x: 140,
    y: 160,
    bgpAsNumber: 8218,
    asName: 'AS8218-NEOTEL-PARIS',
    dwdmCapacityTbps: 38.4,
    activeWavelengths: 96,
    edfaGainDb: 22,
    osnrDb: 31.5,
    descriptionFr: 'Nœud d’échange Internet national : multiplexage DWDM 96 longueurs d’onde bande C (1550 nm).',
  },
  {
    id: 'city_dijon_edfa',
    name: 'Shelter Optique EDFA Bourgogne',
    regionName: 'Bourgogne-Franche-Comté',
    role: 'OPTICAL_AMPLIFIER_SHELTER',
    x: 390,
    y: 255,
    bgpAsNumber: 3215,
    asName: 'AS3215-BACKBONE-OPTICAL',
    dwdmCapacityTbps: 38.4,
    activeWavelengths: 96,
    edfaGainDb: 26.5,
    osnrDb: 28.4,
    descriptionFr: 'Station d’amplification optique dopée à l’Erbium (EDFA) tous les 80 km le long de la LGV Sud-Est.',
  },
  {
    id: 'city_lyon_pop',
    name: 'Lyon POP Régional (LyonIX)',
    regionName: 'Auvergne-Rhône-Alpes',
    role: 'REGIONAL_POP',
    x: 595,
    y: 345,
    bgpAsNumber: 12322,
    asName: 'AS12322-PROXAD-LYON',
    dwdmCapacityTbps: 25.6,
    activeWavelengths: 64,
    edfaGainDb: 21,
    osnrDb: 27.1,
    descriptionFr: 'Point de présence régional équipé de ROADM permettant l’insertion/extraction de lambdas sans conversion O-E-O.',
  },
  {
    id: 'city_alps_opgw',
    name: 'Poste RTE 400 kV Alpes-Isère (OPGW)',
    regionName: 'Sillon Alpin (Secours)',
    role: 'OPTICAL_AMPLIFIER_SHELTER',
    x: 540,
    y: 145,
    bgpAsNumber: 3215,
    asName: 'AS3215-RTE-OPGW',
    dwdmCapacityTbps: 12.8,
    activeWavelengths: 32,
    edfaGainDb: 24,
    osnrDb: 26.2,
    descriptionFr: 'Câble de garde optique OPGW au sommet des pylônes très haute tension 400 kV (protection anneau).',
  },
  {
    id: 'city_marseille_hub',
    name: 'Marseille Subsea Hub (MRS1)',
    regionName: 'Provence-Alpes-Côte d’Azur',
    role: 'SUBMARINE_LANDING',
    x: 880,
    y: 445,
    bgpAsNumber: 13335,
    asName: 'AS13335-CLOUD-MRS',
    dwdmCapacityTbps: 51.2,
    activeWavelengths: 128,
    edfaGainDb: 24,
    osnrDb: 29.8,
    descriptionFr: 'Station d’atterrissement des câbles sous-marins méditerranéens et interconnexion Datacenter.',
  },
];

export const INTERCITY_LINKS: InterCityLink[] = [
  {
    id: 'ic_paris_dijon_tgv',
    fromCityId: 'city_paris_ixp',
    toCityId: 'city_dijon_edfa',
    nameFr: 'Artère Ferroviaire LGV Paris–Bourgogne',
    infraType: 'TGV_RAILWAY_FIBER',
    distanceKm: 310,
    fiberStandard: 'ITU-T G.652D',
    dwdmCapacityTbps: 38.4,
    edfaAmplifiersCount: 4,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    isBackupRing: false,
    waypoints: [{ x: 140, y: 160 }, { x: 270, y: 210 }, { x: 390, y: 255 }],
    descriptionFr: 'Câble optique 144 brins posé en caniveau béton le long de la ligne TGV.',
  },
  {
    id: 'ic_dijon_lyon_tgv',
    fromCityId: 'city_dijon_edfa',
    toCityId: 'city_lyon_pop',
    nameFr: 'Artère Ferroviaire LGV Bourgogne–Lyon',
    infraType: 'TGV_RAILWAY_FIBER',
    distanceKm: 195,
    fiberStandard: 'ITU-T G.652D',
    dwdmCapacityTbps: 38.4,
    edfaAmplifiersCount: 3,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    isBackupRing: false,
    waypoints: [{ x: 390, y: 255 }, { x: 495, y: 300 }, { x: 595, y: 345 }],
    descriptionFr: 'Tronçon optique haute capacité amplifié par pompage laser 980 nm.',
  },
  {
    id: 'ic_paris_alps_opgw',
    fromCityId: 'city_paris_ixp',
    toCityId: 'city_alps_opgw',
    nameFr: 'Liaison Haute Tension RTE 400 kV (OPGW Est)',
    infraType: 'RTE_HIGH_VOLTAGE_OPGW',
    distanceKm: 410,
    fiberStandard: 'ITU-T G.654.E (Ultra Low Loss)',
    dwdmCapacityTbps: 12.8,
    edfaAmplifiersCount: 5,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    isBackupRing: true,
    waypoints: [{ x: 140, y: 160 }, { x: 350, y: 120 }, { x: 540, y: 145 }],
    descriptionFr: 'Route optique aérienne de secours intégrée au câble de garde haute tension.',
  },
  {
    id: 'ic_alps_lyon_opgw',
    fromCityId: 'city_alps_opgw',
    toCityId: 'city_lyon_pop',
    nameFr: 'Bretelle RTE OPGW Alpes–Lyon',
    infraType: 'RTE_HIGH_VOLTAGE_OPGW',
    distanceKm: 140,
    fiberStandard: 'ITU-T G.654.E (Ultra Low Loss)',
    dwdmCapacityTbps: 12.8,
    edfaAmplifiersCount: 2,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    isBackupRing: true,
    waypoints: [{ x: 540, y: 145 }, { x: 595, y: 345 }],
    descriptionFr: 'Secours optique ROADM contournant la coupure ferroviaire en moins de 50 ms.',
  },
  {
    id: 'ic_lyon_marseille_a7',
    fromCityId: 'city_lyon_pop',
    toCityId: 'city_marseille_hub',
    nameFr: 'Dorsale Autoroutière A7 Vallée du Rhône',
    infraType: 'HIGHWAY_CONDUIT',
    distanceKm: 315,
    fiberStandard: 'ITU-T G.654.E (Ultra Low Loss)',
    dwdmCapacityTbps: 51.2,
    edfaAmplifiersCount: 4,
    propagationSpeedKmS: SPEED_OF_LIGHT_FIBER_KM_S,
    isBackupRing: false,
    waypoints: [{ x: 595, y: 345 }, { x: 740, y: 400 }, { x: 880, y: 445 }],
    descriptionFr: 'Artère longue distance DWDM cohérente 400G/800G vers le hub méditerranéen.',
  },
];

/**
 * Converts InterCityLinks to normalized TownLink format so the 60FPS engine can animate any scope seamlessly
 */
export const convertInterCityToTownLinks = (icLinks: InterCityLink[]): TownLink[] =>
  icLinks.map(ic => ({
    id: ic.id,
    fromNodeId: ic.fromCityId,
    toNodeId: ic.toCityId,
    mediumType: 'DWDM_LONG_HAUL',
    mediumNameFr: `${ic.nameFr} (${ic.distanceKm} km)`,
    distanceMeters: ic.distanceKm * 1000,
    propagationSpeedKmS: ic.propagationSpeedKmS,
    nominalBitrateGbps: ic.dwdmCapacityTbps * 1000,
    attenuationDbPerKm: 0.18,
    isBackupRoute: ic.isBackupRing,
    isSubterranean: ic.infraType !== 'RTE_HIGH_VOLTAGE_OPGW',
    isWireless: false,
    waypoints: ic.waypoints,
    descriptionFr: ic.descriptionFr,
  }));

/**
 * Computes active path for Intra-Town, Inter-Cities, or Global Seamless mode
 */
export const computeActiveTownPath = (
  scope: TownSimulationScope,
  incident: TownIncidentType
): {
  readonly pathLinks: TownLink[];
  readonly isRerouted: boolean;
  readonly summaryFr: string;
} => {
  if (scope === 'INTER_CITIES') {
    const allIcAsTown = convertInterCityToTownLinks(INTERCITY_LINKS);
    if (incident === 'TGV_FIBER_CUT') {
      const backupIds = ['ic_paris_alps_opgw', 'ic_alps_lyon_opgw', 'ic_lyon_marseille_a7'];
      return {
        pathLinks: backupIds.map(id => allIcAsTown.find(l => l.id === id)!).filter(Boolean),
        isRerouted: true,
        summaryFr: 'Protection optique ROADM (< 50 ms) : contournement de la LGV coupée via la ligne haute tension RTE 400 kV (OPGW).',
      };
    }
    const nominalIds = ['ic_paris_dijon_tgv', 'ic_dijon_lyon_tgv', 'ic_lyon_marseille_a7'];
    return {
      pathLinks: nominalIds.map(id => allIcAsTown.find(l => l.id === id)!).filter(Boolean),
      isRerouted: false,
      summaryFr: 'Dorsale Nationale DWDM : Paris IXP -> Shelter EDFA Bourgogne -> Lyon POP -> Marseille Hub (820 km).',
    };
  }

  // Intra-Town or Global
  if (incident === 'FIBER_CUT') {
    const backupIds = ['link_home_wifi', 'link_drop_fiber', 'link_feeder_street', 'link_pm_to_5g', 'link_5g_to_noc', 'link_noc_to_dc'];
    return {
      pathLinks: backupIds.map(id => TOWN_LINKS.find(l => l.id === id)!).filter(Boolean),
      isRerouted: true,
      summaryFr: 'Basculement OSPF : contournement de l’artère coupée sous chaussée via le faisceau hertzien 5G 28 GHz.',
    };
  }

  const nominalIds = ['link_home_wifi', 'link_drop_fiber', 'link_feeder_street', 'link_pm_to_siphon', 'link_siphon_to_noc', 'link_noc_to_dc'];
  return {
    pathLinks: nominalIds.map(id => TOWN_LINKS.find(l => l.id === id)!).filter(Boolean),
    isRerouted: false,
    summaryFr: 'Boucle locale & Métropole : Wi-Fi 6 -> ONT FTTH -> PM48 -> Siphon sous-fluvial -> POP -> Datacenter.',
  };
};

export const calculateTownPathMetrics = (
  pathLinks: TownLink[],
  incident: TownIncidentType,
  packetBytes = 1500
): {
  readonly totalDistanceMeters: number;
  readonly totalPropagationDelayUs: number;
  readonly queueDelayUs: number;
  readonly totalLatencyUs: number;
  readonly opticalSnrDb: number;
} => {
  let totalDistanceMeters = 0;
  let totalPropagationDelayUs = 0;

  for (const link of pathLinks) {
    totalDistanceMeters += link.distanceMeters;
    totalPropagationDelayUs += calculatePropagationDelayUs(link.distanceMeters, link.propagationSpeedKmS);
  }

  const minGbps = Math.min(...pathLinks.map(l => l.nominalBitrateGbps));
  const serializationUs = (packetBytes * 8) / (minGbps * 1000);
  const queueDelayUs = incident === 'RUSH_HOUR' ? 840 : 12;
  const opticalSnrDb =
    incident === 'EDFA_PUMP_FAIL' ? 16.4 : incident === 'RAIN_STORM' ? 21.8 : 31.2;

  return {
    totalDistanceMeters,
    totalPropagationDelayUs: roundTo(totalPropagationDelayUs, 2),
    queueDelayUs,
    totalLatencyUs: roundTo(totalPropagationDelayUs + serializationUs + queueDelayUs, 2),
    opticalSnrDb,
  };
};

export const createFlightPacket = (
  type: TownPacketType,
  pathLinks: TownLink[]
): TownFlightPacket => {
  const colors: Record<TownPacketType, string> = {
    HTTP_GET: '#38bdf8',
    STREAM_4K: '#34d399',
    ICMP_PING: '#fbbf24',
    IOT_TELEMETRY: '#c084fc',
    VOIP_CALL: '#f97316',
  };

  const sizes: Record<TownPacketType, number> = {
    HTTP_GET: 540,
    STREAM_4K: 1500,
    ICMP_PING: 64,
    IOT_TELEMETRY: 48,
    VOIP_CALL: 160,
  };

  const firstLink = pathLinks[0];
  return {
    id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    packetType: type,
    color: colors[type],
    progress: 0,
    currentLinkIndex: 0,
    totalLinksInPath: pathLinks.length,
    currentHopNodeId: firstLink?.fromNodeId ?? 'home_laptop',
    currentHopName: firstLink?.mediumNameFr ?? 'Départ',
    currentMedium: firstLink?.mediumNameFr ?? 'Fibre',
    accumulatedLatencyUs: 0,
    payloadBytes: sizes[type],
    ttl: 64,
    status: 'TRAVELLING',
    pathLinkIds: pathLinks.map(l => l.id),
  };
};

export const stepTownPackets = (
  packets: TownFlightPacket[],
  pathLinks: TownLink[],
  incident: TownIncidentType,
  speedMultiplier = 1
): {
  readonly updatedPackets: TownFlightPacket[];
  readonly newlyDelivered: TownFlightPacket[];
  readonly newlyDropped: TownFlightPacket[];
} => {
  const updatedPackets: TownFlightPacket[] = [];
  const newlyDelivered: TownFlightPacket[] = [];
  const newlyDropped: TownFlightPacket[] = [];

  const stepDelta = 0.022 * speedMultiplier;

  for (const pkt of packets) {
    if (pkt.status !== 'TRAVELLING') continue;

    const nextProgress = pkt.progress + stepDelta;
    if (nextProgress >= 1) {
      const nextIdx = pkt.currentLinkIndex + 1;
      if (nextIdx >= pathLinks.length) {
        newlyDelivered.push({
          ...pkt,
          progress: 1,
          currentLinkIndex: pathLinks.length - 1,
          status: 'DELIVERED',
        });
      } else {
        const nextLink = pathLinks[nextIdx];
        const hopDelay = calculatePropagationDelayUs(nextLink.distanceMeters, nextLink.propagationSpeedKmS);
        updatedPackets.push({
          ...pkt,
          progress: 0,
          currentLinkIndex: nextIdx,
          currentHopNodeId: nextLink.fromNodeId,
          currentHopName: nextLink.mediumNameFr,
          currentMedium: nextLink.mediumNameFr,
          accumulatedLatencyUs: roundTo(pkt.accumulatedLatencyUs + hopDelay, 2),
          ttl: Math.max(1, pkt.ttl - 1),
        });
      }
    } else {
      updatedPackets.push({
        ...pkt,
        progress: nextProgress,
      });
    }
  }

  return { updatedPackets, newlyDelivered, newlyDropped };
};
