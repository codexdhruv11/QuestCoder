import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit/select"
import { Label } from "@/components/ui/8bit/label"
import { cn } from "@/lib/utils"
import '@/components/ui/8bit/styles/retro.css'

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
  HTMLDivElement,
  FilterDropdownProps
>(({ label, value, onChange, options, placeholder, className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      <Label font="retro" className="retro text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} {...props}>
        <SelectTrigger font="retro" className="w-full">
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





