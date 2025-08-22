import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateRelative(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return formatDate(d)
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Platform-specific color classes
export function getPlatformColor(platform: string): string {
  const platformColors: Record<string, string> = {
    'leetcode': 'bg-leetcode-50 text-leetcode-600 border-leetcode-500',
    'codeforces': 'bg-codeforces-50 text-codeforces-600 border-codeforces-500',
    'hackerrank': 'bg-hackerrank-50 text-hackerrank-600 border-hackerrank-500',
    'geeksforgeeks': 'bg-geeksforgeeks-50 text-geeksforgeeks-600 border-geeksforgeeks-500',
    'atcoder': 'bg-blue-50 text-blue-600 border-blue-500',
    'codechef': 'bg-amber-50 text-amber-600 border-amber-500',
    'topcoder': 'bg-red-50 text-red-600 border-red-500',
  }
  return platformColors[platform.toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-500'
}

// Enhanced difficulty colors with proper contrast
export function getDifficultyColor(difficulty: string): string {
  const difficultyColors: Record<string, string> = {
    'easy': 'bg-difficulty-easy-50 text-difficulty-easy-600 border-difficulty-easy-500',
    'medium': 'bg-difficulty-medium-50 text-difficulty-medium-600 border-difficulty-medium-500',
    'hard': 'bg-difficulty-hard-50 text-difficulty-hard-600 border-difficulty-hard-500',
  }
  return difficultyColors[difficulty.toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-500'
}

// Format problem counts with proper pluralization
export function formatProblemCount(solved: number, total: number): string {
  const problemText = total === 1 ? 'problem' : 'problems'
  return `${solved}/${total} ${problemText}`
}

// Calculate completion percentage with proper rounding
export function calculateCompletionPercentage(solved: number, total: number): number {
  if (total === 0) return 0
  return Math.round((solved / total) * 100)
}

// Convert hierarchical pattern data to flat array for virtualization
export function flattenPatternsForVirtualization(patterns: any[]): import('../types').FlatProblemItem[] {
  const flatItems: import('../types').FlatProblemItem[] = []
  
  patterns.forEach(pattern => {
    pattern.subPatterns?.forEach((subPattern: any) => {
      // Add header item
      flatItems.push({
        type: 'header',
        key: `header-${pattern.id}-${subPattern.name}`,
        patternId: pattern.id,
        subPatternName: subPattern.name,
        solvedCount: subPattern.problems.filter((p: any) => p.solved).length,
        totalCount: subPattern.problems.length
      })
      
      // Add problem items
      subPattern.problems.forEach((problem: any) => {
        flatItems.push({
          type: 'problem',
          key: `problem-${pattern.id}-${problem.id}`,
          patternId: pattern.id,
          problem: problem
        })
      })
    })
  })
  
  return flatItems
}

// Measure component render performance
export function measureRenderPerformance(componentName: string, callback: () => void): number {
  const startMark = `${componentName}-start`
  const endMark = `${componentName}-end`
  
  performance.mark(startMark)
  callback()
  performance.mark(endMark)
  
  const measure = performance.measure(`${componentName}-render`, startMark, endMark)
  performance.clearMarks(startMark)
  performance.clearMarks(endMark)
  
  return measure.duration
}

// Debounce function for rapid problem toggles
export function debounceToggle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

// Generate consistent keys for optimistic updates
export function getOptimisticKey(patternId: string, problemId: string): string {
  return `${patternId}-${problemId}`
}

// Common framer-motion animation variants
export const animationVariants = {
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideIn: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  },
  spring: {
    type: "spring",
    stiffness: 300,
    damping: 30
  }
}

// Determine when virtualization should be enabled
export function shouldUseVirtualization(problemCount: number): boolean {
  // Enable virtualization for more than 200 problems or on lower-end devices
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
  return problemCount > 200 || Boolean(isLowEndDevice && problemCount > 100)
}

// Flatten patterns to individual problems for problem-centric pagination
export function flattenPatternsToProblems(patterns: any[]): import('../types').Problem[] {
  const flatProblems: import('../types').Problem[] = []
  
  patterns.forEach(pattern => {
    // Generate stable patternId: use pattern.id if available, otherwise create slug from name
    const patternId = pattern.id || pattern.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown-pattern'
    
    pattern.subPatterns?.forEach((subPattern: any) => {
      subPattern.problems?.forEach((problem: any) => {
        flatProblems.push({
          ...problem,
          patternId: patternId, // Use stable patternId with fallback
          patternName: pattern.name,
          subPatternName: subPattern.name,
          category: pattern.category || 'general'
        })
      })
    })
  })
  
  return flatProblems
}
