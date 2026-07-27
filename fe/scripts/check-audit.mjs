import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const audit = spawnSync('npm', ['audit', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
})

if (audit.error) {
  throw audit.error
}

let report
try {
  report = JSON.parse(audit.stdout)
} catch {
  console.error(audit.stderr || audit.stdout)
  throw new Error('npm audit did not return valid JSON')
}

if (report.error) {
  throw new Error(`npm audit failed: ${report.error.summary || report.error.code || 'unknown error'}`)
}

const policy = JSON.parse(readFileSync(new URL('../audit-exceptions.json', import.meta.url), 'utf8'))
const today = new Date().toISOString().slice(0, 10)
const allowed = new Map()

for (const exception of policy.exceptions || []) {
  if (!exception.advisory || !exception.reason || !exception.reviewAfter) {
    throw new Error('Every audit exception requires advisory, reason, and reviewAfter')
  }
  if (exception.reviewAfter < today) {
    throw new Error(`Audit exception ${exception.advisory} expired on ${exception.reviewAfter}`)
  }
  allowed.set(exception.advisory, exception)
}

const vulnerabilities = report.vulnerabilities || {}

function advisoryIds(packageName, seen = new Set()) {
  if (seen.has(packageName)) return new Set()
  seen.add(packageName)
  const ids = new Set()
  for (const cause of vulnerabilities[packageName]?.via || []) {
    if (typeof cause === 'string') {
      advisoryIds(cause, seen).forEach((id) => ids.add(id))
      continue
    }
    const match = String(cause.url || '').match(/(GHSA-[a-z0-9-]+)$/i)
    if (match) ids.add(match[1])
  }
  return ids
}

const rejected = []
const accepted = []
for (const packageName of Object.keys(vulnerabilities)) {
  const ids = [...advisoryIds(packageName)]
  if (ids.length > 0 && ids.every((id) => allowed.has(id))) {
    accepted.push(`${packageName}: ${ids.join(', ')}`)
  } else {
    rejected.push(`${packageName}: ${ids.join(', ') || 'unidentified advisory'}`)
  }
}

if (rejected.length > 0) {
  console.error(`Unapproved npm audit findings:\n- ${rejected.join('\n- ')}`)
  process.exit(1)
}

if (accepted.length > 0) {
  console.warn(`Accepted npm audit exceptions (review required by policy):\n- ${accepted.join('\n- ')}`)
}

console.log(`npm audit policy passed (${report.metadata?.vulnerabilities?.total || 0} findings)`)
