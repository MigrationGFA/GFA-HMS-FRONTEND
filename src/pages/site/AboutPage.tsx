import { Award, Users, Shield, HeartPulse, Target, Eye, Sparkles, Clock, Calendar, GraduationCap, Microscope, Building2 } from 'lucide-react';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';
import { managementTeam, workingHours } from '@/data/hospitalData';

const AboutPage = () => (
  <SiteLayout>
    <PageHero
      eyebrow="About GFA HMS"
      title={<>A legacy of <span className="text-tertiary">healing, teaching</span> and <span className="text-indigo-brand">research</span></>}
      description="GFA Demo Hospital is a tertiary referral and teaching institution serving Ogun State and the broader South-West region of Nigeria."
      crumbs={[{ label: 'About' }]}
    />

    {/* Story */}
    <section className="py-20">
      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Our Story</div>
          <h2 className="text-3xl font-display font-bold text-foreground leading-tight">Five decades of compassionate care</h2>
          <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
            <p>Founded as a flagship teaching hospital of the Federal Ministry of Health, GFA HMS has evolved into one of Nigeria's most respected tertiary healthcare institutions — combining clinical excellence, academic rigour and community outreach.</p>
            <p>From our base in Lagos, Nigeria, our consultants, residents, nurses, allied professionals and students serve over 120,000 patients each year across more than 30 specialist departments.</p>
            <p>Today, we are pioneering Nigeria's transition to digital, patient-centred healthcare — with a fully integrated EMR, online appointments, e-consultations and a secure patient portal.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: '1972', label: 'Founded', icon: Calendar, tone: 'bg-gradient-green', accent: 'text-tertiary' },
            { value: '32+', label: 'Departments', icon: Building2, tone: 'bg-gradient-blue', accent: 'text-secondary' },
            { value: '450+', label: 'Doctors', icon: Users, tone: 'bg-gradient-rose', accent: 'text-accent' },
            { value: '1,200+', label: 'Students Trained Yearly', icon: GraduationCap, tone: 'bg-gradient-amber', accent: 'text-warning' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-6 ${s.tone} border border-border/40`}>
              <s.icon className={`h-8 w-8 ${s.accent}`} />
              <div className="mt-3 font-display font-bold text-3xl text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Mission / Vision / Values */}
    <section className="py-16 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Target, title: 'Mission', tone: 'bg-gradient-green', accent: 'text-tertiary',
              desc: 'To provide outstanding patient care, train tomorrow\'s health professionals, and advance medical knowledge through research that benefits Nigeria and the world.' },
            { icon: Eye, title: 'Vision', tone: 'bg-gradient-blue', accent: 'text-secondary',
              desc: 'To be Africa\'s leading teaching hospital — recognised for clinical excellence, innovation, and digital-first healthcare delivery.' },
            { icon: Sparkles, title: 'Values', tone: 'bg-gradient-rose', accent: 'text-accent',
              desc: 'Compassion · Integrity · Excellence · Innovation · Equity · Collaboration. Every decision is guided by these core principles.' },
          ].map(c => (
            <div key={c.title} className="rounded-2xl bg-card border p-7 shadow-card hover:shadow-card-hover transition-all">
              <div className={`rounded-2xl ${c.tone} p-3.5 w-fit ring-1 ring-border/40`}>
                <c.icon className={`h-6 w-6 ${c.accent}`} />
              </div>
              <h3 className="mt-4 font-display font-bold text-xl text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Why us */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Why GFA HMS</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">A teaching hospital that truly delivers</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Award, title: 'Tertiary Accreditation', desc: 'Federally recognised, MDCN-accredited training hospital.' },
            { icon: Shield, title: 'Safety First', desc: 'WHO and ISO-aligned infection control & patient safety protocols.' },
            { icon: HeartPulse, title: 'Specialist-led Care', desc: 'Consultants on site across all major specialties.' },
            { icon: Microscope, title: 'Research Engine', desc: 'Active research output across tropical & internal medicine.' },
          ].map(f => (
            <div key={f.title} className="bg-card rounded-2xl border p-6 shadow-card text-center hover:-translate-y-1 hover:shadow-card-hover transition-all">
              <div className="h-12 w-12 mx-auto rounded-xl bg-hero-gradient flex items-center justify-center text-white shadow-md">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Leadership */}
    <section className="py-20 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Leadership</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Management & faculty leaders</h2>
          <p className="mt-3 text-muted-foreground">Experienced clinicians and administrators driving GFA HMS forward.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {managementTeam.map((m, i) => {
            const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue', 'bg-gradient-amber'];
            const accents = ['text-tertiary', 'text-accent', 'text-secondary', 'text-warning'];
            return (
              <div key={m.id} className="bg-card rounded-2xl border p-5 shadow-card text-center hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className={`h-20 w-20 rounded-full ${tones[i % tones.length]} ${accents[i % accents.length]} flex items-center justify-center font-display font-bold text-xl mx-auto ring-4 ring-white shadow-md`}>
                  {m.initials}
                </div>
                <h3 className="mt-4 font-display font-semibold text-foreground">{m.name}</h3>
                <p className="text-xs text-primary font-medium mt-1">{m.role}</p>
                <p className="text-xs text-muted-foreground">{m.department}</p>
                <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{m.bio}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    {/* Hours */}
    <section id="hours" className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-warning mb-3">Working Hours</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">When we're open</h2>
          <p className="mt-3 text-muted-foreground">Emergency department available 24/7, 365 days a year.</p>
        </div>
        <div className="bg-card rounded-2xl border overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-hero-gradient text-white">
              <tr>
                <th className="text-left p-4 font-semibold"><Clock className="inline h-4 w-4 mr-1" /> Department</th>
                <th className="text-left p-4 font-semibold">Weekdays</th>
                <th className="text-left p-4 font-semibold">Weekends</th>
              </tr>
            </thead>
            <tbody>
              {workingHours.map((w, i) => (
                <tr key={w.department} className={`border-t ${i % 2 ? 'bg-muted/20' : ''}`}>
                  <td className="p-4 font-medium text-foreground">{w.department}</td>
                  <td className="p-4 text-muted-foreground">{w.weekday}</td>
                  <td className="p-4 text-muted-foreground">{w.weekend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default AboutPage;
