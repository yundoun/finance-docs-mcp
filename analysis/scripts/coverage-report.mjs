#!/usr/bin/env node
/**
 * Documentation Coverage Report Generator
 *
 * Auto-detects domains from the analysis directory structure and generates
 * FE + BE coverage statistics.
 *
 * Usage:
 *   node analysis/scripts/coverage-report.mjs --analysis-dir=<path>
 *
 * Options:
 *   --analysis-dir=<path>  Root analysis directory (required)
 *   --fe-map-file=<name>   Name of fe-map JSON files (default: fe-map.json)
 *   --md                   Also output a COVERAGE.md markdown file
 *
 * Environment variables (alternative to CLI args):
 *   ANALYSIS_DIR    Root analysis directory
 *   FE_MAP_FILE     Name of fe-map JSON files
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

// ─── CLI argument parsing ───

function getArg(name, fallback) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=').slice(1).join('=') : fallback
}

const ANALYSIS_DIR = getArg('analysis-dir', process.env.ANALYSIS_DIR)
const FE_MAP_FILE = getArg('fe-map-file', process.env.FE_MAP_FILE || 'fe-map.json')
const outputMd = process.argv.includes('--md')

if (!ANALYSIS_DIR) {
  console.error('Usage: node coverage-report.mjs --analysis-dir=<path>')
  console.error('  --analysis-dir : Root directory containing service analysis folders')
  process.exit(1)
}

// ─── Utilities ───

function readJson(path) {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf-8')) } catch { return null }
}

function pct(n, d) {
  if (d === 0) return '-'
  return Math.round(n / d * 100) + '%'
}

// ─── Auto-detect service directories ───
// Discovers all service directories that contain domain subfolders with
// api-spec.json or fe-map files.

function discoverServices() {
  const services = { fe: [], be: [] }

  if (!existsSync(ANALYSIS_DIR)) {
    console.error(`Analysis directory does not exist: ${ANALYSIS_DIR}`)
    process.exit(1)
  }

  for (const entry of readdirSync(ANALYSIS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const serviceDir = join(ANALYSIS_DIR, entry.name)

    // Check if this directory has domain subdirectories with analysis artifacts
    let hasFeMap = false
    let hasApiSpec = false

    for (const sub of readdirSync(serviceDir, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue
      const domainDir = join(serviceDir, sub.name)
      if (existsSync(join(domainDir, FE_MAP_FILE))) hasFeMap = true
      if (existsSync(join(domainDir, 'api-spec.json'))) hasApiSpec = true
    }

    if (hasFeMap) {
      services.fe.push({ id: entry.name, dir: serviceDir, feMapFile: FE_MAP_FILE })
    }
    if (hasApiSpec) {
      services.be.push({ id: entry.name, dir: serviceDir })
    }
  }

  return services
}

// ─── FE Coverage Analysis ───

function analyzeFe(serviceDir, feMapFile) {
  const results = []
  if (!existsSync(serviceDir)) return results

  for (const entry of readdirSync(serviceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const mapPath = join(serviceDir, entry.name, feMapFile)
    const map = readJson(mapPath)
    if (!map) continue

    // Detect structure type
    const items = map.endpoints || map.pages || []
    const pageMappingItems = map.page_mapping || []
    const funcGroups = map.functional_groups || []
    const pageGroups = map.pageGroups || []

    let structure = 'endpoints'
    let total = items.length
    if (items.length === 0 && pageMappingItems.length > 0) { structure = 'page_mapping'; total = pageMappingItems.length }
    if (items.length === 0 && funcGroups.length > 0) { structure = 'functional_groups'; total = funcGroups.length }
    if (items.length === 0 && pageGroups.length > 0) { structure = 'pageGroups'; total = pageGroups.length }

    const allItems = items.length > 0 ? items : pageMappingItems.length > 0 ? pageMappingItems : []

    const withCallers = allItems.filter(e => e.fe_callers?.length > 0).length
    const withFieldUsage = allItems.filter(e => e.field_usage?.used?.length > 0).length

    results.push({
      domain: entry.name,
      structure,
      total,
      withCallers,
      withFieldUsage,
      callerPct: pct(withCallers, total),
      fieldPct: pct(withFieldUsage, total),
    })
  }

  return results
}

// ─── BE Coverage Analysis ───

function analyzeBe(serviceDir) {
  const results = []

  function scanDir(dir, prefix = '') {
    if (!existsSync(dir)) return

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const domainDir = join(dir, entry.name)
      const specPath = join(domainDir, 'api-spec.json')
      const spec = readJson(specPath)

      if (spec) {
        const eps = (spec.endpoints || []).filter(e => typeof e === 'object')
        const total = eps.length
        const withResponse = eps.filter(e => {
          const fields = e.response?.fields
          return fields && typeof fields === 'object' && Object.keys(fields).length > 0
        }).length

        // Check for supplementary documentation files
        const hasNested = existsSync(join(domainDir, 'nested-objects.md'))
        const hasFlow = existsSync(join(domainDir, 'flow.md'))
        const hasTraps = existsSync(join(domainDir, 'traps.md'))
        const hasRules = existsSync(join(domainDir, 'business-rules.md'))
        const hasDeps = existsSync(join(domainDir, 'dependencies.json'))
        const hasCallerMap = existsSync(join(domainDir, 'caller-map.md'))

        results.push({
          domain: prefix ? `${prefix}/${entry.name}` : entry.name,
          totalEp: total,
          withResponse,
          missingResponse: total - withResponse,
          responsePct: pct(withResponse, total),
          docs: [
            hasNested ? 'nested' : '',
            hasFlow ? 'flow' : '',
            hasTraps ? 'traps' : '',
            hasRules ? 'rules' : '',
            hasDeps ? 'deps' : '',
            hasCallerMap ? 'caller' : '',
          ].filter(Boolean).join(', '),
        })
      } else {
        // Recurse into subdirectories (e.g., operation/app, operation/system)
        scanDir(domainDir, prefix ? `${prefix}/${entry.name}` : entry.name)
      }
    }
  }

  scanDir(serviceDir)
  return results
}

// ─── Main ───

const now = new Date().toISOString().split('T')[0]
const services = discoverServices()

console.log(`\nCoverage Report (${now})\n`)
console.log(`Analysis directory: ${ANALYSIS_DIR}`)
console.log(`FE services detected: ${services.fe.map(s => s.id).join(', ') || 'none'}`)
console.log(`BE services detected: ${services.be.map(s => s.id).join(', ') || 'none'}\n`)

// FE analysis
const feResults = {}
for (const svc of services.fe) {
  feResults[svc.id] = analyzeFe(svc.dir, svc.feMapFile)
}

// BE analysis
const beResults = {}
for (const svc of services.be) {
  beResults[svc.id] = analyzeBe(svc.dir)
}

// ─── Console output ───

for (const [serviceId, results] of Object.entries(feResults)) {
  console.log(`=== FE: ${serviceId} ===`)
  const total = results.reduce((s, r) => s + r.total, 0)
  const callers = results.reduce((s, r) => s + r.withCallers, 0)
  const fields = results.reduce((s, r) => s + r.withFieldUsage, 0)
  console.log(`Total: ${total} EP | fe_callers: ${callers} (${pct(callers, total)}) | field_usage: ${fields} (${pct(fields, total)})\n`)

  for (const r of results) {
    const flag = r.structure !== 'endpoints' ? ` [${r.structure}]` : ''
    console.log(`  ${r.domain.padEnd(14)} ${String(r.total).padStart(3)} EP | callers: ${r.callerPct.padStart(4)} | fields: ${r.fieldPct.padStart(4)}${flag}`)
  }
  console.log()
}

for (const [serviceId, results] of Object.entries(beResults)) {
  console.log(`=== BE: ${serviceId} ===`)
  const total = results.reduce((s, r) => s + r.totalEp, 0)
  const withResp = results.reduce((s, r) => s + r.withResponse, 0)
  console.log(`Total: ${total} EP | response.fields: ${withResp} (${pct(withResp, total)})\n`)

  for (const r of results) {
    console.log(`  ${r.domain.padEnd(18)} ${String(r.totalEp).padStart(4)} EP | response: ${r.responsePct.padStart(4)} (${r.withResponse}/${r.totalEp}) | ${r.docs}`)
  }
  console.log()
}

// ─── Markdown output ───

if (outputMd) {
  let md = `# Documentation Coverage Report\n\n> Auto-generated: ${now} | \`node analysis/scripts/coverage-report.mjs --md\`\n\n`

  for (const [serviceId, results] of Object.entries(feResults)) {
    const total = results.reduce((s, r) => s + r.total, 0)
    const callers = results.reduce((s, r) => s + r.withCallers, 0)
    const fields = results.reduce((s, r) => s + r.withFieldUsage, 0)

    md += `## FE: ${serviceId} (${pct(fields, total)})\n\n`
    md += `| Domain | EP | fe_callers | field_usage | Structure |\n|--------|---:|:----------:|:-----------:|----------|\n`
    for (const r of results) {
      md += `| ${r.domain} | ${r.total} | ${r.callerPct} | ${r.fieldPct} | ${r.structure} |\n`
    }
    md += `| **Total** | **${total}** | **${pct(callers, total)}** | **${pct(fields, total)}** | |\n\n`
  }

  for (const [serviceId, results] of Object.entries(beResults)) {
    const total = results.reduce((s, r) => s + r.totalEp, 0)
    const withResp = results.reduce((s, r) => s + r.withResponse, 0)

    md += `## BE: ${serviceId} (${pct(withResp, total)})\n\n`
    md += `| Domain | EP | response.fields | Supplementary docs |\n|--------|---:|:---------------:|-------------------|\n`
    for (const r of results) {
      md += `| ${r.domain} | ${r.totalEp} | ${r.responsePct} (${r.withResponse}/${r.totalEp}) | ${r.docs} |\n`
    }
    md += `| **Total** | **${total}** | **${pct(withResp, total)}** (${withResp}/${total}) | |\n\n`
  }

  const outPath = join(ANALYSIS_DIR, 'COVERAGE.md')
  writeFileSync(outPath, md)
  console.log(`Markdown report written to: ${outPath}`)
}
