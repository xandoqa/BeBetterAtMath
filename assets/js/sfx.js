/**
 * Sons e vibração.
 *
 * Os sons são **gerados** na hora com WebAudio, não carregados de
 * arquivo: um .mp3 de acerto custaria uns 20 KB e um pedido de rede a
 * mais para tocar 200 ms de bipe. Osciladores custam zero byte.
 *
 * O AudioContext só é criado no primeiro toque do jogador, porque o
 * navegador bloqueia áudio antes de qualquer interação — criar antes
 * resultaria num contexto suspenso e em silêncio.
 */
import { isSoundOn } from "./storage.js";
let context = null;
function ensureContext() {
    if (context)
        return context;
    try {
        const Ctor = window.AudioContext ?? window.webkitAudioContext;
        if (!Ctor)
            return null;
        context = new Ctor();
        return context;
    }
    catch {
        return null;
    }
}
/** Uma nota simples, com envelope para não estalar no corte. */
function note(ctx, frequency, startAt, duration, gain, type = "triangle") {
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);
    // Ataque curto e decaimento exponencial: sem o envelope, ligar e
    // desligar o oscilador produz um clique audível.
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(gain, startAt + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(envelope);
    envelope.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
}
/** Frequências em Hz. Acordes maiores sobem, o erro desce. */
const VOICES = {
    toque: { steps: [660], gain: 0.05, step: 0 },
    acerto: { steps: [784, 1047], gain: 0.09, step: 0.075 },
    erro: { steps: [330, 247], gain: 0.08, step: 0.1, type: "sawtooth" },
    fim: { steps: [523, 659, 784, 1047], gain: 0.1, step: 0.11 },
    nivel: { steps: [659, 784, 988, 1319], gain: 0.11, step: 0.1 },
    destrave: { steps: [880, 1175], gain: 0.09, step: 0.09 },
};
export function play(voice) {
    if (!isSoundOn())
        return;
    const ctx = ensureContext();
    if (!ctx)
        return;
    // Em iOS o contexto nasce suspenso e só retoma dentro de um gesto.
    if (ctx.state === "suspended")
        void ctx.resume().catch(() => undefined);
    const spec = VOICES[voice];
    const now = ctx.currentTime + 0.01;
    spec.steps.forEach((frequency, index) => {
        note(ctx, frequency, now + index * spec.step, 0.16, spec.gain, spec.type);
    });
}
/** Vibração curta, onde o aparelho tiver. Ignorado no computador. */
export function buzz(pattern = 14) {
    if (!isSoundOn())
        return;
    try {
        navigator.vibrate?.(pattern);
    }
    catch {
        /* sem vibração: segue sem */
    }
}
/** Libera o áudio no primeiro gesto, para o primeiro som não sair mudo. */
export function warmUp() {
    const ctx = ensureContext();
    if (ctx?.state === "suspended")
        void ctx.resume().catch(() => undefined);
}
//# sourceMappingURL=sfx.js.map