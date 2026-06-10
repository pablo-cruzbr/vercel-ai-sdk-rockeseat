"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

const defaultForm: FormData = {
  nome: "",
  cargo: "",
  stack: "",
  projetos: "",
  objetivo: "",
  tom: "profissional",
};

export default function GerarPosts() {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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

      if (!res.ok) throw new Error("Erro ao gerar posts");

      const data = await res.json();
      setPosts(data.posts.map((content: string, i: number) => ({ id: i, content })));
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold text-lg">
          Pablo<span className="text-blue-500">Dev</span>
          <span className="ml-3 text-gray-500 text-sm font-normal">
            Gerador de posts LinkedIn
          </span>
        </h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* FORM */}
        <section>
          <h2 className="text-xl font-bold mb-6">Seu perfil</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Nome"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Pablo Cruz"
            />
            <Field
              label="Cargo atual"
              name="cargo"
              value={form.cargo}
              onChange={handleChange}
              placeholder="Desenvolvedor Fullstack Jr"
            />
            <Field
              label="Stack principal"
              name="stack"
              value={form.stack}
              onChange={handleChange}
              placeholder="TypeScript, React, Next.js, Node.js, PostgreSQL"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">
                Projetos e conquistas
              </label>
              <Textarea
                name="projetos"
                value={form.projetos}
                onChange={handleChange}
                placeholder="AltiControl SaaS (76 usuários, 10 meses), Mestre das Comandas, Bugless (hackathon IA), 1983 contribuições GitHub..."
                className="bg-[#111] border-gray-700 text-white placeholder:text-gray-600 resize-none h-28"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Objetivo</label>
              <select
                name="objetivo"
                value={form.objetivo}
                onChange={handleChange}
                className="bg-[#111] border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                required
              >
                <option value="">Selecione...</option>
                <option value="nova vaga">Conseguir uma nova vaga</option>
                <option value="visibilidade">Aumentar visibilidade</option>
                <option value="networking">Expandir network</option>
                <option value="posicionamento">Posicionamento como dev</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Tom dos posts</label>
              <select
                name="tom"
                value={form.tom}
                onChange={handleChange}
                className="bg-[#111] border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
              >
                <option value="profissional">Profissional</option>
                <option value="direto">Direto e objetivo</option>
                <option value="storytelling">Storytelling pessoal</option>
                <option value="tecnico">Técnico com contexto</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 font-bold mt-2 h-11"
            >
              {loading ? "Gerando posts..." : "Gerar posts"}
            </Button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </form>
        </section>

        {/* POSTS */}
        <section>
          <h2 className="text-xl font-bold mb-6">
            {posts.length > 0 ? `${posts.length} posts gerados` : "Posts"}
          </h2>

          {!loading && posts.length === 0 && (
            <div className="border border-dashed border-gray-800 rounded-xl p-10 text-center text-gray-600">
              <p className="text-sm">
                Preencha seu perfil e clique em &quot;Gerar posts&quot;
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-[#111] border border-gray-800 rounded-xl p-5 animate-pulse h-32"
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col gap-3"
              >
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPost(post)}
                  className="self-end border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-xs"
                >
                  {copied === post.id ? "Copiado!" : "Copiar post"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-400">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-[#111] border border-gray-700 text-white placeholder:text-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
