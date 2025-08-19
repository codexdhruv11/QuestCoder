import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSocketSubscription } from '@/hooks/useSocket'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XpProgressBar } from '@/components/gamification/XpProgressBar'
import { BadgeDisplay } from '@/components/gamification/BadgeDisplay'
import { LevelIndicator } from '@/components/gamification/LevelIndicator'
import LeetCodeWidget from '@/components/widgets/LeetCodeWidget'
import CodeforcesWidget from '@/components/widgets/CodeforcesWidget'
import GitHubWidget from '@/components/widgets/GitHubWidget'
import HackerEarthWidget from '@/components/widgets/HackerEarthWidget'
import StreakTracker from '@/components/widgets/StreakTracker'
import { analyticsAPI, gamificationAPI } from '@/lib/api'
import { LayoutDashboard, Target, TrendingUp, Calendar, Trophy, Zap, Users, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [userGamification, setUserGamification] = useState(null)
  const [recentBadges, setRecentBadges] = useState([])
  const [loading, setLoading] = useState(true)

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, gamificationData] = await Promise.all([
        analyticsAPI.getOverview(),
        gamificationAPI.getProfile()
      ])
      
      setStats(statsData)
      setUserGamification(gamificationData)
      
      // Map unlocked badges to expected BadgeItem shape
      const recentBadges = (gamificationData.unlockedBadges || []).slice(-3).map((b: any) => ({
        id: b._id,
        name: b.name,
        description: b.description,
        iconUrl: b.iconUrl,
        rarity: b.rarity,
        category: b.category,
        isUnlocked: true,
        unlockedAt: b.createdAt,
      }))
      setRecentBadges(recentBadges)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Set fallback data for demo purposes
      setStats({
        totalProblems: 245,
        weeklyGrowth: 12,
        currentStreak: 7,
        completedPatterns: 12,
        totalPatterns: 25,
        patternCompletionPercentage: 48,
        monthlyProblems: 23
      })
      setUserGamification({
        totalXp: 1250,
        currentLevel: 8,
        unlockedBadges: []
      })
    } finally {
      setLoading(false)
    }
  }

  // Listen for real-time updates
  useSocketSubscription('xp_gained', () => {
    fetchDashboardData()
  })

  useSocketSubscription('badge_unlocked', () => {
    fetchDashboardData()
  })

  useSocketSubscription('level_up', () => {
    fetchDashboardData()
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username}! Here's your coding progress overview.
          </p>
        </div>
      </div>

      {/* Gamification Overview */}
      {userGamification && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Level</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <LevelIndicator 
                  currentLevel={userGamification.currentLevel}
                  currentXP={userGamification.totalXp}
                  xpToNextLevel={userGamification.xpProgress?.required - userGamification.xpProgress?.current || 0}
                  totalXPForCurrentLevel={userGamification.xpProgress?.required || 100}
                  variant="compact" 
                />
                {userGamification.currentLevel}
              </div>
              <p className="text-xs text-muted-foreground">
                {userGamification.totalXp} total XP
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">XP Progress</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <XpProgressBar 
                currentXp={userGamification.totalXp} 
                level={userGamification.currentLevel}
                xpProgress={userGamification.xpProgress}
                className="h-3"
              />
              <p className="text-xs text-muted-foreground">
                Level {userGamification.currentLevel} • {userGamification.unlockedBadges?.length || 0} badges unlocked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Badges</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentBadges.length}</div>
              <p className="text-xs text-muted-foreground">
                {userGamification.unlockedBadges?.length || 0} total earned
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProblems || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.weeklyGrowth || 0} from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.currentStreak || 0} days</div>
            <p className="text-xs text-muted-foreground">
              {stats?.currentStreak > 0 ? 'Keep it up!' : 'Start your streak!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patterns Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedPatterns || 0}/{stats?.totalPatterns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.patternCompletionPercentage || 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monthlyProblems || 0}</div>
            <p className="text-xs text-muted-foreground">
              problems solved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Badges */}
      {recentBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>
              Your latest badge unlocks and accomplishments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BadgeDisplay badges={recentBadges} gridCols={3} showProgress={false} />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/patterns">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Continue Learning</h3>
                <p className="text-sm text-muted-foreground">Practice coding patterns</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/analytics">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">View Analytics</h3>
                <p className="text-sm text-muted-foreground">Track your progress</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/leaderboards">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Leaderboards</h3>
                <p className="text-sm text-muted-foreground">Compare with others</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/challenges">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <Zap className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Challenges</h3>
                <p className="text-sm text-muted-foreground">Join competitions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Platform Widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LeetCode Widget */}
        {user?.leetcodeHandle && (
          <LeetCodeWidget handle={user.leetcodeHandle} />
        )}

        {/* Codeforces Widget */}
        {user?.codeforcesHandle && (
          <CodeforcesWidget handle={user.codeforcesHandle} />
        )}

        {/* GitHub Widget */}
        {user?.githubHandle && (
          <GitHubWidget handle={user.githubHandle} />
        )}

        {/* HackerEarth Widget */}
        {user?.hackerearthHandle && (
          <HackerEarthWidget handle={user.hackerearthHandle} />
        )}

        {/* Streak Tracker */}
        <StreakTracker />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest problem solving activity across all platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                platform: 'LeetCode',
                problem: 'Two Sum',
                difficulty: 'Easy',
                date: '2 hours ago',
                status: 'Solved'
              },
              {
                platform: 'Codeforces',
                problem: 'Beautiful Matrix',
                difficulty: 'Medium',
                date: '1 day ago',
                status: 'Solved'
              },
              {
                platform: 'LeetCode',
                problem: 'Add Two Numbers',
                difficulty: 'Medium',
                date: '2 days ago',
                status: 'Attempted'
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${
                    activity.status === 'Solved' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="font-medium">{activity.problem}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.platform} • {activity.difficulty}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {activity.date}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
