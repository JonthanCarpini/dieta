// ============================================================
// AURORA — Editorial premium
// Iridescent pink→blue, champagne gold, deep violet, outline cards
// ============================================================

(() => {
  if (document.getElementById('aur-styles')) return;
  const s = document.createElement('style');
  s.id = 'aur-styles';
  s.textContent = `
    .aur-root {
      width: 100%; height: 100%;
      background: #0a0814;
      color: #f1ecf5;
      font-family: 'Geist', system-ui, sans-serif;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .aur-root::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(40% 30% at 0% 0%, rgba(255,110,140,0.18), transparent 70%),
        radial-gradient(50% 40% at 100% 30%, rgba(110,160,255,0.14), transparent 70%),
        radial-gradient(40% 30% at 50% 100%, rgba(212,175,127,0.08), transparent 70%);
      pointer-events: none;
    }
    .aur-root > * { position: relative; z-index: 1; }
    .aur-display { font-family: 'Bricolage Grotesque', 'Geist', sans-serif; font-variation-settings: 'opsz' 96, 'wdth' 100; }
    .aur-mono { font-family: 'Geist Mono', monospace; font-feature-settings: 'tnum' on; }

    .aur-scroll { flex: 1; overflow-y: auto; }
    .aur-scroll::-webkit-scrollbar { display: none; }

    .aur-card {
      background: transparent;
      border: 1px solid rgba(241,236,245,0.12);
      border-radius: 20px;
    }
    .aur-card-fill {
      background: rgba(241,236,245,0.025);
      border: 1px solid rgba(241,236,245,0.08);
      border-radius: 20px;
    }
    .aur-card-aurora {
      position: relative;
      border-radius: 22px;
      padding: 1px;
      background: linear-gradient(135deg, rgba(255,110,140,0.6), rgba(110,160,255,0.4) 50%, rgba(212,175,127,0.5));
    }
    .aur-card-aurora > .aur-inner {
      background: #0a0814;
      border-radius: 21px;
      width: 100%;
      height: 100%;
    }

    .aur-grad-text {
      background: linear-gradient(135deg, #ff6e8c 0%, #d4af7f 50%, #6ea0ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .aur-eyebrow {
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(241,236,245,0.5);
    }

    .aur-rule {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(241,236,245,0.2), transparent);
    }

    .aur-bottomnav {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      padding: 14px 20px 22px;
      gap: 4px;
      background: linear-gradient(180deg, transparent, rgba(10,8,20,0.95) 40%);
    }
    .aur-navitem {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 4px;
      background: none; border: none;
      color: rgba(241,236,245,0.4);
      font-size: 10px;
      font-family: 'Geist', sans-serif;
      letter-spacing: 0.04em;
      cursor: pointer;
      position: relative;
    }
    .aur-navitem.active { color: #ffeed1; }
    .aur-navitem.active::after {
      content: ''; position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
      width: 18px; height: 2px;
      background: linear-gradient(90deg, #ff6e8c, #6ea0ff);
      border-radius: 2px;
    }

    /* Admin */
    .aur-admin {
      width: 100%; height: 100%;
      background: #0a0814;
      color: #f1ecf5;
      font-family: 'Geist', sans-serif;
      display: grid;
      grid-template-columns: 240px 1fr;
      overflow: hidden;
      position: relative;
    }
    .aur-admin::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(30% 50% at 100% 0%, rgba(255,110,140,0.1), transparent 70%),
        radial-gradient(30% 50% at 0% 100%, rgba(110,160,255,0.08), transparent 70%);
      pointer-events: none;
    }
    .aur-admin > * { position: relative; z-index: 1; }
    .aur-sidebar {
      background: rgba(10,8,20,0.5);
      backdrop-filter: blur(10px);
      border-right: 1px solid rgba(241,236,245,0.08);
      padding: 26px 18px;
      display: flex; flex-direction: column;
      gap: 2px;
    }
    .aur-sidenav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px;
      border-radius: 12px;
      color: rgba(241,236,245,0.55);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      letter-spacing: -0.01em;
    }
    .aur-sidenav-item.active {
      background: linear-gradient(135deg, rgba(255,110,140,0.12), rgba(110,160,255,0.08));
      color: #ffeed1;
      border: 1px solid rgba(212,175,127,0.2);
    }

    .aur-table { width: 100%; border-collapse: collapse; }
    .aur-table th {
      text-align: left;
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(241,236,245,0.4);
      padding: 14px 18px;
      border-bottom: 1px solid rgba(241,236,245,0.08);
    }
    .aur-table td {
      padding: 16px 18px;
      font-size: 13px;
      border-bottom: 1px solid rgba(241,236,245,0.04);
    }

    .aur-btn-primary {
      background: linear-gradient(135deg, #ff8aa3, #d4af7f);
      color: #1a0f1e;
      border: none;
      padding: 12px 22px;
      border-radius: 999px;
      font-family: 'Geist', sans-serif;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: -0.005em;
      cursor: pointer;
      box-shadow: 0 8px 22px -8px rgba(255,138,163,0.5), 0 0 0 1px rgba(255,238,209,0.1) inset;
    }
    .aur-btn-ghost {
      background: rgba(241,236,245,0.04);
      color: #f1ecf5;
      border: 1px solid rgba(241,236,245,0.1);
      padding: 11px 18px;
      border-radius: 999px;
      font-family: 'Geist', sans-serif;
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
    }

    .aur-num-display {
      font-family: 'Bricolage Grotesque', sans-serif;
      font-variation-settings: 'wght' 500, 'opsz' 96, 'wdth' 105;
      letter-spacing: -0.04em;
      line-height: 0.95;
    }

    .aur-tag {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 12px;
      border-radius: 999px;
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      border: 1px solid currentColor;
    }
  `;
  document.head.appendChild(s);
})();

const AUR = {
  bg: '#0a0814',
  text: '#f1ecf5',
  muted: 'rgba(241,236,245,0.5)',
  gold: '#d4af7f',
  pink: '#ff6e8c',
  blue: '#6ea0ff',
  cream: '#ffeed1',
  prot: '#ff8aa3',
  carb: '#a8d896',
  fat: '#d4af7f',
};

const IcoA = {
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  camera: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>,
  drop: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12z"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  back: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>,
  grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  salad: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11h18a9 9 0 1 1-18 0z"/></svg>,
  timer: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>,
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  more: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>,
  bell: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
};

const AurBottomNav = ({active}) => (
  <nav className="aur-bottomnav">
    {[
      {k:'diary', l:'Diário', i: IcoA.grid},
      {k:'recipes', l:'Receitas', i: IcoA.salad},
      {k:'fast', l:'Jejum', i: IcoA.timer},
      {k:'hist', l:'Histórico', i: IcoA.cal},
      {k:'prof', l:'Perfil', i: IcoA.user},
    ].map(it=>(
      <button key={it.k} className={`aur-navitem ${active===it.k?'active':''}`}>
        {it.i}
        <span>{it.l}</span>
      </button>
    ))}
  </nav>
);

// --- 1. ONBOARDING ---
const AuroraOnboarding = () => (
  <div className="aur-root" style={{padding: '32px 26px 0'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24}}>
      <span className="aur-eyebrow">Capítulo 04</span>
      <span className="aur-mono" style={{fontSize: 10, color: AUR.muted}}>04 / 06</span>
    </div>

    <div style={{display: 'flex', gap: 4, marginBottom: 36}}>
      {[1,2,3,4,5,6].map(i=>(
        <div key={i} style={{flex: i<=4 ? 1.4 : 1, height: 2, background: i<=4 ? `linear-gradient(90deg, ${AUR.pink}, ${AUR.blue})` : 'rgba(241,236,245,0.1)', borderRadius: 2}}/>
      ))}
    </div>

    <h1 className="aur-display" style={{fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.04em', marginBottom: 12}}>
      Crie sua<br/>
      <span className="aur-grad-text" style={{fontStyle: 'italic'}}>nutrição</span><br/>
      sob medida.
    </h1>

    <p style={{fontSize: 14, color: AUR.muted, lineHeight: 1.5, marginBottom: 26, maxWidth: 280}}>
      Mifflin-St Jeor, fator de atividade e seu ritmo — calculados em tempo real.
    </p>

    <div className="aur-scroll" style={{marginRight: -26, paddingRight: 26}}>
      {/* Weight */}
      <div className="aur-card" style={{padding: 22, marginBottom: 14}}>
        <div style={{display: 'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 18}}>
          <span className="aur-eyebrow">Peso objetivo</span>
          <span className="aur-mono" style={{fontSize: 14, color: AUR.gold}}>kg</span>
        </div>
        <div className="aur-num-display aur-grad-text" style={{fontSize: 64, marginBottom: 14}}>72.0</div>
        <div style={{position:'relative', height: 28}}>
          <div style={{position:'absolute', left:0, right:0, top: 14, height: 1, background:'rgba(241,236,245,0.08)'}}/>
          <div style={{position:'absolute', left: 0, top: 14, height: 1, width: '53%', background: `linear-gradient(90deg, ${AUR.pink}, ${AUR.gold})`, boxShadow:`0 0 8px ${AUR.pink}`}}/>
          <div style={{position:'absolute', left: '53%', top: 7, width: 16, height: 16, borderRadius:'50%', background: AUR.cream, transform: 'translateX(-50%)', boxShadow:`0 0 0 4px rgba(255,238,209,0.12)`}}/>
          <div style={{position:'absolute', left: 0, top: 18}} className="aur-mono">
            <span style={{fontSize: 9, color: AUR.muted}}>60 kg</span>
          </div>
          <div style={{position:'absolute', right: 0, top: 18}} className="aur-mono">
            <span style={{fontSize: 9, color: AUR.muted}}>90 kg</span>
          </div>
        </div>
      </div>

      {/* Pace as chips */}
      <div className="aur-card" style={{padding: 22, marginBottom: 14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14}}>
          <span className="aur-eyebrow">Ritmo semanal</span>
          <div>
            <span className="aur-num-display aur-grad-text" style={{fontSize: 28}}>−0.50</span>
            <span style={{color: AUR.muted, fontSize: 11, marginLeft: 6}} className="aur-mono">kg/sem</span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 6, flexWrap:'wrap'}}>
          {[
            {p:'Devagar', v:'-0.2'},
            {p:'Suave', v:'-0.35'},
            {p:'Equilíbrio', v:'-0.50', active: true},
            {p:'Firme', v:'-0.75'},
            {p:'Intenso', v:'-1.0'},
          ].map((p,i)=>(
            <div key={p.p} style={{padding:'8px 12px', borderRadius: 999, background: p.active ? 'linear-gradient(135deg, rgba(255,110,140,0.18), rgba(110,160,255,0.12))' : 'transparent', border: p.active ? `1px solid ${AUR.gold}` : '1px solid rgba(241,236,245,0.1)', fontSize: 11, color: p.active ? AUR.cream : AUR.muted, fontWeight: 500}}>
              {p.p} <span className="aur-mono" style={{opacity: 0.6, marginLeft: 4, fontSize: 10}}>{p.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Big estimated calorie number */}
      <div className="aur-card-aurora" style={{marginBottom: 14}}>
        <div className="aur-inner" style={{padding: 26}}>
          <div style={{display: 'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 8}}>
            <span className="aur-eyebrow">Calorias diárias</span>
            <span style={{fontSize: 9, color: AUR.gold}} className="aur-mono">TDEE × 1.55 − 20%</span>
          </div>
          <div className="aur-num-display aur-grad-text" style={{fontSize: 72, marginBottom: 14}}>2.103</div>
          <div className="aur-rule" style={{marginBottom: 14}}/>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <div>
              <div className="aur-eyebrow" style={{fontSize: 9, marginBottom: 4}}>Estimativa</div>
              <div style={{fontSize: 12, color: AUR.cream}}>17 ago · 2026</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="aur-eyebrow" style={{fontSize: 9, marginBottom: 4}}>Duração</div>
              <div style={{fontSize: 12, color: AUR.cream}}>12 semanas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="aur-card" style={{padding: 22, marginBottom: 22}}>
        <div className="aur-eyebrow" style={{marginBottom: 14}}>Composição estimada</div>
        <div style={{display:'flex', gap: 4, marginBottom: 16}}>
          <div style={{flex: 30, padding: '14px 12px', borderRadius: 12, border: `1px solid ${AUR.prot}`, position:'relative'}}>
            <div style={{fontSize: 10, color: AUR.prot, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'Geist Mono'}}>P</div>
            <div className="aur-mono" style={{fontSize: 18, fontWeight: 600, marginTop: 2}}>158g</div>
          </div>
          <div style={{flex: 45, padding: '14px 12px', borderRadius: 12, border: `1px solid ${AUR.carb}`}}>
            <div style={{fontSize: 10, color: AUR.carb, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'Geist Mono'}}>C</div>
            <div className="aur-mono" style={{fontSize: 18, fontWeight: 600, marginTop: 2}}>237g</div>
          </div>
          <div style={{flex: 25, padding: '14px 12px', borderRadius: 12, border: `1px solid ${AUR.fat}`}}>
            <div style={{fontSize: 10, color: AUR.fat, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'Geist Mono'}}>G</div>
            <div className="aur-mono" style={{fontSize: 18, fontWeight: 600, marginTop: 2}}>58g</div>
          </div>
        </div>
        <p style={{fontSize: 11, color: AUR.muted, lineHeight: 1.5, fontStyle: 'italic'}}>
          Você pode ajustar tudo a qualquer momento. Vamos personalizar mais com o tempo.
        </p>
      </div>
    </div>

    <div style={{display:'flex', gap: 10, padding: '16px 0 26px', borderTop:'1px solid rgba(241,236,245,0.08)'}}>
      <button className="aur-btn-ghost" style={{padding: '12px 18px'}}>{IcoA.back}</button>
      <button className="aur-btn-primary" style={{flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap: 8}}>Continuar — 05/06 {IcoA.arrow}</button>
    </div>
  </div>
);

// --- 2. DASHBOARD ---
const AuroraDashboard = () => (
  <div className="aur-root">
    <header style={{padding: '20px 26px 8px', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div>
        <div className="aur-eyebrow">Terça · 26 maio</div>
        <h2 className="aur-display" style={{fontSize: 30, letterSpacing:'-0.03em', marginTop: 2}}>Bom dia, <span className="aur-grad-text" style={{fontStyle:'italic'}}>João</span>.</h2>
      </div>
      <div style={{display:'flex', gap: 6, alignItems:'center'}}>
        <div style={{width: 8, height: 8, borderRadius:'50%', background: `linear-gradient(135deg, ${AUR.pink}, ${AUR.blue})`, boxShadow:`0 0 8px ${AUR.pink}`}}/>
        <span className="aur-mono" style={{fontSize: 10, color: AUR.muted}}>3 alertas</span>
      </div>
    </header>

    <div className="aur-scroll" style={{padding: '8px 26px 14px'}}>
      {/* Editorial number card */}
      <div className="aur-card-aurora" style={{marginBottom: 12, marginTop: 6}}>
        <div className="aur-inner" style={{padding: 24}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 4}}>
            <span className="aur-eyebrow">Restante hoje</span>
            <div style={{textAlign:'right'}}>
              <div className="aur-mono" style={{fontSize: 11, color: AUR.gold}}>42% da meta</div>
            </div>
          </div>
          <div className="aur-num-display" style={{fontSize: 92, marginTop: 8, marginBottom: 4}}>
            <span className="aur-grad-text">1.218</span>
          </div>
          <div className="aur-mono" style={{fontSize: 11, color: AUR.muted}}>kcal · de 2.100 prescritos</div>
          {/* Inline meter */}
          <div style={{marginTop: 20, height: 2, background:'rgba(241,236,245,0.08)', borderRadius: 2, position:'relative'}}>
            <div style={{position:'absolute', left:0, top:0, bottom:0, width:'42%', background: `linear-gradient(90deg, ${AUR.pink}, ${AUR.gold})`, borderRadius: 2}}/>
            <div style={{position:'absolute', left: '42%', top: -3, transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: AUR.cream, boxShadow:`0 0 0 3px rgba(255,238,209,0.15)`}}/>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 16}}>
            <div>
              <div className="aur-mono" style={{fontSize: 18, fontWeight: 500}}>882</div>
              <div className="aur-eyebrow" style={{fontSize: 9, marginTop: 2}}>Consumido</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div className="aur-mono" style={{fontSize: 18, fontWeight: 500, color: AUR.carb}}>+220</div>
              <div className="aur-eyebrow" style={{fontSize: 9, marginTop: 2}}>Exercício</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="aur-mono" style={{fontSize: 18, fontWeight: 500}}>2.100</div>
              <div className="aur-eyebrow" style={{fontSize: 9, marginTop: 2}}>Meta</div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros editorial */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, marginBottom: 12}}>
        {[
          {l:'Proteína', n:'P', cur: 68, tgt: 150, c: AUR.prot},
          {l:'Carbo', n:'C', cur: 92, tgt: 220, c: AUR.carb},
          {l:'Gordura', n:'G', cur: 28, tgt: 70, c: AUR.fat},
        ].map(m=>(
          <div key={m.l} className="aur-card" style={{padding: 14, position:'relative', overflow:'hidden'}}>
            <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 10}}>{m.l}</div>
            <div className="aur-mono" style={{fontSize: 22, fontWeight: 500, color: m.c}}>{m.cur}</div>
            <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, marginTop: 2}}>/ {m.tgt}g</div>
            {/* Concentric arc */}
            <svg width="40" height="40" viewBox="0 0 40 40" style={{position:'absolute', right: 8, top: 8}}>
              <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(241,236,245,0.08)" strokeWidth="2"/>
              <circle cx="20" cy="20" r="15" fill="none" stroke={m.c} strokeWidth="2" strokeLinecap="round"
                strokeDasharray={`${(m.cur/m.tgt) * 2 * Math.PI * 15} ${2 * Math.PI * 15}`}
                transform="rotate(-90 20 20)"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Hydration — editorial bottle */}
      <div className="aur-card" style={{padding: 18, marginBottom: 12, display:'flex', gap: 16, alignItems:'center'}}>
        <div style={{width: 36, height: 64, borderRadius: '6px 6px 12px 12px', border: `1px solid ${AUR.blue}`, position:'relative', overflow:'hidden', flexShrink: 0}}>
          <div style={{position:'absolute', left: 0, right: 0, bottom: 0, height: '50%', background: `linear-gradient(180deg, ${AUR.blue}99, ${AUR.blue})`, borderRadius:'2px 2px 11px 11px'}}/>
          <div style={{position:'absolute', left: 4, top: 4, right: 4, height: 4, borderRadius: 2, background:'rgba(241,236,245,0.15)'}}/>
        </div>
        <div style={{flex: 1}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <div>
              <div className="aur-eyebrow" style={{marginBottom: 4}}>Hidratação</div>
              <div>
                <span className="aur-num-display" style={{fontSize: 26, color: AUR.cream}}>1.25</span>
                <span style={{fontSize: 12, color: AUR.muted, marginLeft: 4}} className="aur-mono">/ 2.5 L</span>
              </div>
            </div>
            <div style={{display:'flex', gap: 4}}>
              <button style={{padding:'6px 10px', borderRadius: 999, border: '1px solid rgba(241,236,245,0.1)', background:'transparent', color: AUR.text, fontSize: 11, fontFamily:'Geist Mono', cursor:'pointer'}}>+250</button>
              <button style={{padding:'6px 10px', borderRadius: 999, border: `1px solid ${AUR.blue}`, background:'transparent', color: AUR.blue, fontSize: 11, fontFamily:'Geist Mono', cursor:'pointer'}}>+500</button>
            </div>
          </div>
        </div>
      </div>

      {/* Meals editorial */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10}}>
        <h3 className="aur-display" style={{fontSize: 20, letterSpacing:'-0.02em'}}>Refeições <span style={{color: AUR.muted, fontStyle:'italic', fontWeight: 400}}>de hoje</span></h3>
        <span className="aur-mono" style={{fontSize: 10, color: AUR.muted}}>02 / 04</span>
      </div>

      {[
        {n:'Café da manhã', t:'08:14', cal:340, p:18, c:42, f:9, color:'#ff6e8c'},
        {n:'Almoço', t:'12:48', cal:542, p:38, c:50, f:18, color:'#d4af7f'},
      ].map((m,i)=>(
        <div key={i} className="aur-card" style={{padding: 16, marginBottom: 8, display:'flex', alignItems:'center', gap: 14}}>
          <div style={{width: 4, height: 44, background: `linear-gradient(180deg, ${m.color}, transparent)`, borderRadius: 2}}/>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 4}}>
              <span className="aur-display" style={{fontSize: 15, fontWeight: 500}}>{m.n}</span>
              <div>
                <span className="aur-mono" style={{fontSize: 16, fontWeight: 500}}>{m.cal}</span>
                <span style={{fontSize: 10, color: AUR.muted, marginLeft: 3}} className="aur-mono">kcal</span>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', gap: 12}} className="aur-mono">
                <span style={{fontSize: 10, color: AUR.muted}}>{m.t}</span>
                <span style={{fontSize: 10, color: AUR.prot}}>P {m.p}</span>
                <span style={{fontSize: 10, color: AUR.carb}}>C {m.c}</span>
                <span style={{fontSize: 10, color: AUR.fat}}>G {m.f}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button style={{width:'100%', padding: '16px', border:`1px solid rgba(241,236,245,0.1)`, borderRadius: 20, background:'transparent', color: AUR.muted, fontSize: 13, cursor:'pointer', marginTop: 4, display:'flex', alignItems:'center', justifyContent:'center', gap: 8}}>
        {IcoA.plus} Registrar refeição
      </button>
    </div>

    {/* FAB editorial */}
    <button style={{position:'absolute', right: 22, bottom: 96, width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg, ${AUR.pink}, ${AUR.gold})`, border:'none', color:'#1a0f1e', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 18px 36px -10px ${AUR.pink}, 0 0 0 1px rgba(255,238,209,0.2) inset`}}>
      {IcoA.camera}
    </button>

    <AurBottomNav active="diary"/>
  </div>
);

// --- 3. SCANNER ---
const AuroraScanner = () => (
  <div className="aur-root">
    <header style={{padding: '20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <button className="aur-card" style={{width: 38, height: 38, border:'1px solid rgba(241,236,245,0.12)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'transparent', color: AUR.text}}>{IcoA.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="aur-eyebrow">Visão · IA</div>
        <div className="aur-display" style={{fontSize: 17, fontWeight: 500, marginTop: 2}}>Escaneamento</div>
      </div>
      <button className="aur-card" style={{width: 38, height: 38, border:'1px solid rgba(241,236,245,0.12)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'transparent', color: AUR.text}}>{IcoA.more}</button>
    </header>

    <div style={{flex: 1, padding: '4px 24px 20px', display:'flex', flexDirection:'column'}}>
      {/* Viewport with aurora gradient frame */}
      <div className="aur-card-aurora" style={{flex: 1, marginBottom: 18}}>
        <div className="aur-inner" style={{position:'relative', overflow:'hidden', borderRadius: 21}}>
          <div style={{position:'absolute', inset: 0, background: 'radial-gradient(60% 50% at 50% 55%, rgba(255,110,140,0.18), rgba(110,160,255,0.1) 50%, transparent 80%)'}}/>
          <div style={{position:'absolute', left:'40%', top:'42%', width: 80, height: 70, borderRadius:'45%', background:'linear-gradient(140deg, #c4985a, #8b6532)', boxShadow:'0 10px 30px rgba(0,0,0,0.5)'}}/>
          <div style={{position:'absolute', left:'53%', top:'52%', width: 65, height: 55, borderRadius:'40%', background:'linear-gradient(140deg, #6b8a3c, #3d5524)', boxShadow:'0 10px 30px rgba(0,0,0,0.5)'}}/>
          <div style={{position:'absolute', left:'46%', top:'62%', width: 45, height: 40, borderRadius:'50%', background:'linear-gradient(140deg, #d4d4c8, #a8a89a)', boxShadow:'0 10px 30px rgba(0,0,0,0.5)'}}/>

          {/* Aurora corner accents */}
          {[{tl: true}, {tr: true}, {bl: true}, {br: true}].map((c,i)=>{
            const s = {position:'absolute', width: 24, height: 24};
            if (c.tl) { s.top = 16; s.left = 16; s.borderTop = `1.5px solid ${AUR.pink}`; s.borderLeft = `1.5px solid ${AUR.pink}`; s.borderTopLeftRadius = 8; }
            if (c.tr) { s.top = 16; s.right = 16; s.borderTop = `1.5px solid ${AUR.gold}`; s.borderRight = `1.5px solid ${AUR.gold}`; s.borderTopRightRadius = 8; }
            if (c.bl) { s.bottom = 16; s.left = 16; s.borderBottom = `1.5px solid ${AUR.blue}`; s.borderLeft = `1.5px solid ${AUR.blue}`; s.borderBottomLeftRadius = 8; }
            if (c.br) { s.bottom = 16; s.right = 16; s.borderBottom = `1.5px solid ${AUR.blue}`; s.borderRight = `1.5px solid ${AUR.blue}`; s.borderBottomRightRadius = 8; }
            return <div key={i} style={s}/>;
          })}

          {/* Centered crosshair label */}
          <div style={{position:'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', display:'flex', alignItems:'center', gap: 6}}>
            <div style={{width: 5, height: 5, borderRadius:'50%', background: AUR.pink, boxShadow:`0 0 6px ${AUR.pink}`}}/>
            <span className="aur-mono" style={{fontSize: 9, letterSpacing:'0.16em', color: AUR.cream}}>ANALISANDO · 03 ITENS</span>
          </div>

          <div style={{position:'absolute', bottom: 22, left: 24, right: 24}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
              <div className="aur-mono" style={{fontSize: 9, color: AUR.cream, letterSpacing:'0.14em'}}>CONF · 91%</div>
              <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, letterSpacing:'0.14em'}}>26 MAI · 12:48</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detected pills floating */}
      <div style={{marginBottom: 18}}>
        <div className="aur-eyebrow" style={{marginBottom: 10}}>Identificando</div>
        <div style={{display:'flex', flexWrap:'wrap', gap: 6}}>
          {[
            {n:'Frango grelhado', conf: 94, c: AUR.prot},
            {n:'Brócolis', conf: 89, c: AUR.carb},
            {n:'Arroz integral', conf: 78, c: AUR.gold},
          ].map(t=>(
            <div key={t.n} style={{padding:'7px 14px', borderRadius: 999, border:`1px solid ${t.c}`, display:'flex', alignItems:'center', gap: 8}}>
              <span style={{fontSize: 12, color: AUR.cream}}>{t.n}</span>
              <span className="aur-mono" style={{fontSize: 9, color: t.c}}>{t.conf}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Capture controls */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <button className="aur-btn-ghost" style={{padding: '10px 14px', borderRadius:'50%', width: 48, height: 48, display:'flex', alignItems:'center', justifyContent:'center'}}>{IcoA.grid}</button>

        <button style={{width: 80, height: 80, borderRadius:'50%', padding: 3, background: `conic-gradient(from 180deg, ${AUR.pink}, ${AUR.gold}, ${AUR.blue}, ${AUR.pink})`, border:'none', cursor:'pointer'}}>
          <div style={{width:'100%', height:'100%', borderRadius:'50%', background: AUR.bg, padding: 4}}>
            <div style={{width:'100%', height:'100%', borderRadius:'50%', background: `radial-gradient(circle, ${AUR.cream}, ${AUR.gold})`}}/>
          </div>
        </button>

        <button className="aur-btn-ghost" style={{padding: '10px 14px', borderRadius:'50%', width: 48, height: 48, display:'flex', alignItems:'center', justifyContent:'center', color: AUR.gold}}>{IcoA.spark}</button>
      </div>
    </div>
  </div>
);

// --- 4. RESULT ---
const AuroraResult = () => (
  <div className="aur-root">
    <header style={{padding: '20px 26px 8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <button className="aur-card" style={{width: 38, height: 38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', color: AUR.text, cursor:'pointer'}}>{IcoA.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="aur-eyebrow">Análise · 12:48</div>
      </div>
      <button className="aur-card" style={{width: 38, height: 38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', color: AUR.text, cursor:'pointer'}}>{IcoA.more}</button>
    </header>

    <div className="aur-scroll" style={{padding: '0px 26px 18px'}}>
      {/* Hero number */}
      <div style={{padding: '24px 0 18px', textAlign:'center', marginBottom: 14}}>
        <div className="aur-eyebrow" style={{marginBottom: 12}}>Almoço · análise por IA</div>
        <div className="aur-num-display" style={{fontSize: 110, lineHeight: 0.9}}>
          <span className="aur-grad-text">542</span>
        </div>
        <div className="aur-mono" style={{fontSize: 12, color: AUR.muted, marginTop: 6, letterSpacing:'0.1em'}}>kcal · 25.8% da meta diária</div>
      </div>

      {/* Photo with gradient ring */}
      <div className="aur-card-aurora" style={{marginBottom: 14}}>
        <div className="aur-inner" style={{height: 150, position:'relative', overflow:'hidden', borderRadius: 21}}>
          <div style={{position:'absolute', inset: 0, background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,110,140,0.18), transparent 70%)'}}/>
          <div style={{position:'absolute', left:'38%', top:'42%', width: 80, height: 70, borderRadius:'45%', background:'linear-gradient(140deg, #c4985a, #8b6532)'}}/>
          <div style={{position:'absolute', left:'53%', top:'54%', width: 65, height: 55, borderRadius:'40%', background:'linear-gradient(140deg, #6b8a3c, #3d5524)'}}/>
          <div style={{position:'absolute', left:'46%', top:'62%', width: 45, height: 40, borderRadius:'50%', background:'linear-gradient(140deg, #d4d4c8, #a8a89a)'}}/>
          <div style={{position:'absolute', bottom: 12, left: 12, padding:'5px 12px', borderRadius: 999, background:'rgba(10,8,20,0.7)', border:`1px solid ${AUR.gold}`, color: AUR.gold, fontSize: 9, fontFamily:'Geist Mono', letterSpacing:'0.14em'}}>✓ IA · CONF 92%</div>
        </div>
      </div>

      {/* Macros — editorial outline */}
      <div style={{display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, marginBottom: 18}}>
        {[{l:'Proteína', n:'P', v:'38', c: AUR.prot},{l:'Carbo', n:'C', v:'50', c: AUR.carb},{l:'Gordura', n:'G', v:'18', c: AUR.fat}].map(m=>(
          <div key={m.l} className="aur-card" style={{padding: 14, borderColor: m.c+'40'}}>
            <div style={{fontSize: 10, color: m.c, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'Geist Mono', marginBottom: 4}}>{m.l}</div>
            <div className="aur-num-display" style={{fontSize: 30, color: m.c}}>{m.v}<span style={{fontSize: 11, color: AUR.muted, fontWeight: 400, marginLeft: 2, fontFamily:'Geist Mono'}}>g</span></div>
          </div>
        ))}
      </div>

      <div className="aur-rule" style={{marginBottom: 18}}/>

      <div className="aur-eyebrow" style={{marginBottom: 12}}>Alimentos identificados · 04</div>

      {[
        {n:'Arroz integral', q:'120g · cozido', kcal: 132, c: AUR.carb, conf: 96},
        {n:'Frango grelhado', q:'140g · sobrecoxa', kcal: 230, c: AUR.prot, conf: 94},
        {n:'Brócolis no vapor', q:'80g · floretes', kcal: 28, c: AUR.carb, conf: 89},
        {n:'Azeite de oliva', q:'1 colher · 8g', kcal: 120, c: AUR.fat, conf: 78},
      ].map((it,i)=>(
        <div key={i} style={{display:'flex', alignItems:'center', gap: 14, padding: '14px 0', borderBottom: i<3?'1px solid rgba(241,236,245,0.06)':'none'}}>
          <div style={{width: 28, height: 28, borderRadius:'50%', border:`1px solid ${it.c}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0}}>
            <div style={{width: 8, height: 8, borderRadius:'50%', background: it.c}}/>
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div className="aur-display" style={{fontSize: 14, fontWeight: 500}}>{it.n}</div>
            <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>{it.q} · conf. {it.conf}%</div>
          </div>
          <div className="aur-mono" style={{fontSize: 16, fontWeight: 500}}>{it.kcal}</div>
        </div>
      ))}

      <button style={{width:'100%', padding: '14px', border:'1px dashed rgba(241,236,245,0.15)', borderRadius: 20, background:'transparent', color: AUR.muted, fontSize: 12, cursor:'pointer', marginTop: 14, marginBottom: 18, display:'flex', alignItems:'center', justifyContent:'center', gap: 8}}>
        {IcoA.plus} Adicionar item
      </button>

      <div style={{display:'flex', gap: 10}}>
        <button className="aur-btn-ghost" style={{flex: 1}}>Descartar</button>
        <button className="aur-btn-primary" style={{flex: 2, display:'flex', alignItems:'center', justifyContent:'center', gap: 8}}>Adicionar ao diário {IcoA.arrow}</button>
      </div>
    </div>
  </div>
);

// --- 5. RECIPES ---
const AuroraRecipes = () => (
  <div className="aur-root">
    <header style={{padding: '20px 26px 8px'}}>
      <div className="aur-eyebrow">Edição · 04 jun</div>
      <h2 className="aur-display" style={{fontSize: 32, letterSpacing:'-0.03em', marginTop: 2}}>
        <span className="aur-grad-text" style={{fontStyle:'italic'}}>Receitas</span> & IA
      </h2>
    </header>

    <div style={{padding: '8px 26px 0', display:'flex', gap: 6}}>
      {['Curadas', 'Planejador IA'].map((t,i)=>(
        <button key={t} style={{padding:'8px 14px', borderRadius: 999, background: i===1 ? `linear-gradient(135deg, ${AUR.pink}, ${AUR.gold})` : 'transparent', border: i===1?'none':'1px solid rgba(241,236,245,0.1)', color: i===1?'#1a0f1e':AUR.muted, fontSize: 12, fontWeight: 600, cursor:'pointer'}}>{t}</button>
      ))}
    </div>

    <div className="aur-scroll" style={{padding: '14px 26px 14px'}}>
      {/* AI panel editorial */}
      <div className="aur-card-aurora" style={{marginBottom: 18}}>
        <div className="aur-inner" style={{padding: 22}}>
          <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 14}}>
            <span style={{width: 6, height: 6, borderRadius:'50%', background: `linear-gradient(135deg, ${AUR.pink}, ${AUR.blue})`, boxShadow:`0 0 8px ${AUR.pink}`}}/>
            <span className="aur-eyebrow" style={{color: AUR.cream}}>Gemini · pronto</span>
          </div>
          <h3 className="aur-display" style={{fontSize: 24, letterSpacing:'-0.025em', marginBottom: 10, lineHeight: 1.05}}>
            Um cardápio<br/>para o <span className="aur-grad-text" style={{fontStyle:'italic'}}>resto do dia</span>.
          </h3>
          <p style={{fontSize: 12, color: AUR.muted, lineHeight: 1.5, marginBottom: 14}}>
            Faltam <span className="aur-mono" style={{color: AUR.cream}}>1.218 kcal</span> e <span className="aur-mono" style={{color: AUR.prot}}>82g de proteína</span> para fechar a meta.
          </p>
          <div style={{display:'flex', gap: 8}}>
            <button className="aur-btn-primary" style={{flex: 1, justifyContent:'center'}}>Gerar receita</button>
            <button className="aur-btn-ghost">Semanal</button>
          </div>
        </div>
      </div>

      {/* Editorial featured */}
      <div className="aur-card" style={{padding: 0, overflow:'hidden', marginBottom: 14, borderColor:'rgba(212,175,127,0.3)'}}>
        <div style={{height: 160, position:'relative', overflow:'hidden', background: 'linear-gradient(135deg, rgba(255,110,140,0.2), rgba(212,175,127,0.15) 50%, rgba(110,160,255,0.18))'}}>
          <div style={{position:'absolute', inset: 0, background:'radial-gradient(60% 50% at 50% 50%, rgba(255,110,140,0.25), transparent 60%)'}}/>
          <div style={{position:'absolute', left:'30%', top:'35%', width: 100, height: 85, borderRadius:'45%', background:'linear-gradient(140deg, #d97a5f, #a14826)', boxShadow:'0 12px 28px rgba(0,0,0,0.4)'}}/>
          <div style={{position:'absolute', left:'52%', top:'48%', width: 70, height: 60, borderRadius:'45%', background:'linear-gradient(140deg, #c4e88f, #6b8a3c)', boxShadow:'0 12px 28px rgba(0,0,0,0.4)'}}/>

          <div style={{position:'absolute', top: 14, left: 14, display:'flex', gap: 6}}>
            <span className="aur-tag" style={{color: AUR.gold, background:'rgba(10,8,20,0.7)'}}>Receita do dia</span>
          </div>
          <div style={{position:'absolute', bottom: 14, right: 14}}>
            <div className="aur-mono" style={{fontSize: 9, color: AUR.cream, letterSpacing:'0.16em'}}>RCP_0142 · 28 MIN</div>
          </div>
        </div>
        <div style={{padding: 18}}>
          <h3 className="aur-display" style={{fontSize: 19, letterSpacing:'-0.02em', marginBottom: 4, fontWeight: 500}}>
            Salmão grelhado · purê de couve-flor
          </h3>
          <p style={{fontSize: 11, color: AUR.muted, marginBottom: 14, fontStyle: 'italic', lineHeight: 1.5}}>
            Sugestão calibrada pela IA com base no seu saldo de macro.
          </p>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <div style={{display:'flex', gap: 18}}>
              {[
                {l:'kcal', v:'480'},
                {l:'P', v:'42', c: AUR.prot},
                {l:'C', v:'18', c: AUR.carb},
                {l:'G', v:'24', c: AUR.fat},
              ].map(m=>(
                <div key={m.l}>
                  <div className="aur-num-display" style={{fontSize: 20, color: m.c || AUR.cream}}>{m.v}</div>
                  <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, marginTop: 2}}>{m.l}</div>
                </div>
              ))}
            </div>
            <button className="aur-btn-primary" style={{padding:'9px 16px'}}>{IcoA.arrow}</button>
          </div>
        </div>
      </div>

      <div className="aur-eyebrow" style={{marginBottom: 10}}>Outras receitas · 12 resultados</div>

      {[
        {n:'Bowl quinoa, atum e abacate', t:'Almoço · 18 min', kcal: 420, p:32, c:38, f:14, color: AUR.gold},
        {n:'Iogurte grego com granola', t:'Café · 5 min', kcal: 280, p:22, c:30, f:9, color: AUR.pink},
        {n:'Wrap de frango com homus', t:'Lanche · 12 min', kcal: 340, p:28, c:34, f:11, color: AUR.blue},
      ].map((r,i)=>(
        <div key={i} className="aur-card" style={{padding: 14, marginBottom: 8, display:'flex', alignItems:'center', gap: 14}}>
          <div style={{width: 56, height: 56, borderRadius: 16, background:`linear-gradient(135deg, ${r.color}33, ${r.color}11)`, border:`1px solid ${r.color}44`, position:'relative', overflow:'hidden', flexShrink: 0}}>
            <div style={{position:'absolute', left:'25%', top:'25%', width: 28, height: 24, borderRadius:'45%', background:'#a14826'}}/>
            <div style={{position:'absolute', left:'45%', top:'45%', width: 22, height: 20, borderRadius:'45%', background:'#6b8a3c'}}/>
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div className="aur-display" style={{fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.n}</div>
            <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>{r.t}</div>
            <div style={{display:'flex', gap: 8, marginTop: 4}} className="aur-mono">
              <span style={{fontSize: 9, color: AUR.prot}}>P{r.p}</span>
              <span style={{fontSize: 9, color: AUR.carb}}>C{r.c}</span>
              <span style={{fontSize: 9, color: AUR.fat}}>G{r.f}</span>
            </div>
          </div>
          <div>
            <div className="aur-mono" style={{fontSize: 16, fontWeight: 500, textAlign:'right'}}>{r.kcal}</div>
            <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, textAlign:'right'}}>kcal</div>
          </div>
        </div>
      ))}
    </div>

    <AurBottomNav active="recipes"/>
  </div>
);

// --- 6. HISTORY ---
const AuroraHistory = () => {
  const days = [62, 78, 92, 55, 88, 71, 83];
  return (
    <div className="aur-root">
      <header style={{padding: '20px 26px 6px'}}>
        <div className="aur-eyebrow">Semana 21 · Maio 2026</div>
        <h2 className="aur-display" style={{fontSize: 30, letterSpacing:'-0.03em', marginTop: 2}}>
          Sua <span className="aur-grad-text" style={{fontStyle:'italic'}}>evolução</span>.
        </h2>
      </header>

      <div className="aur-scroll" style={{padding: '8px 26px 14px'}}>
        {/* Header summary */}
        <div className="aur-card-aurora" style={{marginBottom: 14}}>
          <div className="aur-inner" style={{padding: 22}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 18}}>
              <div>
                <div className="aur-eyebrow" style={{marginBottom: 4}}>Média semanal</div>
                <div className="aur-num-display" style={{fontSize: 42}}><span className="aur-grad-text">1.842</span></div>
                <div className="aur-mono" style={{fontSize: 11, color: AUR.muted, marginTop: 4}}>kcal · meta 2.100</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="aur-eyebrow" style={{marginBottom: 4}}>Diff</div>
                <div className="aur-num-display" style={{fontSize: 26, color: AUR.carb}}>−258</div>
                <div className="aur-mono" style={{fontSize: 9, color: AUR.carb}}>↘ −12.3%</div>
              </div>
            </div>

            {/* Bar week */}
            <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 5, height: 80, marginBottom: 8}}>
              {days.map((d,i)=>(
                <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <div style={{width:'100%', height: `${d}%`, background: i===6 ? `linear-gradient(180deg, ${AUR.pink}, ${AUR.gold})` : 'rgba(241,236,245,0.12)', borderRadius: 8, position:'relative'}}>
                    {i===6 && <div className="aur-mono" style={{position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize: 9, color: AUR.cream}}>83%</div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              {['S','T','Q','Q','S','S','D'].map((d,i)=>(
                <span key={i} className="aur-mono" style={{fontSize: 10, color: i===6?AUR.cream:AUR.muted, flex: 1, textAlign:'center'}}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Weight evolution editorial */}
        <div className="aur-card" style={{padding: 22, marginBottom: 14}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 16}}>
            <div>
              <div className="aur-eyebrow" style={{marginBottom: 4}}>Peso atual</div>
              <div>
                <span className="aur-num-display aur-grad-text" style={{fontSize: 38}}>76.4</span>
                <span className="aur-mono" style={{fontSize: 12, color: AUR.muted, marginLeft: 6}}>kg</span>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="aur-eyebrow" style={{marginBottom: 4}}>desde abr</div>
              <div className="aur-num-display" style={{fontSize: 20, color: AUR.carb}}>−1.6 kg</div>
            </div>
          </div>
          <svg width="100%" height="70" viewBox="0 0 300 70" preserveAspectRatio="none" style={{display:'block'}}>
            <defs>
              <linearGradient id="aurWeightLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={AUR.pink}/>
                <stop offset="50%" stopColor={AUR.gold}/>
                <stop offset="100%" stopColor={AUR.blue}/>
              </linearGradient>
              <linearGradient id="aurWeightFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AUR.gold} stopOpacity="0.25"/>
                <stop offset="100%" stopColor={AUR.gold} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,10 C30,15 60,8 90,18 C120,28 150,22 180,30 C210,38 240,32 270,42 L300,46 L300,70 L0,70 Z" fill="url(#aurWeightFill)"/>
            <path d="M0,10 C30,15 60,8 90,18 C120,28 150,22 180,30 C210,38 240,32 270,42 L300,46" fill="none" stroke="url(#aurWeightLine)" strokeWidth="2"/>
            <circle cx="300" cy="46" r="5" fill={AUR.cream}/>
            <circle cx="300" cy="46" r="9" fill="none" stroke={AUR.gold} strokeWidth="1" opacity="0.4"/>
          </svg>
        </div>

        <div className="aur-eyebrow" style={{marginBottom: 10}}>Dias anteriores</div>

        {[
          {d:'Segunda', dd:'25 mai', cal: 1923, p: 91, w:'76.4 kg', dir:'↘', dirC: AUR.carb, col: AUR.gold},
          {d:'Domingo', dd:'24 mai', cal: 2412, p: 114, w:'76.6 kg', dir:'↗', dirC: AUR.prot, col: AUR.prot, over: true},
          {d:'Sábado', dd:'23 mai', cal: 1788, p: 85, w:'76.7 kg', dir:'↘', dirC: AUR.carb, col: AUR.gold},
          {d:'Sexta', dd:'22 mai', cal: 2015, p: 96, w:'76.8 kg', dir:'↘', dirC: AUR.carb, col: AUR.gold},
        ].map((r,i)=>(
          <div key={i} className="aur-card" style={{padding: 16, marginBottom: 8, display:'flex', alignItems:'center', gap: 14}}>
            <div style={{minWidth: 70}}>
              <div className="aur-display" style={{fontSize: 14, fontWeight: 500}}>{r.d}</div>
              <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>{r.dd}</div>
            </div>
            <div style={{flex: 1, position:'relative', height: 3, background:'rgba(241,236,245,0.08)', borderRadius: 2}}>
              <div style={{position:'absolute', left:0, top:0, bottom: 0, width: `${Math.min(r.p, 100)}%`, background: r.col, borderRadius: 2}}/>
              {/* Goal marker */}
              <div style={{position:'absolute', left: '100%', top: -3, bottom: -3, width: 1, background: AUR.muted}}/>
            </div>
            <div style={{textAlign:'right', minWidth: 80}}>
              <div className="aur-mono" style={{fontSize: 15, fontWeight: 500, color: r.col}}>{r.cal}</div>
              <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>{r.w} <span style={{color: r.dirC, marginLeft: 4}}>{r.dir}</span></div>
            </div>
          </div>
        ))}
      </div>

      <AurBottomNav active="hist"/>
    </div>
  );
};

// =========================================================
// AURORA ADMIN
// =========================================================

const AurSidebar = ({active}) => {
  const items = [
    {k:'overview', l:'Visão Geral', i: IcoA.grid},
    {k:'users', l:'Usuários', i: IcoA.user},
    {k:'pros', l:'Profissionais', i: IcoA.shield},
    {k:'plans', l:'Planos', i: IcoA.spark},
    {k:'billing', l:'Faturamento', i: IcoA.cal},
    {k:'patients', l:'Pacientes', i: IcoA.salad},
  ];
  return (
    <aside className="aur-sidebar">
      <div style={{display:'flex', alignItems:'center', gap: 12, padding:'2px 8px 22px', marginBottom: 14, borderBottom:'1px solid rgba(241,236,245,0.08)'}}>
        <div style={{width: 34, height: 34, borderRadius: 11, background:`linear-gradient(135deg, ${AUR.pink}, ${AUR.gold})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#1a0f1e'}}>{IcoA.shield}</div>
        <div>
          <div className="aur-display" style={{fontSize: 16, fontWeight: 600, letterSpacing:'-0.01em'}}>Nutrir</div>
          <div className="aur-eyebrow" style={{fontSize: 9}}>Admin · v3.1</div>
        </div>
      </div>
      {items.map(it=>(
        <div key={it.k} className={`aur-sidenav-item ${active===it.k?'active':''}`}>
          {it.i}
          {it.l}
        </div>
      ))}
      <div style={{flex: 1}}/>
      <div className="aur-card" style={{padding: 12}}>
        <div className="aur-eyebrow" style={{marginBottom: 6}}>Operador</div>
        <div style={{fontSize: 12, fontWeight: 500}}>admin@nutrir.online</div>
        <div className="aur-mono" style={{fontSize: 10, color: AUR.gold, marginTop: 4, letterSpacing:'0.1em'}}>SUPER · ADMIN</div>
      </div>
    </aside>
  );
};

const AuroraAdminOverview = () => (
  <div className="aur-admin">
    <AurSidebar active="overview"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '26px 36px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', borderBottom:'1px solid rgba(241,236,245,0.08)'}}>
        <div>
          <div className="aur-eyebrow">Painel · Atualizado 12:47</div>
          <h1 className="aur-display" style={{fontSize: 30, letterSpacing:'-0.025em', marginTop: 4}}>
            <span className="aur-grad-text" style={{fontStyle:'italic'}}>Visão</span> Geral
          </h1>
        </div>
        <div style={{display:'flex', gap: 8, alignItems:'center'}}>
          <div className="aur-card" style={{padding: '10px 14px', display:'flex', alignItems:'center', gap: 10, fontSize: 12, color: AUR.muted, borderRadius: 999}}>
            {IcoA.search} <span>Buscar usuário, profissional…</span>
            <span style={{padding:'2px 6px', background:'rgba(241,236,245,0.05)', borderRadius: 4, fontSize: 9, fontFamily:'Geist Mono'}}>⌘K</span>
          </div>
          <button className="aur-btn-primary">+ Novo Plano</button>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '26px 36px'}}>
        {/* Editorial KPIs */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14, marginBottom: 24}}>
          {[
            {l:'Usuários', v:'4.218', d:'+12.4%', sub:'mês', big: true},
            {l:'Premium', v:'1.084', d:'+8.7%', sub:'25.7%'},
            {l:'Profissionais', v:'28', d:'+3', sub:'esta sem'},
            {l:'MRR', v:'R$ 38.4k', d:'+4.1%', sub:'± 1.2k'},
          ].map((s,i)=>(
            <div key={s.l} className={i===0?'aur-card-aurora':'aur-card'} style={i===0?{}:{padding: 22}}>
              {i===0 ? (
                <div className="aur-inner" style={{padding: 22}}>
                  <div className="aur-eyebrow" style={{marginBottom: 14}}>{s.l}</div>
                  <div className="aur-num-display"><span className="aur-grad-text" style={{fontSize: 42}}>{s.v}</span></div>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop: 14, paddingTop: 12, borderTop:'1px solid rgba(241,236,245,0.06)'}}>
                    <span className="aur-mono" style={{fontSize: 12, color: AUR.carb}}>↗ {s.d}</span>
                    <span className="aur-mono" style={{fontSize: 11, color: AUR.muted}}>{s.sub}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="aur-eyebrow" style={{marginBottom: 14}}>{s.l}</div>
                  <div className="aur-num-display" style={{fontSize: 36}}>{s.v}</div>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop: 14, paddingTop: 12, borderTop:'1px solid rgba(241,236,245,0.06)'}}>
                    <span className="aur-mono" style={{fontSize: 11, color: AUR.carb}}>↗ {s.d}</span>
                    <span className="aur-mono" style={{fontSize: 11, color: AUR.muted}}>{s.sub}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.7fr 1fr', gap: 14, marginBottom: 24}}>
          {/* Activity chart */}
          <div className="aur-card" style={{padding: 26}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 22}}>
              <div>
                <div className="aur-eyebrow">Atividade · refeições registradas · 30 dias</div>
                <div className="aur-display" style={{fontSize: 26, fontWeight: 500, marginTop: 6, letterSpacing:'-0.02em'}}>184.522</div>
              </div>
              <div style={{display:'flex', gap: 6}}>
                {['7d','30d','90d','12m'].map((p,i)=>(
                  <button key={p} style={{padding:'7px 14px', borderRadius: 999, background: i===1 ? `linear-gradient(135deg, ${AUR.pink}33, ${AUR.gold}33)` : 'transparent', border: `1px solid ${i===1?AUR.gold:'rgba(241,236,245,0.1)'}`, color: i===1 ? AUR.cream : AUR.muted, fontSize: 11, fontFamily:'Geist Mono', cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <svg width="100%" height="200" viewBox="0 0 600 200">
              <defs>
                <linearGradient id="aurAdmFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AUR.pink} stopOpacity="0.25"/><stop offset="100%" stopColor={AUR.pink} stopOpacity="0"/></linearGradient>
                <linearGradient id="aurAdmLine" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={AUR.pink}/><stop offset="50%" stopColor={AUR.gold}/><stop offset="100%" stopColor={AUR.blue}/></linearGradient>
              </defs>
              {[0,1,2,3,4].map(i=>(<line key={i} x1="0" x2="600" y1={40*i+20} y2={40*i+20} stroke="rgba(241,236,245,0.05)"/>))}
              <path d="M0,140 C40,120 80,135 120,110 C160,90 200,105 240,80 C280,60 320,85 360,65 C400,50 440,75 480,55 C520,40 560,60 600,30 L600,200 L0,200 Z" fill="url(#aurAdmFill)"/>
              <path d="M0,140 C40,120 80,135 120,110 C160,90 200,105 240,80 C280,60 320,85 360,65 C400,50 440,75 480,55 C520,40 560,60 600,30" fill="none" stroke="url(#aurAdmLine)" strokeWidth="2.5"/>
              <circle cx="600" cy="30" r="6" fill={AUR.cream}/>
              <circle cx="600" cy="30" r="11" fill="none" stroke={AUR.gold} strokeWidth="1" opacity="0.4"/>
            </svg>
            <div style={{display:'flex', gap: 18, marginTop: 14}}>
              <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 11, color: AUR.muted}}>
                <span style={{width: 14, height: 2, background:`linear-gradient(90deg, ${AUR.pink}, ${AUR.gold})`}}/>
                Refeições
              </div>
              <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 11, color: AUR.muted}}>
                <span style={{width: 14, height: 2, background: AUR.muted}}/>
                Período anterior
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="aur-card" style={{padding: 26}}>
            <div className="aur-eyebrow" style={{marginBottom: 18}}>Composição de Planos</div>
            {/* Donut */}
            <div style={{display:'flex', alignItems:'center', gap: 18, marginBottom: 16}}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(241,236,245,0.06)" strokeWidth="14"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke={AUR.pink} strokeWidth="14" strokeDasharray={`${15/100 * 2*Math.PI*40} ${2*Math.PI*40}`} strokeDashoffset={0} transform="rotate(-90 50 50)" strokeLinecap="butt"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke={AUR.gold} strokeWidth="14" strokeDasharray={`${11/100 * 2*Math.PI*40} ${2*Math.PI*40}`} strokeDashoffset={-15/100 * 2*Math.PI*40} transform="rotate(-90 50 50)" strokeLinecap="butt"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke={AUR.blue} strokeWidth="14" strokeDasharray={`${7/100 * 2*Math.PI*40} ${2*Math.PI*40}`} strokeDashoffset={-26/100 * 2*Math.PI*40} transform="rotate(-90 50 50)" strokeLinecap="butt"/>
                <text x="50" y="55" textAnchor="middle" fill={AUR.cream} fontFamily="Bricolage Grotesque" fontSize="18" fontWeight="600">26%</text>
              </svg>
              <div style={{flex: 1}}>
                <div className="aur-eyebrow" style={{fontSize: 9, marginBottom: 4}}>Pagantes</div>
                <div className="aur-display" style={{fontSize: 22, fontWeight: 500}}>1.084</div>
                <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>de 4.218</div>
              </div>
            </div>
            {[
              {l:'Premium Anual', n: 642, c: AUR.pink},
              {l:'Premium Mensal', n: 442, c: AUR.gold},
              {l:'Trial 7d', n: 312, c: AUR.blue},
              {l:'Free', n: 2822, c: 'rgba(241,236,245,0.25)'},
            ].map(p=>(
              <div key={p.l} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: '1px solid rgba(241,236,245,0.05)', fontSize: 12}}>
                <div style={{display:'flex', alignItems:'center', gap: 8}}>
                  <span style={{width: 6, height: 6, borderRadius:'50%', background: p.c}}/>
                  {p.l}
                </div>
                <span className="aur-mono" style={{color: AUR.cream}}>{p.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="aur-card" style={{padding: 0, overflow:'hidden'}}>
          <div style={{padding: '20px 26px', borderBottom:'1px solid rgba(241,236,245,0.06)', display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <h3 className="aur-display" style={{fontSize: 18, fontWeight: 500, letterSpacing:'-0.01em'}}>Atividade recente</h3>
            <button className="aur-mono" style={{background:'none', border:'none', color: AUR.gold, fontSize: 11, cursor:'pointer', letterSpacing:'0.08em'}}>ver tudo →</button>
          </div>
          <table className="aur-table">
            <thead><tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Evento</th>
              <th>Profissional</th>
              <th style={{textAlign:'right'}}>Valor</th>
              <th>Plano</th>
            </tr></thead>
            <tbody>
              {[
                {t:'há 2 min', u:'Camila Rocha', e:'Upgrade — Premium Anual', p:'Dra. Marina Vidal', v:'R$ 199,90', vc: AUR.carb, plan: 'ANUAL', pc: AUR.gold},
                {t:'há 14 min', u:'Roberto Lemos', e:'Vinculou profissional', p:'PT Diego Santos', v:'—', vc: AUR.muted, plan: 'MENSAL', pc: AUR.pink},
                {t:'há 38 min', u:'Anna Beatriz', e:'Foto escaneada · IA', p:'—', v:'542 kcal', vc: AUR.gold, plan: 'ANUAL', pc: AUR.gold},
                {t:'há 1h', u:'Lucas Tavares', e:'Trial expirou', p:'—', v:'—', vc: AUR.prot, plan: 'CHURN', pc: AUR.prot},
                {t:'há 1h 23m', u:'Marcela Ito', e:'Upgrade — Premium Mensal', p:'Dra. Marina Vidal', v:'R$ 29,90', vc: AUR.carb, plan: 'MENSAL', pc: AUR.pink},
              ].map((r,i)=>(
                <tr key={i}>
                  <td className="aur-mono" style={{color: AUR.muted, fontSize: 11}}>{r.t}</td>
                  <td><div style={{display:'flex', alignItems:'center', gap: 10}}>
                    <div style={{width: 28, height: 28, borderRadius:'50%', background:`linear-gradient(135deg, ${AUR.pink}55, ${AUR.gold}55)`, border:`1px solid ${AUR.gold}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 10, fontWeight: 600, color: AUR.cream}}>{r.u.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                    <span style={{fontWeight: 500}}>{r.u}</span>
                  </div></td>
                  <td>{r.e}</td>
                  <td style={{color: AUR.muted, fontSize: 12}}>{r.p}</td>
                  <td className="aur-mono" style={{textAlign:'right', color: r.vc, fontWeight: 600}}>{r.v}</td>
                  <td><span className="aur-tag" style={{color: r.pc, fontSize: 9}}>{r.plan}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

const AuroraAdminPros = () => (
  <div className="aur-admin">
    <AurSidebar active="pros"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '26px 36px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', borderBottom:'1px solid rgba(241,236,245,0.08)'}}>
        <div>
          <div className="aur-eyebrow">Equipe Clínica · 28 cadastrados</div>
          <h1 className="aur-display" style={{fontSize: 30, letterSpacing:'-0.025em', marginTop: 4}}>
            <span className="aur-grad-text" style={{fontStyle:'italic'}}>Profissionais</span>
          </h1>
        </div>
        <button className="aur-btn-primary">+ Cadastrar Profissional</button>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '26px 36px'}}>
        {/* Filter */}
        <div style={{display:'flex', gap: 8, marginBottom: 22}}>
          {['Todos · 28', 'Nutricionistas · 18', 'Personal Trainers · 10', 'Comissão > 15%'].map((c,i)=>(
            <button key={c} style={{padding:'8px 14px', borderRadius: 999, background: i===0 ? `linear-gradient(135deg, ${AUR.pink}22, ${AUR.gold}22)` : 'rgba(241,236,245,0.03)', border: `1px solid ${i===0?AUR.gold:'rgba(241,236,245,0.1)'}`, color: i===0 ? AUR.cream : AUR.muted, fontSize: 12, fontWeight: 500, cursor:'pointer'}}>{c}</button>
          ))}
        </div>

        {/* Featured cards (top 3 by revenue) */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14, marginBottom: 24}}>
          {[
            {n:'Dra. Marina Vidal', r:'Nutricionista', e:'marina@nutrir.online', com: 15, pat: 42, mrr: '6.234', c: AUR.pink, badge: '#01 TOP'},
            {n:'PT Diego Santos', r:'Personal Trainer', e:'diego@nutrir.online', com: 18, pat: 36, mrr: '4.876', c: AUR.gold, badge: '#02'},
            {n:'Dra. Renata Lopes', r:'Nutricionista', e:'renata@nutrir.online', com: 14, pat: 31, mrr: '3.987', c: AUR.blue, badge: '#03'},
          ].map((p,i)=>(
            <div key={i} className={i===0?'aur-card-aurora':'aur-card'} style={i===0?{}:{padding: 22}}>
              {i===0 ? (
                <div className="aur-inner" style={{padding: 22}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}>
                    <div className="aur-eyebrow" style={{color: AUR.gold}}>{p.badge}</div>
                    <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, letterSpacing:'0.1em'}}>ATIVO · 12M</div>
                  </div>
                  <div style={{display:'flex', gap: 12, alignItems:'center', marginBottom: 16}}>
                    <div style={{width: 50, height: 50, borderRadius:'50%', background:`linear-gradient(135deg, ${p.c}, ${AUR.gold})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 15, fontWeight: 700, color:'#1a0f1e'}}>
                      MV
                    </div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div className="aur-display" style={{fontSize: 16, fontWeight: 500, letterSpacing:'-0.01em'}}>{p.n}</div>
                      <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>{p.r}</div>
                    </div>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10, paddingTop: 14, borderTop:'1px solid rgba(241,236,245,0.06)'}}>
                    <div>
                      <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 4}}>Pacientes</div>
                      <div className="aur-num-display" style={{fontSize: 20}}>{p.pat}</div>
                    </div>
                    <div>
                      <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 4}}>Comissão</div>
                      <div className="aur-num-display" style={{fontSize: 20, color: AUR.carb}}>{p.com}%</div>
                    </div>
                    <div>
                      <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 4}}>MRR</div>
                      <div className="aur-num-display" style={{fontSize: 20}}>{p.mrr}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}>
                    <div className="aur-eyebrow">{p.badge}</div>
                    <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, letterSpacing:'0.1em'}}>ATIVO</div>
                  </div>
                  <div style={{display:'flex', gap: 12, alignItems:'center', marginBottom: 16}}>
                    <div style={{width: 50, height: 50, borderRadius:'50%', background:`linear-gradient(135deg, ${p.c}77, ${AUR.gold}77)`, border:`1px solid ${p.c}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 14, fontWeight: 600, color: AUR.cream}}>
                      {p.n.replace(/Dra?\.|PT/g,'').trim().split(' ').map(s=>s[0]).slice(0,2).join('')}
                    </div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div className="aur-display" style={{fontSize: 15, fontWeight: 500, letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.n}</div>
                      <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 2}}>{p.r}</div>
                    </div>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10, paddingTop: 14, borderTop:'1px solid rgba(241,236,245,0.06)'}}>
                    <div>
                      <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 4}}>Pac.</div>
                      <div className="aur-num-display" style={{fontSize: 18}}>{p.pat}</div>
                    </div>
                    <div>
                      <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 4}}>Com.</div>
                      <div className="aur-num-display" style={{fontSize: 18, color: AUR.carb}}>{p.com}%</div>
                    </div>
                    <div>
                      <div className="aur-eyebrow" style={{fontSize: 8, marginBottom: 4}}>MRR</div>
                      <div className="aur-num-display" style={{fontSize: 18}}>{p.mrr}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Full table */}
        <div className="aur-card" style={{padding: 0, overflow:'hidden'}}>
          <div style={{padding: '18px 26px', borderBottom:'1px solid rgba(241,236,245,0.06)', display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <h3 className="aur-display" style={{fontSize: 17, fontWeight: 500, letterSpacing:'-0.01em'}}>Todos os profissionais</h3>
            <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, letterSpacing:'0.1em'}}>28 RESULTADOS · ORDEM POR RECEITA</div>
          </div>
          <table className="aur-table">
            <thead><tr>
              <th>Profissional</th>
              <th>Cargo</th>
              <th style={{textAlign:'right'}}>Pacientes</th>
              <th style={{textAlign:'right'}}>Retenção</th>
              <th style={{textAlign:'right'}}>Comissão</th>
              <th style={{textAlign:'right'}}>Receita</th>
              <th>Status</th>
            </tr></thead>
            <tbody>
              {[
                {n:'Dra. Marina Vidal', e:'marina@nutrir.online', r:'Nutricionista', p:42, ret: 94, com:'15%', rev:'R$ 6.234,50', s:'Ativo', sc: AUR.carb, c: AUR.pink},
                {n:'Dr. Carlos Nutri', e:'carlos@nutrir.online', r:'Nutricionista', p:28, ret: 89, com:'12%', rev:'R$ 3.412,00', s:'Ativo', sc: AUR.carb, c: AUR.gold},
                {n:'PT Diego Santos', e:'diego@nutrir.online', r:'Personal', p:36, ret: 91, com:'18%', rev:'R$ 4.876,20', s:'Ativo', sc: AUR.carb, c: AUR.blue},
                {n:'PT Aline Borges', e:'aline@nutrir.online', r:'Personal', p:14, ret: 71, com:'10%', rev:'R$ 1.245,80', s:'Pausado', sc: AUR.prot, c: AUR.prot},
                {n:'Dra. Renata Lopes', e:'renata@nutrir.online', r:'Nutricionista', p:31, ret: 87, com:'14%', rev:'R$ 3.987,40', s:'Ativo', sc: AUR.carb, c: AUR.gold},
                {n:'Dr. Pedro Antunes', e:'pedro@nutrir.online', r:'Nutricionista', p:22, ret: 82, com:'13.5%', rev:'R$ 2.815,40', s:'Ativo', sc: AUR.carb, c: AUR.pink},
              ].map((r,i)=>(
                <tr key={i}>
                  <td><div style={{display:'flex', alignItems:'center', gap: 12}}>
                    <div style={{width: 32, height: 32, borderRadius:'50%', background:`linear-gradient(135deg, ${r.c}66, ${AUR.gold}66)`, border:`1px solid ${r.c}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600, color: AUR.cream}}>
                      {r.n.replace(/Dra?\.|PT/g,'').trim().split(' ').map(s=>s[0]).slice(0,2).join('')}
                    </div>
                    <div>
                      <div style={{fontWeight: 500}}>{r.n}</div>
                      <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 1}}>{r.e}</div>
                    </div>
                  </div></td>
                  <td><span className="aur-tag" style={{color: r.c, fontSize: 9}}>{r.r}</span></td>
                  <td className="aur-mono" style={{textAlign:'right'}}>{r.p}</td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'inline-flex', alignItems:'center', gap: 8}}>
                      <div style={{width: 40, height: 4, background:'rgba(241,236,245,0.08)', borderRadius: 2, position:'relative'}}>
                        <div style={{position:'absolute', left:0, top:0, bottom:0, width: `${r.ret}%`, background: r.ret>85?AUR.carb:AUR.fat, borderRadius: 2}}/>
                      </div>
                      <span className="aur-mono" style={{fontSize: 11, color: r.ret>85?AUR.carb:AUR.fat}}>{r.ret}%</span>
                    </div>
                  </td>
                  <td className="aur-mono" style={{textAlign:'right', color: AUR.gold, fontWeight: 600}}>{r.com}</td>
                  <td className="aur-mono" style={{textAlign:'right'}}>{r.rev}</td>
                  <td><span className="aur-tag" style={{color: r.sc, fontSize: 9}}>● {r.s}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

const AuroraAdminPatient = () => (
  <div className="aur-admin">
    <AurSidebar active="patients"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 36px', borderBottom:'1px solid rgba(241,236,245,0.08)'}}>
        <div style={{display:'flex', alignItems:'center', gap: 14, marginBottom: 14}}>
          <button className="aur-btn-ghost" style={{padding: '7px 12px'}}>{IcoA.back} Pacientes</button>
          <div className="aur-eyebrow">Camila Rocha · #4218</div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
          <div style={{display:'flex', alignItems:'center', gap: 16}}>
            <div style={{width: 60, height: 60, borderRadius:'50%', background:`linear-gradient(135deg, ${AUR.pink}, ${AUR.gold})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 20, fontWeight: 700, color:'#1a0f1e'}}>CR</div>
            <div>
              <h1 className="aur-display" style={{fontSize: 28, letterSpacing:'-0.025em'}}>Camila Rocha</h1>
              <div className="aur-mono" style={{fontSize: 11, color: AUR.muted, marginTop: 4}}>camila@email.com · vinculada há 28d · Premium Anual</div>
            </div>
          </div>
          <div style={{display:'flex', gap: 8}}>
            <button className="aur-btn-ghost">Exportar relatório</button>
            <button className="aur-btn-primary">+ Nova prescrição</button>
          </div>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 36px', display:'grid', gridTemplateColumns:'320px 1fr', gap: 18}}>
        {/* LEFT */}
        <div style={{display:'flex', flexDirection:'column', gap: 14}}>
          <div className="aur-card-aurora">
            <div className="aur-inner" style={{padding: 22}}>
              <div className="aur-eyebrow" style={{marginBottom: 16}}>Perfil clínico</div>
              {[
                {l:'Idade', v:'29 anos'},
                {l:'Sexo', v:'Feminino'},
                {l:'Altura', v:'168 cm'},
                {l:'Peso atual', v:'68.4 kg', hl: true},
                {l:'Peso inicial', v:'72.0 kg'},
                {l:'Meta', v:'62.0 kg'},
                {l:'IMC', v:'24.2'},
                {l:'TMB', v:'1.428 kcal'},
                {l:'Meta calórica', v:'1.700 kcal', hl: true},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex', justifyContent:'space-between', padding: '10px 0', borderBottom: i<8?'1px solid rgba(241,236,245,0.05)':'none', fontSize: 12}}>
                  <span style={{color: AUR.muted}}>{r.l}</span>
                  <span className="aur-mono" style={{fontWeight: 500, color: r.hl ? AUR.gold : AUR.cream}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="aur-card" style={{padding: 20}}>
            <div className="aur-eyebrow" style={{marginBottom: 14}}>Macros prescritos</div>
            <div style={{display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 6, marginBottom: 14}}>
              {[{l:'Proteína', v:'130g', c: AUR.prot},{l:'Carbo', v:'170g', c: AUR.carb},{l:'Gordura', v:'58g', c: AUR.fat}].map(m=>(
                <div key={m.l} style={{padding: 12, borderRadius: 14, border:`1px solid ${m.c}44`, textAlign:'center'}}>
                  <div className="aur-num-display" style={{fontSize: 22, color: m.c}}>{m.v}</div>
                  <div className="aur-mono" style={{fontSize: 9, color: AUR.muted, marginTop: 2, letterSpacing:'0.1em', textTransform:'uppercase'}}>{m.l}</div>
                </div>
              ))}
            </div>
            <button className="aur-btn-ghost" style={{width:'100%', fontSize: 12}}>Ajustar metas</button>
          </div>

          <div className="aur-card" style={{padding: 20}}>
            <div className="aur-eyebrow" style={{marginBottom: 12}}>Nova prescrição</div>
            <textarea placeholder="Escreva o plano alimentar, treino ou orientação..." style={{width:'100%', minHeight: 100, background:'rgba(241,236,245,0.025)', border:'1px solid rgba(241,236,245,0.1)', borderRadius: 14, padding: 12, color: AUR.text, fontSize: 13, fontFamily:'Geist', resize:'none', outline:'none', lineHeight: 1.5}}/>
            <button className="aur-btn-primary" style={{width:'100%', marginTop: 12, justifyContent:'center', display:'flex'}}>Enviar para o app</button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{display:'flex', flexDirection:'column', gap: 14, minWidth: 0}}>
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap: 14}}>
            <div className="aur-card" style={{padding: 22}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 14}}>
                <div>
                  <div className="aur-eyebrow">Evolução · 4 semanas</div>
                  <div className="aur-num-display" style={{fontSize: 24, color: AUR.carb, marginTop: 6}}>−3.6 kg</div>
                </div>
                <div className="aur-mono" style={{fontSize: 11, color: AUR.carb}}>↘ atingindo meta</div>
              </div>
              <svg width="100%" height="80" viewBox="0 0 400 80" style={{display:'block'}}>
                <defs>
                  <linearGradient id="aurPatLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={AUR.pink}/><stop offset="50%" stopColor={AUR.gold}/><stop offset="100%" stopColor={AUR.blue}/>
                  </linearGradient>
                  <linearGradient id="aurPatFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AUR.gold} stopOpacity="0.25"/><stop offset="100%" stopColor={AUR.gold} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {[0,1,2,3].map(i=>(<line key={i} x1="0" x2="400" y1={i*20+5} y2={i*20+5} stroke="rgba(241,236,245,0.05)"/>))}
                <path d="M0,15 C40,18 80,30 120,28 C160,26 200,40 240,45 C280,50 320,62 360,70 L400,75 L400,80 L0,80 Z" fill="url(#aurPatFill)"/>
                <path d="M0,15 C40,18 80,30 120,28 C160,26 200,40 240,45 C280,50 320,62 360,70 L400,75" fill="none" stroke="url(#aurPatLine)" strokeWidth="2"/>
                <circle cx="400" cy="75" r="5" fill={AUR.cream}/>
              </svg>
            </div>

            <div className="aur-card" style={{padding: 18}}>
              <div className="aur-eyebrow" style={{marginBottom: 10, color: AUR.blue}}>Hidratação</div>
              <div className="aur-num-display" style={{fontSize: 26}}>1.8<span style={{fontSize: 12, color: AUR.muted, marginLeft: 4, fontFamily:'Geist Mono'}}>L</span></div>
              <div style={{height: 3, background:'rgba(241,236,245,0.06)', borderRadius: 2, marginTop: 12, position:'relative', overflow:'hidden'}}>
                <div style={{height:'100%', width:'72%', background: AUR.blue, borderRadius: 2}}/>
              </div>
              <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 6}}>72% de 2.5L</div>
            </div>

            <div className="aur-card" style={{padding: 18}}>
              <div className="aur-eyebrow" style={{marginBottom: 10, color: AUR.gold}}>Jejum 16:8</div>
              <div className="aur-num-display" style={{fontSize: 26, color: AUR.gold}}>12h28</div>
              <div className="aur-mono" style={{fontSize: 10, color: AUR.muted, marginTop: 12}}>iniciou 20:14 · ontem</div>
              <div className="aur-mono" style={{fontSize: 10, color: AUR.carb, marginTop: 4}}>● em curso</div>
            </div>
          </div>

          <div className="aur-card" style={{padding: 0, overflow:'hidden'}}>
            <div style={{padding: '18px 26px', borderBottom: '1px solid rgba(241,236,245,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 className="aur-display" style={{fontSize: 17, fontWeight: 500, letterSpacing:'-0.01em'}}>Diário alimentar</h3>
              <div style={{display:'flex', gap: 6}}>
                {['Hoje','Ontem','-2d','-3d','7d'].map((p,i)=>(
                  <button key={p} style={{padding:'5px 12px', borderRadius: 999, background: i===0 ? `linear-gradient(135deg, ${AUR.pink}33, ${AUR.gold}33)` : 'transparent', border:`1px solid ${i===0?AUR.gold:'rgba(241,236,245,0.08)'}`, color: i===0 ? AUR.cream : AUR.muted, fontSize: 10, fontFamily:'Geist Mono', cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <table className="aur-table">
              <thead><tr>
                <th>Hora</th>
                <th>Refeição</th>
                <th>Itens</th>
                <th style={{textAlign:'right'}}>kcal</th>
                <th style={{textAlign:'right'}}>P</th>
                <th style={{textAlign:'right'}}>C</th>
                <th style={{textAlign:'right'}}>G</th>
                <th>Fonte</th>
              </tr></thead>
              <tbody>
                {[
                  {h:'08:14', n:'Café', it:'Iogurte grego, granola, banana', k:340, p:18, c:42, f:9, src:'Manual'},
                  {h:'10:30', n:'Snack', it:'Whey + maçã', k:180, p:24, c:18, f:2, src:'Manual'},
                  {h:'12:48', n:'Almoço', it:'Arroz integral, frango, brócolis, azeite', k:542, p:38, c:50, f:18, src:'IA'},
                  {h:'15:20', n:'Lanche', it:'Castanhas + chá verde', k:160, p:4, c:6, f:14, src:'Manual'},
                  {h:'19:40', n:'Jantar', it:'Salmão grelhado, salada, batata doce', k:480, p:36, c:38, f:18, src:'IA'},
                ].map((r,i)=>(
                  <tr key={i}>
                    <td className="aur-mono" style={{color: AUR.muted, fontSize: 11}}>{r.h}</td>
                    <td style={{fontWeight: 500}}>{r.n}</td>
                    <td style={{color: AUR.muted, fontSize: 12}}>{r.it}</td>
                    <td className="aur-mono" style={{textAlign:'right', fontWeight: 600, color: AUR.gold}}>{r.k}</td>
                    <td className="aur-mono" style={{textAlign:'right', color: AUR.prot}}>{r.p}</td>
                    <td className="aur-mono" style={{textAlign:'right', color: AUR.carb}}>{r.c}</td>
                    <td className="aur-mono" style={{textAlign:'right', color: AUR.fat}}>{r.f}</td>
                    <td><span className="aur-tag" style={{color: r.src==='IA'?AUR.gold:AUR.muted, fontSize: 9}}>{r.src}</span></td>
                  </tr>
                ))}
                <tr style={{background:`linear-gradient(90deg, rgba(255,110,140,0.03), rgba(212,175,127,0.05))`}}>
                  <td/>
                  <td className="aur-display" style={{fontWeight: 600}}>Total</td>
                  <td className="aur-mono" style={{fontSize: 10, color: AUR.muted}}>5 refeições</td>
                  <td className="aur-mono" style={{textAlign:'right', fontWeight: 700, color: AUR.gold}}>1.702</td>
                  <td className="aur-mono" style={{textAlign:'right', fontWeight: 700, color: AUR.prot}}>120</td>
                  <td className="aur-mono" style={{textAlign:'right', fontWeight: 700, color: AUR.carb}}>154</td>
                  <td className="aur-mono" style={{textAlign:'right', fontWeight: 700, color: AUR.fat}}>61</td>
                  <td/>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
);

Object.assign(window, {
  AuroraOnboarding, AuroraDashboard, AuroraScanner, AuroraResult,
  AuroraRecipes, AuroraHistory,
  AuroraAdminOverview, AuroraAdminPros, AuroraAdminPatient,
});
