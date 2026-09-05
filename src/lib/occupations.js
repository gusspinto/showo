// Lista partilhada de "o que fazes" — conta Individual (Register.jsx),
// edição no perfil (Settings.jsx) e apresentação no perfil público
// (UserProfile.jsx). Cobre estudo, emprego, freelance e "sem emprego" —
// qualquer pessoa deve encontrar-se numa destas opções.
export const OCCUPATIONS = [
  'Aluno / A estudar',
  'Estagiário(a)',
  'À procura de emprego',
  'Freelancer',
  'Developer / Programador(a)',
  'Designer',
  'Product Manager',
  'Marketing',
  'Vendas',
  'Recursos Humanos',
  'Finanças / Contabilidade',
  'Engenheiro(a)',
  'Saúde',
  'Educação / Professor(a)',
  'Consultor(a)',
  'Empreendedor(a) / Fundador(a)',
  'CEO / Diretor(a)',
  'Criativo(a) / Artista',
  'Outro',
]

export function occupationLabel(value) {
  return OCCUPATIONS.includes(value) ? value : null
}
