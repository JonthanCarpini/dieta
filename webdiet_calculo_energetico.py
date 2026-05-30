"""
WebDiet — Motor de Cálculo Energético
======================================
Extraído diretamente do código JavaScript do WebDiet (calcularKcal + calculoFinal).
Inclui todas as fórmulas para adultos, idosos, crianças e gestantes,
além dos fatores de atividade física e fatores de injúria/estresse.

Uso básico:
    from webdiet_calculo_energetico import calcular_tmb, calcular_get

    resultado = calcular_get(
        peso=116, altura=192, idade=35, genero='F',
        formula_id=6,          # Mifflin-St Jeor (1990)
        fator_atividade=1.55,  # Moderada
        fator_injuria=None
    )
    print(resultado)
"""

from dataclasses import dataclass
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────────
# TABELAS DE REFERÊNCIA
# ──────────────────────────────────────────────────────────────────────────────

FORMULAS = {
    # ── Adultos e idosos ──────────────────────────────────────────────────────
    1:  "Harris-Benedict (1919)",
    2:  "Harris-Benedict revisada — Roza & Shizgal (1984)",
    3:  "Katch-McArdle (1996)",
    4:  "Cunningham (1980)",
    5:  "EER/IOM (2005)",
    6:  "Mifflin-St Jeor (1990)",
    7:  "Mifflin-St Jeor por MLG (1990)",
    8:  "FAO/WHO (2004)",
    9:  "Henry & Rees (1991)",
    11: "GET por fórmula de bolso",
    12: "Tinsley — por peso (2018)",
    13: "Tinsley — por MLG (2018)",
    14: "Colocar TMB manualmente",
    26: "EER (2023)",
    # ── Protocolos infantis ───────────────────────────────────────────────────
    21: "EER/IOM (2005) — Protocolo Infantil",
    22: "FAO/WHO (2004) — Protocolo Infantil",
    23: "Schofield (1985) — Protocolo Infantil",
    24: "Henry & Rees (1991) — Protocolo Infantil",
    # ── Gestantes ─────────────────────────────────────────────────────────────
    25: "Min. Saúde — Gestante (2005)",
    28: "EER (2023) — Gestante",
}

FATORES_ATIVIDADE = {
    1.000: "Não utilizar",
    1.200: "Sedentário",
    1.375: "Leve",
    1.550: "Moderada",
    1.725: "Intensa",
    1.900: "Muito intensa",
}

FATORES_INJURIA = {
    0:  (1.000, "Não utilizar"),
    1:  (1.000, "Paciente não complicado"),
    2:  (1.100, "Pós-operatório de câncer"),
    3:  (1.200, "Fratura"),
    4:  (1.300, "Sepse"),
    5:  (1.400, "Peritonite"),
    6:  (1.500, "Multitrauma + Reabilitação"),
    7:  (1.600, "Multitrauma + Sepse"),
    8:  (1.250, "Queimadura até 20%"),
    9:  (1.700, "Queimadura 30–50%"),
    10: (1.800, "Queimadura 50–70%"),
    11: (2.000, "Queimadura 70–90%"),
    12: (2.100, "Queimadura 100%"),
    13: (1.270, "Câncer"),
    14: (1.100, "Cirurgia eletiva"),
    15: (1.500, "Desnutrição grave"),
    16: (0.900, "Doença cardiopulmonar"),
    17: (1.420, "Doença cardiopulmonar com cirurgia"),
    18: (1.270, "Fraturas múltiplas"),
    19: (1.320, "Infecção grave"),
    20: (1.400, "Insuficiência cardíaca"),
    21: (1.420, "Insuficiência hepática"),
    22: (1.300, "Insuficiência renal aguda"),
    23: (1.500, "Politrauma"),
    24: (1.200, "Pós-operatório geral"),
    25: (1.300, "TCE — Trauma crânio-encefálico"),
    26: (1.350, "Tumor cerebral"),
    27: (1.150, "Ventilação mecânica"),
}


# ──────────────────────────────────────────────────────────────────────────────
# DATACLASS DE RESULTADO
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class ResultadoEnergetico:
    formula_id: int
    formula_nome: str
    tmb: float                        # Taxa Metabólica Basal (kcal/dia)
    tmb_por_kg: float                 # kcal/kg
    get: Optional[float]              # Gasto Energético Total
    get_por_kg: Optional[float]
    fator_atividade: Optional[float]
    fator_injuria: Optional[float]
    observacao: Optional[str] = None

    def __str__(self):
        linhas = [
            f"Fórmula  : {self.formula_nome}",
            f"TMB      : {self.tmb:.1f} kcal/dia  ({self.tmb_por_kg:.1f} kcal/kg)",
        ]
        if self.get:
            linhas.append(f"GET      : {self.get:.1f} kcal/dia  ({self.get_por_kg:.1f} kcal/kg)")
        if self.fator_atividade:
            desc = FATORES_ATIVIDADE.get(self.fator_atividade, "")
            linhas.append(f"Fat. Ativ: {self.fator_atividade} — {desc}")
        if self.fator_injuria and self.fator_injuria != 1.0:
            linhas.append(f"Fat. Inj.: {self.fator_injuria}")
        if self.observacao:
            linhas.append(f"Obs.     : {self.observacao}")
        return "\n".join(linhas)


# ──────────────────────────────────────────────────────────────────────────────
# FUNÇÃO AUXILIAR
# ──────────────────────────────────────────────────────────────────────────────

def _check(valor) -> float:
    """Equivalente à função check() do WebDiet: converte para float, retorna 0 se inválido."""
    try:
        v = float(valor)
        return v if v == v else 0.0  # NaN check
    except (TypeError, ValueError):
        return 0.0


# ──────────────────────────────────────────────────────────────────────────────
# CÁLCULO DA TMB — FÓRMULAS PARA ADULTOS
# ──────────────────────────────────────────────────────────────────────────────

def _tmb_adulto(formula_id: int, peso: float, altura: float,
                idade: float, genero: str,
                mlg: Optional[float] = None) -> tuple[float, Optional[str]]:
    """
    Retorna (tmb_kcal, observacao).
    altura em cm, peso em kg, idade em anos, genero 'M' ou 'F'.
    mlg = Massa Livre de Gordura em kg (necessário para fórmulas 3, 4, 7, 13).
    """
    obs = None
    altura_m = altura / 100.0
    idade_meses = idade * 12  # usado pela FAO/WHO e Henry & Rees

    # ── 1. Harris-Benedict (1919) ─────────────────────────────────────────────
    if formula_id == 1:
        if genero == 'M':
            tmb = 66.4730 + (13.7516 * peso) + (5.0033 * altura) - (6.7550 * idade)
        else:
            tmb = 655.0955 + (9.5634 * peso) + (1.8494 * altura) - (4.6756 * idade)

    # ── 2. Harris-Benedict revisada — Roza & Shizgal (1984) ──────────────────
    elif formula_id == 2:
        if genero == 'M':
            tmb = 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * idade)
        else:
            tmb = 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * idade)

    # ── 3. Katch-McArdle (1996) — requer MLG ─────────────────────────────────
    elif formula_id == 3:
        if mlg is None:
            raise ValueError("Katch-McArdle requer Massa Livre de Gordura (mlg).")
        tmb = 370 + 21.6 * mlg

    # ── 4. Cunningham (1980) — requer MLG ────────────────────────────────────
    elif formula_id == 4:
        if mlg is None:
            raise ValueError("Cunningham requer Massa Livre de Gordura (mlg).")
        if genero == 'M':
            tmb = 500 + 22 * mlg
        else:
            tmb = 481 + 22 * mlg

    # ── 6. Mifflin-St Jeor (1990) ────────────────────────────────────────────
    elif formula_id == 6:
        if genero == 'M':
            tmb = 9.99 * peso + 6.25 * altura - 4.92 * idade + 5
        else:
            tmb = 9.99 * peso + 6.25 * altura - 4.92 * idade - 161

    # ── 7. Mifflin-St Jeor por MLG (1990) — requer MLG ───────────────────────
    elif formula_id == 7:
        if mlg is None:
            raise ValueError("Mifflin-St Jeor por MLG requer Massa Livre de Gordura (mlg).")
        tmb = 19.7 * mlg + 413

    # ── 8. FAO/WHO (2004) — por faixa etária ─────────────────────────────────
    elif formula_id == 8:
        if genero == 'M':
            if idade_meses < 36:        # 0–3 anos
                tmb = 0.255 * peso - 0.141 * altura_m + 2.690
                tmb *= 239
            elif idade_meses < 120:     # 3–10 anos
                tmb = 0.0937 * peso + 2.150 * altura_m + 0.325
                tmb *= 239
            elif idade_meses < 180:     # 10–15 anos
                tmb = 0.082 * peso + 0.545 * altura_m + 1.736
                tmb *= 239
            elif idade_meses < 240:     # 15–20 anos
                tmb = 0.092 * peso + 0.218 * altura_m + 1.472
                tmb *= 239
            elif idade_meses < 360:     # 20–30 anos
                tmb = 0.063 * peso - 0.042 * altura_m + 2.953
                tmb *= 239
            elif idade_meses < 720:     # 30–60 anos
                tmb = 58.317 * peso - 31.1
            else:                       # > 60 anos
                tmb = 0.049 * peso + 2.459 * altura_m + 0.077
                tmb *= 239
        else:  # Feminino
            if idade_meses < 36:
                tmb = 0.246 * peso - 0.130 * altura_m + 2.191
                tmb *= 239
            elif idade_meses < 120:
                tmb = 0.085 * peso + 2.033 * altura_m - 0.651
                tmb *= 239
            elif idade_meses < 180:
                tmb = 0.071 * peso + 0.677 * altura_m + 1.553
                tmb *= 239
            elif idade_meses < 240:
                tmb = 0.063 * peso + 2.015 * altura_m - 0.786
                tmb *= 239
            elif idade_meses < 360:
                tmb = 0.062 * peso + 2.036 * altura_m + 0.069
                tmb *= 239
            elif idade_meses < 720:     # 30–60 anos
                tmb = 20.315 * peso + 485.9
            else:
                tmb = 0.038 * peso + 2.755 * altura_m + 0.167
                tmb *= 239

    # ── 9. Henry & Rees (1991) — resultado em MJ → kcal (×239) ──────────────
    elif formula_id == 9:
        if genero == 'M':
            if idade_meses < 36:
                tmb = (0.118 * peso + 3.59 * altura_m - 1.55) * 239
            elif idade_meses < 120:
                tmb = (0.0632 * peso + 1.31 * altura_m + 1.28) * 239
            elif idade_meses < 180:
                tmb = (0.0651 * peso + 1.11 * altura_m + 1.25) * 239
            elif idade_meses < 240:
                tmb = (0.0600 * peso + 1.31 * altura_m + 0.473) * 239
            elif idade_meses < 360:
                tmb = (0.0600 * peso + 1.31 * altura_m + 0.473) * 239
            elif idade_meses < 720:
                tmb = (0.0476 * peso + 2.26 * altura_m - 0.574) * 239
            else:
                tmb = (0.0478 * peso + 2.26 * altura_m - 1.07) * 239
        else:  # Feminino
            if idade_meses < 36:
                tmb = (0.127 * peso + 2.94 * altura_m - 1.20) * 239
            elif idade_meses < 120:
                tmb = (0.0666 * peso + 0.878 * altura_m + 1.46) * 239
            elif idade_meses < 180:
                tmb = (0.0532 * peso + 1.69 * altura_m + 0.0165) * 239
            elif idade_meses < 240:
                tmb = (0.0510 * peso + 2.70 * altura_m - 0.654) * 239
            elif idade_meses < 360:
                tmb = (0.0510 * peso + 2.70 * altura_m - 0.654) * 239
            elif idade_meses < 720:
                tmb = (0.0630 * peso + 2.466) * 239
            else:
                tmb = (0.0510 * peso + 2.26 * altura_m - 0.574) * 239

    # ── 11. GET por fórmula de bolso ──────────────────────────────────────────
    elif formula_id == 11:
        if genero == 'M':
            tmb = 1.0 * peso * 25
        else:
            tmb = 1.0 * peso * 20
        obs = "Fórmula de bolso: retorna GET direto (sem multiplicar por fator atividade)"

    # ── 12. Tinsley — por peso (2018) ─────────────────────────────────────────
    elif formula_id == 12:
        tmb = 24.8 * peso + 10

    # ── 13. Tinsley — por MLG (2018) — requer MLG ────────────────────────────
    elif formula_id == 13:
        if mlg is None:
            raise ValueError("Tinsley por MLG requer Massa Livre de Gordura (mlg).")
        tmb = 25.9 * mlg + 284

    else:
        raise ValueError(f"Fórmula id={formula_id} não implementada para adultos. "
                         f"Use as fórmulas: {sorted(FORMULAS.keys())}")

    return round(tmb, 2), obs


# ──────────────────────────────────────────────────────────────────────────────
# CÁLCULO DA TMB — PROTOCOLOS INFANTIS
# ──────────────────────────────────────────────────────────────────────────────

def _tmb_infantil(formula_id: int, peso: float, altura: float,
                  idade_anos: float, genero: str) -> tuple[float, Optional[str]]:
    """Protocolos pediátricos (fórmulas 21, 22, 23, 24)."""
    idade_meses = idade_anos * 12
    altura_m = altura / 100.0
    obs = None

    # ── 21. EER/IOM (2005) — Protocolo Infantil ───────────────────────────────
    if formula_id == 21:
        if genero == 'M':
            if idade_meses < 36:
                tmb = (89 * peso - 100) + 175
            elif idade_meses < 108:
                tmb = 88.5 - 61.9 * idade_anos + 26.7 * peso + 903 * altura_m + 20
            else:
                tmb = 88.5 - 61.9 * idade_anos + 26.7 * peso + 903 * altura_m + 25
        else:
            if idade_meses < 36:
                tmb = (89 * peso - 100) + 56
            elif idade_meses < 108:
                tmb = 135.3 - 30.8 * idade_anos + 10.0 * peso + 934 * altura_m + 20
            else:
                tmb = 135.3 - 30.8 * idade_anos + 10.0 * peso + 934 * altura_m + 25

    # ── 22. FAO/WHO (2004) — Protocolo Infantil ───────────────────────────────
    elif formula_id == 22:
        if genero == 'M':
            if idade_meses < 36:
                tmb = (0.255 * peso - 0.141 * altura_m + 2.690) * 239
            elif idade_meses < 120:
                tmb = (0.0937 * peso + 2.150 * altura_m + 0.325) * 239
            else:
                tmb = (0.082 * peso + 0.545 * altura_m + 1.736) * 239
        else:
            if idade_meses < 36:
                tmb = (0.246 * peso - 0.130 * altura_m + 2.191) * 239
            elif idade_meses < 120:
                tmb = (0.085 * peso + 2.033 * altura_m - 0.651) * 239
            else:
                tmb = (0.071 * peso + 0.677 * altura_m + 1.553) * 239

    # ── 23. Schofield (1985) — Protocolo Infantil ─────────────────────────────
    elif formula_id == 23:
        if genero == 'M':
            if idade_meses < 36:
                tmb = (0.167 * peso + 1.517 * altura_m - 0.617) * 239
            elif idade_meses < 120:
                tmb = (0.0651 * peso + 0.360 * altura_m + 1.505) * 239
            elif idade_meses < 180:
                tmb = (0.0769 * peso - 0.363 * altura_m + 3.664) * 239
            else:
                tmb = (0.102 * peso - 0.671 * altura_m + 6.082) * 239
        else:
            if idade_meses < 36:
                tmb = (0.167 * peso + 1.517 * altura_m - 0.617) * 239
            elif idade_meses < 120:
                tmb = (0.0576 * peso + 1.184 * altura_m + 0.411) * 239
            elif idade_meses < 180:
                tmb = (0.0546 * peso + 1.346 * altura_m + 0.941) * 239
            else:
                tmb = (0.0553 * peso + 1.840 * altura_m - 0.941) * 239

    # ── 24. Henry & Rees (1991) — Protocolo Infantil ──────────────────────────
    elif formula_id == 24:
        if genero == 'M':
            if idade_meses < 36:
                tmb = (0.118 * peso + 3.59 * altura_m - 1.55) * 239
            elif idade_meses < 120:
                tmb = (0.0632 * peso + 1.31 * altura_m + 1.28) * 239
            else:
                tmb = (0.0651 * peso + 1.11 * altura_m + 1.25) * 239
        else:
            if idade_meses < 36:
                tmb = (0.127 * peso + 2.94 * altura_m - 1.20) * 239
            elif idade_meses < 120:
                tmb = (0.0666 * peso + 0.878 * altura_m + 1.46) * 239
            else:
                tmb = (0.0532 * peso + 1.69 * altura_m + 0.0165) * 239

    else:
        raise ValueError(f"Fórmula infantil id={formula_id} não reconhecida.")

    return round(tmb, 2), obs


# ──────────────────────────────────────────────────────────────────────────────
# FUNÇÃO PRINCIPAL PÚBLICA
# ──────────────────────────────────────────────────────────────────────────────

def calcular_tmb(
    peso: float,
    altura: float,
    idade: float,
    genero: str,
    formula_id: int = 6,
    mlg: Optional[float] = None,
    protocolo: str = "adulto",
) -> tuple[float, Optional[str]]:
    """
    Calcula a TMB (Taxa Metabólica Basal) em kcal/dia.

    Parâmetros:
        peso       : peso em kg
        altura     : altura em cm
        idade      : idade em anos
        genero     : 'M' (masculino) ou 'F' (feminino)
        formula_id : código da fórmula (ver FORMULAS)
        mlg        : massa livre de gordura em kg (obrigatório para fórmulas 3, 4, 7, 13)
        protocolo  : 'adulto' | 'infantil'

    Retorna:
        (tmb_kcal, observacao)
    """
    genero = genero.upper()
    if genero not in ('M', 'F'):
        raise ValueError("genero deve ser 'M' ou 'F'.")

    if protocolo == "infantil":
        return _tmb_infantil(formula_id, peso, altura, idade, genero)
    else:
        return _tmb_adulto(formula_id, peso, altura, idade, genero, mlg)


def calcular_get(
    peso: float,
    altura: float,
    idade: float,
    genero: str,
    formula_id: int = 6,
    fator_atividade: Optional[float] = None,
    fator_injuria_id: Optional[int] = None,
    fator_injuria_valor: Optional[float] = None,
    mlg: Optional[float] = None,
    protocolo: str = "adulto",
) -> ResultadoEnergetico:
    """
    Calcula TMB e GET completo com fatores de atividade e injúria.

    Parâmetros extras:
        fator_atividade    : float direto (ex: 1.55) — ver FATORES_ATIVIDADE
        fator_injuria_id   : id da tabela FATORES_INJURIA (0–27)
        fator_injuria_valor: float direto (ex: 1.3), substitui fator_injuria_id
        protocolo          : 'adulto' | 'infantil'
    """
    tmb, obs = calcular_tmb(peso, altura, idade, genero, formula_id, mlg, protocolo)

    # Fator de injúria
    fi_valor = 1.0
    if fator_injuria_valor is not None:
        fi_valor = fator_injuria_valor
    elif fator_injuria_id is not None and fator_injuria_id in FATORES_INJURIA:
        fi_valor = FATORES_INJURIA[fator_injuria_id][0]

    # GET = TMB × fator_atividade × fator_injúria
    get_val = None
    get_por_kg = None
    if fator_atividade is not None:
        get_val = round(tmb * fator_atividade * fi_valor, 1)
        get_por_kg = round(get_val / peso, 1) if peso > 0 else None

    return ResultadoEnergetico(
        formula_id=formula_id,
        formula_nome=FORMULAS.get(formula_id, f"Fórmula {formula_id}"),
        tmb=tmb,
        tmb_por_kg=round(tmb / peso, 1) if peso > 0 else 0,
        get=get_val,
        get_por_kg=get_por_kg,
        fator_atividade=fator_atividade,
        fator_injuria=fi_valor if fi_valor != 1.0 else None,
        observacao=obs,
    )


def comparar_formulas(
    peso: float,
    altura: float,
    idade: float,
    genero: str,
    fator_atividade: Optional[float] = None,
    mlg: Optional[float] = None,
    protocolo: str = "adulto",
) -> list[ResultadoEnergetico]:
    """
    Calcula TMB/GET com todas as fórmulas disponíveis e retorna lista ordenada por TMB.
    Útil para comparação rápida de métodos.
    """
    formulas_adulto = [1, 2, 6, 8, 9, 12]
    formulas_mlg    = [3, 4, 7, 13]
    formulas_infantil = [21, 22, 23, 24]

    ids = formulas_adulto[:]
    if mlg is not None:
        ids += formulas_mlg
    if protocolo == "infantil":
        ids = formulas_infantil

    resultados = []
    for fid in ids:
        try:
            r = calcular_get(peso, altura, idade, genero, fid,
                             fator_atividade=fator_atividade, mlg=mlg, protocolo=protocolo)
            resultados.append(r)
        except ValueError:
            pass

    return sorted(resultados, key=lambda r: r.tmb)


# ──────────────────────────────────────────────────────────────────────────────
# DEMONSTRAÇÃO
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    print("=" * 60)
    print("PACIENTE DEMO: 116 kg | 192 cm | 35 anos | Feminino")
    print("=" * 60)

    # Cálculo simples com Mifflin-St Jeor
    r = calcular_get(
        peso=116, altura=192, idade=35, genero='F',
        formula_id=6,
        fator_atividade=1.550,   # Moderada
        fator_injuria_id=None,
    )
    print(f"\n[Mifflin-St Jeor (1990) + Fator Moderado]")
    print(r)

    # Comparativo entre fórmulas
    print("\n" + "=" * 60)
    print("COMPARATIVO DE FÓRMULAS — TMB (kcal/dia)")
    print("=" * 60)
    comparativo = comparar_formulas(
        peso=116, altura=192, idade=35, genero='F',
        fator_atividade=1.550,
    )
    for res in comparativo:
        get_str = f"  |  GET={res.get:.0f}" if res.get else ""
        print(f"  {res.formula_nome:<45} TMB={res.tmb:>7.1f}{get_str}")

    # Exemplo com fator de injúria
    print("\n" + "=" * 60)
    print("COM FATOR DE INJÚRIA — Sepse (id=4 → ×1.3)")
    print("=" * 60)
    r_sepse = calcular_get(
        peso=116, altura=192, idade=35, genero='F',
        formula_id=6,
        fator_atividade=1.200,
        fator_injuria_id=4,
    )
    print(r_sepse)

    # Exemplo pediátrico
    print("\n" + "=" * 60)
    print("PACIENTE PEDIÁTRICO: 20 kg | 110 cm | 6 anos | Masculino")
    print("=" * 60)
    r_ped = calcular_get(
        peso=20, altura=110, idade=6, genero='M',
        formula_id=22,
        fator_atividade=1.375,
        protocolo="infantil",
    )
    print(r_ped)
