import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, MapPin, Ambulance, CalendarCheck, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/GFA-health.png';
export const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/departments', label: 'Departments' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/news', label: 'News' },
  { to: '/careers', label: 'Careers' },
  { to: '/contact', label: 'Contact' },
];

const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <>
      {/* Top bar */}
      <div className="hidden md:block bg-sidebar text-sidebar-foreground text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> +234 706 151 3509</span>
            <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> info@gfa-health.demo</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Ogun Tech Hub, Abeokuta</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-tertiary font-semibold"><Ambulance className="h-3 w-3" /> Emergency 24/7: 199</span>
            <button className="flex items-center gap-1 hover:text-white"><Globe className="h-3 w-3" /> EN <ChevronDown className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border/60 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="GFA Demo Hospital" className="h-12 w-12 object-contain" />
            <div className="leading-tight">
              <div className="font-display font-bold text-sm md:text-base text-foreground">GFA Health HMS</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">GFA Health Technologies Ltd</div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) =>
                `text-sm px-3 py-1.5 rounded-md transition ${isActive ? 'text-primary bg-primary/8 font-semibold' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`
              }>{n.label}</NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
            <Link to="/appointment">
              <Button size="sm" className="bg-hero-gradient text-white shadow-md hover:opacity-95">
                <CalendarCheck className="h-4 w-4" /> Book
              </Button>
            </Link>
          </div>
          <button className="lg:hidden md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t bg-card p-4 space-y-1">
            {navItems.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)} className={({ isActive }) =>
                `block py-2 px-3 rounded-md text-sm ${isActive ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground hover:bg-primary/5'}`
              }>{n.label}</NavLink>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1" onClick={() => setOpen(false)}><Button variant="outline" className="w-full" size="sm">Login</Button></Link>
              <Link to="/appointment" className="flex-1" onClick={() => setOpen(false)}><Button className="w-full bg-hero-gradient text-white" size="sm">Book</Button></Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default SiteHeader;
