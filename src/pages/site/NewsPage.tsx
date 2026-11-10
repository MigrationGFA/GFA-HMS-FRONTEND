import { useState } from 'react';
import { Newspaper, Clock, ArrowRight, Search, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';
import { blogArticles } from '@/data/hospitalData';

const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue', 'bg-gradient-amber', 'bg-gradient-purple', 'bg-gradient-indigo'];
const accents = ['text-tertiary', 'text-accent', 'text-secondary', 'text-warning', 'text-primary', 'text-indigo-brand'];
const tags = ['Hospital News', 'Outreach', 'Clinical Update', 'Equipment', 'Education', 'Partnership'];

const NewsPage = () => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<typeof blogArticles[0] | null>(null);
  const list = blogArticles.filter(a => !q || a.title.toLowerCase().includes(q.toLowerCase()));
  const featured = list[0];
  const rest = list.slice(1);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="News & Updates"
        title={<>Stories from the <span className="text-tertiary">heart of GFA HMS</span></>}
        description="Hospital announcements, outreach reports, clinical updates and stories from our patients and faculty."
        crumbs={[{ label: 'News' }]}
      />

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl border shadow-card p-5 -mt-12 relative z-10 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search news..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {tags.slice(0, 4).map((t, i) => (
                <span key={t} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${tones[i]} ${accents[i]}`}>{t}</span>
              ))}
            </div>
          </div>

          {/* Featured */}
          {featured && (
            <div className="mt-10 grid lg:grid-cols-5 gap-6 bg-card rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover transition-all">
              <div className={`lg:col-span-2 ${tones[0]} h-72 lg:h-auto flex items-center justify-center`}>
                <Newspaper className={`h-20 w-20 ${accents[0]} opacity-50`} />
              </div>
              <div className="lg:col-span-3 p-7 flex flex-col justify-center">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Featured Story</div>
                <h2 className="mt-3 text-2xl md:text-3xl font-display font-bold text-foreground">{featured.title}</h2>
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" /> {featured.date} · {featured.author}</div>
                <p className="mt-4 text-muted-foreground">{featured.excerpt}</p>
                <Button className="mt-6 w-fit" onClick={() => setOpen(featured)}>Read Full Story <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((a, i) => (
              <article key={a.id} className="group bg-card rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className={`${tones[(i + 1) % tones.length]} h-44 flex items-center justify-center`}>
                  <Newspaper className={`h-12 w-12 ${accents[(i + 1) % accents.length]} opacity-60`} />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs">
                    <Tag className={`h-3 w-3 ${accents[(i + 1) % accents.length]}`} />
                    <span className={`font-semibold ${accents[(i + 1) % accents.length]}`}>{tags[(i + 1) % tags.length]}</span>
                  </div>
                  <h3 className="mt-3 font-display font-semibold text-foreground line-clamp-2">{a.title}</h3>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" /> {a.date}</div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
                  <button onClick={() => setOpen(a)} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display text-xl">{open?.title}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">{open.date} · {open.author}</p>
              <p className="text-foreground leading-relaxed">{open.excerpt}</p>
              <p className="text-muted-foreground leading-relaxed">
                Full editorial content would appear here in the published version, including images, related stories, quotes from clinicians and reader engagement features.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
};

export default NewsPage;
