/**
 * Main Application Component (Pure Functional Composition, State, Route & Error Providers)
 */

import React from 'react';
import { ErrorBoundary, ErrorManagerProvider } from './errors/errorManager';
import { RouteManagerProvider, useRouteManager } from './router/routeManager';
import { NetworkStoreProvider } from './store/stateManager';
import { HeaderNav } from './components/HeaderNav';
import { StackToStackJourneyView } from './components/StackToStackJourneyView';
import { TcpCongestionView } from './components/TcpCongestionView';
import { IpFragmentationView } from './components/IpFragmentationView';
import { OsiVisualizerView } from './components/OsiVisualizerView';
import { NetworkJourneyView } from './components/NetworkJourneyView';
import { BandwidthCalculatorView } from './components/BandwidthCalculatorView';
import { ErrorDetectionSandboxView } from './components/ErrorDetectionSandboxView';
import { TestSuiteView } from './components/TestSuiteView';
import { GlossaryView } from './components/GlossaryView';
import { Layers, Network, Gauge, ShieldAlert, CheckCircle2, BookOpen, Workflow, Zap, Scissors } from 'lucide-react';

const MainViewContent: React.FC = () => {
  const { currentRoute } = useRouteManager();

  switch (currentRoute) {
    case 'stack-journey':
      return <StackToStackJourneyView />;
    case 'tcp-engine':
      return <TcpCongestionView />;
    case 'fragmentation':
      return <IpFragmentationView />;
    case 'osi':
      return <OsiVisualizerView />;
    case 'journey':
      return <NetworkJourneyView />;
    case 'bandwidth':
      return <BandwidthCalculatorView />;
    case 'errors':
      return <ErrorDetectionSandboxView />;
    case 'tests':
      return <TestSuiteView />;
    case 'glossary':
      return <GlossaryView />;
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
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
              {/* Header Navigation Bar */}
              <HeaderNav />

              {/* Main App Container */}
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <MainViewContent />
              </main>

              {/* Bottom Footer */}
              <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Simulateur Réseau & Modèle OSI (Couches 1 à 7)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Encapsulation • Commutation L2 • Routage L3 • CRC32 IEEE 802.3 • Débits (Nominal, Réel & Goodput)
                  </p>
                </div>
              </footer>
            </div>
          </NetworkStoreProvider>
        </RouteManagerProvider>
      </ErrorManagerProvider>
    </ErrorBoundary>
  );
}
