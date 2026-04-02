/**
 * Playwright Custom Reporter: Pytest Style
 * Mimics: tests/auth.spec.ts::Login with valid creds PASSED [ 5%]
 */
class PytestReporter {
  constructor() {
    this.totalTests = 0;
    this.finishedTests = 0;
  }

  onBegin(config, suite) {
    this.totalTests = suite.allTests().length;
    process.stdout.write(`\n🚀 Initializing Playwright Suite (${this.totalTests} tests spotted)\n`);
  }

  onTestEnd(test, result) {
    this.finishedTests++;
    const percentage = Math.floor((this.finishedTests / this.totalTests) * 100);
    const status = result.status;
    
    // Formatting the status with colors (ANSI)
    let statusText = 'unknown';
    if (status === 'passed') statusText = '\x1b[32mPASSED\x1b[0m';
    else if (status === 'failed') statusText = '\x1b[31mFAILED\x1b[0m';
    else if (status === 'skipped') statusText = '\x1b[33mSKIPPED\x1b[0m';
    else if (status === 'timedOut') statusText = '\x1b[31mTIMEDOUT\x1b[0m';

    // Get the title and file path
    const title = test.title;
    const file = test.location.file.split(/[\\/]/).pop(); // Get filename
    const percentText = `[ ${percentage.toString().padStart(2, ' ')}%]`;

    // Calculate alignment (pad test path to 100 chars or similar)
    const testInfo = `${file}::${title}`;
    const dotsCount = Math.max(2, 90 - testInfo.length);
    const dots = '.'.repeat(dotsCount);

    // Print the line
    process.stdout.write(`${testInfo} ${dots} ${statusText} ${percentText}\n`);
  }
}

module.exports = PytestReporter;
