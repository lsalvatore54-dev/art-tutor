import React, { useState, useRef } from 'react'

const LEVELS = [
  { value: 'beginner',     label: '🟢 Principiante', desc: 'Acrilico a pennello — il punto di partenza ideale' },
  { value: 'intermediate', label: '🟡 Intermedio',    desc: 'Acrilico + spatola, più texture e profondità' },
  { value: 'expert',       label: '🔴 Esperto',        desc: 'Tecnica mista — il tuo stile personale' },
]

async function analyzeImage(imageData, imageUrl, title, level) {
  const levelDescriptions = {
    beginner: 'principiante assoluto che usa acrilico a pennello piatto su tela pretrattata',
    intermediate: 'pittore intermedio che usa acrilico con spatola e pennello su tela grezza',
    expert: 'pittore esperto che usa tecnica mista con acrilico, medium strutturato e collage'
  }

  const contentParts = []
  if (imageData) {
    const base64 = imageData.split(',')[1]
    const mimeMatch = imageData.match(/data:([^;]+);/)
    const mediaType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    contentParts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
  } else if (imageUrl) {
    contentParts.push({ type: 'image', source: { type: 'url', url: imageUrl } })
  }

  contentParts.push({
    type: 'text',
    text: `Sei un insegnante d'arte esperto che parla italiano. Analizza questo quadro e crea un tutorial dettagliato per ricreare questo stile.

Progetto: "${title}"
Livello pittore: ${levelDescriptions[level]}

Rispondi SOLO con un oggetto JSON valido, nessun testo prima o dopo, nessun backtick markdown:
{
  "analysis": "breve analisi del quadro: stile, colori dominanti, tecnica visibile (2-3 frasi)",
  "recommendedLevel": "beginner|intermediate|expert",
  "recommendedLevelReason": "perché hai consigliato questo livello (1 frase)",
  "technique": "nome della tecnica da usare per questo livello",
  "materials": [
    { "name": "nome materiale", "budget": "opzione economica con prezzo indicativo €", "mid": "opzione media con prezzo indicativo €", "essential": true/false }
  ],
  "steps": [
    {
      "number": 1,
      "title": "Titolo breve step",
      "description": "Descrizione dettagliata per un principiante assoluto. Spiega ogni gesto, perché farlo, come tenere il pennello, quanto diluire il colore, ecc. Almeno 3-4 frasi.",
      "voiceover": "Testo da leggere ad alta voce durante questo step. Tono caldo, incoraggiante, come un insegnante di fiducia. Usa 'tu'. Circa 40-60 parole.",
      "duration": "tempo stimato in minuti",
      "tip": "consiglio pratico opzionale per questo step"
    }
  ]
}

Genera tra 7 e 10 step. I materiali devono essere accessibili e economici per un hobby. Sii incoraggiante e positivo nel voiceover.`
  })

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: contentParts }]
    })
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Errore API')

  const text = data.content?.[0]?.text || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export default function NewProject({ onBack, onSave }) {
  const [title, setTitle] = useState('')
  const [imageData, setImageData] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [level, setLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState('upload') // upload | url
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageData(ev.target.result)
      setImagePreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUrl = (url) => {
    setImageUrl(url)
    setImagePreview(url)
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Inserisci un titolo per il progetto'); return }
    if (!imageData && !imageUrl) { setError('Carica un\'immagine o inserisci un URL'); return }
    setError('')
    setLoading(true)
    try {
      const result = await analyzeImage(imageData, imageUrl, title, level)
      const project = {
        id: Date.now().toString(),
        title: title.trim(),
        imageData: imageData || imageUrl,
        level,
        levelLabel: LEVELS.find(l => l.value === level)?.label || '',
        status: 'new',
        createdAt: new Date().toISOString(),
        analysis: result.analysis,
        recommendedLevel: result.recommendedLevel,
        recommendedLevelReason: result.recommendedLevelReason,
        technique: result.technique,
        materials: result.materials || [],
        steps: result.steps || [],
        completedSteps: []
      }
      onSave(project)
    } catch (err) {
      setError('Errore durante l\'analisi: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.back} onClick={onBack}>← Indietro</button>
        <h1 style={styles.headerTitle}>Nuovo Progetto</h1>
        <div style={{ width: 80 }} />
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          {/* Titolo */}
          <div style={styles.field}>
            <label style={styles.label}>Nome del progetto *</label>
            <input
              style={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="es. Paesaggio astratto blu..."
              maxLength={80}
            />
          </div>

          {/* Immagine */}
          <div style={styles.field}>
            <label style={styles.label}>Quadro di riferimento *</label>
            <div style={styles.tabs}>
              <button style={{ ...styles.tab, ...(inputMode === 'upload' ? styles.tabActive : {}) }} onClick={() => setInputMode('upload')}>📁 Carica file</button>
              <button style={{ ...styles.tab, ...(inputMode === 'url' ? styles.tabActive : {}) }} onClick={() => setInputMode('url')}>🔗 URL immagine</button>
            </div>
            {inputMode === 'upload' ? (
              <div style={styles.uploadArea} onClick={() => fileRef.current.click()}>
                {imagePreview && inputMode === 'upload' ? (
                  <img src={imagePreview} alt="preview" style={styles.preview} />
                ) : (
                  <>
                    <div style={styles.uploadIcon}>🖼️</div>
                    <div style={styles.uploadText}>Tocca per scegliere un'immagine</div>
                    <div style={styles.uploadSub}>JPG, PNG, WEBP</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </div>
            ) : (
              <div>
                <input
                  style={styles.input}
                  value={imageUrl}
                  onChange={e => handleUrl(e.target.value)}
                  placeholder="https://esempio.com/quadro.jpg"
                  type="url"
                />
                {imagePreview && inputMode === 'url' && (
                  <img src={imagePreview} alt="preview" style={{ ...styles.preview, marginTop: '0.75rem', borderRadius: 8 }} onError={() => setImagePreview(null)} />
                )}
              </div>
            )}
          </div>

          {/* Livello */}
          <div style={styles.field}>
            <label style={styles.label}>Livello di partenza</label>
            <div style={styles.levelGroup}>
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  style={{ ...styles.levelBtn, ...(level === l.value ? styles.levelBtnActive : {}) }}
                  onClick={() => setLevel(l.value)}
                >
                  <span style={styles.levelLabel}>{l.label}</span>
                  <span style={styles.levelDesc}>{l.desc}</span>
                </button>
              ))}
            </div>
            <p style={styles.hint}>💡 L'app analizzerà il quadro e ti mostrerà anche il livello consigliato</p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={{ ...styles.btnGenerate, ...(loading ? styles.btnLoading : {}) }} onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span style={styles.loadingInner}>
                <span style={styles.spinner} />
                Analisi in corso... (può richiedere 10-20 secondi)
              </span>
            ) : '✨ Genera tutorial personalizzato'}
          </button>
        </div>
      </main>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--canvas)', display: 'flex', flexDirection: 'column' },
  header: { background: 'var(--ink)', color: 'white', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  back: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0' },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'white', fontWeight: 700 },
  main: { flex: 1, maxWidth: 600, width: '100%', margin: '0 auto', padding: '2rem 1.25rem' },
  card: { background: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem 1.5rem', boxShadow: 'var(--shadow)' },
  field: { marginBottom: '1.75rem' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--ink)' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '1rem', background: 'var(--canvas)', color: 'var(--ink)' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' },
  tab: { flex: 1, padding: '0.6rem', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
  tabActive: { background: 'var(--canvas-alt)', borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 600 },
  uploadArea: { border: '2px dashed var(--border)', borderRadius: 12, padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'var(--canvas-alt)', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  uploadIcon: { fontSize: 36 },
  uploadText: { fontWeight: 500, color: 'var(--ink)', fontSize: '0.95rem' },
  uploadSub: { color: 'var(--muted)', fontSize: '0.8rem' },
  preview: { width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8 },
  levelGroup: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  levelBtn: { padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: 10, background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  levelBtnActive: { borderColor: 'var(--accent)', background: '#fff5f2' },
  levelLabel: { display: 'block', fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' },
  levelDesc: { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 },
  hint: { marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' },
  error: { background: '#ffeaea', border: '1px solid #ffb3b3', borderRadius: 8, padding: '0.75rem 1rem', color: '#b00020', fontSize: '0.9rem', marginBottom: '1rem' },
  btnGenerate: { width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '1rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' },
  btnLoading: { opacity: 0.7, cursor: 'not-allowed' },
  loadingInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' },
  spinner: { display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
}
