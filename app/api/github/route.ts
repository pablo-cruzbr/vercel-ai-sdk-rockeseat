import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  pushed_at: string;
  fork: boolean;
  size: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return Response.json({ error: "username obrigatório" }, { status: 400 });
  }

  const headers: HeadersInit = { "User-Agent": "presencedev-app" };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const [profileRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers }),
  ]);

  if (!profileRes.ok) {
    return Response.json({ error: "Usuário não encontrado no GitHub" }, { status: 404 });
  }

  const profile = await profileRes.json();
  const allRepos: GithubRepo[] = await reposRes.json();

  const ownRepos = allRepos.filter((r) => !r.fork);

  // language frequency
  const langCount: Record<string, number> = {};
  for (const repo of ownRepos) {
    if (repo.language) langCount[repo.language] = (langCount[repo.language] ?? 0) + 1;
  }
  const topLangs = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, count]) => `${lang} (${count} repos)`);

  const topRepos = ownRepos
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.size - a.size)
    .slice(0, 15)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      topics: r.topics,
      lastPush: r.pushed_at.slice(0, 10),
    }));

  const summary = {
    login: profile.login,
    name: profile.name,
    bio: profile.bio,
    followers: profile.followers,
    following: profile.following,
    public_repos: profile.public_repos,
    totalOwnRepos: ownRepos.length,
    topLanguages: topLangs,
    topRepos,
  };

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    temperature: 0.7,
    prompt: `Você é um especialista em posicionamento de carreira para desenvolvedores. Analise o perfil GitHub abaixo e gere um relatório em português do Brasil.

DADOS DO GITHUB:
${JSON.stringify(summary, null, 2)}

Gere um JSON com exatamente este formato (sem texto fora do JSON):
{
  "resumo": "2-3 frases descrevendo o perfil técnico real desta pessoa com base nos repositórios",
  "linguagens": ["lista das principais linguagens/tecnologias detectadas"],
  "pontosFortesParaLinkedIn": [
    "ponto forte 1 com evidência do GitHub",
    "ponto forte 2 com evidência do GitHub",
    "ponto forte 3 com evidência do GitHub",
    "ponto forte 4 com evidência do GitHub"
  ],
  "projetosDestaque": [
    {
      "nome": "nome do repo",
      "angulo": "por que este projeto é interessante para mostrar no LinkedIn"
    }
  ],
  "temasSugeridosParaPosts": [
    "tema 1 baseado nos projetos reais",
    "tema 2 baseado nos projetos reais",
    "tema 3 baseado nos projetos reais",
    "tema 4 baseado nos projetos reais",
    "tema 5 baseado nos projetos reais"
  ]
}`,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let analysis = null;
  if (jsonMatch) {
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = null;
    }
  }

  return Response.json({ summary, analysis });
}
