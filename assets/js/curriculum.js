/**
 * A trilha: unidades e lições, em ordem.
 *
 * É só dado — nenhuma lógica de progresso aqui. Quem decide o que está
 * destravado é progress.ts, a partir do que o jogador já concluiu.
 *
 * Para acrescentar uma lição, inclua na lista da unidade. A ordem da
 * lista é a ordem de destrave, então mexer na ordem muda o caminho de
 * quem está no meio da trilha: prefira acrescentar no fim de uma unidade.
 */
export const UNITS = [
    {
        id: "u1",
        number: 1,
        title: "Primeiros passos",
        subtitle: "A tabuada do 1 ao 10",
        hue: "violeta",
        lessons: [
            { id: "u1-l1", title: "Tabuada fácil", mode: "tabuada", level: "easy", operation: "mul" },
            { id: "u1-l2", title: "Somando", mode: "random", level: "easy", operation: "sum" },
            { id: "u1-l3", title: "Mais tabuada", mode: "tabuada", level: "easy", operation: "mul" },
            { id: "u1-l4", title: "Soma e revisão", mode: "random", level: "easy", operation: "sum" },
        ],
    },
    {
        id: "u2",
        number: 2,
        title: "Tirando e pondo",
        subtitle: "Subtração sem susto",
        hue: "turquesa",
        lessons: [
            { id: "u2-l1", title: "Subtração fácil", mode: "random", level: "easy", operation: "sub" },
            { id: "u2-l2", title: "Soma e subtração", mode: "random", level: "easy", operation: "mix" },
            { id: "u2-l3", title: "Subtração média", mode: "random", level: "medium", operation: "sub" },
            { id: "u2-l4", title: "Tudo do fácil", mode: "random", level: "easy", operation: "mix" },
        ],
    },
    {
        id: "u3",
        number: 3,
        title: "Tabuada firme",
        subtitle: "Multiplicar números maiores",
        hue: "tangerina",
        lessons: [
            { id: "u3-l1", title: "Tabuada média", mode: "tabuada", level: "medium", operation: "mul" },
            { id: "u3-l2", title: "Multiplicação", mode: "random", level: "medium", operation: "mul" },
            { id: "u3-l3", title: "Tabuada em dia", mode: "tabuada", level: "medium", operation: "mul" },
            { id: "u3-l4", title: "Soma média", mode: "random", level: "medium", operation: "sum" },
        ],
    },
    {
        id: "u4",
        number: 4,
        title: "Dividindo",
        subtitle: "Divisão que sempre fecha",
        hue: "ambar",
        lessons: [
            { id: "u4-l1", title: "Divisão fácil", mode: "random", level: "easy", operation: "div" },
            { id: "u4-l2", title: "Divisão média", mode: "random", level: "medium", operation: "div" },
            { id: "u4-l3", title: "Multiplicar e dividir", mode: "random", level: "medium", operation: "mix" },
            { id: "u4-l4", title: "Divisão firme", mode: "random", level: "medium", operation: "div" },
        ],
    },
    {
        id: "u5",
        number: 5,
        title: "Tudo junto",
        subtitle: "As quatro operações misturadas",
        hue: "rosa",
        lessons: [
            { id: "u5-l1", title: "Misto médio", mode: "random", level: "medium", operation: "mix" },
            { id: "u5-l2", title: "Tabuada difícil", mode: "tabuada", level: "hard", operation: "mul" },
            { id: "u5-l3", title: "Soma difícil", mode: "random", level: "hard", operation: "sum" },
            { id: "u5-l4", title: "Subtração difícil", mode: "random", level: "hard", operation: "sub" },
        ],
    },
    {
        id: "u6",
        number: 6,
        title: "Nível capivara",
        subtitle: "O desafio final",
        hue: "violeta",
        lessons: [
            { id: "u6-l1", title: "Divisão difícil", mode: "random", level: "hard", operation: "div" },
            { id: "u6-l2", title: "Multiplicação difícil", mode: "random", level: "hard", operation: "mul" },
            { id: "u6-l3", title: "Misto difícil", mode: "random", level: "hard", operation: "mix" },
            { id: "u6-l4", title: "Prova final", mode: "random", level: "hard", operation: "mix" },
        ],
    },
];
/** Todas as lições, na ordem da trilha. */
export const LESSONS = UNITS.flatMap((unit) => unit.lessons);
const BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
const UNIT_BY_LESSON = new Map(UNITS.flatMap((unit) => unit.lessons.map((lesson) => [lesson.id, unit])));
export function findLesson(id) {
    return BY_ID.get(id);
}
export function unitOf(lessonId) {
    return UNIT_BY_LESSON.get(lessonId);
}
/** Posição da lição na trilha inteira, começando em 0. */
export function indexOf(lessonId) {
    return LESSONS.findIndex((lesson) => lesson.id === lessonId);
}
export const TOTAL_LESSONS = LESSONS.length;
//# sourceMappingURL=curriculum.js.map