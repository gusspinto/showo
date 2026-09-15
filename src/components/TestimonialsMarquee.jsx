import './TestimonialsMarquee.css'

/* Testemunhos reais de alunos que já usam a plataforma — texto e autoria
 * tal como foram dados pelos próprios, com foto (pedida por eles) em
 * public/testimonials/. Partilhado entre Pricing e Home para não haver
 * duas listas a divergir ao longo do tempo. */
export const TESTIMONIALS = [
  {
    quote: 'A vida universitária ficou mais leve com a qualidade e desenvolvimento desta plataforma. Não há desculpas agora para não concluir desafios académicos!',
    name: 'Sara Silva',
    role: 'Finalista na Faculdade de Direito da Universidade de Coimbra',
    photo: '/testimonials/sara-silva.jpg',
  },
  {
    quote: 'Era esta a ferramenta que me faltava para os meus estudos. Bastante alinhado com as necessidades dos alunos.',
    name: 'Maria Eduarda',
    role: 'Estudante de Engenharia da Computação e Engenharia de Software — Natixis',
    photo: '/testimonials/maria-eduarda.jpg',
  },
  {
    quote: 'Para alguém que fez PAP e queria usá-la para exposição, esta app é um gamechanger para estudantes na mesma situação.',
    name: 'Rafael Matos',
    role: 'Estudante de Engenharia Informática da Universidade de Aveiro',
    photo: '/testimonials/rafael-matos.jpg',
  },
  {
    quote: 'Parabéns pela plataforma! Acho que é algo necessário e inovador.',
    name: 'Martim Gonçalves',
    role: 'Estudante de Multimédia da Universidade da Maia e Videógrafo/Fotógrafo',
    photo: '/testimonials/martim-goncalves.jpg',
  },
  {
    quote: 'Na minha opinião, um dos pontos mais fortes da plataforma é a Defesa. A organização e preparação torna tudo mais interativo e envolvente.',
    name: 'Rita Sousa',
    role: 'Estudante na Escola Profissional Bento de Jesus Caraça',
    photo: '/testimonials/rita-sousa.jpg',
  },
  {
    quote: 'Uma ideia bastante interessante e bem estruturada, que permite aos alunos criar portfólios e valorizar os seus projetos e competências.',
    name: 'Duarte Leal',
    role: 'Estudante na Escola Profissional Bento de Jesus Caraça',
    photo: '/testimonials/duarte-leal.jpg',
  },
  {
    quote: 'Gostei da ideia da plataforma. O design é apelativo e faz querer explorar mais. Acho que vai ajudar bastante a quem tem projetos e ideias, tanto a nível escolar como profissional.',
    name: 'Rafael Carvalho',
    role: 'Estudante no Instituto Superior Politécnico Gaya',
    photo: '/testimonials/rafael-carvalho.jpg',
  },
]

function TestimonialCard({ quote, name, role, photo }) {
  return (
    <figure className="testimonial-card">
      <blockquote className="testimonial-quote">“{quote}”</blockquote>
      <figcaption className="testimonial-author">
        <img className="testimonial-avatar" src={photo} alt="" width="34" height="34" loading="lazy" />
        <span>
          <strong>{name}</strong>
          <span className="testimonial-role">{role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/* Faixa deslizante em loop contínuo — lista duplicada para a "cauda" que
 * sai por um lado ser idêntica à que entra pelo outro, sem salto visível.
 * Pausa ao passar o rato / focar, para dar para ler sem perseguir o texto. */
export default function TestimonialsMarquee() {
  return (
    <div className="testimonials-marquee">
      <div className="testimonials-track">
        {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} {...t} />
        ))}
      </div>
    </div>
  )
}
