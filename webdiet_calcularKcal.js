function calcularKcal(a) { 

	var peso = check($("#pesoInput").val())
	var altura = check($("#alturaInput").val())
	var alturaMetros = check($("#alturaInput").val())/100;
	var mlg = check($("#mlgInput").val())
	var formula = check($("#formulaSelect").val())
	var basal = check($("#tmbInput").html().split(" Kcal/dia")[0])
	var data_exame = $("#dataExameCalculoInput").val().trim();
	let pacienteSelecionado = pacientes.find(paciente => paciente.ip == ip)
	var dataNascimento = pacienteSelecionado.nascimento
	var genero = pacienteSelecionado.genero

	var idade = idadeCalculos(dataNascimento,data_exame,"anos")
	var idade_meses = idadeCalculos(dataNascimento,data_exame,"meses")

	if(a != true) {	toggleHandyMETInput(); }
	
	if(formula == "") { basal = 0 }

	if(formula == 1) { //Harris (1919)
		if(genero == "M") { basal = 66.4730 + (13.7516 * peso) + (5.0033 * altura) - (6.7550 * idade); } 
		if(genero == "F") { basal = 655.0955 + (9.5634 * peso) + (1.8494 * altura) - (4.6756 * idade); } 
	}

	if(formula == 2) { //Harris (1984)
		if(genero == "M") { basal = 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * idade); } 
		if(genero == "F") { basal = 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * idade); } 
	}

	if(formula == 3) { // Cunningham (1991) McArdle 1996
		basal = 370 + 21.6 * mlg
		if(mlg == 0) { $("#tmbInput").html('<font style="color:var(--vermelho)">Massa livre de gordura em branco</font>'); $("#getInput").html("-"); $("#getkcalkg, #tmbkcalkg").html(""); revalidar(); return; }
	}
	if(formula == 4) { //Cunningham (1980)
		basal = 500 + 22 * mlg
		if(mlg == 0) { $("#tmbInput").html('<font style="color:var(--vermelho)">Massa livre de gordura em branco</font>'); $("#getInput").html("-"); $("#getkcalkg, #tmbkcalkg").html(""); revalidar(); return; }
	}
	if(formula == 5) { //EER/IOM (2002-2005)
		if(genero == "M") { basal = "-"; } 
		if(genero == "F") { basal = "-"; } 
	}
	if(formula == 6) { //Mifflin St Jeor - 1990 (Obesidade)
		if(genero == "M") { basal = 9.99 * peso + 6.25 * altura - 4.92 * idade + 166 - 161; } 
		if(genero == "F") { basal = 9.99 * peso + 6.25 * altura - 4.92 * idade - 161; } 
	}
	if(formula == 7) { //Mifflin St Jeor (Sobrepeso)
		basal = 19.7 * mlg + 413
		if(mlg == 0) { $("#tmbInput").html('<font style="color:var(--vermelho)">Massa livre de gordura em branco</font>'); $("#getInput").html("-"); $("#getkcalkg, #tmbkcalkg").html(""); revalidar(); return; }
	}
	if(formula == 12) { // Tinsley 2018
		basal = 24.8 * peso + 10
	}
	if(formula == 13) { // Tinsley MLG 2018
		basal = 25.9 * mlg + 284
		if(mlg == 0) { $("#tmbInput").html('<font style="color:var(--vermelho)">Massa livre de gordura em branco</font>'); $("#getInput").html("-"); $("#getkcalkg, #tmbkcalkg").html(""); revalidar(); return; }
	}
	if(formula == 8){ //FAO (1985)
		
		if(genero == "F") {
			if(idade <= 3) { basal = 58.317 * peso - 31.1; }
			if(idade > 3 && idade <= 10) { basal = 20.315 * peso + 485.9; }
			if(idade > 10 && idade <= 18) { basal = 13.384 * peso + 692.6; }
			if(idade > 18 && idade <= 30) { basal = 14.818 * peso + 486.6; }
			if(idade > 30 && idade <= 60) { basal = 8.126 * peso + 845.6; }
			if(idade > 60) { basal = 9.082 * peso + 658.5; }
		}
		if(genero == "M") {
			if(idade <= 3) { basal = 59.512 * peso - 30.4; }
			if(idade > 3 && idade <= 10) { basal = 22.706 * peso + 504.3 ; }
			if(idade > 10 && idade <= 18) { basal = 17.686 * peso + 658.2; }
			if(idade > 18 && idade <= 30) { basal = 15.057 * peso + 692.2; }
			if(idade > 30 && idade <= 60) { basal = 11.472 * peso + 873.1; }
			if(idade > 60) { basal = 11.711 * peso + 587.7; }
		}
	}

	if(formula == 9){ //HENRY (1991)

		if(genero == "F") {
			if(idade >= 3 && idade <= 10) { basal = (0.063 * peso + 2.466) * 239; }
			if(idade > 10 && idade <= 18) { basal = (0.047 * peso + 2.951) * 239; }
			if(idade > 18 && idade <= 30) { basal = (0.048 * peso + 2.562) * 239; }
			if(idade > 30) { basal = (0.048 * peso + 2.448) * 239; }
		}
		if(genero == "M") {
			if(idade >= 3 && idade <= 10) { basal = (0.113 * peso + 1.689) * 239; }
			if(idade > 10 && idade <= 18) { basal = (0.084 * peso + 2.122) * 239; }
			if(idade > 18 && idade <= 30) { basal = (0.056 * peso + 2.800) * 239; }
			if(idade > 30) { basal = (0.046 * peso + 3.160) * 239; }
		}
	}

	if(formula == 11) { // GET formula de bolso

		getTempFinal = $("#getInput").html() == "Não calculado" ? "" : $("#getInput").html().split(" Kcal/dia").join("");
		basal = "-";
		
		var html = `<div class="swalTitle">Fórmula de bolso</div>
				<div class="swalSubtitle">Coloque os valores de macronutrientes abaixo:</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; grid-column-gap: 5px;">
				<div class="conjunto-input">
				<div class="label">Proteínas (g/Kg)</div>
				<input type="text" id="ptnTemp" class="onlyNumber" placeholder="Proteínas (g/Kg)" value="" required onkeyup="formulaBolso()">
				</div> 

				<div class="conjunto-input">
				<div class="label">Carboidratos (g/Kg)</div>
				<input type="text" id="choTemp" class="onlyNumber" placeholder="Carboidratos (g/Kg)" value="" required onkeyup="formulaBolso()">
				</div> 

				<div class="conjunto-input">
				<div class="label">Lipídeos (g/Kg)</div>
				<input type="text" id="lipTemp" class="onlyNumber" placeholder="Lipídeos (g/Kg)" value="" required onkeyup="formulaBolso()">
				</div>
				</div>
				<div style="font-size: 16px; font-weight: 500; margin: 15px 0px; color: var(--cinza)"><span id="getResultado">0</span> Kcal/dia | <span id="getResultado2"></span> Kcal/Kg</div>

				<div class="botao" onclick="swal.clickConfirm();">confirmar</div>`

		if(a != true || getTempFinal == "") {

			Swal.fire({
				html: html,
				width: '550px',
				showConfirmButton: false,
				allowOutsideClick: false
			}).then(function(retorno) { 

				if(retorno.value) {

					getTempFinal = check($("#getResultado").text().trim())

					$("#getInput").html(getTempFinal + " Kcal/dia");
					if(peso > 0) { $("#getkcalkg").html("(" + (getTempFinal / peso).toFixed(1) + " Kcal/kg)"); }
				}
			})
		}

		onlyNumberFunction()

		revalidar()
	}

	if(formula == 10) { // get manual

		getTempFinal = $("#getInput").html() == "Não calculado" ? "" : $("#getInput").html().split(" Kcal/dia").join("");
		basal = "-";
		
		var html = '<div class="swalTitle">Gasto energético total</div>'
				+ '<div class="swalSubtitle">Coloque o valor desejado para o GET do seu paciente</div>'

				+ '<div style="width: calc(50% - 5px); margin-top: 15px;" class="conjunto-input">'
				+ '<div class="label">GET (Kcal)</div>'
				+ '<input type="text" id="getTemp" class="onlyNumber" onkeyup="calcularGETManual1()" placeholder="GET (Kcal)" value="" required>'
				+ '</div> '

				+ '<div style="width: calc(50% - 5px); margin-top: 15px;" class="conjunto-input">'
				+ '<div class="label">GET (Kcal/Kg)</div>'
				+ '<input type="text" id="getTemp2" class="onlyNumber" onkeyup="calcularGETManual2()" placeholder="GET (Kcal/Kg)" value="" required>'
				+ '</div>'

				+ '<div style="width: 100%; margin-top: 10px;" class="botao" onclick="swal.clickConfirm();">confirmar</div>'

		if(a != true || getTempFinal == "") {

			Swal.fire({
				html: html,
				width: 'var(--larguraSwal)',
				showConfirmButton: false
			}).then(function(retorno) { 

				if(retorno.value) {

					getTempFinal = check($("#getTemp").val().trim())

					$("#getInput").html(getTempFinal + " Kcal/dia");
					if(peso > 0) { $("#getkcalkg").html("(" + (getTempFinal / peso).toFixed(1) + " Kcal/kg)") }
				}
		})

		}

		onlyNumberFunction()
		revalidar()
	}

	if(formula == 14) { // tmb manual

		getTempFinal = 0;

		var html = '<div class="swalTitle">Taxa metabólica basal</div>'
				+ '<div class="swalSubtitle">Informe a TMB para seu paciente</div>'

    			+ '<div class="conjunto-input input-slim">'
				+ '<input type="text" id="tmbTemp" class="onlyNumber" placeholder="Taxa metabólica basal (Kcal)" style="text-align: center" autocomplete="off">'
				+ '</div>'

				+ '<div style="margin-top: 10px;" class="botao" onclick="swal.clickConfirm();">confirmar</div>'


		if(a != true) {

			Swal.fire({
				html: html,
				width: '450px',
				showConfirmButton: false
			}).then(function(retorno) { 

				if(retorno.value) {

					basal = check($("#tmbTemp").val().trim())

					$("#tmbInput").html(basal.toFixed(0) + " Kcal/dia")
					if(peso > 0) { $("#tmbkcalkg").html("(" + (basal / peso).toFixed(1) + " Kcal/kg)"); } else { $("#tmbkcalkg").html(""); }

					calculoFinal()

				}
			})

		}

		onlyNumberFunction()
		revalidar()
	}


	if(formula == 21){ 
		
		if(idade_meses <= 3) { basal = (89 * peso - 100) + 175; }
		if(idade_meses > 3 && idade_meses <= 6) { basal = (89 * peso - 100) + 56; }
		if(idade_meses > 6 && idade_meses <= 12) { basal = (89 * peso - 100) + 22; }
		if(idade_meses > 12 && idade_meses <= 36) { basal = (89 * peso - 100) + 20; }
		if(idade_meses > 36) { basal = "-"; }

	}

	if(formula == 22){ 
		
		if(genero == "F") {
			if(idade <= 3) { basal = 58.317 * peso - 31.1; }
			if(idade > 3 && idade <= 10) { basal = 20.315 * peso + 485.9; }
			if(idade > 10 && idade <= 18) { basal = 13.384 * peso + 692.6; }
			if(idade > 18 && idade <= 30) { basal = 14.818 * peso + 486.6; }
			if(idade > 30 && idade <= 60) { basal = 8.126 * peso + 845.6; }
			if(idade > 60) { basal = 9.082 * peso + 658.5; }
		}
		if(genero == "M") {
			if(idade <= 3) { basal = 59.512 * peso - 30.4; }
			if(idade > 3 && idade <= 10) { basal = 22.706 * peso + 504.3 ; }
			if(idade > 10 && idade <= 18) { basal = 17.686 * peso + 658.2; }
			if(idade > 18 && idade <= 30) { basal = 15.057 * peso + 692.2; }
			if(idade > 30 && idade <= 60) { basal = 11.472 * peso + 873.1; }
			if(idade > 60) { basal = 11.711 * peso + 587.7; }
		} 
	}

	if(formula == 23){ 
		
		if(genero == "F") { 
			if(idade_meses <= 3) { basal = (16.252 * peso) + (1023.2 * alturaMetros) - 413.5; }
			if(idade_meses > 3 && idade_meses <= 120) { basal = (16.969 * peso) + (161.08 * alturaMetros) + 371.2;  }
			if(idade_meses > 120 && idade_meses <= 228) { basal = (8.365 * peso) + (465 * alturaMetros) + 200;  }
		} 
		if(genero == "M") { 
			if(idade_meses <= 3) { basal = (0.167 * peso) + (1517.4 * alturaMetros) - 617.6; }
			if(idade_meses > 3 && idade_meses <= 120) { basal = (19.59 * peso) + (130.3 * alturaMetros) + 414.9;  }
			if(idade_meses > 120 && idade_meses <= 228) { basal = (16.25 * peso) + (137.2 * alturaMetros) + 515.5;  }
		} 
	}


	if (formula == 24) { // Integração HandyMET
		
		if(a != true) {
			
			var html = '<div class="swalTitle">Exames HandyMET</div>'
					 + '<div class="swalSubtitle">Abaixo a lista de exames dos últimos 3 meses</div>'

					+ '<div style="width: 100%; height: auto; font-size: 15px;">'

					+ '<div class="formulario" style="margin-top: 0px;">'
					+ '<input style="width: 100%; height: 100%; margin: 0px; padding: 0px 10px; color: var(--cinza); background: none; border: none; display: inline-block; font-size: 16px; font-weight: 200" onkeyup="busca(this,\'examesLinha\')" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Busque pelo nome do exame">'
					+ '</div>'

					+ '<div id="examesLista" class="scrollClass" style="min-height: 300px; height: 300px; margin-top: 10px; text-align: left; overflow-y: auto;"></div>'

					+ '</div>'

					+ '<div style="margin-top: 10px; background: var(--vermelho)" class="botao" onclick="$(\'#formulaSelect\').val(\'\'); swal.close()">fechar janela</div>'
					+ '<div style="font-size: 14px; margin-top: 15px; color: var(--cinza)">Gostaria de alterar sua conta HandyMET vinculada? <a href="" target="_blank" onclick="swal.close(); $(\'#formulaSelect\').val(\'\')" id="revincularBtn">Clique aqui</a>.</div>'

			Swal.fire({
				html: html,
				width: '700px',
				showConfirmButton: false,
				allowOutsideClick: false
			})

			atualizarListaExames()
		}
	}

	if (formula == 25 ) { // Atalah - gestante
		
		if(idade > 10 && idade <= 18) { basal = 12.2 * peso + 746; }
		if(idade > 18 && idade <= 30) { basal = 14.7 * peso + 496; }
		if(idade > 30 && idade <= 60) { basal = 8.7 * peso + 829; }
		if(idade > 60) { basal = 10.5 * peso + 596; }
	}

	if(formula == 26 || formula == 27 || formula == 28 || formula == 29) {
		if(genero == "M") { basal = "-"; } 
		if(genero == "F") { basal = "-"; } 
	}

	if(isNaN(basal)) {
		$("#tmbInput").html("Não aplicável")
		$("#tmbkcalkg").html("");
	} else {
		$("#tmbInput").html(basal.toFixed(0) + " Kcal/dia")
		if(peso > 0) { $("#tmbkcalkg").html("(" + (basal / peso).toFixed(1) + " Kcal/kg)"); } else { $("#tmbkcalkg").html(""); }
	}

	calculoFinal()

}
