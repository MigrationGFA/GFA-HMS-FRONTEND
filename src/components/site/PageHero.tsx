import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  crumbs?: { label: string; to?: string }[];
}

const PageHero = ({ eyebrow, title, description, crumbs = [] }: PageHeroProps) => (
  <section className="relative overflow-hidden bg-hero-gradient text-white">
    <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
    <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
    <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-tertiary/40 blur-3xl" />
    <div className="container mx-auto px-4 py-20 md:py-24 relative">
      <div className="max-w-3xl">
        {!!crumbs.length && (
          <nav className="text-xs text-white/75 mb-4 flex items-center gap-1.5 flex-wrap">
            <Link to="/" className="hover:text-white">Home</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                {c.to ? <Link to={c.to} className="hover:text-white">{c.label}</Link> : <span className="text-white font-medium">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-tertiary mb-3">{eyebrow}</div>
        <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight">{title}</h1>
        {description && <p className="mt-4 text-white/85 text-lg max-w-2xl leading-relaxed">{description}</p>}
      </div>
    </div>
    <svg className="block w-full text-background" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: '50px' }}>
      <path fill="currentColor" d="M0,28 C240,60 480,0 720,24 C960,52 1200,12 1440,40 L1440,60 L0,60 Z" />
    </svg>
  </section>
);

export default PageHero;
