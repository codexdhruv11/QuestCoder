// User related types
export interface User {
  _id: string
  username: string
  email: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  token: string
  message: string
}

// Pattern and Problem types based on CSV structure
export interface Problem {
  id: string
  pattern: string
  subPattern: string
  problemName: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  platform: 'LeetCode' | 'Codeforces' | 'HackerRank' | 'GeeksforGeeks' | 'Other'
  problemUrl?: string
  videoSolutionUrl?: string
  notes?: string
}

export interface Pattern {
  id?: string
  name: string
  subPatterns: SubPattern[]
  totalProblems: number
  solvedProblems: number
  category: string
}

export interface SubPattern {
  name: string
  problems: Problem[]
  totalProblems: number
  solvedProblems: number
}

// User progress tracking
export interface UserProgress {
  userId: string
  problemId: string
  platform: string
  solvedAt: string
  difficulty: string
  patternCategory: string
}

export interface ProgressStats {
  totalProblems: number
  solvedProblems: number
  easyProblems: number
  mediumProblems: number
  hardProblems: number
  patternProgress: Record<string, number>
  recentActivity: UserProgress[]
}

// Platform widget types
export interface LeetCodeStats {
  handle: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  reputation: number
  recentSubmissions: Submission[]
}

export interface CodeforcesStats {
  handle: string
  rating: number
  maxRating: number
  rank: string
  maxRank: string
  contestsParticipated: number
  problemsSolved: number
  recentContests: Contest[]
}

export interface GitHubStats {
  handle: string
  publicRepos: number
  followers: number
  following: number
  contributions: number
  streak: number
  languages: Record<string, number>
  recentActivity: GitHubActivity[]
}

export interface Submission {
  id: string
  title: string
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Memory Limit Exceeded'
  timestamp: string
  language: string
}

export interface Contest {
  id: string
  name: string
  rank: number
  ratingChange: number
  date: string
}

export interface GitHubActivity {
  type: 'push' | 'pull_request' | 'issues' | 'fork' | 'star'
  repo: string
  date: string
  description: string
}

// Streak tracking
export interface StreakData {
  userId: string
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  dailyActivities: DailyActivity[]
}

export interface DailyActivity {
  date: string
  platforms: string[]
  problemsSolved: number
  timeSpent?: number
}

// API response wrappers
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
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

export type SignupPayload = Omit<SignupForm, 'confirmPassword'>

export interface ProfileForm {
  username: string
  email: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
}

// Navigation and routing
export interface NavItem {
  title: string
  href: string
  icon: string
  description?: string
}

// Widget configuration
export interface WidgetConfig {
  type: 'leetcode' | 'codeforces' | 'github' | 'hackerearth' | 'streak'
  title: string
  enabled: boolean
  refreshInterval: number
}

// Gamification types
export interface UserGamification {
  _id: string
  userId: string
  totalXp: number
  currentLevel: number
  unlockedBadges: string[]
  lastXpGainedAt: string
  levelHistory: LevelHistory[]
}

export interface Badge {
  _id: string
  name: string
  description: string
  icon: string
  category: string
  criteria: any
  xpReward: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  isActive: boolean
}

export interface LevelHistory {
  level: number
  achievedAt: string
  totalXp: number
}

// Community types
export interface StudyGroup {
  _id: string
  name: string
  description: string
  ownerId: string
  members: GroupMember[]
  isPrivate: boolean
  inviteCode: string
  targetPatterns: string[]
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface GroupMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface Challenge {
  _id: string
  title: string
  description: string
  creatorId: string
  targetPatterns: string[]
  difficultyFilter?: 'Easy' | 'Medium' | 'Hard'
  startDate: string
  endDate: string
  participants: ChallengeParticipant[]
  rewards: ChallengeReward[]
  isPublic: boolean
  status: 'upcoming' | 'active' | 'completed'
  maxParticipants?: number
  createdAt: string
  updatedAt: string
}

export interface ChallengeParticipant {
  userId: string
  progress: {
    problemsSolved: number
    patternsCompleted: string[]
    lastActivity?: string
  }
  joinedAt: string
  completedAt?: string
}

export interface ChallengeReward {
  type: 'xp' | 'badge' | 'title'
  value: string | number
  position?: 'first' | 'top_3' | 'top_10' | 'all'
}

// Notification types
export interface Notification {
  _id: string
  userId: string
  type: 'badge_unlocked' | 'level_up' | 'challenge_invite' | 'group_invite'
  title: string
  message: string
  data: any
  isRead: boolean
  createdAt: string
  expiresAt?: string
}

// Analytics types
export interface AnalyticsData {
  performanceCharts: ChartData[]
  patternAnalytics: PatternAnalytics[]
  predictiveInsights: PredictiveInsight[]
  performanceMetrics: PerformanceMetrics
}

export interface ChartData {
  name: string
  data: any[]
  type: 'line' | 'bar' | 'pie' | 'radar'
}

export interface PatternAnalytics {
  pattern: string
  mastery: number
  totalProblems: number
  solvedProblems: number
  averageTime: number
  difficulty: string
}

export interface PredictiveInsight {
  type: 'completion' | 'improvement' | 'recommendation'
  title: string
  description: string
  confidence: number
  estimatedDate?: string
  suggestedActions?: string[]
}

export interface PerformanceMetrics {
  solvingVelocity: number
  accuracyRate: number
  improvementTrend: number
  consistencyScore: number
  streakData: StreakMetrics
}

export interface StreakMetrics {
  current: number
  longest: number
  weeklyAverage: number
  monthlyPattern: number[]
}

// Leaderboard types
export interface LeaderboardEntry {
  userId: string
  username: string
  rank: number
  totalXp: number
  level: number
  problemsSolved: number
  currentStreak: number
  badges: number
}

export interface Leaderboard {
  type: 'global' | 'group' | 'weekly' | 'monthly'
  entries: LeaderboardEntry[]
  userRank?: number
  totalParticipants: number
}

// Socket.IO event types
export interface SocketEvent {
  event: string
  data: any
}

export interface NotificationData {
  type: string
  title: string
  message: string
  data?: any
}

// Theme and UI
export type Theme = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: Theme
  notifications: boolean
  autoRefreshWidgets: boolean
  widgetConfigs: WidgetConfig[]
}
