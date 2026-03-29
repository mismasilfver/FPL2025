const { execSync, spawn } = require('child_process');

// Get all test files
const testFilesOutput = execSync('npx jest --listTests').toString().trim();
const testFiles = testFilesOutput.split('\n').filter(Boolean);

console.log(`Found ${testFiles.length} test files. Running each with a 60-second timeout...`);

async function runTest(file, isRetry = false) {
  return new Promise((resolve) => {
    console.log(`\n--------------------------------------------------`);
    console.log(`${isRetry ? '🔄 RETRYING' : '▶️  RUNNING'}: ${file}`);
    console.log(`--------------------------------------------------`);
    
    // Run without --forceExit to detect if the file hangs during teardown
    const child = spawn('npx', ['jest', file, '--runInBand'], { 
        stdio: 'inherit',
        env: { ...process.env, JEST_HANDLE_DEBUG: '1' }
    });

    let isDone = false;
    
    // 60 second timeout
    const timer = setTimeout(() => {
      if (!isDone) {
        console.error(`\n🚨 [TIMEOUT] ${file} hung for more than 60 seconds! Killing process...`);
        isDone = true;
        try {
            child.kill('SIGKILL');
        } catch (e) {
            console.error('Error killing child:', e);
        }
        resolve('TIMEOUT');
      }
    }, 60000);

    child.on('close', (code) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      
      if (code === 0) {
        console.log(`✅ PASSED: ${file}`);
        resolve('PASS');
      } else {
        console.error(`❌ FAILED (Exit Code: ${code}): ${file}`);
        resolve(`FAIL (code ${code})`);
      }
    });

    child.on('error', (err) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timer);
        console.error(`❌ ERROR spawning test: ${err.message}`);
        resolve('ERROR');
    });
  });
}

async function runAll() {
  const results = {};
  let timeouts = 0;
  let failures = 0;
  let passes = 0;
  let retries = 0;

  for (const file of testFiles) {
    let result = await runTest(file);
    
    if (result === 'TIMEOUT') {
        console.log(`\n⏳ Test timed out. Retrying once...`);
        retries++;
        result = await runTest(file, true);
    }
    
    results[file] = result;
    
    if (result === 'PASS') passes++;
    else if (result === 'TIMEOUT') timeouts++;
    else failures++;
  }

  console.log('\n==================================================');
  console.log('                 TEST RUN SUMMARY                 ');
  console.log('==================================================');
  console.log(`Total Files: ${testFiles.length}`);
  console.log(`Passed:      ${passes}`);
  console.log(`Failed:      ${failures}`);
  console.log(`Timed Out:   ${timeouts}`);
  console.log(`Retries:     ${retries}`);
  
  if (timeouts > 0 || failures > 0) {
      console.log('\nProblematic Files:');
      for (const [file, result] of Object.entries(results)) {
        if (result !== 'PASS') {
          console.log(`- ${result.padEnd(15)} ${file}`);
        }
      }
      process.exit(1);
  } else {
      console.log('\nAll test files executed and exited cleanly (possibly after retry)!');
      process.exit(0);
  }
}

runAll().catch(console.error);
