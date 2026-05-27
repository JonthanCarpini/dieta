// ============================================================
// SPECTRA — Clinical precision data
// Electric chartreuse + cyan/magenta, solid cards, ruler marks
// ============================================================

(() => {
  if (document.getElementById('spc-styles')) return;
  const s = document.createElement('style');
  s.id = 'spc-styles';
  s.textContent = `
    .spc-root {
      width: 100%; height: 100%;
      background: #07090b;
      color: #e8eef0;
      font-family: 'Inter Tight', system-ui, sans-serif;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .spc-root::before {
      content: ''; position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(212,240,74,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(212,240,74,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: linear-gradient(180deg, black 0%, transparent 60%);
      pointer-events: none;
    }
    .spc-root > * { position: relative; z-index: 1; }
    .spc-mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum' on, 'ss02' on; }

    .spc-scroll { flex: 1; overflow-y: auto; }
    .spc-scroll::-webkit-scrollbar { display: none; }

    .spc-card {
      background: #0c1014;
      border: 1px solid #1a2128;
      border-radius: 4px;
      position: relative;
    }
    .spc-card-accent {
      background: #0c1014;
      border: 1px solid #1a2128;
      border-radius: 4px;
      box-shadow: 0 0 0 1px #1a2128, inset 0 1px 0 rgba(212,240,74,0.04);
      position: relative;
    }
    .spc-card-accent::before {
      content: ''; position: absolute; left: 0; top: 0; width: 3px; height: 16px;
      background: #d4f04a;
    }

    .spc-tick {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #4a5862;
    }

    .spc-eyebrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7a85;
    }

    .spc-num {
      font-family: 'JetBrains Mono', monospace;
      font-feature-settings: 'tnum' on;
      font-weight: 500;
      letter-spacing: -0.02em;
    }

    .spc-bottomnav {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      background: #0c1014;
      border-top: 1px solid #1a2128;
      padding: 8px 0 14px;
    }
    .spc-navitem {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 4px;
      background: none; border: none;
      color: #4a5862;
      font-size: 9px;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      position: relative;
    }
    .spc-navitem.active { color: #d4f04a; }
    .spc-navitem.active::before {
      content: ''; position: absolute; top: 0; left: 25%; right: 25%; height: 2px; background: #d4f04a;
    }

    /* Admin */
    .spc-admin {
      width: 100%; height: 100%;
      background: #07090b;
      color: #e8eef0;
      font-family: 'Inter Tight', sans-serif;
      display: grid;
      grid-template-columns: 64px 1fr;
      overflow: hidden;
    }
    .spc-sidebar {
      background: #0c1014;
      border-right: 1px solid #1a2128;
      display: flex; flex-direction: column;
      padding: 18px 0;
      align-items: center;
      gap: 6px;
    }
    .spc-side-btn {
      width: 40px; height: 40px;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      color: #4a5862;
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;
      position: relative;
    }
    .spc-side-btn.active {
      color: #d4f04a;
      background: rgba(212,240,74,0.06);
      border-color: rgba(212,240,74,0.2);
    }
    .spc-side-btn.active::before {
      content:''; position:absolute; left: -10px; top: 6px; bottom: 6px; width: 2px; background:#d4f04a;
    }

    .spc-table { width: 100%; border-collapse: collapse; }
    .spc-table th {
      text-align: left;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6b7a85;
      padding: 10px 14px;
      border-bottom: 1px solid #1a2128;
      background: #0a0d10;
    }
    .spc-table td {
      padding: 12px 14px;
      font-size: 13px;
      border-bottom: 1px solid #14191e;
    }
    .spc-table tr:hover td { background: rgba(212,240,74,0.02); }

    .spc-btn-primary {
      background: #d4f04a;
      color: #0a0d10;
      border: none;
      padding: 10px 16px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .spc-btn-ghost {
      background: #0c1014;
      color: #e8eef0;
      border: 1px solid #1a2128;
      padding: 10px 16px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .spc-tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 7px;
      border-radius: 2px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: rgba(212,240,74,0.08);
      color: #d4f04a;
    }
  `;
  document.head.appendChild(s);
})();

// Colors
const SPC = {
  prim: '#d4f04a',     // chartreuse
  prot: '#ff4dcb',     // magenta
  carb: '#5cfbff',     // cyan
  fat: '#ffb547',      // amber
  bg: '#07090b',
  surf: '#0c1014',
  border: '#1a2128',
  muted: '#6b7a85',
  text: '#e8eef0',
};

const IcoS = {
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  camera: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l1.5 5L19 9.5l-5 1.5L12.5 16 11 11l-5-1.5L11 8z"/></svg>,
  drop: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12z"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  back: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>,
  grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  salad: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11h18a9 9 0 1 1-18 0z"/></svg>,
  timer: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 3h6"/></svg>,
  cal: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5 9-11"/></svg>,
  more: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  zap: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  trend: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-8M21 7h-5M21 7v5"/></svg>,
};

const SpcBottomNav = ({active}) => (
  <nav className="spc-bottomnav">
    {[
      {k:'diary', l:'DIÁRIO', i: IcoS.grid},
      {k:'recipes', l:'IA', i: IcoS.salad},
      {k:'fast', l:'JEJUM', i: IcoS.timer},
      {k:'hist', l:'LOG', i: IcoS.cal},
      {k:'prof', l:'PERFIL', i: IcoS.user},
    ].map(it=>(
      <button key={it.k} className={`spc-navitem ${active===it.k?'active':''}`}>
        {it.i}
        <span>{it.l}</span>
      </button>
    ))}
  </nav>
);

// --- 1. ONBOARDING ---
const SpectraOnboarding = () => (
  <div className="spc-root" style={{padding: '24px 22px 0'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
      <div className="spc-tick">SETUP / 04 / 06</div>
      <div className="spc-mono" style={{fontSize: 10, color: SPC.prim}}>+1.5 KCAL/MIN</div>
    </div>

    {/* Progress bar w/ ticks */}
    <div style={{display:'flex', gap: 3, marginBottom: 24}}>
      {[1,2,3,4,5,6].map(i=>(
        <div key={i} style={{flex: 1, height: 3, background: i<=4? SPC.prim : SPC.border, position:'relative'}}>
          {i===4 && <div style={{position:'absolute', right: -3, top: -2, width: 6, height: 6, background: SPC.prim, borderRadius:1, boxShadow:`0 0 10px ${SPC.prim}`}}/>}
        </div>
      ))}
    </div>

    <h1 style={{fontSize: 28, fontWeight: 600, letterSpacing:'-0.02em', lineHeight: 1.1, marginBottom: 4}}>
      Calibrar parâmetros<br/>
      <span style={{color: SPC.muted, fontWeight: 400}}>metabólicos.</span>
    </h1>
    <div className="spc-mono" style={{fontSize: 11, color: SPC.muted, marginBottom: 22}}>
      MIFFLIN-ST_JEOR · TDEE × 1.55
    </div>

    <div className="spc-scroll" style={{marginRight: -22, paddingRight: 22}}>
      {/* Weight target */}
      <div className="spc-card-accent" style={{padding: 18, marginBottom: 12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 16, paddingLeft: 8}}>
          <span className="spc-eyebrow">PESO_OBJETIVO</span>
          <div className="spc-mono" style={{display:'flex', alignItems:'baseline', gap: 4}}>
            <span style={{fontSize: 26, fontWeight: 600, color: SPC.prim}}>72.0</span>
            <span style={{fontSize: 11, color: SPC.muted}}>KG</span>
          </div>
        </div>
        {/* Ruler */}
        <div style={{position:'relative', height: 50, paddingLeft: 8}}>
          <div style={{position:'absolute', left:8, right:0, top: 22, height: 1, background: SPC.border}}/>
          {Array.from({length:61}).map((_,i)=>{
            const isMajor = i % 10 === 0;
            const isMid = i % 5 === 0;
            const h = isMajor ? 14 : (isMid ? 8 : 4);
            return <div key={i} style={{position:'absolute', left: `calc(8px + ${(i/60)*100}%)`, top: 22-h, width: 1, height: h, background: isMajor ? SPC.prim : SPC.muted, opacity: isMajor ? 1 : 0.4}}/>;
          })}
          {/* Marker */}
          <div style={{position:'absolute', left: `calc(8px + 53%)`, top: 0, width: 1, height: 30, background: SPC.prim, boxShadow:`0 0 10px ${SPC.prim}`}}/>
          <div style={{position:'absolute', left: `calc(8px + 53%)`, top: -2, transform:'translateX(-50%)', width: 0, height: 0, borderLeft:'4px solid transparent', borderRight:'4px solid transparent', borderTop: `5px solid ${SPC.prim}`}}/>
          <div className="spc-mono" style={{position:'absolute', left: 8, top: 30, fontSize: 9, color: SPC.muted}}>60</div>
          <div className="spc-mono" style={{position:'absolute', right: 0, top: 30, fontSize: 9, color: SPC.muted}}>120</div>
        </div>
      </div>

      {/* Pace segments */}
      <div className="spc-card-accent" style={{padding: 18, marginBottom: 12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12, paddingLeft: 8}}>
          <span className="spc-eyebrow">DÉFICIT_SEMANAL</span>
          <div className="spc-mono" style={{display:'flex', alignItems:'baseline', gap: 4}}>
            <span style={{fontSize: 22, fontWeight: 600, color: SPC.prim}}>−0.50</span>
            <span style={{fontSize: 10, color: SPC.muted}}>KG/W</span>
          </div>
        </div>
        <div style={{display:'flex', gap: 2, paddingLeft: 8}}>
          {[0.2, 0.35, 0.5, 0.75, 1.0, 1.5].map((v, i)=>(
            <div key={i} style={{flex: 1, padding: '10px 4px', background: i===2 ? SPC.prim : 'transparent', color: i===2 ? '#0a0d10' : SPC.muted, border:`1px solid ${i===2 ? SPC.prim : SPC.border}`, textAlign:'center', fontSize: 10, fontFamily:'JetBrains Mono', fontWeight: 600}}>
              {v}
            </div>
          ))}
        </div>
      </div>

      {/* Output computation block */}
      <div className="spc-card" style={{padding: 18, marginBottom: 12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 16}}>
          <span className="spc-eyebrow">COMPUTAÇÃO</span>
          <span className="spc-mono" style={{fontSize: 9, color: SPC.prim}}>● COMPUTE</span>
        </div>
        {/* Equation-style breakdown */}
        <div style={{display:'flex', flexDirection:'column', gap: 8, marginBottom: 16, fontFamily:'JetBrains Mono', fontSize: 11}}>
          {[
            {l:'TMB', v:'1.628', op:'='},
            {l:'TDEE', v:'2.523', op:'× 1.55'},
            {l:'Δ deficit', v:'−420', op:'−16.6%', c: SPC.prot},
            {l:'TARGET', v:'2.103', op:'KCAL/D', c: SPC.prim, big: true},
          ].map((r,i)=>(
            <div key={i} style={{display:'flex', justifyContent:'space-between', padding: r.big ? '8px 0' : 0, borderTop: r.big ? `1px solid ${SPC.border}` : 'none', marginTop: r.big ? 6 : 0, paddingTop: r.big ? 12 : 0}}>
              <span style={{color: SPC.muted}}>{r.l}</span>
              <div style={{display:'flex', gap: 8, alignItems:'baseline'}}>
                <span style={{color: SPC.muted, fontSize: 10}}>{r.op}</span>
                <span style={{color: r.c || SPC.text, fontSize: r.big ? 17 : 13, fontWeight: r.big ? 600 : 500}}>{r.v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Macro split */}
      <div className="spc-card" style={{padding: 18, marginBottom: 22}}>
        <div className="spc-eyebrow" style={{marginBottom: 14}}>SPLIT_MACRO · P30 / C45 / G25</div>
        <div style={{display:'flex', gap: 1, marginBottom: 14, height: 32}}>
          <div style={{flex: 30, background: SPC.prot, display:'flex', alignItems:'center', justifyContent:'center'}}><span className="spc-mono" style={{fontSize: 10, color:'#0a0d10', fontWeight: 600}}>30%</span></div>
          <div style={{flex: 45, background: SPC.carb, display:'flex', alignItems:'center', justifyContent:'center'}}><span className="spc-mono" style={{fontSize: 10, color:'#0a0d10', fontWeight: 600}}>45%</span></div>
          <div style={{flex: 25, background: SPC.fat, display:'flex', alignItems:'center', justifyContent:'center'}}><span className="spc-mono" style={{fontSize: 10, color:'#0a0d10', fontWeight: 600}}>25%</span></div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8}}>
          {[
            {l:'PROT', v:'158g', c: SPC.prot},
            {l:'CARB', v:'237g', c: SPC.carb},
            {l:'FAT', v:'58g', c: SPC.fat},
          ].map(m=>(
            <div key={m.l} className="spc-mono" style={{paddingTop: 8, borderTop:`1px solid ${m.c}`, fontSize: 11}}>
              <div style={{color: SPC.muted}}>{m.l}</div>
              <div style={{color: m.c, fontSize: 18, fontWeight: 600, marginTop: 4}}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{display:'flex', gap: 10, padding: '14px 0 22px', borderTop:`1px solid ${SPC.border}`}}>
      <button className="spc-btn-ghost" style={{flex:'0 0 auto'}}>{IcoS.back}</button>
      <button className="spc-btn-primary" style={{flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap: 6}}>EXECUTAR → 05/06</button>
    </div>
  </div>
);

// --- 2. DASHBOARD ---
const SpectraDashboard = () => (
  <div className="spc-root">
    <header style={{padding: '18px 22px 6px', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div>
        <div className="spc-tick">26 MAI · TER · D147</div>
        <h2 style={{fontSize: 22, fontWeight: 600, letterSpacing:'-0.02em', marginTop: 2}}>OPERANTE</h2>
      </div>
      <div style={{display:'flex', alignItems:'center', gap: 6, padding:'5px 10px', border:`1px solid ${SPC.border}`, borderRadius: 2}}>
        <div style={{width: 5, height: 5, background: SPC.prim, borderRadius:'50%', boxShadow:`0 0 6px ${SPC.prim}`}}/>
        <span className="spc-mono" style={{fontSize: 9, letterSpacing:'0.1em', color: SPC.prim}}>SYNC</span>
      </div>
    </header>

    <div className="spc-scroll" style={{padding: '6px 22px 14px'}}>
      {/* Primary readout: big number with breakdown */}
      <div className="spc-card-accent" style={{padding: 18, marginBottom: 12}}>
        <div style={{paddingLeft: 8}}>
          <div className="spc-eyebrow" style={{marginBottom: 4}}>KCAL_REMAIN</div>
          <div className="spc-mono" style={{fontSize: 54, fontWeight: 600, letterSpacing:'-0.04em', color: SPC.prim, lineHeight: 1}}>1.218</div>
          <div className="spc-mono" style={{fontSize: 11, color: SPC.muted, marginTop: 4}}>← 882 IN · 2.100 TGT · 0 OUT</div>
        </div>

        {/* Linear progress with tick scale */}
        <div style={{marginTop: 16, paddingLeft: 8}}>
          <div style={{position:'relative', height: 10}}>
            <div style={{position:'absolute', inset: 0, background: SPC.border}}/>
            <div style={{position:'absolute', left: 0, top: 0, bottom: 0, width: '42%', background: `linear-gradient(90deg, ${SPC.prot}, ${SPC.prim})`}}/>
            {/* Ticks */}
            {[0,25,50,75,100].map(p=>(
              <div key={p} style={{position:'absolute', left: `${p}%`, top: -2, width: 1, height: 14, background: SPC.muted, opacity: 0.4}}/>
            ))}
          </div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 4}} className="spc-mono">
            {['0', '525', '1050', '1575', '2100'].map((v,i)=>(
              <span key={i} style={{fontSize: 9, color: i===2? SPC.text : SPC.muted}}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Macros stack — table style */}
      <div className="spc-card" style={{padding: 16, marginBottom: 12}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 12}}>
          <span className="spc-eyebrow">MACRO_TRACK</span>
          <span className="spc-mono" style={{fontSize: 9, color: SPC.muted}}>g · % goal</span>
        </div>
        {[
          {l:'PROT', v: 68, t: 150, c: SPC.prot},
          {l:'CARB', v: 92, t: 220, c: SPC.carb},
          {l:'FAT', v: 28, t: 70, c: SPC.fat},
        ].map((m,i)=>(
          <div key={m.l} style={{marginBottom: i<2 ? 14 : 0}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 6}}>
              <div style={{display:'flex', alignItems:'baseline', gap: 8}}>
                <div style={{width: 8, height: 8, background: m.c}}/>
                <span className="spc-mono" style={{fontSize: 11, color: SPC.muted}}>{m.l}</span>
                <span className="spc-mono" style={{fontSize: 14, fontWeight: 600, color: m.c}}>{m.v}</span>
                <span className="spc-mono" style={{fontSize: 11, color: SPC.muted}}>/ {m.t}g</span>
              </div>
              <span className="spc-mono" style={{fontSize: 11, color: SPC.muted}}>{((m.v/m.t)*100).toFixed(0)}%</span>
            </div>
            <div style={{position:'relative', height: 4, background: SPC.border}}>
              <div style={{position:'absolute', left: 0, top:0, bottom: 0, width: `${(m.v/m.t)*100}%`, background: m.c}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Hydration + Fast row */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginBottom: 12}}>
        <div className="spc-card" style={{padding: 14}}>
          <div className="spc-eyebrow" style={{marginBottom: 8, color: SPC.carb}}>H2O</div>
          <div className="spc-mono" style={{fontSize: 22, fontWeight: 600}}>1.25<span style={{fontSize: 11, color: SPC.muted, marginLeft: 4}}>/2.5L</span></div>
          <div style={{display:'flex', gap: 2, marginTop: 10}}>
            {Array.from({length:10}).map((_,i)=>(
              <div key={i} style={{flex: 1, height: 12, background: i<5 ? SPC.carb : SPC.border}}/>
            ))}
          </div>
        </div>
        <div className="spc-card" style={{padding: 14}}>
          <div className="spc-eyebrow" style={{marginBottom: 8, color: SPC.fat}}>FAST_16:8</div>
          <div className="spc-mono" style={{fontSize: 22, fontWeight: 600, color: SPC.fat}}>12:28<span style={{fontSize: 11, color: SPC.muted, marginLeft: 4}}>/16h</span></div>
          <div className="spc-mono" style={{fontSize: 9, color: SPC.muted, marginTop: 12}}>● ATIVO · 03:32 LEFT</div>
        </div>
      </div>

      {/* Meal log */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8}}>
        <span className="spc-eyebrow">REGISTRO · 02 ENTRIES</span>
        <button className="spc-mono" style={{fontSize: 10, color: SPC.prim, background:'none', border:'none', cursor:'pointer', letterSpacing:'0.1em'}}>[+ NEW]</button>
      </div>

      {[
        {n:'BREAKFAST', i:'IOG.GREGO + GRANOLA', t:'08:14', cal:340, p:18, c:42, f:9, src:'MAN'},
        {n:'LUNCH', i:'ARROZ + FRANGO + BROC.', t:'12:48', cal:542, p:38, c:50, f:18, src:'AI'},
      ].map((m, i)=>(
        <div key={i} className="spc-card" style={{padding: 14, marginBottom: 6, display:'grid', gridTemplateColumns:'auto 1fr auto', gap: 10, alignItems:'center'}}>
          <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, writingMode: 'horizontal-tb'}}>
            <div>{m.t}</div>
            <div style={{color: m.src==='AI'? SPC.prim : SPC.muted}}>{m.src}</div>
          </div>
          <div>
            <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, letterSpacing:'0.1em'}}>{m.n}</div>
            <div style={{fontSize: 13, fontWeight: 500, marginTop: 2}}>{m.i}</div>
            <div style={{display:'flex', gap: 10, marginTop: 4}} className="spc-mono">
              <span style={{fontSize: 9, color: SPC.prot}}>P{m.p}</span>
              <span style={{fontSize: 9, color: SPC.carb}}>C{m.c}</span>
              <span style={{fontSize: 9, color: SPC.fat}}>F{m.f}</span>
            </div>
          </div>
          <div className="spc-mono" style={{textAlign:'right'}}>
            <div style={{fontSize: 18, fontWeight: 600, color: SPC.prim}}>{m.cal}</div>
            <div style={{fontSize: 9, color: SPC.muted}}>KCAL</div>
          </div>
        </div>
      ))}

      <button style={{width:'100%', padding: '14px', background: 'transparent', border: `1px dashed ${SPC.border}`, color: SPC.muted, fontFamily:'JetBrains Mono', fontSize: 11, letterSpacing:'0.12em', cursor:'pointer', marginTop: 6}}>
        [ + LOG ENTRY ]
      </button>
    </div>

    {/* FAB camera */}
    <button style={{position:'absolute', right: 18, bottom: 78, width: 56, height: 56, borderRadius: 2, background: SPC.prim, color:'#0a0d10', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 0 0 4px rgba(212,240,74,0.15)`}}>
      {IcoS.camera}
    </button>

    <SpcBottomNav active="diary"/>
  </div>
);

// --- 3. SCANNER ---
const SpectraScanner = () => (
  <div className="spc-root">
    <header style={{padding: '18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <button style={{width: 32, height: 32, background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.text, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{IcoS.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="spc-tick">GEMINI · 1.5 PRO</div>
        <div style={{fontSize: 13, fontWeight: 600, marginTop: 2}}>VISION_SCAN</div>
      </div>
      <button style={{width: 32, height: 32, background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.text, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{IcoS.more}</button>
    </header>

    <div style={{flex: 1, padding: '4px 18px 14px', display:'flex', flexDirection:'column'}}>
      {/* Viewport */}
      <div style={{flex: 1, position:'relative', overflow:'hidden', border:`1px solid ${SPC.prim}`, boxShadow:`0 0 0 1px ${SPC.border}, 0 0 24px rgba(212,240,74,0.1)`, background:'#04060a'}}>
        {/* Crosshair */}
        <div style={{position:'absolute', left:'50%', top:0, bottom: 0, width: 1, background:`linear-gradient(180deg, transparent, ${SPC.prim}40, transparent)`}}/>
        <div style={{position:'absolute', top:'50%', left:0, right: 0, height: 1, background:`linear-gradient(90deg, transparent, ${SPC.prim}40, transparent)`}}/>

        {/* Dish placeholder */}
        <div style={{position:'absolute', inset: 0, background: 'radial-gradient(50% 40% at 50% 55%, rgba(212,240,74,0.18), transparent 70%)'}}/>
        <div style={{position:'absolute', left:'40%', top:'45%', width: 70, height: 60, borderRadius:'45%', background:'linear-gradient(140deg, #c4985a, #8b6532)', boxShadow:'0 6px 18px rgba(0,0,0,0.5)'}}/>
        <div style={{position:'absolute', left:'53%', top:'55%', width: 60, height: 50, borderRadius:'40%', background:'linear-gradient(140deg, #6b8a3c, #3d5524)'}}/>

        {/* Detection boxes */}
        {[
          {l:'40%', t:'42%', w: 88, h: 70, label: 'FRANGO 0.94', c: SPC.prot},
          {l:'52%', t:'53%', w: 76, h: 60, label: 'BROCOLIS 0.89', c: SPC.carb},
        ].map((b, i)=>(
          <div key={i} style={{position:'absolute', left: b.l, top: b.t, width: b.w, height: b.h, border: `1px solid ${b.c}`, boxShadow:`0 0 12px ${b.c}40`}}>
            <div style={{position:'absolute', top: -16, left: -1, padding:'2px 5px', background: b.c, color:'#0a0d10', fontSize: 8, fontFamily:'JetBrains Mono', fontWeight: 700, letterSpacing:'0.05em'}}>{b.label}</div>
          </div>
        ))}

        {/* Corner brackets */}
        {[
          {top:10, left:10, br:'bottom right'},
          {top:10, right:10, br:'bottom left'},
          {bottom:10, left:10, br:'top right'},
          {bottom:10, right:10, br:'top left'},
        ].map((c,i)=>{
          const s = {position:'absolute', width:16, height:16, border: `2px solid ${SPC.prim}`};
          if (c.top !== undefined) s.top = c.top;
          if (c.bottom !== undefined) s.bottom = c.bottom;
          if (c.left !== undefined) s.left = c.left;
          if (c.right !== undefined) s.right = c.right;
          if (i===0) { s.borderRight='none'; s.borderBottom='none'; }
          if (i===1) { s.borderLeft='none'; s.borderBottom='none'; }
          if (i===2) { s.borderRight='none'; s.borderTop='none'; }
          if (i===3) { s.borderLeft='none'; s.borderTop='none'; }
          return <div key={i} style={s}/>;
        })}

        {/* Telemetry HUD */}
        <div style={{position:'absolute', top: 10, left: 10, right: 10, display:'flex', justifyContent:'space-between'}} className="spc-mono">
          <div style={{fontSize: 9, color: SPC.prim, letterSpacing:'0.1em'}}>
            <div>● REC · 03:42</div>
            <div style={{color: SPC.muted}}>4032×3024 · F2.4</div>
          </div>
          <div style={{textAlign:'right', fontSize: 9, color: SPC.muted, letterSpacing:'0.1em'}}>
            <div>ISO 200 · 1/120s</div>
            <div>WB AUTO</div>
          </div>
        </div>

        <div style={{position:'absolute', bottom: 10, left: 10, right: 10}} className="spc-mono">
          <div style={{fontSize: 9, color: SPC.prim, letterSpacing:'0.1em'}}>● 3 OBJ DETECTED · CONF 0.91</div>
          <div style={{display:'flex', gap: 1, marginTop: 4, height: 3}}>
            <div style={{flex: 91, background: SPC.prim}}/>
            <div style={{flex: 9, background: SPC.border}}/>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 18}}>
        <button style={{padding: '10px 14px', background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.text, fontFamily:'JetBrains Mono', fontSize: 10, letterSpacing:'0.1em', cursor:'pointer'}}>[UPLOAD]</button>

        <button style={{width: 64, height: 64, background: SPC.prim, border:'none', borderRadius: 0, color:'#0a0d10', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 0 0 4px rgba(212,240,74,0.2)`, fontSize: 11, fontFamily:'JetBrains Mono', fontWeight: 700, letterSpacing:'0.1em'}}>
          CAPT
        </button>

        <button style={{padding: '10px 14px', background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.prim, fontFamily:'JetBrains Mono', fontSize: 10, letterSpacing:'0.1em', cursor:'pointer'}}>[AI AUTO]</button>
      </div>

      {/* Probability stack */}
      <div className="spc-card" style={{padding: 14, marginTop: 14}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
          <span className="spc-eyebrow">PRE-CLASSIFICATION</span>
          <span className="spc-mono" style={{fontSize: 9, color: SPC.prim}}>● LIVE</span>
        </div>
        {[
          {l:'FRANGO_GRELHADO', p: 94},
          {l:'BROCOLIS_VAPOR', p: 89},
          {l:'ARROZ_INTEGRAL', p: 78},
        ].map(c=>(
          <div key={c.l} style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 6}}>
            <div className="spc-mono" style={{fontSize: 10, color: SPC.text, flex: 1}}>{c.l}</div>
            <div style={{width: 80, height: 4, background: SPC.border, position:'relative'}}>
              <div style={{position:'absolute', left:0, top:0, bottom:0, width: `${c.p}%`, background: c.p > 85 ? SPC.prim : SPC.fat}}/>
            </div>
            <div className="spc-mono" style={{fontSize: 10, color: c.p > 85 ? SPC.prim : SPC.fat, width: 30, textAlign:'right'}}>{c.p}%</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- 4. RESULT ---
const SpectraResult = () => (
  <div className="spc-root">
    <header style={{padding: '18px 22px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <button style={{width: 32, height: 32, background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.text, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{IcoS.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="spc-tick">SCAN_RESULT · #4218</div>
        <div style={{fontSize: 13, fontWeight: 600, marginTop: 2}}>ANALYSIS</div>
      </div>
      <button style={{width: 32, height: 32, background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.text, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{IcoS.more}</button>
    </header>

    <div className="spc-scroll" style={{padding: '4px 18px 18px'}}>
      {/* Photo */}
      <div style={{height: 160, position:'relative', overflow:'hidden', border:`1px solid ${SPC.border}`, marginBottom: 12, background:'#04060a'}}>
        <div style={{position:'absolute', inset: 0, background: 'radial-gradient(50% 50% at 50% 55%, rgba(212,240,74,0.15), transparent 70%)'}}/>
        <div style={{position:'absolute', left:'38%', top:'44%', width: 70, height: 60, borderRadius:'45%', background:'linear-gradient(140deg, #c4985a, #8b6532)'}}/>
        <div style={{position:'absolute', left:'52%', top:'56%', width: 60, height: 50, borderRadius:'40%', background:'linear-gradient(140deg, #6b8a3c, #3d5524)'}}/>
        {/* Detection annotations */}
        <div style={{position:'absolute', top: 10, left: 10, padding:'3px 7px', background: SPC.prim, color:'#0a0d10', fontSize: 9, fontFamily:'JetBrains Mono', fontWeight: 700, letterSpacing:'0.05em'}}>● ANALYZED · 0.92 CONF</div>
        <div style={{position:'absolute', bottom: 10, right: 10, padding:'3px 7px', background:'rgba(7,9,11,0.8)', border:`1px solid ${SPC.border}`, color: SPC.muted, fontSize: 9, fontFamily:'JetBrains Mono', letterSpacing:'0.05em'}}>26MAI·12:48·ID#4218</div>
      </div>

      {/* Total readout — wireframe spec sheet */}
      <div className="spc-card-accent" style={{padding: 18, marginBottom: 12}}>
        <div style={{paddingLeft: 8, display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 16}}>
          <div>
            <div className="spc-eyebrow">TOTAL · KCAL</div>
            <div className="spc-mono" style={{fontSize: 48, fontWeight: 600, letterSpacing:'-0.04em', color: SPC.prim, lineHeight: 1, marginTop: 4}}>542</div>
            <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, marginTop: 4}}>↑ 25.8% OF DAILY TGT</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="spc-eyebrow">POST · LEFT</div>
            <div className="spc-mono" style={{fontSize: 22, fontWeight: 600, marginTop: 4}}>676</div>
            <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, marginTop: 2}}>KCAL · 32.2%</div>
          </div>
        </div>

        {/* Bar segment */}
        <div style={{paddingLeft: 8}}>
          <div style={{display:'flex', height: 22, gap: 1}}>
            <div style={{flex: 38, background: SPC.prot, position:'relative'}}>
              <span className="spc-mono" style={{position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 9, color:'#0a0d10', fontWeight: 700}}>38g · P</span>
            </div>
            <div style={{flex: 50, background: SPC.carb, position:'relative'}}>
              <span className="spc-mono" style={{position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 9, color:'#0a0d10', fontWeight: 700}}>50g · C</span>
            </div>
            <div style={{flex: 18, background: SPC.fat, position:'relative'}}>
              <span className="spc-mono" style={{position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 9, color:'#0a0d10', fontWeight: 700}}>18g</span>
            </div>
          </div>
        </div>
      </div>

      <div className="spc-eyebrow" style={{marginBottom: 8}}>● ITEMS IDENTIFIED · 04</div>

      {/* Items table */}
      <div className="spc-card" style={{padding: 0, marginBottom: 14}}>
        <table className="spc-table" style={{tableLayout:'fixed'}}>
          <thead><tr>
            <th>ITEM</th>
            <th style={{width: 60, textAlign:'right'}}>QTY</th>
            <th style={{width: 60, textAlign:'right'}}>KCAL</th>
            <th style={{width: 50, textAlign:'right'}}>CONF</th>
          </tr></thead>
          <tbody>
            {[
              {n:'Arroz integral', q:'120g', k: 132, conf: 96, c: SPC.carb},
              {n:'Frango grelhado', q:'140g', k: 230, conf: 94, c: SPC.prot},
              {n:'Brócolis vapor', q:'80g', k: 28, conf: 89, c: SPC.carb},
              {n:'Azeite oliva', q:'1 c.s', k: 120, conf: 78, c: SPC.fat},
            ].map((it,i)=>(
              <tr key={i}>
                <td><div style={{display:'flex', alignItems:'center', gap: 8}}>
                  <div style={{width: 3, height: 14, background: it.c}}/>
                  <span style={{fontSize: 12}}>{it.n}</span>
                </div></td>
                <td className="spc-mono" style={{textAlign:'right', color: SPC.muted, fontSize: 11}}>{it.q}</td>
                <td className="spc-mono" style={{textAlign:'right', fontWeight: 600, fontSize: 12}}>{it.k}</td>
                <td className="spc-mono" style={{textAlign:'right', fontSize: 11, color: it.conf > 85 ? SPC.prim : SPC.fat}}>{it.conf}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button style={{width:'100%', padding: '12px', background:'transparent', border:`1px dashed ${SPC.border}`, color: SPC.muted, fontFamily:'JetBrains Mono', fontSize: 10, letterSpacing:'0.12em', cursor:'pointer', marginBottom: 14}}>
        [ + ADD MANUAL ITEM ]
      </button>

      <div style={{display:'flex', gap: 8}}>
        <button className="spc-btn-ghost" style={{flex: 1}}>DISCARD</button>
        <button className="spc-btn-primary" style={{flex: 2}}>COMMIT → DIARY</button>
      </div>
    </div>
  </div>
);

// --- 5. RECIPES ---
const SpectraRecipes = () => (
  <div className="spc-root">
    <header style={{padding: '18px 22px 4px'}}>
      <div className="spc-tick">CATALOG · 28 SAVED</div>
      <h2 style={{fontSize: 22, fontWeight: 600, letterSpacing:'-0.02em', marginTop: 2}}>RECIPES · IA</h2>
    </header>

    <div style={{padding: '8px 22px 0', display:'flex', gap: 0, borderBottom: `1px solid ${SPC.border}`}}>
      {['CURATED', 'AI · GEN'].map((t,i)=>(
        <button key={t} style={{padding:'10px 16px', background:'transparent', border: 'none', borderBottom: i===1?`2px solid ${SPC.prim}`:'2px solid transparent', color: i===1?SPC.prim:SPC.muted, fontSize: 11, fontFamily:'JetBrains Mono', fontWeight: 600, letterSpacing:'0.12em', cursor:'pointer'}}>{t}</button>
      ))}
    </div>

    <div className="spc-scroll" style={{padding: '14px 22px 14px'}}>
      {/* AI command center */}
      <div className="spc-card-accent" style={{padding: 18, marginBottom: 14, background: 'linear-gradient(135deg, #0c1014, rgba(212,240,74,0.04))'}}>
        <div style={{paddingLeft: 8}}>
          <div style={{display:'flex', alignItems:'center', gap: 6, marginBottom: 10}}>
            <span style={{width: 6, height: 6, background: SPC.prim, borderRadius:'50%', boxShadow:`0 0 8px ${SPC.prim}`}}/>
            <span className="spc-eyebrow" style={{color: SPC.prim}}>GEMINI_ENGINE · READY</span>
          </div>
          <h3 style={{fontSize: 17, fontWeight: 600, letterSpacing:'-0.02em', marginBottom: 12}}>
            Compute meal for residual balance.
          </h3>

          {/* Spec block */}
          <div className="spc-mono" style={{fontSize: 11, fontFamily:'JetBrains Mono', background: 'rgba(7,9,11,0.5)', border: `1px solid ${SPC.border}`, padding: 12, marginBottom: 12}}>
            <div style={{color: SPC.muted}}>$ residual</div>
            <div style={{color: SPC.prim, marginTop: 2}}>  kcal: 1.218</div>
            <div style={{color: SPC.prot}}>  prot: 82g</div>
            <div style={{color: SPC.carb}}>  carb: 128g</div>
            <div style={{color: SPC.fat}}>  fat: 42g</div>
            <div style={{color: SPC.muted, marginTop: 6}}>$ window: lunch | dinner | snack</div>
          </div>

          <div style={{display:'flex', gap: 6}}>
            <button className="spc-btn-primary" style={{flex: 1}}>EXEC // SINGLE</button>
            <button className="spc-btn-ghost" style={{flex: 1}}>EXEC // 7D PLAN</button>
          </div>
        </div>
      </div>

      <div className="spc-eyebrow" style={{marginBottom: 10}}>FILTER · CATEGORIA</div>
      <div style={{display:'flex', gap: 4, marginBottom: 14, overflowX:'auto'}}>
        {['ALL', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((c,i)=>(
          <button key={c} style={{padding:'6px 12px', background: i===0 ? SPC.prim : 'transparent', color: i===0?'#0a0d10':SPC.muted, border:`1px solid ${i===0 ? SPC.prim : SPC.border}`, fontSize: 10, fontFamily:'JetBrains Mono', fontWeight: 600, letterSpacing:'0.1em', cursor:'pointer', whiteSpace:'nowrap'}}>{c}</button>
        ))}
      </div>

      {/* Feature recipe */}
      <div className="spc-card" style={{padding: 0, marginBottom: 10, overflow:'hidden'}}>
        <div style={{height: 120, position:'relative', background:'linear-gradient(135deg, rgba(212,240,74,0.15), rgba(255,77,203,0.1))'}}>
          <div style={{position:'absolute', left:'28%', top:'35%', width: 80, height: 70, borderRadius:'45%', background:'linear-gradient(140deg, #d97a5f, #a14826)'}}/>
          <div style={{position:'absolute', left:'52%', top:'48%', width: 60, height: 52, borderRadius:'45%', background:'linear-gradient(140deg, #c4e88f, #6b8a3c)'}}/>
          <div style={{position:'absolute', top: 10, left: 10, padding:'2px 7px', background:'rgba(7,9,11,0.85)', color: SPC.prim, fontSize: 9, fontFamily:'JetBrains Mono', fontWeight: 700, letterSpacing:'0.1em', border:`1px solid ${SPC.prim}`}}>● AI · MATCH 96%</div>
          <div style={{position:'absolute', top: 10, right: 10, padding:'2px 7px', background:'rgba(7,9,11,0.85)', color: SPC.muted, fontSize: 9, fontFamily:'JetBrains Mono', letterSpacing:'0.1em'}}>RCP_0142</div>
        </div>
        <div style={{padding: 14}}>
          <h3 style={{fontSize: 15, fontWeight: 600, letterSpacing:'-0.01em', marginBottom: 4}}>Salmão grelhado · purê couve-flor</h3>
          <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, marginBottom: 12, letterSpacing:'0.06em'}}>LUNCH · 28MIN · ETA 03:16</div>
          <div style={{display:'flex', gap: 1, height: 4, marginBottom: 8}}>
            <div style={{flex: 35, background: SPC.prot}}/>
            <div style={{flex: 18, background: SPC.carb}}/>
            <div style={{flex: 24, background: SPC.fat}}/>
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}} className="spc-mono">
            <span style={{fontSize: 10, color: SPC.text}}><b style={{color: SPC.prim}}>480</b> KCAL</span>
            <span style={{fontSize: 10, color: SPC.prot}}>42g P</span>
            <span style={{fontSize: 10, color: SPC.carb}}>18g C</span>
            <span style={{fontSize: 10, color: SPC.fat}}>24g F</span>
          </div>
        </div>
      </div>

      {/* List */}
      {[
        {id:'RCP_0188', n:'Bowl quinoa · atum · abacate', t:'LUNCH', m:'18MIN', kcal: 420, p:32, c:38, f:14},
        {id:'RCP_0212', n:'Iogurte grego · granola · berries', t:'BFAST', m:'5MIN', kcal: 280, p:22, c:30, f:9},
        {id:'RCP_0234', n:'Wrap frango · homus', t:'SNACK', m:'12MIN', kcal: 340, p:28, c:34, f:11},
      ].map((r,i)=>(
        <div key={i} className="spc-card" style={{padding: 12, marginBottom: 6, display:'grid', gridTemplateColumns:'auto 1fr auto', gap: 12, alignItems:'center'}}>
          <div style={{width: 44, height: 44, background:'linear-gradient(135deg, rgba(212,240,74,0.1), rgba(255,77,203,0.06))', border:`1px solid ${SPC.border}`, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', left: '30%', top:'30%', width: 22, height: 18, borderRadius:'45%', background:'#a14826'}}/>
            <div style={{position:'absolute', left:'48%', top:'48%', width: 18, height: 16, borderRadius:'45%', background:'#6b8a3c'}}/>
          </div>
          <div style={{minWidth: 0}}>
            <div className="spc-mono" style={{fontSize: 9, color: SPC.muted, marginBottom: 2}}>{r.id} · {r.t} · {r.m}</div>
            <div style={{fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.n}</div>
            <div style={{display:'flex', gap: 8, marginTop: 4}} className="spc-mono">
              <span style={{fontSize: 9, color: SPC.prot}}>P{r.p}</span>
              <span style={{fontSize: 9, color: SPC.carb}}>C{r.c}</span>
              <span style={{fontSize: 9, color: SPC.fat}}>F{r.f}</span>
            </div>
          </div>
          <div className="spc-mono" style={{fontSize: 15, fontWeight: 600, color: SPC.prim}}>{r.kcal}</div>
        </div>
      ))}
    </div>

    <SpcBottomNav active="recipes"/>
  </div>
);

// --- 6. HISTORY ---
const SpectraHistory = () => {
  const days = [62, 78, 92, 55, 88, 71, 83];
  return (
    <div className="spc-root">
      <header style={{padding: '18px 22px 6px'}}>
        <div className="spc-tick">LOG · W21 · MAY 2026</div>
        <h2 style={{fontSize: 22, fontWeight: 600, letterSpacing:'-0.02em', marginTop: 2}}>EVOLUTION</h2>
      </header>

      <div className="spc-scroll" style={{padding: '8px 22px 14px'}}>
        {/* Weekly */}
        <div className="spc-card-accent" style={{padding: 16, marginBottom: 12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 18, paddingLeft: 8}}>
            <div>
              <div className="spc-eyebrow">AVG · 7D</div>
              <div className="spc-mono" style={{fontSize: 30, fontWeight: 600, letterSpacing:'-0.03em', marginTop: 4}}>1.842<span style={{fontSize: 11, color: SPC.muted, marginLeft: 4}}>KCAL</span></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="spc-eyebrow">Δ TGT</div>
              <div className="spc-mono" style={{fontSize: 17, fontWeight: 600, color: SPC.prim, marginTop: 4}}>−258</div>
              <div className="spc-mono" style={{fontSize: 9, color: SPC.prim}}>−12.3%</div>
            </div>
          </div>

          {/* Bars w/ axis */}
          <div style={{position:'relative', height: 110, paddingLeft: 22, marginBottom: 6}}>
            {/* Y axis ticks */}
            {[100, 75, 50, 25, 0].map((y,i)=>(
              <div key={i} style={{position:'absolute', left: 0, right: 0, top: i*25 + 6, display:'flex', alignItems:'center', gap: 6}}>
                <span className="spc-mono" style={{fontSize: 8, color: SPC.muted, width: 16, textAlign:'right'}}>{y}</span>
                <div style={{flex: 1, height: 1, background: SPC.border}}/>
              </div>
            ))}
            <div style={{position:'absolute', left: 22, right: 0, top: 0, bottom: 0, display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 4}}>
              {days.map((d,i)=>(
                <div key={i} style={{flex: 1, height: `${d}%`, background: i===6 ? SPC.prim : SPC.border, border: i===6 ? `1px solid ${SPC.prim}` : `1px solid ${SPC.border}`, position:'relative'}}>
                  {i===6 && <div className="spc-mono" style={{position:'absolute', top: -16, left:'50%', transform:'translateX(-50%)', fontSize: 9, color: SPC.prim, fontWeight: 600}}>83%</div>}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', paddingLeft: 22}}>
            {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d,i)=>(
              <span key={i} className="spc-mono" style={{fontSize: 8, color: i===6?SPC.prim:SPC.muted, flex: 1, textAlign:'center'}}>{d}</span>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div className="spc-card-accent" style={{padding: 16, marginBottom: 12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 14, paddingLeft: 8}}>
            <div>
              <div className="spc-eyebrow">MASS · NOW</div>
              <div className="spc-mono" style={{fontSize: 26, fontWeight: 600, marginTop: 4}}>76.4<span style={{fontSize: 11, color: SPC.muted, marginLeft: 4}}>KG</span></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="spc-eyebrow">Δ ALLTIME</div>
              <div className="spc-mono" style={{fontSize: 16, fontWeight: 600, color: SPC.prim, marginTop: 4}}>−1.6 KG</div>
              <div className="spc-mono" style={{fontSize: 9, color: SPC.prim}}>−2.1%</div>
            </div>
          </div>
          <svg width="100%" height="70" viewBox="0 0 300 70" preserveAspectRatio="none" style={{display:'block'}}>
            {[0,1,2,3].map(i=>(<line key={i} x1="0" x2="300" y1={i*20+5} y2={i*20+5} stroke={SPC.border}/>))}
            <path d="M0,10 L40,15 L80,8 L120,18 L160,30 L200,28 L240,42 L300,46" fill="none" stroke={SPC.prim} strokeWidth="1.5"/>
            {[[0,10],[40,15],[80,8],[120,18],[160,30],[200,28],[240,42],[300,46]].map(([x,y],i)=>(
              <rect key={i} x={x-2} y={y-2} width="4" height="4" fill={SPC.prim}/>
            ))}
            <path d="M0,46 L300,46" stroke={SPC.prot} strokeWidth="1" strokeDasharray="2 3"/>
            <text x="295" y="42" fontSize="7" fill={SPC.prot} fontFamily="JetBrains Mono" textAnchor="end">target</text>
          </svg>
        </div>

        <div className="spc-eyebrow" style={{marginBottom: 8}}>PREVIOUS · 04 DAYS</div>

        {/* Day log entries */}
        {[
          {d:'MON · 25MAY', cal: 1923, p: 91, w:'76.4', dir:'−0.2', col: SPC.prim},
          {d:'SUN · 24MAY', cal: 2412, p: 114, w:'76.6', dir:'+0.1', col: SPC.fat, over: true},
          {d:'SAT · 23MAY', cal: 1788, p: 85, w:'76.7', dir:'−0.1', col: SPC.prim},
          {d:'FRI · 22MAY', cal: 2015, p: 96, w:'76.8', dir:'−0.2', col: SPC.prim},
        ].map((r,i)=>(
          <div key={i} className="spc-card" style={{padding: 12, marginBottom: 6, display:'grid', gridTemplateColumns:'1fr 80px 60px', gap: 10, alignItems:'center'}}>
            <div>
              <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, letterSpacing:'0.1em'}}>{r.d}</div>
              <div style={{display:'flex', alignItems:'center', gap: 6, marginTop: 4}} className="spc-mono">
                <span style={{fontSize: 12, color: r.col, fontWeight: 600}}>{r.cal}</span>
                <span style={{fontSize: 10, color: SPC.muted}}>· {r.w}kg</span>
                <span style={{fontSize: 10, color: r.dir.startsWith('−')?SPC.prim:SPC.fat}}>{r.dir}</span>
              </div>
            </div>
            <div style={{position:'relative', height: 4, background: SPC.border}}>
              <div style={{position:'absolute', left:0, top:0, bottom: 0, width: `${Math.min(r.p, 100)}%`, background: r.col}}/>
              <div style={{position:'absolute', left:'100%', top: -3, bottom: -3, width: 1, background: SPC.muted}}/>
            </div>
            <div className="spc-mono" style={{textAlign:'right', fontSize: 11, color: r.col, fontWeight: 600}}>{r.p}%</div>
          </div>
        ))}
      </div>

      <SpcBottomNav active="hist"/>
    </div>
  );
};

// =========================================================
// SPECTRA ADMIN
// =========================================================

const SpcSidebar = ({active}) => {
  const items = [
    {k:'overview', l:'Overview', i: IcoS.grid},
    {k:'users', l:'Users', i: IcoS.user},
    {k:'pros', l:'Pros', i: IcoS.shield},
    {k:'plans', l:'Plans', i: IcoS.zap},
    {k:'billing', l:'Bill', i: IcoS.trend},
    {k:'patients', l:'Pts', i: IcoS.salad},
  ];
  return (
    <aside className="spc-sidebar">
      <div style={{width: 32, height: 32, background: SPC.prim, color:'#0a0d10', display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 16}}>
        {IcoS.zap}
      </div>
      {items.map(it=>(
        <button key={it.k} className={`spc-side-btn ${active===it.k?'active':''}`} title={it.l}>
          {it.i}
        </button>
      ))}
    </aside>
  );
};

const SpectraAdminOverview = () => (
  <div className="spc-admin">
    <SpcSidebar active="overview"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '16px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: `1px solid ${SPC.border}`, background: SPC.surf}}>
        <div style={{display:'flex', alignItems:'center', gap: 14}}>
          <div>
            <div className="spc-tick">/ ADMIN / OVERVIEW</div>
            <h1 style={{fontSize: 18, fontWeight: 600, letterSpacing:'-0.01em', marginTop: 2}}>SYSTEM_STATUS</h1>
          </div>
          <div style={{display:'flex', gap: 8, marginLeft: 24}}>
            {[
              {l:'API', s:'OK', c: SPC.prim},
              {l:'GEMINI', s:'OK', c: SPC.prim},
              {l:'PSQL', s:'OK', c: SPC.prim},
              {l:'WEBHOOK', s:'WARN', c: SPC.fat},
            ].map(s=>(
              <div key={s.l} className="spc-mono" style={{display:'flex', alignItems:'center', gap: 6, padding: '4px 8px', border: `1px solid ${SPC.border}`, fontSize: 9, letterSpacing:'0.08em'}}>
                <span style={{width: 5, height: 5, background: s.c, borderRadius:'50%', boxShadow: `0 0 6px ${s.c}`}}/>
                <span style={{color: SPC.muted}}>{s.l}</span>
                <span style={{color: s.c}}>{s.s}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex', gap: 8, alignItems:'center'}}>
          <div className="spc-mono" style={{padding: '6px 10px', border: `1px solid ${SPC.border}`, fontSize: 10, color: SPC.muted, display:'flex', alignItems:'center', gap: 6}}>
            {IcoS.search}
            <span>QUERY: USER, PRO, PLAN…</span>
            <span style={{padding:'1px 4px', background: SPC.border, fontSize: 8}}>⌘K</span>
          </div>
          <button className="spc-btn-primary">+ NEW PLAN</button>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '20px 28px', background: SPC.bg}}>
        {/* Stats row */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10, marginBottom: 18}}>
          {[
            {l:'USERS_TOTAL', v:'4.218', d:'+12.4%', dc: SPC.prim, spark: [10,15,12,18,20,22,28,35]},
            {l:'USERS_PREMIUM', v:'1.084', d:'+8.7%', dc: SPC.prim, spark: [20,22,24,23,28,30,32,38]},
            {l:'PROS_ACTIVE', v:'28', d:'+3 / W', dc: SPC.prim, spark: [22,23,25,25,26,27,27,28]},
            {l:'MRR_EST', v:'R$ 38.4k', d:'+4.1%', dc: SPC.prim, spark: [28,30,28,32,34,33,36,38]},
          ].map(s=>(
            <div key={s.l} className="spc-card-accent" style={{padding: 16}}>
              <div style={{paddingLeft: 6}}>
                <div className="spc-eyebrow">{s.l}</div>
                <div className="spc-mono" style={{fontSize: 26, fontWeight: 600, letterSpacing:'-0.03em', marginTop: 6}}>{s.v}</div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8}}>
                  <span className="spc-mono" style={{fontSize: 10, color: s.dc}}>↑ {s.d}</span>
                  <svg width="60" height="20" viewBox="0 0 80 20">
                    <polyline points={s.spark.map((v,i)=>`${i*10},${22-v/2}`).join(' ')} fill="none" stroke={s.dc} strokeWidth="1"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Big chart + side */}
        <div style={{display:'grid', gridTemplateColumns:'1.7fr 1fr', gap: 10, marginBottom: 18}}>
          <div className="spc-card" style={{padding: 18}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 16}}>
              <div>
                <div className="spc-eyebrow">SIGNAL · MEALS LOGGED · 30D</div>
                <div className="spc-mono" style={{fontSize: 24, fontWeight: 600, marginTop: 4, letterSpacing:'-0.03em'}}>184.522</div>
              </div>
              <div style={{display:'flex', gap: 2}}>
                {['7D','30D','90D','12M'].map((p,i)=>(
                  <button key={p} style={{padding:'4px 10px', background: i===1?SPC.prim:'transparent', color: i===1?'#0a0d10':SPC.muted, border:`1px solid ${i===1?SPC.prim:SPC.border}`, fontSize: 10, fontFamily:'JetBrains Mono', fontWeight: 600, cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <svg width="100%" height="200" viewBox="0 0 600 200" style={{display:'block'}}>
              {[0,1,2,3,4].map(i=>(<line key={i} x1="30" x2="600" y1={40+i*30} y2={40+i*30} stroke={SPC.border}/>))}
              {[0,1,2,3,4].map(i=>(<text key={'y'+i} x="0" y={43+i*30} fontFamily="JetBrains Mono" fontSize="9" fill={SPC.muted}>{(8-2*i)*'k'.length}k</text>))}
              {/* Bars + line */}
              {[20,32,28,45,38,55,48,62,55,68,60,72,65,78,72,85,80,90,82,95].map((v,i)=>(
                <rect key={i} x={40 + i*28} y={170 - v*1.5} width="22" height={v*1.5} fill={SPC.border} stroke={SPC.muted} strokeWidth="0.3"/>
              ))}
              <polyline points={[20,32,28,45,38,55,48,62,55,68,60,72,65,78,72,85,80,90,82,95].map((v,i)=>`${51+i*28},${170-v*1.5}`).join(' ')} fill="none" stroke={SPC.prim} strokeWidth="1.5"/>
              {[20,32,28,45,38,55,48,62,55,68,60,72,65,78,72,85,80,90,82,95].map((v,i)=>(
                <rect key={'p'+i} x={48 + i*28} y={167-v*1.5} width="6" height="6" fill={SPC.prim}/>
              ))}
              {/* Annotation */}
              <line x1="582" x2="582" y1="20" y2="180" stroke={SPC.prot} strokeWidth="1" strokeDasharray="2 3"/>
              <text x="586" y="30" fontFamily="JetBrains Mono" fontSize="9" fill={SPC.prot}>← peak</text>
              <text x="586" y="44" fontFamily="JetBrains Mono" fontSize="11" fill={SPC.prot} fontWeight="600">9.500</text>
            </svg>
          </div>

          {/* Plan distribution */}
          <div className="spc-card" style={{padding: 18}}>
            <div className="spc-eyebrow" style={{marginBottom: 14}}>PLAN_DISTRIBUTION</div>
            {[
              {l:'Premium_Anual', n: 642, p: 15, c: SPC.prim},
              {l:'Premium_Mensal', n: 442, p: 11, c: SPC.carb},
              {l:'Trial_7d', n: 312, p: 7, c: SPC.fat},
              {l:'Free', n: 2822, p: 67, c: SPC.muted},
            ].map(p=>(
              <div key={p.l} style={{marginBottom: 12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 4}}>
                  <div style={{display:'flex', alignItems:'center', gap: 6}}>
                    <div style={{width: 6, height: 6, background: p.c}}/>
                    <span className="spc-mono" style={{fontSize: 10, color: SPC.muted}}>{p.l}</span>
                  </div>
                  <span className="spc-mono" style={{fontSize: 10, color: p.c, fontWeight: 600}}>{p.n} <span style={{color: SPC.muted}}>· {p.p}%</span></span>
                </div>
                <div style={{height: 6, background: SPC.border, position:'relative'}}>
                  <div style={{position:'absolute', left:0, top:0, bottom:0, width: `${p.p*1.49}%`, background: p.c}}/>
                </div>
              </div>
            ))}
            <div style={{marginTop: 16, paddingTop: 14, borderTop:`1px solid ${SPC.border}`, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8}}>
              <div>
                <div className="spc-eyebrow">CONV · TRIAL→PREM</div>
                <div className="spc-mono" style={{fontSize: 18, fontWeight: 600, color: SPC.prim, marginTop: 4}}>34.2%</div>
              </div>
              <div>
                <div className="spc-eyebrow">CHURN · 30D</div>
                <div className="spc-mono" style={{fontSize: 18, fontWeight: 600, color: SPC.prot, marginTop: 4}}>2.8%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="spc-card" style={{padding: 0, overflow:'hidden'}}>
          <div style={{padding: '12px 18px', borderBottom:`1px solid ${SPC.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:'#080b0e'}}>
            <span className="spc-eyebrow">EVENTS · LIVE STREAM</span>
            <div style={{display:'flex', alignItems:'center', gap: 6}}>
              <span style={{width: 6, height: 6, background: SPC.prim, borderRadius:'50%', boxShadow:`0 0 6px ${SPC.prim}`}}/>
              <span className="spc-mono" style={{fontSize: 9, color: SPC.prim, letterSpacing:'0.1em'}}>● RECORDING · 12:47:22</span>
            </div>
          </div>
          <table className="spc-table">
            <thead><tr>
              <th>TIME</th>
              <th>EVENT</th>
              <th>USER</th>
              <th>PRO</th>
              <th style={{textAlign:'right'}}>VALUE</th>
              <th style={{textAlign:'right'}}>STATUS</th>
            </tr></thead>
            <tbody>
              {[
                {t:'12:46:38', e:'PAYMENT.MERCADOPAGO', u:'Camila Rocha', p:'M. Vidal', v:'+R$ 199,90', vc: SPC.prim, s:'OK', sc: SPC.prim},
                {t:'12:33:14', e:'USER.LINK_PROFESSIONAL', u:'Roberto Lemos', p:'PT D. Santos', v:'—', vc: SPC.muted, s:'OK', sc: SPC.prim},
                {t:'12:09:51', e:'AI.SCAN_PHOTO', u:'Anna Beatriz', p:'—', v:'542 KCAL', vc: SPC.fat, s:'OK', sc: SPC.prim},
                {t:'11:47:02', e:'PLAN.TRIAL_EXPIRED', u:'Lucas Tavares', p:'—', v:'—', vc: SPC.muted, s:'CHURN', sc: SPC.prot},
                {t:'11:24:17', e:'PAYMENT.MERCADOPAGO', u:'Marcela Ito', p:'M. Vidal', v:'+R$ 29,90', vc: SPC.prim, s:'OK', sc: SPC.prim},
                {t:'10:58:33', e:'AI.RECIPE_GENERATE', u:'Pedro Hauer', p:'—', v:'2 RCP', vc: SPC.carb, s:'OK', sc: SPC.prim},
              ].map((r,i)=>(
                <tr key={i}>
                  <td className="spc-mono" style={{color: SPC.muted, fontSize: 10}}>{r.t}</td>
                  <td className="spc-mono" style={{fontSize: 10, color: SPC.text, letterSpacing:'0.05em'}}>{r.e}</td>
                  <td style={{fontSize: 12}}>{r.u}</td>
                  <td style={{fontSize: 11, color: SPC.muted}}>{r.p}</td>
                  <td className="spc-mono" style={{textAlign:'right', color: r.vc, fontWeight: 600}}>{r.v}</td>
                  <td style={{textAlign:'right'}}><span className="spc-mono" style={{padding: '2px 6px', border: `1px solid ${r.sc}`, color: r.sc, fontSize: 9, letterSpacing:'0.1em'}}>{r.s}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

const SpectraAdminPros = () => (
  <div className="spc-admin">
    <SpcSidebar active="pros"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '16px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: `1px solid ${SPC.border}`, background: SPC.surf}}>
        <div>
          <div className="spc-tick">/ ADMIN / PROS</div>
          <h1 style={{fontSize: 18, fontWeight: 600, marginTop: 2}}>HEALTHCARE_TEAM · 28</h1>
        </div>
        <button className="spc-btn-primary">+ REGISTER PRO</button>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '20px 28px', background: SPC.bg}}>
        {/* Aggregate stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10, marginBottom: 16}}>
          {[
            {l:'TOTAL_PROS', v:'28', c: SPC.text},
            {l:'NUTRITIONISTS', v:'18', c: SPC.prim},
            {l:'TRAINERS', v:'10', c: SPC.carb},
            {l:'AVG_COMMISSION', v:'13.4%', c: SPC.fat},
          ].map(s=>(
            <div key={s.l} className="spc-card" style={{padding: 14}}>
              <div className="spc-eyebrow">{s.l}</div>
              <div className="spc-mono" style={{fontSize: 24, fontWeight: 600, color: s.c, marginTop: 6, letterSpacing:'-0.03em'}}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{display:'flex', gap: 6, marginBottom: 12}}>
          {['ALL · 28', 'NUTRI · 18', 'TRAINER · 10', 'COM > 15%'].map((c,i)=>(
            <button key={c} className="spc-mono" style={{padding:'6px 12px', background: i===0 ? SPC.prim : SPC.surf, color: i===0?'#0a0d10':SPC.muted, border:`1px solid ${i===0 ? SPC.prim : SPC.border}`, fontSize: 10, fontWeight: 600, letterSpacing:'0.1em', cursor:'pointer'}}>{c}</button>
          ))}
          <div style={{flex: 1}}/>
          <div className="spc-mono" style={{padding:'6px 12px', background: SPC.surf, border:`1px solid ${SPC.border}`, color: SPC.muted, fontSize: 10, letterSpacing:'0.1em'}}>SORT: REVENUE DESC ↓</div>
        </div>

        {/* Pros table — data dense */}
        <div className="spc-card" style={{padding: 0, overflow:'hidden'}}>
          <table className="spc-table">
            <thead><tr>
              <th>ID</th>
              <th>PROFISSIONAL</th>
              <th>ROLE</th>
              <th style={{textAlign:'right'}}>PATIENTS</th>
              <th style={{textAlign:'right'}}>RETENTION</th>
              <th style={{textAlign:'right'}}>COMMISSION</th>
              <th style={{textAlign:'right'}}>MRR · BRL</th>
              <th style={{textAlign:'right'}}>NET</th>
              <th>STATUS</th>
              <th style={{textAlign:'right'}}>—</th>
            </tr></thead>
            <tbody>
              {[
                {id:'P_0014', n:'Dra. Marina Vidal', e:'marina@nutrir.online', r:'NUTRI', p: 42, ret: 94, com: '15.0', mrr: '6.234,50', net: '935,18', s:'ACTIVE', sc: SPC.prim},
                {id:'P_0018', n:'Dr. Carlos Nutri', e:'carlos@nutrir.online', r:'NUTRI', p: 28, ret: 89, com: '12.0', mrr: '3.412,00', net: '409,44', s:'ACTIVE', sc: SPC.prim},
                {id:'P_0021', n:'PT Diego Santos', e:'diego@nutrir.online', r:'TRAINER', p: 36, ret: 91, com: '18.0', mrr: '4.876,20', net: '877,72', s:'ACTIVE', sc: SPC.prim},
                {id:'P_0027', n:'Dra. Renata Lopes', e:'renata@nutrir.online', r:'NUTRI', p: 31, ret: 87, com: '14.0', mrr: '3.987,40', net: '558,24', s:'ACTIVE', sc: SPC.prim},
                {id:'P_0033', n:'PT Aline Borges', e:'aline@nutrir.online', r:'TRAINER', p: 14, ret: 71, com: '10.0', mrr: '1.245,80', net: '124,58', s:'PAUSE', sc: SPC.fat},
                {id:'P_0042', n:'Dr. Pedro Antunes', e:'pedro@nutrir.online', r:'NUTRI', p: 22, ret: 82, com: '13.5', mrr: '2.815,40', net: '380,08', s:'ACTIVE', sc: SPC.prim},
                {id:'P_0048', n:'PT Larissa Khoury', e:'larissa@nutrir.online', r:'TRAINER', p: 19, ret: 78, com: '11.0', mrr: '2.230,90', net: '245,40', s:'ACTIVE', sc: SPC.prim},
                {id:'P_0055', n:'Dra. Beatriz Cunha', e:'bea@nutrir.online', r:'NUTRI', p: 26, ret: 85, com: '13.0', mrr: '3.124,80', net: '406,22', s:'ACTIVE', sc: SPC.prim},
              ].map((r,i)=>(
                <tr key={i}>
                  <td className="spc-mono" style={{color: SPC.muted, fontSize: 10}}>{r.id}</td>
                  <td><div>
                    <div style={{fontSize: 12, fontWeight: 500}}>{r.n}</div>
                    <div className="spc-mono" style={{fontSize: 9, color: SPC.muted, marginTop: 1}}>{r.e}</div>
                  </div></td>
                  <td><span className="spc-mono" style={{padding:'2px 6px', background: r.r==='NUTRI'?'rgba(212,240,74,0.1)':'rgba(92,251,255,0.1)', color: r.r==='NUTRI'?SPC.prim:SPC.carb, border:`1px solid ${r.r==='NUTRI'?SPC.prim:SPC.carb}`, fontSize: 9, letterSpacing:'0.1em', fontWeight: 600}}>{r.r}</span></td>
                  <td className="spc-mono" style={{textAlign:'right', fontSize: 12, fontWeight: 600}}>{r.p}</td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                      <div style={{width: 30, height: 4, background: SPC.border, position:'relative'}}>
                        <div style={{position:'absolute', left:0, top:0, bottom: 0, width: `${r.ret}%`, background: r.ret>85?SPC.prim:SPC.fat}}/>
                      </div>
                      <span className="spc-mono" style={{fontSize: 10, color: r.ret>85?SPC.prim:SPC.fat, fontWeight: 600}}>{r.ret}%</span>
                    </div>
                  </td>
                  <td className="spc-mono" style={{textAlign:'right', fontSize: 11, color: SPC.prim, fontWeight: 600}}>{r.com}%</td>
                  <td className="spc-mono" style={{textAlign:'right', fontSize: 11, fontWeight: 600}}>{r.mrr}</td>
                  <td className="spc-mono" style={{textAlign:'right', fontSize: 11, color: SPC.muted}}>{r.net}</td>
                  <td><span className="spc-mono" style={{padding: '2px 6px', border: `1px solid ${r.sc}`, color: r.sc, fontSize: 9, letterSpacing:'0.1em'}}>● {r.s}</span></td>
                  <td style={{textAlign:'right', color: SPC.muted}}>{IcoS.more}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding: '10px 18px', borderTop:`1px solid ${SPC.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:'#080b0e'}}>
            <span className="spc-mono" style={{fontSize: 10, color: SPC.muted, letterSpacing:'0.1em'}}>SHOWING 1-8 OF 28 · Σ MRR · R$ 27.927,00</span>
            <div style={{display:'flex', gap: 4}}>
              {['‹','1','2','3','4','›'].map((p,i)=>(
                <button key={i} style={{width: 24, height: 24, background: i===1?SPC.prim:'transparent', color: i===1?'#0a0d10':SPC.muted, border:`1px solid ${i===1?SPC.prim:SPC.border}`, fontSize: 10, fontFamily:'JetBrains Mono', fontWeight: 600, cursor:'pointer'}}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);

const SpectraAdminPatient = () => (
  <div className="spc-admin">
    <SpcSidebar active="patients"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '14px 28px', borderBottom: `1px solid ${SPC.border}`, background: SPC.surf}}>
        <div style={{display:'flex', alignItems:'center', gap: 16, marginBottom: 8}}>
          <button className="spc-btn-ghost" style={{padding: '6px 10px'}}>{IcoS.back}</button>
          <div className="spc-tick">/ PATIENTS / #P_4218</div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
          <div style={{display:'flex', alignItems:'center', gap: 14}}>
            <div style={{width: 56, height: 56, background:`linear-gradient(135deg, ${SPC.prim}, ${SPC.carb})`, color:'#0a0d10', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 18, fontWeight: 700, fontFamily:'JetBrains Mono'}}>CR</div>
            <div>
              <h1 style={{fontSize: 22, fontWeight: 600, letterSpacing:'-0.02em'}}>Camila Rocha</h1>
              <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, marginTop: 4, letterSpacing:'0.05em'}}>camila@email.com · ID#P_4218 · linked_28d · plan: PREMIUM_ANUAL</div>
            </div>
          </div>
          <div style={{display:'flex', gap: 6}}>
            <button className="spc-btn-ghost">EXPORT.CSV</button>
            <button className="spc-btn-ghost">EXPORT.PDF</button>
            <button className="spc-btn-primary">+ PRESCRIPTION</button>
          </div>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '18px 28px', background: SPC.bg, display:'grid', gridTemplateColumns:'300px 1fr', gap: 14}}>
        {/* LEFT — clinical profile */}
        <div style={{display:'flex', flexDirection:'column', gap: 12}}>
          <div className="spc-card-accent" style={{padding: 16}}>
            <div className="spc-eyebrow" style={{marginBottom: 12, paddingLeft: 6}}>CLINICAL_PROFILE</div>
            <table style={{width:'100%', borderCollapse:'collapse', paddingLeft: 6}}>
              <tbody>
                {[
                  {l:'AGE', v:'29 y'},
                  {l:'SEX', v:'F'},
                  {l:'HEIGHT', v:'168 cm'},
                  {l:'WEIGHT', v:'68.4 kg', hl: true},
                  {l:'BASELINE', v:'72.0 kg'},
                  {l:'TARGET', v:'62.0 kg'},
                  {l:'BMI', v:'24.2'},
                  {l:'BMR', v:'1.428 kcal'},
                  {l:'TDEE × 1.55', v:'2.215 kcal'},
                  {l:'GOAL_KCAL', v:'1.700 kcal', hl: true},
                ].map((r,i)=>(
                  <tr key={i}>
                    <td className="spc-mono" style={{padding:'7px 0', fontSize: 10, color: SPC.muted, letterSpacing:'0.08em', borderBottom: i<9?`1px solid ${SPC.border}`:'none'}}>{r.l}</td>
                    <td className="spc-mono" style={{padding:'7px 0', textAlign:'right', fontSize: 12, fontWeight: r.hl?600:500, color: r.hl?SPC.prim:SPC.text, borderBottom: i<9?`1px solid ${SPC.border}`:'none'}}>{r.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="spc-card" style={{padding: 16}}>
            <div className="spc-eyebrow" style={{marginBottom: 10}}>MACROS · PRESCRIBED</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 4, marginBottom: 12}}>
              {[{l:'P',v:'130g',c:SPC.prot},{l:'C',v:'170g',c:SPC.carb},{l:'F',v:'58g',c:SPC.fat}].map(m=>(
                <div key={m.l} style={{padding: 10, border: `1px solid ${m.c}`, textAlign:'center'}}>
                  <div className="spc-mono" style={{fontSize: 16, fontWeight: 600, color: m.c}}>{m.v}</div>
                  <div className="spc-mono" style={{fontSize: 9, color: SPC.muted, marginTop: 2, letterSpacing:'0.1em'}}>{m.l}</div>
                </div>
              ))}
            </div>
            <button className="spc-btn-ghost" style={{width:'100%', fontSize: 10}}>EDIT TARGETS</button>
          </div>

          <div className="spc-card-accent" style={{padding: 16}}>
            <div className="spc-eyebrow" style={{marginBottom: 10, paddingLeft: 6}}>PRESCRIPTION · NEW</div>
            <div style={{paddingLeft: 6}}>
              <div className="spc-mono" style={{fontSize: 10, color: SPC.muted, marginBottom: 6}}>$ message {'>'}</div>
              <textarea placeholder="// instruct patient diet, training routine or notes..." style={{width:'100%', minHeight: 90, background:'#04060a', border:`1px solid ${SPC.border}`, padding: 10, color: SPC.text, fontSize: 11, fontFamily:'JetBrains Mono', resize:'none', outline:'none'}}/>
              <button className="spc-btn-primary" style={{width:'100%', marginTop: 10}}>TRANSMIT → APP</button>
            </div>
          </div>
        </div>

        {/* RIGHT — telemetry */}
        <div style={{display:'flex', flexDirection:'column', gap: 12, minWidth: 0}}>
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap: 10}}>
            <div className="spc-card-accent" style={{padding: 14}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 10, paddingLeft: 6}}>
                <div className="spc-eyebrow">MASS · 4W TREND</div>
                <div className="spc-mono" style={{fontSize: 11, color: SPC.prim, fontWeight: 600}}>−3.6 KG · −5.0%</div>
              </div>
              <svg width="100%" height="80" viewBox="0 0 400 80" style={{display:'block'}}>
                {[0,1,2,3].map(i=>(<line key={i} x1="0" x2="400" y1={i*20+5} y2={i*20+5} stroke={SPC.border}/>))}
                {[15,18,30,28,40,45,62,70].map((v,i)=>(
                  <rect key={i} x={i*50 + 6} y={75 - v} width="32" height={v} fill="none" stroke={SPC.prim} strokeWidth="1"/>
                ))}
                <polyline points={[15,18,30,28,40,45,62,70].map((v,i)=>`${i*50+22},${75-v}`).join(' ')} fill="none" stroke={SPC.prim} strokeWidth="2"/>
                <line x1="0" x2="400" y1="60" y2="60" stroke={SPC.prot} strokeWidth="1" strokeDasharray="2 3"/>
              </svg>
            </div>

            <div className="spc-card" style={{padding: 14}}>
              <div className="spc-eyebrow" style={{marginBottom: 8, color: SPC.carb}}>H2O · TODAY</div>
              <div className="spc-mono" style={{fontSize: 22, fontWeight: 600}}>1.80<span style={{fontSize: 11, color: SPC.muted, marginLeft: 4}}>L</span></div>
              <div style={{height: 4, background: SPC.border, marginTop: 12}}><div style={{height:'100%', width:'72%', background: SPC.carb}}/></div>
              <div className="spc-mono" style={{fontSize: 9, color: SPC.muted, marginTop: 6}}>72% · TGT 2.5L</div>
            </div>

            <div className="spc-card" style={{padding: 14}}>
              <div className="spc-eyebrow" style={{marginBottom: 8, color: SPC.fat}}>FAST · 16:8</div>
              <div className="spc-mono" style={{fontSize: 22, fontWeight: 600, color: SPC.fat}}>12:28</div>
              <div className="spc-mono" style={{fontSize: 9, color: SPC.muted, marginTop: 8}}>START · 20:14 · YDAY</div>
              <div className="spc-mono" style={{fontSize: 9, color: SPC.prim, marginTop: 2}}>● IN_PROGRESS</div>
            </div>
          </div>

          {/* Diary table */}
          <div className="spc-card" style={{padding: 0, overflow:'hidden'}}>
            <div style={{padding: '10px 18px', borderBottom:`1px solid ${SPC.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:'#080b0e'}}>
              <span className="spc-eyebrow">DIARY · 26MAY · 5 ENTRIES</span>
              <div style={{display:'flex', gap: 4}}>
                {['TODAY','-1D','-2D','-3D','7D'].map((p,i)=>(
                  <button key={p} className="spc-mono" style={{padding:'3px 8px', background: i===0 ? SPC.prim : 'transparent', color: i===0 ? '#0a0d10' : SPC.muted, border:`1px solid ${i===0 ? SPC.prim : SPC.border}`, fontSize: 9, fontWeight: 600, letterSpacing:'0.08em', cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <table className="spc-table">
              <thead><tr>
                <th>T</th>
                <th>MEAL</th>
                <th>ITEMS</th>
                <th style={{textAlign:'right'}}>KCAL</th>
                <th style={{textAlign:'right'}}>P</th>
                <th style={{textAlign:'right'}}>C</th>
                <th style={{textAlign:'right'}}>F</th>
                <th>SRC</th>
              </tr></thead>
              <tbody>
                {[
                  {h:'08:14', n:'BREAKFAST', it:'Iog. grego · granola · banana', k:340, p:18, c:42, f:9, src:'MAN'},
                  {h:'10:30', n:'SNACK', it:'Whey · maçã', k:180, p:24, c:18, f:2, src:'MAN'},
                  {h:'12:48', n:'LUNCH', it:'Arroz · frango · brócolis · azeite', k:542, p:38, c:50, f:18, src:'AI', hl: true},
                  {h:'15:20', n:'SNACK', it:'Castanhas · chá verde', k:160, p:4, c:6, f:14, src:'MAN'},
                  {h:'19:40', n:'DINNER', it:'Salmão · salada · batata doce', k:480, p:36, c:38, f:18, src:'AI'},
                ].map((r,i)=>(
                  <tr key={i}>
                    <td className="spc-mono" style={{color: SPC.muted, fontSize: 11}}>{r.h}</td>
                    <td className="spc-mono" style={{fontSize: 10, letterSpacing:'0.08em', color: SPC.text}}>{r.n}</td>
                    <td style={{fontSize: 12, color: SPC.muted}}>{r.it}</td>
                    <td className="spc-mono" style={{textAlign:'right', fontWeight: 600, color: SPC.prim}}>{r.k}</td>
                    <td className="spc-mono" style={{textAlign:'right', color: SPC.prot, fontSize: 11}}>{r.p}</td>
                    <td className="spc-mono" style={{textAlign:'right', color: SPC.carb, fontSize: 11}}>{r.c}</td>
                    <td className="spc-mono" style={{textAlign:'right', color: SPC.fat, fontSize: 11}}>{r.f}</td>
                    <td><span className="spc-mono" style={{padding:'2px 5px', border:`1px solid ${r.src==='AI'?SPC.prim:SPC.border}`, color: r.src==='AI'?SPC.prim:SPC.muted, fontSize: 9, letterSpacing:'0.1em'}}>{r.src}</span></td>
                  </tr>
                ))}
                <tr style={{background:'rgba(212,240,74,0.04)'}}>
                  <td/>
                  <td className="spc-mono" style={{fontWeight: 600, color: SPC.prim, fontSize: 11, letterSpacing:'0.08em'}}>Σ TOTAL</td>
                  <td/>
                  <td className="spc-mono" style={{textAlign:'right', fontWeight: 700, color: SPC.prim, fontSize: 13}}>1.702</td>
                  <td className="spc-mono" style={{textAlign:'right', fontWeight: 700, color: SPC.prot, fontSize: 12}}>120</td>
                  <td className="spc-mono" style={{textAlign:'right', fontWeight: 700, color: SPC.carb, fontSize: 12}}>154</td>
                  <td className="spc-mono" style={{textAlign:'right', fontWeight: 700, color: SPC.fat, fontSize: 12}}>61</td>
                  <td/>
                </tr>
                <tr>
                  <td/>
                  <td className="spc-mono" style={{color: SPC.muted, fontSize: 10}}>vs TGT</td>
                  <td/>
                  <td className="spc-mono" style={{textAlign:'right', color: SPC.prim, fontSize: 10}}>+2 (100%)</td>
                  <td className="spc-mono" style={{textAlign:'right', color: SPC.prot, fontSize: 10}}>−10</td>
                  <td className="spc-mono" style={{textAlign:'right', color: SPC.carb, fontSize: 10}}>−16</td>
                  <td className="spc-mono" style={{textAlign:'right', color: SPC.fat, fontSize: 10}}>+3</td>
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
  SpectraOnboarding, SpectraDashboard, SpectraScanner, SpectraResult,
  SpectraRecipes, SpectraHistory,
  SpectraAdminOverview, SpectraAdminPros, SpectraAdminPatient,
});
