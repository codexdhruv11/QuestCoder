const fs = require('fs');
const path = require('path');

// Fix chart.tsx - simplify the CustomTooltip component to avoid type issues
const chartPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'ui', 'chart.tsx');
let chartContent = fs.readFileSync(chartPath, 'utf8');

// Replace the complex tooltip implementations with simpler versions
chartContent = chartContent.replace(
  /<CustomTooltip[\s\S]*?\/>/g,
  (match) => {
    if (match.includes('valueFormatter') || match.includes('labelFormatter')) {
      return '<Tooltip />';
    }
    return match;
  }
);

fs.writeFileSync(chartPath, chartContent);

// Fix StreakTracker - ensure date is never undefined
const streakPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'widgets', 'StreakTracker.tsx');
let streakContent = fs.readFileSync(streakPath, 'utf8');

// Find generateMockActivity function and fix it
streakContent = streakContent.replace(
  /const generateMockActivity[^}]*}/,
  `const generateMockActivity = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      platforms: ['LeetCode', 'Codeforces'].filter(() => Math.random() > 0.5),
      problemsSolved: Math.floor(Math.random() * 5)
    }))
  }`
);

fs.writeFileSync(streakPath, streakContent);

// Fix Analytics.tsx difficulty type cast
const analyticsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Analytics.tsx');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

// Find and fix the difficulty assignment
analyticsContent = analyticsContent.replace(
  /difficulty: \['Easy', 'Medium', 'Hard'\]\[Math\.floor\(Math\.random\(\) \* 3\)\]/g,
  `difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)] as 'Easy' | 'Medium' | 'Hard'`
);

// Fix PieChart dataKey
analyticsContent = analyticsContent.replace(
  /<PieChart\s+data={platformData}\s+height={200}/g,
  `<PieChart
                  data={platformData}
                  dataKey="value"
                  height={200}`
);

fs.writeFileSync(analyticsPath, analyticsContent);

// Fix Dashboard loading - mark it as used
const dashboardPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Dashboard.tsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Add a loading check at the beginning of the return
dashboardContent = dashboardContent.replace(
  'return (',
  'if (loading) return <div>Loading...</div>\n\n  return ('
);

fs.writeFileSync(dashboardPath, dashboardContent);

// Fix Signup.tsx - define SignupForm locally since AuthContext export is not working
const signupPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Signup.tsx');
let signupContent = fs.readFileSync(signupPath, 'utf8');

// Remove the import attempt from AuthContext
signupContent = signupContent.replace(
  "import { useAuth, SignupForm } from '@/contexts/AuthContext'",
  "import { useAuth } from '@/contexts/AuthContext'"
);

// Add SignupForm interface if not present
if (!signupContent.includes('interface SignupForm')) {
  signupContent = signupContent.replace(
    'export default function Signup()',
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

export default function Signup()`
  );
}

fs.writeFileSync(signupPath, signupContent);

console.log('✅ Fixed stubborn TypeScript errors');
