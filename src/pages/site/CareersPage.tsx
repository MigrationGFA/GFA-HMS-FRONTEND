import { useState } from 'react';
import { Briefcase, MapPin, Calendar, Search, Filter, ArrowRight, GraduationCap, HeartPulse, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';
import { careerListings, CareerListing } from '@/data/hospitalData';

const benefits = [
  { icon: HeartPulse, title: 'Comprehensive Health Cover', desc: 'Full medical, dental and vision benefits for staff and family.', tone: 'bg-gradient-rose', accent: 'text-accent' },
  { icon: GraduationCap, title: 'Continuous Learning', desc: 'Access to fellowships, conferences and tuition support.', tone: 'bg-gradient-green', accent: 'text-tertiary' },
  { icon: TrendingUp, title: 'Career Growth', desc: 'Defined advancement paths from junior to consultant level.', tone: 'bg-gradient-blue', accent: 'text-secondary' },
  { icon: Users, title: 'Inclusive Culture', desc: 'A diverse team united by purpose and respect.', tone: 'bg-gradient-amber', accent: 'text-warning' },
];

const CareersPage = () => {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [apply, setApply] = useState<CareerListing | null>(null);
  const list = careerListings.filter(j =>
    (type === 'all' || j.type === type) &&
    (!q || j.title.toLowerCase().includes(q.toLowerCase()) || j.department.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Careers at GFA HMS"
        title={<>Build a career that <span className="text-tertiary">heals lives</span></>}
        description="Join one of Nigeria's most respected teaching hospitals. We're hiring across clinical, allied health, administration and technology roles."
        crumbs={[{ label: 'Careers' }]}
      />

      {/* Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Why join GFA HMS</div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">A workplace built around purpose, growth and people</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map(b => (
              <div key={b.title} className="bg-card rounded-2xl border p-6 shadow-card hover:shadow-card-hover transition-all">
                <div className={`rounded-2xl ${b.tone} p-3.5 w-fit ring-1 ring-border/40`}>
                  <b.icon className={`h-6 w-6 ${b.accent}`} />
                </div>
                <h3 className="mt-4 font-display font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters + listings */}
      <section className="py-10 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl border shadow-card p-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search jobs by title or department..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {list.map(j => (
              <div key={j.id} className="bg-card rounded-2xl border p-5 shadow-card hover:shadow-card-hover transition-all flex items-start gap-4">
                <div className="rounded-xl bg-gradient-green p-3"><Briefcase className="h-5 w-5 text-tertiary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-foreground">{j.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">{j.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{j.department}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Apply by {j.deadline}</span>
                  </div>
                  <Button size="sm" className="mt-4 bg-hero-gradient text-white" onClick={() => setApply(j)}>Apply Now <ArrowRight className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">No openings match your search.</div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={!!apply} onOpenChange={() => setApply(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Apply: {apply?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input defaultValue="Adebola Adeyemi" /></div>
            <div><Label>Email</Label><Input defaultValue="adebola@example.com" /></div>
            <div><Label>Phone</Label><Input defaultValue="08012345678" /></div>
            <div><Label>CV (PDF)</Label><Input type="file" /></div>
            <div><Label>Cover Letter</Label><Textarea defaultValue="I am excited to apply for this role at GFA HMS..." /></div>
            <Button className="w-full bg-hero-gradient text-white" onClick={() => setApply(null)}>Submit Application</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
};

export default CareersPage;
