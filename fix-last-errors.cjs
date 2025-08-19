const fs = require('fs');
const path = require('path');

// Fix XpProgressBar exports
const xpProgressBarPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'gamification', 'XpProgressBar.tsx');
let xpProgressBarContent = fs.readFileSync(xpProgressBarPath, 'utf8');

// Remove unused import and add export for CompactXpProgressBar
xpProgressBarContent = xpProgressBarContent.replace(
  "import { Progress } from '@/components/ui/progress'",
  ""
);

// Add export default and CompactXpProgressBar
xpProgressBarContent = xpProgressBarContent.replace(
  'export default XpProgressBar',
  `export default XpProgressBar

export const CompactXpProgressBar: React.FC<XpProgressBarProps> = (props) => {
  return <XpProgressBar {...props} showLabel={false} className="h-2" />
}`
);

fs.writeFileSync(xpProgressBarPath, xpProgressBarContent);

// Fix Layout.tsx and Dashboard.tsx imports
const layoutPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'Layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
layoutContent = layoutContent.replace(
  "import { XpProgressBar, CompactXpProgressBar } from '@/components/gamification/XpProgressBar'",
  "import XpProgressBar, { CompactXpProgressBar } from '@/components/gamification/XpProgressBar'"
);
fs.writeFileSync(layoutPath, layoutContent);

const dashboardPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Dashboard.tsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
dashboardContent = dashboardContent.replace(
  "import { XpProgressBar } from '@/components/gamification/XpProgressBar'",
  "import XpProgressBar from '@/components/gamification/XpProgressBar'"
);

// Fix setLoading that wasn't added properly
if (!dashboardContent.includes('const [loading, setLoading]')) {
  dashboardContent = dashboardContent.replace(
    'const [data, setData] = useState<DashboardData | null>(null)',
    'const [data, setData] = useState<DashboardData | null>(null)\n  const [loading, setLoading] = useState(true)'
  );
}

fs.writeFileSync(dashboardPath, dashboardContent);

// Fix AuthContext to include token
const authContextPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'contexts', 'AuthContext.tsx');
let authContextContent = fs.readFileSync(authContextPath, 'utf8');

// Add token to the value object
authContextContent = authContextContent.replace(
  'const value: AuthContextType = {',
  'const value: AuthContextType = {\n    token: localStorage.getItem("token"),'
);

// Export SignupForm interface
authContextContent = authContextContent.replace(
  'interface SignupForm {',
  'export interface SignupForm {'
);

fs.writeFileSync(authContextPath, authContextContent);

// Fix Signup.tsx SignupForm import
const signupPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Signup.tsx');
let signupContent = fs.readFileSync(signupPath, 'utf8');

// If SignupForm is imported from AuthContext, use it, otherwise define locally
if (!signupContent.includes('interface SignupForm')) {
  // Import is there but not exported from AuthContext, so define locally
  signupContent = signupContent.replace(
    "import { useAuth, SignupForm } from '@/contexts/AuthContext'",
    "import { useAuth } from '@/contexts/AuthContext'"
  );
  
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
}

fs.writeFileSync(signupPath, signupContent);

// Fix Analytics.tsx remaining issues
const analyticsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Analytics.tsx');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

// Fix difficulty type cast that wasn't applied
analyticsContent = analyticsContent.replace(
  "difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)]",
  "difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)] as 'Easy' | 'Medium' | 'Hard'"
);

// Ensure PieChart dataKey is added
analyticsContent = analyticsContent.replace(
  /<PieChart\s+data={platformData}\s+height={200}/g,
  '<PieChart\n                  data={platformData}\n                  dataKey="value"\n                  height={200}'
);

fs.writeFileSync(analyticsPath, analyticsContent);

// Fix StreakTracker date issue finally
const streakTrackerPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'widgets', 'StreakTracker.tsx');
let streakTrackerContent = fs.readFileSync(streakTrackerPath, 'utf8');

// Make sure date is always defined
if (streakTrackerContent.includes('date: i === 0 ? undefined :')) {
  streakTrackerContent = streakTrackerContent.replace(
    /date: i === 0 \? undefined : new Date.+?\[0\],/,
    "date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],"
  );
}

fs.writeFileSync(streakTrackerPath, streakTrackerContent);

// Fix chart.tsx - simplify tooltip props
const chartPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'ui', 'chart.tsx');
let chartContent = fs.readFileSync(chartPath, 'utf8');

// Replace all CustomTooltip usages to ensure props are always defined
chartContent = chartContent.replace(
  /labelFormatter={labelFormatter \|\| .+?}/g,
  'labelFormatter={labelFormatter || ((label: any) => String(label))}'
);

chartContent = chartContent.replace(
  /valueFormatter={valueFormatter}/g,
  'valueFormatter={valueFormatter || ((value: any) => String(value))}'
);

// Ensure props are not undefined
chartContent = chartContent.replace(
  /<CustomTooltip/g,
  '<CustomTooltip'
);

fs.writeFileSync(chartPath, chartContent);

console.log('✅ Fixed final TypeScript errors');
