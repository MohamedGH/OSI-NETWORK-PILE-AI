/**
 * Automated Unit Test Suite Runner View
 * Displays deterministic verification results across all implemented networking engines.
 */

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useNetworkStore } from '../store/stateManager';
import { useErrorManager } from '../errors/errorManager';

export const TestSuiteView: React.FC = () => {
  const { state, dispatch } = useNetworkStore();
  const { notify } = useErrorManager();
  const [filterCat, setFilterCat] = useState<string>('ALL');

  const { testReport } = state;

  const handleRun = () => {
    dispatch({ type: 'RUN_TEST_SUITE' });
    notify(`Validation exécutée : ${testReport.passedTests}/${testReport.totalTests} tests réussis`, 'success');
  };

  const categories = [
    { id: 'ALL', label: 'Tous les modules' },
    { id: 'TCP_CUBIC_WINDOW', label: 'TCP CUBIC & Fenêtre' },
    { id: 'CRC32_PARITY', label: 'CRC32 & Parité' },
    { id: 'IP_FRAGMENTATION', label: 'Fragmentation MTU' },
    { id: 'TOWN_INTERCITY', label: 'Ville & Inter-Ville' },
    { id: 'OSI_BANDWIDTH', label: 'OSI & Goodput' },
  ];

  const rows = testReport.results.filter(r => filterCat === 'ALL' || r.category === filterCat);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs text-slate-400">
            <span>Vérification Mathématique</span>
            <span className="mx-2">·</span>
            <span>{testReport.passedTests}/{testReport.totalTests} assertions validées</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Suite de Tests Unitaires Automatisée
          </h1>
        </div>

        <button
          onClick={handleRun}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-colors flex items-center gap-2 self-start whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5" /> Relancer les Tests ({testReport.totalTests})
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setFilterCat(c.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              filterCat === c.id ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse text-xs tabular-nums">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 font-mono">ID</th>
              <th className="py-3 px-4">Assertion & Protocole</th>
              <th className="py-3 px-4 font-mono">Attendu</th>
              <th className="py-3 px-4 font-mono">Obtenu</th>
              <th className="py-3 px-4 text-right">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
            {rows.map(test => (
              <tr key={test.id}>
                <td className="py-3 px-4 font-mono text-sky-400 font-semibold">{test.id}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-100">{test.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{test.details}</div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">{test.expected}</td>
                <td className="py-3 px-4 font-mono text-emerald-300">{test.actual}</td>
                <td className="py-3 px-4 text-right font-mono font-bold">
                  {test.passed ? (
                    <span className="text-emerald-400">● PASS</span>
                  ) : (
                    <span className="text-rose-400">▲ FAIL</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
