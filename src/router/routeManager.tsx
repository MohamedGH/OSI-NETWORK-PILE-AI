/**
 * Route Manager
 * Synchronizes URL hash navigation and active simulation modules.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRoute } from '../types/network';

export interface RouteItem {
  readonly id: AppRoute;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}

export const APP_ROUTES: RouteItem[] = [
  {
    id: 'tcp-engine',
    label: 'Contrôle TCP : CUBIC, Reno, Tahoe, BBR & Fenêtre Glissante',
    shortLabel: 'TCP CUBIC & Fenêtre',
    description: 'Courbes de congestion W(t), comparateur multi-protocoles, fenêtre glissante et SACK.',
  },
  {
    id: 'errors',
    label: 'Détection d’Erreurs : CRC32 IEEE 802.3, Parité & Checksum',
    shortLabel: 'CRC32 & Parité',
    description: 'Division polynomiale CRC32 étape par étape, injection d’erreurs bit-à-bit et bits de parité.',
  },
  {
    id: 'town-transit',
    label: 'Paquet en Ville & Dorsale Inter-Ville DWDM',
    shortLabel: 'Ville & Inter-Ville',
    description: 'Traversée urbaine FTTH/5G et backbone national DWDM (Paris–Lyon–Marseille, EDFA, ROADM).',
  },
  {
    id: 'fragmentation',
    label: 'Fragmentation & Réassemblage IPv4 (MTU / PMTUD)',
    shortLabel: 'Fragmentation MTU',
    description: 'Découpe par goulet MTU, alignement sur 8 octets, drapeaux DF/MF et réassemblage hôte.',
  },
  {
    id: 'osi',
    label: 'Encapsulation OSI (L7–L1) & Calculateur Goodput',
    shortLabel: 'OSI & Débits',
    description: 'En-têtes L7 à L1, efficacité protocole et produit délai-bande passante (BDP).',
  },
  {
    id: 'tests',
    label: 'Validation & Tests Unitaires Automatisés',
    shortLabel: 'Tests Unitaires',
    description: 'Vérification mathématique de tous les moteurs (CUBIC, CRC32, MTU, Optique).',
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
    return isValid ? hash : 'tcp-engine';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AppRoute;
      if (APP_ROUTES.some(r => r.id === hash)) {
        setCurrentRoute(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
  const ctx = useContext(RouteManagerContext);
  if (!ctx) {
    throw new Error('useRouteManager must be used within a RouteManagerProvider');
  }
  return ctx;
};
