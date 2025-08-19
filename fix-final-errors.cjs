const fs = require('fs');
const path = require('path');

// Fix XpProgressBar.tsx - props not defined correctly
const xpProgressBarPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'gamification', 'XpProgressBar.tsx');
let xpProgressBarContent = fs.readFileSync(xpProgressBarPath, 'utf8');

// Replace the whole component with correct prop usage
xpProgressBarContent = `import React from 'react'
import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface XpProgressBarProps {
  currentXp: number
  requiredXp: number
  level?: number
  showLabel?: boolean
  className?: string
  animated?: boolean
}

const XpProgressBar: React.FC<XpProgressBarProps> = ({ 
  currentXp, 
  requiredXp, 
  level = 1,
  showLabel = true,
  className = '',
  animated = true
}) => {
  const percentage = Math.min((currentXp / requiredXp) * 100, 100)
  
  const progressProps = animated ? {
    initial: { width: '0%' },
    animate: { width: \`\${percentage}%\` },
    transition: { duration: 1, ease: 'easeOut' }
  } : {}

  return (
    <div className={\`space-y-2 \${className}\`}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          {animated && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-muted-foreground"
            >
              Level {level}
            </motion.span>
          )}
          {!animated && (
            <span className="text-muted-foreground">Level {level}</span>
          )}
          
          <span className="font-medium">
            {currentXp} / {requiredXp} XP
          </span>
        </div>
      )}
      
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        {animated && (
          <motion.div
            {...progressProps}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        )}
        {!animated && (
          <div 
            style={{ width: \`\${percentage}%\` }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        )}
      </div>
      
      {animated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-center text-muted-foreground"
        >
          {percentage.toFixed(0)}% to next level
        </motion.div>
      )}
      {!animated && (
        <div className="text-xs text-center text-muted-foreground">
          {percentage.toFixed(0)}% to next level
        </div>
      )}
    </div>
  )
}

export default XpProgressBar`;
fs.writeFileSync(xpProgressBarPath, xpProgressBarContent);

// Fix SocketContext to include token in AuthContext type
const authContextPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'contexts', 'AuthContext.tsx');
let authContextContent = fs.readFileSync(authContextPath, 'utf8');

// Add token to AuthContextType if not present
if (!authContextContent.includes('token: string | null')) {
  authContextContent = authContextContent.replace(
    'interface AuthContextType {',
    'interface AuthContextType {\n  token: string | null'
  );
  // Also add token to the context value
  authContextContent = authContextContent.replace(
    'const value = {',
    'const value = {\n    token: localStorage.getItem(\'token\'),'
  );
}
fs.writeFileSync(authContextPath, authContextContent);

// Fix Dashboard.tsx - loading state already added, just needs to be used correctly
const dashboardPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Dashboard.tsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Check if loading state exists, if not add it
if (!dashboardContent.includes('const [loading, setLoading]')) {
  dashboardContent = dashboardContent.replace(
    'const [data, setData] = useState<DashboardData | null>(null)',
    'const [data, setData] = useState<DashboardData | null>(null)\n  const [loading, setLoading] = useState(true)'
  );
}
fs.writeFileSync(dashboardPath, dashboardContent);

// Fix Signup.tsx - SignupForm type import
const signupPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Signup.tsx');
let signupContent = fs.readFileSync(signupPath, 'utf8');

// Import SignupForm from auth context
if (!signupContent.includes('import { SignupForm }')) {
  signupContent = signupContent.replace(
    'import { useAuth }',
    'import { useAuth, SignupForm }'
  );
}
// If SignupForm still not defined in AuthContext, define it locally
if (!signupContent.includes('interface SignupForm')) {
  signupContent = signupContent.replace(
    'const Signup: React.FC = () => {',
    `interface SignupForm {
  username: string
  email: string
  password: string
  confirmPassword: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
}

const Signup: React.FC = () => {`
  );
}
fs.writeFileSync(signupPath, signupContent);

// Fix Analytics.tsx difficulty type
const analyticsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Analytics.tsx');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

// Already fixed difficulty type in previous script but ensure it's correct
if (!analyticsContent.includes('as "Easy" | "Medium" | "Hard"')) {
  analyticsContent = analyticsContent.replace(
    "difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)]",
    "difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)] as 'Easy' | 'Medium' | 'Hard'"
  );
}

// Fix PieChart dataKey
if (!analyticsContent.includes('dataKey="value"')) {
  analyticsContent = analyticsContent.replace(
    '<PieChart\n                  data={platformData}\n                  height={200}',
    '<PieChart\n                  data={platformData}\n                  dataKey="value"\n                  height={200}'
  );
}

fs.writeFileSync(analyticsPath, analyticsContent);

// Fix Leaderboards.tsx - previousRank issue
const leaderboardsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Leaderboards.tsx');
let leaderboardsContent = fs.readFileSync(leaderboardsPath, 'utf8');

// Fix all occurrences of previousRank: undefined
leaderboardsContent = leaderboardsContent.replaceAll(
  'previousRank: undefined,',
  'previousRank: e.rank,'
);

fs.writeFileSync(leaderboardsPath, leaderboardsContent);

// Fix StreakTracker - date undefined issue
const streakTrackerPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'widgets', 'StreakTracker.tsx');
let streakTrackerContent = fs.readFileSync(streakTrackerPath, 'utf8');

// Fix date generation to never be undefined
streakTrackerContent = streakTrackerContent.replace(
  /date: .+toISOString\(\)\.split\('T'\)\[0\],/,
  "date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],"
);

fs.writeFileSync(streakTrackerPath, streakTrackerContent);

// Comment out unused chartConfig variables
const patternRadarPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'analytics', 'PatternRadar.tsx');
let patternRadarContent = fs.readFileSync(patternRadarPath, 'utf8');
patternRadarContent = patternRadarContent.replace(
  'const chartConfig = {',
  '// const chartConfig = {'
);
patternRadarContent = patternRadarContent.replace(
  /  }\n  \n  return \(/,
  '  // }\n  \n  return ('
);
fs.writeFileSync(patternRadarPath, patternRadarContent);

const predictiveInsightsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'analytics', 'PredictiveInsights.tsx');
let predictiveInsightsContent = fs.readFileSync(predictiveInsightsPath, 'utf8');
predictiveInsightsContent = predictiveInsightsContent.replace(
  'const patternChartConfig = {',
  '// const patternChartConfig = {'
);
predictiveInsightsContent = predictiveInsightsContent.replace(
  'const milestoneChartConfig = {',
  '// const milestoneChartConfig = {'
);
// Find and comment out the closing braces
predictiveInsightsContent = predictiveInsightsContent.replace(
  /    }\n  }\n\n  const milestoneChart/,
  '  //   }\n  // }\n\n  // const milestoneChart'
);
predictiveInsightsContent = predictiveInsightsContent.replace(
  /    }\n  }\n\n  return \(/,
  '  //   }\n  // }\n\n  return ('
);
fs.writeFileSync(predictiveInsightsPath, predictiveInsightsContent);

// Fix chart.tsx tooltip formatter issues
const chartPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'ui', 'chart.tsx');
let chartContent = fs.readFileSync(chartPath, 'utf8');

// Ensure labelFormatter and valueFormatter are always defined
chartContent = chartContent.replace(
  'labelFormatter={labelFormatter || ((label: any) => label)}',
  'labelFormatter={labelFormatter || ((label: any) => String(label))}'
);
chartContent = chartContent.replace(
  'valueFormatter={valueFormatter}',
  'valueFormatter={valueFormatter || ((value: any) => String(value))}'
);

fs.writeFileSync(chartPath, chartContent);

console.log('✅ Fixed final TypeScript errors');
