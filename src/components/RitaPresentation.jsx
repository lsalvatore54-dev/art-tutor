import React, { useState, useEffect, useRef } from 'react'

const SLIDES = [
  {
    id: 0,
    bg: 'linear-gradient(160deg, #1a0a2e 0%, #6a1b9a 100%)',
    emoji: '♥',
    emojiSize: 72,
    title: 'Rita',
    subtitle: 'ho pensato a qualcosa di speciale per te',
    body: null,
    voice: 'Rita, questo è un regalo che ho creato pensando a te. Qualcosa di tuo, che porti sempre con te.'
  },
  {
    id: 1,
    bg: 'linear-gradient(160deg, #fff8f0 0%, #fce4ec 100%)',
    emoji: '🎨',
    emojiSize: 56,
    title: 'Il tuo Atelier Digitale',
    subtitle: null,
    body: 'Ho creato un\'app che ti insegna a dipingere, passo dopo passo, partendo da un quadro che ami.',
    voice: 'Ho creato un\'app solo per te. Si chiama ArtTutor — il tuo atelier digitale personale. Fotografa un quadro che ti piace e lei ti insegna come ricrearlo.'
  },
  {
    id: 2,
    bg: 'linear-gradient(160deg, #e8eaf6 0%, #f3e5f5 100%)',
    emoji: '📸',
    emojiSize: 56,
    title: 'Scegli un quadro',
    subtitle: 'qualsiasi opera che ti ispira',
    body: 'Carica una foto dal telefono o incolla il link di un\'immagine trovata online. L\'app analizza lo stile e i colori.',
    voice: 'Tutto inizia da un\'immagine. Fotografa qualcosa che ti colpisce, o cerca online un quadro astratto che ami. L\'app lo analizza e capisce come è stato creato.'
  },
  {
    id: 3,
    bg: 'linear-gradient(160deg, #e8f5e9 0%, #f1f8e9 100%)',
    emoji: '🟢',
    emojiSize: 48,
    title: 'Il tuo livello',
    subtitle: 'cresci al tuo ritmo',
    body: 'Principiante → Intermedio → Esperto. Inizi con acrilico e pennello, poi scopri nuove tecniche quando sei pronta.',
    voice: 'Puoi iniziare da principiante assoluta, con pennello e colori acrilici. Quando ti senti pronta, passi al livello successivo. L\'app cresce con te, senza fretta.'
  },
  {
    id: 4,
    bg: 'linear-gradient(160deg, #1a0a2e 0%, #2d1040 100%)',
    emoji: '▶',
    emojiSize: 56,
    title: 'Tutorial audio',
    subtitle: 'come guardare una lezione video',
    body: 'Card animate, voce guida in italiano, avanzamento automatico. Pausa, riprendi, torna indietro quando vuoi.',
    voice: 'Il tutorial è come una lezione video. Una voce ti guida step dopo step, le card avanzano automaticamente. Puoi mettere in pausa, tornare indietro, ascoltare di nuovo ogni passaggio.'
  },
  {
    id: 5,
    bg: 'linear-gradient(160deg, #1a0a2e 0%, #6a1b9a 100%)',
    emoji: '♥',
    emojiSize: 64,
    title: 'Con tutto il mio amore',
    subtitle: 'Luca',
    body: 'Perché so che dentro di te c\'è un\'artista che aspetta solo il momento giusto.',
    voice: 'Questo spazio è tuo, Rita. Creato con tutto il mio amore, pensato per te. Perché so che dentro di te c\'è un\'artista che aspetta solo il momento giusto per esprimersi.'
  }
]

export default function RitaPresentation({ onEnterApp }) {
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const autoRef = useRef(null)

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1
  const isDark = current === 0 || current === 4 || current === 5

  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const it = all.filter(v => v.lang.startsWith('it'))
      const pool = it.length > 0 ? it : all.slice(0, 5)
      setVoices(pool)
      if (pool.length > 0 && !selectedVoice) setSelectedVoice(pool[0])
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.cancel(); if (autoRef.current) clearTimeout(autoRef.current) }
  }, [])

  const speak = (text, onEnd) => {
    if (!window.speechSynthesis) {
      autoRef.current = setTimeout(() => { onEnd && onEnd() }, 4000)
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'it-IT'
    u.rate = 0.78
    u.pitch = 1.0
    if (selectedVoice) u.voice = selectedVoice

    const estimatedMs = Math.max(4000, text.length * 65)
    let ended = false
    const doEnd = () => {
      if (ended) return
      ended = true
      setPlaying(false)
      onEnd && onEnd()
    }

    u.onend = () => { autoRef.current = setTimeout(doEnd, 2500) }
    u.onerror = () => { autoRef.current = setTimeout(doEnd, 2000) }
    autoRef.current = setTimeout(doEnd, estimatedMs + 3000)

    window.speechSynthesis.speak(u)
    setPlaying(true)
  }

  const playSlide = (idx) => {
    const s = SLIDES[idx]
    speak(s.voice, () => {
      if (idx < SLIDES.length - 1) {
        autoRef.current = setTimeout(() => {
          setCurrent(idx + 1)
          playSlide(idx + 1)
        }, 800)
      }
    })
  }

  const handleStart = () => {
    setStarted(true)
    setCurrent(0)
    playSlide(0)
  }

  const handlePrev = () => {
    window.speechSynthesis.cancel()
    if (autoRef.current) clearTimeout(autoRef.current)
    setPlaying(false)
    if (current > 0) setCurrent(c => c - 1)
  }

  const handleNext = () => {
    window.speechSynthesis.cancel()
    if (autoRef.current) clearTimeout(autoRef.current)
    setPlaying(false)
    if (current < SLIDES.length - 1) {
      const next = current + 1
      setCurrent(next)
      playSlide(next)
    }
  }

  const handleReplay = () => {
    window.speechSynthesis.cancel()
    if (autoRef.current) clearTimeout(autoRef.current)
    setPlaying(false)
    playSlide(current)
  }

  const textColor = isDark ? 'white' : '#1a0f0f'
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,15,15,0.5)'

  if (!started) {
    return (
      <div style={{ ...styles.page, background: 'linear-gradient(160deg, #1a0a2e 0%, #6a1b9a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: '100vh' }}>
        <div style={{ fontSize: 80, marginBottom: '1.5rem', animation: 'pulse 2s ease infinite' }}>🎨</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'white', textAlign: 'center', marginBottom: '1rem' }}>Per Rita</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: '1rem', marginBottom: '2.5rem', maxWidth: 300, lineHeight: 1.6 }}>
          Una piccola presentazione creata apposta per te. Tocca per iniziare.
        </p>
        {voices.length > 1 && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>🔊 Voce:</span>
            <select
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              value={selectedVoice?.name || ''}
              onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value))}
            >
              {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        )}
        <button style={styles.startBtn} onClick={handleStart}>▶ Inizia</button>
        <button style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer' }} onClick={onEnterApp}>
          Salta e vai all'app →
        </button>
      </div>
    )
  }

  return (
    <div style={{ ...styles.page, background: slide.bg }}>
      {/* Dots navigazione */}
      <div style={styles.dots}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{ ...styles.dot, ...(i === current ? { background: isDark ? 'white' : '#c1440e', transform: 'scale(1.3)' } : { background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,15,15,0.2)' }) }} />
        ))}
      </div>

      {/* Contenuto slide */}
      <div style={styles.slideContent} key={current} className="fade-in">
        <div style={{ fontSize: slide.emojiSize, lineHeight: 1, marginBottom: '1.5rem' }}>{slide.emoji}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 7vw, 2.8rem)', color: textColor, textAlign: 'center', lineHeight: 1.2, marginBottom: '0.75rem' }}>{slide.title}</h1>
        {slide.subtitle && <p style={{ fontSize: '0.95rem', color: mutedColor, textAlign: 'center', marginBottom: '1.25rem', fontStyle: 'italic' }}>{slide.subtitle}</p>}
        {slide.body && <p style={{ fontSize: '1.05rem', color: textColor, textAlign: 'center', lineHeight: 1.7, maxWidth: 340, opacity: 0.85 }}>{slide.body}</p>}
      </div>

      {/* Indicatore riproduzione */}
      {playing && (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          🔊 In riproduzione...
        </div>
      )}

      {/* Controlli */}
      <div style={styles.controls}>
        <button style={{ ...styles.navBtn, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,15,15,0.5)', opacity: current === 0 ? 0.3 : 1 }} onClick={handlePrev} disabled={current === 0}>◀</button>
        <button style={{ ...styles.replayBtn, background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(26,15,15,0.1)', color: isDark ? 'white' : '#1a0f0f' }} onClick={handleReplay}>↺</button>
        {isLast ? (
          <button style={styles.enterBtn} onClick={onEnterApp}>Entra nell'app 🎨</button>
        ) : (
          <button style={{ ...styles.navBtn, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,15,15,0.5)' }} onClick={handleNext}>▶</button>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '0 1rem 1.5rem', fontSize: '0.75rem', color: mutedColor }}>
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  dots: { display: 'flex', gap: 8, paddingTop: '2rem', paddingBottom: '1rem' },
  dot: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s' },
  slideContent: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 2rem', textAlign: 'center' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '1rem' },
  navBtn: { background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', padding: '0.5rem' },
  replayBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', fontSize: '1.2rem', cursor: 'pointer' },
  enterBtn: { background: '#c1440e', color: 'white', border: 'none', borderRadius: 12, padding: '0.85rem 1.5rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(193,68,14,0.4)' },
  startBtn: { background: '#c1440e', color: 'white', border: 'none', borderRadius: 16, padding: '1.1rem 2.5rem', fontSize: '1.15rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 24px rgba(193,68,14,0.5)' }
}
