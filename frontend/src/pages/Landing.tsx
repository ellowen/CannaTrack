import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useUserStore } from '@/store/userStore'
import type { Language } from '@/i18n'

// ─── Colores de la landing (siempre dark) ────────────────────────────────────
const C = {
  bg:       '#050E07',
  card:     'rgba(255,255,255,0.03)',
  border:   'rgba(255,255,255,0.07)',
  green:    '#3DCC63',
  greenDim: 'rgba(61,204,99,0.12)',
  greenGlow:'rgba(61,204,99,0.25)',
  white:    '#FFFFFF',
  ink1:     'rgba(255,255,255,0.92)',
  ink2:     'rgba(255,255,255,0.60)',
  ink3:     'rgba(255,255,255,0.35)',
}

// ─── Fade-in al scroll ───────────────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ─── LogoMark ────────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lp-bg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#142B18" />
          <stop offset="100%" stopColor="#050E07" />
        </radialGradient>
        <linearGradient id="lp-leaf" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBEDCF" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="42" fill="url(#lp-bg)" />
      <ellipse cx="90" cy="88" rx="62" ry="55" fill="#2EBD52" opacity="0.07" />
      <path d="M 90 28 A 62 62 0 1 1 28 90" fill="none" stroke="#3DCC63" strokeWidth="2.5" strokeLinecap="round" opacity="0.38" />
      <circle cx="28" cy="90" r="4" fill="#3DCC63" opacity="0.6" />
      <g transform="translate(90,108)" fill="url(#lp-leaf)">
        <path d="M 0 0 C -7.5 -10, -7.5 -33, 0 -44 C 7.5 -33, 7.5 -10, 0 0 Z" />
        <path transform="rotate(27)" d="M 0 0 C -6.5 -9, -6.5 -28, 0 -37 C 6.5 -28, 6.5 -9, 0 0 Z" />
        <path transform="rotate(-27)" d="M 0 0 C -6.5 -9, -6.5 -28, 0 -37 C 6.5 -28, 6.5 -9, 0 0 Z" />
        <path transform="rotate(56)" d="M 0 0 C -5 -6.5, -5 -19, 0 -26 C 5 -19, 5 -6.5, 0 0 Z" />
        <path transform="rotate(-56)" d="M 0 0 C -5 -6.5, -5 -19, 0 -26 C 5 -19, 5 -6.5, 0 0 Z" />
        <path transform="rotate(82)" d="M 0 0 C -3.5 -4.5, -3.5 -11, 0 -15 C 3.5 -11, 3.5 -4.5, 0 0 Z" />
        <path transform="rotate(-82)" d="M 0 0 C -3.5 -4.5, -3.5 -11, 0 -15 C 3.5 -11, 3.5 -4.5, 0 0 Z" />
        <line x1="0" y1="-2" x2="0" y2="-38" stroke="rgba(5,14,7,0.18)" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="-2.8" y="0" width="5.6" height="12" rx="2.8" />
      </g>
    </svg>
  )
}

// ─── Mockup telefono ─────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: '280px', flexShrink: 0 }} className="lp-float">
      <div style={{
        background: 'linear-gradient(145deg, #0d1f11, #071008)',
        borderRadius: '44px', padding: '10px',
        border: '1px solid rgba(61,204,99,0.18)',
        boxShadow: '0 0 80px rgba(61,204,99,0.08), 0 40px 100px rgba(0,0,0,0.7)',
      }}>
        <div style={{
          background: C.bg, borderRadius: '36px', overflow: 'hidden',
          height: '560px', padding: '18px 14px 0', position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
            <span style={{ color: C.ink3, fontSize: '10px', fontWeight: 600 }}>9:41</span>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              {[3, 2, 1].map(h => (
                <div key={h} style={{ width: '3px', height: `${h * 3 + 3}px`, background: C.ink3, borderRadius: '1px' }} />
              ))}
              <div style={{ width: '12px', height: '6px', border: `1px solid ${C.ink3}`, borderRadius: '2px', marginLeft: '3px' }}>
                <div style={{ width: '8px', height: '4px', background: C.green, borderRadius: '1px' }} />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: C.ink3, fontSize: '11px', margin: '0 0 2px' }}>Buenos dias, Marcos 👋</p>
            <h3 style={{ color: C.white, fontSize: '18px', fontWeight: 800, margin: 0 }}>Tu grow hoy</h3>
          </div>
          <div style={{
            background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px',
          }}>
            <span style={{ fontSize: '12px' }}>⚠️</span>
            <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 600 }}>1 tarea vencida — Riego Gelato</span>
          </div>
          <div style={{
            background: 'rgba(61,204,99,0.07)', border: '1px solid rgba(61,204,99,0.22)',
            borderRadius: '16px', padding: '12px', marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <span style={{ color: C.green, fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em' }}>NUTRICION · S3 CRECIMIENTO</span>
                <p style={{ color: C.white, fontSize: '13px', fontWeight: 700, margin: '2px 0 0' }}>Gelato #2</p>
              </div>
              <span style={{ background: C.greenDim, color: C.green, fontSize: '9px', fontWeight: 700, borderRadius: '8px', padding: '3px 8px' }}>Hoy</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['Growth 2ml/L', 'Calcium 1ml/L', 'Azospirilum 1ml/L'].map(p => (
                <span key={p} style={{ background: 'rgba(255,255,255,0.06)', color: C.ink2, fontSize: '9px', borderRadius: '6px', padding: '2px 6px' }}>{p}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span style={{ color: C.ink3, fontSize: '9px' }}>EC 0.6-0.8</span>
              <span style={{ color: C.ink3, fontSize: '9px' }}>pH 5.5-6.0</span>
            </div>
          </div>
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: '14px', padding: '10px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px',
          }}>
            <div>
              <span style={{ color: C.ink3, fontSize: '9px' }}>RIEGO · Manana</span>
              <p style={{ color: C.ink1, fontSize: '12px', fontWeight: 600, margin: '1px 0 0' }}>Riego + foliar</p>
            </div>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${C.ink3}` }} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: C.ink2, fontSize: '11px', fontWeight: 700 }}>Mis plantas</span>
              <span style={{ color: C.green, fontSize: '10px' }}>Ver todas</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { name: 'Gelato #2', stage: 'S3 Vege', pct: 58, c: C.green },
                { name: 'White Wid.', stage: 'F4 Bulking', pct: 76, c: '#f59e0b' },
              ].map(plant => (
                <div key={plant.name} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '10px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🌿</div>
                  <p style={{ color: C.white, fontSize: '10px', fontWeight: 700, margin: '0 0 1px' }}>{plant.name}</p>
                  <p style={{ color: C.ink3, fontSize: '9px', margin: '0 0 6px' }}>{plant.stage}</p>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${plant.pct}%`, background: plant.c, borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(5,14,7,0.95)', backdropFilter: 'blur(12px)',
            padding: '12px 20px 20px', display: 'flex', justifyContent: 'space-around',
          }}>
            {['🏠', '📅', '🌿', '📷', '👤'].map((icon, i) => (
              <span key={i} style={{ fontSize: '17px', opacity: i === 0 ? 1 : 0.35, cursor: 'default' }}>{icon}</span>
            ))}
          </div>
        </div>
      </div>
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
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const heroRef     = useRef<HTMLDivElement>(null)
  const problemRef  = useFadeIn()
  const howRef      = useFadeIn()
  const featuresRef = useFadeIn()
  const b2bRef      = useFadeIn()
  const pricingRef  = useFadeIn()
  const testiRef    = useFadeIn()
  const faqRef      = useFadeIn()
  const ctaRef      = useFadeIn()

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(16px)'
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease'
    requestAnimationFrame(() => setTimeout(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, 100))
  }, [])

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setEmailSent(true)
  }

  const NAV_LINKS = [
    { label: t('landing.nav_how'),      href: '#como-funciona' },
    { label: t('landing.nav_features'), href: '#funcionalidades' },
    { label: t('landing.nav_pricing'),  href: '#precios' },
    { label: t('landing.nav_faq'),      href: '#faq' },
  ]

  const PROBLEMS = [
    { emoji: '📊', q: t('landing.p1_q'), a: t('landing.p1_a') },
    { emoji: '📅', q: t('landing.p2_q'), a: t('landing.p2_a') },
    { emoji: '💧', q: t('landing.p3_q'), a: t('landing.p3_a') },
    { emoji: '📸', q: t('landing.p4_q'), a: t('landing.p4_a') },
  ]

  const STEPS = [
    { num: '01', title: t('landing.step1_title'), desc: t('landing.step1_desc'), color: C.green },
    { num: '02', title: t('landing.step2_title'), desc: t('landing.step2_desc'), color: '#60a5fa' },
    { num: '03', title: t('landing.step3_title'), desc: t('landing.step3_desc'), color: '#f59e0b' },
    { num: '04', title: t('landing.step4_title'), desc: t('landing.step4_desc'), color: '#a78bfa' },
  ]

  const FEATURES = [
    { icon: '📅', title: t('landing.feat1_title'), desc: t('landing.feat1_desc') },
    { icon: '🌿', title: t('landing.feat2_title'), desc: t('landing.feat2_desc') },
    { icon: '📶', title: t('landing.feat3_title'), desc: t('landing.feat3_desc') },
    { icon: '📸', title: t('landing.feat4_title'), desc: t('landing.feat4_desc') },
    { icon: '🔬', title: t('landing.feat5_title'), desc: t('landing.feat5_desc') },
    { icon: '🏆', title: t('landing.feat6_title'), desc: t('landing.feat6_desc') },
  ]

  const FREE_FEATURES = [
    t('landing.pf1'), t('landing.pf2'), t('landing.pf3'),
    t('landing.pf4'), t('landing.pf5'), t('landing.pf6'),
    t('landing.pf7'), t('landing.pf8'), t('landing.pf9'),
  ]

  const PRO_FEATURES = [
    t('landing.pp1'), t('landing.pp2'), t('landing.pp3'),
    t('landing.pp4'), t('landing.pp5'), t('landing.pp6'),
    t('landing.pp7'), t('landing.pp8'),
  ]

  const TESTIMONIALS = [
    { name: 'Martin R.', location: 'Buenos Aires', avatar: 'M', stars: 5,
      text: 'Llevo 3 cosechas exitosas consecutivas desde que uso CannaTrack. Antes siempre se me cruzaban los dias con los nutrientes o me olvidaba el riego. Ahora abro la app y ya se exactamente que toca hacer.' },
    { name: 'Sofia L.', location: 'Cordoba', avatar: 'S', stars: 5,
      text: 'Lo instale y en 2 minutos tenia el calendario armado para mi White Widow con tabla REVEGETAR. Nunca mas calcule a mano. La seccion de fotos por semana me encanta para ver la evolucion.' },
    { name: 'Diego M.', location: 'Mendoza', avatar: 'D', stars: 5,
      text: 'Tengo 3 plantas en distintos estadios y CannaTrack me dice que toca hacer en cada una cada dia. Antes vivia confundido. Ahora el proceso es limpio y sistematico. Mis plantas nunca estuvieron mejor.' },
  ]

  const FAQS = [
    { q: t('landing.faq1_q'), a: t('landing.faq1_a') },
    { q: t('landing.faq2_q'), a: t('landing.faq2_a') },
    { q: t('landing.faq3_q'), a: t('landing.faq3_a') },
    { q: t('landing.faq4_q'), a: t('landing.faq4_a') },
    { q: t('landing.faq5_q'), a: t('landing.faq5_a') },
    { q: t('landing.faq6_q'), a: t('landing.faq6_a') },
    { q: t('landing.faq7_q'), a: t('landing.faq7_a') },
    { q: t('landing.faq8_q'), a: t('landing.faq8_a') },
  ]

  const TRUST_BADGES = [
    { icon: '✅', label: t('landing.trust_revegetar') },
    { icon: '📶', label: t('landing.trust_offline') },
    { icon: '📱', label: t('landing.trust_pwa') },
    { icon: '🎮', label: t('landing.trust_gamif') },
    { icon: '🔒', label: t('landing.trust_privacy') },
  ]

  const B2B_FEATURES = [
    t('landing.b2b_f1'), t('landing.b2b_f2'),
    t('landing.b2b_f3'), t('landing.b2b_f4'),
  ]

  return (
    <div style={{ background: C.bg, color: C.ink1, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

      <style>{`
        .lp-float { animation: lp-float 4s ease-in-out infinite; }
        @keyframes lp-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .lp-glow { animation: lp-glow 2.5s ease-in-out infinite; }
        @keyframes lp-glow { 0%, 100% { box-shadow: 0 0 20px rgba(61,204,99,0.3); } 50% { box-shadow: 0 0 40px rgba(61,204,99,0.55); } }
        .lp-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .lp-link:hover { color: #fff; }
        .lp-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; transition: all 0.2s; }
        .lp-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(61,204,99,0.2); transform: translateY(-2px); }
        .faq-content { overflow: hidden; transition: max-height 0.35s ease, opacity 0.3s ease; }
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,14,7,0.82)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <LogoMark size={32} />
            <span style={{ fontWeight: 800, fontSize: '17px', color: C.white, letterSpacing: '-0.3px' }}>
              Canna<span style={{ color: C.green }}>Track</span>
            </span>
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="hidden md:flex">
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
            <Link to="/signup" style={{ background: C.green, color: '#050E07', fontWeight: 800, fontSize: '13px', padding: '8px 18px', borderRadius: '10px', textDecoration: 'none', letterSpacing: '-0.2px' }} className="lp-glow">
              {t('landing.nav_cta')}
            </Link>
            <button onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'none', border: 'none', color: C.ink2, cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}
              className="md:hidden" aria-label="Menu">
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
          <div style={{ background: 'rgba(5,14,7,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 20px 12px' }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="lp-link"
                style={{ display: 'block', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}
                onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/login" style={{ color: C.ink2, fontSize: '13px', textDecoration: 'none', flex: 1 }}>{t('landing.nav_login')}</Link>
              <Link to="/signup" style={{ background: C.green, color: '#050E07', fontWeight: 800, fontSize: '13px', padding: '9px 16px', borderRadius: '10px', textDecoration: 'none' }}>
                {t('landing.nav_cta')}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px 60px', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(61,204,99,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
          <div ref={heroRef} style={{ display: 'flex', gap: '64px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ flex: '1', minWidth: '280px', maxWidth: '560px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: C.greenDim, border: '1px solid rgba(61,204,99,0.25)', borderRadius: '100px', padding: '5px 12px', marginBottom: '24px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green }} />
                <span style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>{t('landing.badge')}</span>
              </div>

              <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px', color: C.white, marginBottom: '20px' }}>
                {t('landing.hero_h1_line1')}
                <br />
                <span style={{ background: 'linear-gradient(135deg, #3DCC63 0%, #6EE090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('landing.hero_h1_line2')}
                </span>
              </h1>

              <p style={{ fontSize: '17px', lineHeight: 1.65, color: C.ink2, maxWidth: '480px', marginBottom: '36px' }}>
                {t('landing.hero_sub')}{' '}
                <strong style={{ color: C.ink1 }}>{t('landing.hero_sub_bold')}</strong>
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
                <Link to="/signup" style={{ background: C.green, color: '#050E07', fontWeight: 800, fontSize: '15px', padding: '14px 28px', borderRadius: '14px', textDecoration: 'none', letterSpacing: '-0.2px' }} className="lp-glow">
                  {t('landing.hero_cta')}
                </Link>
                <a href="#como-funciona" style={{ background: 'rgba(255,255,255,0.06)', color: C.ink1, fontWeight: 600, fontSize: '15px', padding: '14px 24px', borderRadius: '14px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {t('landing.hero_see_how')}
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex' }}>
                  {['M','S','D','J','A'].map((l, i) => (
                    <div key={l} style={{ width: '28px', height: '28px', borderRadius: '50%', background: `hsl(${130 + i * 20}, 50%, ${25 + i * 5}%)`, border: '2px solid #050E07', marginLeft: i === 0 ? 0 : '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: C.white }}>{l}</div>
                  ))}
                </div>
                <span style={{ color: C.ink3, fontSize: '13px' }}>{t('landing.hero_social_proof')}</span>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}><PhoneMockup /></div>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '18px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'center' }}>
          {TRUST_BADGES.map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.ink2, fontSize: '13px', fontWeight: 500 }}>
              <span>{b.icon}</span><span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEMA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div ref={problemRef} style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t('landing.problem_section')}</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px', color: C.white, margin: '0 0 16px' }}>{t('landing.problem_h2')}</h2>
            <p style={{ color: C.ink2, fontSize: '16px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>{t('landing.problem_sub')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {PROBLEMS.map(p => (
              <div key={p.q} className="lp-card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{p.emoji}</div>
                <p style={{ color: C.ink1, fontSize: '14px', fontWeight: 700, marginBottom: '10px', lineHeight: 1.4 }}>{p.q}</p>
                <p style={{ color: C.ink3, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{p.a}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '64px' }}>
            <p style={{ color: C.ink3, fontSize: '14px', marginBottom: '12px' }}>{t('landing.problem_transition')}</p>
            <h3 style={{ color: C.white, fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.5px' }}>{t('landing.problem_solution')}</h3>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────────── */}
      <section id="como-funciona" style={{ padding: '80px 24px 100px', background: 'rgba(255,255,255,0.015)' }}>
        <div ref={howRef} style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t('landing.how_section')}</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px', color: C.white, margin: 0 }}>{t('landing.how_h2')}</h2>
          </div>
          <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ display: 'flex', gap: '24px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `${step.color}18`, border: `2px solid ${step.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: step.color, flexShrink: 0 }}>
                    {step.num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, width: '1px', background: `linear-gradient(to bottom, ${step.color}40, transparent)`, marginTop: '4px', minHeight: '48px' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? '40px' : '0', paddingTop: '10px' }}>
                  <h3 style={{ color: C.white, fontSize: '17px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>{step.title}</h3>
                  <p style={{ color: C.ink2, fontSize: '14px', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <Link to="/signup" style={{ background: C.green, color: '#050E07', fontWeight: 800, fontSize: '15px', padding: '14px 32px', borderRadius: '14px', textDecoration: 'none', display: 'inline-block' }}>
              {t('landing.how_cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ───────────────────────────────────────────────── */}
      <section id="funcionalidades" style={{ padding: '100px 24px' }}>
        <div ref={featuresRef} style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t('landing.feat_section')}</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px', color: C.white, margin: '0 0 16px' }}>{t('landing.feat_h2')}</h2>
            <p style={{ color: C.ink2, fontSize: '16px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>{t('landing.feat_sub')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {FEATURES.map(f => (
              <div key={f.title} className="lp-card" style={{ padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '14px' }}>{f.icon}</div>
                <h3 style={{ color: C.white, fontSize: '15px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.2px' }}>{f.title}</h3>
                <p style={{ color: C.ink3, fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── B2B ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div ref={b2bRef} style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(61,204,99,0.05) 0%, rgba(96,165,250,0.05) 100%)', border: '1px solid rgba(61,204,99,0.15)', borderRadius: '28px', padding: '56px 48px', display: 'flex', gap: '48px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <span style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '16px' }}>
                {t('landing.b2b_badge')}
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.8px', color: C.white, margin: '0 0 16px' }}>{t('landing.b2b_h2')}</h2>
              <p style={{ color: C.ink2, fontSize: '15px', lineHeight: 1.65, margin: '0 0 28px' }}>{t('landing.b2b_desc')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {B2B_FEATURES.map(item => (
                  <li key={item} style={{ display: 'flex', gap: '10px', color: C.ink2, fontSize: '14px' }}>
                    <span style={{ color: C.green, fontWeight: 700, flexShrink: 0 }}>✓</span>{item}
                  </li>
                ))}
              </ul>
              <a href="mailto:hola@cannatrack.app?subject=Quiero listar mi tabla en CannaTrack"
                style={{ display: 'inline-block', background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '12px', textDecoration: 'none' }}>
                {t('landing.b2b_cta')}
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '200px' }}>
              {[
                { label: t('landing.b2b_stat1_label'), val: '2+',  note: t('landing.b2b_stat1_note') },
                { label: t('landing.b2b_stat2_label'), val: '60+', note: t('landing.b2b_stat2_note') },
                { label: t('landing.b2b_stat3_label'), val: t('landing.b2b_stat3_val'), note: t('landing.b2b_stat3_note') },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                  <div style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: C.white, letterSpacing: '-1px', marginBottom: '4px' }}>{s.val}</div>
                  <div style={{ color: C.ink2, fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ color: C.ink3, fontSize: '11px' }}>{s.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRECIOS ───────────────────────────────────────────────────────── */}
      <section id="precios" style={{ padding: '100px 24px' }}>
        <div ref={pricingRef} style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t('landing.price_section')}</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px', color: C.white, margin: '0 0 16px' }}>{t('landing.price_h2')}</h2>
            <p style={{ color: C.ink2, fontSize: '16px', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>{t('landing.price_sub')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: C.ink2, fontSize: '13px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('landing.free_label')}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 900, color: C.white, letterSpacing: '-2px' }}>{t('landing.free_price')}</span>
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
            <div style={{ background: 'linear-gradient(145deg, rgba(61,204,99,0.08), rgba(61,204,99,0.03))', border: '1px solid rgba(61,204,99,0.3)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', background: C.green, color: '#050E07', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase' }}>
                {t('landing.pro_badge')}
              </div>
              <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(61,204,99,0.12), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: C.green, fontSize: '13px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('landing.pro_label')}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 900, color: C.white, letterSpacing: '-2px' }}>{t('landing.pro_price')}</span>
                  <span style={{ color: C.ink3, fontSize: '14px' }}>{t('landing.pro_period')}</span>
                </div>
                <p style={{ color: C.ink3, fontSize: '13px', margin: '8px 0 0' }}>{t('landing.pro_note')}</p>
              </div>
              <button disabled style={{ display: 'block', width: '100%', background: 'rgba(61,204,99,0.2)', color: C.green, border: '1px solid rgba(61,204,99,0.3)', fontWeight: 700, fontSize: '14px', padding: '12px', borderRadius: '12px', cursor: 'not-allowed', marginBottom: '28px' }}>
                {t('landing.pro_cta')}
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '10px', color: C.ink2, fontSize: '13px' }}>
                    <span style={{ color: C.green, flexShrink: 0, fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ───────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div ref={testiRef} style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t('landing.testi_section')}</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px', color: C.white, margin: 0 }}>{t('landing.testi_h2')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {TESTIMONIALS.map(testi => (
              <div key={testi.name} className="lp-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                  {Array.from({ length: testi.stars }).map((_, i) => <span key={i} style={{ color: '#f59e0b', fontSize: '14px' }}>★</span>)}
                </div>
                <p style={{ color: C.ink1, fontSize: '14px', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{testi.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.green}40, ${C.green}20)`, border: `1px solid ${C.green}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: C.green }}>{testi.avatar}</div>
                  <div>
                    <p style={{ color: C.white, fontSize: '13px', fontWeight: 700, margin: 0 }}>{testi.name}</p>
                    <p style={{ color: C.ink3, fontSize: '11px', margin: 0 }}>{testi.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '100px 24px' }}>
        <div ref={faqRef} style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t('landing.faq_section')}</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px', color: C.white, margin: 0 }}>{t('landing.faq_h2')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: openFaq === i ? 'rgba(61,204,99,0.04)' : C.card, border: `1px solid ${openFaq === i ? 'rgba(61,204,99,0.2)' : C.border}`, borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', textAlign: 'left', gap: '12px' }}>
                  <span style={{ color: C.white, fontSize: '15px', fontWeight: 600, lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ color: openFaq === i ? C.green : C.ink3, fontSize: '18px', flexShrink: 0, transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', display: 'block', lineHeight: 1 }}>+</span>
                </button>
                <div className="faq-content" style={{ maxHeight: openFaq === i ? '200px' : '0', opacity: openFaq === i ? 1 : 0 }}>
                  <p style={{ color: C.ink2, fontSize: '14px', lineHeight: 1.7, padding: '0 20px 18px', margin: 0 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div ref={ctaRef} style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: '200px', height: '200px', margin: '0 auto -140px', background: 'radial-gradient(circle, rgba(61,204,99,0.18), transparent 70%)' }} />
          <div style={{ background: 'linear-gradient(145deg, rgba(61,204,99,0.07), rgba(10,26,13,0.8))', border: '1px solid rgba(61,204,99,0.2)', borderRadius: '28px', padding: '56px 36px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌿</div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900, letterSpacing: '-1px', color: C.white, margin: '0 0 16px' }}>{t('landing.cta_h2')}</h2>
            <p style={{ color: C.ink2, fontSize: '16px', lineHeight: 1.65, margin: '0 0 36px', maxWidth: '480px', display: 'inline-block' }}>{t('landing.cta_desc')}</p>

            {emailSent ? (
              <div style={{ background: C.greenDim, border: '1px solid rgba(61,204,99,0.3)', borderRadius: '14px', padding: '16px 24px', color: C.green, fontWeight: 600 }}>
                ✅ {t('landing.cta_sent')}
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '420px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={t('landing.cta_email_placeholder')}
                    style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px', color: C.white, fontSize: '14px', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: C.green, color: '#050E07', fontWeight: 800, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {t('landing.cta_notify_pro')}
                  </button>
                </div>
                <Link to="/signup" style={{ background: C.green, color: '#050E07', fontWeight: 800, fontSize: '15px', padding: '14px 32px', borderRadius: '14px', textDecoration: 'none', display: 'inline-block' }} className="lp-glow">
                  {t('landing.cta_main')}
                </Link>
                <p style={{ color: C.ink3, fontSize: '12px', margin: 0 }}>{t('landing.cta_disclaimer')}</p>
              </form>
            )}
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
                <span style={{ fontWeight: 800, fontSize: '17px', color: C.white, letterSpacing: '-0.3px' }}>Canna<span style={{ color: C.green }}>Track</span></span>
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
                  <Link to="/signup" className="lp-link" style={{ fontSize: '13px', color: C.ink2, textDecoration: 'none' }}>{t('landing.footer_create')}</Link>
                  <Link to="/login" className="lp-link" style={{ fontSize: '13px', color: C.ink2, textDecoration: 'none' }}>{t('landing.footer_login')}</Link>
                  <a href="mailto:hola@cannatrack.app" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.footer_contact')}</a>
                  <a href="mailto:hola@cannatrack.app?subject=Quiero listar mi marca" className="lp-link" style={{ fontSize: '13px' }}>{t('landing.footer_b2b')}</a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: C.ink3, fontSize: '12px', margin: 0 }}>© {t('landing.footer_copy')}</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="#" className="lp-link" style={{ fontSize: '12px' }}>{t('landing.footer_privacy')}</a>
              <a href="#" className="lp-link" style={{ fontSize: '12px' }}>{t('landing.footer_terms')}</a>
              <a href="#" className="lp-link" style={{ fontSize: '12px', color: C.ink3 }}>{t('landing.footer_age')}</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
