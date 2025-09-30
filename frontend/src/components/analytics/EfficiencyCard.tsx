import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface EfficiencyCardProps {
  title: string
  submissions: number
  problemsSolved: number
  efficiency: number
  icon?: React.ReactNode
  className?: string
}

export function EfficiencyCard({
  title,
  submissions,
  problemsSolved,
  efficiency,
  icon,
  className
}: EfficiencyCardProps) {
  // Efficiency rating based on ratio
  const getEfficiencyRating = (eff: number): { label: string; color: string; icon: React.ReactNode } => {
    if (eff <= 0) {
      return { label: 'No Data', color: 'text-muted-foreground', icon: <Minus className="h-4 w-4" /> }
    }
    if (eff <= 1.5) {
      return { label: 'Excellent', color: 'text-green-600', icon: <TrendingUp className="h-4 w-4" /> }
    }
    if (eff <= 3) {
      return { label: 'Good', color: 'text-green-500', icon: <TrendingUp className="h-4 w-4" /> }
    }
    if (eff <= 5) {
      return { label: 'Average', color: 'text-yellow-600', icon: <Minus className="h-4 w-4" /> }
    }
    if (eff <= 10) {
      return { label: 'Needs Work', color: 'text-orange-600', icon: <TrendingDown className="h-4 w-4" /> }
    }
    return { label: 'High Retry Rate', color: 'text-red-600', icon: <TrendingDown className="h-4 w-4" /> }
  }

  const rating = getEfficiencyRating(efficiency)

  return (
    <Card font="retro" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle font="retro" className="retro text-lg">
            {title}
          </CardTitle>
          {icon && <div className="text-primary">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="retro text-xs text-muted-foreground mb-1">Submissions</p>
              <p className="retro text-2xl font-bold">{submissions.toLocaleString()}</p>
            </div>
            <div>
              <p className="retro text-xs text-muted-foreground mb-1">Problems Solved</p>
              <p className="retro text-2xl font-bold">{problemsSolved.toLocaleString()}</p>
            </div>
          </div>

          {/* Efficiency Ratio */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="retro text-xs text-muted-foreground">Efficiency Ratio</p>
              <div className={`flex items-center gap-1 ${rating.color}`}>
                {rating.icon}
                <span className="retro text-xs font-semibold">{rating.label}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="retro text-3xl font-bold">
                {efficiency > 0 ? efficiency.toFixed(2) : '—'}
              </p>
              {efficiency > 0 && (
                <span className="retro text-sm text-muted-foreground">
                  submissions / problem
                </span>
              )}
            </div>
            {efficiency > 0 && (
              <p className="retro text-xs text-muted-foreground mt-2">
                On average, you make <span className="font-semibold">{efficiency.toFixed(1)}</span>{' '}
                attempts per problem
              </p>
            )}
          </div>

          {/* Success Rate */}
          {submissions > 0 && (
            <div className="pt-4 border-t">
              <p className="retro text-xs text-muted-foreground mb-1">First Attempt Success</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${Math.min((problemsSolved / submissions) * 100, 100)}%` }}
                  />
                </div>
                <Badge font="retro" variant="secondary" className="text-xs">
                  {((problemsSolved / submissions) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}