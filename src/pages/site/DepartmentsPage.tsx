import { Link } from 'react-router-dom';
import { Scissors, HeartPulse, Brain, Stethoscope, Microscope, Baby, Pill, Syringe, Eye, Bone, Smile, Ear, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';
import { departments, doctors } from '@/data/dummyData';

const iconMap = [Scissors, HeartPulse, Brain, Stethoscope, Microscope, Baby, Pill, Syringe, Eye, Bone, Smile, Ear];
const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue', 'bg-gradient-amber', 'bg-gradient-purple', 'bg-gradient-indigo'];
const accents = ['text-tertiary', 'text-accent', 'text-secondary', 'text-warning', 'text-primary', 'text-indigo-brand'];

const DepartmentsPage = () => (
  <SiteLayout>
    <PageHero
      eyebrow="Departments"
      title={<>Specialist <span className="text-tertiary">care</span> across every clinical discipline</>}
      description="Browse our 32+ clinical departments. Each is led by experienced consultants and supported by skilled residents, nurses and allied health professionals."
      crumbs={[{ label: 'Departments' }]}
    />

    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((d, i) => {
            const Icon = iconMap[i % iconMap.length];
            const tone = tones[i % tones.length];
            const accent = accents[i % accents.length];
            const deptDoctors = doctors.filter(doc => doc.department === d);
            return (
              <div key={d} className="group bg-card rounded-2xl border p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl ${tone} p-3.5 ring-1 ring-border/40 shrink-0`}>
                    <Icon className={`h-6 w-6 ${accent}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-lg text-foreground">{d}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{deptDoctors.length || 'Multiple'} consultant{deptDoctors.length === 1 ? '' : 's'} on staff</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  Comprehensive {d.toLowerCase()} services including diagnosis, treatment, follow-up care and patient education.
                </p>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <Link to="/doctors" className={`text-xs font-semibold ${accent}`}>View doctors →</Link>
                  <Link to="/appointment"><Button size="sm" variant="outline">Book <ArrowRight className="h-3 w-3" /></Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default DepartmentsPage;
