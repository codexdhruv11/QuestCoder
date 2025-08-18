import { useState } from 'react';
import { LineChart } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface PerformanceData {
  date: string;
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title?: string;
  subtitle?: string;
  className?: string;
}

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export function PerformanceChart({ 
  data, 
  title = "Solving Performance", 
  subtitle = "Problems solved over time",
  className 
}: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [showDifficulties, setShowDifficulties] = useState({
    easy: true,
    medium: true,
    hard: true,
    total: true,
  });

  // Filter data based on time range
  const filterDataByRange = (data: PerformanceData[]) => {
    const now = new Date();
    const ranges = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    
    const daysToShow = ranges[timeRange];
    const cutoffDate = new Date(now.getTime() - daysToShow * 24 * 60 * 60 * 1000);
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };

  const filteredData = filterDataByRange(data);

  // Calculate trend
  const calculateTrend = () => {
    if (filteredData.length < 2) return { direction: 'stable', percentage: 0 };
    
    const recent = filteredData.slice(-7); // Last 7 days
    const previous = filteredData.slice(-14, -7); // Previous 7 days
    
    if (previous.length === 0) return { direction: 'stable', percentage: 0 };
    
    const recentAvg = recent.reduce((sum, item) => sum + item.total, 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + item.total, 0) / previous.length;
    
    if (previousAvg === 0) return { direction: 'stable', percentage: 0 };
    
    const percentage = ((recentAvg - previousAvg) / previousAvg) * 100;
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';
    
    return { direction, percentage: Math.abs(percentage) };
  };

  const trend = calculateTrend();

  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Prepare chart data
  const chartData = filteredData.map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    ...(showDifficulties.easy && { Easy: item.easy }),
    ...(showDifficulties.medium && { Medium: item.medium }),
    ...(showDifficulties.hard && { Hard: item.hard }),
    ...(showDifficulties.total && { Total: item.total }),
  }));

  const chartConfig = {
    Easy: {
      label: "Easy",
      color: "hsl(var(--chart-1))",
    },
    Medium: {
      label: "Medium", 
      color: "hsl(var(--chart-2))",
    },
    Hard: {
      label: "Hard",
      color: "hsl(var(--chart-3))",
    },
    Total: {
      label: "Total",
      color: "hsl(var(--chart-4))",
    },
  };

  const toggleDifficulty = (difficulty: keyof typeof showDifficulties) => {
    setShowDifficulties(prev => ({
      ...prev,
      [difficulty]: !prev[difficulty],
    }));
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {trend.direction === 'stable' ? 'Stable' : `${trend.percentage.toFixed(1)}%`}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Time Range Selector */}
        <div className="flex space-x-2">
          {(['week', 'month', 'quarter', 'year'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="text-xs"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>

        {/* Difficulty Toggles */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(showDifficulties).map(([difficulty, shown]) => (
            <Badge
              key={difficulty}
              variant={shown ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleDifficulty(difficulty as keyof typeof showDifficulties)}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Badge>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <LineChart
            data={chartData}
            config={chartConfig}
            className="h-full"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {Object.entries(showDifficulties)
            .filter(([_, shown]) => shown)
            .map(([difficulty]) => {
              const total = filteredData.reduce((sum, item) => 
                sum + (item[difficulty as keyof PerformanceData] as number), 0
              );
              return (
                <div key={difficulty} className="text-center space-y-1">
                  <p className="text-2xl font-bold">{total}</p>
                  <p className="text-sm text-muted-foreground">
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </p>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
