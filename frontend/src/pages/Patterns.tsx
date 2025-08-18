import { useState, useEffect } from 'react'
import { patternsAPI } from '@/lib/api'
import { Pattern } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, CheckCircle, Circle, ExternalLink, Play, Filter } from 'lucide-react'

export default function Patterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchPatterns()
  }, [])

  const fetchPatterns = async () => {
    try {
      setIsLoading(true)
      // Fetch with higher limit to get all patterns
      const response = await patternsAPI.getPatterns({ limit: 1000 })
      
      // Handle response envelope if present
      const patternsData = response.patterns || response.data || response
      
      // Transform backend patterns to frontend Pattern type if needed
      const transformedPatterns = transformPatterns(patternsData)
      setPatterns(transformedPatterns)
    } catch (error) {
      console.error('Failed to fetch patterns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleProblem = async (patternId: string, problemId: string) => {
    try {
      await patternsAPI.toggleProblem(patternId, problemId)
      // Refresh patterns to update solved status
      await fetchPatterns()
    } catch (error) {
      console.error('Failed to toggle problem status:', error)
    }
  }

  // Transform backend pattern data to match frontend Pattern type
  const transformPatterns = (backendPatterns: any[]): Pattern[] => {
    if (!Array.isArray(backendPatterns)) return []
    
    return backendPatterns.map(pattern => {
      // Count total and solved problems from nested subPatterns
      let totalProblems = 0
      let solvedCount = 0
      
      if (pattern.subPatterns && Array.isArray(pattern.subPatterns)) {
        pattern.subPatterns.forEach((subPattern: any) => {
          if (subPattern.problems && Array.isArray(subPattern.problems)) {
            totalProblems += subPattern.problems.length
            solvedCount += subPattern.problems.filter((p: any) => p.solved === true).length
          }
        })
      }
      
      // Use userProgress if available for more accurate counts
      if (pattern.userProgress) {
        solvedCount = pattern.userProgress.solvedProblems || solvedCount
        totalProblems = pattern.userProgress.totalProblems || totalProblems
      }
      
      // Compute solved counts for each sub-pattern
      const subPatternsWithCounts = (pattern.subPatterns || []).map((sp: any) => {
        const problems = sp.problems || []
        const solvedCount = problems.filter((p: any) => p.solved === true || p.completed === true).length
        return {
          ...sp,
          solvedProblems: solvedCount,
          totalProblems: problems.length
        }
      })
      
      return {
        id: pattern.id || pattern._id || pattern.slug || pattern.name,
        name: pattern.name,
        category: pattern.category || 'General',
        totalProblems: totalProblems,
        solvedProblems: solvedCount,
        userProgress: pattern.userProgress,
        subPatterns: subPatternsWithCounts
      }
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const categories = ['all', ...new Set(patterns.map(p => p.category))]
  const difficulties = ['all', 'easy', 'medium', 'hard']

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patterns</h1>
            <p className="text-muted-foreground">Loading pattern data...</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const totalProblems = patterns.reduce((sum, pattern) => sum + pattern.totalProblems, 0)
  const totalSolved = patterns.reduce((sum, pattern) => sum + pattern.solvedProblems, 0)
  const completionRate = totalProblems > 0 ? (totalSolved / totalProblems) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patterns</h1>
          <p className="text-muted-foreground">
            Track your progress through algorithmic problem patterns
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            Your completion status across all pattern categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {totalSolved} of {totalProblems} problems completed
              </span>
              <span className="text-sm text-muted-foreground">
                {completionRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={completionRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 border rounded-md bg-background"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-1 border rounded-md bg-background capitalize"
              >
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>
                    {diff === 'all' ? 'All Difficulties' : diff}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Cards */}
      <div className="grid gap-6">
        {patterns
          .filter(pattern => selectedCategory === 'all' || pattern.category === selectedCategory)
          .map((pattern) => (
            <Card key={pattern.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {pattern.name}
                      <Badge variant="secondary">{pattern.category}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {pattern.solvedProblems} of {pattern.totalProblems} problems completed
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {pattern.totalProblems > 0 ? Math.round((pattern.solvedProblems / pattern.totalProblems) * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>
                </div>
                <Progress
                  value={pattern.totalProblems > 0 ? (pattern.solvedProblems / pattern.totalProblems) * 100 : 0}
                  className="w-full"
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pattern.subPatterns.map((subPattern) => (
                    <div key={subPattern.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{subPattern.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          {subPattern.solvedProblems}/{subPattern.totalProblems} solved
                        </span>
                      </div>
                      <div className="space-y-2">
                        {subPattern.problems
                          .filter(problem => selectedDifficulty === 'all' || problem.difficulty.toLowerCase() === selectedDifficulty)
                          .map((problem) => (
                            <div key={problem.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleProblem(pattern.id || pattern.name, problem.id)}
                                  className="p-0 h-6 w-6"
                                >
                                  {problem.solved || problem.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{problem.problemName}</span>
                                    <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
                                      {problem.difficulty}
                                    </Badge>
                                    <Badge variant="outline">{problem.platform}</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {problem.problemUrl && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={problem.problemUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                                {problem.videoSolutionUrl && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={problem.videoSolutionUrl} target="_blank" rel="noopener noreferrer">
                                      <Play className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
