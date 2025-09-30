import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { CustomPieChart } from '@/components/ui/chart'
import { AnalyticsStats } from '@/types'

interface PlatformDistributionChartsProps {
  stats: AnalyticsStats
  className?: string
}

export function PlatformDistributionCharts({ stats, className }: PlatformDistributionChartsProps) {
  // Prepare data for submissions pie chart
  const submissionsData = [
    { name: 'LeetCode', value: stats.leetcode.submissions, fill: '#FFA116' },
    { name: 'Codeforces', value: stats.codeforces.submissions, fill: '#1F8ACB' }
  ].filter(item => item.value > 0)

  // Prepare data for problems solved pie chart
  const problemsData = [
    { name: 'LeetCode', value: stats.leetcode.problemsSolved, fill: '#FFA116' },
    { name: 'Codeforces', value: stats.codeforces.problemsSolved, fill: '#1F8ACB' }
  ].filter(item => item.value > 0)

  const hasSubmissions = submissionsData.length > 0
  const hasProblems = problemsData.length > 0

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      {/* Submissions Distribution */}
      <Card font="retro">
        <CardHeader>
          <CardTitle font="retro" className="retro">
            Submissions Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasSubmissions ? (
            <div>
              <CustomPieChart
                data={submissionsData}
                dataKey="value"
                nameKey="name"
                height={300}
                showLegend
                colors={['#FFA116', '#1F8ACB']}
              />
              <div className="mt-4 space-y-2">
                {submissionsData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="retro text-sm">{item.name}</span>
                    </div>
                    <span className="retro text-sm font-semibold">
                      {item.value.toLocaleString()} (
                      {((item.value / stats.combined.submissions) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="retro text-sm text-muted-foreground">No submission data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problems Solved Distribution */}
      <Card font="retro">
        <CardHeader>
          <CardTitle font="retro" className="retro">
            Problems Solved Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasProblems ? (
            <div>
              <CustomPieChart
                data={problemsData}
                dataKey="value"
                nameKey="name"
                height={300}
                showLegend
                colors={['#FFA116', '#1F8ACB']}
              />
              <div className="mt-4 space-y-2">
                {problemsData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="retro text-sm">{item.name}</span>
                    </div>
                    <span className="retro text-sm font-semibold">
                      {item.value.toLocaleString()} (
                      {((item.value / stats.combined.problemsSolved) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="retro text-sm text-muted-foreground">No problem data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}