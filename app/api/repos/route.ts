import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

interface CommitItem {
  commit?: { message?: string };
}

async function fetchRepoData(ownerRepo: string, headers: HeadersInit) {
  const [infoRes, langsRes, commitsRes, readmeRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${ownerRepo}`, { headers }),
    fetch(`https://api.github.com/repos/${ownerRepo}/languages`, { headers }),
    fetch(`https://api.github.com/repos/${ownerRepo}/commits?per_page=100`, { headers }),
    fetch(`https://api.github.com/repos/${ownerRepo}/readme`, { headers }),
  ]);

  if (!infoRes.ok) {
    const status = infoRes.status;
    if (status === 404) throw new Error(`${ownerRepo}: repo não encontrado ou privado (401 necessário)`);
    if (status === 403 || status === 429) throw new Error(`${ownerRepo}: rate limit da API do GitHub — adicione GITHUB_TOKEN no .env.local`);
    if (status === 401) throw new Error(`${ownerRepo}: repo privado — adicione GITHUB_TOKEN no .env.local`);
    throw new Error(`${ownerRepo}: erro ${status} da API do GitHub`);
  }

  const info = await infoRes.json();
  const langs: Record<string, number> = langsRes.ok ? await langsRes.json() : {};
  const commits: CommitItem[] = commitsRes.ok ? await commitsRes.json() : [];
  const readmeData = readmeRes.ok ? await readmeRes.json() : null;

  const readme = readmeData?.content
    ? Buffer.from(readmeData.content, "base64").toString("utf-8").slice(0, 3000)
    : "";

  const commitMessages = Array.isArray(commits)
    ? commits
        .slice(0, 20)
        .map((c) => c.commit?.message?.split("\n")[0])
        .filter(Boolean)
    : [];

  const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0);
  const langPercent = Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, bytes]) => `${lang} ${((bytes / totalBytes) * 100).toFixed(0)}%`);

  return {
    ownerRepo,
    name: info.name as string,
    description: (info.description as string) ?? "",
    stars: (info.stargazers_count as number) ?? 0,
    topics: (info.topics as string[]) ?? [],
    languages: langPercent,
    commitCount: Array.isArray(commits) ? commits.length : 0,
    commitMessages,
    readme,
    createdAt: (info.created_at as string)?.slice(0, 10),
    pushedAt: (info.pushed_at as string)?.slice(0, 10),
  };
}

async function generatePostsForRepo(
  repo: Awaited<ReturnType<typeof fetchRepoData>>,
  tom: string,
  authorName: string
) {
  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    temperature: 0.9,
    prompt: `Você vai escrever posts para LinkedIn como se fosse ${authorName}, um desenvolvedor fullstack falando sobre o projeto "${repo.name}".

DADOS DO PROJETO:
- Descrição: ${repo.description}
- Stack usada: ${repo.languages.join(", ")}
- Topics: ${repo.topics.join(", ")}
- Commits: ${repo.commitCount} commits
- Período: ${repo.createdAt} até ${repo.pushedAt}
- O que foi feito (commits): ${repo.commitMessages.slice(0, 15).join(" | ")}
- README:
${repo.readme.slice(0, 2500)}

REGRAS DE VOZ E ESTILO:
- Escreva em PRIMEIRA PESSOA, como ${authorName} contando sua própria história
- Use "eu", "a gente", "meu time", "construí", "aprendi", "descobri", "tive que"
- Seja específico: cite tecnologias pelo nome, mencione decisões reais, problemas concretos
- Narrativa natural: "participei de uma hackathon onde a gente precisava resolver X...", "quando comecei a construir isso, o maior desafio foi..."
- Mostre o raciocínio: por que escolheu essa tech, o que não funcionou primeiro, o que surpreendeu
- Pode mencionar aprendizados novos: "foi a primeira vez que usei X", "nunca tinha trabalhado com Y antes"
- Parágrafos curtos (1-3 linhas), linguagem direta, sem pompas
- PROIBIDO: "humilde", "abençoado", "jornada incrível", "networking valioso", "muito grato", frases genéricas de LinkedIn
- PROIBIDO inventar métricas que não estão nos dados acima
- Hashtags relevantes no final de cada post (3 a 5)
- Tom geral: ${tom}

CINCO POSTS com ângulos diferentes:
1. A história por trás: por que esse projeto nasceu, qual problema real motivou
2. O lado técnico: as escolhas de stack, uma decisão difícil, algo que aprendeu na prática
3. O processo: como foi construir, o que foi diferente do esperado, o que faria diferente
4. Resultado ou impacto: o que o projeto entrega, quem usa, o que mudou (só o que está nos dados)
5. Conexão com mercado: o que esse projeto diz sobre o que você quer fazer profissionalmente

FORMATO (JSON puro, sem nenhum texto fora do JSON):
{"posts": ["post 1 completo", "post 2 completo", "post 3 completo", "post 4 completo", "post 5 completo"]}`,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    const raw: unknown[] = Array.isArray(parsed.posts) ? parsed.posts : [];
    return raw.map(normalizePost).filter(Boolean);
  } catch {
    return text
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
}

function normalizePost(post: unknown): string {
  if (typeof post === "string") return post;
  if (post && typeof post === "object") {
    const p = post as Record<string, unknown>;
    const body = typeof p.text === "string" ? p.text : typeof p.content === "string" ? p.content : "";
    const tags = Array.isArray(p.hashtags)
      ? p.hashtags.map((h) => (String(h).startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
    return tags ? `${body}\n\n${tags}` : body;
  }
  return String(post ?? "");
}

export async function POST(request: Request) {
  const { repos, tom = "profissional", authorName = "" } = await request.json();

  if (!Array.isArray(repos) || repos.length === 0) {
    return Response.json({ error: "repos obrigatório" }, { status: 400 });
  }

  const headers: HeadersInit = { "User-Agent": "presencedev-app" };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // fetch all repos in parallel
  const repoDataResults = await Promise.allSettled(
    repos.map((r: string) => fetchRepoData(r.trim(), headers))
  );

  const validRepos = repoDataResults
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchRepoData>>> => r.status === "fulfilled")
    .map((r) => r.value);

  const errors = repoDataResults
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message ?? "Erro desconhecido");

  // generate posts per repo in parallel
  const postsResults = await Promise.allSettled(
    validRepos.map((repo) => generatePostsForRepo(repo, tom, authorName))
  );

  const results = validRepos.map((repo, i) => ({
    ownerRepo: repo.ownerRepo,
    name: repo.name,
    description: repo.description,
    languages: repo.languages,
    topics: repo.topics,
    commitCount: repo.commitCount,
    stars: repo.stars,
    posts: postsResults[i].status === "fulfilled" ? postsResults[i].value : [],
  }));

  return Response.json({ results, errors });
}
