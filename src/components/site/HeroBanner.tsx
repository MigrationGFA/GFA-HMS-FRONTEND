import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck, ArrowRight, CheckCircle2, Phone, Star, Stethoscope,
  HeartPulse, Activity, Plus, Sparkles, ShieldCheck, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { departments } from '@/data/dummyData';

const HeroBanner = () => {
  return (
    <section className="relative overflow-hidden bg-hero-gradient text-white">
      {/* Decorative layers */}
      <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
      {/* Floating orbs */}
      <motion.div
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-tertiary/40 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-brand/30 blur-3xl"
      />

      {/* Floating icon chips */}
      <FloatingChip className="top-24 left-8 hidden md:flex" delay={0.2}><HeartPulse className="h-4 w-4 text-accent" /> 24/7 Emergency</FloatingChip>
      <FloatingChip className="top-40 right-10 hidden md:flex" delay={0.5}><ShieldCheck className="h-4 w-4 text-tertiary" /> NHIS Approved</FloatingChip>
      <FloatingChip className="bottom-24 left-12 hidden lg:flex" delay={0.8}><Award className="h-4 w-4 text-indigo-brand" /> MDCN Accredited</FloatingChip>

      <div className="container mx-auto px-4 py-20 md:py-28 relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Copy */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur ring-1 ring-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="h-3 w-3 text-indigo-brand" />
              GFA Health HMS · Enterprise Hospital Demo
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.7rem] font-display font-bold leading-[1.04]">
              Where <span className="relative inline-block">
                <span className="relative z-10 text-tertiary">expert care</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 8 Q 50 0 100 6 T 200 4" stroke="currentColor" strokeWidth="3" fill="none" className="text-indigo-brand" />
                </svg>
              </span> meets <br className="hidden md:block" />
              <span className="text-white">human compassion.</span>
            </h1>
            <p className="mt-6 text-lg text-white/85 max-w-xl leading-relaxed">
              Book appointments, attend e-consultations, view your records and pay bills — all from one secure portal at GFA Demo Hospital, Lagos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/appointment">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-2xl shadow-primary/30">
                  <CalendarCheck className="h-5 w-5" /> Book Appointment
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 backdrop-blur hover:bg-white/20">
                  Explore Services <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-10 flex items-center gap-6 flex-wrap">
              <div className="flex items-center -space-x-2">
                {['FA', 'CO', 'HB', 'IJ'].map((i, k) => (
                  <div key={k} className={`h-9 w-9 rounded-full ring-2 ring-white flex items-center justify-center text-[11px] font-bold ${
                    ['bg-accent text-white', 'bg-tertiary text-primary', 'bg-indigo-brand text-primary', 'bg-white text-primary'][k]
                  }`}>{i}</div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-indigo-brand">
                  {[...Array(5)].map((_, k) => <Star key={k} className="h-3.5 w-3.5 fill-current" />)}
                  <span className="text-white font-semibold ml-1">4.9</span>
                </div>
                <div className="text-white/75 text-xs">Trusted by 120,000+ patients yearly</div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-white/85 pl-4 border-l border-white/20">
                <Phone className="h-4 w-4 text-tertiary" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-wider text-white/60">24/7 Helpline</div>
                  <div className="font-semibold">+234 803 456 7890</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Visual / Quick booking */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="lg:col-span-5 relative">
            {/* Halo cards behind */}
            <motion.div
              animate={{ rotate: [-3, -1, -3] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-8 -right-4 lg:-right-10 hidden md:flex items-center gap-3 bg-white rounded-2xl shadow-2xl px-4 py-3 z-20"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-green flex items-center justify-center"><HeartPulse className="h-5 w-5 text-tertiary" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Heart Rate</div>
                <div className="font-display font-bold text-foreground text-sm">72 BPM · Normal</div>
              </div>
            </motion.div>
            <motion.div
              animate={{ rotate: [2, 0, 2] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-6 -left-4 lg:-left-10 hidden md:flex items-center gap-3 bg-white rounded-2xl shadow-2xl px-4 py-3 z-20"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-amber flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-warning" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Lab Result</div>
                <div className="font-display font-bold text-foreground text-sm">Ready to view</div>
              </div>
            </motion.div>

            {/* Quick booking card */}
            <div className="relative bg-white rounded-3xl shadow-2xl shadow-primary/20 p-6 border border-white/40">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg">Quick Appointment</h3>
                  <p className="text-xs text-muted-foreground">Get a slot in under 60 seconds</p>
                </div>
                <div className="rounded-xl bg-hero-gradient p-2.5 shadow-md"><Plus className="h-5 w-5 text-white" /></div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: Stethoscope, label: 'Consult', tone: 'bg-gradient-green text-tertiary' },
                  { icon: HeartPulse, label: 'Specialist', tone: 'bg-gradient-rose text-accent' },
                  { icon: Activity, label: 'Online', tone: 'bg-gradient-blue text-secondary' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl ${s.tone.split(' ')[0]} p-3 text-center cursor-pointer hover:scale-105 transition`}>
                    <s.icon className={`h-5 w-5 mx-auto ${s.tone.split(' ')[1]}`} />
                    <div className="text-[11px] font-semibold text-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Department <span className="text-accent">*</span></Label>
                  <Select>
                    <SelectTrigger className="text-foreground placeholder:text-muted-foreground/90 data-[placeholder]:text-muted-foreground/90 font-medium">
                      <SelectValue placeholder="Select a department (e.g. Cardiology)" />
                    </SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">Choose the clinic that matches your symptoms.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Preferred Date <span className="text-accent">*</span></Label>
                    <Input
                      type="date"
                      defaultValue="2026-05-15"
                      placeholder="dd / mm / yyyy"
                      className="text-foreground font-medium"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Pick any weekday</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Visit Mode <span className="text-accent">*</span></Label>
                    <Select>
                      <SelectTrigger className="text-foreground placeholder:text-muted-foreground/90 data-[placeholder]:text-muted-foreground/90 font-medium">
                        <SelectValue placeholder="In-person or Online" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Physical">In-person visit</SelectItem>
                        <SelectItem value="Online">Online consultation</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Choose how to meet your doctor</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Patient Full Name</Label>
                  <Input
                    placeholder="e.g. Adebayo Olumide"
                    className="text-foreground placeholder:text-muted-foreground/80 font-medium"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 0803 456 7890"
                    className="text-foreground placeholder:text-muted-foreground/80 font-medium"
                  />
                </div>
                <Link to="/appointment">
                  <Button className="w-full bg-hero-gradient text-white shadow mt-1">Continue Booking <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Wave divider */}
      <svg className="block w-full text-background" viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ height: '60px' }}>
        <path fill="currentColor" d="M0,32 C240,80 480,0 720,32 C960,64 1200,16 1440,48 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
};

const FloatingChip = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: [0, -8, 0] }}
    transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay }, opacity: { duration: 0.6, delay } }}
    className={`absolute z-10 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur text-foreground text-xs font-semibold px-3 py-2 rounded-full shadow-xl ring-1 ring-white/40 ${className}`}
  >
    {children}
  </motion.div>
);

export default HeroBanner;
