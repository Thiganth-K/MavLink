/**
 * Test file for IST date utilities
 * Run with: node backend/src/utils/dateUtils.test.js
 */

import { parseISTDate, getTodayIST, toISTDateString, getNextISTDay, getISTTimestamp } from './dateUtils.js';

console.log('=== IST Date Utilities Test ===\n');

// Test 1: getTodayIST
console.log('1. getTodayIST():');
const today = getTodayIST();
console.log('   Result:', today);
console.log('   Expected format: YYYY-MM-DD\n');

// Test 2: parseISTDate
console.log('2. parseISTDate("2025-11-20"):');
const parsed = parseISTDate('2025-11-20');
console.log('   Result:', parsed);
console.log('   ISO String:', parsed.toISOString());
console.log('   Expected: Should represent 2025-11-20 00:00:00 IST\n');

// Test 3: toISTDateString
console.log('3. toISTDateString(parsed date):');
const dateStr = toISTDateString(parsed);
console.log('   Result:', dateStr);
console.log('   Expected: 2025-11-20\n');

// Test 4: getNextISTDay
console.log('4. getNextISTDay(parsed):');
const nextDay = getNextISTDay(parsed);
console.log('   Result:', nextDay);
console.log('   ISO String:', nextDay.toISOString());
console.log('   As Date String:', toISTDateString(nextDay));
console.log('   Expected: 2025-11-21\n');

// Test 5: getISTTimestamp
console.log('5. getISTTimestamp():');
const timestamp = getISTTimestamp();
console.log('   Result:', timestamp);
console.log('   ISO String:', timestamp.toISOString());
console.log('   Expected: Current timestamp\n');

// Test 6: Date range query simulation
console.log('6. Date Range Query Simulation:');
const queryDate = '2025-11-20';
const startDate = parseISTDate(queryDate);
const endDate = getNextISTDay(startDate);
console.log(`   Query for: ${queryDate}`);
console.log(`   Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
console.log('   This will find all records on 2025-11-20 IST\n');

console.log('=== All Tests Complete ===');
