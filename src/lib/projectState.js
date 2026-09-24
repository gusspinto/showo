// Estado do projeto — sem coluna nova na base de dados. "Concluído" é só a
// presença de project_finished_on (a mesma coluna que já existia para a
// duração do percurso). O comentário da migração 153 já dizia porquê: um
// enum à parte só dava outro campo que podia discordar do resto.
export function getProjectState(project) {
  return project?.project_finished_on ? 'concluido' : 'em_progresso'
}

export const PROJECT_STATE_LABEL = {
  em_progresso: 'Em desenvolvimento',
  concluido: 'Concluído',
}
