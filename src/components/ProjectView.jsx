import React, { useState } from 'react'
import StoryboardPlayer from './StoryboardPlayer.jsx'
import MaterialsList from './MaterialsList.jsx'

const LEVELS = [
  { value: 'beginner',     label: '🟢 Principiante' },
  { value: 'intermediate', label: '🟡 Intermedio' },
  { value: 'expert',       label: '🔴 Esperto' },
]

const STATUS_OPTIONS = [
  { value: 'new',      label: '⬜ Nuovo' },
  { value: 'progress', label: '🔵 In corso' },
  { value: 'done',     label: '✅ Completato' },
]

async function regenerateTutorial(project, newLevel) {
  const levelDescriptions = {
    beginner: 'principiante assoluto che usa acrilico a pennello piatto su tela pretrattata',
    intermediate: 'pittore intermedio che usa acrilico con spatola e pennello',
    expert: 'pittore esperto che usa tecnica mista con acrilico, medium strutturato e collage'
  }

  const contentParts = []
  if (project.imageData) {
    if (project.imageData.startsWith('data:')) {
      const base64 = project.imageData.split(',')[1]
      const mimeMatch = project.imageData.match(/data:([^;]+);/)
      const mediaType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
    } else {
      contentParts.push({ type: 'image', source: { type: 'url', url: project.imageData } })
    }
  }

  contentParts.push({
    type: 'text',
    text: `Sei un insegnante d'arte esperto. Rigenera il tutorial per questo quadro per un ${levelDescriptions[newLevel]}.

Progetto: "${project.title}"

Rispondi SOLO con JSON valido, nessun testo extra, nessun backtick:
{
  "analysis": "breve analisi stile e tecnica (2-3 frasi)",
  "technique": "tecnica specifica per questo livello",
  "materials": [
    { "name": "materiale", "budget": "opzione €", "mid": "opzione media €", "essential": true }
  ],
  "steps": [
    {
      "number": 1,
      "title": "Titolo step",
      "description": "Descrizione dettagliata per il livello indicato.",
      "voiceover": "Testo audio incoraggiante, tono caldo, usa 'tu', circa 40-60 parole.",
      "duration": "minuti",
      "tip": "consiglio opzionale"
    }
  ]
}`
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

export default function ProjectView({ project, onBack, onUpdate, onDelete }) {
  const [tab, setTab] = useState('storyboard') // storyboard | materials | voiceover
  const [playerOpen, setPlayerOpen] = useState(false)
  const [levelDialog, setLevelDialog] = useState(null) // null | { newLevel, newLevelLabel }
  const [regenMode, setRegenMode] = useState(null) // null | 'new' | 'overwrite'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleStep = (stepNum) => {
    const completed = project.completedSteps || []
    const updated = completed.includes(stepNum)
      ? completed.filter(n => n !== stepNum)
      : [...completed, stepNum]
    const status = updated.length === 0 ? 'new' : updated.length === project.steps.length ? 'done' : 'progress'
    onUpdate({ ...project, completedSteps: updated, status })
  }

  const handleLevelChange = (newLevel) => {
    if (newLevel === project.level) return
    const newLevelLabel = LEVELS.find(l => l.value === newLevel)?.label || ''
    setLevelDialog({ newLevel, newLevelLabel })
  }

  const confirmLevelChange = async (mode) => {
    const { newLevel, newLevelLabel } = levelDialog
    setLevelDialog(null)
    setLoading(true)
    setError('')
    try {
      const result = await regenerateTutorial(project, newLevel)
      const updated = {
        ...project,
        level: newLevel,
        levelLabel: newLevelLabel,
        technique: result.technique,
        analysis: result.analysis,
        materials: result.materials,
        steps: result.steps,
        completedSteps: [],
        status: 'new'
      }
      if (mode === 'new') {
        const newProject = { ...updated, id: Date.now().toString(), title: `${project.title} — ${newLevelLabel}`, createdAt: new Date().toISOString() }
        onUpdate(newProject)
      } else {
        onUpdate(updated)
      }
    } catch (err) {
      setError('Errore rigenerazione: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const progress = project.steps ? Math.round((project.completedSteps?.length || 0) / project.steps.length * 100) : 0
  const voiceoverText = project.steps?.map((s, i) =>
    `Step ${s.number} — ${s.title}.\n${s.voiceover}`
  ).join('\n\n')

  const copyVoiceover = () => {
    navigator.clipboard.writeText(voiceoverText || '')
      .then(() => alert('Testo copiato! Incollalo su ElevenLabs per una voce professionale.'))
      .catch(() => alert('Copia manualmente il testo qui sotto.'))
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.back} onClick={onBack}>← Indietro</button>
        <h1 style={styles.headerTitle}>{project.title}</h1>
        <select
          style={styles.levelSelect}
          value={project.level}
          onChange={e => handleLevelChange(e.target.value)}
        >
          {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </header>

      {/* Immagine + info */}
      <div style={styles.hero}>
        <div style={styles.heroImg}>
          {project.imageData && <img src={project.imageData} alt={project.title} style={styles.img} />}
        </div>
        <div style={styles.heroInfo}>
          <p style={styles.analysis}>{project.analysis}</p>
          {project.recommendedLevel && project.recommendedLevel !== project.level && (
            <div style={styles.recBox}>
              💡 Livello consigliato: <strong>{LEVELS.find(l => l.value === project.recommendedLevel)?.label}</strong>
              <br /><span style={{ fontSize: '0.8rem' }}>{project.recommendedLevelReason}</span>
            </div>
          )}
          <div style={styles.metaRow}>
            <span style={styles.technique}>🖌️ {project.technique}</span>
            <select
              style={styles.statusSelect}
              value={project.status}
              onChange={e => onUpdate({ ...project, status: e.target.value })}
            >
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {/* Progress bar */}
          <div style={styles.progressWrap}>
            <div style={styles.progressLabel}>
              <span>Avanzamento</span>
              <span style={{ fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
          {/* Tasto play */}
          <button style={styles.btnPlay} onClick={() => setPlayerOpen(true)}>
            ▶ Avvia tutorial audio
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['storyboard', 'materials', 'voiceover'].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === 'storyboard' ? '📋 Tutorial' : t === 'materials' ? '🛒 Materiali' : '🔊 Voiceover'}
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      <main style={styles.main}>
        {loading && <div style={styles.loadingBox}>⏳ Rigenerazione tutorial in corso...</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        {tab === 'storyboard' && (
          <div style={styles.stepList}>
            {project.steps?.map((step) => (
              <StepCard
                key={step.number}
                step={step}
                completed={(project.completedSteps || []).includes(step.number)}
                onToggle={() => toggleStep(step.number)}
              />
            ))}
          </div>
        )}

        {tab === 'materials' && <MaterialsList materials={project.materials} />}

        {tab === 'voiceover' && (
          <div style={styles.voiceoverBox}>
            <div style={styles.voiceoverHeader}>
              <h3 style={styles.voiceoverTitle}>Testo per ElevenLabs</h3>
              <button style={styles.btnCopy} onClick={copyVoiceover}>📋 Copia tutto</button>
            </div>
            <p style={styles.voiceoverHint}>Copia questo testo e incollalo su <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" style={{ color: 'var(--violet)' }}>elevenlabs.io</a> per ottenere una voce professionale italiana.</p>
            <pre style={styles.voiceoverPre}>{voiceoverText}</pre>
          </div>
        )}

        {/* Danger zone */}
        <div style={styles.dangerZone}>
          <button style={styles.btnDelete} onClick={() => {
            if (window.confirm('Eliminare definitivamente questo progetto?')) onDelete(project.id)
          }}>🗑️ Elimina progetto</button>
        </div>
      </main>

      {/* Dialog cambio livello */}
      {levelDialog && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>Cambia livello</h3>
            <p style={styles.dialogText}>Vuoi passare a <strong>{levelDialog.newLevelLabel}</strong> per questo quadro.</p>
            <p style={styles.dialogText}>Come vuoi procedere?</p>
            <div style={styles.dialogBtns}>
              <button style={styles.btnDialogPrimary} onClick={() => confirmLevelChange('new')}>
                ✨ Crea nuovo progetto
              </button>
              <button style={styles.btnDialogSecondary} onClick={() => confirmLevelChange('overwrite')}>
                ♻️ Sovrascrivi questo
              </button>
              <button style={styles.btnDialogCancel} onClick={() => setLevelDialog(null)}>
                ✕ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player fullscreen */}
      {playerOpen && (
        <StoryboardPlayer
          steps={project.steps}
          title={project.title}
          image={project.imageData}
          onClose={() => setPlayerOpen(false)}
          onStepComplete={toggleStep}
          completedSteps={project.completedSteps || []}
        />
      )}
    </div>
  )
}

function StepCard({ step, completed, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ ...styles.stepCard, ...(completed ? styles.stepDone : {}) }} className="fade-in">
      <div style={styles.stepHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.stepLeft}>
          <button style={{ ...styles.checkBtn, ...(completed ? styles.checkBtnDone : {}) }} onClick={e => { e.stopPropagation(); onToggle() }}>
            {completed ? '✓' : step.number}
          </button>
          <div>
            <div style={styles.stepTitle}>{step.title}</div>
            <div style={styles.stepDuration}>⏱ {step.duration} min</div>
          </div>
        </div>
        <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={styles.stepBody}>
          <p style={styles.stepDesc}>{step.description}</p>
          {step.tip && <div style={styles.tipBox}>💡 {step.tip}</div>}
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--canvas)', display: 'flex', flexDirection: 'column' },
  header: { background: 'var(--ink)', color: 'white', padding: '0 1rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', position: 'sticky', top: 0, zIndex: 100 },
  back: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'white', fontWeight: 700, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  levelSelect: { background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '0.3rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer' },
  hero: { display: 'flex', flexWrap: 'wrap', gap: '1.25rem', padding: '1.25rem', background: 'white', borderBottom: '1px solid var(--border)' },
  heroImg: { flex: '0 0 auto', width: 140, height: 140, borderRadius: 10, overflow: 'hidden', background: 'var(--canvas-alt)' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  heroInfo: { flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  analysis: { fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 },
  recBox: { background: 'var(--gold-light)', border: '1px solid var(--gold)', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.82rem', color: '#5a3e00' },
  metaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' },
  technique: { fontSize: '0.82rem', color: 'var(--violet)', fontWeight: 600 },
  statusSelect: { background: 'var(--canvas-alt)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer' },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)' },
  progressBar: { height: 6, background: 'var(--canvas-alt)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s' },
  btnPlay: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '0.7rem 1.2rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginTop: 4 },
  tabs: { display: 'flex', borderBottom: '2px solid var(--border)', background: 'white', position: 'sticky', top: 64, zIndex: 90 },
  tab: { flex: 1, padding: '0.85rem 0.5rem', background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, transition: 'all 0.2s' },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)', fontWeight: 700 },
  main: { flex: 1, maxWidth: 700, width: '100%', margin: '0 auto', padding: '1.25rem' },
  loadingBox: { background: 'var(--gold-light)', borderRadius: 10, padding: '1rem', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' },
  errorBox: { background: '#ffeaea', borderRadius: 10, padding: '1rem', color: '#b00020', marginBottom: '1rem', fontSize: '0.9rem' },
  stepList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  stepCard: { background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)', transition: 'opacity 0.2s' },
  stepDone: { opacity: 0.65 },
  stepHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem', cursor: 'pointer' },
  stepLeft: { display: 'flex', alignItems: 'center', gap: '0.85rem' },
  checkBtn: { width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border)', background: 'white', fontWeight: 700, fontSize: '0.9rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' },
  checkBtnDone: { background: 'var(--green)', borderColor: 'var(--green)', color: 'white' },
  stepTitle: { fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' },
  stepDuration: { fontSize: '0.76rem', color: 'var(--muted)', marginTop: 2 },
  chevron: { color: 'var(--muted)', fontSize: '0.75rem' },
  stepBody: { padding: '0 1rem 1rem', borderTop: '1px solid var(--canvas-alt)' },
  stepDesc: { fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.6, paddingTop: '0.75rem' },
  tipBox: { marginTop: '0.75rem', background: 'var(--gold-light)', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.83rem', color: '#5a3e00', fontStyle: 'italic' },
  voiceoverBox: { background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' },
  voiceoverHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' },
  voiceoverTitle: { fontFamily: 'var(--font-display)', fontSize: '1.1rem' },
  btnCopy: { background: 'var(--violet)', color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  voiceoverHint: { fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.5 },
  voiceoverPre: { background: 'var(--canvas-alt)', borderRadius: 8, padding: '1rem', fontSize: '0.82rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink)', maxHeight: 500, overflowY: 'auto' },
  dangerZone: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)', textAlign: 'center' },
  btnDelete: { background: 'none', border: '1px solid #ffb3b3', color: '#b00020', borderRadius: 8, padding: '0.6rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  dialog: { background: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem 1.5rem', maxWidth: 380, width: '100%', boxShadow: 'var(--shadow-lg)' },
  dialogTitle: { fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '0.75rem' },
  dialogText: { fontSize: '0.92rem', color: 'var(--ink)', marginBottom: '0.5rem', lineHeight: 1.5 },
  dialogBtns: { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' },
  btnDialogPrimary: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '0.85rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' },
  btnDialogSecondary: { background: 'var(--violet-light)', color: 'var(--violet)', border: '1px solid var(--violet)', borderRadius: 10, padding: '0.85rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' },
  btnDialogCancel: { background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }
}
