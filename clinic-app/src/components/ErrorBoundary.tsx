import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a chunk loading error (common after deployments)
    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.name === 'ChunkLoadError';

    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error) {
    // If it's a chunk error, try to auto-reload once
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk')
    ) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_error_reload', 'true');
        window.location.reload();
        return;
      }
    }
    // Clear the reload flag on successful load
    sessionStorage.removeItem('chunk_error_reload');
  }

  handleReload = () => {
    sessionStorage.removeItem('chunk_error_reload');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {this.state.isChunkError ? 'New Version Available' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              {this.state.isChunkError
                ? 'A new version of the app has been deployed. Please refresh to get the latest version.'
                : 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
