#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting SHAMAY.AI Platform...');

// Start the frontend
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

frontend.on('error', (err) => {
  console.error('❌ Frontend error:', err);
});

frontend.on('close', (code) => {
  console.log(`📊 Frontend exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down SHAMAY.AI Platform...');
  frontend.kill();
  process.exit(0);
});
