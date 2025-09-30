import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { AnalyticsStats } from '@/types'
import { Code2, Sword, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/8bit/progress'

interface PlatformComparisonProps {
  stats: AnalyticsStats
  className?: string
}

export function PlatformComparison({ stats, className }: PlatformComparisonProps) {
  const platforms = [
    {
      name: 'LeetCode',
      icon: <Code2 className="h-5 w-5" />,
      data: stats.leetcode,
      color: 'text-orange-500'
    },
    {
      name: 'Codeforces',
      icon: <Sword className="h-5 w-5" />,
      data: stats.codeforces,
      color: 'text-blue-500'
    },
    {
      name: 'Combined',
      icon: <TrendingUp className="h-5 w-5" />,
      data: stats.combined,
      color: 'text-primary'
    }
  ]

  // Find best efficiency
  const bestEfficiency = Math.min(
    stats.leetcode.efficiency > 0 ? stats.leetcode.efficiency : Infinity,
    stats.codeforces.efficiency > 0 ? stats.codeforces.efficiency : Infinity
  )

  return (
    <Card font="retro" className={className}>
      <CardHeader>
        <CardTitle font="retro" className="retro">
          Platform Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform, index) => (
            <div
              key={platform.name}
              className={`space-y-4 ${index < platforms.length - 1 ? 'md:border-r md:pr-6' : ''}`}
            >
              {/* Platform Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={platform.color}>{platform.icon}</div>
                  <h3 className="retro text-lg font-semibold">{platform.name}</h3>
                </div>
                {platform.data.efficiency > 0 && platform.data.efficiency === bestEfficiency && (
                  <Badge font="retro" variant="default" className="text-xs">
                    Best
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="retro text-xs text-muted-foreground">Submissions</span>
                    <span className="retro text-sm font-semibold">
                      {platform.data.submissions.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.combined.submissions > 0
                        ? (platform.data.submissions / stats.combined.submissions) * 100
                        : 0
                    }
                    className="h-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="retro text-xs text-muted-foreground">Problems Solved</span>
                    <span className="retro text-sm font-semibold">
                      {platform.data.problemsSolved.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.combined.problemsSolved > 0
                        ? (platform.data.problemsSolved / stats.combined.problemsSolved) * 100
                        : 0
                    }
                    className="h-1.5"
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="retro text-xs text-muted-foreground">Efficiency</span>
                    <span className="retro text-lg font-bold">
                      {platform.data.efficiency > 0 ? platform.data.efficiency.toFixed(2) : '—'}
                    </span>
                  </div>
                  {platform.data.efficiency > 0 && (
                    <p className="retro text-xs text-muted-foreground mt-1">
                      {platform.data.efficiency.toFixed(1)} attempts per problem
                    </p>
                  )}
                </div>

                {/* Difficulty Breakdown (LeetCode only) */}
                {platform.name === 'LeetCode' && platform.data.difficulty && (
                  <div className="pt-2 border-t">
                    <p className="retro text-xs text-muted-foreground mb-2">Difficulty</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="retro text-xs text-green-600">Easy</span>
                        <span className="retro text-xs font-semibold">
                          {platform.data.difficulty.easy || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="retro text-xs text-yellow-600">Medium</span>
                        <span className="retro text-xs font-semibold">
                          {platform.data.difficulty.medium || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="retro text-xs text-red-600">Hard</span>
                        <span className="retro text-xs font-semibold">
                          {platform.data.difficulty.hard || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}