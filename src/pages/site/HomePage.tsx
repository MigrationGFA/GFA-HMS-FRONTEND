import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Stethoscope, Scissors, Microscope, Baby, HeartPulse, Brain, Pill, Syringe,
  Users, Building2, Ambulance, Award, Star, ArrowRight, CalendarCheck,
  Video, Smartphone, CreditCard, Shield, BadgeCheck, Quote, Newspaper, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { departments, doctors } from '@/data/dummyData';
import { blogArticles } from '@/data/hospitalData';
import SiteLayout from '@/components/site/SiteLayout';
import HeroBanner from '@/components/site/HeroBanner';

const services = [
  { icon: Stethoscope, title: 'General Consultation', desc: 'Outpatient consultations with experienced family physicians and specialists.', tone: 'bg-gradient-green', accent: 'text-tertiary' },
  { icon: Scissors, title: 'Advanced Surgery', desc: 'Cardiac, orthopaedic, paediatric, and minimally invasive surgical procedures.', tone: 'bg-gradient-rose', accent: 'text-accent' },
  { icon: Microscope, title: 'Diagnostic Lab', desc: 'Full-range pathology, microbiology, and molecular tests with quick reporting.', tone: 'bg-gradient-blue', accent: 'text-secondary' },
  { icon: Baby, title: 'Maternity & Child Care', desc: 'Antenatal, delivery, NICU, paediatric and immunization services.', tone: 'bg-gradient-amber', accent: 'text-warning' },
  { icon: HeartPulse, title: 'Cardiology', desc: 'ECG, echocardiogram, stress testing and chronic heart disease management.', tone: 'bg-gradient-rose', accent: 'text-accent' },
  { icon: Brain, title: 'Neurology', desc: 'Neurological assessments, EEG, stroke care and rehabilitation services.', tone: 'bg-gradient-purple', accent: 'text-primary' },
  { icon: Pill, title: 'Pharmacy', desc: 'In-house pharmacy stocked with essential and specialist medications.', tone: 'bg-gradient-green', accent: 'text-tertiary' },
  { icon: Syringe, title: 'Vaccination', desc: 'Routine immunization, travel vaccines and preventive screenings.', tone: 'bg-gradient-indigo', accent: 'text-indigo-brand' },
];

const features = [
  { icon: CalendarCheck, title: 'Online Appointments', desc: 'Book in seconds, get instant SMS confirmation.' },
  { icon: Video, title: 'E-Health Consultation', desc: 'Speak with a doctor from anywhere in Nigeria.' },
  { icon: Smartphone, title: 'Patient Portal', desc: 'Lab results, prescriptions and bills on your phone.' },
  { icon: CreditCard, title: 'Multi-channel Payments', desc: 'Card, transfer, USSD, POS, and Remita.' },
  { icon: Shield, title: 'Secure Records', desc: 'Encrypted EMR with strict access controls.' },
  { icon: BadgeCheck, title: 'NHIS Accepted', desc: 'Subsidised care for NHIS-enrolled patients.' },
];

const testimonials = [
  { name: 'Mrs. Funmilayo Adesina', role: 'Antenatal patient', quote: 'The midwives and doctors were incredibly supportive throughout my pregnancy. Booking online saved hours of waiting.', initials: 'FA' },
  { name: 'Mr. Chinedu Okeke', role: 'Cardiology patient', quote: 'I received world-class cardiac care right here in Lagos. The follow-up via the patient portal is excellent.', initials: 'CO' },
  { name: 'Dr. Halima Bello', role: 'Visiting consultant', quote: 'GFA HMS is one of the most digitally advanced teaching hospitals I have practised in across Nigeria.', initials: 'HB' },
];

const stats = [
  { value: '120K+', label: 'Patients Yearly', icon: Users, tone: 'bg-gradient-green', accent: 'text-tertiary' },
  { value: '450+', label: 'Specialist Doctors', icon: Stethoscope, tone: 'bg-gradient-rose', accent: 'text-accent' },
  { value: '32', label: 'Departments', icon: Building2, tone: 'bg-gradient-blue', accent: 'text-secondary' },
  { value: '24/7', label: 'Emergency', icon: Ambulance, tone: 'bg-gradient-amber', accent: 'text-warning' },
];

const HomePage = () => (
  <SiteLayout>
    <HeroBanner />

    {/* Stats */}
    <section className="py-12 -mt-1">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`rounded-2xl p-5 ${s.tone} border border-border/40 flex items-center gap-4`}>
              <div className="h-12 w-12 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                <s.icon className={`h-6 w-6 ${s.accent}`} />
              </div>
              <div>
                <div className="font-display font-bold text-2xl text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* About */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">About GFA Health HMS</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              One connected platform for modern hospital operations
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              GFA Demo Hospital showcases GFA Health HMS — an enterprise hospital management system from
              GFA Health Technologies Ltd. Explore patient registration, clinical care, diagnostics, pharmacy,
              billing and administration with realistic sample data ready for any hospital presentation.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { icon: Award, title: 'Tertiary Accreditation', desc: 'Federal & MDCN accredited' },
                { icon: Users, title: 'Expert Faculty', desc: '450+ specialist doctors' },
                { icon: Shield, title: 'Patient Safety', desc: 'ISO-aligned protocols' },
                { icon: HeartPulse, title: 'Compassionate Care', desc: 'Patient-first culture' },
              ].map(x => (
                <div key={x.title} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                  <div className="rounded-lg bg-gradient-green p-2"><x.icon className="h-4 w-4 text-tertiary" /></div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{x.title}</div>
                    <div className="text-xs text-muted-foreground">{x.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/about"><Button className="mt-7">Learn More <ArrowRight className="h-4 w-4" /></Button></Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-gradient-green rounded-2xl p-6 h-44 flex flex-col justify-end shadow-card border">
                <Stethoscope className="h-8 w-8 text-tertiary mb-2" />
                <div className="font-display font-bold text-foreground">Clinical Excellence</div>
                <div className="text-xs text-muted-foreground">Specialist-led care</div>
              </div>
              <div className="bg-gradient-rose rounded-2xl p-6 h-44 flex flex-col justify-end shadow-card border">
                <Award className="h-8 w-8 text-accent mb-2" />
                <div className="font-display font-bold text-foreground">Teaching & Research</div>
                <div className="text-xs text-muted-foreground">Training Nigeria's future doctors</div>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="bg-gradient-blue rounded-2xl p-6 h-44 flex flex-col justify-end shadow-card border">
                <Microscope className="h-8 w-8 text-secondary mb-2" />
                <div className="font-display font-bold text-foreground">Modern Diagnostics</div>
                <div className="text-xs text-muted-foreground">Lab + imaging services</div>
              </div>
              <div className="bg-gradient-amber rounded-2xl p-6 h-44 flex flex-col justify-end shadow-card border">
                <Ambulance className="h-8 w-8 text-warning mb-2" />
                <div className="font-display font-bold text-foreground">24/7 Emergency</div>
                <div className="text-xs text-muted-foreground">Always ready, always open</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Services preview */}
    <section className="py-20 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">What We Offer</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Comprehensive healthcare services</h2>
          <p className="mt-3 text-muted-foreground">From everyday consultations to complex surgical care — all under one roof.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="group bg-card rounded-2xl p-6 border border-border/60 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
              <div className={`rounded-2xl ${s.tone} p-3.5 w-fit ring-1 ring-border/40`}>
                <s.icon className={`h-6 w-6 ${s.accent}`} />
              </div>
              <h3 className="mt-4 font-display font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              <Link to="/appointment" className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${s.accent} hover:gap-2 transition-all`}>
                Book now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/services"><Button variant="outline" size="lg">View All Services <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </div>
    </section>

    {/* Why us */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-3">Why Choose GFA HMS</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Hospital care built for modern Nigeria</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div key={f.title} className="group p-6 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-hero-gradient text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Departments */}
    <section className="py-20 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Departments</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Specialist care across {departments.length}+ departments</h2>
          </div>
          <Link to="/departments"><Button variant="outline">All Departments <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {departments.slice(0, 8).map((d, i) => {
            const icons = [Scissors, HeartPulse, Brain, Stethoscope, Microscope, Baby, Pill, Syringe];
            const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue', 'bg-gradient-amber', 'bg-gradient-purple', 'bg-gradient-indigo'];
            const accents = ['text-tertiary', 'text-accent', 'text-secondary', 'text-warning', 'text-primary', 'text-indigo-brand'];
            const Icon = icons[i % icons.length];
            return (
              <Link key={d} to="/departments" className="group bg-card rounded-2xl p-5 border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all text-center">
                <div className={`rounded-2xl ${tones[i % tones.length]} p-3 w-fit mx-auto ring-1 ring-border/30`}>
                  <Icon className={`h-5 w-5 ${accents[i % accents.length]}`} />
                </div>
                <h3 className="mt-3 font-medium text-sm text-foreground">{d}</h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>

    {/* Doctors preview */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Our Specialists</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Meet our expert doctors</h2>
          </div>
          <Link to="/doctors"><Button variant="outline">View All <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {doctors.slice(0, 4).map((d, i) => {
            const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue', 'bg-gradient-amber'];
            return (
              <div key={d.name} className="group bg-card rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className={`${tones[i % tones.length]} h-32 flex items-center justify-center`}>
                  <div className="h-20 w-20 rounded-full bg-white shadow-md flex items-center justify-center font-display font-bold text-2xl text-primary">
                    {d.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                  </div>
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-display font-semibold text-foreground">{d.name}</h3>
                  <p className="text-xs text-primary font-medium mt-0.5">{d.department}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-2 text-warning">
                    {[...Array(5)].map((_, k) => <Star key={k} className="h-3 w-3 fill-current" />)}
                    <span className="text-xs text-muted-foreground ml-1">5.0</span>
                  </div>
                  <Link to="/appointment"><Button size="sm" variant="outline" className="mt-3 w-full">Book Visit</Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <section className="py-20 bg-hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-tertiary mb-3">Patient Stories</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Trusted by thousands of patients</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-6 shadow-xl relative">
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/15" />
              <div className="flex items-center gap-0.5 text-warning mb-3">
                {[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-foreground leading-relaxed text-sm">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3 pt-4 border-t">
                <div className="h-10 w-10 rounded-full bg-gradient-green flex items-center justify-center font-display font-bold text-tertiary text-sm">{t.initials}</div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* News */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-3">News & Updates</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Latest from GFA HMS</h2>
          </div>
          <Link to="/news"><Button variant="outline">All News <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogArticles.slice(0, 3).map((a, i) => {
            const tones = ['bg-gradient-green', 'bg-gradient-rose', 'bg-gradient-blue'];
            return (
              <Link key={a.id} to="/news" className="group bg-card rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
                <div className={`${tones[i % tones.length]} h-40 flex items-center justify-center`}>
                  <Newspaper className="h-12 w-12 text-foreground/30" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {a.date} · <span className="text-primary font-medium">{a.author}</span>
                  </div>
                  <h3 className="mt-3 font-display font-semibold text-foreground line-clamp-2">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="bg-hero-gradient rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Ready to take control of your health?</h2>
            <p className="mt-3 text-white/85">Book an appointment today or sign in to your patient account to manage care online.</p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link to="/appointment"><Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl"><CalendarCheck className="h-5 w-5" /> Book Appointment</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 backdrop-blur hover:bg-white/20">Patient Portal Login</Button></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default HomePage;
