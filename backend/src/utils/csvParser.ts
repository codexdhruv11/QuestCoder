import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { logger } from '@/utils/logger'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface CSVProblem {
  pattern: string
  subPattern: string
  problemName: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  platform: string
  problemUrl?: string
  videoSolutionUrl?: string
  notes?: string
}

export interface ProcessedProblem extends CSVProblem {
  id: string
}

export interface PatternGroup {
  id: string
  slug: string
  name: string
  category: string
  subPatterns: SubPatternGroup[]
  totalProblems: number
}

export interface SubPatternGroup {
  name: string
  problems: ProcessedProblem[]
  totalProblems: number
}

export class CSVParser {
  private static generateId(pattern: string, subPattern: string, problemName: string): string {
    const combined = `${pattern}-${subPattern}-${problemName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    // Add a hash to ensure uniqueness
    const hash = this.simpleHash(combined).toString(36)
    return `${combined}-${hash}`
  }

  private static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private static simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Parse CSV file and return processed problems
   */
  static async parseCSV(csvPath: string): Promise<ProcessedProblem[]> {
    return new Promise((resolve, reject) => {
      const problems: ProcessedProblem[] = []
      const seenIds = new Set<string>()

      if (!fs.existsSync(csvPath)) {
        logger.error(`CSV file not found: ${csvPath}`)
        reject(new Error(`CSV file not found: ${csvPath}`))
        return
      }

      logger.info(`Parsing CSV file: ${csvPath}`)

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Clean and validate the row data
            const problem: CSVProblem = {
              pattern: row.Pattern?.trim() || row.pattern?.trim() || '',
              subPattern: row['Sub Pattern']?.trim() || row.subPattern?.trim() || row['sub-pattern']?.trim() || '',
              problemName: row['Problem Name']?.trim() || row.problemName?.trim() || row.name?.trim() || '',
              difficulty: this.normalizeDifficulty(row.Difficulty?.trim() || row.difficulty?.trim() || ''),
              platform: this.normalizePlatform(row.Platform?.trim() || row.platform?.trim() || ''),
              problemUrl: row['Problem URL']?.trim() || row.problemUrl?.trim() || row.url?.trim() || undefined,
              videoSolutionUrl: row['Video Solution URL']?.trim() || row.videoSolutionUrl?.trim() || row.videoUrl?.trim() || undefined,
              notes: row.Notes?.trim() || row.notes?.trim() || undefined
            }

            // Skip invalid rows
            if (!problem.pattern || !problem.problemName || !problem.difficulty) {
              logger.warn(`Skipping invalid row: ${JSON.stringify(row)}`)
              return
            }

            // Generate unique ID
            let id = this.generateId(problem.pattern, problem.subPattern, problem.problemName)
            let counter = 1
            
            // Ensure uniqueness
            while (seenIds.has(id)) {
              id = `${this.generateId(problem.pattern, problem.subPattern, problem.problemName)}-${counter}`
              counter++
            }

            seenIds.add(id)

            const processedProblem: ProcessedProblem = {
              ...problem,
              id
            }

            problems.push(processedProblem)
            logger.debug(`Processed problem: ${processedProblem.problemName} (${processedProblem.id})`)
          } catch (error) {
            logger.error(`Error processing CSV row: ${JSON.stringify(row)}`, error)
          }
        })
        .on('end', () => {
          logger.info(`Successfully parsed ${problems.length} problems from CSV`)
          resolve(problems)
        })
        .on('error', (error) => {
          logger.error('Error reading CSV file:', error)
          reject(error)
        })
    })
  }

  /**
   * Group problems by pattern and sub-pattern
   */
  static groupProblems(problems: ProcessedProblem[]): PatternGroup[] {
    const patternMap = new Map<string, PatternGroup>()

    problems.forEach(problem => {
      // Get or create pattern group
      if (!patternMap.has(problem.pattern)) {
        const slug = this.generateSlug(problem.pattern)
        const id = `${slug}-${this.simpleHash(problem.pattern).toString(36)}`
        patternMap.set(problem.pattern, {
          id,
          slug,
          name: problem.pattern,
          category: this.categorizePattern(problem.pattern),
          subPatterns: [],
          totalProblems: 0
        })
      }

      const patternGroup = patternMap.get(problem.pattern)!

      // Find or create sub-pattern group
      let subPatternGroup = patternGroup.subPatterns.find(sp => sp.name === problem.subPattern)
      if (!subPatternGroup) {
        subPatternGroup = {
          name: problem.subPattern || 'General',
          problems: [],
          totalProblems: 0
        }
        patternGroup.subPatterns.push(subPatternGroup)
      }

      // Add problem to sub-pattern group
      subPatternGroup.problems.push(problem)
      subPatternGroup.totalProblems++
      patternGroup.totalProblems++
    })

    // Convert to array and sort
    const patterns = Array.from(patternMap.values())
    
    // Sort patterns by name
    patterns.sort((a, b) => a.name.localeCompare(b.name))
    
    // Sort sub-patterns within each pattern
    patterns.forEach(pattern => {
      pattern.subPatterns.sort((a, b) => a.name.localeCompare(b.name))
      
      // Sort problems within each sub-pattern by difficulty then name
      pattern.subPatterns.forEach(subPattern => {
        subPattern.problems.sort((a, b) => {
          const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 }
          const diffComparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
          return diffComparison !== 0 ? diffComparison : a.problemName.localeCompare(b.problemName)
        })
      })
    })

    return patterns
  }

  /**
   * Normalize difficulty values
   */
  private static normalizeDifficulty(difficulty: string): 'Easy' | 'Medium' | 'Hard' {
    const normalized = difficulty.toLowerCase()
    if (normalized.includes('easy')) return 'Easy'
    if (normalized.includes('medium')) return 'Medium'
    if (normalized.includes('hard')) return 'Hard'
    
    // Default to Medium if unclear
    logger.warn(`Unknown difficulty: ${difficulty}, defaulting to Medium`)
    return 'Medium'
  }

  /**
   * Normalize platform values
   */
  private static normalizePlatform(platform: string): string {
    const normalized = platform.toLowerCase()
    
    if (normalized.includes('leetcode') || normalized.includes('leet')) return 'LeetCode'
    if (normalized.includes('codeforces')) return 'Codeforces'
    if (normalized.includes('hackerrank')) return 'HackerRank'
    if (normalized.includes('geeksforgeeks') || normalized.includes('gfg')) return 'GeeksforGeeks'
    if (normalized.includes('hackerearth')) return 'HackerEarth'
    if (normalized.includes('codechef')) return 'CodeChef'
    if (normalized.includes('atcoder')) return 'AtCoder'
    
    // Return original if no match
    return platform || 'Other'
  }

  /**
   * Categorize patterns into logical groups
   */
  private static categorizePattern(pattern: string): string {
    const normalized = pattern.toLowerCase()
    
    // Array/String patterns
    if (normalized.includes('array') || normalized.includes('string') || 
        normalized.includes('pointer') || normalized.includes('sliding') ||
        normalized.includes('prefix') || normalized.includes('suffix')) {
      return 'Array/String'
    }
    
    // Tree patterns
    if (normalized.includes('tree') || normalized.includes('binary') ||
        normalized.includes('trie') || normalized.includes('heap')) {
      return 'Trees'
    }
    
    // Graph patterns
    if (normalized.includes('graph') || normalized.includes('dfs') ||
        normalized.includes('bfs') || normalized.includes('topological')) {
      return 'Graphs'
    }
    
    // DP patterns
    if (normalized.includes('dp') || normalized.includes('dynamic') ||
        normalized.includes('memoization') || normalized.includes('knapsack')) {
      return 'Dynamic Programming'
    }
    
    // Search patterns
    if (normalized.includes('binary search') || normalized.includes('search')) {
      return 'Search'
    }
    
    // Sort patterns
    if (normalized.includes('sort') || normalized.includes('merge') ||
        normalized.includes('quick')) {
      return 'Sorting'
    }
    
    // Math patterns
    if (normalized.includes('math') || normalized.includes('number') ||
        normalized.includes('bit') || normalized.includes('prime')) {
      return 'Mathematics'
    }
    
    return 'Other'
  }

  /**
   * Save processed data to JSON file
   */
  static async saveToJSON(data: PatternGroup[], outputPath: string): Promise<void> {
    try {
      const jsonData = JSON.stringify(data, null, 2)
      await fs.promises.writeFile(outputPath, jsonData, 'utf8')
      logger.info(`Successfully saved processed data to: ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to save JSON file: ${outputPath}`, error)
      throw error
    }
  }

  /**
   * Get processing statistics
   */
  static getStatistics(patterns: PatternGroup[]): {
    totalPatterns: number
    totalSubPatterns: number
    totalProblems: number
    difficultyBreakdown: Record<string, number>
    platformBreakdown: Record<string, number>
    categoryBreakdown: Record<string, number>
  } {
    let totalSubPatterns = 0
    let totalProblems = 0
    const difficultyBreakdown: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 }
    const platformBreakdown: Record<string, number> = {}
    const categoryBreakdown: Record<string, number> = {}

    patterns.forEach(pattern => {
      totalSubPatterns += pattern.subPatterns.length
      totalProblems += pattern.totalProblems
      
      categoryBreakdown[pattern.category] = (categoryBreakdown[pattern.category] || 0) + pattern.totalProblems

      pattern.subPatterns.forEach(subPattern => {
        subPattern.problems.forEach(problem => {
          difficultyBreakdown[problem.difficulty]++
          platformBreakdown[problem.platform] = (platformBreakdown[problem.platform] || 0) + 1
        })
      })
    })

    return {
      totalPatterns: patterns.length,
      totalSubPatterns,
      totalProblems,
      difficultyBreakdown,
      platformBreakdown,
      categoryBreakdown
    }
  }
}

/**
 * Main function to parse CSV data and return processed patterns
 */
export async function parseCSVData(csvPath: string): Promise<any[]> {
  try {
    const problems = await CSVParser.parseCSV(csvPath)
    const patterns = CSVParser.groupProblems(problems)
    
    logger.info('CSV parsing completed successfully')
    const stats = CSVParser.getStatistics(patterns)
    logger.info('Processing statistics:', stats)
    
    return patterns
  } catch (error) {
    logger.error('Failed to parse CSV data:', error)
    throw error
  }
}

export default parseCSVData
