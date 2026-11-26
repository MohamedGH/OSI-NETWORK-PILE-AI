/**
 * Main Application Entry Component
 * Composes ErrorBoundary, ErrorManagerProvider, RouteManagerProvider, and NetworkStoreProvider.
 */

import React from 'react';
import { ErrorBoundary, ErrorManagerProvider } from './errors/errorManager';
import { RouteManagerProvider, useRouteManager } from './router/routeManager';
import { NetworkStoreProvider } from './store/stateManager';
import { HeaderNav } from './components/HeaderNav';
import { TcpCongestionView } from './components/TcpCongestionView';
import { ErrorDetectionSandboxView } from './components/ErrorDetectionSandboxView';
import { TownTransitView } from './components/TownTransitView';
import { IpFragmentationView } from './components/IpFragmentationView';
import { OsiVisualizerView } from './components/OsiVisualizerView';
import { TestSuiteView } from './components/TestSuiteView';

const ActiveRouteStage: React.FC = () => {
  const { currentRoute } = useRouteManager();

  switch (currentRoute) {
    case 'tcp-engine':
      return <TcpCongestionView />;
    case 'errors':
      return <ErrorDetectionSandboxView />;
    case 'town-transit':
      return <TownTransitView />;
    case 'fragmentation':
      return <IpFragmentationView />;
    case 'osi':
      return <OsiVisualizerView />;
    case 'tests':
      return <TestSuiteView />;
    default:
      return <TcpCongestionView />;
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorManagerProvider>
        <RouteManagerProvider>
          <NetworkStoreProvider>
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
              <HeaderNav />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <ActiveRouteStage />
              </main>
              <footer className="border-t border-slate-900 py-5 px-4 text-center text-xs text-slate-500">
                Simulateur Pile Réseau & Modèle OSI · TCP CUBIC / Reno / Tahoe / BBR · CRC32 IEEE 802.3 · Fragmentation RFC 791 · Transit Ville & Inter-Ville DWDM
              </footer>
            </div>
          </NetworkStoreProvider>
        </RouteManagerProvider>
      </ErrorManagerProvider>
    </ErrorBoundary>
  );
}
