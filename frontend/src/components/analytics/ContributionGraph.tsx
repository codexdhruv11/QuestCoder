import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { ContributionDay } from '@/types'
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay } from 'date-fns'

interface ContributionGraphProps {
  data: ContributionDay[]
  year: number
  className?: string
}

type PlatformFilter = 'both' | 'leetcode' | 'codeforces'

export function ContributionGraph({ data, year, className }: ContributionGraphProps) {
  const [filter, setFilter] = useState<PlatformFilter>('both')
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null)

  // Create a map for quick lookup
  const dataMap = new Map<string, ContributionDay>()
  data.forEach((day) => {
    dataMap.set(day.date, day)
  })

  // Generate all days in the year
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(new Date(year, 11, 31))
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd })

  // Organize days into weeks (7 rows for days of week)
  const weeks: Date[][] = []
  let currentWeek: Date[] = []

  // Start with the first day of the year, pad with empty days if needed
  const firstDayOfWeek = getDay(allDays[0]!)
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null as any) // Placeholder
  }

  allDays.forEach((day) => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null as any) // Placeholder
    }
    weeks.push(currentWeek)
  }

  // Get submission count based on filter
  const getCount = (day: ContributionDay | null): number => {
    if (!day) return 0
    if (filter === 'leetcode') return day.leetcode
    if (filter === 'codeforces') return day.codeforces
    return day.total
  }

  // Get color intensity based on count
  const getColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30'
    if (count <= 2) return 'bg-green-400/40'
    if (count <= 5) return 'bg-green-500/60'
    if (count <= 10) return 'bg-green-600/80'
    return 'bg-green-700'
  }

  // Calculate stats
  const totalSubmissions = data.reduce((sum, day) => sum + getCount(day), 0)
  const activeDays = data.filter((day) => getCount(day) > 0).length
  const maxDaySubmissions = Math.max(...data.map((day) => getCount(day)), 0)

  return (
    <Card font="retro" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle font="retro" className="retro">
            Contribution Graph
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              font="retro"
              size="sm"
              variant={filter === 'both' ? 'default' : 'outline'}
              onClick={() => setFilter('both')}
            >
              Both
            </Button>
            <Button
              font="retro"
              size="sm"
              variant={filter === 'leetcode' ? 'default' : 'outline'}
              onClick={() => setFilter('leetcode')}
            >
              LeetCode
            </Button>
            <Button
              font="retro"
              size="sm"
              variant={filter === 'codeforces' ? 'default' : 'outline'}
              onClick={() => setFilter('codeforces')}
            >
              Codeforces
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="retro text-sm text-muted-foreground">Total:</span>
            <Badge font="retro" variant="secondary">
              {totalSubmissions} submissions
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="retro text-sm text-muted-foreground">Active Days:</span>
            <Badge font="retro" variant="secondary">
              {activeDays} days
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="retro text-sm text-muted-foreground">Max Day:</span>
            <Badge font="retro" variant="secondary">
              {maxDaySubmissions} submissions
            </Badge>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-full">
            {/* Day labels */}
            <div className="flex mb-2">
              <div className="w-8" /> {/* Space for day names */}
              <div className="flex-1">
                <div className="flex gap-1">
                  {Array.from({ length: Math.ceil(allDays.length / 7) }).map((_, weekIndex) => {
                    const weekDate = allDays[weekIndex * 7]
                    if (weekDate && weekIndex % 4 === 0) {
                      return (
                        <div key={weekIndex} className="w-3 text-xs retro text-muted-foreground">
                          {format(weekDate, 'MMM')}
                        </div>
                      )
                    }
                    return <div key={weekIndex} className="w-3" />
                  })}
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="flex">
              {/* Day of week labels */}
              <div className="flex flex-col gap-1 mr-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div
                    key={day}
                    className="h-3 flex items-center justify-end text-xs retro text-muted-foreground"
                  >
                    {index % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Contribution cells */}
              <div className="flex-1">
                <div className="flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => {
                        if (!day) {
                          return <div key={dayIndex} className="w-3 h-3" />
                        }

                        const dateStr = format(day, 'yyyy-MM-dd')
                        const dayData = dataMap.get(dateStr)
                        const count = dayData ? getCount(dayData) : 0
                        const color = getColor(count)

                        return (
                          <div
                            key={dayIndex}
                            className={`w-3 h-3 rounded-sm border border-border ${color} cursor-pointer transition-transform hover:scale-125`}
                            onMouseEnter={() => dayData && setHoveredDay(dayData)}
                            onMouseLeave={() => setHoveredDay(null)}
                            title={`${dateStr}: ${count} submissions`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="retro text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30 border border-border" />
              <div className="w-3 h-3 rounded-sm bg-green-400/40 border border-border" />
              <div className="w-3 h-3 rounded-sm bg-green-500/60 border border-border" />
              <div className="w-3 h-3 rounded-sm bg-green-600/80 border border-border" />
              <div className="w-3 h-3 rounded-sm bg-green-700 border border-border" />
            </div>
            <span className="retro text-xs text-muted-foreground">More</span>
          </div>

          {/* Hovered day info */}
          {hoveredDay && (
            <div className="retro text-sm text-foreground">
              <span className="font-semibold">{hoveredDay.date}</span>
              {filter === 'both' ? (
                <span className="ml-2">
                  {hoveredDay.total} submissions
                  {hoveredDay.leetcode > 0 && ` (LC: ${hoveredDay.leetcode})`}
                  {hoveredDay.codeforces > 0 && ` (CF: ${hoveredDay.codeforces})`}
                </span>
              ) : (
                <span className="ml-2">{getCount(hoveredDay)} submissions</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}