import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/8bit/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Input } from '@/components/ui/8bit/input'
import { Label } from '@/components/ui/8bit/label'
import { Code2, Eye, EyeOff } from 'lucide-react'
import '@/components/ui/8bit/styles/retro.css'

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  leetcodeHandle: z.string().optional(),
  codeforcesHandle: z.string().optional(),
  githubHandle: z.string().optional(),
  hackerrankHandle: z.string().optional(),
  hackerearthHandle: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

interface SignupForm {
  username: string
  email: string
  password: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
}

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signup } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true)
      setError('')
      
      // Remove confirmPassword from data before sending to API
      const { confirmPassword, ...signupData } = data
      const signupPayload = {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
        ...(signupData.leetcodeHandle && { leetcodeHandle: signupData.leetcodeHandle }),
        ...(signupData.codeforcesHandle && { codeforcesHandle: signupData.codeforcesHandle }),
        ...(signupData.githubHandle && { githubHandle: signupData.githubHandle }),
        ...(signupData.hackerrankHandle && { hackerrankHandle: signupData.hackerrankHandle }),
        ...(signupData.hackerearthHandle && { hackerearthHandle: signupData.hackerearthHandle })
      }
      await signup(signupPayload as SignupForm)
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Code2 className="h-12 w-12 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight retro">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground retro">
            Join QuestCoder and start tracking your progress
          </p>
        </div>

        <Card font="retro">
          <CardHeader>
            <CardTitle font="retro">Sign Up</CardTitle>
            <CardDescription font="retro">
              Create a new account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" font="retro">Username</Label>
                <Input font="retro"
                  {...register('username')}
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" font="retro">Email</Label>
                <Input font="retro"
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" font="retro">Password</Label>
                <div className="relative">
                  <Input font="retro"
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" font="retro">Confirm Password</Label>
                <div className="relative">
                  <Input font="retro"
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground retro">
                  Platform Handles (Optional)
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="leetcodeHandle" font="retro">LeetCode Handle</Label>
                    <Input font="retro"
                      {...register('leetcodeHandle')}
                      id="leetcodeHandle"
                      type="text"
                      placeholder="your-leetcode-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codeforcesHandle" font="retro">Codeforces Handle</Label>
                    <Input font="retro"
                      {...register('codeforcesHandle')}
                      id="codeforcesHandle"
                      type="text"
                      placeholder="your-codeforces-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="githubHandle" font="retro">GitHub Handle</Label>
                    <Input font="retro"
                      {...register('githubHandle')}
                      id="githubHandle"
                      type="text"
                      placeholder="your-github-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hackerrankHandle" font="retro">HackerRank Handle</Label>
                    <Input font="retro"
                      {...register('hackerrankHandle')}
                      id="hackerrankHandle"
                      type="text"
                      placeholder="your-hackerrank-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hackerearthHandle" font="retro">HackerEarth Handle</Label>
                    <Input font="retro"
                      {...register('hackerearthHandle')}
                      id="hackerearthHandle"
                      type="text"
                      placeholder="your-hackerearth-username"
                    />
                  </div>
                </div>
              </div>

              <Button font="retro"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
