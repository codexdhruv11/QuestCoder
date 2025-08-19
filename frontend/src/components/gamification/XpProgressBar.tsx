import React from 'react'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface XpProgressBarProps {
  currentXp: number
  level: number
  xpProgress?: { current: number; required: number; percentage: number }
  className?: string
  showDetails?: boolean
  animated?: boolean
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({
  currentXp,
  level,
  xpProgress,
  className,
  showDetails = true,
  animated = true
}) => {
  // Use server-provided XP progress data or fallback to basic calculation
  const xpInCurrentLevel = xpProgress?.current ?? 0
  const xpRequiredForLevel = xpProgress?.required ?? 100
  const progressPercentage = xpProgress?.percentage ?? 0

  const ProgressComponent = animated ? motion.div : 'div'
  const progressProps = animated ? {
    initial: { width: 0 },
    animate: { width: `${progressPercentage}%` },
    transition: { duration: 1, ease: "easeOut" }
  } : {}

  return (
    <div className={cn("space-y-2", className)}>
      {/* Level and XP Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Level {level}</span>
          {animated && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center"
            >
              <span className="text-xs font-bold text-white">{level}</span>
            </motion.div>
          )}
        </div>
        {showDetails && (
          <span className="text-muted-foreground">
            {currentXp.toLocaleString()} XP
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress 
          value={progressPercentage} 
          className="h-3 bg-muted"
          style={{
            background: 'linear-gradient(90deg, #10B981 0%, #059669 50%, #047857 100%)'
          }}
        />
        
        {animated && (
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-full"
            {...progressProps}
            style={{ maxWidth: '100%' }}
          />
        )}
      </div>

      {/* XP Details */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.max(0, xpInCurrentLevel).toLocaleString()} / {xpRequiredForLevel.toLocaleString()} XP</span>
          <span>
            {xpRequiredForLevel - xpInCurrentLevel > 0 
              ? `${Math.max(0, xpRequiredForLevel - xpInCurrentLevel).toLocaleString()} XP to next level`
              : 'Max level reached!'
            }
          </span>
        </div>
      )}

      {/* Animated XP Gain Effect */}
      {animated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: [0, 1, 0], y: [-10, -30, -50] }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-0 right-0 text-green-500 font-bold text-sm pointer-events-none"
        >
          {/* This would be triggered by XP gain events */}
        </motion.div>
      )}
    </div>
  )
}

// Compact version for header/navbar
export const CompactXpProgressBar: React.FC<Omit<XpProgressBarProps, 'showDetails'>> = ({
  currentXp,
  level,
  xpProgress,
  className,
  animated = true
}) => {
  // Use server-provided XP progress data or fallback to basic calculation
  const progressPercentage = xpProgress?.percentage ?? 0

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Level Badge */}
      <div className="flex items-center space-x-1">
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{level}</span>
        </div>
        <span className="text-sm font-medium">Level {level}</span>
      </div>

      {/* Compact Progress Bar */}
      <div className="flex-1 max-w-32">
        <Progress 
          value={progressPercentage} 
          className="h-2"
        />
      </div>

      {/* XP Count */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {currentXp.toLocaleString()} XP
      </span>
    </div>
  )
}

export default XpProgressBar
