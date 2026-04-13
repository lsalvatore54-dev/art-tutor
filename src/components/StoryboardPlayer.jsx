import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function StoryboardPlayer({ steps, title, image, onClose, onStepComplete, completedSteps }) {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speechReady, setSpeechReady] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const utteranceRef = useRef(null)
  const autoTimer = useRef(null)

  const step = steps[current]

  // Carica voci disponibili
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      const italian = available.filter(v => v.lang.startsWith('it'))
      setVoices(italian.length > 0 ? italian : available.slice(0, 5))
      if (italian.length > 0 && !selectedVoice) setSelectedVoice(italian[0])
      setSpeechReady('speechSynthesis' in window)
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { stopSpeech() }
  }, [])

  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setPlaying(false)
  }, [])

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 0.9
    utterance.pitch = 1.05
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.onend = onEnd || null
    utterance.onerror = () => setPlaying(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setPlaying(true)
  }, [selectedVoice])

  const handlePlay = () => {
    if (playing) {
      stopSpeech()
    } else {
      const text = `Step ${step.number}. ${step.title}. ${step.voiceover}`
      speak(text, () => {
        setPlaying(false)
        if (autoAdvance && current < steps.length - 1) {
          autoTimer.current = setTimeout(() => {
            setCurrent(prev => prev + 1)
          }, 1200)
        }
      })
    }
  }

  const goTo = (idx) => {
    stopSpeech()
    setCurrent(idx)
  }

  const prev = () => { if (current > 0) goTo(current - 1) }
  const next = () => { if (current < steps.length - 1) goTo(current + 1) }

  const markDone = () => {
    onStepComplete(step.number)
  }

  const isDone = completedSteps.includes(step.number)
  const progress = ((current) / (steps.length - 1)) * 100

  return (
    <div style={styles.overlay}>
      {/* Header player */}
      <div style={styles.playerHeader}>
        <div style={styles.playerTitle}>{title}</div>
        <button style={styles.closeBtn} onClick={() => { stopSpeech(); onClose() }}>✕</button>
      </div>

      {/* Progress bar steps */}
      <div style={styles.stepsBar}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              ...styles.stepDot,
              ...(i === current ? styles.stepDotActive : {}),
              ...(completedSteps.includes(s.number) ? styles.stepDotDone : {}),
              ...(i < current ? styles.stepDotPast : {})
            }}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {/* Contenuto step */}
      <div style={styles.content}>
        {image && (
          <div style={styles.imgThumb}>
            <img src={image} alt="riferimento" style={styles.thumbImg} />
          </div>
        )}

        <div style={styles.stepNumber}>Step {step.number} di {steps.length}</div>
        <h2 style={styles.stepTitle}>{step.title}</h2>
        <p style={styles.stepVoiceover}>{step.voiceover}</p>
        {step.tip && <div style={styles.tipBox}>💡 {step.tip}</div>}
        <div style={styles.duration}>⏱ Circa {step.duration} minuti</div>
      </div>

      {/* Selettore voce (se più voci disponibili) */}
      {voices.length > 1 && (
        <div style={styles.voiceRow}>
          <span style={styles.voiceLabel}>🔊 Voce:</span>
          <select
            style={styles.voiceSelect}
            value={selectedVoice?.name || ''}
            onChange={e => {
              const v = voices.find(v => v.name === e.target.value)
              setSelectedVoice(v)
            }}
          >
            {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
        </div>
      )}

      {/* Auto-avanza toggle */}
      <div style={styles.autoRow}>
        <label style={styles.autoLabel}>
          <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} style={{ marginRight: 6 }} />
          Avanza automaticamente dopo la voce
        </label>
      </div>

      {/* Controlli */}
      <div style={styles.controls}>
        <button style={{ ...styles.navBtn, opacity: current === 0 ? 0.3 : 1 }} onClick={prev} disabled={current === 0}>◀</button>

        <button style={{ ...styles.playBtn, ...(playing ? styles.pauseBtn : {}) }} onClick={handlePlay}>
          {playing ? '⏸' : '▶'}
        </button>

        <button style={{ ...styles.navBtn, opacity: current === steps.length - 1 ? 0.3 : 1 }} onClick={next} disabled={current === steps.length - 1}>▶</button>
      </div>

      {/* Marca come fatto */}
      <button style={{ ...styles.doneBtn, ...(isDone ? styles.doneBtnActive : {}) }} onClick={markDone}>
        {isDone ? '✓ Step completato' : 'Segna come completato'}
      </button>

      {!speechReady && (
        <div style={styles.noSpeech}>⚠️ Voce non disponibile su questo browser. Il tutorial funziona comunque visivamente.</div>
      )}
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#1a0f0f 0%, #2d1040 100%)', zIndex: 300, display: 'flex', flexDirection: 'column', color: 'white', overflowY: 'auto' },
  playerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  playerTitle: { fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, flex: 1, paddingRight: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  closeBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: '1rem', cursor: 'pointer' },
  stepsBar: { display: 'flex', gap: 4, padding: '0.75rem 1.25rem', flexWrap: 'wrap' },
  stepDot: { width: 28, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.2s', flex: '1 0 auto', maxWidth: 40 },
  stepDotActive: { background: '#c9962a', transform: 'scaleY(1.5)' },
  stepDotDone: { background: '#2d6a4f' },
  stepDotPast: { background: 'rgba(255,255,255,0.4)' },
  content: { flex: 1, padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  imgThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-end', opacity: 0.7 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  stepNumber: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  stepTitle: { fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, color: '#f5e6c0' },
  stepVoiceover: { fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', flex: 1 },
  tipBox: { background: 'rgba(201,150,42,0.2)', border: '1px solid rgba(201,150,42,0.4)', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.85rem', color: '#f5e6c0', fontStyle: 'italic' },
  duration: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' },
  voiceRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1.25rem' },
  voiceLabel: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' },
  voiceSelect: { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '0.3rem 0.5rem', fontSize: '0.8rem', flex: 1 },
  autoRow: { padding: '0.5rem 1.25rem' },
  autoLabel: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1rem 1.25rem' },
  navBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 50, height: 50, borderRadius: '50%', fontSize: '1.1rem', cursor: 'pointer' },
  playBtn: { background: '#c1440e', border: 'none', color: 'white', width: 72, height: 72, borderRadius: '50%', fontSize: '1.6rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(193,68,14,0.5)', transition: 'transform 0.2s' },
  pauseBtn: { background: '#5c3d8f', boxShadow: '0 4px 20px rgba(92,61,143,0.5)' },
  doneBtn: { margin: '0 1.25rem 1.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  doneBtnActive: { background: 'rgba(45,106,79,0.4)', borderColor: '#2d6a4f', color: '#6fcf97' },
  noSpeech: { margin: '0 1.25rem 1.5rem', padding: '0.75rem', background: 'rgba(255,200,0,0.1)', borderRadius: 8, fontSize: '0.82rem', color: 'rgba(255,200,0,0.8)', textAlign: 'center' }
}
