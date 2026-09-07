// Lista híbrida de tecnologias: um conjunto canónico para autocomplete +
// aliases para normalizar variações. Entrada livre continua a ser permitida
// para o que não está aqui — isto só evita que "React"/"reactjs"/"react.js"
// virem três filtros diferentes.

export const CANONICAL_TECH = [
  // Linguagens
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'PHP', 'Ruby',
  'Go', 'Rust', 'Kotlin', 'Swift', 'Dart', 'R', 'MATLAB', 'SQL', 'HTML', 'CSS',
  'Bash', 'PowerShell', 'Assembly', 'Lua', 'Scala', 'Perl',
  // Frontend
  'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Astro',
  'Tailwind CSS', 'Bootstrap', 'Sass', 'jQuery', 'Redux', 'Vite', 'Webpack',
  'React Native', 'Flutter', 'Ionic', 'Expo',
  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Laravel',
  'Spring Boot', 'ASP.NET', '.NET', 'Ruby on Rails', 'Symfony', 'Deno',
  'GraphQL', 'REST API', 'WebSockets',
  // Dados / BD
  'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Firebase', 'Supabase',
  'SQL Server', 'Oracle', 'MariaDB', 'Prisma', 'Elasticsearch',
  // DevOps / cloud
  'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'Vercel', 'Netlify',
  'Linux', 'Nginx', 'Git', 'GitHub Actions', 'CI/CD', 'Terraform',
  // IA / dados
  'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy', 'OpenCV',
  'Hugging Face', 'LangChain', 'OpenAI API', 'Jupyter',
  // Jogos / 3D / XR
  'Unity', 'Unreal Engine', 'Godot', 'Blender', 'Three.js', 'C# (Unity)',
  // Design / multimédia
  'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro',
  'Adobe InDesign', 'Canva', 'Sketch', 'DaVinci Resolve', 'Cinema 4D',
  // Eletrónica / IoT / CAD
  'Arduino', 'Raspberry Pi', 'ESP32', 'AutoCAD', 'SolidWorks', 'Fusion 360',
  'KiCad', 'PLC', 'MicroPython',
  // Produtividade / gestão
  'Excel', 'Power BI', 'Tableau', 'Notion', 'WordPress', 'Shopify', 'SAP',
]

// alias (minúsculas, sem espaços/pontuação) → forma canónica
const ALIASES = {
  reactjs: 'React', 'react.js': 'React', reactnative: 'React Native',
  js: 'JavaScript', ecmascript: 'JavaScript', node: 'Node.js', nodejs: 'Node.js',
  ts: 'TypeScript', typescriptlang: 'TypeScript',
  vue: 'Vue.js', vuejs: 'Vue.js', 'vue3': 'Vue.js', nextjs: 'Next.js', next: 'Next.js',
  nuxtjs: 'Nuxt', tailwind: 'Tailwind CSS', tailwindcss: 'Tailwind CSS',
  postgres: 'PostgreSQL', postgresql: 'PostgreSQL', psql: 'PostgreSQL',
  mongo: 'MongoDB', mongodb: 'MongoDB', 'mssql': 'SQL Server', sqlserver: 'SQL Server',
  csharp: 'C#', 'c-sharp': 'C#', dotnet: '.NET', 'aspnet': 'ASP.NET', 'asp.net': 'ASP.NET',
  cpp: 'C++', 'c++': 'C++', golang: 'Go',
  py: 'Python', python3: 'Python',
  html5: 'HTML', css3: 'CSS', scss: 'Sass',
  tf: 'TensorFlow', tensorflow: 'TensorFlow', pytorch: 'PyTorch', sklearn: 'scikit-learn',
  threejs: 'Three.js', 'three.js': 'Three.js',
  gcp: 'Google Cloud', googlecloud: 'Google Cloud', 'amazon web services': 'AWS',
  ps: 'Photoshop', ai: 'Illustrator', ae: 'After Effects', pr: 'Premiere Pro',
  indesign: 'Adobe InDesign', xd: 'Adobe XD', 'adobexd': 'Adobe XD',
  unityengine: 'Unity', unrealengine: 'Unreal Engine', ue5: 'Unreal Engine',
  rpi: 'Raspberry Pi', raspberrypi: 'Raspberry Pi',
  powerbi: 'Power BI', 'wordpress.org': 'WordPress',
  restapi: 'REST API', rest: 'REST API', 'api rest': 'REST API',
  githubactions: 'GitHub Actions', cicd: 'CI/CD',
}

const CANON_BY_KEY = new Map(
  CANONICAL_TECH.map(t => [t.toLowerCase().replace(/[\s._-]/g, ''), t]),
)

// Normaliza um termo para a forma canónica. Se não conhecer, devolve o termo
// só com o espaço em branco arrumado (entrada livre continua a valer).
export function normalizeTech(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const key = s.toLowerCase().replace(/[\s._-]/g, '')
  return ALIASES[key] || CANON_BY_KEY.get(key) || s
}

export function normalizeTechList(arr) {
  const out = []
  const seen = new Set()
  for (const t of arr || []) {
    const n = normalizeTech(t)
    const k = n.toLowerCase()
    if (n && !seen.has(k)) { seen.add(k); out.push(n) }
  }
  return out
}

// Sugestões para autocomplete a partir do que a pessoa está a escrever.
export function suggestTech(input, exclude = [], limit = 6) {
  const q = String(input || '').trim().toLowerCase()
  const ex = new Set(exclude.map(e => e.toLowerCase()))
  const pool = CANONICAL_TECH.filter(t => !ex.has(t.toLowerCase()))
  if (!q) return pool.slice(0, limit)
  return pool
    .filter(t => t.toLowerCase().includes(q))
    .sort((a, b) => a.toLowerCase().indexOf(q) - b.toLowerCase().indexOf(q))
    .slice(0, limit)
}
