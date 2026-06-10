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

  if (!infoRes.ok) throw new Error(`Repo não encontrado: ${ownerRepo}`);

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
    temperature: 0.85,
    prompt: `Você é especialista em posicionamento de carreira para desenvolvedores. Crie posts reais para LinkedIn em português do Brasil.

DADOS DO REPOSITÓRIO:
- Nome: ${repo.name}
- Descrição: ${repo.description}
- Stack: ${repo.languages.join(", ")}
- Topics: ${repo.topics.join(", ")}
- Commits: ${repo.commitCount} commits
- Criado em: ${repo.createdAt} | Último push: ${repo.pushedAt}
- Mensagens de commit recentes: ${repo.commitMessages.slice(0, 10).join(" | ")}
- README (trecho):
${repo.readme.slice(0, 2000)}

AUTOR: ${authorName}

INSTRUÇÕES:
- Gere exatamente 5 posts, cada um com um ângulo diferente:
  1. O problema que o projeto resolve (storytelling do problema real)
  2. Stack técnica e decisões de arquitetura (para devs)
  3. Processo de construção / aprendizados
  4. Resultado / impacto / métricas (se houver no README)
  5. Post de busca por oportunidade ligando o projeto ao mercado
- Posts diretos, sem clichês ("humilde", "abençoado", "jornada incrível")
- 4 a 8 parágrafos curtos por post
- Hashtags relevantes no final
- Tom: ${tom}
- Baseie APENAS no que está nos dados acima, não invente métricas

FORMATO (JSON puro, sem texto fora):
{"posts": ["post 1", "post 2", "post 3", "post 4", "post 5"]}`,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed.posts) ? parsed.posts : [];
  } catch {
    return text
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
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
