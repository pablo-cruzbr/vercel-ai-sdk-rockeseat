"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ─── types ────────────────────────────────────────────────────────────────────

interface Post {
  id: number;
  content: string;
}

interface FormData {
  nome: string;
  cargo: string;
  stack: string;
  projetos: string;
  objetivo: string;
  tom: string;
}

interface RepoResult {
  ownerRepo: string;
  name: string;
  description: string;
  languages: string[];
  topics: string[];
  commitCount: number;
  stars: number;
  posts: string[];
}

// ─── defaults ─────────────────────────────────────────────────────────────────

const defaultForm: FormData = {
  nome: "",
  cargo: "",
  stack: "",
  projetos: "",
  objetivo: "",
  tom: "profissional",
};

const DEFAULT_REPOS = `ProgramadoresSemPatria/HB03-2025_bugless
ProgramadoresSemPatria/HB01-2026-ai-mock-interview
pablo-cruzbr/Allti-Control
pablo-cruzbr/Mestre_da_Comanda_Saas
pablo-cruzbr/Portifolio-Metadata-API
pablo-cruzbr/Controle-Financeiro-Sheets-API`;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<"posts" | "github">("posts");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-lg">
            Pablo<span className="text-blue-500">Dev</span>
          </h1>
          <nav className="flex gap-1 bg-[#111] border border-gray-800 rounded-lg p-1">
            <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
              Gerar posts
            </TabButton>
            <TabButton active={tab === "github"} onClick={() => setTab("github")}>
              Analisar repositórios
            </TabButton>
          </nav>
        </div>
      </header>

      {tab === "posts" ? <PostsTab /> : <GithubTab />}
    </div>
  );
}

// ─── tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ─── posts tab ────────────────────────────────────────────────────────────────

function PostsTab() {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    try {
      const f = localStorage.getItem("pablodev-form");
      if (f) setForm(JSON.parse(f));
      const p = localStorage.getItem("pablodev-posts");
      if (p) setPosts(JSON.parse(p));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("pablodev-form", JSON.stringify(form)); } catch {}
  }, [form]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPosts([]);
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newPosts = data.posts.map((content: string, i: number) => ({ id: i, content }));
      setPosts(newPosts);
      try { localStorage.setItem("pablodev-posts", JSON.stringify(newPosts)); } catch {}
    } catch {
      setError("Não foi possível gerar os posts. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPost(post: Post) {
    await navigator.clipboard.writeText(post.content);
    setCopied(post.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <section>
        <h2 className="text-xl font-bold mb-6">Seu perfil</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome" name="nome" value={form.nome} onChange={handleChange} placeholder="Pablo Cruz" />
          <Field label="Cargo atual" name="cargo" value={form.cargo} onChange={handleChange} placeholder="Desenvolvedor Fullstack Jr" />
          <Field label="Stack principal" name="stack" value={form.stack} onChange={handleChange} placeholder="TypeScript, React, Next.js, Node.js, PostgreSQL" />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Projetos e conquistas</label>
            <Textarea
              name="projetos"
              value={form.projetos}
              onChange={handleChange}
              placeholder="AltiControl SaaS (76 usuários, 10 meses), Mestre das Comandas, Bugless (hackathon IA)..."
              className="bg-[#111] border-gray-700 text-white placeholder:text-gray-600 resize-none h-28"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Objetivo</label>
            <select name="objetivo" value={form.objetivo} onChange={handleChange}
              className="bg-[#111] border border-gray-700 text-white rounded-md px-3 py-2 text-sm" required>
              <option value="">Selecione...</option>
              <option value="nova vaga">Conseguir uma nova vaga</option>
              <option value="visibilidade">Aumentar visibilidade</option>
              <option value="networking">Expandir network</option>
              <option value="posicionamento">Posicionamento como dev</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Tom dos posts</label>
            <select name="tom" value={form.tom} onChange={handleChange}
              className="bg-[#111] border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
              <option value="profissional">Profissional</option>
              <option value="direto">Direto e objetivo</option>
              <option value="storytelling">Storytelling pessoal</option>
              <option value="tecnico">Técnico com contexto</option>
            </select>
          </div>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 font-bold mt-2 h-11">
            {loading ? "Gerando posts..." : "Gerar posts"}
          </Button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-6">
          {posts.length > 0 ? `${posts.length} posts gerados` : "Posts"}
        </h2>
        {!loading && posts.length === 0 && (
          <div className="border border-dashed border-gray-800 rounded-xl p-10 text-center text-gray-600">
            <p className="text-sm">Preencha seu perfil e clique em &quot;Gerar posts&quot;</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#111] border border-gray-800 rounded-xl p-5 animate-pulse h-32" />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              <Button variant="outline" size="sm" onClick={() => copyPost(post)}
                className="self-end border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-xs">
                {copied === post.id ? "Copiado!" : "Copiar post"}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── github tab ───────────────────────────────────────────────────────────────

function GithubTab() {
  const [reposText, setReposText] = useState(DEFAULT_REPOS);
  const [authorName, setAuthorName] = useState("Pablo Cruz");
  const [tom, setTom] = useState("profissional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<RepoResult[]>([]);
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [openRepo, setOpenRepo] = useState<string | null>(null);
  const [copiedPost, setCopiedPost] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResults([]);
    setApiErrors([]);
    setOpenRepo(null);
    setLoading(true);

    const repos = reposText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos, tom, authorName }),
      });
      if (!res.ok) throw new Error("Erro ao analisar repositórios");
      const data = await res.json();
      setResults(data.results ?? []);
      setApiErrors(data.errors ?? []);
      if (data.results?.length > 0) setOpenRepo(data.results[0].ownerRepo);
    } catch {
      setError("Não foi possível analisar os repositórios. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPost(key: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedPost(key);
    setTimeout(() => setCopiedPost(null), 2000);
  }

  const totalPosts = results.reduce((acc, r) => acc + r.posts.length, 0);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-sm text-gray-400">Repositórios (um por linha — formato owner/repo)</label>
          <Textarea
            value={reposText}
            onChange={(e) => setReposText(e.target.value)}
            className="bg-[#111] border-gray-700 text-white placeholder:text-gray-600 resize-none h-36 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Seu nome</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="bg-[#111] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Tom</label>
            <select value={tom} onChange={(e) => setTom(e.target.value)}
              className="bg-[#111] border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
              <option value="profissional">Profissional</option>
              <option value="direto">Direto e objetivo</option>
              <option value="storytelling">Storytelling pessoal</option>
              <option value="tecnico">Técnico com contexto</option>
            </select>
          </div>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 font-bold h-11 mt-auto">
            {loading ? "Analisando..." : "Gerar posts"}
          </Button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {apiErrors.length > 0 && (
        <div className="mb-4">
          {apiErrors.map((e) => (
            <p key={e} className="text-yellow-500 text-xs">{e}</p>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-4">
          <p className="text-gray-500 text-sm">Buscando dados dos repositórios e gerando posts...</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111] border border-gray-800 rounded-xl p-6 animate-pulse h-24" />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="text-gray-500 text-sm mb-6">
            {results.length} repositórios · {totalPosts} posts gerados
          </p>
          <div className="flex flex-col gap-4">
            {results.map((repo) => (
              <div key={repo.ownerRepo} className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                {/* repo header */}
                <button
                  onClick={() => setOpenRepo(openRepo === repo.ownerRepo ? null : repo.ownerRepo)}
                  className="w-full flex items-start justify-between p-5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-white">{repo.name}</h3>
                      <span className="text-xs text-gray-600">{repo.ownerRepo}</span>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        {repo.commitCount} commits
                      </span>
                      {repo.stars > 0 && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                          ★ {repo.stars}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-500 mt-1">{repo.description}</p>
                    )}
                    <div className="flex gap-2 flex-wrap mt-2">
                      {repo.languages.map((l) => (
                        <span key={l} className="text-xs text-blue-400">{l}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-gray-600 ml-4 text-lg">
                    {openRepo === repo.ownerRepo ? "−" : "+"}
                  </span>
                </button>

                {/* posts list */}
                {openRepo === repo.ownerRepo && (
                  <div className="border-t border-gray-800 p-5 flex flex-col gap-4">
                    {repo.posts.length === 0 && (
                      <p className="text-gray-600 text-sm">Nenhum post gerado para este repositório.</p>
                    )}
                    {repo.posts.map((post, i) => {
                      const key = `${repo.ownerRepo}-${i}`;
                      return (
                        <div key={key} className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-mono">Post {i + 1}</span>
                            <button
                              onClick={() => copyPost(key, post)}
                              className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              {copiedPost === key ? "Copiado!" : "Copiar"}
                            </button>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{post}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

// ─── shared components ────────────────────────────────────────────────────────

function Field({
  label, name, value, onChange, placeholder,
}: {
  label: string; name: string; value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-400">{label}</label>
      <input
        type="text" name={name} value={value} onChange={onChange} placeholder={placeholder}
        className="bg-[#111] border border-gray-700 text-white placeholder:text-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
