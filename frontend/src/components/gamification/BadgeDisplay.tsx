import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Lock, Trophy, Star, Award, Crown, Gem } from 'lucide-react'
import '@/components/ui/8bit/styles/retro.css'

interface BadgeItem {
  id: string
  name: string
  description: string
  iconUrl?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  category: string
  isUnlocked: boolean
  unlockedAt?: Date
  progress?: number
  progressMax?: number
}

interface BadgeDisplayProps {
  badges: BadgeItem[]
  className?: string
  showProgress?: boolean
  gridCols?: 3 | 4 | 5 | 6
  onBadgeClick?: (badge: BadgeItem) => void
}

const rarityConfig = {
  common: {
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    icon: Award,
    gradient: 'from-gray-400 to-gray-600'
  },
  uncommon: {
    color: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-300',
    icon: Trophy,
    gradient: 'from-green-400 to-green-600'
  },
  rare: {
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-300',
    icon: Star,
    gradient: 'from-blue-400 to-blue-600'
  },
  epic: {
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-300',
    icon: Crown,
    gradient: 'from-purple-400 to-purple-600'
  },
  legendary: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-300',
    icon: Gem,
    gradient: 'from-yellow-400 to-orange-500'
  }
}

const BadgeCard: React.FC<{
  badge: BadgeItem
  onBadgeClick?: (badge: BadgeItem) => void
  showProgress?: boolean
}> = ({ badge, onBadgeClick, showProgress }) => {
  const [isHovered, setIsHovered] = useState(false)
  const config = rarityConfig[badge.rarity]
  const IconComponent = config.icon

  const progressPercentage = badge.progress && badge.progressMax 
    ? (badge.progress / badge.progressMax) * 100 
    : 0

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="cursor-pointer"
      onClick={() => onBadgeClick?.(badge)}
    >
      <Card font="retro" className={cn(
        "relative overflow-hidden transition-all duration-300",
        badge.isUnlocked ? config.borderColor : "border-muted",
        badge.isUnlocked ? "shadow-lg" : "opacity-50"
      )}>
        {/* Rarity glow effect */}
        {badge.isUnlocked && (
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-10",
            config.gradient
          )} />
        )}

        <CardHeader className="pb-2">
          <div className="flex items-center justify-center h-16 w-16 mx-auto relative">
            {badge.isUnlocked ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center bg-gradient-to-br",
                  config.gradient
                )}
              >
                {badge.iconUrl ? (
                  <img 
                    src={badge.iconUrl} 
                    alt={badge.name}
                    className="h-10 w-10"
                  />
                ) : (
                  <IconComponent className="h-8 w-8 text-white" />
                )}
              </motion.div>
            ) : (
              <div className="h-16 w-16 rounded-full flex items-center justify-center bg-muted">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Unlock animation */}
            <AnimatePresence>
              {badge.isUnlocked && isHovered && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 rounded-full border-4 border-yellow-400 shadow-lg"
                />
              )}
            </AnimatePresence>
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-2">
          <CardTitle font="retro" className="retro text-sm font-medium">{badge.name}</CardTitle>
          
          <Badge
            font="retro"
            variant="secondary"
            className={cn(
              "text-xs font-medium",
              badge.isUnlocked ? config.textColor : "text-muted-foreground"
            )}
          >
            {badge.rarity}
          </Badge>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {badge.description}
          </p>

          {/* Progress bar for locked badges */}
          {!badge.isUnlocked && showProgress && badge.progress !== undefined && badge.progressMax !== undefined && (
            <div className="mt-2">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className={cn("h-1.5 rounded-full transition-all duration-500", config.color)}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {badge.progress} / {badge.progressMax}
              </p>
            </div>
          )}

          {/* Unlock date */}
          {badge.isUnlocked && badge.unlockedAt && (
            <p className="text-xs text-muted-foreground">
              Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  className,
  showProgress = true,
  gridCols = 4,
  onBadgeClick
}) => {
  const gridColsClass = {
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn(
        "grid gap-4",
        gridColsClass[gridCols]
      )}>
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} {...(onBadgeClick && { onBadgeClick })}
            showProgress={showProgress}
          />
        ))}
      </div>
    </div>
  )
}

// Compact badge list for sidebar or summary
export const CompactBadgeList: React.FC<{
  badges: BadgeItem[]
  maxVisible?: number
  className?: string
}> = ({ badges, maxVisible = 5, className }) => {
  const unlockedBadges = badges.filter(b => b.isUnlocked).slice(0, maxVisible)
  const remaining = badges.filter(b => b.isUnlocked).length - maxVisible

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {unlockedBadges.map((badge) => {
        const config = rarityConfig[badge.rarity]
        const IconComponent = config.icon

        return (
          <motion.div
            key={badge.id}
            whileHover={{ scale: 1.1 }}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br",
              config.gradient
            )}
            title={badge.name}
          >
            {badge.iconUrl ? (
              <img 
                src={badge.iconUrl} 
                alt={badge.name}
                className="h-5 w-5"
              />
            ) : (
              <IconComponent className="h-4 w-4 text-white" />
            )}
          </motion.div>
        )
      })}
      
      {remaining > 0 && (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            +{remaining}
          </span>
        </div>
      )}
    </div>
  )
}

export default BadgeDisplay
