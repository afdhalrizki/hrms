class PytestReporter {
  constructor() {
    this.total = 0;
    this.done = 0;
    this.seen = new Set();
  }

  onCollected(files) {
    let count = 0;
    const walk = (tasks) => {
      for (const t of tasks) {
        if (t.type === 'test') count++;
        else if (t.tasks) walk(t.tasks);
      }
    };
    walk(files);
    this.total = count;
    process.stdout.write(`\n🚀 Initializing Vitest Suite (${this.total} tests spotted)\n`);
  }

  onTaskUpdate(packs) {
    for (const [id, task] of packs) {
      if (task.type === 'test' && task.result && !this.seen.has(id)) {
        this.seen.add(id);
        this.done++;
        
        const pct = Math.floor((this.done / (this.total || 1)) * 100);
        const name = this.getFullName(task);
        const status = task.result.state;
        
        let statusText = 'UNKNOWN';
        if (status === 'pass') statusText = '\x1b[32mPASSED\x1b[0m';
        else if (status === 'fail') statusText = '\x1b[31mFAILED\x1b[0m';
        else if (status === 'skip') statusText = '\x1b[33mSKIPPED\x1b[0m';

        const pctText = `[ ${pct.toString().padStart(2, ' ')}%]`;
        const dots = '.'.repeat(Math.max(2, 90 - name.length));
        
        process.stdout.write(`${name} ${dots} ${statusText} ${pctText}\n`);
      }
    }
  }

  getFullName(task) {
    const parts = [];
    let current = task;
    while (current) {
      if (current.name) parts.unshift(current.name);
      current = current.suite;
    }
    return parts.join('::');
  }
}

module.exports = PytestReporter;
