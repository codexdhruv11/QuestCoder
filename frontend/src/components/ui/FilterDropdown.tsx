import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDropdownProps extends Omit<React.ComponentPropsWithoutRef<typeof Select>, 'onValueChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  placeholder?: string
  className?: string
}

const FilterDropdown = React.forwardRef<
  React.ElementRef<typeof Select>,
  FilterDropdownProps
>(({ label, value, onChange, options, placeholder, className, ...props }, ref) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <Select ref={ref} value={value} onValueChange={onChange} {...props}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})

FilterDropdown.displayName = "FilterDropdown"

export { FilterDropdown }





