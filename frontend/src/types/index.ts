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

// Theme and UI
export type Theme = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: Theme
  notifications: boolean
  autoRefreshWidgets: boolean
  widgetConfigs: WidgetConfig[]
}
