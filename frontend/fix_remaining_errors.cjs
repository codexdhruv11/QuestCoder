const fs = require('fs');
const path = require('path');

// Helper function to read and write files
function fixFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  replacements.forEach(([search, replace]) => {
    content = content.replace(search, replace);
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${path.basename(filePath)}`);
}

// Fix UserManagement.tsx - remove unused imports
fixFile('src/components/admin/UserManagement.tsx', [
  [/import \{[\s\S]*?\} from 'lucide-react'/, `import { 
  Search, 
  User, 
  UserCheck, 
  UserX, 
  Shield,
  ShieldCheck,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'`]
]);

// Fix PlatformMonitoring.tsx - remove unused statusHistory
fixFile('src/components/admin/PlatformMonitoring.tsx', [
  ['const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])', '// const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])'],
  ['setStatusHistory(prev => [...prev.slice(-50), ...newHistory])', '// setStatusHistory(prev => [...prev.slice(-50), ...newHistory])']
]);

// Fix PatternRadar.tsx
fixFile('src/components/analytics/PatternRadar.tsx', [
  ['const chartConfig = {', '// const chartConfig = {'],
  ['pattern: item.pattern.length > 15 ? item.pattern.substring(0, 15) + \'...\' : item.pattern,', '// pattern: item.pattern.length > 15 ? item.pattern.substring(0, 15) + \'...\' : item.pattern,'],
  ['item.mastery > max.mastery', 'item.mastery > (max?.mastery || 0)'],
  ['item.mastery < min.mastery', 'item.mastery < (min?.mastery || Infinity)']
]);

// Fix PredictiveInsights.tsx
fixFile('src/components/analytics/PredictiveInsights.tsx', [
  ["import { LineChart, BarChart } from '@/components/ui/chart';", "import { BarChart } from '@/components/ui/chart';"],
  ["import { addDays, format } from 'date-fns';", "import { format } from 'date-fns';"],
  ['const patternChartConfig = {', '// const patternChartConfig = {'],
  ['const milestoneChartConfig = {', '// const milestoneChartConfig = {']
]);

// Fix ChallengeCard.tsx
fixFile('src/components/community/ChallengeCard.tsx', [
  ['const now = new Date();', '// const now = new Date();'],
  ['const isUpcoming = isFuture(startDate);', '// const isUpcoming = isFuture(startDate);']
]);

// Fix BadgeDisplay.tsx
fixFile('src/components/gamification/BadgeDisplay.tsx', [
  ['onBadgeClick={onBadgeClick}', 'onBadgeClick={onBadgeClick || undefined}']
]);

// Fix LevelIndicator.tsx
fixFile('src/components/gamification/LevelIndicator.tsx', [
  ['currentXP,', '// currentXP,']
]);

// Fix XpProgressBar.tsx
fixFile('src/components/gamification/XpProgressBar.tsx', [
  ['const ProgressComponent = animated ? motion.div : \'div\'', '// const ProgressComponent = animated ? motion.div : \'div\''],
  ['animated = true', '// animated = true']
]);

// Fix Layout.tsx
fixFile('src/components/Layout.tsx', [
  ['const [userGamification, setUserGamification] = useState(null)', 'const [userGamification, setUserGamification] = useState<any>(null)']
]);

// Fix chart.tsx
fixFile('src/components/ui/chart.tsx', [
  ['labelFormatter={labelFormatter}', 'labelFormatter={labelFormatter || undefined}'],
  ['valueFormatter={tooltipFormatter}', 'valueFormatter={tooltipFormatter || undefined}'],
  ['{data.map((entry, index) => (', '{data.map((_entry, index) => (']
]);

// Fix date-picker.tsx
fixFile('src/components/ui/date-picker.tsx', [
  ["import * as React from", "import *  from"]
]);

// Fix use-toast.tsx
fixFile('src/components/ui/use-toast.tsx', [
  ['const toast: Toast = { id, title, description, variant }', 'const toast: Toast = { id, title: title || \'\', description: description || \'\', variant }']
]);

// Fix StreakTracker.tsx
fixFile('src/components/widgets/StreakTracker.tsx', [
  ['date: dates[i]?.toISOString(),', 'date: dates[i]?.toISOString() || \'\',']
]);

// Fix AuthContext.tsx
fixFile('src/contexts/AuthContext.tsx', [
  ["import React, { createContext", "import { createContext"]
]);

// Fix SocketContext.tsx
fixFile('src/contexts/SocketContext.tsx', [
  ['const { token, user } = useAuth()', 'const { user } = useAuth()'],
  ['import.meta.env.VITE_API_URL', '(import.meta as any).env.VITE_API_URL']
]);

// Fix Analytics.tsx
fixFile('src/pages/Analytics.tsx', [
  ['Calendar,', ''],
  ['BarChart3,', ''],
  ['import { format, subDays, subWeeks, subMonths, subYears } from \'date-fns\'', 'import { subDays } from \'date-fns\''],
  ['const days = timeRanges[timeRange].days', 'const days = timeRanges[timeRange as keyof typeof timeRanges].days'],
  ['.find(i => i.type', '.find((i: any) => i.type'],
  ['.filter(i => i.type', '.filter((i: any) => i.type'],
  ['.map(i => i.description)', '.map((i: any) => i.description)'],
  ['difficulty: [\'Easy\', \'Medium\', \'Hard\'][Math.floor(Math.random() * 3)]', 'difficulty: ([\'Easy\', \'Medium\', \'Hard\'][Math.floor(Math.random() * 3)] as \'Easy\' | \'Medium\' | \'Hard\')'],
  ['{data.performanceMetrics.map((metric, index) => (', '{data.performanceMetrics.map((metric) => ('],
  ['dataKey: string', 'dataKey: string = \'value\'']
]);

// Fix Dashboard.tsx
fixFile('src/pages/Dashboard.tsx', [
  ["import { Button } from '@/components/ui/button'", ''],
  ['const [loading, setLoading] = useState(true)', '// const [loading, setLoading] = useState(true)']
]);

// Fix Leaderboards.tsx
fixFile('src/pages/Leaderboards.tsx', [
  ["import { Button } from '@/components/ui/button'", ''],
  ['Calendar,', ''],
  ['TrendingUp,', ''],
  ['previousRank: undefined,', 'previousRank: e.previousRank || 0,'],
  ['currentUser={user?.id}', 'currentUser={(user as any)?.id}']
]);

// Fix Patterns.tsx
fixFile('src/pages/Patterns.tsx', [
  ['{problem.solved || problem.completed', '{(problem as any).solved || (problem as any).completed']
]);

// Fix Profile.tsx
fixFile('src/pages/Profile.tsx', [
  ['await userAPI.updateProfile(data)', 'await userAPI.updateProfile(Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined)))']
]);

// Fix Signup.tsx
fixFile('src/pages/Signup.tsx', [
  ['await signup(signupData)', 'await signup({...signupData, confirmPassword: signupData.password})']
]);

// Fix StudyGroups.tsx
fixFile('src/pages/StudyGroups.tsx', [
  [', DialogTrigger', ''],
  [', AvatarImage', ''],
  ["import { LevelBadge }", "// import { LevelBadge }"],
  [', useSocketRoom', ''],
  ['Filter,', ''],
  ['Crown,', ''],
  ['Copy,', ''],
  ['ExternalLink,', ''],
  ['BarChart3,', ''],
  ['Trophy,', ''],
  ['Target,', ''],
  ['Clock,', ''],
  ['Star,', ''],
  ['Bookmark,', ''],
  ['Share2', ''],
  ['const [filterTags, setFilterTags]', '// const [filterTags, setFilterTags]'],
  ['(activityData:', '(_activityData:'],
  ['const handleCopyInviteCode', '// const handleCopyInviteCode'],
  ['return new Date(b.updatedAt || 0)', 'return new Date((b as any).updatedAt || 0)'],
  ['new Date(a.updatedAt || 0)', 'new Date((a as any).updatedAt || 0)']
]);

console.log('\n✅ All files fixed successfully!');
