/**
 * Orquestração: liga as regras, a progressão e a tela.
 *
 * Os módulos que este arquivo usa não se conhecem entre si — engine não
 * sabe de XP, progress não sabe de DOM, api não sabe de nada do jogo.
 * Toda a costura mora aqui, o que mantém o resto testável.
 */
import { LEVELS, MAX_HEARTS, OPERATION_LABELS, OPERATION_SYMBOLS, ROUND_LENGTH, VERSION, accuracy, describeRound, formatDuration, makeQuestion, operationOf, pointsFor, } from "./engine.js";
import { TOTAL_LESSONS, UNITS, findLesson } from "./curriculum.js";
import { ACHIEVEMENTS, DAILY_GOALS, applyRound, isDone, isUnlocked, isUnlockedAchievement, levelFor, lessonsDone, nextLesson, overallAccuracy, refreshStreak, unitStars, unlockedCount, } from "./progress.js";
import { clearEverything, getBest, getNickname, getTheme, isKeypadOn, isSoundOn, isStorageAvailable, loadProgress, saveIfBest, saveProgress, setKeypadOn, setNickname, setSoundOn, setTheme, } from "./storage.js";
import { fetchRanking, isAvailable, submitRound } from "./api.js";
import * as sfx from "./sfx.js";
import * as router from "./router.js";
/* --- Acesso ao DOM -------------------------------------------------- */
function one(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`Elemento ausente no HTML: ${selector}`);
    return node;
}
const telas = new Map();
document.querySelectorAll("[data-tela]").forEach((node) => {
    telas.set(node.dataset.tela, node);
});
const ui = {
    estado: one("[data-estado]"),
    navegacao: one("[data-navegacao]"),
    torradas: one("[data-torradas]"),
    nivelSelo: one("[data-nivel-selo]"),
    nivelBarra: one("[data-nivel-barra]"),
    ofensivaSelo: one("[data-ofensiva-selo]"),
    ofensiva: one("[data-ofensiva]"),
    xp: one("[data-xp]"),
    metaCartao: one("[data-meta-cartao]"),
    metaFeito: one("[data-meta-feito]"),
    metaAlvo: one("[data-meta-alvo]"),
    metaAnel: one("[data-meta-anel]"),
    metaPct: one("[data-meta-pct]"),
    trilha: one("[data-trilha]"),
    trilhaFim: one("[data-trilha-fim]"),
    livreOperacoes: one("[data-livre-operacoes]"),
    livreNiveis: one("[data-livre-niveis]"),
    livreRecorde: one("[data-livre-recorde]"),
    telaJogo: one('[data-tela="jogo"]'),
    progresso: one("[data-progresso]"),
    progressoAria: one("[data-progresso-aria]"),
    vidas: one("[data-vidas]"),
    capi: one("[data-capi]"),
    conta: one("[data-conta]"),
    forma: one("[data-forma]"),
    resposta: one("[data-resposta]"),
    aviso: one("[data-aviso]"),
    teclado: one("[data-teclado]"),
    retorno: one("[data-retorno]"),
    retornoTitulo: one("[data-retorno-titulo]"),
    retornoDetalhe: one("[data-retorno-detalhe]"),
    fimCapi: one("[data-fim-capi]"),
    fimEstrelas: one("[data-fim-estrelas]"),
    fimTitulo: one("[data-fim-titulo]"),
    fimSub: one("[data-fim-sub]"),
    fimXp: one("[data-fim-xp]"),
    fimAcertos: one("[data-fim-acertos]"),
    fimPontos: one("[data-fim-pontos]"),
    fimSequencia: one("[data-fim-sequencia]"),
    fimTempo: one("[data-fim-tempo]"),
    fimRecorde: one("[data-fim-recorde]"),
    fimNivel: one("[data-fim-nivel]"),
    fimConquistas: one("[data-fim-conquistas]"),
    fimConquistasLista: one("[data-fim-conquistas-lista]"),
    revisar: one("[data-revisar]"),
    revisarLista: one("[data-revisar-lista]"),
    ranking: one("[data-ranking]"),
    rankingLista: one("[data-ranking-lista]"),
    rankingNota: one("[data-ranking-nota]"),
    apelidoForma: one("[data-apelido-forma]"),
    apelido: one("[data-apelido]"),
    medalhasContagem: one("[data-medalhas-contagem]"),
    medalhasLista: one("[data-medalhas-lista]"),
    perfilNome: one("[data-perfil-nome]"),
    perfilNivel: one("[data-perfil-nivel]"),
    perfilRodadas: one("[data-perfil-rodadas]"),
    perfilContas: one("[data-perfil-contas]"),
    perfilPrecisao: one("[data-perfil-precisao]"),
    perfilOfensiva: one("[data-perfil-ofensiva]"),
    perfilLicoes: one("[data-perfil-licoes]"),
    perfilPerfeitas: one("[data-perfil-perfeitas]"),
    metas: one("[data-metas]"),
    temaRotulo: one("[data-tema-rotulo]"),
    somRotulo: one("[data-som-rotulo]"),
    tecladoRotulo: one("[data-teclado-rotulo]"),
    semArmazenamento: one("[data-sem-armazenamento]"),
    versao: one("[data-versao]"),
};
let progresso = refreshStreak(loadProgress());
let partida = null;
let ultimoResultado = null;
/** Escolha atual do treino livre. */
let livreOperacao = "mul";
let livreNivel = "easy";
const ELOGIOS = ["Isso!", "Certo.", "Boa.", "Exato.", "É isso aí.", "Mandou bem."];
const TELAS_COM_CHROME = new Set(["trilha", "livre", "medalhas", "eu"]);
/* --- Persistência ---------------------------------------------------- */
function salvar() {
    saveProgress(progresso);
}
/* --- Navegação -------------------------------------------------------- */
function mostrar(nome) {
    telas.forEach((node, chave) => {
        node.hidden = chave !== nome;
    });
    const comChrome = TELAS_COM_CHROME.has(nome);
    ui.estado.hidden = !comChrome;
    ui.navegacao.hidden = !comChrome;
    ui.navegacao.querySelectorAll("[data-ir]").forEach((botao) => {
        if (botao.dataset.ir === nome)
            botao.setAttribute("aria-current", "page");
        else
            botao.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "instant" });
}
/* --- Barra de estado -------------------------------------------------- */
function pintarEstado() {
    const nivel = levelFor(progresso.xp);
    ui.nivelSelo.textContent = String(nivel.level);
    ui.nivelBarra.style.transform = `scaleX(${nivel.ratio})`;
    ui.xp.textContent = progresso.xp.toLocaleString("pt-BR");
    ui.ofensiva.textContent = String(progresso.streakDays);
    ui.ofensivaSelo.dataset.apagado = String(progresso.streakDays === 0);
}
/* --- Trilha ----------------------------------------------------------- */
function pintarMeta() {
    const hoje = progresso.todayXp;
    const alvo = progresso.dailyGoal;
    const pct = Math.min(100, Math.round((hoje / alvo) * 100));
    ui.metaFeito.textContent = String(hoje);
    ui.metaAlvo.textContent = String(alvo);
    ui.metaPct.textContent = `${pct}%`;
    ui.metaAnel.style.setProperty("--parte", String(pct));
    ui.metaCartao.dataset.pronta = String(hoje >= alvo);
}
function estrelasTexto(quantas) {
    return "★".repeat(quantas) + "☆".repeat(Math.max(0, 3 - quantas));
}
function pintarTrilha() {
    pintarMeta();
    const proxima = nextLesson(progresso);
    const fragmento = document.createDocumentFragment();
    UNITS.forEach((unidade) => {
        const bloco = document.createElement("section");
        bloco.className = "unidade";
        bloco.style.setProperty("--cor-unidade", `var(--unidade-${unidade.hue})`);
        const faixa = document.createElement("div");
        faixa.className = "unidade__faixa";
        const textos = document.createElement("div");
        const numero = document.createElement("p");
        numero.className = "unidade__numero";
        numero.textContent = `Unidade ${unidade.number}`;
        const titulo = document.createElement("h2");
        titulo.className = "unidade__titulo";
        titulo.textContent = unidade.title;
        const sub = document.createElement("p");
        sub.className = "unidade__sub";
        sub.textContent = unidade.subtitle;
        textos.append(numero, titulo, sub);
        const estrelas = document.createElement("p");
        estrelas.className = "unidade__estrelas";
        estrelas.textContent = `★ ${unitStars(progresso, unidade)} / ${unidade.lessons.length * 3}`;
        faixa.append(textos, estrelas);
        const lista = document.createElement("ol");
        lista.className = "unidade__licoes";
        unidade.lessons.forEach((licao, posicao) => {
            const item = document.createElement("li");
            item.className = "licao";
            // serpenteia: desvio alternado dá a leitura de caminho sem desenhar linha
            const desvios = ["0", "44px", "0", "-44px"];
            item.style.setProperty("--desvio", desvios[posicao % desvios.length]);
            const feita = isDone(progresso, licao.id);
            const destravada = isUnlocked(progresso, licao.id);
            const atual = licao.id === proxima;
            if (feita)
                item.classList.add("licao--feita");
            else if (atual)
                item.classList.add("licao--atual");
            if (!destravada)
                item.classList.add("licao--presa");
            const botao = document.createElement("button");
            botao.className = "licao__botao";
            botao.type = "button";
            botao.dataset.licao = licao.id;
            botao.disabled = !destravada;
            const registro = progresso.lessons[licao.id];
            botao.textContent = !destravada ? "🔒" : feita ? "✓" : "▶";
            botao.setAttribute("aria-label", !destravada
                ? `${licao.title} — bloqueada. Conclua a lição anterior.`
                : feita
                    ? `${licao.title} — concluída com ${registro?.stars ?? 0} de 3 estrelas. Jogar de novo.`
                    : `${licao.title} — começar`);
            if (feita && registro) {
                const marca = document.createElement("span");
                marca.className = "licao__estrelas";
                marca.setAttribute("aria-hidden", "true");
                marca.textContent = estrelasTexto(registro.stars);
                botao.append(marca);
            }
            const nome = document.createElement("span");
            nome.className = "licao__nome";
            nome.textContent = licao.title;
            item.append(botao, nome);
            lista.append(item);
        });
        bloco.append(faixa, lista);
        fragmento.append(bloco);
    });
    ui.trilha.replaceChildren(fragmento);
    ui.trilhaFim.hidden = proxima !== null;
}
/* --- Treino livre ------------------------------------------------------ */
const OPERACOES_LIVRES = [
    { op: "sum", sinal: OPERATION_SYMBOLS.sum },
    { op: "sub", sinal: OPERATION_SYMBOLS.sub },
    { op: "mul", sinal: OPERATION_SYMBOLS.mul },
    { op: "div", sinal: OPERATION_SYMBOLS.div },
    { op: "mix", sinal: "±" },
];
function pintarLivre() {
    ui.livreOperacoes.replaceChildren(...OPERACOES_LIVRES.map(({ op, sinal }) => {
        const botao = document.createElement("button");
        botao.className = "opcao";
        botao.type = "button";
        botao.setAttribute("role", "radio");
        botao.setAttribute("aria-checked", String(op === livreOperacao));
        botao.dataset.operacao = op;
        const marca = document.createElement("span");
        marca.className = "opcao__sinal";
        marca.setAttribute("aria-hidden", "true");
        marca.textContent = sinal;
        const nome = document.createElement("span");
        nome.className = "opcao__nome";
        nome.textContent = OPERATION_LABELS[op];
        botao.append(marca, nome);
        return botao;
    }));
    ui.livreNiveis.replaceChildren(...Object.keys(LEVELS).map((nivel) => {
        const spec = LEVELS[nivel];
        const botao = document.createElement("button");
        botao.className = "opcao";
        botao.type = "button";
        botao.setAttribute("role", "radio");
        botao.setAttribute("aria-checked", String(nivel === livreNivel));
        botao.dataset.nivel = nivel;
        const nome = document.createElement("span");
        nome.className = "opcao__nome";
        nome.textContent = spec.label;
        const dica = document.createElement("span");
        dica.className = "opcao__dica";
        dica.textContent = `${spec.min}–${spec.max}`;
        botao.append(nome, dica);
        return botao;
    }));
    const melhor = getBest("random", livreOperacao, livreNivel);
    ui.livreRecorde.textContent = melhor ? `${melhor.score} pontos` : "—";
}
/* --- Vidas ------------------------------------------------------------- */
function pintarVidas(perdeuAgora = false) {
    if (!partida)
        return;
    const corações = [];
    for (let i = 0; i < MAX_HEARTS; i += 1) {
        const span = document.createElement("span");
        const viva = i < partida.vidas;
        span.textContent = "❤️";
        span.setAttribute("aria-hidden", "true");
        if (!viva)
            span.className = "vida--perdida";
        if (perdeuAgora && i === partida.vidas)
            span.classList.add("vida--saindo");
        corações.push(span);
    }
    ui.vidas.replaceChildren(...corações);
    ui.vidas.setAttribute("aria-label", `${partida.vidas} de ${MAX_HEARTS} vidas`);
}
/* --- Partida ----------------------------------------------------------- */
function comecarPartida(mode, level, operation, lessonId) {
    partida = {
        mode,
        level,
        operation,
        indice: 0,
        pontos: 0,
        sequencia: 0,
        maiorSequencia: 0,
        acertos: 0,
        vidas: MAX_HEARTS,
        inicio: Date.now(),
        atual: null,
        erradas: [],
        acertosPorOperacao: {},
        travado: false,
        ...(lessonId ? { lessonId } : {}),
    };
    ui.retorno.hidden = true;
    delete ui.telaJogo.dataset.resultado;
    pintarVidas();
    proximaConta();
}
function proximaConta() {
    if (!partida)
        return;
    if (partida.indice >= ROUND_LENGTH || partida.vidas <= 0) {
        terminarPartida();
        return;
    }
    // Evita repetir a conta anterior.
    let conta = makeQuestion(partida.mode, partida.level, partida.operation);
    for (let tentativa = 0; tentativa < 6 && conta.text === partida.atual?.text; tentativa += 1) {
        conta = makeQuestion(partida.mode, partida.level, partida.operation);
    }
    partida.atual = conta;
    partida.travado = false;
    ui.conta.textContent = `${conta.text} =`;
    ui.resposta.value = "";
    ui.resposta.disabled = false;
    ui.aviso.textContent = "";
    ui.retorno.hidden = true;
    delete ui.telaJogo.dataset.resultado;
    ui.capi.dataset.humor = "idle";
    const feito = partida.indice / ROUND_LENGTH;
    ui.progresso.style.transform = `scaleX(${feito})`;
    ui.progressoAria.setAttribute("aria-valuenow", String(partida.indice));
    if (!isKeypadOn())
        ui.resposta.focus();
}
function responder() {
    if (!partida || !partida.atual || partida.travado)
        return;
    const cru = ui.resposta.value.trim();
    if (!/^-?\d+$/.test(cru)) {
        ui.aviso.textContent = "Escreva um número para responder.";
        ui.resposta.focus();
        return;
    }
    const conta = partida.atual;
    const certo = Number(cru) === conta.answer;
    partida.travado = true;
    partida.indice += 1;
    ui.resposta.disabled = true;
    if (certo) {
        partida.sequencia += 1;
        partida.maiorSequencia = Math.max(partida.maiorSequencia, partida.sequencia);
        partida.acertos += 1;
        const ganhos = pointsFor(partida.sequencia);
        partida.pontos += ganhos;
        const op = operationOf(conta.symbol);
        if (op)
            partida.acertosPorOperacao[op] = (partida.acertosPorOperacao[op] ?? 0) + 1;
        ui.telaJogo.dataset.resultado = "certo";
        ui.capi.dataset.humor = "certo";
        abrirRetorno("certo", ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)], `+${ganhos} pontos`);
        sfx.play("acerto");
        sfx.buzz(12);
    }
    else {
        partida.sequencia = 0;
        partida.vidas -= 1;
        partida.erradas.push(conta);
        ui.telaJogo.dataset.resultado = "errado";
        ui.capi.dataset.humor = "errado";
        pintarVidas(true);
        abrirRetorno("errado", partida.vidas > 0 ? "Não foi essa." : "As vidas acabaram.", `${conta.text} = ${conta.answer}`);
        sfx.play("erro");
        sfx.buzz([18, 40, 18]);
    }
    const feito = partida.indice / ROUND_LENGTH;
    ui.progresso.style.transform = `scaleX(${feito})`;
    ui.progressoAria.setAttribute("aria-valuenow", String(partida.indice));
}
function abrirRetorno(tipo, titulo, detalhe) {
    ui.retorno.dataset.tipo = tipo;
    ui.retornoTitulo.textContent = titulo;
    ui.retornoDetalhe.textContent = detalhe;
    ui.retorno.hidden = false;
    // o botão do painel recebe o foco: Enter continua sem precisar do mouse
    ui.retorno.querySelector("[data-acao='continuar']")?.focus();
}
function terminarPartida() {
    if (!partida)
        return;
    const completou = partida.indice >= ROUND_LENGTH && partida.vidas > 0;
    const resultado = {
        mode: partida.mode,
        level: partida.level,
        operation: partida.operation,
        score: partida.pontos,
        hits: partida.acertos,
        total: ROUND_LENGTH,
        bestStreak: partida.maiorSequencia,
        elapsedMs: Date.now() - partida.inicio,
        misses: [...partida.erradas],
        heartsLeft: partida.vidas,
        completed: completou,
        correctByOperation: { ...partida.acertosPorOperacao },
        ...(partida.lessonId ? { lessonId: partida.lessonId } : {}),
    };
    ultimoResultado = resultado;
    const recorde = saveIfBest(resultado);
    const desfecho = applyRound(progresso, resultado);
    progresso = desfecho.state;
    salvar();
    pintarEstado();
    pintarFim(resultado, desfecho, recorde);
    sfx.play(completou ? "fim" : "erro");
    if (desfecho.leveledUp) {
        torrada("🎉", `Nível ${desfecho.levelAfter}!`);
        sfx.play("nivel");
    }
    if (desfecho.streakExtended && progresso.streakDays > 1) {
        torrada("🔥", `${progresso.streakDays} dias seguidos`);
    }
    if (desfecho.dailyGoalReached) {
        torrada("⚡", "Meta de hoje batida");
    }
    desfecho.newAchievements.forEach((conquista) => {
        torrada(conquista.icon, conquista.title);
    });
    router.go("fim");
    void mostrarRanking(resultado);
}
/* --- Tela de resultado -------------------------------------------------- */
function pintarFim(resultado, desfecho, recorde) {
    const licao = resultado.lessonId ? findLesson(resultado.lessonId) : undefined;
    ui.fimCapi.dataset.humor = resultado.completed ? "festa" : "errado";
    if (licao && desfecho.stars > 0) {
        ui.fimEstrelas.hidden = false;
        ui.fimEstrelas.textContent = estrelasTexto(desfecho.stars);
        ui.fimEstrelas.setAttribute("aria-label", `${desfecho.stars} de 3 estrelas`);
    }
    else {
        ui.fimEstrelas.hidden = true;
    }
    ui.fimTitulo.textContent = resultado.completed
        ? resultado.hits === resultado.total
            ? "Sem errar uma!"
            : "Rodada concluída"
        : "As vidas acabaram";
    ui.fimSub.textContent = licao
        ? licao.title
        : describeRound(resultado.mode, resultado.level, resultado.operation);
    ui.fimXp.textContent = `+${desfecho.xpGained}`;
    ui.fimAcertos.textContent = `${resultado.hits} de ${resultado.total} · ${accuracy(resultado.hits, resultado.total)}%`;
    ui.fimPontos.textContent = String(resultado.score);
    ui.fimSequencia.textContent = String(resultado.bestStreak);
    ui.fimTempo.textContent = formatDuration(resultado.elapsedMs);
    ui.fimRecorde.hidden = !recorde;
    if (desfecho.leveledUp) {
        ui.fimNivel.hidden = false;
        ui.fimNivel.textContent = `Você chegou ao nível ${desfecho.levelAfter}`;
    }
    else {
        ui.fimNivel.hidden = true;
    }
    const temConquistas = desfecho.newAchievements.length > 0;
    ui.fimConquistas.hidden = !temConquistas;
    ui.fimConquistasLista.replaceChildren(...desfecho.newAchievements.map((conquista) => {
        const item = document.createElement("li");
        item.className = "medalha medalha--nova";
        item.append(cartaoMedalha(conquista.icon, conquista.title, conquista.description));
        return item;
    }));
    const temErradas = resultado.misses.length > 0;
    ui.revisar.hidden = !temErradas;
    ui.revisarLista.replaceChildren(...resultado.misses.map((conta) => {
        const item = document.createElement("li");
        item.append(`${conta.text} = `);
        const valor = document.createElement("b");
        valor.textContent = String(conta.answer);
        item.append(valor);
        return item;
    }));
}
function cartaoMedalha(icone, nome, texto) {
    const fragmento = document.createDocumentFragment();
    const marca = document.createElement("span");
    marca.className = "medalha__icone";
    marca.setAttribute("aria-hidden", "true");
    marca.textContent = icone;
    const corpo = document.createElement("div");
    const titulo = document.createElement("span");
    titulo.className = "medalha__nome";
    titulo.textContent = nome;
    const descricao = document.createElement("span");
    descricao.className = "medalha__texto";
    descricao.textContent = texto;
    corpo.append(titulo, descricao);
    fragmento.append(marca, corpo);
    return fragmento;
}
/* --- Medalhas ----------------------------------------------------------- */
function pintarMedalhas() {
    ui.medalhasContagem.textContent = `${unlockedCount(progresso)} de ${ACHIEVEMENTS.length}`;
    ui.medalhasLista.replaceChildren(...ACHIEVEMENTS.map((conquista) => {
        const presa = !isUnlockedAchievement(progresso, conquista.id);
        const item = document.createElement("li");
        item.className = presa ? "medalha medalha--presa" : "medalha";
        item.append(cartaoMedalha(conquista.icon, conquista.title, conquista.description));
        // Barra só nas presas com progresso parcial: numa já conquistada,
        // a barra cheia não informa nada.
        if (presa && conquista.progress) {
            const { have, need } = conquista.progress(progresso);
            if (have > 0) {
                const barra = document.createElement("span");
                barra.className = "medalha__barra";
                const dentro = document.createElement("i");
                dentro.style.transform = `scaleX(${have / need})`;
                barra.append(dentro);
                const texto = document.createElement("span");
                texto.className = "medalha__texto";
                texto.textContent = `${have} de ${need}`;
                item.querySelector("div")?.append(barra, texto);
            }
        }
        return item;
    }));
}
/* --- Perfil -------------------------------------------------------------- */
const TEMAS = ["auto", "light", "dark"];
const TEMA_NOMES = {
    auto: "Automático",
    light: "Claro",
    dark: "Escuro",
};
function aplicarTema(escolha) {
    document.documentElement.dataset.theme = escolha;
    ui.temaRotulo.textContent = TEMA_NOMES[escolha];
}
function pintarPerfil() {
    const nivel = levelFor(progresso.xp);
    ui.perfilNome.textContent = getNickname() ?? "Jogador";
    ui.perfilNivel.textContent = `Nível ${nivel.level} · ${progresso.xp.toLocaleString("pt-BR")} XP`;
    ui.perfilRodadas.textContent = String(progresso.rounds);
    ui.perfilContas.textContent = progresso.questions.toLocaleString("pt-BR");
    ui.perfilPrecisao.textContent = `${overallAccuracy(progresso)}%`;
    ui.perfilOfensiva.textContent = `${progresso.longestStreak} ${progresso.longestStreak === 1 ? "dia" : "dias"}`;
    ui.perfilLicoes.textContent = `${lessonsDone(progresso)} de ${TOTAL_LESSONS}`;
    ui.perfilPerfeitas.textContent = String(progresso.perfectRounds);
    ui.metas.replaceChildren(...DAILY_GOALS.map((alvo) => {
        const botao = document.createElement("button");
        botao.className = "opcao";
        botao.type = "button";
        botao.setAttribute("role", "radio");
        botao.setAttribute("aria-checked", String(alvo === progresso.dailyGoal));
        botao.dataset.meta = String(alvo);
        const nome = document.createElement("span");
        nome.className = "opcao__nome";
        nome.textContent = `${alvo} XP`;
        const dica = document.createElement("span");
        dica.className = "opcao__dica";
        dica.textContent = alvo === 20 ? "leve" : alvo === 50 ? "normal" : "intenso";
        botao.append(nome, dica);
        return botao;
    }));
    ui.somRotulo.textContent = isSoundOn() ? "Ligado" : "Desligado";
    ui.somRotulo.setAttribute("aria-checked", String(isSoundOn()));
    ui.tecladoRotulo.textContent = isKeypadOn() ? "Ligado" : "Desligado";
    ui.tecladoRotulo.setAttribute("aria-checked", String(isKeypadOn()));
    ui.semArmazenamento.hidden = isStorageAvailable();
}
/* --- Placar compartilhado (opcional) -------------------------------------- */
async function mostrarRanking(resultado) {
    ui.ranking.hidden = true;
    if (!(await isAvailable()))
        return;
    ui.ranking.hidden = false;
    const apelido = getNickname();
    ui.apelidoForma.hidden = apelido !== null;
    if (apelido) {
        const salvo = await submitRound(resultado, apelido);
        ui.rankingNota.textContent =
            salvo?.posicao != null
                ? `Você está em ${salvo.posicao}º nesta categoria, com ${salvo.melhor_pessoal} pontos.`
                : "Não deu para enviar esta rodada agora.";
    }
    else {
        ui.rankingNota.textContent = "Escolha um apelido para aparecer no placar.";
    }
    const linhas = await fetchRanking(resultado.mode, resultado.operation, resultado.level);
    const eu = getNickname()?.toLowerCase();
    ui.rankingLista.replaceChildren(...linhas.map((linha) => {
        const item = document.createElement("li");
        item.className = "ranking__linha";
        if (linha.apelido.toLowerCase() === eu)
            item.classList.add("sou-eu");
        const nome = document.createElement("span");
        nome.className = "ranking__nome";
        nome.textContent = linha.apelido;
        const pontos = document.createElement("span");
        pontos.className = "ranking__pontos";
        pontos.textContent = String(linha.pontos);
        item.append(nome, pontos);
        return item;
    }));
    if (linhas.length === 0) {
        ui.rankingNota.textContent = "Ninguém pontuou nesta categoria ainda. Seja o primeiro.";
    }
}
/* --- Avisos passageiros ---------------------------------------------------- */
function torrada(icone, texto) {
    const aviso = document.createElement("p");
    aviso.className = "torrada";
    const marca = document.createElement("span");
    marca.className = "torrada__icone";
    marca.setAttribute("aria-hidden", "true");
    marca.textContent = icone;
    aviso.append(marca, document.createTextNode(texto));
    ui.torradas.append(aviso);
    window.setTimeout(() => {
        aviso.classList.add("torrada--saindo");
        window.setTimeout(() => aviso.remove(), 260);
    }, 2600);
}
/* --- Rotas ------------------------------------------------------------------ */
function abrirJogo(params) {
    const licao = params.licao ? findLesson(params.licao) : undefined;
    if (licao) {
        if (!isUnlocked(progresso, licao.id)) {
            router.replace("trilha");
            return;
        }
        comecarPartida(licao.mode, licao.level, licao.operation, licao.id);
    }
    else {
        const mode = params.modo === "tabuada" ? "tabuada" : "random";
        const level = params.nivel in LEVELS ? params.nivel : livreNivel;
        const operation = params.op && params.op in OPERATION_LABELS ? params.op : livreOperacao;
        comecarPartida(mode, level, mode === "tabuada" ? "mul" : operation);
    }
    mostrar("jogo");
}
function definirRotas() {
    router.define("trilha", () => {
        pintarEstado();
        pintarTrilha();
        mostrar("trilha");
    });
    router.define("livre", () => {
        pintarEstado();
        pintarLivre();
        mostrar("livre");
    });
    router.define("medalhas", () => {
        pintarEstado();
        pintarMedalhas();
        mostrar("medalhas");
    });
    router.define("eu", () => {
        pintarEstado();
        pintarPerfil();
        mostrar("eu");
    });
    router.define("jogo", abrirJogo);
    router.define("fim", () => {
        // Recarregar na tela de resultado sem resultado em memória não tem o
        // que mostrar: volta para a trilha.
        if (!ultimoResultado) {
            router.replace("trilha");
            return;
        }
        mostrar("fim");
    });
    router.setFallback("trilha");
}
/* --- Eventos ---------------------------------------------------------------- */
document.addEventListener("click", (event) => {
    const alvo = event.target;
    sfx.warmUp();
    const navegar = alvo?.closest("[data-ir]");
    if (navegar?.dataset.ir) {
        router.go(navegar.dataset.ir);
        return;
    }
    const licao = alvo?.closest("[data-licao]");
    if (licao?.dataset.licao && !licao.disabled) {
        router.go("jogo", { licao: licao.dataset.licao });
        return;
    }
    const digito = alvo?.closest("[data-digito]");
    if (digito?.dataset.digito) {
        digitar(digito.dataset.digito);
        return;
    }
    const operacao = alvo?.closest("[data-operacao]");
    if (operacao?.dataset.operacao) {
        livreOperacao = operacao.dataset.operacao;
        pintarLivre();
        return;
    }
    const nivel = alvo?.closest("[data-nivel]");
    if (nivel?.dataset.nivel) {
        livreNivel = nivel.dataset.nivel;
        pintarLivre();
        return;
    }
    const meta = alvo?.closest("[data-meta]");
    if (meta?.dataset.meta) {
        progresso = { ...progresso, dailyGoal: Number(meta.dataset.meta) };
        salvar();
        pintarPerfil();
        return;
    }
    const acao = alvo?.closest("[data-acao]")?.dataset.acao;
    if (!acao)
        return;
    switch (acao) {
        case "comecar": {
            const proxima = nextLesson(progresso);
            router.replace("trilha");
            if (proxima) {
                // Vai direto para a trilha; a lição atual já pulsa lá.
                ui.trilha.querySelector(`[data-licao="${proxima}"]`)?.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                });
            }
            break;
        }
        case "comecar-livre":
            router.go("jogo", {
                modo: "random",
                op: livreOperacao,
                nivel: livreNivel,
            });
            break;
        case "responder":
            responder();
            break;
        case "apagar":
            apagarDigito();
            break;
        case "continuar":
            proximaConta();
            break;
        case "sair-jogo":
            partida = null;
            router.go("trilha");
            break;
        case "seguir": {
            const veioDaTrilha = ultimoResultado?.lessonId != null;
            router.go(veioDaTrilha ? "trilha" : "livre");
            break;
        }
        case "repetir":
            if (ultimoResultado) {
                const r = ultimoResultado;
                router.go("jogo", {
                    ...(r.lessonId ? { licao: r.lessonId } : { modo: r.mode, op: r.operation, nivel: r.level }),
                });
            }
            break;
        case "tema": {
            const proximo = TEMAS[(TEMAS.indexOf(getTheme()) + 1) % TEMAS.length];
            setTheme(proximo);
            aplicarTema(proximo);
            break;
        }
        case "som":
            setSoundOn(!isSoundOn());
            pintarPerfil();
            if (isSoundOn())
                sfx.play("toque");
            break;
        case "teclado":
            setKeypadOn(!isKeypadOn());
            ui.teclado.hidden = !isKeypadOn();
            pintarPerfil();
            break;
        case "zerar":
            if (window.confirm("Isto apaga o progresso, os recordes e as conquistas deste aparelho. Não tem volta. Continuar?")) {
                clearEverything();
                progresso = loadProgress();
                ultimoResultado = null;
                aplicarTema(getTheme());
                ui.teclado.hidden = !isKeypadOn();
                pintarEstado();
                router.go("trilha");
                torrada("🧽", "Progresso apagado");
            }
            break;
    }
});
/* --- Entrada de número ------------------------------------------------------ */
function digitar(caractere) {
    if (!partida || partida.travado)
        return;
    if (caractere === "-") {
        // O menos só faz sentido no começo, e alterna.
        ui.resposta.value = ui.resposta.value.startsWith("-")
            ? ui.resposta.value.slice(1)
            : `-${ui.resposta.value}`;
    }
    else if (ui.resposta.value.replace("-", "").length < 7) {
        ui.resposta.value += caractere;
    }
    ui.aviso.textContent = "";
    sfx.play("toque");
}
function apagarDigito() {
    if (!partida || partida.travado)
        return;
    ui.resposta.value = ui.resposta.value.slice(0, -1);
    sfx.play("toque");
}
ui.forma.addEventListener("submit", (event) => {
    event.preventDefault();
    if (partida?.travado)
        proximaConta();
    else
        responder();
});
ui.apelidoForma.addEventListener("submit", (event) => {
    event.preventDefault();
    const apelido = ui.apelido.value.trim();
    if (apelido.length < 2) {
        ui.rankingNota.textContent = "O apelido precisa de ao menos dois caracteres.";
        return;
    }
    setNickname(apelido);
    ui.apelidoForma.hidden = true;
    if (ultimoResultado)
        void mostrarRanking(ultimoResultado);
});
document.addEventListener("keydown", (event) => {
    if (telas.get("jogo")?.hidden)
        return;
    if (event.key === "Escape") {
        partida = null;
        router.go("trilha");
        return;
    }
    // Enter no painel de retorno segue para a próxima conta.
    if (event.key === "Enter" && partida?.travado) {
        event.preventDefault();
        proximaConta();
        return;
    }
    // Com o teclado na tela ligado, o campo não tem foco: as teclas
    // físicas precisam continuar funcionando de todo jeito.
    if (isKeypadOn() && document.activeElement !== ui.resposta) {
        if (/^[0-9]$/.test(event.key)) {
            digitar(event.key);
            event.preventDefault();
        }
        else if (event.key === "Backspace") {
            apagarDigito();
            event.preventDefault();
        }
        else if (event.key === "-") {
            digitar("-");
            event.preventDefault();
        }
    }
});
/* --- Início ------------------------------------------------------------------ */
aplicarTema(getTheme());
ui.versao.textContent = `Versão ${VERSION}`;
ui.teclado.hidden = !isKeypadOn();
ui.metaAlvo.textContent = String(progresso.dailyGoal);
pintarEstado();
salvar();
definirRotas();
// A abertura só aparece quando não há rota pedida: um link direto para
// uma tela não deve passar pela tela de boas-vindas.
if (!window.location.hash) {
    mostrar("splash");
    ui.estado.hidden = true;
    ui.navegacao.hidden = true;
    window.addEventListener("hashchange", () => undefined, { once: true });
}
else {
    router.start();
}
// Com a abertura na tela, o primeiro clique no botão "Começar" é que
// inicia o roteamento.
document.addEventListener("click", (event) => {
    if (event.target?.closest("[data-acao='comecar']")) {
        router.start();
    }
}, { once: false });
// Service worker: só em http(s), porque file:// não registra.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
        void navigator.serviceWorker.register("service-worker.js").catch(() => undefined);
    });
}
//# sourceMappingURL=app.js.map