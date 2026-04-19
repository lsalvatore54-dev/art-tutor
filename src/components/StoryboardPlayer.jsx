import React, { useState, useEffect, useRef, useCallback } from 'react'

async function fetchElevenLabsAudio(text, apiKey, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  })
  if (!res.ok) throw new Error('ElevenLabs error: ' + res.status)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function StoryboardPlayer({ steps, title, image, onClose, onStepComplete, completedSteps, elevenLabsKey, elevenLabsVoice }) {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audioCache, setAudioCache] = useState({})
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [useElevenLabs, setUseElevenLabs] = useState(!!(elevenLabsKey && elevenLabsVoice))
  const audioRef = useRef(null)
  const autoTimer = useRef(null)
  const synthRef = useRef(null)

  const step = steps[current]
  const isDone = completedSteps.includes(step.number)

  useEffect(() => {
    return () => {
      stopAll()
      Object.values(audioCache).forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  const stopAll = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setPlaying(false)
    setLoading(false)
  }, [])

  const advanceAfterPlay = useCallback((idx) => {
    if (autoAdvance && idx < steps.length - 1) {
      autoTimer.current = setTimeout(() => {
        setCurrent(idx + 1)
      }, 1200)
    }
  }, [autoAdvance, steps.length])

  const playWithElevenLabs = useCallback(async (idx) => {
    const s = steps[idx]
    const text = `Step ${s.number}. ${s.title}. ${s.voiceover}`
    setLoading(true)
    try {
      let url = audioCache[idx]
      if (!url) {
        url = await fetchElevenLabsAudio(text, elevenLabsKey, elevenLabsVoice)
        setAudioCache(prev => ({ ...prev, [idx]: url }))
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onplay = () => { setLoading(false); setPlaying(true) }
      audio.onended = () => { setPlaying(false); advanceAfterPlay(idx) }
      audio.onerror = () => { setLoading(false); setPlaying(false) }
      await audio.play()
    } catch (err) {
      setLoading(false)
      setPlaying(false)
      console.error('ElevenLabs error:', err)
      // Fallback a voce browser
      playWithBrowser(idx)
    }
  }, [audioCache, elevenLabsKey, elevenLabsVoice, advanceAfterPlay, steps])

  const playWithBrowser = useCallback((idx) => {
    if (!window.speechSynthesis) return
    const s = steps[idx]
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(`Step ${s.number}. ${s.title}. ${s.voiceover}`)
    u.lang = 'it-IT'; u.rate = 0.85; u.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    const itVoice = voices.find(v => v.lang.startsWith('it'))
    if (itVoice) u.voice = itVoice
    u.onstart = () => setPlaying(true)
    u.onend = () => { setPlaying(false); advanceAfterPlay(idx) }
    u.onerror = () => setPlaying(false)
    window.speechSynthesis.speak(u)
  }, [steps, advanceAfterPlay])

  const handlePlay = () => {
    if (playing || loading) { stopAll(); return }
    if (useElevenLabs && elevenLabsKey && elevenLabsVoice) {
      playWithElevenLabs(current)
    } else {
      playWithBrowser(current)
    }
  }

  const goTo = (idx) => { stopAll(); setCurrent(idx) }
  const prev = () => { if (current > 0) goTo(current - 1) }
  const next = () => { if (current < steps.length - 1) goTo(current + 1) }
  const markDone = () => onStepComplete(step.number)

  const progress = ((current) / (steps.length - 1)) * 100

  // Colori per ogni step
  const stepColors = ['#c1440e','#7b1fa2','#1565c0','#2e7d32','#f57f17','#ad1457','#00695c','#4527a0','#558b2f','#6a1b9a']
  const stepColor = stepColors[current % stepColors.length]

  return (
    <div style={s.overlay}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>{title}</div>
        <div style={s.headerRight}>
          {elevenLabsKey && (
            <button
              style={{ ...s.toggleVoice, ...(useElevenLabs ? s.toggleVoiceActive : {}) }}
              onClick={() => { stopAll(); setUseElevenLabs(!useElevenLabs) }}
              title={useElevenLabs ? 'Voce ElevenLabs attiva' : 'Voce browser attiva'}
            >
              {useElevenLabs ? '🎙 ElevenLabs' : '🔊 Browser'}
            </button>
          )}
          <button style={s.closeBtn} onClick={() => { stopAll(); onClose() }}>✕</button>
        </div>
      </div>

      {/* Step dots */}
      <div style={s.dotsRow}>
        {steps.map((st, i) => (
          <div
            key={i}
            onClick={() => goTo(i)}
            style={{
              ...s.dot,
              background: i === current ? stepColor : completedSteps.includes(st.number) ? '#2d6a4f' : 'rgba(255,255,255,0.2)',
              transform: i === current ? 'scaleY(1.8)' : 'none'
            }}
          />
        ))}
      </div>

      {/* CARD PRINCIPALE */}
      <div style={{ ...s.card, borderTop: `4px solid ${stepColor}` }} key={current}>

        {/* Immagine riferimento + numero step */}
        <div style={s.cardTop}>
          <div style={s.stepBadge}>
            <div style={{ ...s.stepCircle, background: stepColor }}>{step.number}</div>
            <div style={s.stepOf}>di {steps.length}</div>
          </div>
          {image && (
            <div style={s.refImg}>
              <img src={image} alt="riferimento" style={s.refImgEl} />
              <div style={s.refLabel}>Riferimento</div>
            </div>
          )}
        </div>

        {/* Titolo step */}
        <h2 style={{ ...s.stepTitle, color: stepColor }}>{step.title}</h2>

        {/* Descrizione */}
        <div style={s.descBox}>
          <p style={s.stepDesc}>{step.description}</p>
        </div>

        {/* Tip */}
        {step.tip && (
          <div style={s.tipBox}>
            <span style={s.tipIcon}>💡</span>
            <span style={s.tipText}>{step.tip}</span>
          </div>
        )}

        {/* Durata */}
        <div style={s.duration}>⏱ Circa {step.duration} minuti</div>

        {/* Voiceover testo */}
        <div style={{ ...s.voiceBox, borderLeft: `3px solid ${stepColor}` }}>
          <div style={s.voiceLabel}>{loading ? '⏳ Caricamento voce...' : playing ? '🔊 In riproduzione...' : '🎙 Testo audio'}</div>
          <p style={s.voiceText}>{step.voiceover}</p>
        </div>
      </div>

      {/* Auto-avanza */}
      <div style={s.autoRow}>
        <label style={s.autoLabel}>
          <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} style={{ marginRight: 6 }} />
          Avanza automaticamente dopo l'audio
        </label>
      </div>

      {/* Controlli */}
      <div style={s.controls}>
        <button style={{ ...s.navBtn, opacity: current === 0 ? 0.3 : 1 }} onClick={prev} disabled={current === 0}>◀</button>
        <button style={{ ...s.playBtn, background: loading ? '#666' : playing ? '#5c3d8f' : stepColor }} onClick={handlePlay}>
          {loading ? '⏳' : playing ? '⏸' : '▶'}
        </button>
        <button style={{ ...s.navBtn, opacity: current === steps.length - 1 ? 0.3 : 1 }} onClick={next} disabled={current === steps.length - 1}>▶</button>
      </div>

      {/* Marca completato */}
      <button style={{ ...s.doneBtn, ...(isDone ? s.doneBtnActive : {}) }} onClick={markDone}>
        {isDone ? '✓ Step completato' : 'Segna come completato'}
      </button>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#1a0f0f 0%,#2d1040 100%)', zIndex: 300, display: 'flex', flexDirection: 'column', color: 'white', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', gap: '0.5rem' },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 },
  toggleVoice: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '0.3rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' },
  toggleVoiceActive: { background: 'rgba(193,68,14,0.3)', borderColor: '#c1440e', color: '#e8927c' },
  closeBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: '1rem', cursor: 'pointer', flexShrink: 0 },
  dotsRow: { display: 'flex', gap: 4, padding: '0.75rem 1.25rem', flexWrap: 'wrap' },
  dot: { flex: '1 0 auto', maxWidth: 40, height: 6, borderRadius: 3, cursor: 'pointer', transition: 'all 0.3s' },
  card: { margin: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.25rem', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.35s ease both' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  stepBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  stepCircle: { width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  stepOf: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' },
  refImg: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  refImgEl: { width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' },
  refLabel: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' },
  stepTitle: { fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.3 },
  descBox: { background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.9rem', marginBottom: '0.75rem' },
  stepDesc: { fontSize: '0.92rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' },
  tipBox: { display: 'flex', gap: '0.6rem', background: 'rgba(201,150,42,0.15)', border: '1px solid rgba(201,150,42,0.3)', borderRadius: 10, padding: '0.75rem', marginBottom: '0.75rem' },
  tipIcon: { fontSize: '1rem', flexShrink: 0 },
  tipText: { fontSize: '0.85rem', color: '#f5e6c0', fontStyle: 'italic', lineHeight: 1.5 },
  duration: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' },
  voiceBox: { background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.9rem', marginTop: '0.25rem' },
  voiceLabel: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' },
  voiceText: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontStyle: 'italic' },
  autoRow: { padding: '0.5rem 1.25rem' },
  autoLabel: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '0.75rem 1.25rem' },
  navBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 50, height: 50, borderRadius: '50%', fontSize: '1.1rem', cursor: 'pointer' },
  playBtn: { border: 'none', color: 'white', width: 72, height: 72, borderRadius: '50%', fontSize: '1.6rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'background 0.3s' },
  doneBtn: { margin: '0 1.25rem 1.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  doneBtnActive: { background: 'rgba(45,106,79,0.4)', borderColor: '#2d6a4f', color: '#6fcf97' }
}
