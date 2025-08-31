import React, { useEffect, useMemo, useRef, useState } from 'react'
import EventCard from './components/EventCard.jsx'
import './styles.css'

/* ========= utils ========= */
const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const parseDateLoose = s => { if(!s) return null; const d = new Date(s); return isNaN(d) ? null : startOfDay(d) }
const isSameDay = (a,b) => a && b && +a === +b
const isBetween = (d,a,b) => d && a && b && d >= a && d <= b

/* ========= conversores dd/mm/aaaa <-> ISO ========= */
function maskBRDate(raw){
  // mantém só dígitos e formata dd/mm/aaaa progressivamente
  const digits = (raw || '').replace(/\D/g,'').slice(0,8)
  const p1 = digits.slice(0,2)
  const p2 = digits.slice(2,4)
  const p3 = digits.slice(4,8)
  if (digits.length <= 2) return p1
  if (digits.length <= 4) return `${p1}/${p2}`
  return `${p1}/${p2}/${p3}`
}
function brToISO(br){
  if(!br) return ''
  const m = String(br).match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)
  if(!m) return ''
  let [_, d, mo, y] = m
  d = d.padStart(2,'0'); mo = mo.padStart(2,'0')
  if(y.length===2){ y = (Number(y) >= 70 ? '19'+y : '20'+y) } // heurística
  const dd = parseInt(d,10), mm = parseInt(mo,10), yy = parseInt(y,10)
  // validação simples
  if(mm<1||mm>12||dd<1||dd>31) return ''
  const dt = new Date(Date.UTC(yy, mm-1, dd))
  if(isNaN(dt)) return ''
  return dt.toISOString().split('T')[0] // YYYY-MM-DD
}
function isoToBR(iso){
  const m = String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if(!m) return ''
  const [, y, mo, d] = m
  return `${d}/${mo}/${y}`
}

/* ========= ícones ========= */
function Icon({ name, size = 18, className='' }) {
  const p = { width:size, height:size, viewBox:'0 0 24 24', fill:'none',
    stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round',
    className:`icon ${className}` }
  if (name==='sun') return (<svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.93 4.93 6.34 6.34M17.66 17.66 19.07 19.07M4.93 19.07 6.34 17.66M17.66 6.34 19.07 4.93"/></svg>)
  if (name==='moon')return (<svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>)
  if (name==='image')return (<svg {...p}><rect x="3" y="4" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16 16 11 8 19"/></svg>)
  if (name==='sliders')return (<svg {...p}><path d="M21 4H14"/><path d="M10 4H3"/><path d="M21 12h-7"/><path d="M10 12H3"/><path d="M21 20h-7"/><path d="M10 20H3"/><circle cx="12" cy="4" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="20" r="2"/></svg>)
  if (name==='calendar')return (<svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>)
  if (name==='plus')return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>)
  if (name==='edit')return (<svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>)
  if (name==='trash')return (<svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>)
  return null
}

/* ========= Componente de Data BR ========= */
function DateBR({ value, onChange, ...rest }){
  return (
    <input
      className="input input--date"
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      value={value}
      onChange={(e)=> onChange( maskBRDate(e.target.value) )}
      {...rest}
    />
  )
}

export default function App(){
  const BASE = import.meta.env.BASE_URL;
  const TITLE = 'Protótipo — Eventos Fundação Cultural'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  useEffect(()=>{
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = 'pt-BR'
    localStorage.setItem('theme', theme)
  },[theme])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  /* dados + filtros */
  const [all, setAll] = useState([])
  const [q, setQ] = useState('')
  const [ods, setOds] = useState('')
  const [datePreset, setDatePreset] = useState('all') // all|today|7|30|month
  const [fromDate, setFromDate]   = useState('')
  const [toDate, setToDate]       = useState('')

  /* mídia e paginação */
  const [showAllMedia, setShowAllMedia] = useState(false)
  const MAX_EMBEDS = 12
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)

  /* admin */
  const fileRef = useRef(null)
  const [showAdd, setShowAdd] = useState(false)
  // No draft, guardo a data em BR para a UI do modal
  const [draft, setDraft] = useState({ title:'', dateBR:'', venue:'', description:'', tags:'', instagramUrl:'', shortcode:'' })
  const [editingIndex, setEditingIndex] = useState(null)

  /* carregar dados */
  useEffect(() => {
  fetch(`${BASE}data/events.json`, { cache: 'no-store' })
    .then(r => r.json()).then(setAll)
    .catch(()=>setAll([]))
  }, [BASE])
  useEffect(()=>{ setPage(1) }, [q, ods, datePreset, fromDate, toDate, all])

  /* filtragem */
  const filtered = useMemo(() => {
    const today = startOfDay(new Date())
    const end7  = addDays(today, 7)
    const end30 = addDays(today, 30)
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endMonth   = new Date(today.getFullYear(), today.getMonth()+1, 0)

    const from = parseDateLoose(fromDate)
    const to   = parseDateLoose(toDate)

    return all.filter(ev => {
      const hay = norm([ev.titulo, ev.título, ev.title, ev.descricao, ev.description, ev.tags, ev.venue, ev.address].join(' '))
      const okQ   = !q  || hay.includes(norm(q))
      const toks  = (ods || '').split(/[,\s]+/).map(t=>t.trim()).filter(Boolean)
      const tagsS = norm([ev.tags, ev.ods, ev.ODS].join(' '))
      const okTag = toks.every(t => tagsS.includes(norm(t)))

      const evDate = parseDateLoose(ev.data_evento || ev.data || ev.data_inicio || ev.start || ev.data_post)
      let okDate = true
      if (from || to){
        if (evDate){
          if (from && evDate < from) okDate = false
          if (to   && evDate > to)   okDate = false
        }
      } else {
        if (datePreset==='today') okDate = evDate ? isSameDay(evDate, startOfDay(new Date())) : true
        if (datePreset==='7')     okDate = evDate ? isBetween(evDate, startOfDay(new Date()), end7) : true
        if (datePreset==='30')    okDate = evDate ? isBetween(evDate, startOfDay(new Date()), end30) : true
        if (datePreset==='month') okDate = evDate ? isBetween(evDate, startMonth, endMonth) : true
      }
      return okQ && okTag && okDate
    })
  }, [all, q, ods, datePreset, fromDate, toDate])

  const total = filtered.length
  const visible = filtered.slice(0, page * pageSize)

  /* import/export */
  function onImportFile(e){
    const f = e.target.files?.[0]; if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result)
        if (Array.isArray(data)) setAll(data)
        else if (Array.isArray(data?.events)) setAll(data.events)
        else alert('JSON inválido')
      }catch{ alert('Falha ao ler JSON') }
    }
    reader.readAsText(f)
  }
  const exportAll = () => {
    const blob = new Blob([JSON.stringify(all, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'events.json'; a.click(); URL.revokeObjectURL(url)
  }

  /* adicionar / editar / remover */
  function openAdd(){ 
    setDraft({ title:'', dateBR:'', venue:'', description:'', tags:'', instagramUrl:'', shortcode:'' }) 
    setEditingIndex(null)
    setShowAdd(true)
  }
  function openEdit(index){
    const ev = all[index]
    setDraft({
      title: ev.title || '',
      dateBR: isoToBR(ev.data || ''),
      venue: ev.venue || '',
      description: ev.description || '',
      tags: ev.tags || '',
      instagramUrl: ev.instagramUrl || '',
      shortcode: ev.shortcode || ''
    })
    setEditingIndex(index)
    setShowAdd(true)
  }
  function saveAdd(){
    const ev = {
      title:draft.title?.trim(),
      data: brToISO(draft.dateBR),    // salva ISO sempre
      venue:draft.venue?.trim(),
      description:draft.description?.trim(),
      tags:draft.tags?.trim(),
      instagramUrl:draft.instagramUrl?.trim(),
      shortcode:draft.shortcode?.trim()
    }
    setAll(a => [ev, ...a]); setShowAdd(false)
  }
  function saveEdit(){
    const updated = {
      title:draft.title?.trim(),
      data: brToISO(draft.dateBR),
      venue:draft.venue?.trim(),
      description:draft.description?.trim(),
      tags:draft.tags?.trim(),
      instagramUrl:draft.instagramUrl?.trim(),
      shortcode:draft.shortcode?.trim()
    }
    setAll(a => a.map((ev,i)=> i===editingIndex ? updated : ev))
    setShowAdd(false)
    setEditingIndex(null)
  }
  function deleteEvent(index){
    if(window.confirm("Remover este evento?")){
      setAll(a => a.filter((_,i)=> i!==index))
    }
  }

  const clearAdvancedDates = () => { setFromDate(''); setToDate('') }

  return (
    <div className="wrap">
      <header className="siteHeader">
        <div className="brand">
          <img src={`${BASE}img/fundacao-cultural.webp`} alt="" />
          <div className="brandStack">
            <h1 className="title">{TITLE}</h1>
            <p className="subtitle">Explorar, filtrar e validar eventos reais</p>
          </div>
        </div>
        <button className="iconBtn" onClick={toggleTheme}
          aria-label={theme==='dark'?'Tema claro':'Tema escuro'}>
          {theme==='dark'? <Icon name="sun" size={18}/> : <Icon name="moon" size={18}/>}
        </button>
      </header>

      {/* CONTROLES */}
      <section className="controls">
        <div className="row">
          <input className="input grow" type="search"
            placeholder="Buscar por título, descrição, local…"
            value={q} onChange={e=>setQ(e.target.value)} aria-label="Buscar"/>
          <input className="input" type="text"
            placeholder="Filtrar por ODS/Tags (ex.: cultura, 11)"
            value={ods} onChange={e=>setOds(e.target.value)} aria-label="ODS / tags"/>
          <div className="toolbar">
            <button className={`iconBtn ghost ${showAllMedia ? 'active' : ''}`}
              title={showAllMedia ? 'Desligar pré-visualização' : 'Pré-visualizar mídias nos cards'}
              aria-pressed={showAllMedia}
              onClick={()=>setShowAllMedia(v=>!v)}>
              <Icon name="image" />
            </button>
            <details className="popover">
              <summary className="iconBtn ghost" title="Ferramentas (admin)" aria-label="Ferramentas (admin)">
                <Icon name="sliders" />
              </summary>
              <div className="menu">
                <button className="menuItem" onClick={openAdd}>Adicionar evento</button>
                <button className="menuItem" onClick={()=>fileRef.current?.click()}>Importar JSON</button>
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImportFile}/>
                <button className="menuItem" onClick={exportAll}>Exportar JSON</button>
              </div>
            </details>
          </div>
        </div>

        <div className="row row-compact">
          <div className="inlineGroup">
            <label className="labelInline">
              <span className="lbl">Período</span>
              <select className="input input--compact input-select" value={datePreset}
                onChange={e=>setDatePreset(e.target.value)} aria-label="Período">
                <option value="all">Todos</option>
                <option value="today">Hoje</option>
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
                <option value="month">Este mês</option>
              </select>
            </label>

            <details className="popover">
              <summary className="iconBtn ghost pillBtn" title="Intervalo de datas" aria-label="Intervalo de datas">
                <Icon name="calendar" />
                <span className="pillText">Intervalo</span>
              </summary>
              <div className="menu menu--calendar">
                <label className="menuRow">
                  <span>De</span>
                  <input className="input input--date" type="date" value={fromDate}
                        onChange={e=>setFromDate(e.target.value)} />
                </label>
                <label className="menuRow">
                  <span>Até</span>
                  <input className="input input--date" type="date" value={toDate}
                        onChange={e=>setToDate(e.target.value)} />
                </label>
                <div className="menuRow right">
                  {(fromDate || toDate) && <button className="btn btn-xs" onClick={clearAdvancedDates}>Limpar</button>}
                </div>
              </div>
            </details>
          </div>
          <div />
        </div>
      </section>

      {/* CARDS */}
      <div id="resultsGrid" className="grid">
        {visible.map((ev, i) => (
          <EventCard
            key={i}
            ev={ev}
            forceMedia={showAllMedia && i < MAX_EMBEDS}
            onEdit={()=>openEdit(i)}
            onDelete={()=>deleteEvent(i)}
          />
        ))}
      </div>

      {/* Paginação */}
      <div className="pager">
        <span className="muted">Mostrando {visible.length} de {total} resultado(s)</span>
        {visible.length < total && (
          <button className="btn btn-primary btn-xs" onClick={()=>setPage(p => p+1)}>Carregar mais</button>
        )}
        <label className="labelInline small">
          <span className="lbl">Itens/pág.</span>
          <select className="input input--compact input-select" value={pageSize}
            onChange={e=>setPageSize(parseInt(e.target.value))}>
            <option value={6}>6</option><option value={9}>9</option><option value={12}>12</option>
          </select>
        </label>
      </div>

      {/* Modal add/edit */}
      {showAdd && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{marginTop:0}}>{editingIndex!==null ? "Editar evento" : "Adicionar evento"}</h3>
            <div className="formRow">
              <input className="input" placeholder="Título" value={draft.title}
                     onChange={e=>setDraft(d=>({...d, title:e.target.value}))}/>
              {/* Date BR com máscara */}
              <DateBR value={draft.dateBR} onChange={(v)=>setDraft(d=>({...d, dateBR:v}))} />
              <input className="input" placeholder="Local" value={draft.venue}
                     onChange={e=>setDraft(d=>({...d, venue:e.target.value}))}/>
            </div>
            <div className="formRow">
              <input className="input" placeholder="Tags (separadas por vírgula)" value={draft.tags}
                     onChange={e=>setDraft(d=>({...d, tags:e.target.value}))}/>
            </div>
            <div className="formRow">
              <input className="input" placeholder="URL do post (Instagram)" value={draft.instagramUrl}
                     onChange={e=>setDraft(d=>({...d, instagramUrl:e.target.value}))}/>
              <input className="input" placeholder="Shortcode do post (opcional)" value={draft.shortcode}
                     onChange={e=>setDraft(d=>({...d, shortcode:e.target.value}))}/>
            </div>
            <div className="formRow">
              <textarea className="input" rows={4} placeholder="Descrição" value={draft.description}
                        onChange={e=>setDraft(d=>({...d, description:e.target.value}))} />
            </div>
            <div className="modalActions">
              <button className="btn" onClick={()=>{ setShowAdd(false); setEditingIndex(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={editingIndex!==null ? saveEdit : saveAdd}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <button className="fab" onClick={()=>setShowAdd(true)} aria-label="Adicionar evento">
        <Icon name="plus" size={20}/>
      </button>
    </div>
  )
}

