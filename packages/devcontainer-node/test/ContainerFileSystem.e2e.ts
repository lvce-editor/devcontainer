import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import * as ContainerFileSystem from '../src/parts/ContainerFileSystem/ContainerFileSystem.ts'
import * as RunProcess from '../src/parts/RunProcess/RunProcess.ts'

const children = (): string[] => {
  return readFileSync(`/proc/self/task/${process.pid}/children`, 'utf8')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

void test(
  'concurrent container file operations bound and reap Docker children',
  { timeout: 120_000 },
  async () => {
    const started = await RunProcess.runProcess({
      args: [
        'run',
        '-d',
        '--entrypoint',
        'sleep',
        'mcr.microsoft.com/devcontainers/base:ubuntu24.04',
        'infinity',
      ],
      command: 'docker',
    })
    assert.ok(!('errorMessage' in started), JSON.stringify(started))
    assert.equal(started.exitCode, 0, started.stderr)
    const containerId = started.stdout.trim()
    let peak = 0
    const sample = () => {
      peak = Math.max(peak, children().length)
    }
    const timer = setInterval(sample, 5)
    try {
      for (let cycle = 0; cycle < 3; cycle++) {
        const results = await Promise.allSettled(
          Array.from({ length: 128 }, (_, index) =>
            ContainerFileSystem.run({
              containerId,
              operation: 'readFile',
              path: index % 16 === 0 ? '/missing-file' : '/etc/os-release',
              remoteWorkspaceFolder: '/',
            }),
          ),
        )
        for (const [index, result] of results.entries()) {
          if (index % 16 === 0) {
            assert.equal(result.status, 'rejected')
            assert.equal(result.reason.code, 'ENOENT')
          } else {
            assert.equal(result.status, 'fulfilled')
            assert.match(
              Buffer.from(String(result.value), 'base64').toString(),
              /Ubuntu/,
            )
          }
        }
        assert.deepEqual(
          children(),
          [],
          'completed operations must leave no Docker processes or zombies',
        )
      }
      assert.ok(peak > 0, 'must observe the real Docker processes')
      assert.ok(
        peak <= 8,
        `expected at most eight Docker children, observed ${peak}`,
      )
    } finally {
      clearInterval(timer)
      await RunProcess.runProcess({
        args: ['rm', '-f', containerId],
        command: 'docker',
      })
    }
  },
)
