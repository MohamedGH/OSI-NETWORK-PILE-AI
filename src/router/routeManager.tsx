/**
 * Route Manager:
 * Handles route synchronization, active view state, tab switching, and navigation history.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRoute } from '../types/network';

export interface RouteItem {
  readonly id: AppRoute;
  readonly label: string;
  readonly shortLabel: string;
  readonly iconName: string;
  readonly description: string;
  readonly badge?: string;
}

export const APP_ROUTES: RouteItem[] = [
  {
    id: 'stack-journey',
    label: 'Voyage Pile à Pile TCP/IP (Trame en Vol)',
    shortLabel: 'Pile à Pile (Trame)',
    iconName: 'Workflow',
    description: 'Visualisation complète : Hôte A (L7&rarr;L1) &rarr; Câbles & Commutateurs & Routeurs &rarr; Hôte B (L1&rarr;L7).',
    badge: 'Nouveau',
  },
  {
    id: 'tcp-engine',
    label: 'Moteur TCP : Congestion, Flux & Fiabilité',
    shortLabel: 'Contrôle TCP & Congestion',
    iconName: 'Zap',
    description: 'Slow Start, Évitement (AIMD), Fast Retransmit (3 Dup-ACK), SACK, Fenêtre Glissante et Flow Control.',
    badge: 'Interactif',
  },
  {
    id: 'fragmentation',
    label: 'Fragmentation & Réassemblage IP (MTU)',
    shortLabel: 'Fragmentation IP (MTU)',
    iconName: 'Scissors',
    description: 'Découpe des paquets IP par goulet MTU, drapeaux DF/MF, calcul d’offsets sur 8 octets, PMTUD et réassemblage hôte.',
    badge: 'RFC 791',
  },
  {
    id: 'osi',
    label: 'Modèle OSI & Encapsulation',
    shortLabel: 'OSI & PDU',
    iconName: 'Layers',
    description: 'Visualisation de l’encapsulation L7 à L1, en-têtes et analyse bit-à-bit.',
  },
  {
    id: 'journey',
    label: 'Traversée Réseau (Switchs & Routeurs)',
    shortLabel: 'Équipements L2/L3',
    iconName: 'Network',
    description: 'Parcours d’un paquet à travers commutateurs L2 et routeurs L3 avec réécriture MAC.',
  },
  {
    id: 'bandwidth',
    label: 'Calculateur Débit, Réel & Goodput',
    shortLabel: 'Débits & Unités',
    iconName: 'Gauge',
    description: 'Débit nominal vs réel vs utile (Goodput), overheads et conversions d’unités.',
  },
  {
    id: 'errors',
    label: 'Détection d’Erreurs (CRC32 & Parité)',
    shortLabel: 'CRC32 & Parité',
    iconName: 'ShieldAlert',
    description: 'Calcul polynomial CRC32, bit de parité paire/impaire et injection d’erreurs.',
  },
  {
    id: 'tests',
    label: 'Suite de Tests & Validation',
    shortLabel: 'Tests Unitaires',
    iconName: 'CheckCircle2',
    description: 'Vérification automatisée de toutes les formules, protocoles et comportements.',
    badge: 'Auto-test',
  },
  {
    id: 'glossary',
    label: 'Glossaire & Concepts Clés',
    shortLabel: 'Glossaire',
    iconName: 'BookOpen',
    description: 'Fiches de révision : PDU, Trame, Paquet, Datagramme, MTU, MSS, IFG, FCS.',
  },
];

interface RouteManagerContextValue {
  readonly currentRoute: AppRoute;
  readonly navigateTo: (route: AppRoute) => void;
  readonly routes: RouteItem[];
}

const RouteManagerContext = createContext<RouteManagerContextValue | null>(null);

export const RouteManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const hash = window.location.hash.replace('#', '') as AppRoute;
    const isValid = APP_ROUTES.some(r => r.id === hash);
    return isValid ? hash : 'osi';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AppRoute;
      if (APP_ROUTES.some(r => r.id === hash)) {
        setCurrentRoute(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouteManagerContext.Provider value={{ currentRoute, navigateTo, routes: APP_ROUTES }}>
      {children}
    </RouteManagerContext.Provider>
  );
};

export const useRouteManager = (): RouteManagerContextValue => {
  const context = useContext(RouteManagerContext);
  if (!context) {
    throw new Error('useRouteManager must be used within a RouteManagerProvider');
  }
  return context;
};
