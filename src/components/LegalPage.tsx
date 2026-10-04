import Layout from "@/components/Layout";
import Seo from "@/components/Seo";

export type LegalSection = { heading: string; body: (string | string[])[] };

const LegalPage = ({ title, description, path, updated, intro, sections }: {
  title: string; description: string; path: string; updated: string; intro: string; sections: LegalSection[];
}) => (
  <Layout>
    <Seo title={`${title} | Daryl Tech & Educational Network`} description={description} path={path} />
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">// Legal</p>
      <h1 className="mb-3 text-3xl font-bold md:text-4xl">{title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: {updated}</p>
      <p className="mb-10 leading-relaxed text-muted-foreground">{intro}</p>
      <nav aria-label="Contents" className="mb-12 rounded-lg border border-border p-4">
        <p className="mb-2 text-sm font-semibold">Contents</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {sections.map((s, i) => <li key={i}><a href={`#s${i + 1}`} className="hover:text-primary">{s.heading}</a></li>)}
        </ol>
      </nav>
      <div className="space-y-10">
        {sections.map((s, i) => (
          <section key={i} id={`s${i + 1}`} className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-semibold">{i + 1}. {s.heading}</h2>
            <div className="space-y-3 leading-relaxed text-muted-foreground">
              {s.body.map((b, j) => Array.isArray(b)
                ? <ul key={j} className="list-disc space-y-1.5 pl-5">{b.map((li, k) => <li key={k}>{li}</li>)}</ul>
                : <p key={j}>{b}</p>)}
            </div>
          </section>
        ))}
      </div>
    </section>
  </Layout>
);

export default LegalPage;
