// Main app: assembles the design canvas with all three variations.

const NutrirCanvas = () => {
  return (
    <DesignCanvas>
      {/* ====================== OBSIDIAN ====================== */}
      <DCSection
        id="obsidian-intro"
        title="01 · Obsidian"
        subtitle="Vidro caloroso. Âmbar profundo, mono numérico, hairlines. Premium relaxado — Linear encontra Apple Health no escuro."
      >
        <DCArtboard id="obs-onboarding" label="Onboarding" width={390} height={780}>
          <ObsidianOnboarding />
        </DCArtboard>
        <DCArtboard id="obs-dashboard" label="Dashboard" width={390} height={780}>
          <ObsidianDashboard />
        </DCArtboard>
        <DCArtboard id="obs-scanner" label="Scanner + IA" width={390} height={780}>
          <ObsidianScanner />
        </DCArtboard>
        <DCArtboard id="obs-result" label="Resultado" width={390} height={780}>
          <ObsidianResult />
        </DCArtboard>
        <DCArtboard id="obs-recipes" label="Receitas IA" width={390} height={780}>
          <ObsidianRecipes />
        </DCArtboard>
        <DCArtboard id="obs-history" label="Histórico" width={390} height={780}>
          <ObsidianHistory />
        </DCArtboard>
      </DCSection>

      <DCSection id="obsidian-admin" title="01 · Obsidian — Painel" subtitle="Backoffice no mesmo idioma visual">
        <DCArtboard id="obs-admin-overview" label="Visão Geral" width={1280} height={820}>
          <ObsidianAdminOverview />
        </DCArtboard>
        <DCArtboard id="obs-admin-pros" label="Profissionais" width={1280} height={820}>
          <ObsidianAdminPros />
        </DCArtboard>
        <DCArtboard id="obs-admin-patient" label="Detalhe do Paciente" width={1280} height={820}>
          <ObsidianAdminPatient />
        </DCArtboard>
      </DCSection>

      {/* ====================== SPECTRA ====================== */}
      <DCSection
        id="spectra-intro"
        title="02 · Spectra"
        subtitle="Precisão clínica. Cartreuse elétrico, cyan e magenta de dados. Cards sólidos, ruler-marks, JetBrains Mono. Bloomberg terminal de nutrição."
      >
        <DCArtboard id="spc-onboarding" label="Onboarding" width={390} height={780}>
          <SpectraOnboarding />
        </DCArtboard>
        <DCArtboard id="spc-dashboard" label="Dashboard" width={390} height={780}>
          <SpectraDashboard />
        </DCArtboard>
        <DCArtboard id="spc-scanner" label="Scanner + IA" width={390} height={780}>
          <SpectraScanner />
        </DCArtboard>
        <DCArtboard id="spc-result" label="Resultado" width={390} height={780}>
          <SpectraResult />
        </DCArtboard>
        <DCArtboard id="spc-recipes" label="Receitas IA" width={390} height={780}>
          <SpectraRecipes />
        </DCArtboard>
        <DCArtboard id="spc-history" label="Histórico" width={390} height={780}>
          <SpectraHistory />
        </DCArtboard>
      </DCSection>

      <DCSection id="spectra-admin" title="02 · Spectra — Painel" subtitle="Dashboard analítico maximalista de dados">
        <DCArtboard id="spc-admin-overview" label="Visão Geral" width={1280} height={820}>
          <SpectraAdminOverview />
        </DCArtboard>
        <DCArtboard id="spc-admin-pros" label="Profissionais" width={1280} height={820}>
          <SpectraAdminPros />
        </DCArtboard>
        <DCArtboard id="spc-admin-patient" label="Detalhe do Paciente" width={1280} height={820}>
          <SpectraAdminPatient />
        </DCArtboard>
      </DCSection>

      {/* ====================== AURORA ====================== */}
      <DCSection
        id="aurora-intro"
        title="03 · Aurora"
        subtitle="Editorial premium. Iridescência rosa→azul, dourado-champanhe, fundo violeta-quase-preto. Tipografia display. Cards outline com sombras coloridas."
      >
        <DCArtboard id="aur-onboarding" label="Onboarding" width={390} height={780}>
          <AuroraOnboarding />
        </DCArtboard>
        <DCArtboard id="aur-dashboard" label="Dashboard" width={390} height={780}>
          <AuroraDashboard />
        </DCArtboard>
        <DCArtboard id="aur-scanner" label="Scanner + IA" width={390} height={780}>
          <AuroraScanner />
        </DCArtboard>
        <DCArtboard id="aur-result" label="Resultado" width={390} height={780}>
          <AuroraResult />
        </DCArtboard>
        <DCArtboard id="aur-recipes" label="Receitas IA" width={390} height={780}>
          <AuroraRecipes />
        </DCArtboard>
        <DCArtboard id="aur-history" label="Histórico" width={390} height={780}>
          <AuroraHistory />
        </DCArtboard>
      </DCSection>

      <DCSection id="aurora-admin" title="03 · Aurora — Painel" subtitle="Backoffice com vocabulário editorial">
        <DCArtboard id="aur-admin-overview" label="Visão Geral" width={1280} height={820}>
          <AuroraAdminOverview />
        </DCArtboard>
        <DCArtboard id="aur-admin-pros" label="Profissionais" width={1280} height={820}>
          <AuroraAdminPros />
        </DCArtboard>
        <DCArtboard id="aur-admin-patient" label="Detalhe do Paciente" width={1280} height={820}>
          <AuroraAdminPatient />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NutrirCanvas />);
