import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card';
import { Button } from '@/components/ui/8bit/button';
import { Badge } from '@/components/ui/8bit/badge';
import { Progress } from '@/components/ui/8bit/progress';
import { BarChart } from '@/components/ui/8bit/chart';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  Zap, 
  Award,
  Clock,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';

export interface PredictiveData {
  currentVelocity: number; // problems per day
  projectedCompletion: {
    optimistic: string; // date
    realistic: string; // date
    pessimistic: string; // date
  };
  recommendedDailyTarget: number;
  confidenceLevel: number; // 0-100
  trendAnalysis: {
    direction: 'improving' | 'declining' | 'stable';
    percentage: number;
    description: string;
  };
  patternPredictions: Array<{
    pattern: string;
    currentMastery: number;
    projectedMastery: number;
    timeToComplete: number; // days
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>;
  milestones: Array<{
    name: string;
    target: number;
    current: number;
    estimatedDate: string;
    type: 'problems' | 'patterns' | 'streaks' | 'badges';
  }>;
}

interface PredictiveInsightsProps {
  data: PredictiveData;
  title?: string;
  subtitle?: string;
  className?: string;
}

type ViewMode = 'completion' | 'patterns' | 'milestones';

export function PredictiveInsights({ 
  data, 
  title = "Predictive Insights",
  subtitle = "AI-powered predictions for your coding journey",
  className 
}: PredictiveInsightsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('completion');

  const getTrendIcon = () => {
    switch (data.trendAnalysis.direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Brain className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTrendColor = () => {
    switch (data.trendAnalysis.direction) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getConfidenceColor = () => {
    if (data.confidenceLevel >= 80) return 'text-green-600';
    if (data.confidenceLevel >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'problems':
        return <Target className="h-4 w-4" />;
      case 'patterns':
        return <Brain className="h-4 w-4" />;
      case 'streaks':
        return <Zap className="h-4 w-4" />;
      case 'badges':
        return <Award className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  // Prepare chart data for pattern predictions
  const patternChartData = data.patternPredictions.map(pattern => ({
    name: pattern.pattern.length > 12 ? pattern.pattern.substring(0, 12) + '...' : pattern.pattern,
    current: pattern.currentMastery,
    projected: pattern.projectedMastery,
  }));

  // const patternChartConfig = {
  //   current: {
  //     label: "Current Mastery",
  //     color: "hsl(var(--chart-1))",
  //   },
  //   projected: {
  //     label: "Projected Mastery",
  //     color: "hsl(var(--chart-2))",
  //   },
  // };

  // Prepare milestone progress data
  const milestoneChartData = data.milestones.map(milestone => ({
    name: milestone.name,
    progress: (milestone.current / milestone.target) * 100,
  }));

  // const milestoneChartConfig = {
  //   progress: {
  //     label: "Progress %",
  //     color: "hsl(var(--chart-3))",
  //   },
  // };

  const renderCompletionView = () => (
    <div className="space-y-6">
      {/* Velocity and Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{data.currentVelocity.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Problems/Day</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{data.recommendedDailyTarget}</p>
              <p className="text-sm text-muted-foreground">Recommended/Day</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <div>
              <p className={`text-2xl font-bold ${getConfidenceColor()}`}>
                {data.confidenceLevel}%
              </p>
              <p className="text-sm text-muted-foreground">Confidence</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Trend Analysis */}
      <Card className="p-4">
        <div className="flex items-start space-x-3">
          {getTrendIcon()}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`font-medium ${getTrendColor()}`}>
                Learning Trend: {data.trendAnalysis.direction.charAt(0).toUpperCase() + data.trendAnalysis.direction.slice(1)}
              </span>
              <Badge variant="outline" className="text-xs">
                {data.trendAnalysis.percentage.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{data.trendAnalysis.description}</p>
          </div>
        </div>
      </Card>

      {/* Completion Predictions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Projected Completion Dates</h4>
        <div className="space-y-3">
          {[
            { label: 'Optimistic', date: data.projectedCompletion.optimistic, color: 'bg-green-100 text-green-800 dark:bg-green-900/30' },
            { label: 'Realistic', date: data.projectedCompletion.realistic, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' },
            { label: 'Pessimistic', date: data.projectedCompletion.pessimistic, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30' },
          ].map((scenario) => (
            <div key={scenario.label} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{scenario.label}</span>
              </div>
              <Badge className={scenario.color}>
                {format(new Date(scenario.date), 'MMM d, yyyy')}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPatternsView = () => (
    <div className="space-y-6">
      <div className="h-[300px]">
        <BarChart
          data={patternChartData}
          bars={[
            { dataKey: 'current', name: 'Current Mastery', fill: 'hsl(var(--chart-1))' },
            { dataKey: 'projected', name: 'Projected Mastery', fill: 'hsl(var(--chart-2))' }
          ]}
          xAxisKey="name"
          className="h-full"
        />
      </div>
      
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Pattern Completion Timeline</h4>
        <div className="space-y-3">
          {data.patternPredictions.slice(0, 5).map((pattern) => (
            <div key={pattern.pattern} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{pattern.pattern}</span>
                  <Badge variant="outline" className="text-xs">
                    {pattern.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{pattern.timeToComplete} days to complete</span>
                </div>
                <Progress 
                  value={pattern.currentMastery} 
                  className="h-2 mt-2" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMilestonesView = () => (
    <div className="space-y-6">
      <div className="h-[300px]">
        <BarChart
          data={milestoneChartData}
          bars={[
            { dataKey: 'progress', name: 'Progress %', fill: 'hsl(var(--chart-3))' }
          ]}
          xAxisKey="name"
          className="h-full"
        />
      </div>
      
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Upcoming Milestones</h4>
        <div className="space-y-3">
          {data.milestones.map((milestone) => (
            <div key={milestone.name} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                {getMilestoneIcon(milestone.type)}
                <div>
                  <p className="font-medium text-sm">{milestone.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {milestone.current}/{milestone.target} complete
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs">
                  {format(new Date(milestone.estimatedDate), 'MMM d')}
                </Badge>
                <Progress 
                  value={(milestone.current / milestone.target) * 100} 
                  className="h-1 mt-1 w-20" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* View Mode Selector */}
        <div className="flex space-x-2">
          {(['completion', 'patterns', 'milestones'] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(mode)}
              className="text-xs"
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>

        {/* Content based on view mode */}
        {viewMode === 'completion' && renderCompletionView()}
        {viewMode === 'patterns' && renderPatternsView()}
        {viewMode === 'milestones' && renderMilestonesView()}
      </CardContent>
    </Card>
  );
}
