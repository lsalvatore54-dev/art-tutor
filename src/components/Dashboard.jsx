import React from 'react'

const STATUS_LABEL = { new: 'Nuovo', progress: 'In corso', done: 'Completato' }
const STATUS_COLOR = { new: '#c9962a', progress: '#5c3d8f', done: '#2d6a4f' }

export default function Dashboard({ projects, onNew, onOpen, onRita }) {
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🎨</span>
            <div>
              <div style={styles.logoTitle}>ArtTutor</div>
              <div style={styles.logoSub}>Il tuo atelier digitale</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.btnRita} onClick={onRita} title="Presentazione per Rita">♥</button>
            <button style={styles.btnNew} onClick={onNew}>+ Nuovo progetto</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {projects.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🖼️</div>
            <h2 style={styles.emptyTitle}>Il tuo atelier è vuoto</h2>
            <p style={styles.emptyText}>Carica un quadro che ti ispira e inizia il tuo primo tutorial personalizzato.</p>
            <button style={styles.btnStart} onClick={onNew}>Inizia il primo progetto</button>
          </div>
        ) : (
          <>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>I tuoi progetti</h2>
              <span style={styles.count}>{projects.length} {projects.length === 1 ? 'opera' : 'opere'}</span>
            </div>
            <div style={styles.grid}>
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} onClick={() => onOpen(p.id)} delay={i * 60} />
              ))}
              <div style={styles.cardAdd} onClick={onNew}>
                <span style={styles.cardAddIcon}>+</span>
                <span style={styles.cardAddText}>Nuovo progetto</span>
              </div>
            </div>
          </>
        )}
      </main>

      <footer style={styles.footer}>
        <span>ArtTutor — fatto con ♥ per imparare a dipingere</span>
      </footer>
    </div>
  )
}

function ProjectCard({ project, onClick, delay }) {
  const statusColor = STATUS_COLOR[project.status] || '#c9962a'
  const label = STATUS_LABEL[project.status] || 'Nuovo'
  const date = new Date(project.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  const progress = project.steps ? Math.round((project.completedSteps?.length || 0) / project.steps.length * 100) : 0

  return (
    <div style={{ ...styles.card, animationDelay: `${delay}ms` }} className="fade-in" onClick={onClick}>
      <div style={styles.cardThumb}>
        {project.imageData ? (
          <img src={project.imageData} alt={project.title} style={styles.cardImg} />
        ) : (
          <div style={styles.cardImgPlaceholder}>🖼️</div>
        )}
        <div style={{ ...styles.statusBadge, background: statusColor }}>{label}</div>
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{project.title}</h3>
        <div style={styles.cardMeta}>
          <span style={styles.cardLevel}>{project.level === 'beginner' ? '🟢' : project.level === 'intermediate' ? '🟡' : '🔴'} {project.levelLabel}</span>
          <span style={styles.cardDate}>{date}</span>
        </div>
        {project.steps && (
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%`, background: statusColor }} />
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' },
  header: { background: 'var(--ink)', color: 'white', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.3)' },
  headerInner: { maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 },
  logo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'white', lineHeight: 1.2 },
  logoSub: { fontSize: '0.7rem', color: '#c9962a', letterSpacing: '0.08em', textTransform: 'uppercase' },
  headerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  btnRita: { background: 'rgba(193,68,14,0.2)', color: '#e8927c', border: '1px solid rgba(193,68,14,0.4)', borderRadius: 50, width: 38, height: 38, fontSize: 16, cursor: 'pointer', transition: 'all 0.2s' },
  btnNew: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.1rem', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' },
  main: { flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '2rem 1.5rem' },
  empty: { textAlign: 'center', padding: '5rem 1rem' },
  emptyIcon: { fontSize: 64, marginBottom: '1.5rem' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--ink)' },
  emptyText: { color: 'var(--muted)', fontSize: '1.05rem', maxWidth: 420, margin: '0 auto 2rem' },
  btnStart: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '0.9rem 2rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  sectionHeader: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '1.6rem' },
  count: { color: 'var(--muted)', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' },
  card: { background: 'white', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'transform 0.22s, box-shadow 0.22s', border: '1px solid var(--border)' },
  cardThumb: { position: 'relative', height: 160, background: 'var(--canvas-alt)', overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardImgPlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 },
  statusBadge: { position: 'absolute', top: 10, right: 10, color: 'white', fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em' },
  cardBody: { padding: '1rem' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3, color: 'var(--ink)' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  cardLevel: { fontSize: '0.78rem', color: 'var(--muted)' },
  cardDate: { fontSize: '0.75rem', color: 'var(--muted)' },
  progressBar: { height: 4, background: 'var(--canvas-alt)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  cardAdd: { background: 'var(--canvas-alt)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', minHeight: 230, transition: 'border-color 0.2s, background 0.2s' },
  cardAddIcon: { fontSize: 36, color: 'var(--muted)' },
  cardAddText: { color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 },
  footer: { textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border)' }
}
