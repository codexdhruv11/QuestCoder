import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { XpProgressBar, CompactXpProgressBar } from '@/components/gamification/XpProgressBar'
import { LevelBadge } from '@/components/gamification/LevelBadge'
import { 
  LayoutDashboard, 
  Target, 
  User, 
  LogOut, 
  Menu,
  Code2,
  BarChart3,
  Trophy,
  Users,
  Zap,
  Bell
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patterns', href: '/patterns', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Leaderboards', href: '/leaderboards', icon: Trophy },
  { name: 'Study Groups', href: '/study-groups', icon: Users },
  { name: 'Challenges', href: '/challenges', icon: Zap },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { unreadCount } = useNotifications()
  const [userGamification, setUserGamification] = useState(null)

  // Fetch user gamification data
  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        const response = await api.get('/gamification/profile')
        setUserGamification(response.data)
      } catch (error) {
        console.error('Error fetching gamification data:', error)
      }
    }

    if (user) {
      fetchGamificationData()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:static md:inset-0`}>
        <div className="flex h-16 items-center px-6 border-b">
          <div className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">QuestCoder</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t space-y-3">
          {/* Gamification Info */}
          {userGamification && (
            <div className="space-y-2">
              <XpProgressBar 
                currentXp={userGamification.totalXp} 
                level={userGamification.currentLevel}
                className="h-2"
              />
              <div className="flex items-center justify-between">
                <LevelBadge level={userGamification.currentLevel} />
                <span className="text-xs text-muted-foreground">
                  {userGamification.totalXp} XP
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 md:hidden">
            <Code2 className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">QuestCoder</h1>
          </div>
          
          {/* Right side - Notifications and Gamification */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
            
            {/* Gamification (Desktop) */}
            {userGamification && (
              <CompactXpProgressBar 
                currentXp={userGamification.totalXp} 
                level={userGamification.currentLevel}
                className="hidden md:flex"
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
