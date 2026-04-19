import React, { useState, useRef } from 'react'

const LEVELS = [
  { value: 'beginner',     label: '🟢 Principiante', desc: 'Acrilico a pennello — il punto di partenza ideale' },
  { value: 'intermediate', label: '🟡 Intermedio',    desc: 'Acrilico + spatola, più texture e profondità' },
  { value: 'expert',       label: '🔴 Esperto',        desc: 'Tecnica mista — il tuo stile personale' },
]

function extractJSON(text) {
  text = text.replace(/```json|```/g, '').trim()
  const start = text.indexOf('{')
  if (start === -1) throw new Error('Nessun JSON trovato')
  text = text.slice(start)
  try { return JSON.parse(text) } catch (_) {}
  let depth = 0, inStr = false, escape = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (!inStr) { if (c === '{' || c === '[') depth++; if (c === '}' || c === ']') depth-- }
  }
  let fixed = text
  if (inStr) fixed += '"'
  for (let i = 0; i < Math.abs(depth); i++) fixed += depth > 0 ? '}' : ']'
  try { return JSON.parse(fixed) } catch (_) {}
  throw new Error('JSON non recuperabile — riprova con immagine più piccola')
}

function validateTutorial(data) {
  return {
    analysis: data.analysis || 'Quadro analizzato.',
    recommendedLevel: data.recommendedLevel || 'beginner',
    recommendedLevelReason: data.recommendedLevelReason || '',
    technique: data.technique || 'Acrilico a pennello',
    materials: Array.isArray(data.materials) ? data.materials.slice(0, 5) : [
      { name: 'Colori acrilici', budget: 'Set base 5-10€', mid: 'Maimeri 15-20€', essential: true },
      { name: 'Pennelli piatti', budget: 'Set economico 5€', mid: 'Set medio 12€', essential: true },
      { name: 'Tela pretrattata', budget: '30x40cm 3-5€', mid: '40x50cm 8€', essential: true },
    ],
    steps: Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : [
      { number: 1, title: 'Preparazione', description: 'Prepara il tuo spazio di lavoro con i materiali necessari.', voiceover: 'Iniziamo preparando tutto il necessario per dipingere.', duration: '5', tip: null }
    ]
  }
}

function compressImage(dataUrl, maxSize) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

async function analyzeImage(imageData, imageUrl, title, level) {
  const levelMap = { beginner: 'principiante (pennello, acrilico base)', intermediate: 'intermedio (spatola+pennello)', expert: 'esperto (tecnica mista)' }
  const contentParts = []
  if (imageData && imageData.startsWith('data:')) {
    const compressed = await compressImage(imageData, 800)
    const base64 = compressed.split(',')[1]
    const mimeMatch = compressed.match(/data:([^;]+);/)
    contentParts.push({ type: 'image', source: { type: 'base64', media_type: mimeMatch ? mimeMatch[1] : 'image/jpeg', data: base64 } })
  } else if (imageUrl) {
    contentParts.push({ type: 'image', source: { type: 'url', url: imageUrl } })
  }
  contentParts.push({ type: 'text', text: `Insegnante arte italiano. Livello: ${levelMap[level]}. Rispondi SOLO JSON valido, no testo, no backtick, max 5 step, max 5 materiali, descrizioni brevi:\n{"analysis":"2 frasi","recommendedLevel":"beginner","recommendedLevelReason":"1 frase","technique":"tecnica","materials":[{"name":"x","budget":"x€","mid":"x€","essential":true}],"steps":[{"number":1,"title":"x","description":"2 frasi","voiceover":"25 parole max","duration":"5","tip":null}]}` })

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 8000, messages: [{ role: 'user', content: contentParts }] })
  })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `Errore API: ${res.status}`) }
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  if (!text) throw new Error('Risposta vuota')
  return validateTutorial(extractJSON(text))
}

export default function NewProject({ onBack, onSave }) {
  const [title, setTitle] = useState('')
  const [imageData, setImageData] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [level, setLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState('upload')
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setImageData(ev.target.result); setImagePreview(ev.target.result) }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Inserisci un titolo'); return }
    if (!imageData && !imageUrl) { setError("Carica un'immagine o inserisci un URL"); return }
    setError(''); setLoading(true)
    try {
      const result = await analyzeImage(imageData, imageUrl, title, level)
      const project = { id: Date.now().toString(), title: title.trim(), imageData: imageData || imageUrl, level, levelLabel: LEVELS.find(l => l.value === level)?.label || '', status: 'new', createdAt: new Date().toISOString(), analysis: result.analysis, recommendedLevel: result.recommendedLevel, recommendedLevelReason: result.recommendedLevelReason, technique: result.technique, materials: result.materials || [], steps: result.steps || [], completedSteps: [] }
      onSave(project)
    } catch (err) {
      setError('Errore: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.back} onClick={onBack}>← Indietro</button>
        <h1 style={s.headerTitle}>Nuovo Progetto</h1>
        <div style={{ width: 80 }} />
      </header>
      <main style={s.main}>
        <div style={s.card}>
          <div style={s.field}>
            <label style={s.label}>Nome del progetto *</label>
            <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="es. Paesaggio astratto blu..." maxLength={80} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Quadro di riferimento *</label>
            <div style={s.tabs}>
              <button style={{ ...s.tab, ...(inputMode === 'upload' ? s.tabActive : {}) }} onClick={() => setInputMode('upload')}>📁 Carica file</button>
              <button style={{ ...s.tab, ...(inputMode === 'url' ? s.tabActive : {}) }} onClick={() => setInputMode('url')}>🔗 URL</button>
            </div>
            {inputMode === 'upload' ? (
              <div style={s.uploadArea} onClick={() => fileRef.current.click()}>
                {imagePreview ? <img src={imagePreview} alt="preview" style={s.preview} /> : <><div style={s.uploadIcon}>🖼️</div><div style={s.uploadText}>Tocca per scegliere</div><div style={s.uploadSub}>Immagine compressa automaticamente</div></>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </div>
            ) : (
              <div>
                <input style={s.input} value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImagePreview(e.target.value) }} placeholder="https://..." type="url" />
                {imagePreview && <img src={imagePreview} alt="preview" style={{ ...s.preview, marginTop: '0.75rem', borderRadius: 8 }} onError={() => setImagePreview(null)} />}
              </div>
            )}
          </div>
          <div style={s.field}>
            <label style={s.label}>Livello di partenza</label>
            <div style={s.levelGroup}>
              {LEVELS.map(l => (
                <button key={l.value} style={{ ...s.levelBtn, ...(level === l.value ? s.levelBtnActive : {}) }} onClick={() => setLevel(l.value)}>
                  <span style={s.levelLabel}>{l.label}</span>
                  <span style={s.levelDesc}>{l.desc}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button style={{ ...s.btnGenerate, ...(loading ? s.btnLoading : {}) }} onClick={handleSubmit} disabled={loading}>
            {loading ? <span style={s.loadingInner}><span style={s.spinner} />Analisi in corso... (15-30 sec)</span> : '✨ Genera tutorial'}
          </button>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--canvas)', display: 'flex', flexDirection: 'column' },
  header: { background: 'var(--ink)', color: 'white', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  back: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'white', fontWeight: 700 },
  main: { flex: 1, maxWidth: 600, width: '100%', margin: '0 auto', padding: '2rem 1.25rem' },
  card: { background: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem 1.5rem', boxShadow: 'var(--shadow)' },
  field: { marginBottom: '1.75rem' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--ink)' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '1rem', background: 'var(--canvas)', color: 'var(--ink)' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' },
  tab: { flex: 1, padding: '0.6rem', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', color: 'var(--muted)', fontSize: '0.85rem', cursor: 'pointer' },
  tabActive: { background: 'var(--canvas-alt)', borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 600 },
  uploadArea: { border: '2px dashed var(--border)', borderRadius: 12, padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'var(--canvas-alt)', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  uploadIcon: { fontSize: 36 },
  uploadText: { fontWeight: 500, color: 'var(--ink)', fontSize: '0.95rem' },
  uploadSub: { color: 'var(--muted)', fontSize: '0.8rem' },
  preview: { width: '100%', maxHeight: 240, objectFit: 'contain' },
  levelGroup: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  levelBtn: { padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: 10, background: 'white', cursor: 'pointer', textAlign: 'left' },
  levelBtnActive: { borderColor: 'var(--accent)', background: '#fff5f2' },
  levelLabel: { display: 'block', fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' },
  levelDesc: { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 },
  error: { background: '#ffeaea', border: '1px solid #ffb3b3', borderRadius: 8, padding: '0.75rem 1rem', color: '#b00020', fontSize: '0.9rem', marginBottom: '1rem' },
  btnGenerate: { width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '1rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' },
  btnLoading: { opacity: 0.7, cursor: 'not-allowed' },
  loadingInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' },
  spinner: { display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
}
