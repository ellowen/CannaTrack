import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { differenceInCalendarDays, format } from 'date-fns'
import { es as esLocale, enUS } from 'date-fns/locale'
import { LogoMark } from '@/components/ui'
import CycleStrip from '@/components/plant/CycleStrip'
import { fetchSharedDiary, type SharedDiary } from '@/lib/shared-diary'
import { useUserStore } from '@/store/userStore'
import { track } from '@/lib/analytics'

/** Diario publico de solo lectura (/d/:token): lo ve quien recibe el link, sin cuenta. */
export default function SharedDiaryPage() {
  const { token = '' } = useParams()
  const { t } = useTranslation()
  const language = useUserStore((s) => s.language)
  const [state, setState] = useState<{ status: 'loading' } | { status: 'missing' } | { status: 'ok'; diary: SharedDiary }>({ status: 'loading' })

  // El link es secreto: que no se indexe ni viaje en el Referer.
  useEffect(() => {
    const meta = (name: string, content: string) => {
      const el = document.createElement('meta')
      el.name = name
      el.content = content
      document.head.appendChild(el)
      return el
    }
    const added = [meta('robots', 'noindex,nofollow'), meta('referrer', 'no-referrer')]
    return () => added.forEach((el) => el.remove())
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchSharedDiary(token)
      .then((diary) => {
        if (cancelled) return
        setState(diary ? { status: 'ok', diary } : { status: 'missing' })
        if (diary) track('shared_diary_view')
      })
      .catch(() => { if (!cancelled) setState({ status: 'missing' }) })
    return () => { cancelled = true }
  }, [token])

  const locale = language === 'es' ? esLocale : enUS

  return (
    <div className="min-h-screen min-h-dvh bg-app-bg text-ink-1">
      <header className="max-w-2xl mx-auto px-5 pt-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <LogoMark size={30} />
          <span className="font-display text-lg font-semibold text-ink-1">Culti<span className="text-brand-text">Track</span></span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {state.status === 'loading' && <p className="text-sm text-ink-3">{t('share.loading')}</p>}

        {state.status === 'missing' && (
          <div className="text-center py-16" data-testid="shared-missing">
            <h1 className="text-2xl text-ink-1">{t('share.unavailable_title')}</h1>
            <p className="text-sm text-ink-3 mt-2">{t('share.unavailable_desc')}</p>
          </div>
        )}

        {state.status === 'ok' && (() => {
          const { plant, entries } = state.diary
          const day = Math.max(1, differenceInCalendarDays(plant.endDate ?? new Date(), plant.startDate) + 1)
          return (
            <>
              <section>
                <h1 className="text-3xl text-ink-1" data-testid="shared-name">{plant.name}</h1>
                {plant.genetics && <p className="text-sm text-ink-3 mt-1">{plant.genetics}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-vege-bg text-vege-text">
                    {t('share.day', { n: day })}
                  </span>
                  {plant.status === 'harvested' && (
                    <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-flora-bg text-flora-text">
                      {t('share.harvested')}{plant.harvestWeightG ? ` · ${t('share.harvest_weight', { g: plant.harvestWeightG })}` : ''}
                    </span>
                  )}
                </div>
                <CycleStrip plant={plant} className="mt-4" />
              </section>

              <section className="mt-8">
                <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">{t('share.entries')}</p>
                {entries.length === 0 ? (
                  <p className="text-sm text-ink-3">{t('share.empty')}</p>
                ) : (
                  <ol className="space-y-4" data-testid="shared-entries">
                    {[...entries].reverse().map((e) => {
                      const flora = e.weekLabel.startsWith('FLORA')
                      return (
                        <li key={e.id} className="bg-app-card border border-app-border rounded-2xl shadow-card overflow-hidden">
                          {e.photoUrl && (
                            <a href={e.photoUrl} target="_blank" rel="noopener noreferrer">
                              <img src={e.photoUrl} alt={t('share.photo_alt', { label: e.weekLabel })} loading="lazy" className="w-full aspect-[4/3] object-cover bg-app-elevated" />
                            </a>
                          )}
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${flora ? 'bg-flora-bg text-flora-text' : 'bg-vege-bg text-vege-text'}`}>{e.weekLabel}</span>
                              <span className="text-[11px] text-ink-4">{format(e.logDate, 'PPP', { locale })}</span>
                            </div>
                            {e.notes
                              ? <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{e.notes}</p>
                              : <p className="text-sm text-ink-4 italic">{t('share.only_photo')}</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>
            </>
          )
        })()}

        <section className="mt-12 rounded-3xl border border-brand-border bg-brand-subtle p-6 text-center">
          <h2 className="text-xl text-ink-1">{t('share.cta_title')}</h2>
          <p className="text-sm text-ink-3 mt-1.5">{t('share.cta_desc')}</p>
          <Link
            to="/signup"
            onClick={() => track('shared_diary_cta')}
            className="inline-block mt-4 px-6 py-3 rounded-2xl bg-brand-400 text-brand-on font-bold text-sm no-underline"
          >
            {t('share.cta_btn')}
          </Link>
        </section>
      </main>
    </div>
  )
}
