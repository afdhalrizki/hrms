import { readFileSync } from 'node:fs';

const results = JSON.parse(readFileSync('test_results.json', 'utf8'));
const failures = [];

results.testResults.forEach(file => {
  file.assertionResults.forEach(test => {
    if (test.status === 'failed') {
      failures.push({
        file: file.name,
        name: test.fullName,
        message: test.failureMessages[0]?.split('\n')[0]
      });
    }
  });
});

console.log(JSON.stringify(failures, null, 2));
