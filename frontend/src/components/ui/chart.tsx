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
  ResponsiveContainer,
  TooltipProps
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

// Custom Tooltip Component
const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  className,
  labelFormatter,
  valueFormatter
}: TooltipProps<any, any> & {
  className?: string
  labelFormatter?: (label: any) => string
  valueFormatter?: (value: any, name: string) => string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "rounded-lg border bg-background p-3 shadow-md",
        className
      )}>
        {label && (
          <p className="font-medium text-foreground">
            {labelFormatter ? labelFormatter(label) : label}
          </p>
        )}
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
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
  tooltipFormatter?: (value: any, name: string) => string
  labelFormatter?: (label: any) => string
}

export const CustomLineChart = ({
  data,
  lines,
  xAxisKey = "name",
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  tooltipFormatter,
  labelFormatter
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
          <Tooltip 
            content={(props) => (
              <CustomTooltip 
                {...props} 
                valueFormatter={tooltipFormatter}
                labelFormatter={labelFormatter}
              />
            )}
          />
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
  tooltipFormatter?: (value: any, name: string) => string
  labelFormatter?: (label: any) => string
}

export const CustomBarChart = ({
  data,
  bars,
  xAxisKey = "name",
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  tooltipFormatter,
  labelFormatter
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
          <Tooltip 
            content={(props) => (
              <CustomTooltip 
                {...props} 
                valueFormatter={tooltipFormatter}
                labelFormatter={labelFormatter}
              />
            )}
          />
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
  tooltipFormatter?: (value: any, name: string) => string
}

export const CustomPieChart = ({
  data,
  dataKey,
  nameKey = "name",
  className,
  height = 300,
  showLegend = true,
  colors = CHART_COLORS.colors,
  tooltipFormatter
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
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            content={(props) => (
              <CustomTooltip 
                {...props} 
                valueFormatter={tooltipFormatter}
              />
            )}
          />
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
  tooltipFormatter?: (value: any, name: string) => string
}

export const CustomRadarChart = ({
  data,
  dataKey,
  angleKey = "subject",
  className,
  height = 300,
  fill = CHART_COLORS.primary,
  stroke = CHART_COLORS.primary,
  tooltipFormatter
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
          <Tooltip 
            content={(props) => (
              <CustomTooltip 
                {...props} 
                valueFormatter={tooltipFormatter}
              />
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
