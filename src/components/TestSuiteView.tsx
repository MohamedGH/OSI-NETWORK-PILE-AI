/**
 * Test Suite & Automated Validation Runner View
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  CheckCheck,
  Cpu,
  Layers,
  Network,
  Gauge,
  ShieldAlert,
  Search,
  Scissors,
} from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';
import { TestCaseResult } from '../types/network';

export const TestSuiteView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const { testReport } = state;

  const handleRunAll = () => {
    dispatch({ type: 'RUN_TEST_SUITE' });
    notify(`Suite de tests exécutée : ${testReport.passedTests}/${testReport.totalTests} tests validés`, 'success');
  };

  const categories = [
    { id: 'ALL', label: 'Tous les tests' },
    { id: 'IP_FRAGMENTATION', label: 'Fragmentation IP (MTU)' },
    { id: 'CRC32_PARITY', label: 'CRC32 & Parité' },
    { id: 'OSI_ENCAPSULATION', label: 'Encapsulation OSI & TCP' },
    { id: 'L2_SWITCH', label: 'Commutateur L2' },
    { id: 'L3_ROUTING', label: 'Routeur L3' },
    { id: 'BANDWIDTH_MATH', label: 'Calcul Débits' },
    { id: 'UNITS_CONVERSION', label: 'Conversions Unités' },
  ];

  const filteredResults = testReport.results.filter(test => {
    const matchesCat = selectedCategory === 'ALL' || test.category === selectedCategory;
    const matchesSearch =
      searchFilter === '' ||
      test.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      test.id.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryIcon = (cat: TestCaseResult['category']) => {
    switch (cat) {
      case 'IP_FRAGMENTATION':
        return <Scissors className="w-3.5 h-3.5 text-pink-400" />;
      case 'CRC32_PARITY':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'OSI_ENCAPSULATION':
        return <Layers className="w-3.5 h-3.5 text-pink-400" />;
      case 'L2_SWITCH':
      case 'L3_ROUTING':
        return <Network className="w-3.5 h-3.5 text-cyan-400" />;
      case 'BANDWIDTH_MATH':
      case 'UNITS_CONVERSION':
        return <Gauge className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div id="test-suite-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Suite de Tests Unitaires & Validation Fonctionnelle
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Vérification automatisée de chaque algorithme : CRC32 IEEE 802.3, bits de parité, en-têtes d'encapsulation, commutateurs L2, routeurs L3, formules de débit et conversions.
            </p>
          </div>

          {/* Action Button */}
          <button
            id="run-all-tests-btn"
            onClick={handleRunAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4" />
            <span>Relancer les tests ({testReport.totalTests})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-center">
          <span className="text-xs text-slate-400 font-semibold block">Total des Tests</span>
          <span className="text-2xl sm:text-3xl font-black text-white font-mono mt-1 block">
            {testReport.totalTests}
          </span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl text-center bg-emerald-950/20">
          <span className="text-xs text-emerald-400 font-semibold block">Tests Réussis</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1 block">
            {testReport.passedTests}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-center">
          <span className="text-xs text-slate-400 font-semibold block">Échecs</span>
          <span className="text-2xl sm:text-3xl font-black text-slate-400 font-mono mt-1 block">
            {testReport.failedTests}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-center">
          <span className="text-xs text-slate-400 font-semibold block">Temps d'Exécution</span>
          <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-1 block">
            {testReport.executionTimeTotalMs} ms
          </span>
        </div>
      </div>

      {/* Filter and Category Pills */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un test..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Test List Cards */}
      <div className="space-y-3">
        {filteredResults.map(test => (
          <div
            key={test.id}
            id={`test-item-${test.id}`}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {test.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm">{test.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {test.id}
                    </span>
                  </div>
                  {test.details && (
                    <p className="text-xs text-slate-400 mt-0.5">{test.details}</p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  PASSED
                </span>
                <span className="text-[10px] font-mono text-slate-500 block mt-1">
                  {test.executionTimeMs} ms
                </span>
              </div>
            </div>

            {/* Assertion Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">Résultat Attendu :</span>
                <span className="text-slate-300 font-semibold">{test.expected}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Résultat Obtenu :</span>
                <span className="text-emerald-400 font-bold">{test.actual}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
