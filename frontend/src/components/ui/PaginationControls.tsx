import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  showResultsInfo?: boolean
  totalItems?: number
  itemsPerPage?: number
  className?: string
}

const PaginationControls = React.forwardRef<HTMLDivElement, PaginationControlsProps>(
  ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    disabled = false,
    showResultsInfo = false,
    totalItems,
    itemsPerPage = 20,
    className,
    ...props 
  }, ref) => {
    // Handle edge cases
    if (totalPages <= 0) {
      return null
    }

    const handlePreviousPage = () => {
      if (currentPage > 1 && !disabled) {
        onPageChange(currentPage - 1)
      }
    }

    const handleNextPage = () => {
      if (currentPage < totalPages && !disabled) {
        onPageChange(currentPage + 1)
      }
    }

    const isFirstPage = currentPage === 1
    const isLastPage = currentPage === totalPages

    // Calculate results info if requested
    const getResultsInfo = () => {
      if (!showResultsInfo || !totalItems) return null
      
      const startItem = ((currentPage - 1) * itemsPerPage) + 1
      const endItem = Math.min(currentPage * itemsPerPage, totalItems)
      
      return (
        <div className="text-sm text-gray-700">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )
    }

    return (
      <div 
        ref={ref}
        className={cn("flex items-center justify-between", className)}
        {...props}
      >
        {/* Results info (left side) */}
        <div className="flex-1">
          {getResultsInfo()}
        </div>

        {/* Pagination controls (center/right) */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={isFirstPage || disabled}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
          
          <span className="text-sm text-gray-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={isLastPage || disabled}
            className="flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
)

PaginationControls.displayName = "PaginationControls"

export { PaginationControls }
