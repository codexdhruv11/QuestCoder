import React from 'react'
import { motion } from 'framer-motion'
import '@/components/ui/8bit/styles/retro.css'


interface XpProgressBarProps {
  currentXp: number
  requiredXp: number
  level?: number
  showLabel?: boolean
  className?: string
  animated?: boolean
}

const XpProgressBar: React.FC<XpProgressBarProps> = ({ 
  currentXp, 
  requiredXp, 
  level = 1,
  showLabel = true,
  className = '',
  animated = true
}) => {
  // Safeguard against undefined/null values and division by zero
  const safeCurrentXp = Math.max(0, currentXp || 0)
  const safeRequiredXp = Math.max(1, requiredXp || 100) // Minimum 1 to avoid division by zero
  const percentage = Math.min(Math.max(0, (safeCurrentXp / safeRequiredXp) * 100), 100)
  
  const progressProps = animated ? {
    initial: { width: '0%' },
    animate: { width: `${percentage}%` },
    transition: { duration: 1, ease: 'easeOut' }
  } : {}

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          {animated && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="retro text-muted-foreground"
            >
              Level {level}
            </motion.span>
          )}
          {!animated && (
            <span className="retro text-muted-foreground">Level {level}</span>
          )}
          
          <span className="retro font-medium">
            {safeCurrentXp} / {safeRequiredXp} XP
          </span>
        </div>
      )}
      
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        {animated && (
          <motion.div
            {...progressProps}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        )}
        {!animated && (
          <div 
            style={{ width: `${percentage}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        )}
      </div>
      
      {animated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="retro text-xs text-center text-muted-foreground"
        >
          {isNaN(percentage) ? '0' : percentage.toFixed(0)}% to next level
        </motion.div>
      )}
      {!animated && (
        <div className="retro text-xs text-center text-muted-foreground">
          {isNaN(percentage) ? '0' : percentage.toFixed(0)}% to next level
        </div>
      )}
    </div>
  )
}

export default XpProgressBar

export const CompactXpProgressBar: React.FC<XpProgressBarProps> = (props) => {
  return <XpProgressBar {...props} showLabel={false} className="h-2" />
}