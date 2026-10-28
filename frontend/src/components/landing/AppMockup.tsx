import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/i18n'

/** Semanas del ciclo de ejemplo: 6 de vegetativo + 8 de floracion. Estamos en la primera de floracion. */
const VEGE_WEEKS = 6
const FLORA_WEEKS = 8
const CURRENT = VEGE_WEEKS

interface TaskRowProps {
  cls: 'lp-mock-a' | 'lp-mock-b' | 'lp-mock-c'
  label: string
  sub: string
}

function TaskRow({ cls, label, sub }: TaskRowProps) {
  return (
    <div className={cls} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
      <span className="lp-mock-check"><Icon name="check" className="w-3 h-3" strokeWidth={3} /></span>
      <div className="lp-mock-label" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      </div>
    </div>
  )
}

function Chip({ children, className, style }: { children: React.ReactNode; className: string; style: React.CSSProperties }) {
  return (
    <div className={`lp-float lp-chipf ${className}`} style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12, background: 'rgba(20,26,18,0.92)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 30px rgba(0,0,0,0.45)', fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(6px)', ...style }}>
      {children}
    </div>
  )
}

/** Pantalla "Hoy" de la app, armada a mano para la landing (no usa stores ni datos reales). */
export function AppMockup() {
  const { t } = useTranslation()
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto' }} data-testid="app-mockup">
      <div className="lp-phone">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontSize: 26, fontWeight: 560, color: '#fff', letterSpacing: '-0.02em' }}>{t('landing.mock_today')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#D9A441' }}>
            <Icon name="flame" className="w-4 h-4" /> 12
          </span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Strawberry Soda</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#D9A441', background: 'rgba(217,164,65,0.14)', border: '1px solid rgba(217,164,65,0.3)', borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap' }}>{t('landing.mock_meta')}</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }} aria-hidden="true">
            {Array.from({ length: VEGE_WEEKS + FLORA_WEEKS }, (_, i) => {
              const flora = i >= VEGE_WEEKS
              const done = i < CURRENT
              const now = i === CURRENT
              return (
                <span
                  key={i}
                  className={now ? 'lp-pulse' : undefined}
                  style={{
                    flex: 1, height: now ? 10 : 6, alignSelf: 'center', borderRadius: 99,
                    background: flora ? '#D9A441' : '#5CC76C',
                    opacity: done ? 0.95 : now ? 1 : 0.22,
                    boxShadow: now ? '0 0 14px rgba(217,164,65,0.8)' : undefined,
                  }}
                />
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TaskRow cls="lp-mock-a" label={t('landing.mock_t1')} sub={t('landing.mock_t1s')} />
          <TaskRow cls="lp-mock-b" label={t('landing.mock_t2')} sub={t('landing.mock_t2s')} />
          <TaskRow cls="lp-mock-c" label={t('landing.mock_t3')} sub={t('landing.mock_t3s')} />
        </div>
      </div>

      <Chip className="" style={{ top: 38, left: -18 }}>
        <span style={{ color: '#5CC76C' }}>EC</span> 1,2
      </Chip>
      <Chip className="lp-float-b" style={{ top: 170, right: -22 }}>
        <span style={{ color: '#5CC76C' }}>pH</span> 6,2
      </Chip>
      <Chip className="lp-float-c" style={{ bottom: 46, left: -26 }}>
        <Icon name="bolt" className="w-4 h-4" /> <span style={{ color: '#D9A441' }}>+30 XP</span>
      </Chip>
    </div>
  )
}
