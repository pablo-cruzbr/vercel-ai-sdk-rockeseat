"use client";

import { useState } from "react";
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

interface GithubAnalysis {
  resumo: string;
  linguagens: string[];
  pontosFortesParaLinkedIn: string[];
  projetosDestaque: { nome: string; angulo: string }[];
  temasSugeridosParaPosts: string[];
}

interface GithubSummary {
  login: string;
  name: string;
  followers: number;
  public_repos: number;
  totalOwnRepos: number;
  topLanguages: string[];
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
              Analisar GitHub
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
      setPosts(
        data.posts.map((content: string, i: number) => ({ id: i, content }))
      );
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
  const [username, setUsername] = useState("pablo-cruzb");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<GithubSummary | null>(null);
  const [analysis, setAnalysis] = useState<GithubAnalysis | null>(null);
  const [copiedTema, setCopiedTema] = useState<number | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSummary(null);
    setAnalysis(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(username)}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro");
      }
      const data = await res.json();
      setSummary(data.summary);
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar GitHub");
    } finally {
      setLoading(false);
    }
  }

  async function copyTema(tema: string, i: number) {
    await navigator.clipboard.writeText(tema);
    setCopiedTema(i);
    setTimeout(() => setCopiedTema(null), 2000);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <form onSubmit={handleAnalyze} className="flex gap-3 mb-10 max-w-md">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username do GitHub"
          className="flex-1 bg-[#111] border border-gray-700 text-white placeholder:text-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 font-bold">
          {loading ? "Analisando..." : "Analisar"}
        </Button>
      </form>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#111] border border-gray-800 rounded-xl p-6 animate-pulse h-40" />
          ))}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Repositórios" value={String(summary.totalOwnRepos)} />
          <Stat label="Repositórios públicos" value={String(summary.public_repos)} />
          <Stat label="Seguidores" value={String(summary.followers)} />
          <Stat label="Linguagens" value={String(summary.topLanguages.length)} />
        </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* resumo */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6 md:col-span-2">
            <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-widest">Resumo do perfil</h3>
            <p className="text-gray-200 leading-relaxed">{analysis.resumo}</p>
          </div>

          {/* linguagens */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-widest">Stack detectada</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.linguagens.map((lang) => (
                <span key={lang} className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full">{lang}</span>
              ))}
            </div>
          </div>

          {/* pontos fortes */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-widest">Pontos fortes para LinkedIn</h3>
            <ul className="flex flex-col gap-2">
              {analysis.pontosFortesParaLinkedIn.map((ponto) => (
                <li key={ponto} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-blue-500 mt-0.5">→</span>
                  <span>{ponto}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* projetos destaque */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-widest">Projetos em destaque</h3>
            <div className="flex flex-col gap-3">
              {analysis.projetosDestaque.map((p) => (
                <div key={p.nome}>
                  <p className="text-sm font-semibold text-white">{p.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.angulo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* temas para posts */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-widest">Temas sugeridos para posts</h3>
            <div className="flex flex-col gap-2">
              {analysis.temasSugeridosParaPosts.map((tema, i) => (
                <div key={tema} className="flex items-start justify-between gap-3 group">
                  <p className="text-sm text-gray-300 flex-1">{tema}</p>
                  <button
                    onClick={() => copyTema(tema, i)}
                    className="text-xs text-gray-600 group-hover:text-blue-400 transition-colors whitespace-nowrap"
                  >
                    {copiedTema === i ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
