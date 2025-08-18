import { useState } from 'react';
import { RadarChart } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface PatternMasteryData {
  pattern: string;
  mastery: number;
  totalProblems: number;
  solvedProblems: number;
  averageTime?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

interface PatternRadarProps {
  data: PatternMasteryData[];
  title?: string;
  subtitle?: string;
  className?: string;
  showComparison?: boolean;
  comparisonData?: PatternMasteryData[];
}

type ViewMode = 'mastery' | 'solved' | 'efficiency';

export function PatternRadar({ 
  data, 
  title = "Pattern Mastery",
  subtitle = "Your progress across different algorithmic patterns",
  className,
  showComparison = false,
  comparisonData = []
}: PatternRadarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mastery');
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(
    data.slice(0, 8).map(item => item.pattern) // Show first 8 patterns by default
  );

  // Calculate efficiency score (problems solved per minute)
  const calculateEfficiency = (item: PatternMasteryData) => {
    if (!item.averageTime || item.averageTime === 0) return 0;
    return Math.min(100, (60 / item.averageTime) * 10); // Normalize to 0-100 scale
  };

  // Prepare data based on view mode
  const getDataValue = (item: PatternMasteryData) => {
    switch (viewMode) {
      case 'mastery':
        return item.mastery;
      case 'solved':
        return Math.min(100, (item.solvedProblems / Math.max(item.totalProblems, 1)) * 100);
      case 'efficiency':
        return calculateEfficiency(item);
      default:
        return item.mastery;
    }
  };

  // Filter data to show only selected patterns
  const filteredData = data
    .filter(item => selectedPatterns.includes(item.pattern))
    .map(item => ({
      pattern: item.pattern.length > 15 ? item.pattern.substring(0, 15) + '...' : item.pattern,
      fullPattern: item.pattern,
      current: getDataValue(item),
      ...item,
    }));

  // Add comparison data if available
  const chartData = filteredData.map(item => {
    const comparisonItem = comparisonData.find(comp => comp.pattern === item.fullPattern);
    return {
      pattern: item.pattern,
      current: item.current,
      ...(showComparison && comparisonItem && {
        comparison: getDataValue(comparisonItem),
      }),
    };
  });

  const chartConfig = {
    current: {
      label: "Your Progress",
      color: "hsl(var(--chart-1))",
    },
    ...(showComparison && {
      comparison: {
        label: "Average",
        color: "hsl(var(--chart-2))",
      },
    }),
  };

  const togglePattern = (pattern: string) => {
    setSelectedPatterns(prev => {
      if (prev.includes(pattern)) {
        return prev.filter(p => p !== pattern);
      } else if (prev.length < 10) { // Limit to 10 patterns for readability
        return [...prev, pattern];
      }
      return prev;
    });
  };

  // Calculate overall statistics
  const overallStats = {
    averageMastery: data.reduce((sum, item) => sum + item.mastery, 0) / data.length,
    topPattern: data.reduce((max, item) => item.mastery > max.mastery ? item : max, data[0]),
    weakestPattern: data.reduce((min, item) => item.mastery < min.mastery ? item : min, data[0]),
    totalSolved: data.reduce((sum, item) => sum + item.solvedProblems, 0),
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'mastery':
        return 'Mastery %';
      case 'solved':
        return 'Completion %';
      case 'efficiency':
        return 'Efficiency Score';
      default:
        return 'Mastery %';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* View Mode Selector */}
        <div className="flex space-x-2">
          {(['mastery', 'solved', 'efficiency'] as ViewMode[]).map((mode) => (
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

        {/* Pattern Selector */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Select Patterns ({selectedPatterns.length}/10)</div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {data.map((item) => (
              <Badge
                key={item.pattern}
                variant={selectedPatterns.includes(item.pattern) ? 'default' : 'outline'}
                className={`cursor-pointer text-xs ${getDifficultyColor(item.difficulty)}`}
                onClick={() => togglePattern(item.pattern)}
              >
                {item.pattern}
              </Badge>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[400px]">
          <RadarChart
            data={chartData}
            config={chartConfig}
            className="h-full"
          />
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-chart-1"></div>
            <span>Your {getViewModeLabel()}</span>
          </div>
          {showComparison && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-chart-2"></div>
              <span>Average {getViewModeLabel()}</span>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold">{overallStats.averageMastery.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Avg Mastery</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold">{overallStats.totalSolved}</p>
            <p className="text-sm text-muted-foreground">Total Solved</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-green-600">{overallStats.topPattern?.pattern}</p>
            <p className="text-sm text-muted-foreground">Top Pattern</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-orange-600">{overallStats.weakestPattern?.pattern}</p>
            <p className="text-sm text-muted-foreground">Focus Area</p>
          </div>
        </div>

        {/* Pattern Details for Selected Items */}
        {selectedPatterns.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium">Pattern Details</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {filteredData.slice(0, 5).map((item) => (
                <div key={item.fullPattern} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.fullPattern}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">
                      {item.solvedProblems}/{item.totalProblems}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.current.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
