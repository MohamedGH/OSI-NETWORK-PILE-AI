/**
 * Top Navigation Bar following the strict 3-Zone Top Bar Contract
 * Zone 1: Single text wordmark
 * Zone 2: Clean text navigation links with active underline indicator
 * Zone 3: Primary reset action + mobile menu toggle
 */

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useRouteManager } from '../router/routeManager';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';

export const HeaderNav: React.FC = () => {
  const { currentRoute, navigateTo, routes } = useRouteManager();
  const { dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleResetAll = () => {
    dispatch({ type: 'RESET_ALL' });
    notify('Paramètres de simulation réinitialisés', 'info');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => navigateTo('tcp-engine')}
          className="text-base sm:text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          SimuRéseau OSI
        </button>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400" aria-label="Navigation principale">
          {routes.map(r => {
            const isActive = currentRoute === r.id;
            return (
              <button
                key={r.id}
                onClick={() => navigateTo(r.id)}
                className={`py-4 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  isActive
                    ? 'border-sky-400 text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.shortLabel}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetAll}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Réinitialiser
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg border border-slate-800"
            aria-label="Menu de navigation"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 space-y-1">
          {routes.map(r => {
            const isActive = currentRoute === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  navigateTo(r.id);
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors block ${
                  isActive ? 'bg-slate-900 text-sky-400 font-semibold' : 'text-slate-300 hover:bg-slate-900/60'
                }`}
              >
                <div>{r.shortLabel}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{r.description}</div>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
