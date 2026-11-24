/**
 * Service worker — faz o app abrir instantâneo e funcionar sem rede.
 *
 * Estratégia por tipo de pedido, porque uma só não serve para tudo:
 *
 *   /api/*        rede, sem cache. Placar velho é pior que placar nenhum.
 *   navegação     rede primeiro, cache como reserva. Assim uma versão
 *                 nova aparece ao recarregar, e o app ainda abre offline.
 *   resto         cache primeiro, atualizando por trás. CSS, JS e fontes
 *                 trocam de nome a cada versão, então servir do cache é
 *                 seguro e instantâneo.
 *
 * O nome do cache carrega a versão: ao publicar uma versão nova, o
 * activate apaga os caches antigos e o app recarrega limpo.
 */

const VERSAO = "3.1.0";
const CACHE = `bbam-${VERSAO}`;

/** O mínimo para o app abrir offline. */
const ESSENCIAIS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/engine.js",
  "./assets/js/curriculum.js",
  "./assets/js/progress.js",
  "./assets/js/storage.js",
  "./assets/js/router.js",
  "./assets/js/sfx.js",
  "./assets/js/api.js",
  "./assets/img/icone.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll falha inteiro se um arquivo faltar; um a um, o que der
      // certo é guardado e o app ainda funciona.
      await Promise.allSettled(ESSENCIAIS.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só GET: POST de rodada nunca pode sair do cache.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Outro domínio (fontes do Google): deixa o navegador cuidar.
  if (url.origin !== self.location.origin) return;

  // A API é sempre ao vivo.
  if (url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(redePrimeiro(request));
    return;
  }

  event.respondWith(cachePrimeiro(request));
});

async function redePrimeiro(request) {
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch {
    return (
      (await cache.match(request)) ??
      (await cache.match("./index.html")) ??
      new Response("Sem conexão e sem cópia guardada.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cachePrimeiro(request) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(request);

  if (guardado) {
    // Revalida por trás: a próxima visita já pega o arquivo novo.
    void fetch(request)
      .then((resposta) => {
        if (resposta.ok) void cache.put(request, resposta);
      })
      .catch(() => undefined);
    return guardado;
  }

  try {
    const resposta = await fetch(request);
    if (resposta.ok) void cache.put(request, resposta.clone());
    return resposta;
  } catch {
    return new Response("", { status: 504 });
  }
}
