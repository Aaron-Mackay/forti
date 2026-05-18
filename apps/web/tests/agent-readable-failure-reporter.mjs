import fs from 'node:fs';
import path from 'node:path';

const ANSI_RE = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const MAX_ERROR_CHARS = 24_000;

function stripAnsi(value) {
  return String(value ?? '').replace(ANSI_RE, '');
}

function rel(filePath) {
  if (!filePath) return '';
  return path.relative(process.cwd(), filePath);
}

function cap(value, max = MAX_ERROR_CHARS) {
  const text = String(value ?? '');
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[truncated ${text.length - max} chars]`;
}

function toWorkspaceTestTarget(file, line) {
  const relativeFile = file.replace(/^apps\/web\//, '');
  return line && line !== '?' ? `${relativeFile}:${line}` : relativeFile;
}

export class AgentFailureReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || 'test-results/agent-failures.txt';
    this.tests = new Map();
  }

  onTestEnd(test, result) {
    if (!this.tests.has(test.id)) {
      this.tests.set(test.id, {
        test,
        results: [],
      });
    }

    this.tests.get(test.id).results.push(result);
  }

  async onEnd() {
    const outputPath = path.resolve(process.cwd(), this.outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const failedTests = [...this.tests.values()].filter(({ test }) => {
      return test.outcome && test.outcome() === 'unexpected';
    });

    const lines = [];

    lines.push('# Playwright E2E Agent Failure Context');
    lines.push('');
    lines.push('Paste this file directly into a coding agent.');
    lines.push('This summary deliberately excludes screenshots, videos, traces, artifact paths, and other external files.');
    lines.push('');
    lines.push(`Repository: ${process.env.GITHUB_REPOSITORY || 'unknown'}`);
    lines.push(
      `Run: ${
        process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
          ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : 'unknown'
      }`,
    );
    lines.push(`Commit: ${process.env.GITHUB_SHA || 'unknown'}`);
    lines.push(`Branch/ref: ${process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || 'unknown'}`);
    lines.push(`Shard: ${process.env.PLAYWRIGHT_SHARD || 'unknown'}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    if (failedTests.length === 0) {
      lines.push('No failed Playwright tests in this shard.');
      lines.push('');
      fs.writeFileSync(outputPath, lines.join('\n'));
      return;
    }

    lines.push(`Failed tests: ${failedTests.length}`);
    lines.push('');

    for (const { test, results } of failedTests) {
      const location = test.location || {};
      const file = location.file ? rel(location.file) : 'unknown';
      const line = location.line || '?';
      const column = location.column || '?';

      const titlePath = test.titlePath ? test.titlePath().filter(Boolean) : [test.title];
      const fullTitle = titlePath.join(' › ');
      const projectName = test.parent?.project?.()?.name || 'unknown';

      const failedResults = results.filter((result) =>
        ['failed', 'timedOut', 'interrupted'].includes(result.status),
      );

      const finalResult = failedResults[failedResults.length - 1] || results[results.length - 1];
      const maxRetry = Math.max(...results.map((result) => result.retry ?? 0));

      const uniqueErrors = [];
      for (const result of failedResults) {
        const errorText = stripAnsi(
          (result.error && (result.error.stack || result.error.message)) ||
          (result.errors || []).map((error) => error.stack || error.message).join('\n\n'),
        ).trim();

        if (errorText && !uniqueErrors.includes(errorText)) {
          uniqueErrors.push(errorText);
        }
      }

      lines.push('---');
      lines.push('');
      lines.push('## TEST');
      lines.push(`[${projectName}] ${file}:${line}:${column}`);
      lines.push(fullTitle);
      lines.push('');

      lines.push('## REPRODUCE');
      lines.push('```bash');
      lines.push('cd apps/web');
      lines.push(`npx playwright test ${toWorkspaceTestTarget(file, line)} --project="${projectName}"`);
      lines.push('```');
      lines.push('');

      lines.push('## RESULT');
      lines.push(`Final status: ${finalResult.status}`);
      lines.push(`Retries used: ${maxRetry}`);
      lines.push('');

      lines.push('## FAILURE');
      if (uniqueErrors.length > 0) {
        lines.push('```txt');
        lines.push(cap(uniqueErrors.join('\n\n--- retry/error boundary ---\n\n')));
        lines.push('```');
      } else {
        lines.push('No structured Playwright error was reported.');
      }

      lines.push('');
    }

    fs.writeFileSync(outputPath, lines.join('\n'));
  }
}
