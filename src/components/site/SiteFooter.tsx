import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Ambulance, Facebook, Twitter, Instagram, Linkedin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { navItems } from './SiteHeader';
import logo from '@/assets/GFA-health.png';
const SiteFooter = () => (
  <footer className="bg-sidebar text-sidebar-foreground pt-16 pb-8 mt-10">
    <div className="container mx-auto px-4">
      {/* Newsletter strip */}
      <div className="rounded-2xl bg-hero-gradient p-6 md:p-8 mb-12 grid md:grid-cols-2 gap-6 items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="relative">
          <h3 className="font-display font-bold text-2xl text-white">Stay informed. Stay healthy.</h3>
          <p className="text-white/85 text-sm mt-1">Health tips, hospital news and outreach announcements — straight to your inbox.</p>
        </div>
        <div className="relative flex gap-2">
          <Input placeholder="Enter your email" className="bg-white/95 border-0" />
          <Button className="bg-white text-primary hover:bg-white/90 shadow">Subscribe <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-8 mb-10">
        <div>
          <Link to="/" className="flex items-center gap-2.5 mb-4">
            <img src={logo} alt="GFA HMS" className="h-12 w-12 object-contain bg-white rounded-full p-0.5" />
            <div>
              <div className="font-display font-bold text-white text-sm">GFA Demo Hospital</div>
              <div className="text-[10px] text-sidebar-foreground/70 -mt-0.5">Powered by GFA Health HMS</div>
            </div>
          </Link>
          <p className="text-sm text-sidebar-foreground/70 leading-relaxed">
            A general hospital management demo by GFA Health Technologies Ltd — patient records, clinical care, diagnostics, pharmacy, billing and administration in one platform.
          </p>
          <div className="mt-4 flex gap-2">
            {[Facebook, Twitter, Instagram, Linkedin].map((I, i) => (
              <a key={i} href="#" className="h-9 w-9 rounded-lg bg-sidebar-accent hover:bg-primary flex items-center justify-center transition"><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-display font-semibold text-white mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            {navItems.map(n => (
              <li key={n.to}><Link to={n.to} className="text-sidebar-foreground/70 hover:text-primary transition">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold text-white mb-4">Patient Services</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/appointment" className="text-sidebar-foreground/70 hover:text-primary transition">Book Appointment</Link></li>
            <li><Link to="/login" className="text-sidebar-foreground/70 hover:text-primary transition">Patient Portal</Link></li>
            <li><Link to="/services" className="text-sidebar-foreground/70 hover:text-primary transition">All Services</Link></li>
            <li><Link to="/about#hours" className="text-sidebar-foreground/70 hover:text-primary transition">Working Hours</Link></li>
            <li><Link to="/contact" className="text-sidebar-foreground/70 hover:text-primary transition">Get in Touch</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold text-white mb-4">Reach Us</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Block 3, Wing C, Ogun Tech Hub, Abeokuta</li>
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> +234 706 151 3509</li>
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> info@gfa-health.demo</li>
            <li className="flex items-start gap-2 text-accent font-semibold"><Ambulance className="h-4 w-4 mt-0.5 shrink-0" /> Emergency: 199 (24/7)</li>
          </ul>
        </div>
      </div>
      <div className="pt-6 border-t border-sidebar-border flex flex-wrap items-center justify-between gap-3 text-xs text-sidebar-foreground/60">
        <p>© 2026 GFA Health Technologies Ltd. Demo product: GFA Health HMS.</p>
        <div className="flex items-center gap-4">
          <a className="hover:text-white" href="https://gfa-health.com/" target="_blank" rel="noreferrer">gfa-health.com</a>
          <a className="hover:text-white" href="#">Privacy</a>
          <a className="hover:text-white" href="#">Terms</a>
        </div>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
