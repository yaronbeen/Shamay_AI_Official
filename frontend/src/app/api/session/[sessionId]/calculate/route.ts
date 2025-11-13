import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// Force this route to be dynamic (runtime-only) to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// In-memory storage for sessions (use Redis in production)
const sessions = new Map()

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = sessions.get(params.sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  try {
    const calculationData = await request.json()
    
    // Get comparable data from database
    const comparableData = await getComparableDataFromDatabase(calculationData)
    
    // Perform calculations using real data
    const calculations = await performCalculations(calculationData, comparableData as any)
    
    // Update session with calculations
    session.calculations = {
      ...session.calculations,
      ...calculations,
      lastUpdated: new Date().toISOString()
    }
    
    sessions.set(params.sessionId, session)
    
    return NextResponse.json({ 
      success: true, 
      calculations: calculations
    })
    
  } catch (error) {
    console.error('Calculation failed:', error)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}

async function getComparableDataFromDatabase(filters: any) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn('node', [
      '-e',
      `
        import { ComparableDataDatabaseClient } from './comparable-data-management/database-client.js';
        const db = new ComparableDataDatabaseClient();
        db.searchComparableData(${JSON.stringify(filters)})
          .then(result => {
            console.log(JSON.stringify(result));
            process.exit(0);
          })
          .catch(error => {
            console.error(JSON.stringify({ error: error.message }));
            process.exit(1);
          });
      `
    ], { cwd: process.cwd() })
    
    let output = ''
    let errorOutput = ''
    
    childProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    childProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output)
          resolve(result)
        } catch (e) {
          reject(new Error('Failed to parse result'))
        }
      } else {
        reject(new Error(errorOutput || 'Process failed'))
      }
    })
  })
}

async function performCalculations(propertyData: any, comparableData: any[]) {
  // Real calculation logic using the comparable data
  const includedComparables = comparableData.filter(item => item.include)
  
  if (includedComparables.length === 0) {
    throw new Error('No comparable data available for calculation')
  }
  
  const prices = includedComparables.map(item => item.price_per_sqm_rounded)
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const sorted = [...prices].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0 
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length
  const standardDeviation = Math.sqrt(variance)
  
  // Calculate property value
  const builtArea = propertyData.builtArea || 85
  const balconyArea = propertyData.balconyArea || 10
  const equivalentArea = builtArea + (balconyArea * 0.5)
  const finalValue = Math.ceil(equivalentArea * average)
  
  return {
    average,
    median,
    standardDeviation,
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: includedComparables.length,
    equivalentArea,
    finalValue,
    finalValueText: numberToHebrewText(finalValue)
  }
}

function numberToHebrewText(num: number): string {
  // Simplified Hebrew number conversion
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000)
    const remainder = num % 1000000
    return `${millions} מיליון${remainder > 0 ? ` ו${numberToHebrewText(remainder)}` : ''} שקל`
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000)
    const remainder = num % 1000
    return `${thousands} אלף${remainder > 0 ? ` ו${numberToHebrewText(remainder)}` : ''} שקל`
  }
  
  return `${num} שקל`
}
