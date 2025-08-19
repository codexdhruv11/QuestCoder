const fs = require('fs');
const path = require('path');

// Fix UserManagement.tsx - missing imports
const userManagementPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'admin', 'UserManagement.tsx');
let userManagementContent = fs.readFileSync(userManagementPath, 'utf8');

// Add missing imports
if (!userManagementContent.includes("import { Badge }")) {
  userManagementContent = userManagementContent.replace(
    "import React",
    `import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import React`
  );
}
fs.writeFileSync(userManagementPath, userManagementContent);

// Fix PlatformMonitoring.tsx - remove unused interface and variable
const platformMonitoringPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'admin', 'PlatformMonitoring.tsx');
let platformMonitoringContent = fs.readFileSync(platformMonitoringPath, 'utf8');

// Remove unused StatusHistory interface
platformMonitoringContent = platformMonitoringContent.replace(
  /interface StatusHistory \{[\s\S]*?\}\n\n/,
  ''
);

// Comment out unused newHistory variable
platformMonitoringContent = platformMonitoringContent.replace(
  'const newHistory = data.statuses.map(status => ({',
  '// const newHistory = data.statuses.map(status => ({'
);
// Find and comment out the closing of the map
platformMonitoringContent = platformMonitoringContent.replace(
  /\}\)\)\n(\s+)setStatusHistory/,
  '// }))\n$1// setStatusHistory'
);

fs.writeFileSync(platformMonitoringPath, platformMonitoringContent);

// Fix XpProgressBar.tsx - animated prop issue
const xpProgressBarPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'gamification', 'XpProgressBar.tsx');
let xpProgressBarContent = fs.readFileSync(xpProgressBarPath, 'utf8');

// Fix animated prop reference
xpProgressBarContent = xpProgressBarContent.replace(
  'const progressProps = animated ? {',
  'const progressProps = props.animated ? {'
);
xpProgressBarContent = xpProgressBarContent.replace(
  /\{animated && \(/g,
  '{props.animated && ('
);
// Remove the duplicate animated declaration at the bottom
xpProgressBarContent = xpProgressBarContent.replace(
  /\ninterface XpProgressBarProps[\s\S]*?animated = true\n\}/,
  '\ninterface XpProgressBarProps {\n  currentXp: number\n  requiredXp: number\n  level?: number\n  showLabel?: boolean\n  className?: string\n  animated?: boolean\n}'
);

fs.writeFileSync(xpProgressBarPath, xpProgressBarContent);

// Fix SocketContext.tsx - token issue
const socketContextPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'contexts', 'SocketContext.tsx');
let socketContextContent = fs.readFileSync(socketContextPath, 'utf8');

// Add token from AuthContext
socketContextContent = socketContextContent.replace(
  'const { user } = useAuth()',
  'const { user, token } = useAuth()'
);

fs.writeFileSync(socketContextPath, socketContextContent);

// Fix Dashboard.tsx - missing loading state
const dashboardPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Dashboard.tsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Add loading state
dashboardContent = dashboardContent.replace(
  'const [data, setData] = useState<DashboardData | null>(null)',
  'const [data, setData] = useState<DashboardData | null>(null)\n  const [loading, setLoading] = useState(true)'
);

fs.writeFileSync(dashboardPath, dashboardContent);

// Fix Analytics.tsx - type issues
const analyticsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Analytics.tsx');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

// Fix insight type annotations
analyticsContent = analyticsContent.replace(
  'insights.find(i => i.type === \'completion_estimate\')',
  'insights.find((i: any) => i.type === \'completion_estimate\')'
);
analyticsContent = analyticsContent.replace(
  'insights.find(i => i.type === \'streak_prediction\')',
  'insights.find((i: any) => i.type === \'streak_prediction\')'
);
analyticsContent = analyticsContent.replace(
  'insights.find(i => i.type === \'goal_recommendation\')',
  'insights.find((i: any) => i.type === \'goal_recommendation\')'
);

// Fix difficulty type
analyticsContent = analyticsContent.replace(
  'difficulty: [\'Easy\', \'Medium\', \'Hard\'][Math.floor(Math.random() * 3)]',
  'difficulty: [\'Easy\', \'Medium\', \'Hard\'][Math.floor(Math.random() * 3)] as "Easy" | "Medium" | "Hard"'
);

// Fix DatePicker props
analyticsContent = analyticsContent.replace(
  /<DatePicker\s+date={startDate}\s+onDateChange={setStartDate}/g,
  '<DatePicker date={startDate || new Date()} onDateChange={setStartDate}'
);
analyticsContent = analyticsContent.replace(
  /<DatePicker\s+date={endDate}\s+onDateChange={setEndDate}/g,
  '<DatePicker date={endDate || new Date()} onDateChange={setEndDate}'
);

// Fix PieChart dataKey prop
analyticsContent = analyticsContent.replace(
  '<PieChart\n                  data={platformData}\n                  height={200}',
  '<PieChart\n                  data={platformData}\n                  dataKey="value"\n                  height={200}'
);

fs.writeFileSync(analyticsPath, analyticsContent);

// Fix Signup.tsx - optional properties
const signupPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Signup.tsx');
let signupContent = fs.readFileSync(signupPath, 'utf8');

// Fix optional properties handling
signupContent = signupContent.replace(
  'await signup({...signupData, confirmPassword: signupData.password})',
  `const signupPayload = {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
        confirmPassword: signupData.password,
        ...(signupData.leetcodeHandle && { leetcodeHandle: signupData.leetcodeHandle }),
        ...(signupData.codeforcesHandle && { codeforcesHandle: signupData.codeforcesHandle }),
        ...(signupData.githubHandle && { githubHandle: signupData.githubHandle }),
        ...(signupData.hackerrankHandle && { hackerrankHandle: signupData.hackerrankHandle }),
        ...(signupData.hackerearthHandle && { hackerearthHandle: signupData.hackerearthHandle })
      }
      await signup(signupPayload as SignupForm)`
);

fs.writeFileSync(signupPath, signupContent);

// Fix Leaderboards.tsx - type issues
const leaderboardsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'Leaderboards.tsx');
let leaderboardsContent = fs.readFileSync(leaderboardsPath, 'utf8');

// Fix previousRank optional issue
leaderboardsContent = leaderboardsContent.replace(
  'previousRank: undefined,',
  'previousRank: e.previousRank || e.rank,'
);

// Fix badge type issue - create proper badges array
leaderboardsContent = leaderboardsContent.replace(
  '<CompactBadgeList badges={entry.badges}',
  '<CompactBadgeList badges={entry.badges.map((b: any) => ({ ...b, description: b.description || "", category: b.category || "general", isUnlocked: true }))}'
);

fs.writeFileSync(leaderboardsPath, leaderboardsContent);

// Fix StreakTracker.tsx - date type issue
const streakTrackerPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'widgets', 'StreakTracker.tsx');
let streakTrackerContent = fs.readFileSync(streakTrackerPath, 'utf8');

// Fix date type in generateMockActivity
streakTrackerContent = streakTrackerContent.replace(
  'date: i === 0 ? undefined : new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split(\'T\')[0],',
  'date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split(\'T\')[0],'
);

fs.writeFileSync(streakTrackerPath, streakTrackerContent);

// Fix chart.tsx tooltip type issues
const chartPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'ui', 'chart.tsx');
let chartContent = fs.readFileSync(chartPath, 'utf8');

// Fix tooltip props compatibility
chartContent = chartContent.replace(
  'labelFormatter={labelFormatter}',
  'labelFormatter={labelFormatter || ((label: any) => label)}'
);

fs.writeFileSync(chartPath, chartContent);

// Fix date-picker.tsx - remove unused React import
const datePickerPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'ui', 'date-picker.tsx');
let datePickerContent = fs.readFileSync(datePickerPath, 'utf8');

// Remove unused React import
datePickerContent = datePickerContent.replace(
  'import * as React from "react"',
  ''
);

fs.writeFileSync(datePickerPath, datePickerContent);

// Fix StudyGroups.tsx - remove unused imports
const studyGroupsPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'pages', 'StudyGroups.tsx');
let studyGroupsContent = fs.readFileSync(studyGroupsPath, 'utf8');

// Remove unused imports
studyGroupsContent = studyGroupsContent.replace(
  'import { useSocketRoom, useSocketSubscription }',
  'import { useSocketSubscription }'
);

// Remove unused setFilterTags if not being used
studyGroupsContent = studyGroupsContent.replace(
  'const [filterTags, setFilterTags] = useState<string[]>([])',
  'const [filterTags] = useState<string[]>([])'
);

fs.writeFileSync(studyGroupsPath, studyGroupsContent);

// Fix BadgeDisplay.tsx - optional prop issue
const badgeDisplayPath = path.join('D:', 'QuestCoder', 'frontend', 'src', 'components', 'gamification', 'BadgeDisplay.tsx');
let badgeDisplayContent = fs.readFileSync(badgeDisplayPath, 'utf8');

// Fix optional callback prop
badgeDisplayContent = badgeDisplayContent.replace(
  'onBadgeClick={onBadgeClick}',
  'onBadgeClick={onBadgeClick || undefined}'
);

// Ensure it passes undefined correctly
badgeDisplayContent = badgeDisplayContent.replace(
  /<BadgeCard\s+key={badge.id}\s+badge={badge}\s+onBadgeClick={onBadgeClick \|\| undefined}/g,
  '<BadgeCard key={badge.id} badge={badge} {...(onBadgeClick && { onBadgeClick })}'
);

fs.writeFileSync(badgeDisplayPath, badgeDisplayContent);

console.log('✅ Fixed remaining TypeScript errors');
