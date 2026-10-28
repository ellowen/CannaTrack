import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useUserStore } from '@/store/userStore'
import { REVEGETAR_TABLE } from '@/data/revegetar-table'
import type { NutritionWeek } from '@/types/plant'

/** Vegetativo (6 semanas) + floracion (8 semanas) de la tabla REVEGETAR. */
const VEGE_DAYS = 42
const TOTAL_DAYS = 98
const GREEN = '#5CC76C'
const GOLD = '#D9A441'
const LINE_COLORS: Record<string, string> = { BIO: '#5CC76C', FUEL: '#6EA8FE', LIFE: '#B497FF', ECO: '#E8B24A' }
/** Dias a los que saltan los atajos: una etapa de cada tramo del ciclo. */
const JUMPS = [
  { stage: 'rooting', day: 3 },
  { stage: 'growth', day: 24 },
  { stage: 'stretch', day: 49 },
  { stage: 'flushing', day: 94 },
] as const

function weekFor(day: number): NutritionWeek {
  const vege = day < VEGE_DAYS
  const weeks = vege ? REVEGETAR_TABLE.vegeWeeks : REVEGETAR_TABLE.floraWeeks
  const rel = vege ? day : day - VEGE_DAYS
  return weeks.find((w) => rel >= w.dayStart && rel < w.dayEnd) ?? weeks[weeks.length - 1]
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Demo del calendario con la tabla REVEGETAR real: el control recorre el ciclo y muestra la
 * etapa, el EC, el pH y los productos con dosis de esa semana. Al entrar en pantalla se mueve
 * solo hasta la floracion para mostrar de que se trata, y se detiene en cuanto el usuario lo toca.
 */
export default function CycleDemo() {
  const { t } = useTranslation()
  const language = useUserStore((s) => s.language)
  const [day, setDay] = useState(0)
  const touched = useRef(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || reducedMotion()) return
    let timer: number | undefined
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      timer = window.setInterval(() => {
        if (touched.current) { window.clearInterval(timer); return }
        setDay((d) => {
          if (d >= 62) window.clearInterval(timer)
          return Math.min(62, d + 1)
        })
      }, 70)
    }, { threshold: 0.5 })
    io.observe(el)
    return () => { io.disconnect(); if (timer) window.clearInterval(timer) }
  }, [])

  const choose = (n: number) => { touched.current = true; setDay(n) }

  const week = weekFor(day)
  const flora = week.cycle === 'flora'
  const accent = flora ? GOLD : GREEN
  const locale = language === 'es' ? 'es-AR' : 'en-US'
  const num = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 })
  const range = (a: number, b: number) => (a === b ? num(a) : `${num(a)} - ${num(b)}`)
  const cut = (VEGE_DAYS / (TOTAL_DAYS - 1)) * 100

  return (
    <div ref={sectionRef} style={{ ['--demo-accent' as string]: accent }}>
      <div className="lp-card" style={{ padding: 0, overflow: 'hidden', borderColor: `${accent}44`, transition: 'border-color 0.4s' }}>
        <div className="lp-demo" style={{ padding: 'clamp(20px, 3vw, 36px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                <span
                  data-testid="demo-day"
                  style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontSize: 'clamp(64px, 9vw, 108px)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.04em', color: '#fff', fontVariantNumeric: 'tabular-nums' }}
                >
                  {day + 1}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 600 }}>{t('landing.demo_day_of', { n: TOTAL_DAYS })}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <span style={{ background: `${accent}22`, border: `1px solid ${accent}66`, color: accent, borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.3s' }}>
                  {flora ? t('landing.demo_flora') : t('landing.demo_vege')} · {flora ? 'F' : 'S'}{week.week}
                </span>
                <span data-testid="demo-stage" style={{ color: '#fff', fontSize: 15, fontWeight: 600, alignSelf: 'center' }}>{t(`landing.stage_${week.stage}`)}</span>
              </div>
            </div>

            <div>
              <input
                type="range"
                className="lp-range"
                min={0}
                max={TOTAL_DAYS - 1}
                step={1}
                value={day}
                aria-label={t('landing.demo_slider')}
                onChange={(e) => choose(Number(e.target.value))}
                onPointerDown={() => { touched.current = true }}
                style={{ background: `linear-gradient(90deg, ${GREEN} 0%, ${GREEN} ${cut}%, ${GOLD} ${cut}%, ${GOLD} 100%)`, opacity: 0.95 }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                {JUMPS.map((j) => (
                  <button key={j.stage} type="button" className="lp-chip" onClick={() => choose(j.day)}>
                    {t(`landing.stage_${j.stage}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { k: 'EC', v: range(week.ecMin, week.ecMax) },
                { k: 'pH', v: range(week.phMin, week.phMax) },
              ].map((m) => (
                <div key={m.k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', transition: 'color 0.3s' }}>{m.k}</div>
                  <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{m.v}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{t('landing.demo_products')}</div>
              {week.products.length === 0 ? (
                <p data-testid="demo-water" style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>{t('landing.demo_water')}</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {week.products.map((p) => (
                    <li key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: LINE_COLORS[p.line] ?? '#fff', border: `1px solid ${LINE_COLORS[p.line] ?? '#fff'}55`, borderRadius: 6, padding: '2px 6px', minWidth: 42, textAlign: 'center' }}>{p.line}</span>
                      <span style={{ color: '#fff', fontWeight: 600, flex: 1 }}>{p.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{range(p.minDose, p.maxDose)} {p.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <Link to="/signup" className="lp-btn" style={{ fontSize: 15, padding: '14px 30px' }}>{t('landing.demo_cta')}</Link>
      </div>
    </div>
  )
}
