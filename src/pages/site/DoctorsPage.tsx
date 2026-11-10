import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Search, ArrowRight, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';
import { doctors, departments } from '@/data/dummyData';

const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue', 'bg-gradient-amber', 'bg-gradient-purple', 'bg-gradient-indigo'];

const DoctorsPage = () => {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const list = doctors.filter(d =>
    (dept === 'all' || d.department === dept) &&
    (!q || d.name.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Specialists"
        title={<>Meet our <span className="text-tertiary">expert doctors</span></>}
        description="Search consultants and specialists across every department, then book a visit in just a few clicks."
        crumbs={[{ label: 'Doctors' }]}
      />

      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Filters */}
          <div className="bg-card rounded-2xl border shadow-card p-5 grid md:grid-cols-3 gap-3 -mt-12 relative z-10">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by doctor name..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {list.map((d, i) => (
              <div key={d.name} className="group bg-card rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className={`${tones[i % tones.length]} h-36 flex items-center justify-center relative`}>
                  <div className="h-24 w-24 rounded-full bg-white shadow-md flex items-center justify-center font-display font-bold text-2xl text-primary">
                    {d.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-0.5 text-[10px] font-semibold text-foreground flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-warning text-warning" /> 5.0
                  </div>
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-display font-semibold text-foreground">{d.name}</h3>
                  <p className="text-xs text-primary font-medium mt-1 flex items-center justify-center gap-1"><Stethoscope className="h-3 w-3" /> {d.department}</p>
                  <p className="text-xs text-muted-foreground mt-2">15+ years experience · MBBS, FWACS</p>
                  <Link to="/appointment"><Button size="sm" className="mt-4 w-full bg-hero-gradient text-white">Book Visit <ArrowRight className="h-3 w-3" /></Button></Link>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">No doctors match your search.</div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default DoctorsPage;
