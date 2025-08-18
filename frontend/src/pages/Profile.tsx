import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { userAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Save, RefreshCw } from 'lucide-react'

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters'),
  email: z.string().email('Please enter a valid email address'),
  leetcodeHandle: z.string().optional(),
  codeforcesHandle: z.string().optional(),
  githubHandle: z.string().optional(),
  hackerrankHandle: z.string().optional(),
  hackerearthHandle: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      leetcodeHandle: user?.leetcodeHandle || '',
      codeforcesHandle: user?.codeforcesHandle || '',
      githubHandle: user?.githubHandle || '',
      hackerrankHandle: user?.hackerrankHandle || '',
      hackerearthHandle: user?.hackerearthHandle || '',
    }
  })

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)
      setMessage('')
      
      await userAPI.updateProfile(data)
      await refreshUser()
      
      setMessage('Profile updated successfully!')
      setMessageType('success')
      reset(data) // Reset form with new values to clear isDirty state
    } catch (error: any) {
      console.error('Profile update error:', error)
      setMessage(error.response?.data?.message || 'Failed to update profile. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form values when user data changes (e.g., on first load or after login)
  useEffect(() => {
    if (user) {
      reset({
        username: user.username || '',
        email: user.email || '',
        leetcodeHandle: user.leetcodeHandle || '',
        codeforcesHandle: user.codeforcesHandle || '',
        githubHandle: user.githubHandle || '',
        hackerrankHandle: user.hackerrankHandle || '',
        hackerearthHandle: user.hackerearthHandle || '',
      })
      setMessage('')
    }
  }, [user, reset])

  const handleReset = () => {
    reset({
      username: user?.username || '',
      email: user?.email || '',
      leetcodeHandle: user?.leetcodeHandle || '',
      codeforcesHandle: user?.codeforcesHandle || '',
      githubHandle: user?.githubHandle || '',
      hackerrankHandle: user?.hackerrankHandle || '',
      hackerearthHandle: user?.hackerearthHandle || '',
    })
    setMessage('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and platform handles
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Update your personal information and platform handles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {message && (
                <div className={`p-3 text-sm rounded-md ${
                  messageType === 'success' 
                    ? 'text-green-700 bg-green-50 border border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
                    : 'text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
                }`}>
                  {message}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      {...register('username')}
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive">{errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      {...register('email')}
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Platform Handles */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Platform Handles</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your coding platform accounts to track your progress
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leetcodeHandle">LeetCode Handle</Label>
                    <Input
                      {...register('leetcodeHandle')}
                      id="leetcodeHandle"
                      type="text"
                      placeholder="your-leetcode-username"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for fetching LeetCode statistics
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codeforcesHandle">Codeforces Handle</Label>
                    <Input
                      {...register('codeforcesHandle')}
                      id="codeforcesHandle"
                      type="text"
                      placeholder="your-codeforces-username"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for fetching contest ratings and statistics
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="githubHandle">GitHub Handle</Label>
                    <Input
                      {...register('githubHandle')}
                      id="githubHandle"
                      type="text"
                      placeholder="your-github-username"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for fetching repository and contribution data
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hackerrankHandle">HackerRank Handle</Label>
                    <Input
                      {...register('hackerrankHandle')}
                      id="hackerrankHandle"
                      type="text"
                      placeholder="your-hackerrank-username"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for fetching HackerRank challenge progress
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hackerearthHandle">HackerEarth Handle</Label>
                    <Input
                      {...register('hackerearthHandle')}
                      id="hackerearthHandle"
                      type="text"
                      placeholder="your-hackerearth-username"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for fetching HackerEarth contest and practice data
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isLoading || !isDirty}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>
              Your account details and activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Member Since</Label>
              <p className="text-sm text-muted-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-muted-foreground">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Connected Platforms</Label>
              <div className="mt-2 space-y-1">
                {[
                  { name: 'LeetCode', handle: user?.leetcodeHandle },
                  { name: 'Codeforces', handle: user?.codeforcesHandle },
                  { name: 'GitHub', handle: user?.githubHandle },
                  { name: 'HackerRank', handle: user?.hackerrankHandle },
                  { name: 'HackerEarth', handle: user?.hackerearthHandle },
                ].map(platform => (
                  <div key={platform.name} className="flex items-center justify-between text-sm">
                    <span>{platform.name}</span>
                    <span className={`${platform.handle ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {platform.handle || 'Not connected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
