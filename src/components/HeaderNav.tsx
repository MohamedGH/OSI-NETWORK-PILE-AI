/**
 * Header Navigation Bar (Responsive & Mobile First)
 */

import React, { useState } from 'react';
import {
  Workflow,
  Layers,
  Network,
  Gauge,
  ShieldAlert,
  CheckCircle2,
  BookOpen,
  Zap,
  Scissors,
  Menu,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useRouteManager } from '../router/routeManager';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { AppRoute } from '../types/network';

export const HeaderNav: React.FC = () => {
  const { currentRoute, navigateTo, routes } = useRouteManager();
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleReset = () => {
    dispatch({ type: 'RESET_PACKET' });
    dispatch({ type: 'RESET_JOURNEY' });
    dispatch({ type: 'RESET_STACK_JOURNEY' });
    dispatch({ type: 'RESET_TCP_ENGINE' });
    dispatch({ type: 'RESET_FRAG_ALL' });
    notify('Simulateur réinitialisé aux paramètres par défaut', 'info');
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Workflow':
        return <Workflow className="w-4 h-4 text-cyan-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Scissors':
        return <Scissors className="w-4 h-4 text-pink-400" />;
      case 'Layers':
        return <Layers className="w-4 h-4" />;
      case 'Network':
        return <Network className="w-4 h-4" />;
      case 'Gauge':
        return <Gauge className="w-4 h-4" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div
            id="brand-logo"
            onClick={() => navigateTo('osi')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center group-hover:bg-slate-900 transition">
                <Network className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  SimuRéseau OSI
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded">
                  L1–L7
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Encapsulation • Routeurs & Switchs • Débits & CRC32
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
            {routes.map(r => {
              const isActive = currentRoute === r.id;
              return (
                <button
                  key={r.id}
                  id={`nav-btn-${r.id}`}
                  onClick={() => navigateTo(r.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  {getIcon(r.iconName)}
                  <span>{r.shortLabel}</span>
                  {r.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                      {state.testReport.passedTests}/{state.testReport.totalTests}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & Mobile Toggle */}
          <div className="flex items-center gap-2">
            <button
              id="quick-reset-btn"
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg border border-slate-800 transition"
              title="Réinitialiser l'état"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Mobile Menu Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg border border-slate-800 transition"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-2 pb-6 space-y-1.5 backdrop-blur-xl animate-in slide-in-from-top-4"
        >
          {routes.map(r => {
            const isActive = currentRoute === r.id;
            return (
              <button
                key={r.id}
                id={`mobile-nav-btn-${r.id}`}
                onClick={() => {
                  navigateTo(r.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getIcon(r.iconName)}
                  <div className="text-left">
                    <p className="font-semibold">{r.label}</p>
                    <p className="text-[11px] text-slate-400 font-normal">{r.description}</p>
                  </div>
                </div>
                {r.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    {state.testReport.passedTests}/{state.testReport.totalTests} OK
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
