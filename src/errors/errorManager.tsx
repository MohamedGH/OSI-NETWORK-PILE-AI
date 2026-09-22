/**
 * Global Error Manager:
 * - ErrorBoundary for catching and recovering from React errors
 * - Error Notification Toasts
 * - Diagnostic Logging & Error State Store
 */

import React, { createContext, useContext, useReducer, ReactNode, Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, XCircle, CheckCircle, Info } from 'lucide-react';

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

export interface AppError {
  readonly id: string;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly timestamp: number;
  readonly technicalDetails?: string;
}

interface ErrorManagerState {
  readonly errors: AppError[];
}

type ErrorManagerAction =
  | { type: 'ADD_ERROR'; payload: Omit<AppError, 'id' | 'timestamp'> }
  | { type: 'REMOVE_ERROR'; payload: { id: string } }
  | { type: 'CLEAR_ALL' };

const errorReducer = (state: ErrorManagerState, action: ErrorManagerAction): ErrorManagerState => {
  switch (action.type) {
    case 'ADD_ERROR': {
      const newError: AppError = {
        id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        message: action.payload.message,
        severity: action.payload.severity,
        timestamp: Date.now(),
        technicalDetails: action.payload.technicalDetails,
      };
      return {
        ...state,
        errors: [newError, ...state.errors.slice(0, 9)], // keep last 10
      };
    }
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(e => e.id !== action.payload.id),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        errors: [],
      };
    default:
      return state;
  }
};

interface ErrorManagerContextValue {
  readonly state: ErrorManagerState;
  readonly notify: (message: string, severity?: ErrorSeverity, technicalDetails?: string) => void;
  readonly removeError: (id: string) => void;
  readonly clearAll: () => void;
}

const ErrorManagerContext = createContext<ErrorManagerContextValue | null>(null);

export const ErrorManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, { errors: [] });

  const notify = (
    message: string,
    severity: ErrorSeverity = 'error',
    technicalDetails?: string
  ) => {
    dispatch({
      type: 'ADD_ERROR',
      payload: { message, severity, technicalDetails },
    });
  };

  const removeError = (id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: { id } });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  return (
    <ErrorManagerContext.Provider value={{ state, notify, removeError, clearAll }}>
      {children}
      {/* Toast Notification Bar */}
      <div
        id="toast-notification-container"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none"
      >
        {state.errors.slice(0, 3).map(err => (
          <div
            key={err.id}
            id={`toast-${err.id}`}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all flex items-start gap-3 ${
              err.severity === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
                : err.severity === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                : err.severity === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                : 'bg-slate-900/90 border-cyan-500/40 text-slate-100'
            }`}
          >
            {err.severity === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {err.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {err.severity === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {err.severity === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{err.message}</p>
              {err.technicalDetails && (
                <p className="text-xs font-mono text-slate-300 mt-1 truncate">{err.technicalDetails}</p>
              )}
            </div>

            <button
              id={`dismiss-btn-${err.id}`}
              onClick={() => removeError(err.id)}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Fermer"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ErrorManagerContext.Provider>
  );
};

export const useErrorManager = (): ErrorManagerContextValue => {
  const context = useContext(ErrorManagerContext);
  if (!context) {
    throw new Error('useErrorManager must be used within an ErrorManagerProvider');
  }
  return context;
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Une anomalie est survenue</h2>
            <p className="text-sm text-slate-300">
              Le module réseau a rencontré une erreur d'exécution inattendue.
            </p>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-rose-300 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              id="error-boundary-reload-btn"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser le simulateur
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
