/**
 * Navegação por hash (#/trilha, #/livre, ...).
 *
 * Existe para resolver um problema concreto da v2: sem rota, o botão
 * voltar do navegador — e o gesto de voltar do Android — saía do app em
 * vez de voltar uma tela. Com hash, o histórico passa a funcionar e cada
 * tela ganha um endereço que pode ser recarregado ou compartilhado.
 *
 * Hash em vez de History API porque o app é servido como arquivo
 * estático: `/trilha` daria 404 ao recarregar, já `#/trilha` não chega
 * ao servidor.
 */

export type RouteHandler = (params: Readonly<Record<string, string>>) => void;

interface Route {
  readonly name: string;
  readonly handler: RouteHandler;
}

const routes = new Map<string, Route>();
let fallback = "trilha";
/** Telas que não entram no histórico ao serem substituídas. */
let current = "";

export function define(name: string, handler: RouteHandler): void {
  routes.set(name, { name, handler });
}

export function setFallback(name: string): void {
  fallback = name;
}

/** Lê o hash atual como nome de rota e parâmetros de busca. */
function parse(hash: string): { name: string; params: Record<string, string> } {
  const clean = hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = clean.split("?");
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(query)) params[key] = value;
  return { name: path || fallback, params };
}

function dispatch(): void {
  const { name, params } = parse(window.location.hash);
  const route = routes.get(name);

  if (!route) {
    // Rota desconhecida (link velho, hash digitado à mão): volta ao
    // começo em vez de deixar a tela vazia.
    replace(fallback);
    return;
  }

  current = name;
  route.handler(params);
}

/** Vai para uma rota, acrescentando ao histórico. */
export function go(name: string, params?: Readonly<Record<string, string>>): void {
  const hash = build(name, params);
  if (window.location.hash === hash) {
    dispatch();
    return;
  }
  window.location.hash = hash;
}

/** Troca a rota atual sem criar uma entrada no histórico. */
export function replace(name: string, params?: Readonly<Record<string, string>>): void {
  const hash = build(name, params);
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.replaceState(null, "", url);
  dispatch();
}

function build(name: string, params?: Readonly<Record<string, string>>): string {
  const query = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : "";
  return `#/${name}${query}`;
}

export function currentRoute(): string {
  return current;
}

/** Volta uma entrada do histórico. */
export function back(): void {
  window.history.back();
}

/** Começa a ouvir o hash. Chame uma vez, depois de definir as rotas. */
export function start(): void {
  window.addEventListener("hashchange", dispatch);
  if (!window.location.hash) {
    replace(fallback);
  } else {
    dispatch();
  }
}
