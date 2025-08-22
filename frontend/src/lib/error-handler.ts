type AxiosError = any

export interface ErrorInfo {
  title: string
  message: string
  variant: 'destructive' | 'warning' | 'default'
}

/**
 * Extracts user-friendly error information from various error types
 */
export function getErrorInfo(error: unknown): ErrorInfo {
  // Default error info
  let errorInfo: ErrorInfo = {
    title: 'Error',
    message: 'An unexpected error occurred. Please try again.',
    variant: 'destructive'
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError
    const status = axiosError.response?.status
    const data = axiosError.response?.data

    // Extract error message from response
    const serverMessage = data?.message || data?.error || data?.details

    switch (status) {
      case 400:
        errorInfo = {
          title: 'Invalid Request',
          message: serverMessage || 'Please check your input and try again.',
          variant: 'destructive'
        }
        break

      case 401:
        errorInfo = {
          title: 'Login Failed',
          message: serverMessage || 'Invalid email or password',
          variant: 'warning'
        }
        break

      case 403:
        errorInfo = {
          title: 'Access Denied',
          message: 'You do not have permission to perform this action.',
          variant: 'destructive'
        }
        break

      case 404:
        errorInfo = {
          title: 'Not Found',
          message: 'The requested resource could not be found.',
          variant: 'warning'
        }
        break

      case 409:
        errorInfo = {
          title: 'Conflict',
          message: serverMessage || 'This resource already exists or conflicts with existing data.',
          variant: 'warning'
        }
        break

      case 422:
        errorInfo = {
          title: 'Validation Error',
          message: serverMessage || 'Please check your input and try again.',
          variant: 'destructive'
        }
        break

      case 429:
        errorInfo = {
          title: 'Too Many Requests',
          message: 'You are making requests too quickly. Please wait and try again.',
          variant: 'warning'
        }
        break

      case 500:
      case 502:
      case 503:
      case 504:
        errorInfo = {
          title: 'Server Error',
          message: 'Our servers are experiencing issues. Please try again later.',
          variant: 'destructive'
        }
        break

      default:
        if (axiosError.code === 'NETWORK_ERROR' || axiosError.code === 'ERR_NETWORK') {
          errorInfo = {
            title: 'Connection Error',
            message: 'Please check your internet connection and try again.',
            variant: 'warning'
          }
        } else if (axiosError.code === 'ECONNABORTED') {
          errorInfo = {
            title: 'Request Timeout',
            message: 'The request took too long to complete. Please try again.',
            variant: 'warning'
          }
        } else {
          errorInfo.message = serverMessage || errorInfo.message
        }
    }
  } else if (error instanceof Error) {
    errorInfo = {
      title: 'Error',
      message: error.message || errorInfo.message,
      variant: 'destructive'
    }
  } else if (typeof error === 'string') {
    errorInfo = {
      title: 'Error',
      message: error,
      variant: 'destructive'
    }
  }

  return errorInfo
}

/**
 * Helper function to handle errors consistently with toast notifications
 */
export function handleError(error: unknown, toast: (options: any) => void, customMessage?: string) {
  const errorInfo = getErrorInfo(error)
  
  toast({
    title: errorInfo.title,
    description: customMessage || errorInfo.message,
    variant: errorInfo.variant
  })

  // Log error for debugging
  console.error('Error details:', error)
}

/**
 * Retry wrapper for async functions with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry certain error types
      if (error && typeof error === 'object' && 'response' in error) {
        const errorAsAxios = error as AxiosError
        const status = errorAsAxios.response?.status
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          throw error // Don't retry client errors
        }
      }

      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }

  throw lastError
}




