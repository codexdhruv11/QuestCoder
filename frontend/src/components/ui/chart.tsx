import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

// Common chart colors
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted))",
  destructive: "hsl(var(--destructive))",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
  colors: [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#8dd1e1",
    "#d084d0",
    "#ffb347"
  ]
}

// Line Chart Component
interface LineChartProps {
  data: any[]
  lines: {
    dataKey: string
    stroke?: string
    name?: string
  }[]
  xAxisKey?: string
  className?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
}

export const CustomLineChart = ({
  data,
  lines,
  xAxisKey = "name",
  className,
  height = 300,
  showGrid = true,
  showLegend = true
}: LineChartProps) => {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          {showLegend && <Legend />}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke || CHART_COLORS.colors[index % CHART_COLORS.colors.length]}
              strokeWidth={2}
              dot={{ strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name={line.name || line.dataKey}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Bar Chart Component
interface BarChartProps {
  data: any[]
  bars: {
    dataKey: string
    fill?: string
    name?: string
  }[]
  xAxisKey?: string
  className?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
}

export const CustomBarChart = ({
  data,
  bars,
  xAxisKey = "name",
  className,
  height = 300,
  showGrid = true,
  showLegend = true
}: BarChartProps) => {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.fill || CHART_COLORS.colors[index % CHART_COLORS.colors.length]}
              name={bar.name || bar.dataKey}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Pie Chart Component
interface PieChartProps {
  data: any[]
  dataKey: string
  nameKey?: string
  className?: string
  height?: number
  showLegend?: boolean
  colors?: string[]
}

export const CustomPieChart = ({
  data,
  dataKey,
  nameKey = "name",
  className,
  height = 300,
  showLegend = true,
  colors = CHART_COLORS.colors
}: PieChartProps) => {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Radar Chart Component
interface RadarChartProps {
  data: any[]
  dataKey: string
  angleKey?: string
  className?: string
  height?: number
  fill?: string
  stroke?: string
}

export const CustomRadarChart = ({
  data,
  dataKey,
  angleKey = "subject",
  className,
  height = 300,
  fill = CHART_COLORS.primary,
  stroke = CHART_COLORS.primary
}: RadarChartProps) => {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis 
            dataKey={angleKey} 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <PolarRadiusAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
          />
          <Radar
            name={dataKey}
            dataKey={dataKey}
            stroke={stroke}
            fill={fill}
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Export aliases for backward compatibility
export { CustomLineChart as LineChart, CustomBarChart as BarChart, CustomPieChart as PieChart, CustomRadarChart as RadarChart }
