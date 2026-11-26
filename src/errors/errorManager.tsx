/**
 * Error Manager & Global React Error Boundary
 * Handles non-intrusive toast notifications, input validation alerts, and runtime error recovery.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, Component, ErrorInfo } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  readonly id: string;
  readonly message: string;
  readonly severity: NotificationSeverity;
}

interface ErrorManagerContextValue {
  readonly notifications: AppNotification[];
  readonly notify: (message: string, severity?: NotificationSeverity) => void;
  readonly dismiss: (id: string) => void;
}

const ErrorManagerContext = createContext<ErrorManagerContextValue | null>(null);

export const ErrorManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((message: string, severity: NotificationSeverity = 'info') => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setNotifications(prev => [...prev.slice(-2), { id, message, severity }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4200);
  }, []);

  return (
    <ErrorManagerContext.Provider value={{ notifications, notify, dismiss }}>
      {children}
      {notifications.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none"
          role="region"
          aria-label="Notifications système"
        >
          {notifications.map(n => (
            <div
              key={n.id}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 shadow-lg text-xs"
            >
              <div className="flex items-center gap-2.5">
                {n.severity === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {n.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                {n.severity === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                {n.severity === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="leading-snug">{n.message}</span>
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                aria-label="Fermer la notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ErrorManagerContext.Provider>
  );
};

export const useErrorManager = (): ErrorManagerContextValue => {
  const ctx = useContext(ErrorManagerContext);
  if (!ctx) {
    throw new Error('useErrorManager must be used within an ErrorManagerProvider');
  }
  return ctx;
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Erreur inattendue' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught simulation error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Réinitialisation du module</h2>
            <p className="text-xs text-slate-400 font-mono">{this.state.errorMessage}</p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition-colors"
            >
              Relancer le simulateur
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
