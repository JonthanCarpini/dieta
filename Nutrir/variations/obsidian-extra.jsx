// ============================================================
// OBSIDIAN — Additional screens
// App: Login, Fasting, Profile, Food Search, Recipe Detail
// Admin: Users, Plans, Billing, Credentials
// ============================================================

// More icons
const IcoO2 = {
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  google: <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-2 3.2-4.8 3.2-8.1z"/><path fill="currentColor" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.9C4.1 20.6 7.8 23 12 23z" opacity=".7"/><path fill="currentColor" d="M6 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.8H2.3C1.5 8.4 1 10.1 1 12s.5 3.6 1.3 5.2L6 14.3z" opacity=".5"/><path fill="currentColor" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.8 1 4.1 3.4 2.3 6.8L6 9.7c.9-2.5 3.2-4.3 6-4.3z" opacity=".4"/></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  stop: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m13 4 7 7L9 22H2v-7z"/></svg>,
  log: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 4v16M5 4l14 8-14 8"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  copy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>,
};

// --- 7. LOGIN ---
const ObsidianLogin = () => (
  <div className="obs-root" style={{padding: '0 26px', justifyContent:'space-between'}}>
    {/* Visual top: orbit pattern */}
    <div style={{height: 240, position:'relative', marginTop: 30, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <svg width="220" height="220" viewBox="0 0 220 220">
        <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(245,193,77,0.08)" strokeWidth="1"/>
        <circle cx="110" cy="110" r="70" fill="none" stroke="rgba(245,193,77,0.12)" strokeWidth="1"/>
        <circle cx="110" cy="110" r="40" fill="none" stroke="rgba(245,193,77,0.16)" strokeWidth="1"/>
        <circle cx="110" cy="40" r="3" fill="#f5c14d"/>
        <circle cx="170" cy="130" r="2" fill="#e0734a"/>
        <circle cx="60" cy="160" r="2" fill="#8da7c4"/>
        <defs>
          <linearGradient id="obsLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5c14d"/>
            <stop offset="100%" stopColor="#e0734a"/>
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="22" fill="url(#obsLogo)"/>
        <text x="110" y="116" textAnchor="middle" fill="#1a1408" fontSize="20" fontWeight="700" fontFamily="Geist">N</text>
      </svg>
    </div>

    <div style={{flex: 1, paddingTop: 8}}>
      <div className="obs-eyebrow" style={{marginBottom: 8}}>NUTRIR · v3.1</div>
      <h1 style={{fontSize: 32, fontWeight: 500, letterSpacing:'-0.03em', lineHeight: 1.05, marginBottom: 6}}>
        Pronto para<br/>
        <span style={{color: '#f5c14d'}}>focar?</span>
      </h1>
      <p style={{fontSize: 13, color:'rgba(244,241,236,0.55)', marginBottom: 22, lineHeight: 1.5}}>
        Entre para sincronizar suas metas, refeições e jejuns na nuvem.
      </p>

      <div style={{display:'flex', flexDirection:'column', gap: 10}}>
        <div className="obs-glass" style={{padding: '14px 16px'}}>
          <div className="obs-eyebrow" style={{fontSize: 9, marginBottom: 4}}>E-MAIL</div>
          <div style={{fontSize: 14, color:'rgba(244,241,236,0.9)'}}>joao@nutrir.online</div>
        </div>
        <div className="obs-glass" style={{padding: '14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div className="obs-eyebrow" style={{fontSize: 9, marginBottom: 4}}>SENHA</div>
            <div style={{fontSize: 14, color:'rgba(244,241,236,0.9)', letterSpacing: '0.2em'}}>••••••••••</div>
          </div>
          <button style={{background:'none', border:'none', color:'rgba(244,241,236,0.4)', cursor:'pointer'}}>{IcoO2.eye}</button>
        </div>
      </div>

      <button className="obs-btn-primary" style={{width:'100%', marginTop: 12, display:'flex', justifyContent:'center'}}>Entrar</button>

      <div style={{display:'flex', alignItems:'center', gap: 12, margin: '22px 0'}}>
        <div style={{flex: 1, height: 1, background:'rgba(244,241,236,0.06)'}}/>
        <span className="obs-mono" style={{fontSize: 9, color:'rgba(244,241,236,0.4)', letterSpacing:'0.16em'}}>OU</span>
        <div style={{flex: 1, height: 1, background:'rgba(244,241,236,0.06)'}}/>
      </div>

      <button className="obs-btn-ghost" style={{width:'100%', justifyContent:'center', gap: 10}}>
        {IcoO2.google}
        Continuar com Google
      </button>
    </div>

    <div style={{padding: '22px 0', textAlign:'center'}}>
      <span style={{fontSize: 12, color:'rgba(244,241,236,0.5)'}}>Novo aqui?</span>
      <button style={{background:'none', border:'none', color:'#f5c14d', fontSize: 12, fontWeight: 600, marginLeft: 6, cursor:'pointer'}}>Criar conta →</button>
    </div>
  </div>
);

// --- 8. FASTING ---
const ObsidianFasting = () => {
  // 14h goal, currently 8h 24m in
  const goal = 14;
  const progress = 8 + 24/60;
  const pct = progress / goal;
  const C = 2 * Math.PI * 95;

  return (
    <div className="obs-root">
      <header style={{padding: '18px 24px 8px'}}>
        <div className="obs-eyebrow">Protocolo 14:10</div>
        <h2 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 2}}>Jejum</h2>
      </header>

      <div className="obs-scroll" style={{padding: '8px 24px 14px'}}>
        {/* Protocol selector */}
        <div className="obs-glass" style={{padding: '12px 8px', marginBottom: 14, display:'flex', gap: 4}}>
          {[
            {l:'12h', s:'Simples'},
            {l:'14h', s:'Moderado', active: true},
            {l:'16h', s:'Lean'},
            {l:'18h', s:'Avançado'},
          ].map(p=>(
            <button key={p.l} style={{flex: 1, padding: '8px 4px', borderRadius: 10, background: p.active ? 'rgba(245,193,77,0.12)' : 'transparent', border: p.active ? '1px solid rgba(245,193,77,0.3)' : '1px solid transparent', color: p.active ? '#f5c14d' : 'rgba(244,241,236,0.55)', display:'flex', flexDirection:'column', gap: 2, cursor:'pointer', fontFamily:'Geist'}}>
              <span style={{fontSize: 14, fontWeight: 600}}>{p.l}</span>
              <span style={{fontSize: 9, opacity: 0.7}}>{p.s}</span>
            </button>
          ))}
        </div>

        {/* Big timer */}
        <div className="obs-glass" style={{padding: 22, marginBottom: 14, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
          <div style={{position:'relative', width: 220, height: 220, marginBottom: 18}}>
            <svg width="220" height="220" viewBox="0 0 220 220">
              <defs>
                <linearGradient id="obsFastRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f5c14d"/>
                  <stop offset="100%" stopColor="#e0734a"/>
                </linearGradient>
              </defs>
              <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(244,241,236,0.05)" strokeWidth="3"/>
              {/* Tick marks every 1h, major every 4h */}
              {Array.from({length: 24}).map((_,i)=>{
                const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
                const inner = i % 4 === 0 ? 80 : 85;
                const outer = 90;
                return <line key={i} x1={110 + Math.cos(angle) * inner} y1={110 + Math.sin(angle) * inner} x2={110 + Math.cos(angle) * outer} y2={110 + Math.sin(angle) * outer} stroke="rgba(244,241,236,0.2)" strokeWidth={i % 4 === 0 ? 1.5 : 1}/>;
              })}
              <circle cx="110" cy="110" r="95" fill="none" stroke="url(#obsFastRing)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${pct * C} ${C}`}
                transform="rotate(-90 110 110)"/>
              {/* End marker */}
              <circle cx={110 + Math.cos(pct * 2 * Math.PI - Math.PI/2) * 95} cy={110 + Math.sin(pct * 2 * Math.PI - Math.PI/2) * 95} r="6" fill="#f5c14d" stroke="#0a0a0c" strokeWidth="2"/>
            </svg>
            <div style={{position:'absolute', inset: 0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
              <div className="obs-eyebrow" style={{marginBottom: 8}}>● Em jejum</div>
              <div className="obs-mono" style={{fontSize: 42, fontWeight: 500, color:'#f4f1ec', letterSpacing:'-0.04em', lineHeight: 1}}>08:24</div>
              <div className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)', marginTop: 6}}>de 14:00</div>
              <div style={{marginTop: 12, padding: '3px 10px', borderRadius: 999, background:'rgba(245,193,77,0.1)', border:'1px solid rgba(245,193,77,0.25)', color:'#f5c14d', fontSize: 10, fontFamily:'Geist Mono', letterSpacing:'0.08em'}}>60% concluído</div>
            </div>
          </div>

          <div style={{display:'flex', gap: 8, width:'100%'}}>
            <button className="obs-btn-ghost" style={{flex:'0 0 auto', padding: '12px 14px'}}>{IcoO2.edit}</button>
            <button className="obs-btn-primary" style={{flex: 1, justifyContent:'center', display:'flex', alignItems:'center', gap: 8, background:'linear-gradient(180deg, #e0734a, #c25430)', color:'#fff', boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 22px -8px rgba(224,115,74,0.5)'}}>
              {IcoO2.stop} Encerrar jejum
            </button>
          </div>
        </div>

        {/* Timeline of phases */}
        <div className="obs-glass" style={{padding: 18, marginBottom: 14}}>
          <div className="obs-eyebrow" style={{marginBottom: 14}}>Fase metabólica</div>
          {[
            {h:'0–4h', l:'Digestão & saciedade', done: true},
            {h:'4–8h', l:'Glicogênio em uso', done: true},
            {h:'8–12h', l:'Início da queima de gordura', active: true},
            {h:'12–14h', l:'Autofagia leve & cetose', upcoming: true},
            {h:'14h+', l:'Janela alimentar libera', upcoming: true},
          ].map((p,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap: 12, padding: '8px 0', borderBottom: i<4?'1px solid rgba(244,241,236,0.04)':'none'}}>
              <div style={{width: 8, height: 8, borderRadius:'50%', background: p.active ? '#f5c14d' : (p.done ? 'rgba(196,232,143,0.6)' : 'rgba(244,241,236,0.15)'), boxShadow: p.active ? '0 0 10px #f5c14d' : 'none', flexShrink: 0}}/>
              <div className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)', width: 50, flexShrink: 0}}>{p.h}</div>
              <div style={{fontSize: 12, color: p.active ? '#f4f1ec' : (p.done ? 'rgba(244,241,236,0.7)' : 'rgba(244,241,236,0.4)'), fontWeight: p.active ? 500 : 400}}>{p.l}</div>
              {p.active && <span className="obs-mono" style={{marginLeft:'auto', fontSize: 9, color:'#f5c14d', letterSpacing:'0.08em'}}>● ATUAL</span>}
            </div>
          ))}
        </div>

        {/* History last 7 days */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10}}>
          <h3 style={{fontSize: 14, fontWeight: 500}}>Últimos 7 ciclos</h3>
          <span className="obs-eyebrow">média 13h 12m</span>
        </div>
        <div className="obs-glass" style={{padding: 16, marginBottom: 14}}>
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 6, height: 70, marginBottom: 8}}>
            {[12.5, 13.8, 14.2, 11.8, 13.5, 14.0, 8.4].map((h,i)=>(
              <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%'}}>
                <div className="obs-mono" style={{fontSize: 9, color: i===6?'#f5c14d':'rgba(244,241,236,0.5)', marginBottom: 4}}>{h.toFixed(1)}</div>
                <div style={{width:'100%', height: `${(h/16)*100}%`, background: i===6 ? 'linear-gradient(180deg, #f5c14d, #e0734a)' : 'linear-gradient(180deg, rgba(244,241,236,0.2), rgba(244,241,236,0.06))', borderRadius: 3}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            {['Q','S','S','D','S','T','Q'].map((d,i)=>(
              <div key={i} className="obs-mono" style={{fontSize: 9, color: i===6?'#f5c14d':'rgba(244,241,236,0.4)', flex: 1, textAlign:'center'}}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      <ObsBottomNav active="fasting"/>
    </div>
  );
};

// --- 9. PROFILE ---
const ObsidianProfile = () => (
  <div className="obs-root">
    <header style={{padding: '18px 24px 8px'}}>
      <div className="obs-eyebrow">Perfil</div>
      <h2 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 2}}>Plano alimentar</h2>
    </header>

    <div className="obs-scroll" style={{padding: '8px 24px 14px'}}>
      {/* User card */}
      <div className="obs-glass" style={{padding: 20, marginBottom: 14, position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', top:-30, right:-30, width: 140, height: 140, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,193,77,0.18), transparent 70%)'}}/>
        <div style={{display:'flex', gap: 14, alignItems:'center', marginBottom: 18, position:'relative'}}>
          <div style={{width: 54, height: 54, borderRadius: 16, background:'linear-gradient(135deg, #f5c14d, #e0734a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 20, fontWeight: 700, color:'#1a1408'}}>JS</div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 16, fontWeight: 500, letterSpacing:'-0.01em'}}>João Silva</div>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 4}}>joao@nutrir.online · ID #4218</div>
          </div>
          <div className="obs-pill" style={{color:'#f5c14d', alignSelf:'flex-start'}}>● PREMIUM</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8, paddingTop: 16, borderTop:'1px solid rgba(244,241,236,0.06)'}}>
          {[
            {l:'kcal', v:'2.100'},
            {l:'P', v:'150g', c:'#ff8e7e'},
            {l:'C', v:'220g', c:'#c4e88f'},
            {l:'G', v:'70g', c:'#f5c14d'},
          ].map(m=>(
            <div key={m.l}>
              <div className="obs-mono" style={{fontSize: 14, fontWeight: 500, color: m.c || '#f4f1ec'}}>{m.v}</div>
              <div className="obs-eyebrow" style={{fontSize: 8, marginTop: 2}}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginBottom: 14}}>
        <div className="obs-glass" style={{padding: 14}}>
          <div className="obs-eyebrow" style={{marginBottom: 8}}>Peso atual</div>
          <div className="obs-mono" style={{fontSize: 22, fontWeight: 500}}>76.4<span style={{fontSize: 11, color:'rgba(244,241,236,0.4)', marginLeft: 3}}>kg</span></div>
          <div className="obs-mono" style={{fontSize: 10, color:'#c4e88f', marginTop: 4}}>↘ −1.6 kg</div>
        </div>
        <div className="obs-glass" style={{padding: 14}}>
          <div className="obs-eyebrow" style={{marginBottom: 8}}>Streak</div>
          <div className="obs-mono" style={{fontSize: 22, fontWeight: 500}}>14<span style={{fontSize: 11, color:'rgba(244,241,236,0.4)', marginLeft: 3}}>dias</span></div>
          <div className="obs-mono" style={{fontSize: 10, color:'#f5c14d', marginTop: 4}}>● ATIVO</div>
        </div>
      </div>

      {/* Professional card */}
      <div className="obs-glass" style={{padding: 16, marginBottom: 14, position:'relative', background:'linear-gradient(180deg, rgba(245,193,77,0.06), transparent)'}}>
        <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 14}}>
          <div style={{width:30, height: 30, borderRadius: 8, background:'rgba(245,193,77,0.15)', border: '1px solid rgba(245,193,77,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c14d'}}>{Ico.shield}</div>
          <span style={{fontSize: 13, fontWeight: 500}}>Acompanhamento</span>
          <span className="obs-pill" style={{color:'#c4e88f', marginLeft:'auto'}}>● ATIVO</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 12, padding: '12px 0', borderTop:'1px solid rgba(244,241,236,0.06)'}}>
          <div style={{width: 36, height: 36, borderRadius: 10, background:'linear-gradient(135deg, #f5c14d44, #e0734a44)', border:'1px solid rgba(245,193,77,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600, color:'#f5c14d'}}>MV</div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, fontWeight: 500}}>Dra. Marina Vidal</div>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>NUTRICIONISTA · há 28d</div>
          </div>
          <button className="obs-btn-ghost" style={{padding: '8px 12px', fontSize: 11}}>Mensagens</button>
        </div>
      </div>

      {/* Settings rows */}
      <div className="obs-eyebrow" style={{marginBottom: 8}}>Ajustes</div>
      <div className="obs-glass" style={{padding: 0, marginBottom: 14, overflow:'hidden'}}>
        {[
          {l:'Ajustar meta calórica', s:'2.100 kcal/dia', i: IcoO2.edit},
          {l:'Macronutrientes', s:'150 / 220 / 70 g', i: IcoO2.edit},
          {l:'Refazer onboarding', s:'recalcular pelo Mifflin', i: IcoO2.copy},
          {l:'Chave da IA Gemini', s:'AIza••••5j2k · ativa', i: IcoO2.eye, hl: true},
        ].map((r,i)=>(
          <div key={i} style={{padding: 14, display:'flex', alignItems:'center', gap: 12, borderBottom: i<3?'1px solid rgba(244,241,236,0.04)':'none'}}>
            <div style={{width: 32, height: 32, borderRadius: 9, background:'rgba(244,241,236,0.03)', border:'1px solid rgba(244,241,236,0.06)', display:'flex', alignItems:'center', justifyContent:'center', color: r.hl?'#f5c14d':'rgba(244,241,236,0.6)'}}>{r.i}</div>
            <div style={{flex: 1}}>
              <div style={{fontSize: 13, fontWeight: 500}}>{r.l}</div>
              <div className="obs-mono" style={{fontSize: 10, color: r.hl?'#c4e88f':'rgba(244,241,236,0.5)', marginTop: 2}}>{r.s}</div>
            </div>
            <span style={{color:'rgba(244,241,236,0.3)'}}>›</span>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <button style={{width:'100%', padding: '14px', background:'rgba(224,115,74,0.06)', border:'1px solid rgba(224,115,74,0.2)', borderRadius: 14, color:'#e0734a', fontSize: 12, fontWeight: 500, display:'flex', alignItems:'center', justifyContent:'center', gap: 8, cursor:'pointer', fontFamily:'Geist'}}>
        {IcoO2.trash} Apagar todos os dados
      </button>
    </div>

    <ObsBottomNav active="profile"/>
  </div>
);

// --- 10. FOOD SEARCH ---
const ObsidianFoodSearch = () => (
  <div className="obs-root">
    <header style={{padding: '18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.back}</button>
      <div style={{textAlign:'center'}}>
        <div className="obs-eyebrow">Tabela TBCA · 5k itens</div>
        <div style={{fontSize: 14, fontWeight: 500, marginTop: 2}}>Buscar alimento</div>
      </div>
      <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.more}</button>
    </header>

    <div style={{padding: '8px 24px 12px'}}>
      <div className="obs-glass" style={{padding: '12px 16px', display:'flex', alignItems:'center', gap: 10}}>
        {Ico.search}
        <input type="text" defaultValue="iogurte" style={{flex: 1, background:'transparent', border:'none', color:'#f4f1ec', fontFamily:'Geist', fontSize: 14, outline:'none'}}/>
        <span className="obs-mono" style={{fontSize: 9, color:'#f5c14d', padding: '2px 6px', background:'rgba(245,193,77,0.1)', borderRadius: 4, letterSpacing:'0.06em'}}>12 RES.</span>
      </div>
    </div>

    <div className="obs-scroll" style={{padding: '0 24px 14px'}}>
      <div className="obs-eyebrow" style={{marginBottom: 10}}>Categorias rápidas</div>
      <div style={{display:'flex', gap: 6, marginBottom: 18, overflowX:'auto'}}>
        {['Tudo','Laticínios','Cereais','Frutas','Carnes','Bebidas'].map((c,i)=>(
          <button key={c} style={{padding:'6px 12px', borderRadius: 999, background: i===1?'rgba(245,193,77,0.12)':'transparent', border: i===1?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(244,241,236,0.08)', color: i===1?'#f5c14d':'rgba(244,241,236,0.6)', fontSize: 11, fontWeight: 500, cursor:'pointer', whiteSpace:'nowrap'}}>{c}</button>
        ))}
      </div>

      <div className="obs-eyebrow" style={{marginBottom: 10}}>Resultados · "iogurte"</div>

      {[
        {n:'Iogurte grego natural', q:'100g', kcal: 97, p: 9, c: 4, f: 5, src:'TBCA'},
        {n:'Iogurte natural integral', q:'100g', kcal: 61, p: 4, c: 5, f: 3, src:'TBCA'},
        {n:'Iogurte desnatado', q:'100g', kcal: 41, p: 4, c: 5, f: 0.1, src:'TBCA'},
        {n:'Iogurte com mel', q:'170g', kcal: 175, p: 5, c: 28, f: 4, src:'Marca'},
        {n:'Iogurte de coco vegano', q:'120g', kcal: 142, p: 1, c: 12, f: 9, src:'TBCA'},
        {n:'Iogurte grego sabor mel', q:'120g', kcal: 165, p: 9, c: 18, f: 6, src:'Marca'},
      ].map((it,i)=>(
        <div key={i} className="obs-glass" style={{padding: 14, marginBottom: 6, display:'flex', alignItems:'center', gap: 12}}>
          <div style={{width: 38, height: 38, borderRadius: 10, background:'linear-gradient(135deg, rgba(196,232,143,0.15), rgba(141,167,196,0.1))', border:'1px solid rgba(244,241,236,0.04)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{width: 16, height: 20, borderRadius:'2px 2px 8px 8px', background:'rgba(244,241,236,0.5)'}}/>
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{it.n}</div>
            <div style={{display:'flex', gap: 10, marginTop: 4}} className="obs-mono">
              <span style={{fontSize: 10, color:'rgba(244,241,236,0.4)'}}>{it.q}</span>
              <span style={{fontSize: 10, color:'#ff8e7e'}}>P{it.p}</span>
              <span style={{fontSize: 10, color:'#c4e88f'}}>C{it.c}</span>
              <span style={{fontSize: 10, color:'#f5c14d'}}>G{it.f}</span>
            </div>
          </div>
          <div className="obs-mono" style={{textAlign:'right'}}>
            <div style={{fontSize: 14, fontWeight: 500}}>{it.kcal}</div>
            <div style={{fontSize: 9, color:'rgba(244,241,236,0.4)'}}>kcal</div>
          </div>
          <button style={{width: 26, height: 26, borderRadius: 8, background:'rgba(245,193,77,0.1)', border:'1px solid rgba(245,193,77,0.25)', color:'#f5c14d', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>{Ico.plus}</button>
        </div>
      ))}
    </div>
  </div>
);

// --- 11. RECIPE DETAIL ---
const ObsidianRecipeDetail = () => (
  <div className="obs-root">
    {/* Hero image */}
    <div style={{height: 260, position:'relative', overflow:'hidden', background:'linear-gradient(135deg, rgba(196,232,143,0.2), rgba(245,193,77,0.15))'}}>
      <div style={{position:'absolute', inset: 0, background:'radial-gradient(60% 50% at 50% 50%, rgba(255,142,126,0.3), transparent 70%)'}}/>
      <div style={{position:'absolute', left:'30%', top:'30%', width: 120, height: 100, borderRadius:'45%', background:'linear-gradient(140deg, #d97a5f, #a14826)', boxShadow:'0 18px 36px rgba(0,0,0,0.4)'}}/>
      <div style={{position:'absolute', left:'52%', top:'42%', width: 90, height: 78, borderRadius:'45%', background:'linear-gradient(140deg, #c4e88f, #6b8a3c)', boxShadow:'0 18px 36px rgba(0,0,0,0.4)'}}/>
      <div style={{position:'absolute', left:'42%', top:'55%', width: 70, height: 60, borderRadius:'50%', background:'linear-gradient(140deg, #d4d4c8, #a8a89a)', boxShadow:'0 18px 36px rgba(0,0,0,0.4)'}}/>

      <header style={{position:'absolute', top: 18, left: 20, right: 20, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backdropFilter:'blur(16px)'}}>{Ico.back}</button>
        <div style={{display:'flex', gap: 6}}>
          <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#f5c14d'}}>♡</button>
          <button className="obs-glass" style={{width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>{Ico.more}</button>
        </div>
      </header>

      <div style={{position:'absolute', bottom: 18, left: 20, display:'flex', gap: 6}}>
        <span className="obs-mono" style={{padding:'3px 10px', borderRadius: 6, background:'rgba(10,10,12,0.7)', backdropFilter:'blur(8px)', fontSize: 9, letterSpacing:'0.1em', textTransform:'uppercase', color:'#f5c14d', border:'1px solid rgba(245,193,77,0.3)'}}>IA · IA Slimo</span>
        <span className="obs-mono" style={{padding:'3px 10px', borderRadius: 6, background:'rgba(10,10,12,0.7)', backdropFilter:'blur(8px)', fontSize: 9, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(244,241,236,0.8)'}}>Almoço</span>
      </div>
    </div>

    <div className="obs-scroll" style={{padding: '20px 24px 14px'}}>
      <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', lineHeight: 1.15, marginBottom: 8}}>
        Salmão grelhado com purê de couve-flor
      </h1>
      <div style={{display:'flex', gap: 14, marginBottom: 22}}>
        <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 11, color:'rgba(244,241,236,0.55)'}}>{IcoO2.clock} 28 min</div>
        <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 11, color:'rgba(244,241,236,0.55)'}}>{Ico.user} 2 porções</div>
      </div>

      {/* Macros block */}
      <div className="obs-glass" style={{padding: 18, marginBottom: 18}}>
        <div className="obs-eyebrow" style={{marginBottom: 14}}>Por porção</div>
        <div style={{display: 'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14}}>
          <div>
            <div className="obs-mono" style={{fontSize: 22, fontWeight: 500}}>480</div>
            <div className="obs-eyebrow" style={{fontSize: 9, marginTop: 2}}>kcal</div>
          </div>
          <div>
            <div className="obs-mono" style={{fontSize: 22, fontWeight: 500, color:'#ff8e7e'}}>42g</div>
            <div className="obs-eyebrow" style={{fontSize: 9, marginTop: 2}}>proteína</div>
          </div>
          <div>
            <div className="obs-mono" style={{fontSize: 22, fontWeight: 500, color:'#c4e88f'}}>18g</div>
            <div className="obs-eyebrow" style={{fontSize: 9, marginTop: 2}}>carbo</div>
          </div>
          <div>
            <div className="obs-mono" style={{fontSize: 22, fontWeight: 500, color:'#f5c14d'}}>24g</div>
            <div className="obs-eyebrow" style={{fontSize: 9, marginTop: 2}}>gordura</div>
          </div>
        </div>
        <div style={{display:'flex', gap: 4, height: 4, borderRadius: 2, overflow:'hidden'}}>
          <div style={{flex: 35, background:'#ff8e7e'}}/>
          <div style={{flex: 18, background:'#c4e88f'}}/>
          <div style={{flex: 24, background:'#f5c14d'}}/>
        </div>
      </div>

      {/* Ingredients */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10}}>
        <h3 style={{fontSize: 15, fontWeight: 500}}>Ingredientes</h3>
        <div className="obs-glass" style={{padding:'4px 10px', display:'flex', alignItems:'center', gap: 8, fontSize: 11}}>
          <span style={{color:'rgba(244,241,236,0.5)'}}>2 porções</span>
          <div style={{display:'flex', gap: 2}}>
            <button style={{width: 18, height: 18, borderRadius: 5, background:'rgba(244,241,236,0.05)', color:'#f4f1ec', border:'none', cursor:'pointer'}}>−</button>
            <button style={{width: 18, height: 18, borderRadius: 5, background:'#f5c14d', color:'#1a1408', border:'none', cursor:'pointer', fontWeight: 600}}>+</button>
          </div>
        </div>
      </div>

      <div className="obs-glass" style={{padding: 0, marginBottom: 18, overflow:'hidden'}}>
        {[
          {q:'2 filés', n:'Salmão fresco (300g)'},
          {q:'1 unidade', n:'Couve-flor pequena'},
          {q:'2 dentes', n:'Alho amassado'},
          {q:'1 c.s', n:'Azeite extra-virgem'},
          {q:'A gosto', n:'Sal rosa & pimenta-do-reino'},
          {q:'1/2 limão', n:'Para finalização'},
        ].map((it, i) => (
          <div key={i} style={{padding: '12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: i<5?'1px solid rgba(244,241,236,0.04)':'none'}}>
            <div style={{display:'flex', alignItems:'center', gap: 10}}>
              <div style={{width: 16, height: 16, borderRadius: 5, border:'1.5px solid rgba(244,241,236,0.2)'}}/>
              <span style={{fontSize: 13}}>{it.n}</span>
            </div>
            <span className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)'}}>{it.q}</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10}}>
        <h3 style={{fontSize: 15, fontWeight: 500}}>Modo de preparo</h3>
        <span className="obs-eyebrow">4 PASSOS</span>
      </div>

      {[
        'Tempere os filés de salmão com sal, pimenta e suco de limão. Reserve por 10 minutos.',
        'Cozinhe a couve-flor em água com sal até ficar macia (~12 min). Escorra bem.',
        'Em uma frigideira quente, doure o salmão com pele 3 min de cada lado.',
        'Bata a couve-flor com alho e azeite até virar um purê cremoso. Sirva.',
      ].map((p,i)=>(
        <div key={i} className="obs-glass" style={{padding: 14, marginBottom: 8, display:'flex', gap: 12}}>
          <div className="obs-mono" style={{width: 24, height: 24, borderRadius: 8, background:'rgba(245,193,77,0.1)', color:'#f5c14d', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600, flexShrink: 0, border:'1px solid rgba(245,193,77,0.25)'}}>{i+1}</div>
          <div style={{fontSize: 12, lineHeight: 1.6, color:'rgba(244,241,236,0.85)'}}>{p}</div>
        </div>
      ))}

      <div style={{display:'flex', gap: 8, marginTop: 14}}>
        <button className="obs-btn-ghost" style={{flex: 1}}>Salvar</button>
        <button className="obs-btn-primary" style={{flex: 2, justifyContent:'center', display:'flex', alignItems:'center', gap: 8}}>
          Adicionar ao diário {Ico.arrow}
        </button>
      </div>
    </div>
  </div>
);

// =========================================================
// ADMIN EXTRAS
// =========================================================

const ObsidianAdminUsers = () => (
  <div className="obs-admin">
    <ObsSidebar active="users"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div>
          <div className="obs-eyebrow">4.218 cadastros · +12.4% no mês</div>
          <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 4}}>Usuários</h1>
        </div>
        <div style={{display:'flex', gap: 8}}>
          <button className="obs-btn-ghost">Exportar CSV</button>
          <button className="obs-btn-primary">+ Convidar</button>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '20px 32px'}}>
        {/* Filter row */}
        <div style={{display:'flex', gap: 8, alignItems:'center', marginBottom: 18}}>
          <div className="obs-glass" style={{padding: '10px 14px', flex: 1, display:'flex', alignItems:'center', gap: 10, fontSize: 12, color:'rgba(244,241,236,0.6)'}}>
            {Ico.search}
            <span>Pesquisar nome, e-mail, ID...</span>
          </div>
          {['Todos · 4218', 'Premium · 1084', 'Trial · 312', 'Free · 2822', 'Vinculados · 612'].map((c,i)=>(
            <button key={c} style={{padding:'8px 12px', borderRadius: 8, background: i===0?'rgba(245,193,77,0.12)':'rgba(244,241,236,0.03)', border: i===0?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(244,241,236,0.08)', color: i===0?'#f5c14d':'rgba(244,241,236,0.6)', fontSize: 11, fontWeight: 500, cursor:'pointer', whiteSpace:'nowrap'}}>{c}</button>
          ))}
        </div>

        {/* Table */}
        <div className="obs-glass" style={{padding: 0, overflow:'hidden'}}>
          <table className="obs-table">
            <thead><tr>
              <th style={{width: 26}}><input type="checkbox"/></th>
              <th>Usuário</th>
              <th>ID</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Profissional</th>
              <th>kcal/dia</th>
              <th>Última atividade</th>
              <th>Cadastro</th>
              <th style={{textAlign:'right'}}>—</th>
            </tr></thead>
            <tbody>
              {[
                {n:'Camila Rocha', e:'camila@email.com', id:'#4218', plan:'PREMIUM ANUAL', pc:'#f5c14d', stat:'Ativo', sc:'#c4e88f', pro:'Dra. M. Vidal', kcal:'1.700', last:'há 2 min', reg:'12 mai'},
                {n:'Roberto Lemos', e:'roberto@gmail.com', id:'#4217', plan:'PREMIUM MENSAL', pc:'#f5c14d', stat:'Ativo', sc:'#c4e88f', pro:'PT D. Santos', kcal:'2.450', last:'há 14 min', reg:'08 mai'},
                {n:'Anna Beatriz', e:'anna.b@outlook.com', id:'#4214', plan:'PREMIUM ANUAL', pc:'#f5c14d', stat:'Ativo', sc:'#c4e88f', pro:'—', kcal:'1.580', last:'há 38 min', reg:'02 mai'},
                {n:'Lucas Tavares', e:'lucastavares@gmail.com', id:'#4209', plan:'TRIAL EXPIRADO', pc:'#e0734a', stat:'Inativo', sc:'#e0734a', pro:'—', kcal:'2.100', last:'há 18 dias', reg:'19 abr'},
                {n:'Marcela Ito', e:'marcela.ito@me.com', id:'#4205', plan:'PREMIUM MENSAL', pc:'#f5c14d', stat:'Ativo', sc:'#c4e88f', pro:'Dra. M. Vidal', kcal:'1.420', last:'há 1h 23m', reg:'14 abr'},
                {n:'Pedro Hauer', e:'pedrohauer@gmail.com', id:'#4198', plan:'FREE', pc:'rgba(244,241,236,0.4)', stat:'Ativo', sc:'#c4e88f', pro:'—', kcal:'2.350', last:'há 2h', reg:'02 abr'},
                {n:'Bianca Costa', e:'biancosta@uol.com.br', id:'#4192', plan:'TRIAL · 4d', pc:'#8da7c4', stat:'Em trial', sc:'#8da7c4', pro:'—', kcal:'1.890', last:'há 5h', reg:'22 mai'},
                {n:'Felipe Brandão', e:'fbrandao@gmail.com', id:'#4188', plan:'PREMIUM ANUAL', pc:'#f5c14d', stat:'Ativo', sc:'#c4e88f', pro:'PT A. Borges', kcal:'2.780', last:'ontem', reg:'18 mar'},
                {n:'Júlia Albuquerque', e:'jualbu@gmail.com', id:'#4181', plan:'FREE', pc:'rgba(244,241,236,0.4)', stat:'Ativo', sc:'#c4e88f', pro:'—', kcal:'1.950', last:'há 3 dias', reg:'01 mar'},
                {n:'Diogo Marques', e:'diogom@email.com', id:'#4179', plan:'PREMIUM MENSAL', pc:'#f5c14d', stat:'Ativo', sc:'#c4e88f', pro:'Dr. C. Nutri', kcal:'2.200', last:'há 6h', reg:'28 fev'},
              ].map((r,i)=>(
                <tr key={i}>
                  <td><input type="checkbox"/></td>
                  <td><div style={{display:'flex', alignItems:'center', gap: 10}}>
                    <div style={{width: 32, height: 32, borderRadius:'50%', background:'linear-gradient(135deg, #f5c14d33, #e0734a33)', border:'1px solid rgba(245,193,77,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600, color:'#f5c14d'}}>{r.n.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
                    <div>
                      <div style={{fontWeight: 500}}>{r.n}</div>
                      <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 1}}>{r.e}</div>
                    </div>
                  </div></td>
                  <td className="obs-mono" style={{color:'rgba(244,241,236,0.5)', fontSize: 11}}>{r.id}</td>
                  <td><span className="obs-pill" style={{color: r.pc}}>{r.plan}</span></td>
                  <td><span className="obs-mono" style={{fontSize: 11, color: r.sc}}>● {r.stat}</span></td>
                  <td style={{color:'rgba(244,241,236,0.7)', fontSize: 12}}>{r.pro}</td>
                  <td className="obs-mono" style={{color:'#f5c14d'}}>{r.kcal}</td>
                  <td className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)'}}>{r.last}</td>
                  <td className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)'}}>{r.reg}</td>
                  <td style={{textAlign:'right', color:'rgba(244,241,236,0.5)'}}>{Ico.more}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding: '14px 22px', borderTop:'1px solid rgba(244,241,236,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)', letterSpacing:'0.08em'}}>1–10 DE 4.218</span>
            <div style={{display:'flex', gap: 6}}>
              {['‹','1','2','3','...','422','›'].map((p,i)=>(
                <button key={i} style={{minWidth: 28, height: 28, padding: '0 6px', background: i===1?'rgba(245,193,77,0.12)':'transparent', color: i===1?'#f5c14d':'rgba(244,241,236,0.6)', border: i===1?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(244,241,236,0.06)', borderRadius: 6, fontSize: 11, fontFamily:'Geist Mono', cursor:'pointer'}}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);

const ObsidianAdminPlans = () => (
  <div className="obs-admin">
    <ObsSidebar active="plans"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div>
          <div className="obs-eyebrow">4 planos · MRR R$ 38.4k</div>
          <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 4}}>Planos Comerciais</h1>
        </div>
        <button className="obs-btn-primary">+ Criar plano</button>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 32px'}}>
        {/* Plan cards row */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14, marginBottom: 22}}>
          {[
            {id:'trial', n:'Trial', sub:'gratuito', price:'R$ 0', period:'7 dias', users: 312, ben:['Diário completo', 'Scanner IA limitado', 'Sem acompanhamento'], c:'#8da7c4', recom: false},
            {id:'mensal', n:'Premium', sub:'mensal', price:'R$ 29,90', period:'por mês', users: 442, ben:['Diário ilimitado', 'IA Gemini · scanner full', 'Acompanhamento profissional', 'Receitas semanais'], c:'#f5c14d', recom: true},
            {id:'anual', n:'Premium', sub:'anual · 35% off', price:'R$ 199,90', period:'por ano', users: 642, ben:['Tudo do mensal', 'Histórico ilimitado', 'Exportação PDF', '2 meses grátis'], c:'#e0734a', recom: false},
          ].map((p,i)=>(
            <div key={i} className="obs-glass" style={{padding: 22, position:'relative', border: p.recom?'1px solid rgba(245,193,77,0.3)':'1px solid rgba(255,250,240,0.07)'}}>
              {p.recom && <div style={{position:'absolute', top: -10, left: 22, padding:'3px 10px', borderRadius: 4, background:'#f5c14d', color:'#1a1408', fontSize: 9, fontWeight: 700, letterSpacing:'0.12em'}}>MAIS POPULAR</div>}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14}}>
                <div>
                  <div className="obs-eyebrow" style={{marginBottom: 4}}>{p.id.toUpperCase()}</div>
                  <h3 style={{fontSize: 18, fontWeight: 500, letterSpacing:'-0.01em'}}>{p.n}</h3>
                  <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>{p.sub}</div>
                </div>
                <div className="obs-pill" style={{color: p.c}}>{p.users} ativos</div>
              </div>
              <div style={{display:'flex', alignItems:'baseline', gap: 6, marginBottom: 16, paddingBottom: 16, borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
                <span className="obs-mono" style={{fontSize: 32, fontWeight: 500, color: p.c}}>{p.price}</span>
                <span className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)'}}>{p.period}</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap: 8, marginBottom: 18}}>
                {p.ben.map(b=>(
                  <div key={b} style={{display:'flex', alignItems:'center', gap: 8, fontSize: 12, color:'rgba(244,241,236,0.8)'}}>
                    <div style={{width: 16, height: 16, borderRadius:'50%', background: p.c+'22', border:`1px solid ${p.c}55`, display:'flex', alignItems:'center', justifyContent:'center', color: p.c, flexShrink: 0}}>{Ico.check}</div>
                    {b}
                  </div>
                ))}
              </div>
              <div style={{display:'flex', gap: 8}}>
                <button className="obs-btn-ghost" style={{flex: 1, fontSize: 12, padding: '10px'}}>Editar</button>
                <button style={{padding: '10px 12px', borderRadius: 12, background:'transparent', border:'1px solid rgba(224,115,74,0.2)', color:'#e0734a', cursor:'pointer'}}>{IcoO2.trash}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <div className="obs-glass" style={{padding: 24}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 18}}>
            <div>
              <div className="obs-eyebrow">Editando · plano "Premium Anual"</div>
              <h3 style={{fontSize: 17, fontWeight: 500, marginTop: 4}}>Configuração detalhada</h3>
            </div>
            <button className="obs-mono" style={{background:'none', border:'none', color:'rgba(244,241,236,0.5)', fontSize: 10, letterSpacing:'0.1em', cursor:'pointer'}}>+ NOVO PLANO →</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 12}}>
            {[
              {l:'Identificador (slug)', v:'anual', mono: true},
              {l:'Nome de exibição', v:'Premium Anual · 35% off'},
              {l:'Preço (R$)', v:'199,90', mono: true},
              {l:'Duração (dias)', v:'365', mono: true},
            ].map(f=>(
              <div key={f.l}>
                <div className="obs-eyebrow" style={{fontSize: 9, marginBottom: 6}}>{f.l}</div>
                <div style={{padding: '11px 14px', background:'rgba(244,241,236,0.03)', border:'1px solid rgba(244,241,236,0.08)', borderRadius: 10, fontSize: 13, fontFamily: f.mono?'Geist Mono':'Geist'}}>{f.v}</div>
              </div>
            ))}
            <div style={{gridColumn:'span 2'}}>
              <div className="obs-eyebrow" style={{fontSize: 9, marginBottom: 6}}>Descrição comercial</div>
              <div style={{padding: '11px 14px', background:'rgba(244,241,236,0.03)', border:'1px solid rgba(244,241,236,0.08)', borderRadius: 10, fontSize: 13, lineHeight: 1.5, color:'rgba(244,241,236,0.85)'}}>
                Acesso anual completo com 35% de desconto. Inclui scanner IA ilimitado, vinculação com nutricionista/personal e exportação PDF.
              </div>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <div className="obs-eyebrow" style={{fontSize: 9, marginBottom: 6}}>Benefícios · um por linha</div>
              <div style={{padding: '11px 14px', background:'rgba(244,241,236,0.03)', border:'1px solid rgba(244,241,236,0.08)', borderRadius: 10, fontSize: 13, lineHeight: 1.6, color:'rgba(244,241,236,0.85)', fontFamily:'Geist Mono'}}>
                Tudo do mensal<br/>
                Histórico ilimitado<br/>
                Exportação PDF<br/>
                2 meses grátis
              </div>
            </div>
          </div>
          <div style={{display:'flex', gap: 8, marginTop: 20, justifyContent:'flex-end'}}>
            <button className="obs-btn-ghost">Cancelar</button>
            <button className="obs-btn-primary">Salvar plano</button>
          </div>
        </div>
      </div>
    </main>
  </div>
);

const ObsidianAdminBilling = () => (
  <div className="obs-admin">
    <ObsSidebar active="billing"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div>
          <div className="obs-eyebrow">Janela · 01 mai → 26 mai 2026</div>
          <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 4}}>Faturamento & Comissões</h1>
        </div>
        <div style={{display:'flex', gap: 8}}>
          <div className="obs-glass" style={{padding: '8px 14px', display:'flex', alignItems:'center', gap: 8, fontSize: 12}}>
            <span style={{color:'rgba(244,241,236,0.5)'}}>Mês:</span>
            <span style={{fontWeight: 500}}>maio · 2026</span>
            <span style={{color:'rgba(244,241,236,0.4)'}}>›</span>
          </div>
          <button className="obs-btn-ghost">Exportar relatório</button>
        </div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 32px'}}>
        {/* Top KPIs */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14, marginBottom: 22}}>
          {[
            {l:'Faturamento bruto', v:'R$ 38.412', d:'+18.2%', c:'#f5c14d', sub:'1.084 assinaturas'},
            {l:'Comissões pagas', v:'R$ 5.218', d:'13.6%', c:'#e0734a', sub:'para 28 profissionais'},
            {l:'Faturamento líquido', v:'R$ 33.194', d:'+19.4%', c:'#c4e88f', sub:'após repasses'},
            {l:'Ticket médio', v:'R$ 35.43', d:'−2.1%', c:'#8da7c4', sub:'mensal+anual'},
          ].map(s=>(
            <div key={s.l} className="obs-glass" style={{padding: 18}}>
              <div className="obs-eyebrow" style={{marginBottom: 14}}>{s.l}</div>
              <div className="obs-num-xl" style={{fontSize: 26, color: s.c}}>{s.v}</div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop: 12, paddingTop: 10, borderTop:'1px solid rgba(244,241,236,0.06)'}}>
                <span className="obs-mono" style={{fontSize: 11, color: s.d.startsWith('+') ? '#c4e88f' : (s.d.startsWith('−') ? '#e0734a' : 'rgba(244,241,236,0.5)')}}>{s.d}</span>
                <span className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)'}}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap: 14, marginBottom: 22}}>
          {/* Revenue chart */}
          <div className="obs-glass" style={{padding: 22}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 18}}>
              <div>
                <div className="obs-eyebrow">Faturamento diário · 26 dias</div>
                <div className="obs-num-xl" style={{fontSize: 24, marginTop: 6}}>R$ 1.478<span style={{fontSize: 12, color:'rgba(244,241,236,0.5)', marginLeft: 4}}>/dia · média</span></div>
              </div>
              <div className="obs-mono" style={{fontSize: 11, color:'rgba(244,241,236,0.5)'}}>fonte · Mercado Pago + Asaas</div>
            </div>
            <svg width="100%" height="180" viewBox="0 0 600 180">
              <defs>
                <linearGradient id="obsBillFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5c14d" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#f5c14d" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[0,1,2,3].map(i=>(<line key={i} x1="0" x2="600" y1={i*40+20} y2={i*40+20} stroke="rgba(244,241,236,0.04)"/>))}
              {/* Bars: simulate daily revenue */}
              {Array.from({length: 26}).map((_,i)=>{
                const v = 40 + Math.sin(i/3) * 25 + (i / 26) * 30 + (i % 4 === 0 ? 12 : 0);
                return <rect key={i} x={i*22 + 8} y={170 - v} width="16" height={v} fill={i===25?'#f5c14d':'rgba(245,193,77,0.4)'} rx="2"/>;
              })}
              {/* Trend line */}
              <path d={Array.from({length: 26}).map((_,i)=>{
                const v = 40 + Math.sin(i/3) * 25 + (i / 26) * 30 + (i % 4 === 0 ? 12 : 0);
                return `${i===0?'M':'L'}${i*22+16},${170-v}`;
              }).join(' ')} fill="none" stroke="#e0734a" strokeWidth="1.5"/>
            </svg>
          </div>

          {/* Commissions distribution */}
          <div className="obs-glass" style={{padding: 22}}>
            <div className="obs-eyebrow" style={{marginBottom: 14}}>Top comissionados · mai</div>
            {[
              {n:'Dra. Marina Vidal', v:'R$ 935,18', p: 100, c:'#f5c14d'},
              {n:'PT Diego Santos', v:'R$ 877,72', p: 94, c:'#e0734a'},
              {n:'Dra. Renata Lopes', v:'R$ 558,24', p: 60, c:'#8da7c4'},
              {n:'Dr. Carlos Nutri', v:'R$ 409,44', p: 44, c:'#c4e88f'},
              {n:'Dra. Beatriz Cunha', v:'R$ 406,22', p: 43, c:'#f5c14d'},
            ].map(p=>(
              <div key={p.n} style={{marginBottom: 12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                  <span style={{fontSize: 11.5, color:'rgba(244,241,236,0.85)'}}>{p.n}</span>
                  <span className="obs-mono" style={{fontSize: 11, color: p.c, fontWeight: 500}}>{p.v}</span>
                </div>
                <div style={{height: 3, background:'rgba(244,241,236,0.06)', borderRadius: 2, overflow:'hidden'}}>
                  <div style={{height:'100%', width: `${p.p}%`, background: p.c}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="obs-glass" style={{padding: 0, overflow:'hidden'}}>
          <div style={{padding: '18px 22px', borderBottom:'1px solid rgba(244,241,236,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{fontSize: 14, fontWeight: 500}}>Transações recentes</h3>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', letterSpacing:'0.08em'}}>1.084 ESTE MÊS</div>
          </div>
          <table className="obs-table">
            <thead><tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Plano</th>
              <th>Gateway</th>
              <th>Profissional</th>
              <th style={{textAlign:'right'}}>Bruto</th>
              <th style={{textAlign:'right'}}>Comissão</th>
              <th style={{textAlign:'right'}}>Líquido</th>
              <th>Status</th>
            </tr></thead>
            <tbody>
              {[
                {t:'26 mai · 12:46', u:'Camila Rocha', pl:'Anual', g:'MP', pro:'M. Vidal', b:'R$ 199,90', c:'R$ 29,99', l:'R$ 169,91', s:'PAGO'},
                {t:'26 mai · 11:24', u:'Marcela Ito', pl:'Mensal', g:'MP', pro:'M. Vidal', b:'R$ 29,90', c:'R$ 4,49', l:'R$ 25,41', s:'PAGO'},
                {t:'26 mai · 09:18', u:'Lucas Aguiar', pl:'Anual', g:'Asaas', pro:'D. Santos', b:'R$ 199,90', c:'R$ 35,98', l:'R$ 163,92', s:'PAGO'},
                {t:'25 mai · 23:42', u:'Renan Caetano', pl:'Mensal', g:'MP', pro:'—', b:'R$ 29,90', c:'—', l:'R$ 29,90', s:'PAGO'},
                {t:'25 mai · 19:08', u:'Vanessa Pina', pl:'Anual', g:'Asaas', pro:'R. Lopes', b:'R$ 199,90', c:'R$ 27,99', l:'R$ 171,91', s:'PAGO'},
                {t:'25 mai · 14:52', u:'Bruno Mello', pl:'Mensal', g:'MP', pro:'M. Vidal', b:'R$ 29,90', c:'R$ 4,49', l:'R$ 25,41', s:'PENDENTE', warn: true},
              ].map((r,i)=>(
                <tr key={i}>
                  <td className="obs-mono" style={{color:'rgba(244,241,236,0.5)', fontSize: 11}}>{r.t}</td>
                  <td style={{fontWeight: 500}}>{r.u}</td>
                  <td><span className="obs-pill" style={{color:'#f5c14d', fontSize: 9}}>{r.pl}</span></td>
                  <td><span className="obs-mono" style={{fontSize: 11, color: r.g==='MP'?'#8da7c4':'#bf5af2'}}>{r.g}</span></td>
                  <td style={{color:'rgba(244,241,236,0.7)', fontSize: 12}}>{r.pro}</td>
                  <td className="obs-mono" style={{textAlign:'right', fontWeight: 500}}>{r.b}</td>
                  <td className="obs-mono" style={{textAlign:'right', color: r.c==='—'?'rgba(244,241,236,0.4)':'#e0734a'}}>{r.c}</td>
                  <td className="obs-mono" style={{textAlign:'right', fontWeight: 500, color:'#c4e88f'}}>{r.l}</td>
                  <td><span className="obs-pill" style={{color: r.warn?'#f5c14d':'#c4e88f'}}>● {r.s}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
);

const ObsidianAdminCredentials = () => (
  <div className="obs-admin">
    <ObsSidebar active="creds"/>
    <main style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <header style={{padding: '22px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(244,241,236,0.06)'}}>
        <div>
          <div className="obs-eyebrow">4 integrações ativas · auditado há 2h</div>
          <h1 style={{fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginTop: 4}}>Credenciais & Chaves</h1>
        </div>
        <div className="obs-pill" style={{color:'#c4e88f'}}>● TUDO OPERACIONAL</div>
      </header>

      <div style={{flex: 1, overflowY:'auto', padding: '24px 32px', maxWidth: 900}}>
        {/* Audit banner */}
        <div className="obs-glass" style={{padding: 18, marginBottom: 22, border:'1px solid rgba(245,193,77,0.2)', background:'linear-gradient(180deg, rgba(245,193,77,0.05), transparent)', display:'flex', alignItems:'center', gap: 14}}>
          <div style={{width: 38, height: 38, borderRadius: 11, background:'rgba(245,193,77,0.15)', border:'1px solid rgba(245,193,77,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c14d', flexShrink: 0}}>{Ico.shield}</div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, fontWeight: 500}}>Chaves armazenadas com criptografia AES-256 em system_settings</div>
            <div className="obs-mono" style={{fontSize: 10, color:'rgba(244,241,236,0.5)', marginTop: 2}}>nenhuma chave em variáveis de ambiente expostas · rotação manual</div>
          </div>
          <button className="obs-btn-ghost" style={{fontSize: 12}}>Ver log de auditoria</button>
        </div>

        {/* Credential rows */}
        {[
          {l:'Gemini API Key', desc:'IA Gemini · escaneamento de fotos e geração de receitas', v:'AIzaSy••••••••••••••5j2k', status:'Ativa', sc:'#c4e88f', last:'2 mai 2026', use:'12.4k chamadas/mês', logo: '✦', logoColor:'#f5c14d'},
          {l:'Google OAuth Client ID', desc:'Login social com Google · página de autenticação', v:'432891034****-apps.googleusercontent.com', status:'Ativa', sc:'#c4e88f', last:'15 abr 2026', use:'618 logins/mês', logo:'G', logoColor:'#8da7c4'},
          {l:'Mercado Pago · Access Token', desc:'Cobranças Pix e webhook de confirmação', v:'APP_USR-••••••••••••••a3f9', status:'Ativa', sc:'#c4e88f', last:'22 abr 2026', use:'742 cobranças/mês', logo:'$', logoColor:'#c4e88f'},
          {l:'Asaas · API Key', desc:'Gateway secundário · automação financeira', v:'$aaasaas_••••••••••••f1e8', status:'Atenção', sc:'#f5c14d', last:'há 92 dias', use:'118 cobranças/mês', logo:'A', logoColor:'#e0734a'},
        ].map((c,i)=>(
          <div key={i} className="obs-glass" style={{padding: 22, marginBottom: 12}}>
            <div style={{display:'flex', gap: 16, alignItems:'flex-start', marginBottom: 14}}>
              <div style={{width: 44, height: 44, borderRadius: 12, background: c.logoColor+'22', border:`1px solid ${c.logoColor}44`, display:'flex', alignItems:'center', justifyContent:'center', color: c.logoColor, fontSize: 18, fontWeight: 700, fontFamily:'Geist Mono', flexShrink: 0}}>{c.logo}</div>
              <div style={{flex: 1}}>
                <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 4}}>
                  <span style={{fontSize: 14, fontWeight: 500}}>{c.l}</span>
                  <span className="obs-pill" style={{color: c.sc, fontSize: 9}}>● {c.status.toUpperCase()}</span>
                </div>
                <div style={{fontSize: 12, color:'rgba(244,241,236,0.6)', lineHeight: 1.5}}>{c.desc}</div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 12}}>
              <div style={{flex: 1, padding: '11px 14px', background:'rgba(244,241,236,0.025)', border:'1px solid rgba(244,241,236,0.06)', borderRadius: 10, fontFamily:'Geist Mono', fontSize: 12, color:'rgba(244,241,236,0.85)'}}>{c.v}</div>
              <button className="obs-btn-ghost" style={{padding: '11px 12px'}}>{IcoO2.eye}</button>
              <button className="obs-btn-ghost" style={{padding: '11px 12px'}}>{IcoO2.copy}</button>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop: 14, borderTop:'1px solid rgba(244,241,236,0.04)'}}>
              <div style={{display:'flex', gap: 24}}>
                <div>
                  <div className="obs-eyebrow" style={{fontSize: 8, marginBottom: 2}}>Última rotação</div>
                  <div className="obs-mono" style={{fontSize: 11, color: c.status==='Atenção'?'#f5c14d':'#f4f1ec'}}>{c.last}</div>
                </div>
                <div>
                  <div className="obs-eyebrow" style={{fontSize: 8, marginBottom: 2}}>Uso atual</div>
                  <div className="obs-mono" style={{fontSize: 11}}>{c.use}</div>
                </div>
              </div>
              <div style={{display:'flex', gap: 6}}>
                <button style={{padding: '7px 12px', borderRadius: 8, background:'transparent', border:'1px solid rgba(244,241,236,0.08)', color:'rgba(244,241,236,0.7)', fontSize: 11, fontWeight: 500, cursor:'pointer'}}>Testar conexão</button>
                <button style={{padding: '7px 12px', borderRadius: 8, background:'rgba(245,193,77,0.1)', border:'1px solid rgba(245,193,77,0.25)', color:'#f5c14d', fontSize: 11, fontWeight: 500, cursor:'pointer'}}>Rotacionar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);

Object.assign(window, {
  ObsidianLogin, ObsidianFasting, ObsidianProfile, ObsidianFoodSearch, ObsidianRecipeDetail,
  ObsidianAdminUsers, ObsidianAdminPlans, ObsidianAdminBilling, ObsidianAdminCredentials,
});
