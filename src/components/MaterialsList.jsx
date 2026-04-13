import React, { useState } from 'react'

export default function MaterialsList({ materials }) {
  const [priceRange, setPriceRange] = useState('budget')

  if (!materials || materials.length === 0) {
    return <div style={styles.empty}>Nessun materiale disponibile.</div>
  }

  const essentials = materials.filter(m => m.essential)
  const extras = materials.filter(m => !m.essential)

  return (
    <div style={styles.wrap}>
      {/* Toggle fascia prezzo */}
      <div style={styles.toggle}>
        <button
          style={{ ...styles.toggleBtn, ...(priceRange === 'budget' ? styles.toggleActive : {}) }}
          onClick={() => setPriceRange('budget')}
        >
          💚 Fascia Budget
        </button>
        <button
          style={{ ...styles.toggleBtn, ...(priceRange === 'mid' ? styles.toggleActive : {}) }}
          onClick={() => setPriceRange('mid')}
        >
          💛 Fascia Media
        </button>
      </div>

      <p style={styles.hint}>
        {priceRange === 'budget'
          ? '✅ Ideale per iniziare — materiali economici, ottimi per praticare.'
          : '⭐ Qualità superiore — per chi vuole risultati più professionali.'}
      </p>

      {essentials.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Materiali essenziali</h3>
          {essentials.map((m, i) => (
            <MaterialRow key={i} material={m} priceRange={priceRange} />
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Materiali opzionali</h3>
          {extras.map((m, i) => (
            <MaterialRow key={i} material={m} priceRange={priceRange} />
          ))}
        </div>
      )}

      <div style={styles.totalBox}>
        <div style={styles.totalLabel}>Stima totale (solo essenziali, fascia {priceRange === 'budget' ? 'budget' : 'media'})</div>
        <div style={styles.totalNote}>Consulta le schede per i prezzi indicativi di ogni materiale.</div>
      </div>

      <div style={styles.shopTip}>
        🛒 <strong>Dove comprare:</strong> Carrefour/Coop per i colori base, Leroy Merlin per supporti e tela,
        Amazon per kit completi, negozi di belle arti per qualità superiore.
      </div>
    </div>
  )
}

function MaterialRow({ material, priceRange }) {
  const [open, setOpen] = useState(false)
  const price = priceRange === 'budget' ? material.budget : material.mid

  return (
    <div style={styles.row} onClick={() => setOpen(!open)}>
      <div style={styles.rowMain}>
        <div style={styles.rowLeft}>
          <span style={styles.dot}>●</span>
          <span style={styles.matName}>{material.name}</span>
        </div>
        <span style={styles.price}>{price}</span>
      </div>
      {open && (
        <div style={styles.rowDetail}>
          <div><strong>Budget:</strong> {material.budget}</div>
          <div><strong>Medio:</strong> {material.mid}</div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  empty: { color: 'var(--muted)', padding: '2rem', textAlign: 'center' },
  toggle: { display: 'flex', gap: '0.5rem', background: 'var(--canvas-alt)', borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, padding: '0.6rem', border: 'none', borderRadius: 8, background: 'none', fontSize: '0.88rem', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.2s' },
  toggleActive: { background: 'white', color: 'var(--ink)', fontWeight: 700, boxShadow: 'var(--shadow)' },
  hint: { fontSize: '0.84rem', color: 'var(--muted)', fontStyle: 'italic' },
  section: { background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '0.95rem', padding: '0.75rem 1rem', background: 'var(--canvas-alt)', borderBottom: '1px solid var(--border)', color: 'var(--ink)' },
  row: { padding: '0.75rem 1rem', borderBottom: '1px solid var(--canvas-alt)', cursor: 'pointer' },
  rowMain: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  dot: { color: 'var(--accent)', fontSize: '0.7rem' },
  matName: { fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 500 },
  price: { fontSize: '0.85rem', color: 'var(--green)', fontWeight: 600 },
  rowDetail: { marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: '1.2rem' },
  totalBox: { background: 'var(--gold-light)', border: '1px solid var(--gold)', borderRadius: 10, padding: '0.9rem 1rem' },
  totalLabel: { fontWeight: 700, fontSize: '0.9rem', color: '#5a3e00', marginBottom: 4 },
  totalNote: { fontSize: '0.8rem', color: '#7a6030' },
  shopTip: { background: 'var(--canvas-alt)', borderRadius: 10, padding: '0.9rem 1rem', fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.5 }
}
