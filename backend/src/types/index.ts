// Shared type definitions for the backend

// User DTOs
export interface UserDTO {
  _id: string
  username: string
  email: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: UserDTO
  token?: string
}

// Pattern and Problem DTOs
export interface ProblemDTO {
  id: string
  pattern: string
  subPattern: string
  problemName: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  platform: 'LeetCode' | 'Codeforces' | 'HackerRank' | 'GeeksforGeeks' | 'Other'
  problemUrl?: string
  videoSolutionUrl?: string
  notes?: string
  solved?: boolean
}

export interface SubPatternGroup {
  name: string
  problems: ProblemDTO[]
  totalProblems: number
  solvedProblems?: number
}

export interface PatternGroup {
  _id?: string
  id?: string
  slug?: string
  name: string
  category?: string
  description?: string
  keyPoints?: string[]
  subPatterns: SubPatternGroup[]
  userProgress?: UserProgressInfo
}

export interface UserProgressInfo {
  solvedProblems: number
  totalProblems: number
  completionRate: number
  solvedProblemIds: string[]
}

// Progress DTOs
export interface PatternProgressDTO {
  patternName: string
  totalProblems: number
  solvedProblems: number
  solvedProblemIds?: string[]
}

export interface UserProgressDTO {
  userId: string
  patternProgress: PatternProgressDTO[]
  currentStreak: number
  longestStreak: number
  lastSolvedAt?: Date
  activityLog: ActivityLogEntry[]
}

export interface ActivityLogEntry {
  type: 'problem_solved' | 'problem_unsolved' | 'pattern_completed'
  problemId?: string
  patternName?: string
  date: Date
}

export interface ProgressSummary {
  patternId?: string
  patternName: string
  category?: string
  totalProblems: number
  solvedProblems: number
  completionRate: number
  isCompleted: boolean
}

export interface ProgressStats {
  totalPatterns: number
  completedPatterns: number
  totalProblems: number
  solvedProblems: number
  overallCompletionRate: number
}

// Widget DTOs
export interface LeetCodeWidgetDTO {
  handle: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  recentSubmissions: SubmissionDTO[]
}

export interface CodeforcesWidgetDTO {
  handle: string
  rating: number
  maxRating: number
  rank: string
  maxRank: string
  contestsParticipated: number
  problemsSolved: number
  recentContests: ContestDTO[]
}

export interface GitHubWidgetDTO {
  handle: string
  publicRepos: number
  followers: number
  following: number
  contributions: number
  contributionStreak: number
  languages: Record<string, number>
  recentCommits: number
}

export interface HackerRankWidgetDTO {
  handle: string
  rank: number
  percentile: number
  badges: string[]
  certificates: string[]
  solvedChallenges: number
  skills: Record<string, number>
}

export interface HackerEarthWidgetDTO {
  handle: string
  rating: number
  problems_solved: number
  partially_solved_problems: number
  followers: number
  following: number
  institute?: string
}

export interface SubmissionDTO {
  title: string
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error'
  timestamp: string
  language: string
}

export interface ContestDTO {
  id: string
  name: string
  rank: number
  ratingChange: number
  date: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

// Request Types
export interface PatternsQueryParams {
  category?: string
  difficulty?: string
  search?: string
  limit?: number
  offset?: number
}

export interface UpdateProfileRequest {
  username?: string
  email?: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
}

export interface ToggleProblemRequest {
  patternId: string
  problemId: string
}

// Service Response Types
export interface PatternServiceResponse {
  patterns: PatternGroup[]
  total: number
}

export interface UserStatsResponse {
  totalPatterns: number
  completedPatterns: number
  totalProblems: number
  solvedProblems: number
  progressByCategory: Record<string, {
    total: number
    solved: number
    completion: number
  }>
}

export interface InsightDTO {
  type: 'strength' | 'weakness' | 'recommendation'
  category: string
  message: string
  progress: number
}
