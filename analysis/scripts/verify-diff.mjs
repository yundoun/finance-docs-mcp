#!/usr/bin/env node
/**
 * SSoT Verification Diff Script
 *
 * Compares actual API response JSON files (in verification/ directories)
 * against documented fields in api-spec.json, reporting discrepancies.
 *
 * Report categories:
 *   [UNDOC]    Field exists in actual response but not in documentation
 *   [PHANTOM]  Field exists in documentation but not in actual response
 *   [MISMATCH] Field names are similar but don't match exactly (naming error)
 *
 * Usage:
 *   node analysis/scripts/verify-diff.mjs --analysis-dir=<path> <domain>
 *   node analysis/scripts/verify-diff.mjs --analysis-dir=<path> --all
 *   node analysis/scripts/verify-diff.mjs --analysis-dir=<path> --service=<name> <domain>
 *
 * Options:
 *   --analysis-dir=<path>  Root analysis directory (required)
 *   --service=<name>       Service subdirectory to scan (default: auto-detect)
 *   --all                  Scan all domains in the service
 *
 * Environment variables (alternative to CLI args):
 *   ANALYSIS_DIR    Root analysis directory
 */

import fs from 'fs'
import path from 'path'

// ─── CLI argument parsing ───

function getArg(name, fallback) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=').slice(1).join('=') : fallback
}

const ANALYSIS_DIR = getArg('analysis-dir', process.env.ANALYSIS_DIR)
const serviceName = getArg('service', null)

if (!ANALYSIS_DIR) {
  console.error('Usage: node verify-diff.mjs --analysis-dir=<path> [--service=<name>] <domain>|--all')
  process.exit(1)
}

// Parse positional argument (domain name or --all)
let targetDomain = null
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) continue
  targetDomain = arg
}

if (!targetDomain) {
  console.error('Usage: node verify-diff.mjs --analysis-dir=<path> [--service=<name>] <domain>|--all')
  process.exit(1)
}

// ─── Resolve service directory ───
// If --service is provided, use that subdirectory.
// Otherwise, scan ANALYSIS_DIR directly.

let SERVICE_DIR
if (serviceName) {
  SERVICE_DIR = path.join(ANALYSIS_DIR, serviceName)
  if (!fs.existsSync(SERVICE_DIR)) {
    console.error(`Service directory not found: ${SERVICE_DIR}`)
    process.exit(1)
  }
} else {
  SERVICE_DIR = ANALYSIS_DIR
}

// Auto-detect domains
function discoverDomains(serviceDir) {
  const domains = []
  if (!fs.existsSync(serviceDir)) return domains

  for (const entry of fs.readdirSync(serviceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const domainDir = path.join(serviceDir, entry.name)

    // Direct domain with api-spec.json
    if (fs.existsSync(path.join(domainDir, 'api-spec.json'))) {
      domains.push(entry.name)
    }

    // Nested domains (e.g., operation/app, operation/system)
    for (const sub of fs.readdirSync(domainDir, { withFileTypes: true }).filter(e => e.isDirectory())) {
      if (fs.existsSync(path.join(domainDir, sub.name, 'api-spec.json'))) {
        domains.push(`${entry.name}/${sub.name}`)
      }
    }
  }

  return domains
}

const allDomains = discoverDomains(SERVICE_DIR)
const domainsToCheck = targetDomain === '--all' ? allDomains : [targetDomain]

// ─── Utilities ───

/**
 * Recursively extract all keys from a JSON object (depth-limited).
 * [CUSTOMIZE] Adjust skipKeys for your API response wrapper structure.
 */
function extractKeys(obj, prefix = '', depth = 0, maxDepth = 3) {
  const keys = new Set()
  if (!obj || typeof obj !== 'object' || depth > maxDepth) return keys

  // [CUSTOMIZE] Meta/wrapper fields to skip — adjust for your API response envelope
  const skipMeta = ['code', 'desc', 'serverType', 'serverTime', 'serverVersion', 'lap', 'errorMsg', '_meta']
  // [CUSTOMIZE] Structural wrapper keys — their children are tracked but the key itself is not
  const wrapperKeys = ['contents', 'totalCnt', 'totalPages', 'page', 'pageSize']

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (skipMeta.includes(key)) continue

    // Wrapper keys: skip the key itself, but recurse into children
    if (wrapperKeys.includes(key) && depth <= 1) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        extractKeys(val, fullKey, depth + 1, maxDepth).forEach(k => keys.add(k))
      }
      continue
    }

    keys.add(fullKey)

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      extractKeys(val, fullKey, depth + 1, maxDepth).forEach(k => keys.add(k))
    }

    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      extractKeys(val[0], `${fullKey}[]`, depth + 1, maxDepth).forEach(k => keys.add(k))
    }
  }

  return keys
}

/** Extract documented response fields from api-spec.json endpoint definition */
function extractSpecFields(endpoint, prefix = '') {
  const keys = new Set()
  const fields = endpoint.response?.fields
  if (!fields || typeof fields !== 'object') return keys

  for (const [key, val] of Object.entries(fields)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    keys.add(fullKey)

    if (val && typeof val === 'object') {
      if (val.fields) {
        extractSpecFields({ response: { fields: val.fields } }, fullKey).forEach(k => keys.add(k))
      }
      if (val.itemFields) {
        extractSpecFields({ response: { fields: val.itemFields } }, `${fullKey}[]`).forEach(k => keys.add(k))
      }
    }
  }

  return keys
}

/** Check similarity between field names (catches naming convention differences) */
function isSimilar(a, b) {
  const la = a.toLowerCase().replace(/_/g, '')
  const lb = b.toLowerCase().replace(/_/g, '')
  if (la === lb) return true
  // is_ prefix difference
  if (la === `is${lb}` || lb === `is${la}`) return true
  if (la.replace(/^is/, '') === lb.replace(/^is/, '')) return true
  return false
}

// ─── Main ───

let totalUndoc = 0
let totalPhantom = 0
let totalMismatch = 0

for (const domain of domainsToCheck) {
  const specPath = path.join(SERVICE_DIR, domain, 'api-spec.json')
  const verifyDir = path.join(SERVICE_DIR, domain, 'verification')

  if (!fs.existsSync(specPath)) {
    console.log(`\n[WARN] ${domain}: api-spec.json not found — skipping`)
    continue
  }
  if (!fs.existsSync(verifyDir)) {
    console.log(`\n[WARN] ${domain}: verification/ not found — skipping`)
    continue
  }

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'))
  const verifyFiles = fs.readdirSync(verifyDir).filter(f => f.endsWith('.json'))

  console.log(`\n=== ${domain} (${spec.endpoints?.length || 0} endpoints, ${verifyFiles.length} verification files) ===\n`)

  let domainIssues = 0

  for (const vFile of verifyFiles) {
    const vData = JSON.parse(fs.readFileSync(path.join(verifyDir, vFile), 'utf-8'))

    // [CUSTOMIZE] Skip error responses — adjust the success code for your API
    if (vData.code && vData.code !== '20000000' && vData.code !== '200' && vData.code !== 200) continue

    // [CUSTOMIZE] Path to the result payload in your response envelope
    const resultData = vData.result || vData.data || vData
    if (!resultData || (typeof resultData === 'object' && Object.keys(resultData).length === 0)) continue

    const actualKeys = extractKeys(resultData, 'result')

    // Match verification file to endpoint by name heuristic
    const matchedEndpoints = (spec.endpoints || []).filter(ep => {
      const epId = ep.id?.toLowerCase() || ''
      const fName = vFile.replace('.json', '').toLowerCase().replace(/-/g, '_')
      return epId.includes(fName) || fName.includes(epId.replace(/^[a-z]+_/, ''))
    })

    if (matchedEndpoints.length === 0) {
      if (actualKeys.size > 0) {
        console.log(`  ${vFile} — no endpoint match (${actualKeys.size} actual fields)`)
        for (const key of [...actualKeys].slice(0, 5)) {
          console.log(`     ${key}`)
        }
        if (actualKeys.size > 5) console.log(`     ... +${actualKeys.size - 5} more`)
      }
      continue
    }

    for (const ep of matchedEndpoints) {
      const specKeys = extractSpecFields(ep)

      if (specKeys.size === 0 && actualKeys.size === 0) continue

      const undoc = [...actualKeys].filter(k => {
        const baseName = k.split('.').pop()
        return ![...specKeys].some(sk => {
          const specBase = sk.split('.').pop()
          return baseName === specBase || isSimilar(baseName, specBase)
        })
      })

      const phantom = [...specKeys].filter(k => {
        const baseName = k.split('.').pop()
        return ![...actualKeys].some(ak => {
          const actualBase = ak.split('.').pop()
          return baseName === actualBase || isSimilar(baseName, actualBase)
        })
      })

      const mismatches = []
      for (const sk of specKeys) {
        const specBase = sk.split('.').pop()
        for (const ak of actualKeys) {
          const actualBase = ak.split('.').pop()
          if (specBase !== actualBase && isSimilar(specBase, actualBase)) {
            mismatches.push({ spec: specBase, actual: actualBase })
          }
        }
      }

      if (undoc.length > 0 || phantom.length > 0 || mismatches.length > 0) {
        console.log(`  ${vFile} <-> ${ep.id} (${ep.method} ${ep.path})`)

        for (const key of undoc) {
          console.log(`     [UNDOC]    In actual, not in docs: ${key}`)
          totalUndoc++
          domainIssues++
        }

        for (const key of phantom) {
          console.log(`     [PHANTOM]  In docs, not in actual: ${key}`)
          totalPhantom++
          domainIssues++
        }

        for (const m of mismatches) {
          console.log(`     [MISMATCH] Doc: ${m.spec} -> Actual: ${m.actual}`)
          totalMismatch++
          domainIssues++
        }
      }
    }
  }

  if (domainIssues === 0) {
    console.log(`  No discrepancies found`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`Report Summary:`)
console.log(`  [UNDOC]    ${totalUndoc} — fields in actual response but not documented`)
console.log(`  [PHANTOM]  ${totalPhantom} — fields documented but not in actual response`)
console.log(`  [MISMATCH] ${totalMismatch} — similar field names that don't match`)
console.log(`  Total:      ${totalUndoc + totalPhantom + totalMismatch} issues`)
console.log(`${'='.repeat(50)}\n`)
