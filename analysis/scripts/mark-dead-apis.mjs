#!/usr/bin/env node
/**
 * Dead API / Special Endpoint Auto-Marker
 *
 * Scans fe-map files and automatically classifies endpoints that have
 * empty field_usage based on their characteristics.
 *
 * Classifications:
 *   _NO_FE_USAGE          — No thunk + no callers (Dead API candidate)
 *   _DELETE_OPERATION      — DELETE method (no response body)
 *   _FILE_DOWNLOAD         — Excel/file download endpoint (no JSON response)
 *   _POPUP_BACKEND_ONLY    — Popup endpoint with no FE callers
 *   _STATE_CHANGE          — PATCH/PUT with no FE callers
 *
 * Usage:
 *   node analysis/scripts/mark-dead-apis.mjs --analysis-dir=<path> --fe-root=<path>
 *
 * Options:
 *   --analysis-dir=<path>  Analysis directory containing domain folders (required)
 *   --fe-root=<path>       Frontend src/ directory for usage verification (required)
 *   --fe-map-file=<name>   Name of fe-map JSON file (default: fe-map.json)
 *   --dry-run              Print results without writing files
 *
 * Environment variables (alternative to CLI args):
 *   ANALYSIS_DIR    Analysis output directory
 *   FE_ROOT         Frontend src/ directory
 *   FE_MAP_FILE     Name of fe-map JSON file
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

// ─── CLI argument parsing ───

function getArg(name, fallback) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=').slice(1).join('=') : fallback
}

const ANALYSIS_DIR = getArg('analysis-dir', process.env.ANALYSIS_DIR)
const FE_ROOT = getArg('fe-root', process.env.FE_ROOT)
const FE_MAP_FILE = getArg('fe-map-file', process.env.FE_MAP_FILE || 'fe-map.json')
const isDryRun = process.argv.includes('--dry-run')

if (!ANALYSIS_DIR || !FE_ROOT) {
  console.error('Usage: node mark-dead-apis.mjs --analysis-dir=<path> --fe-root=<path>')
  console.error('  --analysis-dir : Directory containing domain analysis folders')
  console.error('  --fe-root      : Frontend src/ directory for usage verification')
  process.exit(1)
}

/**
 * Verify whether an API endpoint's URL constant is actually imported and used
 * in the frontend source code. This is a second-pass check using grep to
 * catch cases where thunk parsing missed the usage.
 *
 * [CUSTOMIZE] Adjust search directories and file patterns for your project.
 */
function isUrlActuallyUsed(ep, feRoot) {
  if (!feRoot || !existsSync(feRoot)) return false

  // [CUSTOMIZE] Field names that reference thunk/function/constant names
  const names = [ep.fe_thunk, ep.fe_function, ep._url_constant].filter(Boolean)
  if (names.length === 0) return false

  // [CUSTOMIZE] Directories to search within the FE source
  const searchDirs = ['pages', 'sections', 'components', 'store', 'views']
    .map(d => join(feRoot, d))
    .filter(d => existsSync(d))

  for (const name of names) {
    for (const dir of searchDirs) {
      try {
        const result = execSync(
          `grep -rn "\\b${name}\\b" "${dir}" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l 2>/dev/null`,
          { encoding: 'utf-8', timeout: 10000 }
        ).trim()
        if (result) return true
      } catch { /* no matches */ }
    }
  }
  return false
}

/**
 * Classify an endpoint that lacks field_usage data.
 * Returns null if the endpoint should not be marked (it has real usage).
 */
function classifyEndpoint(ep, feRoot) {
  const path = (ep.path || '').toLowerCase()
  const method = (ep.method || 'GET').toUpperCase()
  const hasThunk = !!(ep.fe_thunk || ep.fe_function)
  const hasCallers = (ep.fe_callers?.length || 0) > 0
  const hasFieldUsage = (ep.field_usage?.used?.length || 0) > 0

  // Already has field_usage — skip
  if (hasFieldUsage) return null

  // File download endpoints (no JSON response fields)
  // [CUSTOMIZE] Add patterns for your download endpoints
  if (path.includes('/excel') || path.includes('/download') || path.includes('/export')) {
    return { marker: '_FILE_DOWNLOAD', reason: 'File download endpoint — no JSON response fields' }
  }

  // DELETE operations (typically no response body)
  if (method === 'DELETE') {
    return { marker: '_DELETE_OPERATION', reason: 'DELETE operation — no response body or success code only' }
  }

  // Has thunk + callers = real usage, just needs manual field analysis
  if (hasThunk && hasCallers) return null

  // No thunk and no callers — verify with source code grep
  if (!hasThunk && !hasCallers) {
    if (feRoot && isUrlActuallyUsed(ep, feRoot)) {
      return null  // Actually used — not dead
    }

    // [CUSTOMIZE] Add your own URL pattern classifications
    if (path.includes('/popup/')) {
      return { marker: '_POPUP_BACKEND_ONLY', reason: 'Popup endpoint — direct FE call (no Redux)' }
    }
    if (method === 'PATCH' || method === 'PUT') {
      return { marker: '_STATE_CHANGE', reason: 'State change endpoint — direct FE call or unused' }
    }
    return { marker: '_NO_FE_USAGE', reason: 'No FE usage detected (Dead API candidate)' }
  }

  return null
}

/**
 * Process all domain directories under an analysis directory.
 */
function processFeMap(analysisDir, feMapFile, feRoot) {
  let totalMarked = 0

  if (!existsSync(analysisDir)) {
    console.log(`  [SKIP] Directory not found: ${analysisDir}`)
    return 0
  }

  for (const entry of readdirSync(analysisDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const mapPath = join(analysisDir, entry.name, feMapFile)
    if (!existsSync(mapPath)) continue

    const map = JSON.parse(readFileSync(mapPath, 'utf-8'))
    const eps = map.endpoints || []
    let marked = 0

    for (const ep of eps) {
      const classification = classifyEndpoint(ep, feRoot)
      if (!classification) continue

      ep.field_usage = {
        used: [classification.marker],
        unused: [],
        transformed: [],
      }
      ep._auto_classified = classification.reason
      marked++
    }

    if (marked > 0) {
      console.log(`  ${entry.name}: ${marked} EP(s) marked`)
      if (!isDryRun) {
        writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n')
      }
    }
    totalMarked += marked
  }

  return totalMarked
}

// ─── Entry Point ───

console.log('Dead API / Special EP auto-marking\n')
console.log(`  ANALYSIS_DIR: ${ANALYSIS_DIR}`)
console.log(`  FE_ROOT:      ${FE_ROOT}`)
console.log(`  FE_MAP_FILE:  ${FE_MAP_FILE}\n`)

const totalMarked = processFeMap(ANALYSIS_DIR, FE_MAP_FILE, FE_ROOT)

console.log(`\nTotal: ${totalMarked} EP(s) marked`)
if (isDryRun) console.log('  (--dry-run: no files were modified)')
console.log('Done!')
