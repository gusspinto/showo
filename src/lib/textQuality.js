// Um campo comprido não é o mesmo que um campo preenchido — o gerador de
// rascunho deixa espaços como "[contexto: ...]" ou "[X]%" para o dono
// substituir, e esses passam a verificação de tamanho sem problema. Usado
// tanto na gravação (saveProject.js, para não publicar isto sem ninguém
// ver) como na apresentação (ProjectPage.jsx, para avisar o dono).
export const PLACEHOLDER_RE = /\[[^[\]]{1,60}\]/
export const hasPlaceholder = (text) => PLACEHOLDER_RE.test(text || '')
