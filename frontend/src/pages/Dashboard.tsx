import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LeetCodeWidget from '@/components/widgets/LeetCodeWidget'
import CodeforcesWidget from '@/components/widgets/CodeforcesWidget'
import GitHubWidget from '@/components/widgets/GitHubWidget'
import HackerEarthWidget from '@/components/widgets/HackerEarthWidget'
import StreakTracker from '@/components/widgets/StreakTracker'
import { LayoutDashboard, Target, TrendingUp, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-xs text-muted-foreground">
              +12 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 days</div>
            <p className="text-xs text-muted-foreground">
              Keep it up!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patterns Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12/25</div>
            <p className="text-xs text-muted-foreground">
              48% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              problems solved
            </p>
          </CardContent>
        </Card>
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
