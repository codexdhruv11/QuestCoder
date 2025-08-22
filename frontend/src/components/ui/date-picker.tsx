
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className
}: DatePickerProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "w-[280px] justify-start text-left font-normal",
        !date && "text-muted-foreground",
        className
      )}
      onClick={() => {
        // Placeholder for date picker functionality
        const newDate = new Date()
        onDateChange?.(newDate)
      }}
    >
      <Calendar className="mr-2 h-4 w-4" />
      {date ? date.toLocaleDateString() : placeholder}
    </Button>
  )
}
