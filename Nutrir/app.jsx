// Obsidian — focused canvas with Tweaks panel
// Card style: glass / solid / outline
// Density: compact / regular / spacious

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardStyle": "glass",
  "density": "regular",
  "accent": "amber",
  "grain": true
}/*EDITMODE-END*/;

// ---------- Style applier ----------
// Applies CSS variables to :root based on tweaks so every Obsidian artboard
// reacts in lockstep (one canvas, many cards).
const applyObsidianTweaks = (t) => {
  const root = document.documentElement;

  // Card style
  if (t.cardStyle === 'glass') {
    root.style.setProperty('--obs-card-bg', 'rgba(255,250,240,0.035)');
    root.style.setProperty('--obs-card-border', 'rgba(255,250,240,0.07)');
    root.style.setProperty('--obs-card-blur', '20px');
  } else if (t.cardStyle === 'solid') {
    root.style.setProperty('--obs-card-bg', '#15151a');
    root.style.setProperty('--obs-card-border', 'rgba(255,250,240,0.04)');
    root.style.setProperty('--obs-card-blur', '0px');
  } else {
    // outline
    root.style.setProperty('--obs-card-bg', 'transparent');
    root.style.setProperty('--obs-card-border', 'rgba(255,250,240,0.16)');
    root.style.setProperty('--obs-card-blur', '0px');
  }

  // Density tweak applies as a class on body
  document.body.dataset.obsDensity = t.density;
  document.body.dataset.obsAccent = t.accent;
  document.body.dataset.obsGrain = t.grain ? 'on' : 'off';
};

// Inject density/accent/grain CSS once
(() => {
  if (document.getElementById('obs-tweak-styles')) return;
  const s = document.createElement('style');
  s.id = 'obs-tweak-styles';
  s.textContent = `
    body[data-obs-density="compact"] .obs-root .obs-scroll,
    body[data-obs-density="compact"] .obs-admin .obs-scroll { padding-top: 4px; padding-bottom: 8px; }
    body[data-obs-density="compact"] .obs-glass { padding-block: 12px !important; }
    body[data-obs-density="spacious"] .obs-glass { padding-block: 24px !important; }

    body[data-obs-accent="coral"] {
      --obs-accent-1: #ff8e7e;
      --obs-accent-2: #d4577a;
    }
    body[data-obs-accent="sage"] {
      --obs-accent-1: #c4e88f;
      --obs-accent-2: #8da7c4;
    }
    body[data-obs-accent="amber"] {
      --obs-accent-1: #f5c14d;
      --obs-accent-2: #e0734a;
    }

    body[data-obs-grain="off"] .obs-root::after { display: none; }
  `;
  document.head.appendChild(s);
})();

// ---------- Main canvas ----------
const NutrirObsidian = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyObsidianTweaks(t); }, [t.cardStyle, t.density, t.accent, t.grain]);

  return (
    <>
      <DesignCanvas>
        <DCSection
          id="obs-intro"
          title="01 · Obsidian"
          subtitle="Direção escolhida — Vidro caloroso. Âmbar profundo, mono numérico, hairlines. Apresentando 11 telas mobile + 7 telas do painel. Use o painel de Tweaks (canto inferior direito) para alternar estilo de cards, densidade e paleta de acentos."
        />

        <DCSection id="obs-app-flow" title="App · Fluxo do usuário" subtitle="Login → Onboarding → Diário → Scanner → Resultado">
          <DCArtboard id="obs-login" label="Login" width={390} height={780}>
            <ObsidianLogin/>
          </DCArtboard>
          <DCArtboard id="obs-onboarding" label="Onboarding" width={390} height={780}>
            <ObsidianOnboarding/>
          </DCArtboard>
          <DCArtboard id="obs-dashboard" label="Dashboard" width={390} height={780}>
            <ObsidianDashboard/>
          </DCArtboard>
          <DCArtboard id="obs-scanner" label="Scanner IA" width={390} height={780}>
            <ObsidianScanner/>
          </DCArtboard>
          <DCArtboard id="obs-result" label="Análise" width={390} height={780}>
            <ObsidianResult/>
          </DCArtboard>
        </DCSection>

        <DCSection id="obs-app-features" title="App · Telas de feature" subtitle="Receitas, Histórico, Jejum, Busca, Detalhe, Perfil">
          <DCArtboard id="obs-recipes" label="Receitas IA" width={390} height={780}>
            <ObsidianRecipes/>
          </DCArtboard>
          <DCArtboard id="obs-recipe-detail" label="Receita · detalhe" width={390} height={780}>
            <ObsidianRecipeDetail/>
          </DCArtboard>
          <DCArtboard id="obs-food-search" label="Buscar alimento" width={390} height={780}>
            <ObsidianFoodSearch/>
          </DCArtboard>
          <DCArtboard id="obs-fasting" label="Jejum 14:10" width={390} height={780}>
            <ObsidianFasting/>
          </DCArtboard>
          <DCArtboard id="obs-history" label="Histórico" width={390} height={780}>
            <ObsidianHistory/>
          </DCArtboard>
          <DCArtboard id="obs-profile" label="Perfil" width={390} height={780}>
            <ObsidianProfile/>
          </DCArtboard>
        </DCSection>

        <DCSection id="obs-admin-main" title="Admin · Operações" subtitle="Painel principal para administradores">
          <DCArtboard id="obs-admin-overview" label="Visão Geral" width={1280} height={820}>
            <ObsidianAdminOverview/>
          </DCArtboard>
          <DCArtboard id="obs-admin-users" label="Usuários" width={1280} height={820}>
            <ObsidianAdminUsers/>
          </DCArtboard>
          <DCArtboard id="obs-admin-pros" label="Profissionais" width={1280} height={820}>
            <ObsidianAdminPros/>
          </DCArtboard>
        </DCSection>

        <DCSection id="obs-admin-config" title="Admin · Configuração & negócio" subtitle="Planos, faturamento e credenciais">
          <DCArtboard id="obs-admin-plans" label="Planos" width={1280} height={820}>
            <ObsidianAdminPlans/>
          </DCArtboard>
          <DCArtboard id="obs-admin-billing" label="Faturamento" width={1280} height={820}>
            <ObsidianAdminBilling/>
          </DCArtboard>
          <DCArtboard id="obs-admin-credentials" label="Credenciais" width={1280} height={820}>
            <ObsidianAdminCredentials/>
          </DCArtboard>
        </DCSection>

        <DCSection id="obs-admin-pro" title="Admin · Visão do profissional" subtitle="Como nutricionistas e personal trainers veem o painel">
          <DCArtboard id="obs-admin-patient" label="Detalhe do paciente" width={1280} height={820}>
            <ObsidianAdminPatient/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Obsidian · Tweaks">
        <TweakSection label="Visual"/>
        <TweakRadio
          label="Cards"
          value={t.cardStyle}
          options={['glass','solid','outline']}
          onChange={(v)=>setTweak('cardStyle', v)}
        />
        <TweakRadio
          label="Densidade"
          value={t.density}
          options={['compact','regular','spacious']}
          onChange={(v)=>setTweak('density', v)}
        />
        <TweakSection label="Paleta"/>
        <TweakRadio
          label="Acento"
          value={t.accent}
          options={['amber','coral','sage']}
          onChange={(v)=>setTweak('accent', v)}
        />
        <TweakToggle
          label="Grain de fundo"
          value={t.grain}
          onChange={(v)=>setTweak('grain', v)}
        />
        <div style={{padding:'10px 0 2px', fontSize:10, color:'rgba(41,38,27,0.5)', lineHeight: 1.5}}>
          Veja também <a href="explorations.html" style={{color:'#c96442', textDecoration:'underline'}}>3 direções comparadas</a>.
        </div>
      </TweaksPanel>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NutrirObsidian/>);
