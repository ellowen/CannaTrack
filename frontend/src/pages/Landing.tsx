import { lazy, Suspense, useState, useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useUserStore } from '@/store/userStore'
import type { Language } from '@/i18n'
import { GrowthLines } from '@/components/landing/GrowthLines'
import { LandingStem } from '@/components/landing/LandingStem'
import { AppMockup } from '@/components/landing/AppMockup'
import { FeatureBento } from '@/components/landing/Bento'
import '@/components/landing/landing.css'
import { LogoMark } from '@/components/ui'
import {
  ChartIcon,
  SignalOffIcon, SmartphoneIcon, TrophyIcon, ShieldIcon,
  CheckBadgeIcon, LeafBadgeIcon, SproutIcon,
} from '@/components/landing/LandingIcons'

// La demo trae la tabla REVEGETAR completa: va en su propio chunk para no cargarla en el primer paint.
const CycleDemo = lazy(() => import('@/components/landing/CycleDemo'))

// ─── Colores de la landing (siempre dark) ────────────────────────────────────
const C = {
  green:    '#5CC76C',
  greenDim: 'rgba(92,199,108,0.12)',
  white:    '#FFFFFF',
  ink1:     'rgba(255,255,255,0.92)',
  ink2:     'rgba(255,255,255,0.60)',
  ink3:     'rgba(255,255,255,0.35)',
  card:     'rgba(255,255,255,0.03)',
  border:   'rgba(255,255,255,0.07)',
}

interface SectionHeadProps {
  eyebrow: string
  title: ReactNode
  sub?: string
  marginBottom?: number
}

function SectionHead({ eyebrow, title, sub, marginBottom = 56 }: SectionHeadProps) {
  return (
    <div style={{ textAlign: 'center', marginBottom }}>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2 className="lp-h2">{title}</h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { t } = useTranslation()
  const language = useUserStore(s => s.language)
  const setLanguage = useUserStore(s => s.setLanguage)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showSticky, setShowSticky] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Aparicion al scroll: un solo observer para todo lo marcado con .lp-reveal.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('.lp-reveal'))
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach(el => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      })
    }, { threshold: 0.12 })
    items.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  // CTA fijo en mobile: aparece cuando el del hero ya quedo atras.
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 640)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const NAV_LINKS = [
    { label: t('landing.nav_how'),      href: '#como-funciona' },
    { label: t('landing.nav_features'), href: '#funcionalidades' },
    { label: t('landing.nav_pricing'),  href: '#precios' },
    { label: t('landing.nav_faq'),      href: '#faq' },
  ]

  // Cada nota del cuaderno (problema) tiene su respuesta resuelta en la app.
  const PROBLEMS = [
    { q: t('landing.p1_q'), a: t('landing.p1_a'), fix: t('landing.ba_a1'), rot: -1.4 },
    { q: t('landing.p2_q'), a: t('landing.p2_a'), fix: t('landing.ba_a2'), rot: 1.1 },
    { q: t('landing.p3_q'), a: t('landing.p3_a'), fix: t('landing.ba_a3'), rot: -0.8 },
    { q: t('landing.p4_q'), a: t('landing.p4_a'), fix: t('landing.ba_a4'), rot: 1.5 },
  ]

  // Un solo color de marca — la progresion se comunica con opacidad, no con hue.
  const STEPS = [
    { num: '01', title: t('landing.step1_title'), desc: t('landing.step1_desc'), opacity: 1 },
    { num: '02', title: t('landing.step2_title'), desc: t('landing.step2_desc'), opacity: 0.85 },
    { num: '03', title: t('landing.step3_title'), desc: t('landing.step3_desc'), opacity: 0.7 },
    { num: '04', title: t('landing.step4_title'), desc: t('landing.step4_desc'), opacity: 0.55 },
  ]

  const FREE_FEATURES = [
    t('landing.pf1'), t('landing.pf2'), t('landing.pf3'),
    t('landing.pf4'), t('landing.pf5'), t('landing.pf6'),
    t('landing.pf7'), t('landing.pf8'), t('landing.pf9'),
  ]

  const PRO_FEATURES = [
    t('landing.pp1'), t('landing.pp2'), t('landing.pp3'),
    t('landing.pp5'), t('landing.pp6'),
    t('landing.pp7'), t('landing.pp8'),
  ]

  const WHY_PRINCIPLES = [
    { Icon: LeafBadgeIcon,  title: t('landing.why_p1_title'), desc: t('landing.why_p1_desc') },
    { Icon: ChartIcon,      title: t('landing.why_p2_title'), desc: t('landing.why_p2_desc') },
    { Icon: SproutIcon,     title: t('landing.why_p3_title'), desc: t('landing.why_p3_desc') },
  ]

  const FAQS = [
    { q: t('landing.faq1_q'), a: t('landing.faq1_a') },
    { q: t('landing.faq2_q'), a: t('landing.faq2_a') },
    { q: t('landing.faq3_q'), a: t('landing.faq3_a') },
    { q: t('landing.faq4_q'), a: t('landing.faq4_a') },
    { q: t('landing.faq5_q'), a: t('landing.faq5_a') },
    { q: t('landing.faq6_q'), a: t('landing.faq6_a') },
    { q: t('landing.faq7_q'), a: t('landing.faq7_a') },
  ]

  const TRUST_BADGES = [
    { Icon: CheckBadgeIcon, label: t('landing.trust_revegetar') },
    { Icon: SignalOffIcon,  label: t('landing.trust_offline') },
    { Icon: SmartphoneIcon, label: t('landing.trust_pwa') },
    { Icon: TrophyIcon,     label: t('landing.trust_gamif') },
    { Icon: ShieldIcon,     label: t('landing.trust_privacy') },
  ]

  return (
    <div ref={rootRef} className="lp-root">
      <div className="lp-tint" aria-hidden="true" />
      <LandingStem />

      <div className="lp-content">

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,17,12,0.82)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <LogoMark size={32} />
            <span style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontWeight: 600, fontSize: '20px', color: C.white, letterSpacing: '-0.2px' }}>
              Culti<span style={{ color: C.green }}>Track</span>
            </span>
          </a>

          <nav style={{ alignItems: 'center', gap: '32px' }} className="hidden md:flex">
            {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="lp-link">{l.label}</a>)}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language switcher — siempre visible */}
            <button
              onClick={() => setLanguage((language === 'es' ? 'en' : 'es') as Language)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: C.ink2, fontSize: '12px', fontWeight: 700, padding: '5px 10px', cursor: 'pointer', letterSpacing: '0.05em' }}
            >
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <Link to="/login" style={{ color: C.ink2, fontSize: '13px', fontWeight: 500, textDecoration: 'none' }} className="hidden md:block">
              {t('landing.nav_login')}
            </Link>
            <Link to="/signup" className="lp-btn lp-nav-cta" style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
              {t('landing.nav_cta')}
            </Link>
            <button onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'none', border: 'none', color: C.ink2, cursor: 'pointer', padding: '4px', flexDirection: 'column', gap: '4px' }}
              className="flex md:hidden" aria-label={t('landing.nav_menu')}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '20px', height: '2px', background: 'currentColor', borderRadius: '1px', transition: 'all 0.2s',
                  ...(menuOpen && i === 0 ? { transform: 'rotate(45deg) translate(4px, 4px)' } : {}),
                  ...(menuOpen && i === 1 ? { opacity: 0 } : {}),
                  ...(menuOpen && i === 2 ? { transform: 'rotate(-45deg) translate(4px, -4px)' } : {}),
                }} />
              ))}
            </button>
          </div>
        </div>

        {/* Menu mobile — compacto */}
        {menuOpen && (
          <div style={{ background: 'rgba(13,17,12,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 20px 12px' }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="lp-link"
                style={{ display: 'block', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}
                onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/login" style={{ color: C.ink2, fontSize: '13px', textDecoration: 'none', flex: 1 }}>{t('landing.nav_login')}</Link>
              <Link to="/signup" className="lp-btn" style={{ fontSize: '13px', padding: '9px 16px', borderRadius: '10px' }}>
                {t('landing.nav_cta')}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section data-stem style={{ position: 'relative', padding: '72px 24px 64px', minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: '56px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="lp-reveal" style={{ flex: '1', minWidth: '280px', maxWidth: '600px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: C.greenDim, border: '1px solid rgba(92,199,108,0.25)', borderRadius: '100px', padding: '5px 12px', marginBottom: '26px' }}>
                <span className="lp-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green }} />
                <span style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>{t('landing.badge')}</span>
              </div>

              <h1 style={{ marginBottom: '22px' }}>
                {t('landing.hero_h1_line1')}
                <br />
                <span className="lp-em" style={{ color: C.green }}>
                  {t('landing.hero_h1_line2')}
                </span>
              </h1>

              <p style={{ fontSize: '18px', lineHeight: 1.65, color: C.ink2, maxWidth: '500px', marginBottom: '36px' }}>
                {t('landing.hero_sub')}{' '}
                <strong style={{ color: C.ink1 }}>{t('landing.hero_sub_bold')}</strong>
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link to="/signup" className="lp-btn" style={{ fontSize: '16px', padding: '15px 30px' }}>
                  {t('landing.hero_cta')}
                </Link>
                <a href="#como-funciona" className="lp-btn-ghost" style={{ fontSize: '16px', padding: '15px 26px' }}>
                  {t('landing.hero_see_how')}
                </a>
              </div>
            </div>

            <div className="lp-reveal" style={{ '--i': 2, flexShrink: 0, width: '100%', maxWidth: '420px', position: 'relative' } as React.CSSProperties}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.85, pointerEvents: 'none', transform: 'scale(1.6) translateY(-2%)' }}>
                <GrowthLines variant="hero" draw />
              </div>
              <AppMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '18px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'center' }}>
          {TRUST_BADGES.map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.ink2, fontSize: '13px', fontWeight: 500 }}>
              <b.Icon size={16} /><span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEMA: el cuaderno contra la app ───────────────────────────── */}
      <section data-stem style={{ padding: '110px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div className="lp-reveal">
            <SectionHead eyebrow={t('landing.problem_section')} title={t('landing.problem_h2')} sub={t('landing.problem_sub')} />
          </div>

          <div className="lp-ba">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="lp-reveal" style={{ color: '#D9A441', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{t('landing.ba_before')}</p>
              {PROBLEMS.map((p, i) => (
                <div key={p.q} className="lp-note lp-reveal" style={{ '--rot': `${p.rot}deg`, '--i': i } as React.CSSProperties}>
                  <p style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontStyle: 'italic', color: C.white, fontSize: '19px', lineHeight: 1.3, margin: '0 0 8px' }}>{p.q}</p>
                  <p style={{ color: C.ink2, fontSize: '13px', lineHeight: 1.55, margin: 0 }}>{p.a}</p>
                </div>
              ))}
            </div>

            <svg className="lp-ba-arrow lp-reveal" width="56" height="24" viewBox="0 0 56 24" aria-hidden="true" style={{ '--i': 2 } as React.CSSProperties}>
              <path d="M2 12h48M40 3l10 9-10 9" fill="none" stroke={C.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="lp-reveal" style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{t('landing.ba_after')}</p>
              {PROBLEMS.map((p, i) => (
                <div key={p.fix} className="lp-reveal" style={{ '--i': i + 1, display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(92,199,108,0.07)', border: '1px solid rgba(92,199,108,0.22)', borderRadius: '16px', padding: '16px 18px', minHeight: '86px' } as React.CSSProperties}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: C.green, color: '#0D110C', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                  </span>
                  <p style={{ color: C.ink1, fontSize: '15px', fontWeight: 600, lineHeight: 1.45, margin: 0 }}>{p.fix}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-reveal" style={{ textAlign: 'center', marginTop: '72px' }}>
            <p style={{ color: C.ink3, fontSize: '14px', marginBottom: '12px' }}>{t('landing.problem_transition')}</p>
            <h3 style={{ fontSize: 'clamp(24px, 3.4vw, 36px)', margin: 0 }}>{t('landing.problem_solution')}</h3>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────────── */}
      <section id="como-funciona" data-stem style={{ padding: '90px 24px 100px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div className="lp-reveal"><SectionHead eyebrow={t('landing.how_section')} title={t('landing.how_h2')} marginBottom={60} /></div>
          <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
            {STEPS.map((step, i) => (
              <div key={step.num} className="lp-reveal" style={{ display: 'flex', gap: '24px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `rgba(92,199,108,${step.opacity * 0.16})`, border: `2px solid rgba(92,199,108,${step.opacity * 0.55})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: C.green, opacity: 0.5 + step.opacity * 0.5, flexShrink: 0 }}>
                    {step.num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, width: '1px', background: `linear-gradient(to bottom, rgba(92,199,108,${step.opacity * 0.5}), transparent)`, marginTop: '4px', minHeight: '48px' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? '40px' : '0', paddingTop: '10px' }}>
                  <h3 style={{ fontSize: '21px', margin: '0 0 8px' }}>{step.title}</h3>
                  <p style={{ color: C.ink2, fontSize: '15px', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO DEL CICLO ────────────────────────────────────────────────── */}
      <section id="demo" data-stem style={{ padding: '110px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="lp-reveal"><SectionHead eyebrow={t('landing.demo_section')} title={t('landing.demo_h2')} sub={t('landing.demo_sub')} /></div>
          <Suspense fallback={<div style={{ minHeight: '420px' }} />}>
            <CycleDemo />
          </Suspense>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ───────────────────────────────────────────────── */}
      <section id="funcionalidades" data-stem style={{ padding: '60px 24px 110px', ['--lp-eyebrow' as string]: '#D9A441' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div className="lp-reveal"><SectionHead eyebrow={t('landing.feat_section')} title={t('landing.feat_h2')} sub={t('landing.feat_sub')} /></div>
          <FeatureBento />
        </div>
      </section>

      {/* ── B2B (banda corta: el marketplace todavia no existe) ───────────── */}
      <section data-stem style={{ padding: '56px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="lp-reveal" style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: '280px', maxWidth: '680px' }}>
            <span style={{ background: 'rgba(217,164,65,0.14)', color: '#D9A441', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '14px' }}>
              {t('landing.b2b_badge')}
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 3.2vw, 34px)', margin: '0 0 10px', lineHeight: 1.15 }}>{t('landing.b2b_h2')}</h2>
            <p style={{ color: C.ink2, fontSize: '15px', lineHeight: 1.65, margin: 0 }}>{t('landing.b2b_desc')}</p>
          </div>
          <a href="mailto:cultitrack@gmail.com?subject=Quiero listar mi tabla en CultiTrack" className="lp-btn-ghost"
            style={{ fontSize: '14px', padding: '13px 24px', color: '#D9A441', borderColor: 'rgba(217,164,65,0.35)' }}>
            {t('landing.b2b_cta')}
          </a>
        </div>
      </section>

      {/* ── PRECIOS ───────────────────────────────────────────────────────── */}
      <section id="precios" data-stem style={{ padding: '110px 24px', ['--lp-eyebrow' as string]: '#D9A441' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div className="lp-reveal"><SectionHead eyebrow={t('landing.price_section')} title={t('landing.price_h2')} sub={t('landing.price_sub')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div className="lp-reveal" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: C.ink2, fontSize: '13px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('landing.free_label')}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontSize: '52px', fontWeight: 500, color: C.white, letterSpacing: '-2px' }}>{t('landing.free_price')}</span>
                  <span style={{ color: C.ink3, fontSize: '14px' }}>{t('landing.free_period')}</span>
                </div>
                <p style={{ color: C.ink3, fontSize: '13px', margin: '8px 0 0' }}>{t('landing.free_note')}</p>
              </div>
              <Link to="/signup" style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.07)', color: C.white, border: `1px solid ${C.border}`, fontWeight: 700, fontSize: '14px', padding: '12px', borderRadius: '12px', textDecoration: 'none', marginBottom: '28px' }}>
                {t('landing.free_cta')}
              </Link>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '10px', color: C.ink2, fontSize: '13px' }}>
                    <span style={{ color: C.green, flexShrink: 0, fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal" style={{ '--i': 1, background: 'linear-gradient(145deg, rgba(217,164,65,0.10), rgba(92,199,108,0.04))', border: '1px solid rgba(217,164,65,0.35)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#D9A441', color: '#0D110C', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase' }}>
                {t('landing.pro_badge')}
              </div>
              <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(217,164,65,0.16), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ marginBottom: '24px', position: 'relative' }}>
                <p style={{ color: '#D9A441', fontSize: '13px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('landing.pro_label')}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontSize: '52px', fontWeight: 500, color: C.white, letterSpacing: '-2px' }}>{t('landing.pro_price')}</span>
                  <span style={{ color: C.ink3, fontSize: '14px' }}>{t('landing.pro_period')}</span>
                </div>
                <p style={{ color: C.ink3, fontSize: '13px', margin: '8px 0 0' }}>{t('landing.pro_note')}</p>
              </div>
              <Link to="/signup" className="lp-btn" style={{ display: 'block', textAlign: 'center', fontSize: '14px', padding: '12px', borderRadius: '12px', marginBottom: '28px', position: 'relative' }}>
                {t('landing.pro_cta')}
              </Link>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px', position: 'relative' }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '10px', color: C.ink2, fontSize: '13px' }}>
                    <span style={{ color: '#D9A441', flexShrink: 0, fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── POR QUE CULTITRACK ───────────────────────────────────────────── */}
      <section data-stem style={{ padding: '90px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', ['--lp-eyebrow' as string]: '#D9A441' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div className="lp-reveal"><SectionHead eyebrow={t('landing.why_section')} title={t('landing.why_h2')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {WHY_PRINCIPLES.map((p, i) => (
              <div key={p.title} className="lp-card lp-reveal" style={{ padding: '32px', '--i': i } as React.CSSProperties}>
                <div style={{ color: '#D9A441', marginBottom: '16px' }}><p.Icon size={28} /></div>
                <h3 style={{ fontSize: '21px', margin: '0 0 10px' }}>{p.title}</h3>
                <p style={{ color: C.ink2, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" data-stem style={{ padding: '110px 24px', ['--lp-eyebrow' as string]: '#D9A441' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div className="lp-reveal"><SectionHead eyebrow={t('landing.faq_section')} title={t('landing.faq_h2')} marginBottom={48} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="lp-reveal" style={{ background: openFaq === i ? 'rgba(217,164,65,0.05)' : C.card, border: `1px solid ${openFaq === i ? 'rgba(217,164,65,0.28)' : C.border}`, borderRadius: '16px', overflow: 'hidden', transition: 'background 0.2s, border-color 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', textAlign: 'left', gap: '12px' }}>
                  <span style={{ color: C.white, fontSize: '15px', fontWeight: 600, lineHeight: 1.4 }}>{faq.q}</span>
                  <span aria-hidden="true" style={{ color: openFaq === i ? '#D9A441' : C.ink3, fontSize: '18px', flexShrink: 0, transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', display: 'block', lineHeight: 1 }}>+</span>
                </button>
                <div id={`faq-answer-${i}`} className="faq-content" style={{ maxHeight: openFaq === i ? '260px' : '0', opacity: openFaq === i ? 1 : 0 }}>
                  <p style={{ color: C.ink2, fontSize: '14px', lineHeight: 1.7, padding: '0 20px 18px', margin: 0 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL: la flor ────────────────────────────────────────────── */}
      <section data-stem style={{ padding: '80px 24px 110px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="lp-reveal" style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(217,164,65,0.10), rgba(10,26,13,0.8))', border: '1px solid rgba(217,164,65,0.28)', borderRadius: '32px', padding: '60px 36px', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden="true" style={{ position: 'absolute', top: '-30px', right: '-10px', width: '200px', height: '200px', opacity: 0.4, pointerEvents: 'none' }}>
              <GrowthLines variant="hero" opacity={0.3} />
            </div>
            <div style={{ color: '#D9A441', marginBottom: '16px', display: 'flex', justifyContent: 'center', position: 'relative' }}><LeafBadgeIcon size={44} /></div>
            <h2 style={{ fontSize: 'clamp(30px, 4.4vw, 50px)', lineHeight: 1.08, margin: '0 0 16px', position: 'relative' }}>{t('landing.cta_h2')}</h2>
            <p style={{ color: C.ink2, fontSize: '17px', lineHeight: 1.65, margin: '0 0 36px', maxWidth: '500px', display: 'inline-block', position: 'relative' }}>{t('landing.cta_desc')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', position: 'relative' }}>
              <Link to="/signup" className="lp-btn" style={{ fontSize: '16px', padding: '16px 36px' }}>
                {t('landing.cta_main')}
              </Link>
              <p style={{ color: C.ink3, fontSize: '12px', margin: 0 }}>{t('landing.cta_disclaimer')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '40px', marginBottom: '40px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <LogoMark size={32} />
                <span style={{ fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif", fontWeight: 600, fontSize: '20px', color: C.white, letterSpacing: '-0.2px' }}>Culti<span style={{ color: C.green }}>Track</span></span>
              </div>
              <p style={{ color: C.ink3, fontSize: '13px', maxWidth: '220px', lineHeight: 1.6, margin: 0 }}>{t('landing.footer_tagline')}</p>
            </div>
            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: C.white, fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>{t('landing.footer_product')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a href="#como-funciona" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.nav_how')}</a>
                  <a href="#funcionalidades" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.nav_features')}</a>
                  <a href="#precios" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.nav_pricing')}</a>
                  <a href="#faq" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.nav_faq')}</a>
                </div>
              </div>
              <div>
                <p style={{ color: C.white, fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>{t('landing.footer_access')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Link to="/signup" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.footer_create')}</Link>
                  <Link to="/login" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.footer_login')}</Link>
                  <a href="mailto:cultitrack@gmail.com" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.footer_contact')}</a>
                  <a href="mailto:cultitrack@gmail.com?subject=Quiero listar mi marca" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.footer_b2b')}</a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', paddingBottom: '56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: C.ink3, fontSize: '12px', margin: 0 }}>© {new Date().getFullYear()} {t('landing.footer_copy')}</p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <a href="/privacy.html" className="lp-link" style={{ fontSize: '12px' }}>{t('landing.footer_privacy')}</a>
              <a href="/terms.html" className="lp-link" style={{ fontSize: '12px' }}>{t('landing.footer_terms')}</a>
              <span style={{ fontSize: '12px', color: C.ink3 }}>{t('landing.footer_age')}</span>
            </div>
          </div>
        </div>
      </footer>

      </div>

      {/* ── CTA fijo (solo mobile) ───────────────────────────────────────── */}
      <div className={`lp-sticky${showSticky ? ' show' : ''}`} data-testid="sticky-cta" aria-hidden={!showSticky}>
        <Link to="/signup" className="lp-btn" tabIndex={showSticky ? 0 : -1} style={{ display: 'block', textAlign: 'center', fontSize: '15px', padding: '14px' }}>
          {t('landing.sticky_cta')}
        </Link>
      </div>
    </div>
  )
}
