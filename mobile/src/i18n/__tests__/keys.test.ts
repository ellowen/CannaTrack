import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import es from '../es'
import en from '../en'

// Recorre todo mobile/app y mobile/src buscando cada t('namespace.key')
// y confirma que la clave exista de verdad en es.ts/en.ts. tsc no detecta
// esto -- i18next tipa t() de forma laxa, asi que una clave con typo
// simplemente se muestra literal en pantalla en vez de fallar el build.

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, out)
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full)
  }
  return out
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const nested of flattenKeys(v as Record<string, unknown>, path)) keys.add(nested)
    } else {
      keys.add(path)
    }
  }
  return keys
}

const root = join(__dirname, '..', '..', '..')
const files = [...walk(join(root, 'app')), ...walk(join(root, 'src'))]

// Matchea t('ns.key') y t("ns.key") con namespace.key estatico -- ignora
// template literals dinamicos (t(`tablesIndex.${id}_origin`)), esos se
// verifican a mano en el codigo que los usa.
const CALL_RE = /\bt\(\s*['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)['"]/g

const usedKeys = new Set<string>()
for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  let m: RegExpExecArray | null
  while ((m = CALL_RE.exec(content))) usedKeys.add(m[1])
}

const esKeys = flattenKeys(es)
const enKeys = flattenKeys(en)

// i18next resuelve t('ns.key', { count }) contra 'ns.key_one'/'ns.key_other'
// (plural), no contra la clave literal -- valido si cualquiera de las tres
// formas existe.
function resolves(key: string, keys: Set<string>): boolean {
  return keys.has(key) || (keys.has(`${key}_one`) && keys.has(`${key}_other`))
}

describe('i18n keys', () => {
  it('every t() call in the app resolves to a real key in es.ts', () => {
    const missing = [...usedKeys].filter((k) => !resolves(k, esKeys)).sort()
    expect(missing, `Missing from es.ts: ${missing.join(', ')}`).toEqual([])
  })

  it('every t() call in the app resolves to a real key in en.ts', () => {
    const missing = [...usedKeys].filter((k) => !resolves(k, enKeys)).sort()
    expect(missing, `Missing from en.ts: ${missing.join(', ')}`).toEqual([])
  })

  it('es.ts and en.ts have the exact same key set (no lang-specific drift)', () => {
    const onlyEs = [...esKeys].filter((k) => !enKeys.has(k)).sort()
    const onlyEn = [...enKeys].filter((k) => !esKeys.has(k)).sort()
    expect({ onlyEs, onlyEn }).toEqual({ onlyEs: [], onlyEn: [] })
  })
})
