import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from './ui/8bit/card';
import { Button } from './ui/8bit/button';
import '@/components/ui/8bit/styles/retro.css'

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ProblemListErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service here
    console.error('ProblemListErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  override render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <Card font="retro" className="p-6 m-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="retro font-semibold text-red-900 dark:text-red-100 mb-1">
                Problem List Rendering Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                There was an error rendering the problem list. This might be due to data inconsistency or a temporary issue.
              </p>
              {process.env['NODE_ENV'] === 'development' && this.state.error && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-red-600 dark:text-red-400 hover:underline">
                    Show error details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  font="retro"
                  size="sm"
                  variant="outline"
                  onClick={this.handleReset}
                  className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  Try Again
                </Button>
                <Button
                  font="retro"
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ProblemListErrorBoundary;
