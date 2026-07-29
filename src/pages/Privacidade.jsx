import LegalLayout from '../components/LegalLayout'

export default function Privacidade() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      updated="28 de julho de 2026"
      intro="Aqui explicamos, em português simples, que dados guardamos sobre ti, para que servem e o que podes fazer com eles. Sem juridiquês desnecessário."
    >
      <h2>Quem somos</h2>
      <p>
        A Showo ajuda estudantes a transformar os seus projetos (PAPs, estágios, trabalhos) em páginas profissionais.
        Quem trata os teus dados é a Showo, e podes falar connosco quando quiseres em <a href="mailto:hello@showo.pt">hello@showo.pt</a>.
      </p>

      <h2>Que dados guardamos</h2>
      <ul>
        <li><strong>Dados da conta:</strong> o teu nome, email, a palavra-passe (guardada sempre encriptada) e o papel que escolheste, seja aluno, professor ou recrutador.</li>
        <li><strong>Perfil:</strong> escola, curso, ano, foto, competências e links como o LinkedIn ou o GitHub. Preenches só o que quiseres.</li>
        <li><strong>O que crias:</strong> os teus projetos, os textos de cada secção, as imagens de capa, as mensagens e os comentários.</li>
        <li><strong>Como usas a app:</strong> que páginas visitas e que ações fazes, para percebermos o que ajuda e o que atrapalha.</li>
        <li><strong>Dados técnicos:</strong> o teu endereço IP, o tipo de dispositivo e registos de erros, para manter tudo seguro e a funcionar.</li>
      </ul>

      <h2>Para que servem</h2>
      <ul>
        <li>Para te dar o serviço: criar a tua conta, montar as tuas páginas de projeto e deixar-te partilhá-las.</li>
        <li>Para gerar a análise e o feedback da inteligência artificial sobre os teus projetos.</li>
        <li>Para falar contigo quando é preciso, seja confirmar o email, repor a palavra-passe ou avisar de algo importante.</li>
        <li>Para melhorar e proteger a Showo, olhando para estatísticas no conjunto e travando abusos.</li>
      </ul>

      <h2>Com quem falam os teus dados</h2>
      <p>Não vendemos os teus dados a ninguém. Para a app funcionar, apoiamo-nos em alguns serviços de confiança que tratam dados por nós:</p>
      <ul>
        <li><strong>Supabase</strong>, onde a tua conta e o teu conteúdo ficam guardados.</li>
        <li><strong>Vercel</strong>, que aloja o site.</li>
        <li><strong>PostHog</strong>, que nos dá as estatísticas de utilização.</li>
        <li><strong>Sentry</strong>, que nos avisa quando algo rebenta tecnicamente.</li>
        <li><strong>Anthropic (Claude)</strong>, a IA que escreve a análise. O texto do teu projeto vai para lá só para gerar o feedback, e não serve para treinar o modelo.</li>
      </ul>
      <p>
        Alguns destes serviços podem tratar dados fora da Europa, por exemplo nos EUA. Quando isso acontece, é feito com as
        salvaguardas que o RGPD exige, como as Cláusulas Contratuais-Tipo.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos cookies só para o essencial, como manter a tua sessão aberta, e para estatísticas de utilização.
        Podes limpá-los no teu navegador sempre que quiseres.
      </p>

      <h2>Menores de idade</h2>
      <p>
        A Showo é usada por estudantes e alguns podem ser menores. Em Portugal, tratar dados de quem tem menos de 16 anos precisa
        do consentimento de quem cuida deles. Se és encarregado de educação e achas que um menor nos deu dados sem esse consentimento,
        escreve-nos e apagamos tudo.
      </p>

      <h2>Os teus direitos</h2>
      <p>O RGPD dá-te controlo sobre os teus dados. A qualquer momento podes:</p>
      <ul>
        <li>Ver os dados que temos sobre ti e pedir uma cópia.</li>
        <li>Corrigir o que estiver errado.</li>
        <li>Apagar a conta e tudo o que lhe pertence.</li>
        <li>Levar os teus dados contigo (portabilidade).</li>
        <li>Opores-te ou limitar certos usos.</li>
      </ul>
      <p>
        Para qualquer uma destas coisas, é só escreveres para <a href="mailto:hello@showo.pt">hello@showo.pt</a>. Se sentires
        que algo não está bem, tens também o direito de te queixares à CNPD, a Comissão Nacional de Proteção de Dados.
      </p>

      <h2>Quanto tempo guardamos</h2>
      <p>
        Guardamos os teus dados enquanto tiveres conta. Se a apagares, removemos os teus dados pessoais num prazo razoável,
        exceto o que a lei nos obrigar a manter.
      </p>

      <h2>Segurança</h2>
      <p>
        Protegemos os teus dados com o que é preciso: palavras-passe encriptadas, acessos restritos e ligações seguras.
        Nenhum sistema é perfeito, mas se algo correr mal, agimos depressa.
      </p>

      <h2>Alterações a esta política</h2>
      <p>
        Se mudarmos esta política, atualizamos a data lá em cima. Se a mudança for importante, avisamos-te.
      </p>

      <h2>Falar connosco</h2>
      <p>Qualquer dúvida sobre privacidade, é só dizeres: <a href="mailto:hello@showo.pt">hello@showo.pt</a>.</p>
    </LegalLayout>
  )
}
