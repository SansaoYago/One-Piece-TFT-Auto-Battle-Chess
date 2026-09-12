import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;
  public setState: any;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center">
          <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl space-y-4">
            <span className="text-4xl">⚓</span>
            <h2 className="text-xl font-black text-amber-400">Ocorreu uma instabilidade na batalha!</h2>
            <p className="text-xs text-slate-300">
              {this.state.error?.message || 'Um erro inesperado aconteceu ao processar os dados do campeão ou item.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              Recarregar Jogo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
