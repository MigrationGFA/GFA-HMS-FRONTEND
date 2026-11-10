import { Link } from 'react-router-dom';
import {
  Stethoscope, Scissors, Microscope, Baby, HeartPulse, Brain, Pill, Syringe,
  Eye, Activity, Bone, Smile, Ear, Droplets, Ambulance, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';

const categories = [
  {
    title: 'Outpatient & Primary Care', tone: 'bg-gradient-green', accent: 'text-tertiary',
    items: [
      { icon: Stethoscope, name: 'General Consultation', desc: 'Family medicine and general practitioners.' },
      { icon: HeartPulse, name: 'Specialist Clinics', desc: 'Booked appointments with consultant specialists.' },
      { icon: Activity, name: 'E-Health Consultation', desc: 'Video consultations from anywhere.' },
      { icon: Syringe, name: 'Vaccination & Wellness', desc: 'Routine and travel immunizations.' },
    ],
  },
  {
    title: 'Surgical Services', tone: 'bg-gradient-rose', accent: 'text-accent',
    items: [
      { icon: Scissors, name: 'General Surgery', desc: 'Open and minimally invasive procedures.' },
      { icon: HeartPulse, name: 'Cardiothoracic Surgery', desc: 'Heart and chest surgical care.' },
      { icon: Bone, name: 'Orthopaedics', desc: 'Trauma, joint replacement, sports injuries.' },
      { icon: Brain, name: 'Neurosurgery', desc: 'Brain, spine and nervous system surgery.' },
    ],
  },
  {
    title: 'Diagnostic & Imaging', tone: 'bg-gradient-blue', accent: 'text-secondary',
    items: [
      { icon: Microscope, name: 'Laboratory Services', desc: 'Pathology, microbiology, molecular diagnostics.' },
      { icon: Eye, name: 'Radiology & Imaging', desc: 'CT, MRI, X-ray, ultrasound.' },
      { icon: Droplets, name: 'Blood Bank', desc: 'Screened blood products, 24/7 availability.' },
      { icon: Activity, name: 'Cardiac Diagnostics', desc: 'ECG, echo, stress tests.' },
    ],
  },
  {
    title: 'Women & Children', tone: 'bg-gradient-amber', accent: 'text-warning',
    items: [
      { icon: Baby, name: 'Obstetrics & Gynaecology', desc: 'Antenatal, delivery, postnatal care.' },
      { icon: HeartPulse, name: 'NICU & Paediatrics', desc: 'Neonatal intensive and child care.' },
      { icon: Smile, name: 'Adolescent Health', desc: 'Wellness and reproductive education.' },
      { icon: Stethoscope, name: 'Family Planning', desc: 'Counselling and contraceptive services.' },
    ],
  },
  {
    title: 'Specialty Care', tone: 'bg-gradient-purple', accent: 'text-primary',
    items: [
      { icon: Brain, name: 'Neurology', desc: 'EEG, stroke, epilepsy management.' },
      { icon: Eye, name: 'Ophthalmology', desc: 'Eye exams, cataract surgery, glaucoma.' },
      { icon: Ear, name: 'ENT', desc: 'Ear, nose and throat specialty.' },
      { icon: Smile, name: 'Dental Clinic', desc: 'Routine and complex dental care.' },
    ],
  },
  {
    title: 'Emergency & Pharmacy', tone: 'bg-gradient-indigo', accent: 'text-indigo-brand',
    items: [
      { icon: Ambulance, name: 'Accident & Emergency', desc: '24/7 emergency department.' },
      { icon: Pill, name: 'Pharmacy', desc: 'Inpatient & outpatient pharmacy services.' },
      { icon: Activity, name: 'Critical Care / ICU', desc: 'Intensive care for critical patients.' },
      { icon: Stethoscope, name: 'Physiotherapy', desc: 'Rehabilitation and recovery support.' },
    ],
  },
];

const ServicesListPage = () => (
  <SiteLayout>
    <PageHero
      eyebrow="Services"
      title={<>Comprehensive <span className="text-tertiary">healthcare services</span> for every life stage</>}
      description="From routine check-ups to advanced surgical care — discover the full range of clinical and diagnostic services available at GFA HMS."
      crumbs={[{ label: 'Services' }]}
    />

    {/* Service categories */}
    <section className="py-16">
      <div className="container mx-auto px-4 space-y-14">
        {categories.map(cat => (
          <div key={cat.title}>
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">{cat.title}</h2>
              <Link to="/appointment" className={`inline-flex items-center gap-1 text-sm font-semibold ${cat.accent} hover:gap-2 transition-all`}>
                Book in this category <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {cat.items.map(item => (
                <div key={item.name} className="group bg-card rounded-2xl p-6 border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all">
                  <div className={`rounded-2xl ${cat.tone} p-3.5 w-fit ring-1 ring-border/40`}>
                    <item.icon className={`h-6 w-6 ${cat.accent}`} />
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-tertiary" /> NHIS / Private accepted</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="bg-hero-gradient rounded-3xl p-10 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold">Need help choosing the right service?</h2>
            <p className="mt-2 text-white/85">Our patient liaison team can guide you to the right specialist.</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link to="/appointment"><Button size="lg" className="bg-white text-primary hover:bg-white/90">Book Appointment</Button></Link>
              <Link to="/contact"><Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20">Contact Us</Button></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default ServicesListPage;
