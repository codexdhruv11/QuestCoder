import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { CustomBarChart } from '@/components/ui/chart'
import { WeeklyActivity } from '@/types'

interface WeeklyActivityChartProps {
  data: WeeklyActivity[]
  className?: string
}

export function WeeklyActivityChart({ data, className }: WeeklyActivityChartProps) {
  // Calculate most active day
  const mostActiveDay = data.reduce(
    (max, day) => (day.total > max.total ? day : max),
    data[0] || { dayOfWeek: '', total: 0 }
  )

  // Calculate total
  const totalSubmissions = data.reduce((sum, day) => sum + day.total, 0)

  return (
    <Card font="retro" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle font="retro" className="retro">
            Weekly Activity
          </CardTitle>
          {mostActiveDay.total > 0 && (
            <p className="retro text-xs text-muted-foreground">
              Most active: <span className="font-semibold text-foreground">{mostActiveDay.dayOfWeek}</span>{' '}
              ({mostActiveDay.total} submissions)
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {totalSubmissions > 0 ? (
          <CustomBarChart
            data={data}
            bars={[
              { dataKey: 'leetcode', name: 'LeetCode', fill: '#FFA116' },
              { dataKey: 'codeforces', name: 'Codeforces', fill: '#1F8ACB' }
            ]}
            xAxisKey="dayOfWeek"
            height={300}
            showLegend
          />
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="retro text-sm text-muted-foreground">No activity data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}