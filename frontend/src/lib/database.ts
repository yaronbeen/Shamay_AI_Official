import { Pool } from 'pg'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shamay_ai',
  password: 'postgres',
  port: 5432,
})

export { pool }
