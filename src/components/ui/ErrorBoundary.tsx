'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó una excepción:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border-2 border-rose-300 bg-rose-50/70 p-6 sm:p-8 space-y-4 shadow-sm my-6">
          <div className="flex items-center gap-3 text-rose-700">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-rose-950">
                {this.props.fallbackTitle || 'Error en el renderizado de la receta'}
              </h3>
              <p className="text-xs text-rose-700">
                Se interceptó un fallo en el componente cliente.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Error Message:
            </label>
            <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs font-mono text-rose-900 break-words">
              {this.state.error?.message || 'Error desconocido'}
            </div>
          </div>

          {this.state.error?.stack && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Stack Trace:
              </label>
              <pre className="p-3.5 rounded-xl bg-stone-900 text-rose-300 text-[10px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                {this.state.error.stack}
              </pre>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Intentar de nuevo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
