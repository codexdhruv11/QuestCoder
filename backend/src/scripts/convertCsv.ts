import path from 'path'
import { fileURLToPath } from 'url'
import { parseCSVData, CSVParser } from '../utils/csvParser'
import { logger } from '../utils/logger'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function convertCsvToJson() {
  try {
    // Determine CSV path from environment or use default
    const csvPath = process.env.PATTERNS_CSV_PATH || path.join(process.cwd(), 'backend/data/patterns.csv')
    const outputPath = path.join(process.cwd(), 'backend/data/patterns.json')

    logger.info(`Converting CSV to JSON...`)
    logger.info(`CSV Path: ${csvPath}`)
    logger.info(`Output Path: ${outputPath}`)

    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`)
      logger.info('Please ensure the CSV file exists at the specified path')
      process.exit(1)
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      logger.info(`Created output directory: ${outputDir}`)
    }

    // Parse CSV and convert to JSON
    const patterns = await parseCSVData(csvPath)
    
    // Save to JSON file
    await CSVParser.saveToJSON(patterns, outputPath)
    
    // Display statistics
    const stats = CSVParser.getStatistics(patterns)
    logger.info('Conversion Statistics:')
    logger.info(`- Total Patterns: ${stats.totalPatterns}`)
    logger.info(`- Total Sub-Patterns: ${stats.totalSubPatterns}`)
    logger.info(`- Total Problems: ${stats.totalProblems}`)
    logger.info(`- Difficulty Breakdown:`, stats.difficultyBreakdown)
    logger.info(`- Platform Breakdown:`, stats.platformBreakdown)
    logger.info(`- Category Breakdown:`, stats.categoryBreakdown)
    
    logger.info('CSV conversion completed successfully!')
    process.exit(0)
  } catch (error) {
    logger.error('Failed to convert CSV:', error)
    process.exit(1)
  }
}

// Run the conversion
convertCsvToJson()
