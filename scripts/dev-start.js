#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkHealth(retries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryConnect = () => {
      attempts++;
      
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/health',
        method: 'GET',
        timeout: 2000
      };
      
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          log(`✓ Backend is ready! (attempt ${attempts})`, colors.green);
          resolve();
        } else {
          retry();
        }
      });
      
      req.on('error', () => {
        retry();
      });
      
      req.on('timeout', () => {
        req.destroy();
        retry();
      });
      
      req.end();
    };
    
    const retry = () => {
      if (attempts < retries) {
        log(`Waiting for backend... (attempt ${attempts}/${retries})`, colors.yellow);
        setTimeout(tryConnect, 2000);
      } else {
        reject(new Error('Backend failed to start after ' + retries + ' attempts'));
      }
    };
    
    tryConnect();
  });
}

async function startDev() {
  log('Starting QuestCoder Development Environment...', colors.green);
  
  // Start backend
  log('Starting backend server...', colors.cyan);
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: './backend',
    shell: true,
    stdio: 'pipe'
  });
  
  backend.stdout.on('data', (data) => {
    process.stdout.write(`${colors.green}[backend]${colors.reset} ${data}`);
  });
  
  backend.stderr.on('data', (data) => {
    process.stderr.write(`${colors.red}[backend]${colors.reset} ${data}`);
  });
  
  backend.on('error', (error) => {
    log(`Backend error: ${error.message}`, colors.red);
  });
  
  // Wait for backend to be ready
  try {
    await checkHealth();
    
    // Start frontend
    log('Starting frontend server...', colors.cyan);
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: './frontend',
      shell: true,
      stdio: 'pipe'
    });
    
    frontend.stdout.on('data', (data) => {
      process.stdout.write(`${colors.cyan}[frontend]${colors.reset} ${data}`);
    });
    
    frontend.stderr.on('data', (data) => {
      process.stderr.write(`${colors.red}[frontend]${colors.reset} ${data}`);
    });
    
    frontend.on('error', (error) => {
      log(`Frontend error: ${error.message}`, colors.red);
    });
    
    log('', colors.reset);
    log('🎉 Development environment started successfully!', colors.green);
    log('', colors.reset);
    log('📍 Backend:  http://localhost:5000', colors.cyan);
    log('📍 Frontend: http://localhost:5173', colors.cyan);
    log('', colors.reset);
    log('Press Ctrl+C to stop all servers', colors.yellow);
    
    // Handle shutdown
    const shutdown = () => {
      log('\nShutting down servers...', colors.yellow);
      backend.kill();
      frontend.kill();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    log(`Failed to start: ${error.message}`, colors.red);
    backend.kill();
    process.exit(1);
  }
}

startDev().catch((error) => {
  log(`Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
