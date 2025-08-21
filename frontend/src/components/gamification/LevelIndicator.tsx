import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Star, Crown, Sparkles, Trophy, Zap } from 'lucide-react'

interface LevelIndicatorProps {
  currentLevel: number
  currentXP: number
  xpToNextLevel: number
  totalXPForCurrentLevel: number
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
  showAnimation?: boolean
  onLevelUp?: () => void
}

const levelThemes = {
  1: { icon: Star, color: 'from-gray-400 to-gray-600', name: 'Novice' },
  5: { icon: Trophy, color: 'from-green-400 to-green-600', name: 'Apprentice' },
  10: { icon: Zap, color: 'from-blue-400 to-blue-600', name: 'Adept' },
  15: { icon: Crown, color: 'from-purple-400 to-purple-600', name: 'Expert' },
  20: { icon: Sparkles, color: 'from-yellow-400 to-orange-500', name: 'Master' },
  30: { icon: Crown, color: 'from-pink-400 to-red-500', name: 'Grandmaster' },
  50: { icon: Sparkles, color: 'from-cyan-400 to-blue-500', name: 'Legend' }
}

const getLevelTheme = (level: number) => {
  const thresholds = Object.keys(levelThemes).map(Number).sort((a, b) => b - a)
  const threshold = thresholds.find(t => level >= t) || 1
  return levelThemes[threshold as keyof typeof levelThemes]
}

const LevelUpAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-background border rounded-lg p-8 text-center space-y-4 shadow-2xl"
      >
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, repeatType: "reverse" }
          }}
          className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
        >
          <Crown className="h-8 w-8 text-white" />
        </motion.div>
        
        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
          >
            LEVEL UP!
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-muted-foreground"
          >
            You've reached a new level!
          </motion.p>
        </div>

        {/* Sparkle effects */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: [0, (i - 3) * 100],
              y: [0, -50 - i * 20]
            }}
            transition={{ 
              duration: 2,
              delay: 0.5 + i * 0.1,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              left: '50%',
              top: '50%'
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}

export const LevelIndicator: React.FC<LevelIndicatorProps> = ({
  currentLevel,
  // currentXP,
  xpToNextLevel,
  totalXPForCurrentLevel,
  className,
  variant = 'default',
  showAnimation = true,
  onLevelUp
}) => {
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [prevLevel, setPrevLevel] = useState(currentLevel)

  const theme = getLevelTheme(currentLevel)
  const IconComponent = theme.icon
  
  const progressPercentage = totalXPForCurrentLevel > 0 
    ? ((totalXPForCurrentLevel - xpToNextLevel) / totalXPForCurrentLevel) * 100 
    : 0

  useEffect(() => {
    if (currentLevel > prevLevel && showAnimation) {
      setShowLevelUp(true)
      onLevelUp?.()
    }
    setPrevLevel(currentLevel)
  }, [currentLevel, prevLevel, showAnimation, onLevelUp])

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br",
          theme.color
        )}>
          <IconComponent className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Level {currentLevel}</span>
            <span className="text-xs text-muted-foreground">
              {totalXPForCurrentLevel - xpToNextLevel} / {totalXPForCurrentLevel} XP
            </span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <>
        <Card className={cn("overflow-hidden", className)}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg",
                  theme.color
                )}
              >
                <IconComponent className="h-8 w-8 text-white" />
              </motion.div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Level {currentLevel}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {theme.name}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {totalXPForCurrentLevel - xpToNextLevel} / {totalXPForCurrentLevel} XP
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {xpToNextLevel} XP to next level
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Current Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <AnimatePresence>
          {showLevelUp && (
            <LevelUpAnimation onComplete={() => setShowLevelUp(false)} />
          )}
        </AnimatePresence>
      </>
    )
  }

  // Default variant
  return (
    <>
      <div className={cn("flex items-center space-x-3", className)}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br shadow-md",
            theme.color
          )}
        >
          <IconComponent className="h-6 w-6 text-white" />
        </motion.div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Level {currentLevel}</span>
              <Badge variant="outline" className="text-xs">
                {theme.name}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {xpToNextLevel} XP to go
            </span>
          </div>
          
          <div className="space-y-1">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalXPForCurrentLevel - xpToNextLevel} XP</span>
              <span>{totalXPForCurrentLevel} XP</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLevelUp && (
          <LevelUpAnimation onComplete={() => setShowLevelUp(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// Minimal level display for avatars/profiles
export const LevelBadge: React.FC<{
  level: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}> = ({ level, className, size = 'md' }) => {
  const theme = getLevelTheme(level)
  const IconComponent = theme.icon

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={cn(
        "rounded-full flex items-center justify-center bg-gradient-to-br shadow-sm border-2 border-background",
        theme.color,
        sizeClasses[size],
        className
      )}
      title={`Level ${level} - ${theme.name}`}
    >
      <IconComponent className={cn("text-white", iconSizes[size])} />
    </motion.div>
  )
}

export default LevelIndicator
