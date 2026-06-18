#!/usr/bin/env node
/**
 * Frontend Source Scanner — generates fe-map.json with field-level analysis.
 *
 * Scans a frontend codebase to:
 *   1. Parse Redux thunks / API functions -> build a function registry
 *   2. Find callers (pages/sections/components that invoke each function)
 *   3. Extract field_usage from reducers + caller files
 *   4. Cross-validate against api-spec.json (SSoT)
 *
 * This script is generalized from a Redux Toolkit + request() pattern.
 * CUSTOMIZATION POINTS are marked with [CUSTOMIZE] comments.
 *
 * Usage:
 *   node analysis/scripts/fe-scanner.mjs --fe-root=<path> --analysis-dir=<path>
 *
 * Options:
 *   --fe-root=<path>       Frontend src/ directory (required)
 *   --analysis-dir=<path>  Analysis output directory containing domain folders (required)
 *   --fe-map-file=<name>   Name of fe-map JSON file (default: fe-map.json)
 *   --dry-run              Print results without writing files
 *   --domain=<name>        Process a single domain only
 *
 * Environment variables (alternative to CLI args):
 *   FE_ROOT          Frontend src/ directory
 *   ANALYSIS_DIR     Analysis output directory
 *   FE_MAP_FILE      Name of fe-map JSON file
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, relative, basename } from 'path'
import { execSync } from 'child_process'

// ─── CLI argument parsing ───

function getArg(name, fallback) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=').slice(1).join('=') : fallback
}

const FE_ROOT = getArg('fe-root', process.env.FE_ROOT)
const ANALYSIS_DIR = getArg('analysis-dir', process.env.ANALYSIS_DIR)
const FE_MAP_FILE = getArg('fe-map-file', process.env.FE_MAP_FILE || 'fe-map.json')
const isDryRun = process.argv.includes('--dry-run')
const domainFilter = getArg('domain', null)

if (!FE_ROOT || !ANALYSIS_DIR) {
  console.error('Usage: node fe-scanner.mjs --fe-root=<path> --analysis-dir=<path>')
  console.error('  --fe-root     : Path to frontend src/ directory')
  console.error('  --analysis-dir: Path to analysis output directory with domain folders')
  process.exit(1)
}

if (!existsSync(FE_ROOT)) {
  console.error(`FE_ROOT does not exist: ${FE_ROOT}`)
  process.exit(1)
}

// ─── [CUSTOMIZE] API URL constant resolution ───
// Adapt this section to match your frontend's API constant definition pattern.
// The default pattern handles:
//   - export const FOO = '/path'
//   - export const FOO = `${BAR}/sub`
//   - export const getFooURL = (id) => `${BAR}/${id}/sub`

function resolveApiConstants() {
  // [CUSTOMIZE] Path to your API constants file
  const apiConstPath = join(FE_ROOT, 'constant', 'api.js')
  if (!existsSync(apiConstPath)) return {}
  const content = readFileSync(apiConstPath, 'utf-8')
  const constants = {}

  // 1. Simple assignments: export const FOO = '/path'
  for (const m of content.matchAll(/(?:const|export const)\s+(\w+)\s*=\s*['"`]([^'"`]+)['"`]/g)) {
    constants[m[1]] = m[2]
  }

  // 2. Template literals: export const FOO = `${BAR}/sub`
  // Iterate 3 times to resolve chained references
  for (let i = 0; i < 3; i++) {
    for (const m of content.matchAll(/(?:const|export const)\s+(\w+)\s*=\s*`([^`]+)`/g)) {
      const resolved = m[2].replace(/\$\{(\w+)\}/g, (_, v) => constants[v] || `\${${v}}`)
      if (!resolved.includes('${')) constants[m[1]] = resolved
    }
  }

  // 3. Function-style URL generators: export const getFooURL = (id) => `${BAR}/${id}/sub`
  //    Parameters are replaced with {param} placeholders for path pattern extraction
  for (const m of content.matchAll(
    /(?:export\s+(?:const|function)\s+|export\s+default\s+function\s+)(\w+)\s*(?:=\s*)?(?:\([^)]*\)\s*=>|function\s*\([^)]*\))\s*[`'"]/g
  )) {
    const funcName = m[1]
    const bodyStart = m.index + m[0].length - 1
    const quote = content[bodyStart]
    let end = bodyStart + 1
    if (quote === '`') {
      while (end < content.length && content[end] !== '`') end++
    } else {
      while (end < content.length && content[end] !== quote) end++
    }
    let path = content.substring(bodyStart + 1, end)
    path = path.replace(/\$\{(\w+)\}/g, (_, v) => constants[v] || `{${v}}`)
    if (!path.includes('${')) {
      constants[funcName] = path
    }
  }

  return constants
}

let _apiConstants = null
function getApiConstants() {
  if (!_apiConstants) _apiConstants = resolveApiConstants()
  return _apiConstants
}

function resolveUrl(raw, fileContent) {
  if (raw.startsWith('/') || raw.startsWith('http')) return raw
  const apiConst = getApiConstants()
  if (apiConst[raw]) return apiConst[raw]
  const resolved = raw.replace(/\$\{(\w+)\}/g, (_, v) => {
    const localMatch = fileContent.match(new RegExp(`const ${v}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`))
    if (localMatch) return localMatch[1]
    return apiConst[v] || `\${${v}}`
  })
  return resolved.replace(/\$\{(\w+)\}/g, '{$1}')
}

// ─── Brace-counting body extraction (battle-tested) ───

function extractBraceBlock(content, startIdx) {
  let depth = 0
  let i = startIdx
  while (i < content.length && content[i] !== '{') i++
  if (i >= content.length) return null
  const bodyStart = i + 1
  depth = 1
  i++
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') depth--
    i++
  }
  if (depth !== 0) return null
  return content.substring(bodyStart, i - 1)
}

// ─── Step 1: Parse Redux thunks -> function registry ───
// [CUSTOMIZE] Adapt the thunk pattern regex to match your framework.
// Redux Toolkit: createAsyncThunk('type', async (params) => { ... request(URL, ...) })
// Other patterns: adapt the headerRegex and reqMatch patterns below.

function parseThunks() {
  const registry = new Map() // funcName -> { url, method, file }

  // [CUSTOMIZE] Directory containing Redux reducers/slices
  const reducersDir = join(FE_ROOT, 'store', 'reducers')
  if (!existsSync(reducersDir)) {
    // Try alternative: store/ directly (for ducks pattern)
    const storeDir = join(FE_ROOT, 'store')
    if (existsSync(storeDir)) {
      scanDir(storeDir)
    }
    console.log(`  Thunk registry: ${registry.size} functions parsed`)
    return registry
  }

  function scanDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(full)
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx')) {
        try {
          const content = readFileSync(full, 'utf-8')

          // [CUSTOMIZE] Thunk header pattern — adjust for your framework
          // Redux Toolkit pattern: export const fetchFoo = createAsyncThunk('type', async (params) => { ... })
          const headerRegex = /export const (\w+)\s*=\s*createAsyncThunk\([^,]+,\s*async\s*\([^)]*\)[^{]*/g
          let match
          while ((match = headerRegex.exec(content)) !== null) {
            const name = match[1]
            const body = extractBraceBlock(content, match.index + match[0].length)
            if (!body) continue

            // [CUSTOMIZE] API call pattern — adjust for your HTTP client
            // Default pattern: request(URL, params, method)
            // For axios: axios.get(URL), axios.post(URL, data)
            // For fetch: fetch(URL, { method: ... })
            const reqMatch = body.match(/request\(\s*(?:['"`]([^'"`]+)['"`]|`([^`]+)`|(\w+))/)
            if (!reqMatch) continue

            const rawUrl = reqMatch[1] || reqMatch[2] || reqMatch[3] || ''
            const url = resolveUrl(rawUrl, content)
            if (!url || url.includes('${')) continue

            // [CUSTOMIZE] Method extraction pattern
            const methodMatch = body.match(/REQUEST_METHOD\.(\w+)|['"`](GET|POST|PUT|PATCH|DELETE)['"`]/)
            const method = methodMatch
              ? (methodMatch[1] || methodMatch[2]).toUpperCase()
              : 'GET'
            registry.set(name, {
              url,
              method,
              file: relative(FE_ROOT, full),
            })
          }
        } catch { /* skip unreadable files */ }
      }
    }
  }

  scanDir(reducersDir)
  console.log(`  Thunk registry: ${registry.size} functions parsed`)
  return registry
}

// ─── Step 2: Find callers ───

function findCallers(funcName) {
  // [CUSTOMIZE] Directories where page/component files live
  const searchDirs = [
    join(FE_ROOT, 'pages'),
    join(FE_ROOT, 'sections'),
    join(FE_ROOT, 'components'),
    join(FE_ROOT, 'views'),       // common alternative
  ].filter(d => existsSync(d))

  const files = new Set()
  for (const dir of searchDirs) {
    try {
      const result = execSync(
        `grep -rn "\\b${funcName}\\b" "${dir}" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l`,
        { encoding: 'utf-8', timeout: 10000 }
      ).trim()
      if (result) result.split('\n').forEach(f => files.add(f))
    } catch { /* no matches */ }
  }
  return [...files]
}

function detectTrigger(content, funcName) {
  if (content.includes('useEffect') && content.includes(funcName)) return 'useEffect'
  if (new RegExp(`on(?:Click|Submit|Change|Press)[^}]*${funcName}`, 's').test(content)) return 'event handler'
  if (content.includes(`dispatch(${funcName}`)) return 'dispatch'
  return 'component logic'
}

function analyzeCallerFile(filePath, funcName) {
  const content = readFileSync(filePath, 'utf-8')
  return {
    page: relative(FE_ROOT, filePath),
    component_type: content.includes('class ') ? 'class' : 'functional',
    trigger: detectTrigger(content, funcName),
  }
}

// ─── Step 3: Extract response field usage ───
// KEY FIX: EP-level scoping via extractThunkFulfilledBlock — ensures fields
// are extracted only from the specific thunk's fulfilled case, not the entire file.

function extractFieldUsage(funcName, thunkInfo, callerFiles) {
  const usedFields = new Set()

  // [CUSTOMIZE] Noise words to filter out — common JS/framework identifiers
  const NOISE = new Set([
    'contents', 'payload', 'result', 'type', 'meta', 'error',
    'length', 'map', 'filter', 'forEach', 'find', 'reduce', 'slice',
    'concat', 'push', 'pop', 'indexOf', 'includes', 'toString',
    'toLocaleString', 'then', 'catch', 'data', 'status',
  ])

  // --- Reducer file: scoped to this thunk's fulfilled case ---
  const reducerPath = join(FE_ROOT, thunkInfo.file)
  if (existsSync(reducerPath)) {
    const content = readFileSync(reducerPath, 'utf-8')

    // KEY FIX: Extract only the fulfilled block for this specific thunk
    const scopedBlock = extractThunkFulfilledBlock(content, funcName)

    if (scopedBlock) {
      // Scoped extraction — only from the fulfilled handler
      for (const m of scopedBlock.matchAll(/(?:action\.payload|contents|payload|result)\.(\w+)/g)) {
        if (!NOISE.has(m[1])) usedFields.add(m[1])
      }
      // [CUSTOMIZE] State path patterns for your store shape
      for (const m of scopedBlock.matchAll(/state\.(?:detail|list|data|targetData)\.(\w+)/g)) {
        if (!NOISE.has(m[1])) usedFields.add(m[1])
      }
    } else {
      // Fallback: extract from entire file (less accurate, backward compat)
      for (const m of content.matchAll(/action\.payload\.(\w+)/g)) {
        if (!NOISE.has(m[1])) usedFields.add(m[1])
      }
    }
  }

  // --- Caller files + their sibling data/ directories ---
  // KEY FIX: Also scan ColumnsData / table definition files in data/ subdirectories
  const allFiles = new Set(callerFiles)
  for (const filePath of callerFiles) {
    const dir = filePath.replace(/\/[^/]+$/, '')

    // Look for table column definitions in data/ subdirectory
    const dataDir = join(dir, 'data')
    if (existsSync(dataDir)) {
      try {
        for (const f of readdirSync(dataDir)) {
          // KEY FIX: Match column definition files (Columns, SearchForm, etc.)
          if (f.includes('olumns') || f.includes('SearchForm') || f.includes('columns')) {
            allFiles.add(join(dataDir, f))
          }
        }
      } catch { /* skip */ }
    }
    // Also check parent's data/ directory (sections/domain/data/ pattern)
    const parentDataDir = join(dir, '..', 'data')
    if (existsSync(parentDataDir)) {
      try {
        for (const f of readdirSync(parentDataDir)) {
          if (f.includes('olumns') || f.includes('SearchForm') || f.includes('columns')) {
            allFiles.add(join(parentDataDir, f))
          }
        }
      } catch { /* skip */ }
    }
  }

  for (const filePath of allFiles) {
    const content = readFileSync(filePath, 'utf-8')

    // Table column/field definitions — extract id/field/dataIndex values
    // KEY FIX: Recognize both `id:` and `dataIndex:` patterns
    if (filePath.includes('olumns') || filePath.includes('SearchForm') || filePath.includes('columns')) {
      for (const m of content.matchAll(/(?:id|field|dataIndex|accessor|key)\s*:\s*['"`](\w+)['"`]/g)) {
        if (!NOISE.has(m[1])) usedFields.add(m[1])
      }
      continue  // Column definition files don't need thunk filtering
    }

    // Regular caller files — only process if they reference the thunk
    if (!content.includes(funcName)) continue

    // Destructuring patterns
    for (const m of content.matchAll(
      /(?:const|let|var)\s*\{\s*([^}]+)\}\s*=\s*(?:detail|data|result|response|payload|contents|targetData)/g
    )) {
      m[1].split(',').forEach(f => {
        const field = f.replace(/\s*=\s*.*/, '').replace(/\s*:\s*.*/, '').trim()
        if (field && !field.startsWith('//') && !field.startsWith('...') && !NOISE.has(field)) {
          usedFields.add(field)
        }
      })
    }

    // Selector field access patterns
    // [CUSTOMIZE] Adjust these patterns for your state shape
    for (const m of content.matchAll(/(?:detail|targetData|info|item)\.(\w+)/g)) {
      if (!NOISE.has(m[1])) usedFields.add(m[1])
    }
  }

  return [...usedFields].sort()
}

/**
 * Extract the fulfilled case block for a specific thunk from extraReducers.
 * KEY FIX: This ensures field extraction is scoped to the correct endpoint,
 * preventing cross-contamination between thunks in the same slice file.
 *
 * Handles two patterns:
 *   Pattern 1: [thunkName.fulfilled]: (state, action) => { ... }
 *   Pattern 2: builder.addCase(thunkName.fulfilled, (state, action) => { ... })
 */
function extractThunkFulfilledBlock(content, funcName) {
  const patterns = [
    new RegExp(`\\[${funcName}\\.fulfilled\\]\\s*:\\s*\\(`, 'g'),
    new RegExp(`addCase\\(${funcName}\\.fulfilled\\s*,\\s*\\(`, 'g'),
  ]

  for (const regex of patterns) {
    const match = regex.exec(content)
    if (!match) continue

    let i = match.index + match[0].length
    while (i < content.length && content[i] !== '{') i++
    if (i >= content.length) continue

    const bodyStart = i + 1
    let depth = 1
    i++
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++
      else if (content[i] === '}') depth--
      i++
    }
    if (depth === 0) return content.substring(bodyStart, i - 1)
  }
  return null
}

// ─── Step 4: Detect data transforms ───

function extractTransforms(callerFiles, thunkInfo, usedFields) {
  const transforms = []
  const allFiles = [...callerFiles]
  const reducerPath = join(FE_ROOT, thunkInfo.file)
  if (existsSync(reducerPath)) allFiles.push(reducerPath)

  // [CUSTOMIZE] Add/remove transform patterns for your codebase
  const transformPatterns = [
    { regex: /toLocaleString\(\)/g, desc: 'locale number format' },
    { regex: /\.toFixed\(\d+\)/g, desc: 'decimal format' },
    { regex: /format\([^,]+,\s*["'][^"']+["']\)/g, desc: 'date format' },
    { regex: /Number\(([^)]+)\)|parseInt\(([^)]+)\)/g, desc: 'number conversion' },
    { regex: /numberWithComma|toComma/g, desc: 'comma number format' },
  ]

  for (const filePath of allFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      for (const { regex, desc } of transformPatterns) {
        const matches = content.matchAll(new RegExp(regex))
        for (const m of matches) {
          const line = content.substring(Math.max(0, m.index - 100), m.index + m[0].length + 50)
          for (const field of usedFields) {
            if (line.includes(field)) {
              transforms.push({ field, transform: desc })
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  const seen = new Set()
  return transforms.filter(t => {
    const key = `${t.field}:${t.transform}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Step 5: UI component identification ───

function extractUIComponents(callerFiles) {
  const components = new Set()
  for (const filePath of callerFiles) {
    const ext = filePath.match(/\.(jsx?|tsx?)$/)?.[0] || '.js'
    const fileName = basename(filePath).replace(ext, '')
    if (fileName[0] === fileName[0].toUpperCase()) {
      components.add(fileName)
    }
  }
  return [...components].sort()
}

// ─── Step 6: Cross-validate with api-spec.json ───

function getSsotResponseFields(domainId, endpointPath, method) {
  const specPath = join(ANALYSIS_DIR, domainId, 'api-spec.json')
  if (!existsSync(specPath)) return []

  const spec = JSON.parse(readFileSync(specPath, 'utf-8'))
  const eps = spec.endpoints || []

  for (const ep of eps) {
    if (typeof ep !== 'object') continue
    if ((ep.path || '').endsWith(endpointPath) && ep.method === method) {
      const fields = ep.response?.fields
      if (fields && typeof fields === 'object') return Object.keys(fields)
    }
  }
  return []
}

// ─── Main processing ───

function processDomain(domainId, thunkRegistry) {
  const feMapPath = join(ANALYSIS_DIR, domainId, FE_MAP_FILE)
  if (!existsSync(feMapPath)) {
    console.log(`  [SKIP] ${domainId}: ${FE_MAP_FILE} not found`)
    return null
  }

  const feMap = JSON.parse(readFileSync(feMapPath, 'utf-8'))
  let upgraded = 0

  const endpoints = feMap.endpoints || []
  for (const ep of endpoints) {
    // [CUSTOMIZE] Field names for the thunk/function reference in your fe-map
    const funcName = ep.fe_thunk || ep.fe_function
    if (!funcName) continue

    const thunkInfo = thunkRegistry.get(funcName)
    const callerPaths = findCallers(funcName)
    if (callerPaths.length === 0 && !thunkInfo) continue

    ep.fe_callers = callerPaths.map(fp => analyzeCallerFile(fp, funcName))

    if (thunkInfo) {
      const usedFields = extractFieldUsage(funcName, thunkInfo, callerPaths)
      const ssotFields = getSsotResponseFields(domainId, thunkInfo.url, thunkInfo.method)
      const unusedFields = ssotFields.filter(f => !usedFields.includes(f))
      const transforms = extractTransforms(callerPaths, thunkInfo, usedFields)

      ep.field_usage = { used: usedFields, unused: unusedFields, transformed: transforms }
    }

    ep.ui_components = extractUIComponents(callerPaths)
    upgraded++
  }

  // Also process page_mapping structure if present
  const pageMapping = feMap.page_mapping || []
  for (const page of pageMapping) {
    const epNames = page.endpoints || page.key_endpoints || []
    for (const epName of epNames) {
      if (typeof epName !== 'string') continue
      const callerPaths = findCallers(epName)
      if (callerPaths.length > 0 && !page.fe_callers) {
        page.fe_callers = callerPaths.map(fp => analyzeCallerFile(fp, epName))
      }
    }
  }

  console.log(`  [OK] ${domainId}: ${upgraded}/${endpoints.length} endpoints enriched`)

  if (!isDryRun) {
    writeFileSync(feMapPath, JSON.stringify(feMap, null, 2) + '\n')
  }

  return feMap
}

// ─── Entry Point ───

console.log('Frontend field-level analysis starting\n')
console.log(`  FE_ROOT:      ${FE_ROOT}`)
console.log(`  ANALYSIS_DIR: ${ANALYSIS_DIR}`)
console.log(`  FE_MAP_FILE:  ${FE_MAP_FILE}\n`)

const thunkRegistry = parseThunks()

const domains = readdirSync(ANALYSIS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(ANALYSIS_DIR, d.name, FE_MAP_FILE)))
  .map(d => d.name)

console.log(`\nDomains found: ${domains.join(', ')}\n`)

const targetDomains = domainFilter ? [domainFilter] : domains

for (const domain of targetDomains) {
  console.log(`--- ${domain} ---`)
  processDomain(domain, thunkRegistry)
}

console.log('\nDone!')
if (isDryRun) console.log('  (--dry-run: no files were modified)')
