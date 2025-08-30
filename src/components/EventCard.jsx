import React, { useEffect, useState } from 'react'

const Pill = ({ children }) => <span className="pill">{children}</span>

/* Data pt-BR sem “voltar” 1 dia (força UTC quando vier YYYY-MM-DD) */
function dateOnly(raw){
  if (!raw) return ''
  const s = String(raw)
  const iso = s.match(/^\d{4}-\d{2}-\d{2}$/) ? `${s}T00:00:00Z` : s
  const d = new Date(iso)
  if (!isNaN(d)) return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  return s.split('T')[0].split(' ')[0]
}

/* Modal leve para o expandir (sem flicker) */
function useBodyScrollLock(active){
  useEffect(()=>{
    if(!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}
const Lightbox = ({ open, onClose, children, title='Pré-visualização' }) => {
  useBodyScrollLock(open)
  useEffect(()=>{
    if(!open) return
    const onKey = e => { if(e.key==='Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if(!open) return null
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={title}>
      <div className="lightboxInner">
        <div className="lightboxChrome">
          <span>{title}</span>
          <button className="chipBtn" onClick={onClose}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function EventCard({ ev, forceMedia=false, onEdit, onDelete }){
  const [iframeKey, setIframeKey] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const title = ev.titulo || ev.título || ev.title || 'Evento'
  const date  = ev.data_evento || ev.data || ev.data_inicio || ev.start || ev.data_post || ''
  const venue = ev.local || ev.venue || ev.address || ''
  const desc  = ev.descricao || ev.description || ''
  const tags  = (ev.tags || '').toString().split(/[;,#]/).map(s=>s.trim()).filter(Boolean)
  const postUrl = ev.url || ev.instagramUrl || (ev.shortcode ? `https://www.instagram.com/p/${ev.shortcode}/` : null)

  return (
    <article className="card">
      <header className="cardHeader">
        <h3 className="cardTitle">{title}</h3>
        {(date || venue) && (
          <div className="metaRow">
            {date && <Pill>{dateOnly(date)}</Pill>}
            {venue && <Pill>{venue}</Pill>}
          </div>
        )}
      </header>

      {desc && <p className="cardDesc">{desc}</p>}

      {tags.length > 0 && (
        <div className="tagsRow">
          {tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
        </div>
      )}

      {/* Rodapé: link à esquerda + ações à direita, preso no bottom */}
      {(postUrl || onEdit || onDelete) && (
        <footer className="cardFooter">
          {postUrl ? (
            <a className="link" href={postUrl} target="_blank" rel="noreferrer">Ver post original ↗</a>
          ) : <span />}

          <div style={{display:'flex', gap:8}}>
            {onEdit && (
              <button className="iconBtn ghost" onClick={onEdit} title="Editar" aria-label="Editar">
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            {onDelete && (
              <button className="iconBtn ghost" onClick={onDelete} title="Remover" aria-label="Remover">
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Mídia com chrome sutil */}
      {forceMedia && ev.shortcode && (
        <>
          <div className="embedWrap subtle">
            <div className="embedChrome">
              <div className="chromeLeft"><span className="igDot" aria-hidden>●</span><strong>Instagram</strong></div>
              <div className="chromeRight">
                <button className="chipBtn" onClick={()=>setExpanded(true)} title="Expandir">Expandir</button>
                <a className="chipBtn" href={postUrl || '#'} target="_blank" rel="noreferrer" title="Abrir no Instagram">Abrir</a>
                <button className="chipBtn" onClick={()=>setIframeKey(k=>k+1)} title="Recarregar">Recarregar</button>
              </div>
            </div>
            <iframe
              key={iframeKey}
              title={`midia-${ev.shortcode}`}
              className="embed"
              src={`https://www.instagram.com/p/${ev.shortcode}/embed`}
              loading="lazy"
              scrolling="no"
            />
          </div>

          <Lightbox open={expanded} onClose={()=>setExpanded(false)} title="Pré-visualização">
            <iframe
              title={`midia-xl-${ev.shortcode}`}
              className="embedXL"
              src={`https://www.instagram.com/p/${ev.shortcode}/embed`}
              loading="lazy"
              scrolling="no"
            />
          </Lightbox>
        </>
      )}
    </article>
  )
}

