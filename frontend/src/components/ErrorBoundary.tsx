import { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import '@/components/ui/8bit/styles/retro.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null as any, errorInfo: null as any })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
          <Card font="retro" className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle font="retro" className="retro text-xl">Something went wrong</CardTitle>
              <CardDescription font="retro">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env?.DEV && this.state.error && (
                <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="font-semibold text-destructive">Error Details:</p>
                  <p className="text-muted-foreground mt-1">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-destructive">Stack Trace</summary>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button font="retro" onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button font="retro" variant="outline" onClick={this.handleReload} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button font="retro" variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary


