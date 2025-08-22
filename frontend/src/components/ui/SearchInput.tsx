import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { debounce } from "@/lib/utils"
import { cn } from "@/lib/utils"

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, placeholder = "Search...", debounceMs = 300, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value)
    
    // Use ref to hold latest onChange callback
    const onChangeRef = React.useRef(onChange)
    onChangeRef.current = onChange

    // Create stable debounced function that doesn't recreate on each render
    const debouncedOnChangeRef = React.useRef<ReturnType<typeof debounce> | null>(null)
    
    // Initialize debounced function only once or when debounceMs changes
    React.useEffect(() => {
      // Create new stable debounced function that calls latest onChange
      debouncedOnChangeRef.current = debounce((value: string) => {
        onChangeRef.current(value)
      }, debounceMs)
      
      // Cleanup function to clear pending timers
      return () => {
        debouncedOnChangeRef.current = null
      }
    }, [debounceMs])

    // Update internal value when external value changes
    React.useEffect(() => {
      setInternalValue(value)
    }, [value])

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      if (debouncedOnChangeRef.current) {
        debouncedOnChangeRef.current(newValue)
      }
    }

    return (
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          ref={ref}
          className={cn("pl-10", className)}
          value={internalValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          {...props}
        />
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput }
