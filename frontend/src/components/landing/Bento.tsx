import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import Icon from '@/components/ui/Icon'
import { CalendarIcon, SproutIcon, SignalOffIcon, CameraIcon, FlaskIcon, TrophyIcon } from '@/components/landing/LandingIcons'

const GREEN = '#5CC76C'
const GOLD = '#D9A441'
const TERRA = '#D8715C'

interface TileProps {
  className: string
  icon: ReactNode
  title: string
  desc: string
  delay: number
  children: ReactNode
}

function Tile({ className, icon, title, desc, delay, children }: TileProps) {
  return (
    <div className={`lp-card lp-bento-tile lp-reveal ${className}`} style={{ ['--i' as string]: delay }}>
      <div style={{ flex: 1, minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      <div>
        <div style={{ color: GREEN, marginBottom: 10 }}>{icon}</div>
        <h3 style={{ fontSize: 19, margin: '0 0 6px' }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
      </div>
    </div>
  )
}

/** Mes de ejemplo: vegetativo, floracion y cosecha coloreados como en el calendario de la app. */
function CalendarVignette() {
  const { t } = useTranslation()
  const cells = Array.from({ length: 35 }, (_, i) => {
    if (i < 3) return { c: 'transparent', o: 0 }
    if (i < 17) return { c: GREEN, o: 0.85 }
    if (i < 31) return { c: GOLD, o: 0.85 }
    if (i === 31) return { c: TERRA, o: 1 }
    return { c: 'transparent', o: 0 }
  })
  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ aspectRatio: '1.35', borderRadius: 9, background: c.o ? c.c : 'rgba(255,255,255,0.03)', opacity: c.o || 1, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: c.o ? '#0D110C' : 'rgba(255,255,255,0.25)' }}>
            {i >= 3 && i < 32 ? i - 2 : ''}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
        {[[GREEN, t('landing.demo_vege')], [GOLD, t('landing.demo_flora')], [TERRA, t('landing.bento_harvest')]].map(([c, l]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: c, display: 'block' }} />{l}</span>
        ))}
      </div>
    </div>
  )
}

function OfflineVignette() {
  const { t } = useTranslation()
  const pill = (bg: string, fg: string, text: string, pulse = false) => (
    <span className={pulse ? 'lp-pulse' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, color: fg, borderRadius: 99, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>
      <i style={{ width: 7, height: 7, borderRadius: 99, background: fg, display: 'block' }} />{text}
    </span>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      {pill('rgba(216,113,92,0.16)', TERRA, t('landing.bento_offline_off'), true)}
      <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true"><path d="M1 6h24M20 1l5 5-5 5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {pill('rgba(92,199,108,0.16)', GREEN, t('landing.bento_offline_synced'))}
    </div>
  )
}

function GeneticsVignette() {
  const { t } = useTranslation()
  // [semanas de vegetativo, semanas de floracion]
  const rows: [string, number, number][] = [
    [t('landing.bento_gen_fem'), 6, 8],
    [t('landing.bento_gen_auto'), 5, 6],
    [t('landing.bento_gen_reg'), 7, 9],
  ]
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(([name, v, f]) => (
        <div key={name}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 5, fontWeight: 600 }}>{name}</div>
          <div style={{ display: 'flex', gap: 2, height: 8 }}>
            {Array.from({ length: v + f }, (_, i) => (
              <span key={i} style={{ flex: 1, borderRadius: 99, background: i < v ? GREEN : GOLD, opacity: 0.85 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DiaryVignette() {
  const { t } = useTranslation()
  const entries = [
    { w: t('landing.bento_diary_1'), g: 'linear-gradient(135deg, #2F7A3C, #1A3F20)' },
    { w: t('landing.bento_diary_2'), g: 'linear-gradient(135deg, #C79A3B, #6B4F14)' },
  ]
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map((e) => (
        <div key={e.w} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 10 }}>
          <span style={{ width: 46, height: 46, borderRadius: 10, background: e.g, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>{e.w}</span>
        </div>
      ))}
    </div>
  )
}

function SparkVignette() {
  return (
    <svg viewBox="0 0 220 90" width="100%" style={{ maxWidth: 280 }} aria-hidden="true">
      <path className="lp-draw" pathLength={1} d="M 4 70 C 30 66, 50 52, 76 50 S 120 34, 146 28 S 190 16, 216 12" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
      <path className="lp-draw" pathLength={1} style={{ animationDelay: '0.3s' }} d="M 4 40 C 30 42, 56 36, 80 40 S 124 46, 150 42 S 192 38, 216 40" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <circle className="lp-pop" cx="216" cy="12" r="5" fill={GREEN} />
      <circle className="lp-pop" cx="216" cy="40" r="5" fill={GOLD} />
    </svg>
  )
}

function LevelVignette() {
  const { t } = useTranslation()
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 99, background: 'rgba(92,199,108,0.16)', border: `2px solid ${GREEN}`, color: GREEN, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18 }}>4</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{t('landing.bento_level')}</div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: GREEN, borderRadius: 99 }} className="lp-grow" />
          </div>
        </div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: GOLD, fontWeight: 700, fontSize: 14 }}>
        <Icon name="flame" className="w-5 h-5" /> 12 {t('landing.bento_streak')}
      </div>
    </div>
  )
}

/** Funcionalidades en grilla irregular: cada celda muestra la funcion, no solo la nombra. */
export function FeatureBento() {
  const { t } = useTranslation()
  return (
    <div className="lp-bento">
      <Tile className="lp-b4" delay={0} icon={<CalendarIcon size={28} />} title={t('landing.feat1_title')} desc={t('landing.feat1_desc')}><CalendarVignette /></Tile>
      <Tile className="lp-b2" delay={1} icon={<SignalOffIcon size={28} />} title={t('landing.feat3_title')} desc={t('landing.feat3_desc')}><OfflineVignette /></Tile>
      <Tile className="lp-b2" delay={0} icon={<SproutIcon size={28} />} title={t('landing.feat2_title')} desc={t('landing.feat2_desc')}><GeneticsVignette /></Tile>
      <Tile className="lp-b2" delay={1} icon={<CameraIcon size={28} />} title={t('landing.feat4_title')} desc={t('landing.feat4_desc')}><DiaryVignette /></Tile>
      <Tile className="lp-b2" delay={2} icon={<FlaskIcon size={28} />} title={t('landing.feat5_title')} desc={t('landing.feat5_desc')}><SparkVignette /></Tile>
      <Tile className="lp-b6" delay={0} icon={<TrophyIcon size={28} />} title={t('landing.feat6_title')} desc={t('landing.feat6_desc')}><LevelVignette /></Tile>
    </div>
  )
}
