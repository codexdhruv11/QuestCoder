import { config } from 'dotenv'
import { connectDB } from '@/config/database'
import Badge from '@/models/Badge'
import { logger } from '@/utils/logger'

// Load environment variables
config()

const defaultBadges = [
  {
    identifier: 'first_steps',
    name: 'First Steps',
    description: 'Solve your first problem',
    category: 'milestone',
    criteria: {
      type: 'problems_solved',
      value: 1
    },
    xpReward: 50,
    rarity: 'common',
    iconUrl: '/badges/first-steps.svg'
  },
  {
    identifier: 'problem_solver',
    name: 'Problem Solver',
    description: 'Solve 10 problems',
    category: 'achievement',
    criteria: {
      type: 'problems_solved',
      value: 10
    },
    xpReward: 100,
    rarity: 'common',
    iconUrl: '/badges/problem-solver.svg'
  },
  {
    identifier: 'pattern_master',
    name: 'Pattern Master',
    description: 'Complete your first pattern',
    category: 'milestone',
    criteria: {
      type: 'patterns_completed',
      value: 1
    },
    xpReward: 200,
    rarity: 'uncommon',
    iconUrl: '/badges/pattern-master.svg'
  },
  {
    identifier: 'streak_keeper',
    name: 'Streak Keeper',
    description: 'Maintain a 7-day solving streak',
    category: 'achievement',
    criteria: {
      type: 'streak_days',
      value: 7
    },
    xpReward: 150,
    rarity: 'uncommon',
    iconUrl: '/badges/streak-keeper.svg'
  },
  {
    identifier: 'speed_demon',
    name: 'Speed Demon',
    description: 'Solve 10 problems in a single day',
    category: 'achievement',
    criteria: {
      type: 'daily_problems',
      value: 10
    },
    xpReward: 300,
    rarity: 'rare',
    iconUrl: '/badges/speed-demon.svg'
  },
  {
    identifier: 'difficulty_climber',
    name: 'Difficulty Climber',
    description: 'Solve problems of all difficulty levels',
    category: 'achievement',
    criteria: {
      type: 'problems_solved',
      value: 3,
      additionalData: { requireAllDifficulties: true }
    },
    xpReward: 250,
    rarity: 'uncommon',
    iconUrl: '/badges/difficulty-climber.svg'
  },
  {
    identifier: 'centurion',
    name: 'Centurion',
    description: 'Solve 100 problems',
    category: 'milestone',
    criteria: {
      type: 'problems_solved',
      value: 100
    },
    xpReward: 500,
    rarity: 'rare',
    iconUrl: '/badges/centurion.svg'
  },
  {
    identifier: 'array_specialist',
    name: 'Array Specialist',
    description: 'Solve 20 Easy problems',
    category: 'achievement',
    criteria: {
      type: 'difficulty_solved',
      value: 20,
      additionalData: { difficulty: 'Easy' }
    },
    xpReward: 200,
    rarity: 'common',
    iconUrl: '/badges/array-specialist.svg'
  },
  {
    identifier: 'algorithm_expert',
    name: 'Algorithm Expert',
    description: 'Solve 15 Hard problems',
    category: 'achievement',
    criteria: {
      type: 'difficulty_solved',
      value: 15,
      additionalData: { difficulty: 'Hard' }
    },
    xpReward: 750,
    rarity: 'epic',
    iconUrl: '/badges/algorithm-expert.svg'
  },
  {
    identifier: 'dedication',
    name: 'Dedication',
    description: 'Maintain a 30-day streak',
    category: 'milestone',
    criteria: {
      type: 'streak_days',
      value: 30
    },
    xpReward: 1000,
    rarity: 'epic',
    iconUrl: '/badges/dedication.svg'
  },
  {
    identifier: 'level_achiever',
    name: 'Level Achiever',
    description: 'Reach level 10',
    category: 'milestone',
    criteria: {
      type: 'level_reached',
      value: 10
    },
    xpReward: 500,
    rarity: 'rare',
    iconUrl: '/badges/level-achiever.svg'
  },
  {
    identifier: 'master_coder',
    name: 'Master Coder',
    description: 'Reach level 25',
    category: 'milestone',
    criteria: {
      type: 'level_reached',
      value: 25
    },
    xpReward: 1500,
    rarity: 'legendary',
    iconUrl: '/badges/master-coder.svg'
  }
]

async function seedBadges() {
  try {
    // Connect to database
    await connectDB()
    
    logger.info('Starting badge seeding...')
    
    // Clear existing badges
    await Badge.deleteMany({})
    logger.info('Cleared existing badges')
    
    // Insert default badges
    const createdBadges = await Badge.insertMany(defaultBadges)
    
    logger.info(`Successfully seeded ${createdBadges.length} badges:`)
    createdBadges.forEach(badge => {
      logger.info(`- ${badge.name} (${badge.rarity})`)
    })
    
    process.exit(0)
  } catch (error) {
    logger.error('Error seeding badges:', error)
    process.exit(1)
  }
}

// Run the seeding function
seedBadges()
