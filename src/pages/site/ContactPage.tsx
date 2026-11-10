import { MapPin, Phone, Mail, Ambulance, Clock, MessageCircle, Send, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';

const ContactPage = () => (
  <SiteLayout>
    <PageHero
      eyebrow="Get in Touch"
      title={<>We'd love to <span className="text-tertiary">hear from you</span></>}
      description="Reach out for appointments, feedback, partnerships or media enquiries — our team responds within 1 business day."
      crumbs={[{ label: 'Contact' }]}
    />

    {/* Contact cards */}
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: MapPin, label: 'Visit Us', value: 'Block 3, Wing C, Ogun Tech Hub, Abeokuta', tone: 'bg-gradient-green', accent: 'text-tertiary' },
            { icon: Phone, label: 'Call Us', value: '+234 706 151 3509', tone: 'bg-gradient-blue', accent: 'text-secondary' },
            { icon: Mail, label: 'Email Us', value: 'info@gfa-health.demo', tone: 'bg-gradient-purple', accent: 'text-primary' },
            { icon: Ambulance, label: 'Emergency', value: '199 — Open 24/7', tone: 'bg-gradient-rose', accent: 'text-accent' },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl p-6 ${c.tone} border border-border/40`}>
              <div className="rounded-xl bg-white/80 p-3 w-fit"><c.icon className={`h-6 w-6 ${c.accent}`} /></div>
              <h3 className="mt-4 font-display font-semibold text-foreground">{c.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Form + Map */}
        <div className="mt-12 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-card rounded-2xl border shadow-card p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-10 w-10 rounded-xl bg-hero-gradient flex items-center justify-center"><MessageCircle className="h-5 w-5 text-white" /></div>
              <div>
                <h2 className="font-display font-bold text-xl text-foreground">Send us a message</h2>
                <p className="text-xs text-muted-foreground">We typically reply within 24 hours.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Full Name</Label><Input placeholder="Your name" /></div>
              <div><Label>Phone Number</Label><Input placeholder="08012345678" /></div>
              <div className="sm:col-span-2"><Label>Email</Label><Input placeholder="you@example.com" /></div>
              <div className="sm:col-span-2"><Label>Subject</Label><Input placeholder="How can we help?" /></div>
              <div className="sm:col-span-2"><Label>Message</Label><Textarea rows={5} placeholder="Tell us more..." /></div>
            </div>
            <Button className="mt-5 bg-hero-gradient text-white" size="lg">Send Message <Send className="h-4 w-4" /></Button>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl overflow-hidden border shadow-card h-64 bg-gradient-blue flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--primary)) 1px, transparent 1px), radial-gradient(circle at 70% 60%, hsl(var(--secondary)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
              <div className="relative text-center">
                <MapPin className="h-12 w-12 text-primary mx-auto" />
                <div className="mt-2 font-display font-semibold text-foreground">Lagos, Nigeria</div>
                <div className="text-xs text-muted-foreground">Map preview</div>
              </div>
            </div>
            <div className="bg-card rounded-2xl border shadow-card p-5">
              <h4 className="font-display font-semibold text-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Office Hours</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between"><span className="text-muted-foreground">Mon – Fri</span><span className="font-medium text-foreground">8:00 AM – 5:00 PM</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Saturday</span><span className="font-medium text-foreground">9:00 AM – 1:00 PM</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Sunday</span><span className="font-medium text-foreground">Closed</span></li>
                <li className="flex justify-between border-t pt-2 mt-1"><span className="text-accent font-semibold">Emergency</span><span className="font-bold text-accent">24 / 7</span></li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl border shadow-card p-5">
              <h4 className="font-display font-semibold text-foreground">Follow us</h4>
              <div className="mt-3 flex gap-2">
                {[Facebook, Twitter, Instagram, Linkedin].map((I, i) => (
                  <a key={i} href="#" className="h-10 w-10 rounded-xl bg-muted hover:bg-hero-gradient hover:text-white text-muted-foreground flex items-center justify-center transition"><I className="h-4 w-4" /></a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-16 bg-muted/40">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">FAQ</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {[
            { q: 'How do I book an appointment?', a: 'Click "Book Appointment" at the top of any page, log in to the patient portal, or visit the hospital reception desk during working hours.' },
            { q: 'What are the visiting hours?', a: 'Visiting hours are 4–6 PM weekdays and 10 AM–12 PM weekends. ICU visits require permission from the duty doctor.' },
            { q: 'Do you accept NHIS / health insurance?', a: 'Yes. NHIS-enrolled patients receive subsidised pricing across consultation, lab and pharmacy. We accept several private health plans too.' },
            { q: 'How can I access my medical records?', a: 'Log in to the patient portal to view consultations, lab results, prescriptions and bills. Hard copies can be requested with valid ID.' },
            { q: 'What payment methods are accepted?', a: 'Cash, card, transfer, USSD, POS and Remita. Instalment payment is available where applicable.' },
            { q: 'Can I book an online consultation?', a: 'Yes — choose "Online" as your consultation mode when booking.' },
            { q: 'What happens in an emergency?', a: 'Our A&E department is open 24/7. Walk in directly or call 199 — no booking required.' },
          ].map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border rounded-xl px-4">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  </SiteLayout>
);

export default ContactPage;
