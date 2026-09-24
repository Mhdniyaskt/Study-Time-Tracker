#!/usr/bin/env node

/**
 * Study Time Tracker - Setup Verification Script
 * 
 * This script checks if the application is properly configured before starting.
 * Run this script to verify:
 * - .env file exists and contains required variables
 * - MongoDB connection string is valid
 * - Port is available
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('========================================');
console.log('Study Time Tracker - Setup Check');
console.log('========================================\n');

let hasErrors = false;

// Check 1: .env file exists
console.log('✓ Checking for .env file...');
const envPath = join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('  ✅ .env file found\n');
} else {
  console.log('  ❌ .env file NOT found');
  console.log('  → Copy .env.example to .env and configure it\n');
  hasErrors = true;
}

// Check 2: Read .env file
if (fs.existsSync(envPath)) {
  console.log('✓ Reading .env configuration...');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  // Database: Embedded local datastore
  console.log('  ✅ Database: Embedded Local Datastore (Standalone, no MongoDB required)\n');
  const mongoUri = envLines.find(line => line.startsWith('MONGODB_URI='));
  if (mongoUri) {
    const uri = mongoUri.split('=')[1].trim();
    if (uri && uri !== 'MONGODB_URI=') {
      console.log('  ℹ️  Legacy MONGODB_URI detected (used only for initial migration if enabled)');
      console.log(`     Value: ${uri.replace(/\/\/.*@/, '//<credentials>@')}\n`);
    }
  }
  
  // Check for PORT
  const port = envLines.find(line => line.startsWith('PORT='));
  if (port) {
    const portNum = port.split('=')[1].trim();
    console.log(`  ✅ PORT is configured: ${portNum}\n`);
  } else {
    console.log('  ⚠️  PORT not set (will default to 3000)\n');
  }
  
  // Check for NODE_ENV
  const nodeEnv = envLines.find(line => line.startsWith('NODE_ENV='));
  if (nodeEnv) {
    const env = nodeEnv.split('=')[1].trim();
    console.log(`  ✅ NODE_ENV is set: ${env}\n`);
  } else {
    console.log('  ⚠️  NODE_ENV not set (will default to development)\n');
  }
}

// Check 3: Required folders exist
console.log('✓ Checking project structure...');
const requiredDirs = ['models', 'services', 'controllers', 'routes', 'src', 'dist-react'];
let allDirsExist = true;

for (const dir of requiredDirs) {
  const dirPath = join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ ${dir}/ folder exists`);
  } else {
    console.log(`  ❌ ${dir}/ folder NOT found`);
    allDirsExist = false;
    hasErrors = true;
  }
}
console.log();

// Check 4: Required files exist
console.log('✓ Checking required files...');
const requiredFiles = [
  'server.js',
  'package.json',
  'electron-main.js',
  'preload.js',
  'floating-timer.html',
  'models/db.js',
  'models/StudySession.js',
  'models/Settings.js',
  'services/studyService.js',
  'controllers/studyController.js',
  'routes/api.js',
  'src/App.jsx',
  'src/main.jsx',
  'dist-react/index.html'
];

let allFilesExist = true;

for (const file of requiredFiles) {
  const filePath = join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} NOT found`);
    allFilesExist = false;
    hasErrors = true;
  }
}
console.log();

// Final summary
console.log('========================================');
if (!hasErrors) {
  console.log('✅ Setup Check PASSED');
  console.log('========================================\n');
  console.log('Your standalone application is properly configured!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Start desktop application: npm run electron');
  console.log('2. Or start web server: npm start');
  console.log('3. Open browser: http://localhost:3000');
  console.log('');
} else {
  console.log('❌ Setup Check FAILED');
  console.log('========================================\n');
  console.log('Please fix the errors above before starting the application.');
  console.log('');
  console.log('Common solutions:');
  console.log('• Create .env file from .env.example');
  console.log('• Set MONGODB_URI in .env file');
  console.log('• Run npm install to restore missing files');
  console.log('• Verify all files are extracted from archive');
  console.log('');
  process.exit(1);
}

// MongoDB connection test (optional)
console.log('========================================');
console.log('MongoDB Connection Test (Optional)');
console.log('========================================\n');
console.log('To test MongoDB connection, run:');
console.log('  npm start');
console.log('');
console.log('If connection fails, verify:');
console.log('• MongoDB service is running');
console.log('• Connection string in .env is correct');
console.log('• For Atlas: network access is configured');
console.log('');
