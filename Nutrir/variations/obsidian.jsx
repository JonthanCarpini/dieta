// ============================================================
// OBSIDIAN — Refined dark luxury
// Warm amber accents, glass cards, hairlines, mono numerals
// ============================================================

(() => {
  if (document.getElementById('obs-styles')) return;
  const s = document.createElement('style');
  s.id = 'obs-styles';
  s.textContent = `
    .obs-root {
      width: 100%; height: 100%;
      background: #0a0a0c;
      color: #f4f1ec;
      font-family: 'Geist', system-ui, sans-serif;
      font-feature-settings: 'ss01' on, 'cv11' on;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .obs-root::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(60% 40% at 50% 0%, rgba(245,193,77,0.10), transparent 70%),
        radial-gradient(50% 30% at 100% 100%, rgba(224,115,74,0.06), transparent 70%);
      pointer-events: none;
    }
    .obs-root::after {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,250,240,0.04) 1px, transparent 1px);
      background-size: 20px 20px;
      mask-image: linear-gradient(180deg, transparent, black 30%, black 80%, transparent);
      pointer-events: none;
    }
    .obs-root > * { position: relative; z-index: 1; }
    .obs-mono { font-family: 'Geist Mono', monospace; font-feature-settings: 'tnum' on; }

    .obs-scroll { flex: 1; overflow-y: auto; }
    .obs-scroll::-webkit-scrollbar { display: none; }

    :root {
      --obs-card-bg: rgba(255,250,240,0.035);
      --obs-card-border: rgba(255,250,240,0.07);
      --obs-card-blur: 20px;
      --obs-density: 1;
    }
    .obs-glass {
      background: var(--obs-card-bg);
      border: 1px solid var(--obs-card-border);
      border-radius: 18px;
      backdrop-filter: blur(var(--obs-card-blur));
      -webkit-backdrop-filter: blur(var(--obs-card-blur));
    }
    .obs-hairline { border: 1px solid rgba(255,250,240,0.08); }

    .obs-statbar {
      display: flex; align-items: baseline; gap: 6px;
      font-family: 'Geist Mono', monospace;
      font-feature-settings: 'tnum' on;
    }

    .obs-eyebrow {
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(244,241,236,0.45);
    }

    .obs-num-xl {
      font-family: 'Geist Mono', monospace;
      font-feature-settings: 'tnum' on;
      font-size: 56px;
      font-weight: 500;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    /* Bottom nav */
    .obs-bottomnav {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      padding: 12px 18px 18px;
      gap: 4px;
      background: linear-gradient(180deg, transparent, rgba(10,10,12,0.9) 30%);
    }
    .obs-navitem {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 4px;
      background: none; border: none;
      color: rgba(244,241,236,0.4);
      font-size: 10px;
      font-family: 'Geist', sans-serif;
      letter-spacing: 0.04em;
      cursor: pointer;
    }
    .obs-navitem.active { color: #f5c14d; }
    .obs-navitem.active .obs-navdot { background: #f5c14d; box-shadow: 0 0 12px rgba(245,193,77,0.6); }
    .obs-navdot { width: 4px; height: 4px; border-radius: 50%; background: rgba(244,241,236,0.2); margin-bottom: 2px; }

    /* Admin */
    .obs-admin {
      width: 100%; height: 100%;
      background: #08080a;
      color: #f4f1ec;
      font-family: 'Geist', system-ui, sans-serif;
      display: grid;
      grid-template-columns: 220px 1fr;
      overflow: hidden;
    }
    .obs-admin::before {
      content: '';
      position: absolute;
      width: 100%; height: 100%;
      background: radial-gradient(50% 40% at 0% 0%, rgba(245,193,77,0.06), transparent 70%);
      pointer-events: none;
    }
    .obs-sidebar {
      background: rgba(255,250,240,0.02);
      border-right: 1px solid rgba(255,250,240,0.06);
      padding: 24px 14px;
      display: flex; flex-direction: column;
      gap: 4px;
    }
    .obs-sidenav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: rgba(244,241,236,0.6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .obs-sidenav-item.active {
      background: rgba(245,193,77,0.08);
      color: #f5c14d;
      border-color: rgba(245,193,77,0.15);
    }
    .obs-table { width: 100%; border-collapse: collapse; }
    .obs-table th {
      text-align: left;
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(244,241,236,0.4);
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,250,240,0.06);
    }
    .obs-table td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255,250,240,0.04);
      color: #f4f1ec;
    }
    .obs-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: 1px solid currentColor;
    }
    .obs-btn-primary {
      background: linear-gradient(180deg, #f5c14d, #e0a13a);
      color: #1a1408;
      border: none;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: 'Geist', sans-serif;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: -0.01em;
      cursor: pointer;
      box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 22px -8px rgba(245,193,77,0.5);
    }
    .obs-btn-ghost {
      background: rgba(255,250,240,0.04);
      color: #f4f1ec;
      border: 1px solid rgba(255,250,240,0.08);
      padding: 11px 16px;
      border-radius: 12px;
      font-family: 'Geist', sans-serif;
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(s);
})();

// --- Reusable icons (line-only, sized) ---
const Ico = {
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  camera: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/></svg>,
  drop: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12z"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6"/></svg>,
  flame: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3s2 4 2 6c0 1.5-1 2-1 2s3 0 3 4a6 6 0 1 1-12 0c0-3 2-5 4-7s4-5 4-5z"/></svg>,
  timer: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 3h6"/></svg>,
  grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  salad: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 11h18a9 9 0 1 1-18 0z"/><path d="M7 11c0-3 2-5 5-5M14 6c2 1 3 3 3 5"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 12 5 5 9-11"/></svg>,
  more: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  bell: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>,
};

// --- Bottom nav (used on multiple screens) ---
const ObsBottomNav = ({active}) => {
  const items = [
    {k:'diary',label:'Diário',icon:Ico.grid},
    {k:'recipes',label:'Receitas',icon:Ico.salad},
    {k:'fasting',label:'Jejum',icon:Ico.timer},
    {k:'history',label:'Histórico',icon:Ico.cal},
    {k:'profile',label:'Perfil',icon:Ico.user},
  ];
  return (
    <nav className="obs-bottomnav">
      {items.map(it => (
        <button key={it.k} className={`obs-navitem ${active===it.k?'active':''}`}>
          <span className="obs-navdot"/>
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
};

// --- 1. ONBOARDING ---
const ObsidianOnboarding = () => (
  <div className="obs-root" style={{padding: '32px 24px 0'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 36}}>
      <div className="obs-eyebrow">Nutrir / Onboarding · 04/06</div>
      <div style={{display:'flex', gap: 4}}>
        {[1,2,3,4,5,6].map(i=>(
          <div key={i} style={{width: 18, height: 2, background: i<=4?'#f5c14d':'rgba(244,241,236,0.12)'}}/>
        ))}
      </div>
    </div>

    <h1 style={{fontSize: 32, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 8}}>
      Calibre sua<br/>meta diária.
    </h1>
    <p style={{fontSize: 14, color: 'rgba(244,241,236,0.55)', marginBottom: 28, lineHeight: 1.5}}>
      Usamos Mifflin-St Jeor com fator de atividade. Você pode ajustar tudo depois.
    </p>

    <div className="obs-scroll" style={{marginRight: -24, paddingRight: 24}}>
      {/* Goal weight slider */}
      <div className="obs-glass" style={{padding: 20, marginBottom: 14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 18}}>
          <span className="obs-eyebrow">Peso objetivo</span>
          <div className="obs-statbar">
            <span className="obs-mono" style={{fontSize: 22, fontWeight: 500, color: '#f5c14d'}}>72.0</span>
            <span style={{fontSize: 11, color: 'rgba(244,241,236,0.4)'}} className="obs-mono">kg</span>
          </div>
        </div>
        {/* Tick scale */}
        <div style={{position: 'relative', height: 56, marginBottom: 6}}>
          {/* base line */}
          <div style={{position:'absolute', left:0, right:0, top: 28, height: 1, background:'rgba(244,241,236,0.08)'}}/>
          {/* ticks */}
          {Array.from({length:31}).map((_,i)=>{
            const isMajor = i % 5 === 0;
            const h = isMajor ? 14 : 8;
            return <div key={i} style={{position:'absolute', left: `${(i/30)*100}%`, top: 28-h/2, width: 1, height: h, background:'rgba(244,241,236,0.18)'}}/>;
          })}
          {/* handle */}
          <div style={{position:'absolute', left: '53%', top: 6, transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center'}}>
            <div style={{width:2, height: 44, background:'#f5c14d', boxShadow:'0 0 12px rgba(245,193,77,0.6)'}}/>
            <div style={{position:'absolute', top:-2, width: 10, height: 10, borderRadius: '50%', background:'#f5c14d', border:'2px solid #0a0a0c'}}/>
          </div>
          <div className="obs-mono" style={{position:'absolute', left:0, top: 44, fontSize: 9, color:'rgba(244,241,236,0.35)'}}>60</div>
          <div className="obs-mono" style={{position:'absolute', right:0, top: 44, fontSize: 9, color:'rgba(244,241,236,0.35)'}}>90</div>
        </div>
      </div>

      {/* Pace */}
      <div className="obs-glass" style={{padding: 20, marginBottom: 14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14}}>
          <span className="obs-eyebrow">Ritmo</span>
          <div className="obs-statbar">
            <span className="obs-mono" style={{fontSize: 22, fontWeight: 500, color: '#f5c14d'}}>−0.50</span>
            <span className="obs-mono" style={{fontSize: 11, color: 'rgba(244,241,236,0.4)'}}>kg/sem</span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 6}}>
          {['Lento','Moderado','Equilibrado','Acelerado','Agressivo'].map((p, i)=>(
            <div key={p} style={{flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center', background: i===2?'rgba(245,193,77,0.12)':'transparent', border: i===2?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(244,241,236,0.06)', fontSize: 9.5, color: i===2?'#f5c14d':'rgba(244,241,236,0.5)', fontWeight: 500, letterSpacing: '0.02em'}}>{p}</div>
          ))}
        </div>
      </div>

      {/* Outputs */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14}}>
        <div className="obs-glass" style={{padding: 16}}>
          <div className="obs-eyebrow" style={{marginBottom: 12}}>Calorias / dia</div>
          <div className="obs-num-xl" style={{fontSize: 30, color:'#f4f1ec'}}>2.100</div>
          <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.4)', marginTop: 6}}>kcal · TDEE −20%</div>
        </div>
        <div className="obs-glass" style={{padding: 16}}>
          <div className="obs-eyebrow" style={{marginBottom: 12}}>Meta atingida</div>
          <div className="obs-num-xl" style={{fontSize: 30, color:'#f4f1ec'}}>12<span style={{fontSize:14, color:'rgba(244,241,236,0.4)'}}>sem</span></div>
          <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.4)', marginTop: 6}}>17 ago · 2026</div>
        </div>
      </div>

      {/* Macro split preview */}
      <div className="obs-glass" style={{padding: 18, marginBottom: 20}}>
        <div className="obs-eyebrow" style={{marginBottom: 14}}>Distribuição estimada</div>
        <div style={{display:'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12}}>
          <div style={{flex: 30, background: '#ff8e7e'}}/>
          <div style={{flex: 45, background: '#c4e88f'}}/>
          <div style={{flex: 25, background: '#f5c14d'}}/>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize: 11}}>
          {[{l:'Proteína',v:'150g',c:'#ff8e7e'},{l:'Carbo',v:'220g',c:'#c4e88f'},{l:'Gordura',v:'70g',c:'#f5c14d'}].map(m=>(
            <div key={m.l} style={{display:'flex', flexDirection:'column'}}>
              <span style={{color:'rgba(244,241,236,0.5)', fontSize: 10, letterSpacing:'0.04em'}}>{m.l}</span>
              <span className="obs-mono" style={{color: m.c, fontWeight: 500, marginTop: 2}}>{m.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{display: 'flex', gap: 10, padding: '14px 0 24px', borderTop: '1px solid rgba(244,241,236,0.06)'}}>
      <button className="obs-btn-ghost" style={{flex: '0 0 auto', padding: '13px 18px'}}>{Ico.back}</button>
      <button className="obs-btn-primary" style={{flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap: 8}}>
        Continuar {Ico.arrow}
      </button>
    </div>
  </div>
);

// --- 2. DASHBOARD ---
const ObsidianDashboard = () => (
  <div className="obs-root">
    <header style={{padding: '18px 24px 8px', display: 'flex', justifyContent:'space-between', alignItems:'center'}}>
      <div>
        <div className="obs-eyebrow">Terça · 26 mai</div>
        <h2 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 2}}>Bom dia, João.</h2>
      </div>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.bell}</button>
    </header>

    <div className="obs-scroll" style={{padding: '8px 24px 16px'}}>
      {/* Search */}
      <button className="obs-glass" style={{width:'100%', padding: '14px 16px', display:'flex', alignItems:'center', gap: 10, color:'rgba(244,241,236,0.5)', fontSize: 13, cursor:'pointer', textAlign:'left'}}>
        {Ico.search}
        <span>Buscar alimento (iogurte, tapioca…)</span>
      </button>

      {/* Calorie ring */}
      <div className="obs-glass" style={{padding: 24, marginTop: 14, display:'flex', alignItems:'center', gap: 22}}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(244,241,236,0.06)" strokeWidth="6"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#obsRing)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${0.42 * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
            transform="rotate(-90 60 60)"/>
          <defs>
            <linearGradient id="obsRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5c14d"/>
              <stop offset="100%" stopColor="#e0734a"/>
            </linearGradient>
          </defs>
          <text x="60" y="56" textAnchor="middle" fill="#f4f1ec" fontSize="22" fontWeight="500" fontFamily="Geist Mono">42<tspan fontSize="11" dy="-6">%</tspan></text>
          <text x="60" y="72" textAnchor="middle" fill="rgba(244,241,236,0.4)" fontSize="9" fontFamily="Geist Mono" letterSpacing="0.1em">META</text>
        </svg>
        <div style={{flex: 1}}>
          <div className="obs-eyebrow" style={{marginBottom: 4}}>Restante hoje</div>
          <div className="obs-num-xl" style={{fontSize: 40, marginBottom: 2}}>1.218</div>
          <div className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)'}}>kcal · de 2.100</div>
          <div style={{display:'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop:'1px solid rgba(244,241,236,0.06)'}}>
            <div>
              <div className="obs-mono" style={{fontSize: 14, fontWeight: 500}}>882</div>
              <div className="obs-eyebrow" style={{fontSize: 9}}>Consumido</div>
            </div>
            <div style={{width:1, background:'rgba(244,241,236,0.06)'}}/>
            <div>
              <div className="obs-mono" style={{fontSize: 14, fontWeight: 500, color: '#c4e88f'}}>+220</div>
              <div className="obs-eyebrow" style={{fontSize: 9}}>Exercício</div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14}}>
        {[
          {l:'Proteína', c:'#ff8e7e', cur: 68, tgt: 150},
          {l:'Carbo', c:'#c4e88f', cur: 92, tgt: 220},
          {l:'Gordura', c:'#f5c14d', cur: 28, tgt: 70},
        ].map(m=>(
          <div key={m.l} className="obs-glass" style={{padding: 14}}>
            <div className="obs-eyebrow" style={{fontSize: 9, marginBottom: 8}}>{m.l}</div>
            <div className="obs-statbar" style={{marginBottom: 8}}>
              <span style={{fontSize: 18, fontWeight: 500}}>{m.cur}</span>
              <span style={{fontSize: 10, color: 'rgba(244,241,236,0.4)'}}>/{m.tgt}g</span>
            </div>
            <div style={{height: 3, background: 'rgba(244,241,236,0.06)', borderRadius: 2, overflow:'hidden'}}>
              <div style={{height:'100%', width: `${m.cur/m.tgt*100}%`, background: m.c, borderRadius: 2}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Hydration */}
      <div className="obs-glass" style={{padding: 18, marginTop: 14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
          <div style={{display:'flex', alignItems:'center', gap: 8, color: '#8da7c4'}}>
            {Ico.drop}
            <span style={{fontSize: 13, fontWeight: 500, color: '#f4f1ec'}}>Hidratação</span>
          </div>
          <div className="obs-mono" style={{fontSize: 12}}>1.250 <span style={{color:'rgba(244,241,236,0.4)'}}>/ 2.500 ml</span></div>
        </div>
        <div style={{display:'flex', gap: 4, marginBottom: 12}}>
          {Array.from({length:10}).map((_,i)=>(
            <div key={i} style={{flex: 1, height: 18, borderRadius: 3, background: i<5?'#8da7c4':'rgba(244,241,236,0.06)', border: i<5?'none':'1px solid rgba(244,241,236,0.04)'}}/>
          ))}
        </div>
        <div style={{display:'flex', gap: 6}}>
          <button className="obs-btn-ghost" style={{flex: 1, padding: '9px 10px', fontSize: 12}}>+250 ml</button>
          <button className="obs-btn-ghost" style={{flex: 1, padding: '9px 10px', fontSize: 12}}>+500 ml</button>
          <button className="obs-btn-ghost" style={{padding: '9px 12px'}}>{Ico.plus}</button>
        </div>
      </div>

      {/* Meals */}
      <div style={{marginTop: 18, display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10}}>
        <h3 style={{fontSize: 14, fontWeight: 500, letterSpacing:'-0.01em'}}>Refeições de hoje</h3>
        <span className="obs-eyebrow">02 registradas</span>
      </div>

      {[
        {n:'Café da manhã', t:'08:14', cal:340, p:18, c:42, f:9},
        {n:'Almoço', t:'12:48', cal:542, p:38, c:50, f:18},
      ].map((m, i)=>(
        <div key={i} className="obs-glass" style={{padding: 14, marginBottom: 8, display:'flex', alignItems:'center', gap: 14}}>
          <div style={{width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,193,77,0.15), rgba(224,115,74,0.1))', border: '1px solid rgba(245,193,77,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c14d'}}>
            {Ico.flame}
          </div>
          <div style={{flex: 1}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
              <span style={{fontSize: 13, fontWeight: 500}}>{m.n}</span>
              <span className="obs-mono" style={{fontSize: 14, fontWeight: 500}}>{m.cal}<span style={{fontSize:10, color:'rgba(244,241,236,0.4)'}}>kcal</span></span>
            </div>
            <div style={{display:'flex', gap: 10, marginTop: 4}} className="obs-mono">
              <span style={{fontSize: 10, color: 'rgba(244,241,236,0.4)'}}>{m.t}</span>
              <span style={{fontSize: 10, color: '#ff8e7e'}}>P {m.p}</span>
              <span style={{fontSize: 10, color: '#c4e88f'}}>C {m.c}</span>
              <span style={{fontSize: 10, color: '#f5c14d'}}>G {m.f}</span>
            </div>
          </div>
        </div>
      ))}

      <button style={{width:'100%', padding: '14px', border: '1px dashed rgba(244,241,236,0.12)', borderRadius: 14, background:'transparent', color:'rgba(244,241,236,0.5)', fontSize: 12, fontFamily:'Geist Mono', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', marginTop: 4}}>
        + Registrar refeição
      </button>
    </div>

    {/* FAB */}
    <button style={{position:'absolute', right: 22, bottom: 96, width: 56, height: 56, borderRadius: 18, background:'linear-gradient(180deg, #f5c14d, #e0a13a)', border:'none', color:'#1a1408', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 12px 32px -10px rgba(245,193,77,0.6), 0 1px 0 rgba(255,255,255,0.2) inset'}}>
      {Ico.camera}
    </button>

    <ObsBottomNav active="diary"/>
  </div>
);

// --- 3. SCANNER ---
const ObsidianScanner = () => (
  <div className="obs-root">
    <header style={{padding: '18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="obs-eyebrow">IA Gemini · v1.5</div>
        <div style={{fontSize: 14, fontWeight: 500, marginTop: 2}}>Escanear prato</div>
      </div>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.more}</button>
    </header>

    <div style={{flex: 1, padding: '8px 20px', display:'flex', flexDirection:'column'}}>
      {/* Viewport */}
      <div style={{flex: 1, borderRadius: 22, position:'relative', overflow:'hidden', border:'1px solid rgba(244,241,236,0.08)', background:'#06060a'}}>
        {/* Simulated dish */}
        <div style={{position:'absolute', inset: 0, background: 'radial-gradient(60% 50% at 50% 55%, rgba(245,193,77,0.18), rgba(224,115,74,0.08) 40%, transparent 70%)'}}/>
        <div style={{position:'absolute', left:'50%', top:'55%', transform:'translate(-50%,-50%)', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,232,143,0.4), rgba(245,193,77,0.2) 60%, transparent)', filter:'blur(2px)'}}/>
        <div style={{position:'absolute', left:'42%', top:'48%', width:60, height:50, borderRadius:'45%', background:'linear-gradient(140deg, #c4985a, #8b6532)', boxShadow:'0 6px 18px rgba(0,0,0,0.4)'}}/>
        <div style={{position:'absolute', left:'55%', top:'58%', width:50, height:45, borderRadius:'40%', background:'linear-gradient(140deg, #6b8a3c, #3d5524)', boxShadow:'0 6px 18px rgba(0,0,0,0.4)'}}/>
        <div style={{position:'absolute', left:'47%', top:'63%', width:40, height:36, borderRadius:'50%', background:'linear-gradient(140deg, #d4d4c8, #a8a89a)', boxShadow:'0 6px 18px rgba(0,0,0,0.4)'}}/>

        {/* Corners */}
        {[
          {t:24, l:24, b:'2px solid #f5c14d', r:''}, {t:24, r:24, b:'2px solid #f5c14d', l:''},
          {bottom:80, l:24, b:'', t:'2px solid #f5c14d', r:''}, {bottom:80, r:24, b:'', t:'2px solid #f5c14d', l:''},
        ].map((p,i)=>{
          const style = {position:'absolute', width: 24, height: 24};
          if (p.t !== undefined) style.top = p.t;
          if (p.l !== undefined) style.left = p.l;
          if (p.r !== undefined) style.right = p.r;
          if (p.bottom !== undefined) style.bottom = p.bottom;
          // 4 corners
          if (i===0) Object.assign(style, {borderTop:'2px solid #f5c14d', borderLeft:'2px solid #f5c14d', borderTopLeftRadius: 12});
          if (i===1) Object.assign(style, {borderTop:'2px solid #f5c14d', borderRight:'2px solid #f5c14d', borderTopRightRadius: 12});
          if (i===2) Object.assign(style, {borderBottom:'2px solid #f5c14d', borderLeft:'2px solid #f5c14d', borderBottomLeftRadius: 12});
          if (i===3) Object.assign(style, {borderBottom:'2px solid #f5c14d', borderRight:'2px solid #f5c14d', borderBottomRightRadius: 12});
          return <div key={i} style={style}/>;
        })}

        {/* Scan line */}
        <div style={{position:'absolute', left: 30, right: 30, top: '50%', height: 1, background:'linear-gradient(90deg, transparent, #f5c14d, transparent)', boxShadow:'0 0 12px #f5c14d'}}/>

        {/* HUD readout */}
        <div style={{position:'absolute', left: 24, bottom: 24, right: 24, display:'flex', justifyContent:'space-between'}}>
          <div className="obs-mono" style={{fontSize: 9, color: '#f5c14d', letterSpacing:'0.1em'}}>
            <div>● ANALISANDO</div>
            <div style={{color:'rgba(244,241,236,0.5)', marginTop: 2}}>3 ITENS · 89% CONF.</div>
          </div>
          <div className="obs-mono" style={{fontSize: 9, color:'rgba(244,241,236,0.5)', textAlign:'right'}}>
            <div>F2.4 · ISO 200</div>
            <div style={{marginTop: 2}}>26mai · 12:48</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 22, padding: '0 8px'}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 4, color:'rgba(244,241,236,0.5)', cursor:'pointer'}}>
          <div className="obs-glass" style={{width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center'}}>{Ico.grid}</div>
          <span style={{fontSize: 9, fontFamily:'Geist Mono', letterSpacing:'0.06em'}}>UPLOAD</span>
        </div>

        <button style={{width: 76, height: 76, borderRadius:'50%', background:'transparent', border:'2px solid rgba(244,241,236,0.2)', padding: 4, cursor:'pointer'}}>
          <div style={{width:'100%', height:'100%', borderRadius:'50%', background:'linear-gradient(180deg, #f5c14d, #e0a13a)', boxShadow:'0 0 24px rgba(245,193,77,0.5)'}}/>
        </button>

        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 4, color:'rgba(244,241,236,0.5)', cursor:'pointer'}}>
          <div className="obs-glass" style={{width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c14d'}}>{Ico.spark}</div>
          <span style={{fontSize: 9, fontFamily:'Geist Mono', letterSpacing:'0.06em'}}>IA AUTO</span>
        </div>
      </div>

      <div className="obs-glass" style={{marginTop: 20, padding: '12px 16px', display:'flex', alignItems:'center', gap: 10}}>
        <div style={{width: 6, height: 6, borderRadius:'50%', background:'#c4e88f', boxShadow:'0 0 8px #c4e88f'}}/>
        <span style={{fontSize: 12, color:'rgba(244,241,236,0.7)'}}>Toque para capturar. A IA analisa em ~2s.</span>
      </div>
    </div>
  </div>
);

// --- 4. RESULT ---
const ObsidianResult = () => (
  <div className="obs-root">
    <header style={{padding: '18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="obs-eyebrow">Análise · 12:48</div>
        <div style={{fontSize: 14, fontWeight: 500, marginTop: 2}}>Resultado</div>
      </div>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.more}</button>
    </header>

    <div className="obs-scroll" style={{padding: '8px 20px 20px'}}>
      {/* Image */}
      <div style={{height: 180, borderRadius: 18, position:'relative', overflow:'hidden', marginBottom: 14, background:'#0d0d10', border:'1px solid rgba(244,241,236,0.06)'}}>
        <div style={{position:'absolute', inset: 0, background: 'radial-gradient(60% 50% at 50% 55%, rgba(245,193,77,0.2), rgba(224,115,74,0.08) 40%, transparent 70%)'}}/>
        <div style={{position:'absolute', left:'40%', top:'45%', width:60, height:50, borderRadius:'45%', background:'linear-gradient(140deg, #c4985a, #8b6532)'}}/>
        <div style={{position:'absolute', left:'53%', top:'55%', width:50, height:45, borderRadius:'40%', background:'linear-gradient(140deg, #6b8a3c, #3d5524)'}}/>
        <div style={{position:'absolute', left:'45%', top:'60%', width:40, height:36, borderRadius:'50%', background:'linear-gradient(140deg, #d4d4c8, #a8a89a)'}}/>
        <div style={{position:'absolute', left: 14, bottom: 14, display:'flex', alignItems:'center', gap: 6, padding:'4px 10px', borderRadius: 999, background:'rgba(10,10,12,0.7)', border:'1px solid rgba(245,193,77,0.3)', color:'#f5c14d'}}>
          {Ico.check}
          <span className="obs-mono" style={{fontSize: 10, letterSpacing:'0.08em'}}>IA · 92% CONF.</span>
        </div>
      </div>

      {/* Big total */}
      <div className="obs-glass" style={{padding: 22, marginBottom: 14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 16}}>
          <div>
            <div className="obs-eyebrow" style={{marginBottom: 6}}>Total estimado</div>
            <div className="obs-num-xl" style={{fontSize: 52}}>542</div>
            <div className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)', marginTop: 2}}>kcal</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="obs-eyebrow" style={{marginBottom: 6}}>Após</div>
            <div className="obs-mono" style={{fontSize: 18, fontWeight: 500}}>676</div>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>kcal restantes</div>
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10, paddingTop: 14, borderTop:'1px solid rgba(244,241,236,0.06)'}}>
          {[{l:'Proteína', v:'38', c:'#ff8e7e'},{l:'Carbo', v:'50', c:'#c4e88f'},{l:'Gordura', v:'18', c:'#f5c14d'}].map(m=>(
            <div key={m.l}>
              <div style={{fontSize: 9, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(244,241,236,0.4)', fontFamily:'Geist Mono'}}>{m.l}</div>
              <div className="obs-statbar" style={{marginTop: 4}}>
                <span style={{fontSize: 18, fontWeight: 500, color: m.c}}>{m.v}</span>
                <span style={{fontSize: 10, color:'rgba(244,241,236,0.4)'}}>g</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="obs-eyebrow" style={{marginBottom: 10}}>Alimentos identificados</div>

      {[
        {n:'Arroz integral', q:'120g', kcal: 132, c:'#c4e88f', conf: 96},
        {n:'Frango grelhado', q:'140g', kcal: 230, c:'#ff8e7e', conf: 94},
        {n:'Brócolis no vapor', q:'80g', kcal: 28, c:'#c4e88f', conf: 89},
        {n:'Azeite de oliva', q:'1 colher', kcal: 120, c:'#f5c14d', conf: 78},
      ].map((it,i)=>(
        <div key={i} className="obs-glass" style={{padding: 14, marginBottom: 8, display:'flex', alignItems:'center', gap: 12}}>
          <div style={{width: 4, height: 32, background: it.c, borderRadius: 2}}/>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, fontWeight: 500}}>{it.n}</div>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>{it.q} · conf. {it.conf}%</div>
          </div>
          <div className="obs-statbar">
            <span style={{fontSize: 14, fontWeight: 500}}>{it.kcal}</span>
            <span style={{fontSize: 9, color:'rgba(244,241,236,0.4)'}}>kcal</span>
          </div>
          <button style={{width: 26, height: 26, borderRadius: 8, background:'transparent', border:'1px solid rgba(244,241,236,0.1)', color:'rgba(244,241,236,0.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>{Ico.more}</button>
        </div>
      ))}

      <button style={{width:'100%', padding: '12px', border: '1px dashed rgba(244,241,236,0.12)', borderRadius: 12, background:'transparent', color:'rgba(244,241,236,0.5)', fontSize: 11, fontFamily:'Geist Mono', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', marginTop: 4, marginBottom: 18}}>
        + Adicionar item manual
      </button>

      <div style={{display:'flex', gap: 10}}>
        <button className="obs-btn-ghost" style={{flex: 1}}>Descartar</button>
        <button className="obs-btn-primary" style={{flex: 2, display:'flex', alignItems:'center', justifyContent:'center', gap: 8}}>
          Adicionar ao diário {Ico.arrow}
        </button>
      </div>
    </div>
  </div>
);

// --- 5. RECIPES ---
const ObsidianRecipes = () => (
  <div className="obs-root">
    <header style={{padding: '18px 24px 8px'}}>
      <div className="obs-eyebrow">Curado · 04 jun</div>
      <h2 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 2}}>Receitas & IA</h2>
    </header>

    <div style={{padding: '8px 24px', display:'flex', gap: 6, marginBottom: 4}}>
      {['Curadas', 'IA Slimo'].map((t,i)=>(
        <button key={t} className={i===1?'':'obs-glass'} style={i===1?{background:'#f5c14d', color:'#1a1408', padding:'8px 14px', border:'none', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor:'pointer'}:{padding:'8px 14px', borderRadius: 999, fontSize: 12, color:'rgba(244,241,236,0.7)', cursor:'pointer'}}>{t}</button>
      ))}
    </div>

    <div className="obs-scroll" style={{padding: '8px 24px 16px'}}>
      {/* AI generator */}
      <div className="obs-glass" style={{padding: 18, marginBottom: 16, background:'linear-gradient(180deg, rgba(245,193,77,0.06), rgba(224,115,74,0.03))', border:'1px solid rgba(245,193,77,0.18)'}}>
        <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 12, color:'#f5c14d'}}>
          {Ico.spark}
          <span className="obs-eyebrow" style={{color: '#f5c14d'}}>Planejador IA</span>
        </div>
        <h3 style={{fontSize: 17, fontWeight: 500, letterSpacing:'-0.02em', marginBottom: 4}}>
          Cardápio sob medida para o seu saldo de hoje.
        </h3>
        <p style={{fontSize: 12, color:'rgba(244,241,236,0.55)', marginBottom: 14, lineHeight: 1.5}}>
          Faltam <span className="obs-mono" style={{color: '#f5c14d'}}>1.218 kcal</span> e <span className="obs-mono" style={{color: '#ff8e7e'}}>82g de proteína</span>. Gerar receita?
        </p>
        <div style={{display:'flex', gap: 8}}>
          <button className="obs-btn-primary" style={{flex: 1}}>Gerar receita</button>
          <button className="obs-btn-ghost" style={{flex: '0 0 auto'}}>Plano semanal</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex', gap: 6, marginBottom: 12, overflowX:'auto'}}>
        {['Todas','Café','Almoço','Jantar','Lanches','Sobremesa'].map((c,i)=>(
          <button key={c} style={{padding:'7px 12px', borderRadius: 999, background: i===0?'rgba(245,193,77,0.12)':'transparent', border: i===0?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(244,241,236,0.08)', color: i===0?'#f5c14d':'rgba(244,241,236,0.6)', fontSize: 11, fontWeight: 500, cursor:'pointer', whiteSpace:'nowrap'}}>{c}</button>
        ))}
      </div>

      {/* Featured card */}
      <div className="obs-glass" style={{padding: 0, overflow:'hidden', marginBottom: 12}}>
        <div style={{height: 140, position:'relative', overflow:'hidden', background:'linear-gradient(135deg, rgba(196,232,143,0.2), rgba(245,193,77,0.15))'}}>
          <div style={{position:'absolute', inset: 0, background:'radial-gradient(60% 50% at 50% 60%, rgba(255,142,126,0.3), transparent 60%)'}}/>
          <div style={{position:'absolute', left:'30%', top:'40%', width: 80, height: 70, borderRadius:'45%', background:'linear-gradient(140deg, #d97a5f, #a14826)', boxShadow:'0 10px 20px rgba(0,0,0,0.3)'}}/>
          <div style={{position:'absolute', left:'52%', top:'52%', width: 60, height: 50, borderRadius:'45%', background:'linear-gradient(140deg, #c4e88f, #6b8a3c)', boxShadow:'0 10px 20px rgba(0,0,0,0.3)'}}/>
          <div style={{position:'absolute', top:14, left: 14, display:'flex', gap: 6}}>
            <span className="obs-mono" style={{padding:'3px 8px', borderRadius: 6, background:'rgba(10,10,12,0.6)', backdropFilter:'blur(6px)', fontSize: 9, letterSpacing:'0.08em', textTransform:'uppercase', color:'#f5c14d', border:'1px solid rgba(245,193,77,0.3)'}}>IA</span>
            <span className="obs-mono" style={{padding:'3px 8px', borderRadius: 6, background:'rgba(10,10,12,0.6)', backdropFilter:'blur(6px)', fontSize: 9, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(244,241,236,0.7)'}}>Almoço</span>
          </div>
        </div>
        <div style={{padding: 16}}>
          <div style={{fontSize: 15, fontWeight: 500, letterSpacing:'-0.01em', marginBottom: 4}}>Salmão grelhado com purê de couve-flor</div>
          <div style={{fontSize: 11, color:'rgba(244,241,236,0.55)', marginBottom: 12}}>Otimizado para sobra calórica · 28 min</div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', gap: 16}}>
              {[{l:'kcal',v:'480',c:'#f4f1ec'},{l:'P',v:'42g',c:'#ff8e7e'},{l:'C',v:'18g',c:'#c4e88f'},{l:'G',v:'24g',c:'#f5c14d'}].map(m=>(
                <div key={m.l} className="obs-mono" style={{fontSize: 11, color: m.c}}>
                  <span>{m.v}</span>
                  <span style={{color:'rgba(244,241,236,0.4)', marginLeft: 3}}>{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* List rows */}
      {[
        {n:'Bowl de quinoa, atum e abacate', t:'Almoço · 18 min', kcal: 420, p:32, c:38, f:14},
        {n:'Iogurte grego com granola e berries', t:'Café · 5 min', kcal: 280, p:22, c:30, f:9},
        {n:'Wrap de frango com homus', t:'Lanche · 12 min', kcal: 340, p:28, c:34, f:11},
      ].map((r,i)=>(
        <div key={i} className="obs-glass" style={{padding: 12, marginBottom: 8, display:'flex', alignItems:'center', gap: 12}}>
          <div style={{width: 56, height: 56, borderRadius: 12, background:'linear-gradient(135deg, rgba(196,232,143,0.15), rgba(245,193,77,0.1))', flexShrink: 0, position:'relative', overflow:'hidden', border:'1px solid rgba(244,241,236,0.04)'}}>
            <div style={{position:'absolute', left:'30%', top:'35%', width: 26, height: 22, borderRadius:'45%', background:'#a14826'}}/>
            <div style={{position:'absolute', left:'48%', top:'48%', width: 22, height: 20, borderRadius:'40%', background:'#6b8a3c'}}/>
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.n}</div>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>{r.t}</div>
            <div style={{display:'flex', gap: 8, marginTop: 4}} className="obs-mono">
              <span style={{fontSize: 10, color:'#ff8e7e'}}>P{r.p}</span>
              <span style={{fontSize: 10, color:'#c4e88f'}}>C{r.c}</span>
              <span style={{fontSize: 10, color:'#f5c14d'}}>G{r.f}</span>
            </div>
          </div>
          <div className="obs-mono" style={{fontSize: 14, fontWeight: 500}}>{r.kcal}</div>
        </div>
      ))}
    </div>

    <ObsBottomNav active="recipes"/>
  </div>
);

// --- 6. HISTORY ---
const ObsidianHistory = () => {
  const days = [62, 78, 92, 55, 88, 71, 83]; // % of goal
  return (
    <div className="obs-root">
      <header style={{padding: '18px 24px 8px'}}>
        <div className="obs-eyebrow">Sem 21 · mai 2026</div>
        <h2 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 2}}>Histórico</h2>
      </header>

      <div className="obs-scroll" style={{padding: '8px 24px 16px'}}>
        {/* Week chart */}
        <div className="obs-glass" style={{padding: 18, marginBottom: 14}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 16}}>
            <div>
              <div className="obs-eyebrow">Média semanal</div>
              <div className="obs-num-xl" style={{fontSize: 34, marginTop: 4}}>1.842<span style={{fontSize:11, color:'rgba(244,241,236,0.4)', marginLeft: 4}}>kcal</span></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="obs-eyebrow">Δ vs meta</div>
              <div className="obs-mono" style={{fontSize: 16, fontWeight: 500, color: '#c4e88f', marginTop: 4}}>−258</div>
            </div>
          </div>

          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 6, height: 100, marginBottom: 8}}>
            {days.map((d,i)=>(
              <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center'}}>
                <div style={{width:'100%', height: `${d}%`, background: i===6?'linear-gradient(180deg, #f5c14d, #e0734a)':'linear-gradient(180deg, rgba(244,241,236,0.25), rgba(244,241,236,0.08))', borderRadius: 4, position:'relative'}}>
                  {i===6 && <div className="obs-mono" style={{position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize: 9, color:'#f5c14d'}}>83%</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            {['S','T','Q','Q','S','S','D'].map((d,i)=>(
              <div key={i} className="obs-mono" style={{fontSize: 10, color: i===6?'#f5c14d':'rgba(244,241,236,0.4)', flex: 1, textAlign:'center'}}>{d}</div>
            ))}
          </div>
        </div>

        {/* Weight evolution */}
        <div className="obs-glass" style={{padding: 18, marginBottom: 14}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 16}}>
            <div>
              <div className="obs-eyebrow">Peso atual</div>
              <div className="obs-num-xl" style={{fontSize: 30, marginTop: 4}}>76.4<span style={{fontSize:11, color:'rgba(244,241,236,0.4)', marginLeft: 4}}>kg</span></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="obs-eyebrow">Desde início</div>
              <div className="obs-mono" style={{fontSize: 16, fontWeight: 500, color: '#c4e88f', marginTop: 4}}>−1.6 kg</div>
            </div>
          </div>
          <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="obsWeightFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5c14d" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#f5c14d" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,10 C30,15 50,8 80,18 C110,28 140,22 170,30 C200,38 230,32 260,42 L300,46 L300,60 L0,60 Z" fill="url(#obsWeightFill)"/>
            <path d="M0,10 C30,15 50,8 80,18 C110,28 140,22 170,30 C200,38 230,32 260,42 L300,46" fill="none" stroke="#f5c14d" strokeWidth="1.5"/>
            <circle cx="300" cy="46" r="4" fill="#f5c14d"/>
            <circle cx="300" cy="46" r="8" fill="none" stroke="#f5c14d" strokeWidth="1" opacity="0.3"/>
          </svg>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 4}} className="obs-mono">
            <span style={{fontSize: 9, color:'rgba(244,241,236,0.4)'}}>78.0</span>
            <span style={{fontSize: 9, color:'rgba(244,241,236,0.4)'}}>4 sem atrás</span>
            <span style={{fontSize: 9, color:'#f5c14d'}}>76.4 hoje</span>
          </div>
        </div>

        {/* Day rows */}
        <div className="obs-eyebrow" style={{marginBottom: 10}}>Dias anteriores</div>
        {[
          {d:'Seg 25 mai', cal: 1923, target: 2100, pct: 91, weight:'76.4 kg'},
          {d:'Dom 24 mai', cal: 2412, target: 2100, pct: 114, weight:'76.6 kg', over: true},
          {d:'Sáb 23 mai', cal: 1788, target: 2100, pct: 85, weight:'76.7 kg'},
          {d:'Sex 22 mai', cal: 2015, target: 2100, pct: 96, weight:'76.8 kg'},
        ].map((day,i)=>(
          <div key={i} className="obs-glass" style={{padding: 14, marginBottom: 8, display:'flex', alignItems:'center', gap: 12}}>
            <div>
              <div style={{fontSize: 13, fontWeight: 500}}>{day.d}</div>
              <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>{day.weight}</div>
            </div>
            <div style={{flex: 1, height: 4, background:'rgba(244,241,236,0.06)', borderRadius: 2, position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(day.pct, 100)}%`, background: day.over?'linear-gradient(90deg, #c4e88f, #e0734a)':'#f5c14d', borderRadius: 2}}/>
              <div style={{position:'absolute', left: '100%', top: -2, bottom: -2, width: 1, background:'rgba(244,241,236,0.2)'}}/>
            </div>
            <div className="obs-statbar">
              <span style={{fontSize: 13, fontWeight: 500, color: day.over?'#e0734a':'#f4f1ec'}}>{day.cal}</span>
              <span style={{fontSize: 10, color:'rgba(244,241,236,0.4)'}}>kcal</span>
            </div>
          </div>
        ))}
      </div>

      <ObsBottomNav active="history"/>
    </div>
  );
};

// =========================================================
// ADMIN
// =========================================================

const ObsSidebar = ({active}) => {
  const items = [
    {k:'overview', label:'Visão Geral'},
    {k:'users', label:'Usuários'},
    {k:'professionals', label:'Profissionais'},
    {k:'plans', label:'Planos'},
    {k:'billing', label:'Faturamento'},
    {k:'patients', label:'Pacientes'},
    {k:'creds', label:'Credenciais'},
  ];
  return (
    <aside className="obs-sidebar">
      <div style={{display:'flex', alignItems:'center', gap: 10, padding: '4px 8px 18px', marginBottom: 12, borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div style={{width: 30, height: 30, borderRadius: 9, background:'linear-gradient(135deg, #f5c14d, #e0734a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#1a1408'}}>{Ico.shield}</div>
        <div>
          <div style={{fontSize: 14, fontWeight: 600, letterSpacing:'-0.01em'}}>Nutrir</div>
          <div className="obs-eyebrow" style={{fontSize: 9}}>Admin · v3.1</div>
        </div>
      </div>
      {items.map(it=>(
        <div key={it.k} className={`obs-sidenav-item ${active===it.k?'active':''}`}>
          <span style={{width: 4, height: 4, borderRadius: '50%', background: active===it.k?'#f5c14d':'rgba(244,241,236,0.2)'}}/>
          {it.label}
        </div>
      ))}
      <div style={{flex: 1}}/>
      <div className="obs-glass" style={{padding: 12, marginTop: 12}}>
        <div className="obs-eyebrow" style={{marginBottom: 6}}>Operador</div>
        <div style={{fontSize: 12, fontWeight: 500}}>admin@nutrir.online</div>
        <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 4}}>SUPERADMIN</div>
      </div>
    </aside>
  );
};

const ObsidianAdminOverview = () => (
  <div className="obs-admin">
    <ObsSidebar active="overview"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div>
          <div className="obs-eyebrow">Visão geral · Atualizado 12:47</div>
          <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 4}}>Painel de Controle</h1>
        </div>
        <div style={{display:'flex', gap: 8, alignItems:'center'}}>
          <div className="obs-glass" style={{padding: '8px 12px', display:'flex', alignItems:'center', gap: 8, fontSize: 12, color:'rgba(244,241,236,0.6)'}}>
            {Ico.search} Buscar usuário, profissional…
          </div>
          <button className="obs-btn-primary">+ Novo Plano</button>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 32px'}}>
        {/* Stat tiles */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14, marginBottom: 24}}>
          {[
            {l:'Usuários totais', v:'4.218', d:'+12.4%', dColor:'#c4e88f', sub:'desde abril'},
            {l:'Premium ativos', v:'1.084', d:'+8.7%', dColor:'#c4e88f', sub:'25.7% do total'},
            {l:'Profissionais', v:'28', d:'+3', dColor:'#c4e88f', sub:'novos esta semana'},
            {l:'MRR estimado', v:'R$ 38.4k', d:'+4.1%', dColor:'#c4e88f', sub:'± R$ 1.2k'},
          ].map(s=>(
            <div key={s.l} className="obs-glass" style={{padding: 18}}>
              <div className="obs-eyebrow" style={{marginBottom: 14}}>{s.l}</div>
              <div className="obs-num-xl" style={{fontSize: 30}}>{s.v}</div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop: 12, paddingTop: 10, borderTop:'1px solid rgba(244,241,236,0.06)'}}>
                <span className="obs-mono" style={{fontSize: 11, color: s.dColor}}>{s.d}</span>
                <span className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.4)'}}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 14, marginBottom: 24}}>
          {/* Activity chart */}
          <div className="obs-glass" style={{padding: 22}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 18}}>
              <div>
                <div className="obs-eyebrow">Refeições registradas · 30 dias</div>
                <div className="obs-num-xl" style={{fontSize: 26, marginTop: 6}}>184.522</div>
              </div>
              <div style={{display:'flex', gap: 4}}>
                {['7d','30d','90d','12m'].map((p,i)=>(
                  <button key={p} style={{padding:'5px 10px', background: i===1?'rgba(245,193,77,0.12)':'transparent', border:'1px solid rgba(244,241,236,0.06)', borderRadius: 6, color: i===1?'#f5c14d':'rgba(244,241,236,0.5)', fontSize: 11, fontFamily:'Geist Mono', cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <svg width="100%" height="200" viewBox="0 0 600 200">
              <defs>
                <linearGradient id="obsAdmFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5c14d" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#f5c14d" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* Grid */}
              {[0,1,2,3,4].map(i=>(
                <line key={i} x1="0" x2="600" y1={40*i+20} y2={40*i+20} stroke="rgba(244,241,236,0.04)"/>
              ))}
              <path d="M0,140 C40,120 80,135 120,110 C160,90 200,105 240,80 C280,60 320,85 360,65 C400,50 440,75 480,55 C520,40 560,60 600,30 L600,200 L0,200 Z" fill="url(#obsAdmFill)"/>
              <path d="M0,140 C40,120 80,135 120,110 C160,90 200,105 240,80 C280,60 320,85 360,65 C400,50 440,75 480,55 C520,40 560,60 600,30" fill="none" stroke="#f5c14d" strokeWidth="2"/>
              {/* Secondary line */}
              <path d="M0,160 C50,150 100,155 150,140 C200,125 250,135 300,120 C350,105 400,115 450,100 C500,85 550,95 600,80" fill="none" stroke="#8da7c4" strokeWidth="1.5" strokeDasharray="3 4"/>
            </svg>
            <div style={{display:'flex', gap: 18, marginTop: 8}}>
              <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 11, color:'rgba(244,241,236,0.6)'}}>
                <span style={{width: 8, height: 2, background:'#f5c14d'}}/>
                Refeições
              </div>
              <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 11, color:'rgba(244,241,236,0.6)'}}>
                <span style={{width: 8, height: 2, background:'#8da7c4', borderTop:'1px dashed #8da7c4'}}/>
                Usuários ativos
              </div>
            </div>
          </div>

          {/* Plan split */}
          <div className="obs-glass" style={{padding: 22}}>
            <div className="obs-eyebrow" style={{marginBottom: 14}}>Distribuição de planos</div>
            {[
              {l:'Premium Anual', v:642, p: 59, c:'#f5c14d'},
              {l:'Premium Mensal', v:442, p: 41, c:'#e0734a'},
              {l:'Trial (7d)', v:312, p: 100, c:'#8da7c4'},
              {l:'Free', v:2822, p: 100, c:'rgba(244,241,236,0.3)'},
            ].map(p=>(
              <div key={p.l} style={{marginBottom: 14}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6}}>
                  <span style={{fontSize: 12, color:'rgba(244,241,236,0.8)'}}>{p.l}</span>
                  <span className="obs-mono" style={{fontSize: 12}}>{p.v}</span>
                </div>
                <div style={{height: 3, background:'rgba(244,241,236,0.06)', borderRadius: 2, overflow:'hidden'}}>
                  <div style={{height:'100%', width: `${p.p}%`, background: p.c}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity table */}
        <div className="obs-glass" style={{padding: 0, overflow:'hidden'}}>
          <div style={{padding: '18px 22px', borderBottom:'1px solid rgba(244,241,236,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{fontSize: 14, fontWeight: 500, letterSpacing:'-0.01em'}}>Atividade recente</h3>
            <button className="obs-mono" style={{background:'none', border:'none', color:'rgba(244,241,236,0.5)', fontSize: 10, cursor:'pointer', letterSpacing:'0.08em'}}>VER TUDO →</button>
          </div>
          <table className="obs-table">
            <thead><tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Evento</th>
              <th>Profissional</th>
              <th style={{textAlign:'right'}}>Valor</th>
            </tr></thead>
            <tbody>
              {[
                {t:'há 2 min', u:'Camila Rocha', e:'Upgrade Premium Anual', p:'Dra. Marina Vidal', v:'R$ 199,90', vc:'#c4e88f'},
                {t:'há 14 min', u:'Roberto Lemos', e:'Vinculação a profissional', p:'PT Diego Santos', v:'—', vc:'rgba(244,241,236,0.4)'},
                {t:'há 38 min', u:'Anna Beatriz', e:'Foto escaneada (IA)', p:'—', v:'542 kcal', vc:'#f5c14d'},
                {t:'há 1h', u:'Lucas Tavares', e:'Trial expirou', p:'—', v:'—', vc:'#e0734a'},
                {t:'há 1h 23m', u:'Marcela Ito', e:'Upgrade Premium Mensal', p:'Dra. Marina Vidal', v:'R$ 29,90', vc:'#c4e88f'},
              ].map((r,i)=>(
                <tr key={i}>
                  <td className="obs-mono" style={{color:'rgba(244,241,236,0.4)', fontSize: 11}}>{r.t}</td>
                  <td><div style={{display:'flex', alignItems:'center', gap: 10}}>
                    <div style={{width: 26, height: 26, borderRadius:'50%', background:'linear-gradient(135deg, #f5c14d44, #e0734a44)', border:'1px solid rgba(245,193,77,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 10, fontWeight: 500}}>{r.u.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
                    {r.u}
                  </div></td>
                  <td style={{color:'rgba(244,241,236,0.8)'}}>{r.e}</td>
                  <td style={{color:'rgba(244,241,236,0.6)', fontSize: 12}}>{r.p}</td>
                  <td className="obs-mono" style={{textAlign:'right', color: r.vc, fontWeight: 500}}>{r.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

const ObsidianAdminPros = () => (
  <div className="obs-admin">
    <ObsSidebar active="professionals"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div>
          <div className="obs-eyebrow">Equipe clínica · 28 cadastrados</div>
          <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 4}}>Profissionais de Saúde</h1>
        </div>
        <button className="obs-btn-primary">+ Cadastrar Profissional</button>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 32px'}}>
        {/* Filter chips */}
        <div style={{display:'flex', gap: 8, marginBottom: 18}}>
          {['Todos · 28', 'Nutricionistas · 18', 'Personal Trainers · 10', 'Comissão > 15%'].map((c,i)=>(
            <button key={c} style={{padding:'7px 12px', borderRadius: 999, background: i===0?'rgba(245,193,77,0.12)':'rgba(244,241,236,0.03)', border: i===0?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(244,241,236,0.08)', color: i===0?'#f5c14d':'rgba(244,241,236,0.6)', fontSize: 11, fontWeight: 500, cursor:'pointer'}}>{c}</button>
          ))}
        </div>

        {/* Pro cards grid */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14, marginBottom: 18}}>
          {[
            {n:'Dra. Marina Vidal', r:'Nutricionista', e:'marina@nutrir.online', com: 15, pat: 42, mrr: 'R$ 6.2k', c:'#f5c14d'},
            {n:'Dr. Carlos Nutri', r:'Nutricionista', e:'carlos@nutrir.online', com: 12, pat: 28, mrr: 'R$ 3.4k', c:'#f5c14d'},
            {n:'PT Diego Santos', r:'Personal Trainer', e:'diego@nutrir.online', com: 18, pat: 36, mrr: 'R$ 4.8k', c:'#e0734a'},
          ].map((p,i)=>(
            <div key={i} className="obs-glass" style={{padding: 18}}>
              <div style={{display:'flex', gap: 12, alignItems:'center', marginBottom: 14}}>
                <div style={{width: 44, height: 44, borderRadius: 12, background:`linear-gradient(135deg, ${p.c}44, ${p.c}22)`, border:`1px solid ${p.c}66`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 14, fontWeight: 600, color: p.c}}>
                  {p.n.replace(/Dra?\.|PT/g,'').trim().split(' ').map(s=>s[0]).slice(0,2).join('')}
                </div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.n}</div>
                  <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>{p.e}</div>
                </div>
              </div>
              <div className="obs-pill" style={{color: p.c, marginBottom: 14}}>{p.r}</div>
              <div style={{display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 6, paddingTop: 14, borderTop:'1px solid rgba(244,241,236,0.06)'}}>
                <div>
                  <div className="obs-eyebrow" style={{fontSize: 8, marginBottom: 4}}>Pacientes</div>
                  <div className="obs-mono" style={{fontSize: 14, fontWeight: 500}}>{p.pat}</div>
                </div>
                <div>
                  <div className="obs-eyebrow" style={{fontSize: 8, marginBottom: 4}}>Comissão</div>
                  <div className="obs-mono" style={{fontSize: 14, fontWeight: 500, color:'#c4e88f'}}>{p.com}%</div>
                </div>
                <div>
                  <div className="obs-eyebrow" style={{fontSize: 8, marginBottom: 4}}>MRR</div>
                  <div className="obs-mono" style={{fontSize: 14, fontWeight: 500}}>{p.mrr}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div className="obs-glass" style={{padding: 0, overflow:'hidden'}}>
          <div style={{padding: '14px 22px', borderBottom:'1px solid rgba(244,241,236,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{fontSize: 13, fontWeight: 500}}>Todos os profissionais</h3>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', letterSpacing:'0.08em'}}>28 RESULTADOS</div>
          </div>
          <table className="obs-table">
            <thead><tr>
              <th>Profissional</th>
              <th>Cargo</th>
              <th>Pacientes</th>
              <th>Comissão</th>
              <th>Receita gerada</th>
              <th>Status</th>
              <th style={{textAlign:'right'}}>Ações</th>
            </tr></thead>
            <tbody>
              {[
                {n:'Dra. Marina Vidal', r:'Nutricionista', p:42, com:'15%', rev:'R$ 6.234,50', s:'Ativo', sc:'#c4e88f'},
                {n:'Dr. Carlos Nutri', r:'Nutricionista', p:28, com:'12%', rev:'R$ 3.412,00', s:'Ativo', sc:'#c4e88f'},
                {n:'PT Diego Santos', r:'Personal Trainer', p:36, com:'18%', rev:'R$ 4.876,20', s:'Ativo', sc:'#c4e88f'},
                {n:'PT Aline Borges', r:'Personal Trainer', p:14, com:'10%', rev:'R$ 1.245,80', s:'Pausado', sc:'#e0734a'},
                {n:'Dra. Renata Lopes', r:'Nutricionista', p:31, com:'14%', rev:'R$ 3.987,40', s:'Ativo', sc:'#c4e88f'},
              ].map((r,i)=>(
                <tr key={i}>
                  <td><div style={{display:'flex', alignItems:'center', gap: 10}}>
                    <div style={{width: 28, height: 28, borderRadius: 8, background:'linear-gradient(135deg, #f5c14d33, #e0734a33)', border:'1px solid rgba(245,193,77,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 500, color:'#f5c14d'}}>{r.n.replace(/Dra?\.|PT/g,'').trim().split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                    {r.n}
                  </div></td>
                  <td style={{color:'rgba(244,241,236,0.7)'}}>{r.r}</td>
                  <td className="obs-mono">{r.p}</td>
                  <td className="obs-mono" style={{color:'#c4e88f'}}>{r.com}</td>
                  <td className="obs-mono">{r.rev}</td>
                  <td><span className="obs-pill" style={{color: r.sc}}>● {r.s}</span></td>
                  <td style={{textAlign:'right', color:'rgba(244,241,236,0.5)'}}>{Ico.more}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

const ObsidianAdminPatient = () => (
  <div className="obs-admin">
    <ObsSidebar active="patients"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div style={{display:'flex', alignItems:'center', gap: 14}}>
          <button className="obs-btn-ghost" style={{padding: '8px 12px'}}>{Ico.back} Pacientes</button>
          <div style={{width: 1, height: 24, background:'rgba(244,241,236,0.1)'}}/>
          <div style={{display:'flex', alignItems:'center', gap: 12}}>
            <div style={{width: 44, height: 44, borderRadius: 12, background:'linear-gradient(135deg, #f5c14d44, #e0734a44)', border:'1px solid rgba(245,193,77,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 14, fontWeight: 600, color:'#f5c14d'}}>CR</div>
            <div>
              <div style={{fontSize: 17, fontWeight: 500, letterSpacing:'-0.01em'}}>Camila Rocha</div>
              <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>camila@email.com · ID #4218 · vinculada há 28d</div>
            </div>
          </div>
        </div>
        <div style={{display:'flex', gap: 8}}>
          <button className="obs-btn-ghost">Exportar relatório</button>
          <button className="obs-btn-primary">+ Nova Prescrição</button>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 32px', display:'grid', gridTemplateColumns:'320px 1fr', gap: 18}}>
        {/* LEFT: profile + prescription */}
        <div style={{display:'flex', flexDirection:'column', gap: 14}}>
          <div className="obs-glass" style={{padding: 20}}>
            <div className="obs-eyebrow" style={{marginBottom: 14}}>Perfil clínico</div>
            {[
              {l:'Idade', v:'29 anos'},
              {l:'Sexo', v:'Feminino'},
              {l:'Altura', v:'168 cm'},
              {l:'Peso atual', v:'68.4 kg', hl:true},
              {l:'Peso inicial', v:'72.0 kg'},
              {l:'Meta', v:'62.0 kg'},
              {l:'TMB', v:'1.428 kcal'},
              {l:'Meta calórica', v:'1.700 kcal', hl: true},
            ].map((r,i)=>(
              <div key={i} style={{display:'flex', justifyContent:'space-between', padding: '8px 0', borderBottom: i<7?'1px solid rgba(244,241,236,0.04)':'none', fontSize: 12}}>
                <span style={{color:'rgba(244,241,236,0.5)'}}>{r.l}</span>
                <span className="obs-mono" style={{fontWeight: 500, color: r.hl?'#f5c14d':'#f4f1ec'}}>{r.v}</span>
              </div>
            ))}
          </div>

          <div className="obs-glass" style={{padding: 20}}>
            <div className="obs-eyebrow" style={{marginBottom: 12}}>Macros prescritos</div>
            <div style={{display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10, marginBottom: 14}}>
              {[{l:'P', v:'130g', c:'#ff8e7e'},{l:'C', v:'170g', c:'#c4e88f'},{l:'G', v:'58g', c:'#f5c14d'}].map(m=>(
                <div key={m.l} style={{padding: 10, borderRadius: 10, background:'rgba(244,241,236,0.03)', border:'1px solid rgba(244,241,236,0.05)', textAlign:'center'}}>
                  <div className="obs-mono" style={{fontSize: 16, fontWeight: 500, color: m.c}}>{m.v}</div>
                  <div className="obs-mono" style={{fontSize: 9, color:'rgba(244,241,236,0.5)', marginTop: 2}}>{m.l}</div>
                </div>
              ))}
            </div>
            <button className="obs-btn-ghost" style={{width:'100%', fontSize: 12, padding: '10px'}}>Ajustar metas</button>
          </div>

          <div className="obs-glass" style={{padding: 20}}>
            <div className="obs-eyebrow" style={{marginBottom: 10}}>Nova prescrição / orientação</div>
            <textarea placeholder="Escreva o plano alimentar, treino ou orientações..." style={{width:'100%', minHeight: 100, background:'rgba(244,241,236,0.03)', border:'1px solid rgba(244,241,236,0.08)', borderRadius: 10, padding: 12, color:'#f4f1ec', fontSize: 12, fontFamily:'Geist', resize:'none', outline:'none'}}/>
            <button className="obs-btn-primary" style={{width:'100%', marginTop: 12, justifyContent:'center'}}>Enviar para o app</button>
          </div>
        </div>

        {/* RIGHT: progress + meals */}
        <div style={{display:'flex', flexDirection:'column', gap: 14, minWidth: 0}}>
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap: 14}}>
            <div className="obs-glass" style={{padding: 20}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12}}>
                <div className="obs-eyebrow">Evolução de peso · 4 semanas</div>
                <div className="obs-mono" style={{fontSize: 12, color:'#c4e88f'}}>−3.6 kg ✓</div>
              </div>
              <svg width="100%" height="100" viewBox="0 0 400 100">
                <defs><linearGradient id="obsPatFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5c14d" stopOpacity="0.3"/><stop offset="100%" stopColor="#f5c14d" stopOpacity="0"/></linearGradient></defs>
                {[0,1,2,3].map(i=>(<line key={i} x1="0" x2="400" y1={20+i*20} y2={20+i*20} stroke="rgba(244,241,236,0.04)"/>))}
                <path d="M0,15 C40,18 80,30 120,28 C160,26 200,40 240,45 C280,50 320,62 360,70 L400,80 L400,100 L0,100 Z" fill="url(#obsPatFill)"/>
                <path d="M0,15 C40,18 80,30 120,28 C160,26 200,40 240,45 C280,50 320,62 360,70 L400,80" fill="none" stroke="#f5c14d" strokeWidth="2"/>
                {[0, 100, 200, 300, 400].map((x,i)=>(<circle key={i} cx={x} cy={[15,30,40,60,80][i]} r="3" fill="#f5c14d"/>))}
              </svg>
              <div style={{display:'flex', justifyContent:'space-between', marginTop: 8}} className="obs-mono">
                <span style={{fontSize: 10, color:'rgba(244,241,236,0.4)'}}>72.0 kg</span>
                <span style={{fontSize: 10, color:'#f5c14d'}}>68.4 kg</span>
              </div>
            </div>

            <div className="obs-glass" style={{padding: 18}}>
              <div className="obs-eyebrow" style={{marginBottom: 10}}>Hidratação hoje</div>
              <div className="obs-num-xl" style={{fontSize: 26}}>1.8<span style={{fontSize: 12, color:'rgba(244,241,236,0.4)', marginLeft: 4}}>L</span></div>
              <div style={{height: 3, background:'rgba(244,241,236,0.06)', borderRadius: 2, marginTop: 12, overflow:'hidden'}}>
                <div style={{height:'100%', width:'72%', background:'#8da7c4'}}/>
              </div>
              <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 6}}>72% de 2.5L</div>
            </div>

            <div className="obs-glass" style={{padding: 18}}>
              <div className="obs-eyebrow" style={{marginBottom: 10}}>Jejum 16:8</div>
              <div className="obs-num-xl" style={{fontSize: 26, color:'#f5c14d'}}>12h28</div>
              <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 12}}>iniciou 20:14 · ontem</div>
              <div className="obs-mono" style={{fontSize: 10, color:'#c4e88f', marginTop: 4}}>● em curso</div>
            </div>
          </div>

          <div className="obs-glass" style={{padding: 0, overflow:'hidden'}}>
            <div style={{padding: '14px 22px', borderBottom:'1px solid rgba(244,241,236,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{fontSize: 13, fontWeight: 500}}>Diário alimentar · últimos 3 dias</h3>
              <div style={{display:'flex', gap: 4}}>
                {['Hoje','Ontem','-2d','-3d','Semana'].map((p,i)=>(
                  <button key={p} style={{padding:'4px 10px', background: i===0?'rgba(245,193,77,0.12)':'transparent', border:'1px solid rgba(244,241,236,0.06)', borderRadius: 6, color: i===0?'#f5c14d':'rgba(244,241,236,0.5)', fontSize: 10, fontFamily:'Geist Mono', cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <table className="obs-table">
              <thead><tr>
                <th>Hora</th>
                <th>Refeição</th>
                <th>Itens</th>
                <th style={{textAlign:'right'}}>kcal</th>
                <th style={{textAlign:'right'}}>P</th>
                <th style={{textAlign:'right'}}>C</th>
                <th style={{textAlign:'right'}}>G</th>
                <th style={{textAlign:'right'}}>Fonte</th>
              </tr></thead>
              <tbody>
                {[
                  {h:'08:14', n:'Café da manhã', it:'Iogurte grego, granola, banana', k:340, p:18, c:42, f:9, src:'Manual'},
                  {h:'10:30', n:'Snack', it:'Whey + maçã', k:180, p:24, c:18, f:2, src:'Manual'},
                  {h:'12:48', n:'Almoço', it:'Arroz integral, frango, brócolis, azeite', k:542, p:38, c:50, f:18, src:'IA Scan'},
                  {h:'15:20', n:'Lanche', it:'Castanhas + chá verde', k:160, p:4, c:6, f:14, src:'Manual'},
                  {h:'19:40', n:'Jantar', it:'Salmão grelhado, salada, batata doce', k:480, p:36, c:38, f:18, src:'IA Scan'},
                ].map((r,i)=>(
                  <tr key={i}>
                    <td className="obs-mono" style={{color:'rgba(244,241,236,0.5)'}}>{r.h}</td>
                    <td style={{fontWeight: 500}}>{r.n}</td>
                    <td style={{color:'rgba(244,241,236,0.7)', fontSize: 12}}>{r.it}</td>
                    <td className="obs-mono" style={{textAlign:'right', fontWeight: 500}}>{r.k}</td>
                    <td className="obs-mono" style={{textAlign:'right', color:'#ff8e7e'}}>{r.p}</td>
                    <td className="obs-mono" style={{textAlign:'right', color:'#c4e88f'}}>{r.c}</td>
                    <td className="obs-mono" style={{textAlign:'right', color:'#f5c14d'}}>{r.f}</td>
                    <td style={{textAlign:'right'}}><span className="obs-pill" style={{color: r.src==='IA Scan'?'#f5c14d':'rgba(244,241,236,0.5)', fontSize: 9}}>{r.src}</span></td>
                  </tr>
                ))}
                <tr style={{background:'rgba(245,193,77,0.04)'}}>
                  <td/>
                  <td style={{fontWeight: 600}}>Total</td>
                  <td/>
                  <td className="obs-mono" style={{textAlign:'right', fontWeight: 600, color:'#f5c14d'}}>1.702</td>
                  <td className="obs-mono" style={{textAlign:'right', fontWeight: 600, color:'#ff8e7e'}}>120</td>
                  <td className="obs-mono" style={{textAlign:'right', fontWeight: 600, color:'#c4e88f'}}>154</td>
                  <td className="obs-mono" style={{textAlign:'right', fontWeight: 600, color:'#f5c14d'}}>61</td>
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

// Export to global scope
Object.assign(window, {
  ObsidianOnboarding, ObsidianDashboard, ObsidianScanner, ObsidianResult,
  ObsidianRecipes, ObsidianHistory,
  ObsidianAdminOverview, ObsidianAdminPros, ObsidianAdminPatient,
});
