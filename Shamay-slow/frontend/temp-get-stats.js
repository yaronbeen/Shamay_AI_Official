
import { ComparableDataDatabaseClient } from './database-client.js';

async function getStats() {
  try {
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    const stats = await db.getComparableDataStats();
    
    await db.disconnect();
    
    console.log(JSON.stringify({
      success: true,
      data: stats,
      message: 'Database statistics retrieved'
    }));
    
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

getStats();
    