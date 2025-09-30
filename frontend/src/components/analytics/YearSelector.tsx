import { useEffect, useState } from 'react'
import { analyticsAPI } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
import { Card } from '@/components/ui/8bit/card'
import { Calendar } from 'lucide-react'

interface YearSelectorProps {
  selectedYear: number
  onYearChange: (year: number) => void
  className?: string
}

export function YearSelector({ selectedYear, onYearChange, className }: YearSelectorProps) {
  const [years, setYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchYears = async () => {
      try {
        setLoading(true)
        const data = await analyticsAPI.getYears()
        setYears(data)

        // If current selected year is not in the list, select the most recent year
        if (data.length > 0 && !data.includes(selectedYear)) {
          onYearChange(data[data.length - 1]!)
        }
      } catch (error) {
        console.error('Failed to fetch years:', error)
        // Fallback to current year
        const currentYear = new Date().getFullYear()
        setYears([currentYear])
      } finally {
        setLoading(false)
      }
    }

    fetchYears()
  }, [])

  if (loading) {
    return (
      <Card font="retro" className={`p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="retro text-sm text-muted-foreground">Loading...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Calendar className="h-5 w-5 text-primary" />
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
      >
        <SelectTrigger font="retro" className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent font="retro">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}