
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { CourseEditor, LessonForm } from '@/components/InstructorComponents';
import { CompleteCourseEditor } from '@/components/CompleteCourseEditor';

import {
  Search, BookOpen, Users, Star, Clock, Play, Check, Plus,
  ChevronRight, MessageSquare, ThumbsUp,
  BarChart3, DollarSign, TrendingUp, LogOut, Menu,
  X, GraduationCap, Trophy, Zap, Brain, Bot,
  Trash2, Edit, Eye, CheckCircle, AlertCircle,
  Sparkles, LayoutDashboard, ShieldCheck, UserCheck,
  Globe, ArrowRight, ChevronLeft, ChevronDown,
  Shield, Download, RefreshCw,
  Tag, AlertTriangle, CreditCard,
  UserX, Layers, ArrowUpRight, Rocket, Award, Heart, Bookmark, Copy,
  Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw,
  Subtitles, LayoutPanelLeft, Info, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';

// ==================== CONSTANTS ====================
const CAT_GRAD = {
  'web-development': 'from-blue-500 to-violet-600',
  'mobile-development': 'from-cyan-500 to-blue-600',
  'data-science': 'from-emerald-500 to-teal-600',
  'design': 'from-pink-500 to-rose-600',
  'business': 'from-amber-500 to-orange-500',
  'marketing': 'from-red-500 to-pink-600',
  'photography': 'from-violet-500 to-purple-600',
  'music': 'from-indigo-500 to-blue-600',
  'personal-growth': 'from-yellow-500 to-amber-500',
  'finance': 'from-slate-500 to-gray-600',
};
const LEVELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato' };
const CHART_COLORS = ['#7c3aed', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Complete language list - Italian primary
const ALL_LANGUAGES = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'Inglese', flag: '🇬🇧' },
  { code: 'es', name: 'Spagnolo', flag: '🇪🇸' },
  { code: 'fr', name: 'Francese', flag: '🇫🇷' },
  { code: 'de', name: 'Tedesco', flag: '🇩🇪' },
  { code: 'pt', name: 'Portoghese', flag: '🇵🇹' },
  { code: 'nl', name: 'Olandese', flag: '🇳🇱' },
  { code: 'pl', name: 'Polacco', flag: '🇵🇱' },
  { code: 'ro', name: 'Rumeno', flag: '🇷🇴' },
  { code: 'sv', name: 'Svedese', flag: '🇸🇪' },
  { code: 'da', name: 'Danese', flag: '🇩🇰' },
  { code: 'fi', name: 'Finlandese', flag: '🇫🇮' },
  { code: 'no', name: 'Norvegese', flag: '🇳🇴' },
  { code: 'el', name: 'Greco', flag: '🇬🇷' },
  { code: 'cs', name: 'Ceco', flag: '🇨🇿' },
  { code: 'hu', name: 'Ungherese', flag: '🇭🇺' },
  { code: 'tr', name: 'Turco', flag: '🇹🇷' },
  { code: 'ru', name: 'Russo', flag: '🇷🇺' },
  { code: 'uk', name: 'Ucraino', flag: '🇺🇦' },
  { code: 'zh', name: 'Cinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Giapponese', flag: '🇯🇵' },
  { code: 'ko', name: 'Coreano', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabo', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'th', name: 'Tailandese', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamita', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesiano', flag: '🇮🇩' },
  { code: 'ms', name: 'Malese', flag: '🇲🇾' },
  { code: 'tl', name: 'Filippino', flag: '🇵🇭' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'he', name: 'Ebraico', flag: '🇮🇱' },
  { code: 'fa', name: 'Persiano', flag: '🇮🇷' },
];
const LANG_NAMES = Object.fromEntries(ALL_LANGUAGES.map(l => [l.code, l.name]));

// ==================== API ====================
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

async function api(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lh_token') : null;
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api${url}`, { ...options, headers });
    
    // Handle empty responses
    const text = await res.text();
    if (!text || text.trim() === '') {
      if (!res.ok) throw new Error('Errore del server');
      return {};
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Response:', text);
      throw new Error('Risposta non valida dal server');
    }
    
    if (!res.ok) throw new Error(data.error || 'Errore');
    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Errore di connessione al server');
    }
    throw error;
  }
}

// ==================== AUTH CONTEXT ====================
const AuthContext = createContext();
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [viewData, setViewData] = useState({});
  
  // Restore navigation state from URL hash or localStorage on mount
  useEffect(() => {
    // Try to restore from URL hash first (for browser navigation)
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const [hashView, hashData] = hash.split('?');
        if (hashView) {
          setView(hashView);
          if (hashData) {
            const params = new URLSearchParams(hashData);
            const data = {};
            params.forEach((value, key) => { data[key] = value; });
            setViewData(data);
          }
        }
      } catch (e) {
        // Fallback to localStorage
        const savedView = localStorage.getItem('lh_view');
        const savedViewData = localStorage.getItem('lh_view_data');
        if (savedView) {
          setView(savedView);
          if (savedViewData) {
            try { setViewData(JSON.parse(savedViewData)); } catch (e) {}
          }
        }
      }
    } else {
      // Fallback to localStorage if no hash
      const savedView = localStorage.getItem('lh_view');
      const savedViewData = localStorage.getItem('lh_view_data');
      if (savedView) {
        setView(savedView);
        if (savedViewData) {
          try { setViewData(JSON.parse(savedViewData)); } catch (e) {}
        }
      }
    }
    
    const token = localStorage.getItem('lh_token');
    if (token) {
      api('/auth/me').then(d => setUser(d.user)).catch(() => localStorage.removeItem('lh_token')).finally(() => setLoading(false));
    } else setLoading(false);
    api('/init').catch(() => {});
    
    // Handle browser back/forward buttons
    const handlePopState = (event) => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const [hashView, hashData] = hash.split('?');
        if (hashView) {
          setView(hashView);
          if (hashData) {
            const params = new URLSearchParams(hashData);
            const data = {};
            params.forEach((value, key) => { data[key] = value; });
            setViewData(data);
          } else {
            setViewData({});
          }
        }
      } else {
        setView('home');
        setViewData({});
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const login = (u, t) => { localStorage.setItem('lh_token', t); setUser(u); };
  const logout = () => { 
    localStorage.removeItem('lh_token'); 
    localStorage.removeItem('lh_view');
    localStorage.removeItem('lh_view_data');
    setUser(null); 
    navigate('home'); 
  };
  
  const navigate = useCallback((v, d = {}) => { 
    setView(v); 
    setViewData(d); 
    // Persist to localStorage
    localStorage.setItem('lh_view', v);
    localStorage.setItem('lh_view_data', JSON.stringify(d));
    // Update URL hash for browser navigation
    const dataString = Object.keys(d).length > 0 ? '?' + new URLSearchParams(d).toString() : '';
    window.history.pushState({ view: v, data: d }, '', `#${v}${dataString}`);
    window.scrollTo(0, 0); 
  }, []);
  
  return <AuthContext.Provider value={{ user, setUser, loading, login, logout, view, viewData, navigate }}>{children}</AuthContext.Provider>;
}
function useAuth() { return useContext(AuthContext); }

// ==================== SHARED COMPONENTS ====================
function Stars({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  );
}

function CourseCard({ course, onClick }) {
  const coverImg = course.thumbnail || course.coverImage;
  const [imgError, setImgError] = useState(false);
  
  // Category-based gradients for placeholder
  const catGrad = {
    'web-development': 'from-blue-600 to-indigo-700',
    'mobile-development': 'from-cyan-600 to-blue-700',
    'data-science': 'from-emerald-600 to-teal-700',
    'design': 'from-pink-600 to-rose-700',
    'business': 'from-amber-600 to-orange-600',
    'marketing': 'from-red-600 to-pink-700',
    'photography': 'from-violet-600 to-purple-700',
    'music': 'from-indigo-600 to-blue-700',
    'personal-growth': 'from-yellow-500 to-amber-600',
    'finance': 'from-slate-600 to-gray-700',
  };
  const grad = catGrad[course.categorySlug] || 'from-[#002FA7] to-[#0046FF]';
  
  return (
    <div onClick={onClick} data-testid={`course-card-${course.id}`} className="group cursor-pointer bg-white rounded-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300">
      <div className="h-44 relative overflow-hidden">
        {coverImg && !imgError ? (
          <img src={coverImg} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setImgError(true)} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
            <div className="text-center">
              <BookOpen className="w-10 h-10 text-white/40 mx-auto mb-2" />
              <p className="text-white/50 text-xs font-medium">{course.categoryName || 'Corso'}</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Badge className="absolute top-3 left-3 bg-white text-slate-800 border-0 text-[10px] font-bold shadow-sm rounded-sm">{LEVELS[course.level] || course.level}</Badge>
        {course.language && (
          <Badge className="absolute top-3 right-3 bg-[#002FA7] text-white border-0 text-[10px] font-medium rounded-sm">{LANG_NAMES[course.language] || course.language}</Badge>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-2 text-slate-900 group-hover:text-[#002FA7] transition-colors">{course.title}</h3>
        <p className="text-xs text-slate-500 mb-3">{course.instructorName}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold text-slate-900">{course.rating?.toFixed(1)}</span>
          <Stars rating={course.rating || 0} size={12} />
          <span className="text-[11px] text-slate-400">({course.ratingCount || 0})</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xl font-bold tracking-tight text-slate-900">{course.price > 0 ? `€${course.price?.toFixed(2)}` : <span className="text-emerald-600">Gratis</span>}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-400"><Users size={12} />{course.totalStudents || 0}</div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-shimmer bg-[#E9ECEF] ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="border border-[#DEE2E6] overflow-hidden">
      <Skeleton className="h-48" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#DEE2E6] border-t-[#002FA7] rounded-full animate-spin" /></div>;
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-4 animate-fade-in">
      {Icon && <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4"><Icon className="w-7 h-7 text-gray-300" /></div>}
      <h3 className="text-base font-semibold text-gray-400 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-5">{description}</p>}
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'violet' }) {
  const bg = { violet: 'bg-violet-50', blue: 'bg-blue-50', green: 'bg-emerald-50', amber: 'bg-amber-50', rose: 'bg-rose-50' };
  const fg = { violet: 'text-violet-600', blue: 'text-blue-600', green: 'text-emerald-600', amber: 'text-amber-600', rose: 'text-rose-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg[color]} ${fg[color]}`}><Icon size={18} /></div>
        <div><p className="text-2xl font-bold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </div>
    </div>
  );
}

// ==================== NAVIGATION ====================
function Navigation() {
  const { user, logout, navigate, view } = useAuth();
  const [q, setQ] = useState('');
  const [mob, setMob] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const dash = () => !user ? 'login' : user.role === 'admin' ? 'admin-dashboard' : user.role === 'instructor' ? 'instructor-dashboard' : 'student-dashboard';

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-slate-200/50 shadow-sm' : 'bg-white/95 border-b border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <button onClick={() => navigate('home')} className="flex items-center gap-2.5 shrink-0 group" data-testid="logo-home">
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform group-hover:scale-105">
            <rect width="64" height="64" rx="14" fill="#002FA7"/>
            <path d="M18 44V20l14-6 14 6v24l-14 6-14-6z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
            <path d="M32 14v36" stroke="white" strokeWidth="2.5"/>
            <path d="M18 20l14 6 14-6" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
            <circle cx="32" cy="12" r="3" fill="#FFD700"/>
          </svg>
          <span className="text-xl font-bold tracking-tight hidden sm:block text-slate-900">LearnHub</span>
        </button>

        <form onSubmit={e => { e.preventDefault(); if (q.trim()) navigate('catalog', { search: q }); }} className="flex-1 max-w-lg hidden md:block">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cerca corsi, argomenti, insegnanti..." value={q} onChange={e => setQ(e.target.value)} className="pl-11 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" data-testid="search-input" />
          </div>
        </form>

        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" className={`rounded-xl text-[13px] font-medium px-4 ${view === 'catalog' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`} onClick={() => navigate('catalog')} data-testid="nav-explore">Esplora</Button>
          <Button variant="ghost" size="sm" className={`rounded-xl text-[13px] font-medium px-4 ${view === 'community' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`} onClick={() => navigate('community')} data-testid="nav-community">Community</Button>
          {user && <Button variant="ghost" size="sm" className={`rounded-xl text-[13px] font-medium px-4 ${view.includes('dashboard') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`} onClick={() => navigate(dash())} data-testid="nav-dashboard"><LayoutDashboard size={14} className="mr-1.5" />Dashboard</Button>}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Site Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-xl text-[13px] gap-1.5 text-slate-600 hover:text-slate-900 hidden sm:flex" data-testid="site-lang-selector">
                <Globe size={15} />
                <span>IT</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-xl border-slate-200 max-h-80 overflow-y-auto">
              <div className="px-3 py-2 mb-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lingua del sito</p>
              </div>
              {ALL_LANGUAGES.map(l => (
                <DropdownMenuItem key={l.code} className={`rounded-lg py-2 text-sm ${l.code === 'it' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}>
                  <span className="mr-2">{l.flag}</span> {l.name} {l.code === 'it' && <Check size={14} className="ml-auto text-blue-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl hover:bg-slate-100" data-testid="user-menu">
                  <Avatar className="w-9 h-9 ring-2 ring-blue-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-white text-sm font-semibold">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-slate-700">{user.name?.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 shadow-xl border-slate-200">
                <div className="px-3 py-3 mb-1 bg-gradient-to-r from-blue-50 to-violet-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => navigate(dash())}><LayoutDashboard size={16} className="mr-3 text-slate-500" /> Dashboard</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => navigate('profile')}><Trophy size={16} className="mr-3 text-slate-500" /> Profilo</DropdownMenuItem>
                {user.role === 'instructor' && <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => navigate('create-course')}><Plus size={16} className="mr-3 text-slate-500" /> Crea corso</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg text-red-500 focus:text-red-600" onClick={logout}><LogOut size={14} className="mr-2" /> Esci</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl text-[13px]" onClick={() => navigate('login')}>Accedi</Button>
              <Button size="sm" className="rounded-xl text-[13px] shadow-lg shadow-violet-200/50" onClick={() => navigate('register')}>Inizia gratis</Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="md:hidden rounded-xl" onClick={() => setMob(!mob)}>
            {mob ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>
      {mob && (
        <div className="md:hidden border-t bg-white p-4 space-y-1 animate-slide-down">
          <form onSubmit={e => { e.preventDefault(); if (q.trim()) { navigate('catalog', { search: q }); setMob(false); } }} className="mb-2">
            <Input placeholder="Cerca corsi..." value={q} onChange={e => setQ(e.target.value)} className="rounded-xl" />
          </form>
          {['Esplora', 'Community'].map((l, i) => (
            <Button key={i} variant="ghost" className="w-full justify-start rounded-xl" onClick={() => { navigate(i === 0 ? 'catalog' : 'community'); setMob(false); }}>{l}</Button>
          ))}
          {user && <Button variant="ghost" className="w-full justify-start rounded-xl" onClick={() => { navigate(dash()); setMob(false); }}>Dashboard</Button>}
        </div>
      )}
    </nav>
  );
}

// ==================== HOME PAGE ====================
function HomePage() {
  const { navigate } = useAuth();
  const [cats, setCats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/categories').then(d => setCats(d.categories || [])),
      api('/courses?sort=popular&limit=6').then(d => setCourses(d.courses || []))
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white">
      {/* Hero - Swiss Design */}
      <section className="relative overflow-hidden bg-white swiss-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-32 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-[#002FA7]/5 px-4 py-2 text-xs font-bold text-[#002FA7] uppercase tracking-widest mb-8">
                <Sparkles size={12} /> Piattaforma di e-learning
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter leading-[0.95] mb-6 text-[#0A0A0A]">
                Impara senza
                <br />
                <span className="text-[#002FA7]">limiti.</span>
              </h1>
              <p className="text-lg text-[#495057] leading-relaxed mb-10 max-w-xl">
                Corsi online creati da esperti. Sviluppo, design, data science e molto altro. Inizia il tuo percorso oggi.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-16">
                <Button size="lg" className="btn-primary rounded-sm h-14 px-10 text-base" onClick={() => navigate('catalog')} data-testid="hero-explore-btn">
                  Esplora i corsi <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="btn-outline rounded-sm h-14 px-10 text-base" onClick={() => navigate('register', { role: 'instructor' })} data-testid="hero-teach-btn">
                  Insegna su LearnHub
                </Button>
              </div>

              {/* Trust bar */}
              <div className="flex flex-wrap items-center gap-8 text-sm text-[#495057]">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-[#002FA7] ring-2 ring-white" />)}
                  </div>
                  <span className="font-medium">7.000+ studenti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star size={16} className="fill-[#FFD700] text-[#FFD700]" />
                  <span className="font-medium">4.8 rating medio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award size={16} className="text-[#002FA7]" />
                  <span className="font-medium">Certificati verificabili</span>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-5 hidden lg:block">
              <img 
                src="https://images.pexels.com/photos/5940710/pexels-photo-5940710.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
                alt="Studente che impara" 
                className="w-full h-[450px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-bold text-[#002FA7] uppercase tracking-[0.2em] mb-3">Categorie</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0A0A0A]">Esplora per argomento</h2>
          </div>
          <Button variant="ghost" className="rounded-sm hidden sm:flex text-[13px] font-medium text-[#495057] hover:text-[#002FA7]" onClick={() => navigate('catalog')}>Vedi tutto <ChevronRight size={14} className="ml-1" /></Button>
        </div>
        {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">{Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-sm" />)}</div> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 animate-stagger">
            {cats.map((c) => (
              <button key={c.id} onClick={() => navigate('catalog', { category: c.slug })} className="bg-white border border-[#DEE2E6] p-6 text-left card-lift" data-testid={`category-${c.slug}`}>
                <span className="text-3xl block mb-3">{c.icon}</span>
                <p className="font-semibold text-sm text-[#0A0A0A]">{c.name}</p>
                <p className="text-xs text-[#868E96] mt-1">{c.courseCount || 0} corsi</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Popular Courses */}
      <section className="bg-[#F8F9FA] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs font-bold text-[#002FA7] uppercase tracking-[0.2em] mb-3">Top corsi</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0A0A0A]">I più amati dagli studenti</h2>
            </div>
            <Button variant="ghost" className="rounded-sm hidden sm:flex text-[13px] font-medium text-[#495057] hover:text-[#002FA7]" onClick={() => navigate('catalog')}>Vedi tutto <ChevronRight size={14} className="ml-1" /></Button>
          </div>
          {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
              {courses.map((c) => (
                <div key={c.id}>
                  <CourseCard course={c} onClick={() => navigate('course', { id: c.id })} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-2">Perche sceglierci</p>
          <h2 className="text-3xl font-bold tracking-tight">Tutto per imparare al meglio</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Brain, title: 'AI Study Assistant', desc: 'Un assistente AI personale che ti aiuta con riassunti, quiz e suggerimenti su misura.', color: 'violet' },
            { icon: Trophy, title: 'Gamification', desc: 'Guadagna punti XP, sblocca badge e sali di livello mentre progredisci nel tuo percorso.', color: 'amber' },
            { icon: Globe, title: 'Community', desc: 'Unisciti a una community attiva di studenti e insegnanti. Condividi, discuti, cresci.', color: 'blue' },
          ].map((f, i) => {
            const bgMap = { violet: 'bg-violet-50', amber: 'bg-amber-50', blue: 'bg-blue-50' };
            const fgMap = { violet: 'text-violet-600', amber: 'text-amber-600', blue: 'text-blue-600' };
            return (
              <div key={i} className={`animate-slide-up stagger-${i + 1} text-center p-8 rounded-2xl border border-gray-100 bg-white card-lift`}>
                <div className={`w-14 h-14 rounded-2xl ${bgMap[f.color]} flex items-center justify-center mx-auto mb-5`}>
                  <f.icon size={24} className={fgMap[f.color]} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 text-white p-12 md:p-16">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative text-center max-w-xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Inizia oggi il tuo percorso</h2>
            <p className="text-violet-100 mb-8 leading-relaxed">Registrati gratuitamente e accedi a corsi creati da professionisti del settore. Nessuna carta di credito richiesta.</p>
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 rounded-xl h-12 px-8 text-[15px] shadow-xl" onClick={() => navigate('register')}>
              Crea il tuo account <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="28" height="28" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#002FA7"/><path d="M18 44V20l14-6 14 6v24l-14 6-14-6z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M32 14v36" stroke="white" strokeWidth="2.5"/><path d="M18 20l14 6 14-6" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><circle cx="32" cy="12" r="3" fill="#FFD700"/></svg>
                <span className="font-bold text-lg">LearnHub</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">La piattaforma leader per corsi online. Impara da esperti del settore, ovunque tu sia.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">Piattaforma</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><button onClick={() => navigate('catalog')} className="hover:text-white transition-colors">Esplora corsi</button></li>
                <li><button onClick={() => navigate('community')} className="hover:text-white transition-colors">Community</button></li>
                <li><button className="hover:text-white transition-colors">Diventa insegnante</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">Risorse</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><button className="hover:text-white transition-colors">Centro assistenza</button></li>
                <li><button className="hover:text-white transition-colors">Blog</button></li>
                <li><button className="hover:text-white transition-colors">Termini di servizio</button></li>
                <li><button className="hover:text-white transition-colors">Privacy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">Lingua del sito</h4>
              <Select defaultValue="it">
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-10" data-testid="footer-lang-selector">
                  <Globe size={14} className="mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {ALL_LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">2026 LearnHub. Tutti i diritti riservati.</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <button className="hover:text-white transition-colors">Privacy</button>
              <button className="hover:text-white transition-colors">Termini</button>
              <button className="hover:text-white transition-colors">Mappa del sito</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==================== CATALOG PAGE ====================
function CatalogPage() {
  const { navigate, viewData } = useAuth();
  const [courses, setCourses] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: viewData?.search || '', category: viewData?.category || '', level: '', language: '', sort: 'popular' });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.search) p.set('search', filters.search);
      if (filters.category) p.set('category', filters.category);
      if (filters.level) p.set('level', filters.level);
      if (filters.language) p.set('language', filters.language);
      p.set('sort', filters.sort); p.set('page', page.toString()); p.set('limit', '12');
      const d = await api(`/courses?${p}`);
      setCourses(d.courses || []); setTotal(d.total || 0);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { api('/categories').then(d => setCats(d.categories || [])).catch(() => {}); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Esplora i corsi</h1>
        <p className="text-muted-foreground">{total} corsi disponibili</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-56 shrink-0 animate-slide-up">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5 lg:sticky lg:top-20">
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Ricerca</Label><Input placeholder="Cerca..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Categoria</Label>
              <Select value={filters.category} onValueChange={v => { setFilters(f => ({ ...f, category: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Tutte" /></SelectTrigger>
                <SelectContent>{[{ id: 'all', slug: 'all', name: 'Tutte le categorie', icon: '' }, ...cats].map(c => <SelectItem key={c.id} value={c.slug}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Livello</Label>
              <Select value={filters.level} onValueChange={v => { setFilters(f => ({ ...f, level: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Tutti" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tutti</SelectItem><SelectItem value="beginner">Principiante</SelectItem><SelectItem value="intermediate">Intermedio</SelectItem><SelectItem value="advanced">Avanzato</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Lingua</Label>
              <Select value={filters.language} onValueChange={v => { setFilters(f => ({ ...f, language: v === 'all' ? '' : v })); setPage(1); }}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Tutte" /></SelectTrigger>
                <SelectContent className="max-h-64"><SelectItem value="all">Tutte le lingue</SelectItem>{ALL_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Ordina</Label>
              <Select value={filters.sort} onValueChange={v => setFilters(f => ({ ...f, sort: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="popular">Piu popolari</SelectItem><SelectItem value="newest">Piu recenti</SelectItem><SelectItem value="rating">Migliore valutazione</SelectItem><SelectItem value="price-low">Prezzo: basso</SelectItem><SelectItem value="price-high">Prezzo: alto</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </aside>
        <div className="flex-1">
          {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">{Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div> : courses.length === 0 ? (
            <EmptyState icon={BookOpen} title="Nessun corso trovato" description="Prova a cambiare i filtri" />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">{courses.map(c => <CourseCard key={c.id} course={c} onClick={() => navigate('course', { id: c.id })} />)}</div>
              {total > 12 && <div className="flex justify-center gap-3 mt-10">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} className="mr-1" /> Precedente</Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">Pagina {page}</span>
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}>Successiva <ChevronRight size={14} className="ml-1" /></Button>
              </div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== EXPANDABLE DESCRIPTION ====================
function ExpandableDescription({ description, courseTitle }) {
  const [expanded, setExpanded] = useState(false);
  const text = description || `Benvenuto nel corso "${courseTitle || 'Corso'}". Questo percorso formativo è stato progettato per guidarti passo dopo passo nell'apprendimento delle competenze chiave. Attraverso lezioni teoriche e pratiche, acquisirai le conoscenze necessarie per raggiungere i tuoi obiettivi professionali e personali.`;
  const isLong = text.length > 400;
  
  return (
    <div data-testid="description-section">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Descrizione</h2>
      <div className={`relative ${!expanded && isLong ? 'max-h-48 overflow-hidden' : ''}`}>
        <p className="text-[14px] text-slate-600 leading-[1.85] whitespace-pre-line">{expanded || !isLong ? text : text.slice(0, 400) + '...'}</p>
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
        )}
      </div>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="mt-3 text-sm font-bold text-[#002FA7] hover:underline flex items-center gap-1">
          {expanded ? 'Mostra meno' : 'Mostra di più'} 
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

// ==================== RATING BREAKDOWN ====================
function RatingBreakdown({ reviews, totalRatings, avgRating }) {
  const counts = [0, 0, 0, 0, 0];
  (reviews || []).forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
  });
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  
  return (
    <div className="flex flex-col sm:flex-row gap-8 items-start" data-testid="rating-breakdown">
      <div className="text-center shrink-0">
        <div className="text-6xl font-extrabold text-amber-500 leading-none">{(avgRating || 0).toFixed(1)}</div>
        <div className="flex items-center justify-center gap-0.5 mt-2 mb-1">
          {[1,2,3,4,5].map(i => <Star key={i} size={16} className={i <= Math.round(avgRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}
        </div>
        <p className="text-xs text-slate-500">Valutazione del corso</p>
      </div>
      <div className="flex-1 space-y-1.5 w-full">
        {[5,4,3,2,1].map(star => {
          const pct = (counts[star - 1] / total) * 100;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{width: `${pct}%`}} />
              </div>
              <div className="flex items-center gap-0.5 shrink-0 w-20">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="text-xs text-slate-600 font-medium">{star}</span>
                <span className="text-xs text-slate-400 ml-1">{Math.round(pct)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== COURSE DETAIL ====================
function CourseDetailPage() {
  const { navigate, viewData, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null); // For video preview popup

  useEffect(() => {
    if (!viewData?.id) return;
    setLoading(true);
    api(`/courses/${viewData.id}`).then(setData).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [viewData?.id]);

  const handleEnroll = async () => {
    if (!user) return navigate('login');
    setEnrolling(true);
    try { await api(`/courses/${viewData.id}/enroll`, { method: 'POST' }); toast.success('Iscrizione completata!'); setData(await api(`/courses/${viewData.id}`)); } catch (e) { toast.error(e.message); }
    setEnrolling(false);
  };

  const handleReview = async () => {
    try { await api(`/courses/${viewData.id}/reviews`, { method: 'POST', body: JSON.stringify(reviewForm) }); toast.success('Recensione aggiunta!'); setData(await api(`/courses/${viewData.id}`)); setReviewForm({ rating: 5, comment: '' }); } catch (e) { toast.error(e.message); }
  };
  
  // Find first preview lesson with video
  const findPreviewLesson = () => {
    if (!data?.modules) return null;
    for (const mod of data.modules) {
      for (const lesson of (mod.lessons || [])) {
        if (lesson.isPreview && lesson.videoUrl) return lesson;
      }
    }
    return null;
  };

  if (loading) return <LoadingSpinner />;
  if (!data?.course) return <EmptyState icon={BookOpen} title="Corso non trovato" />;

  const { course, modules, reviews, instructor, enrollment, totalLessons, totalDuration } = data;
  const coverImg = course.thumbnail || course.coverImage;
  const h = Math.floor((totalDuration || 0) / 3600);
  const m = Math.floor(((totalDuration || 0) % 3600) / 60);
  const previewLesson = findPreviewLesson();

  return (
    <div className="animate-fade-in bg-[#FAFAFA]">
      {/* Video Preview Popup */}
      {previewVideo && (
        <Dialog open={true} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-lg border-0 shadow-2xl">
            <div className="bg-black">
              <div className="flex items-center justify-between p-4 bg-slate-900">
                <h3 className="text-white font-semibold text-sm">{previewVideo.title}</h3>
                <button onClick={() => setPreviewVideo(null)} className="text-white/60 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <video 
                src={previewVideo.videoUrl} 
                controls 
                autoPlay 
                className="w-full aspect-video"
                data-testid="preview-video-player"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Hero Section - Premium Dark */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px'}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="flex flex-col lg:flex-row gap-10 py-10 lg:py-14">
            {/* Course Info */}
            <div className="flex-1 text-white">
              <button onClick={() => navigate('catalog')} className="text-white/40 hover:text-white text-sm flex items-center gap-1.5 mb-5 transition-colors" data-testid="back-to-catalog">
                <ChevronLeft size={16} /> Torna al catalogo
              </button>
              
              <div className="flex items-center gap-2.5 mb-4">
                <Badge className="bg-[#002FA7] text-white border-0 text-[11px] font-semibold px-3 py-1 rounded">{course.categoryName}</Badge>
                <Badge className="bg-white/10 text-white/80 border-white/10 text-[11px] rounded">{LEVELS[course.level] || course.level}</Badge>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight mb-3 leading-[1.15]" data-testid="course-title">{course.title}</h1>
              
              <p className="text-base text-white/60 mb-4 max-w-2xl leading-relaxed">
                {course.subtitle || course.shortDescription || course.description?.slice(0, 200) || `Impara ${course.title} con lezioni pratiche e progetti reali. Un corso completo per ${LEVELS[course.level]?.toLowerCase() || 'tutti i livelli'}.`}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mb-4">
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="fill-amber-400 text-amber-400" />
                  <b className="text-white">{course.rating?.toFixed(1)}</b>
                  <span className="text-white/40">({course.ratingCount} recensioni)</span>
                </span>
                <span className="w-px h-4 bg-white/15" />
                <span className="flex items-center gap-1.5"><Users size={14} />{course.totalStudents} studenti</span>
                <span className="w-px h-4 bg-white/15" />
                <span className="flex items-center gap-1.5"><Clock size={14} />{h > 0 ? `${h}h ` : ''}{m}min di contenuti</span>
              </div>
              
              <p className="text-[13px] text-white/40 mb-4 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5"><Info size={13} /> Ultimo aggiornamento {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : 'recente'}</span>
                <span className="w-px h-3 bg-white/15" />
                <span className="flex items-center gap-1.5"><Globe size={13} /> {LANG_NAMES[course.language] || course.language}</span>
              </p>
              
              {instructor && (
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <Avatar className="w-10 h-10 ring-2 ring-white/10">
                    <AvatarFallback className="bg-[#002FA7] text-white text-sm font-bold">{instructor.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Creato da</p>
                    <p className="text-white font-semibold text-[14px]">{instructor.name}</p>
                  </div>
                </div>
              )}
              
              {/* Quick highlights in hero */}
              {course.whatYouLearn?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {course.whatYouLearn.slice(0, 4).map((x, i) => (
                      <div key={i} className="flex items-start gap-2 text-[13px] text-white/50">
                        <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Course Sidebar Card */}
            <div className="w-full lg:w-[380px] shrink-0">
              <div className="bg-white rounded-lg overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-white/5">
                {/* Cover/Preview */}
                <div className="relative aspect-video bg-slate-100 group cursor-pointer" onClick={() => previewLesson && setPreviewVideo(previewLesson)}>
                  {coverImg ? (
                    <img src={coverImg} alt={course.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                  ) : null}
                  <div className={`w-full h-full ${coverImg ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-[#002FA7] to-[#0046FF]`}>
                    <BookOpen size={44} className="text-white/25" />
                  </div>
                  {previewLesson && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-all" data-testid="preview-video-btn">
                      <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play size={24} className="text-slate-900 ml-0.5" />
                      </div>
                      <span className="absolute bottom-4 text-white/80 text-xs font-medium">Anteprima gratuita</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  {/* Price */}
                  {!enrollment && (
                    <div className="flex items-baseline gap-2 mb-5">
                      <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                        {course.price > 0 ? `€${course.price?.toFixed(2)}` : <span className="text-emerald-600">Gratis</span>}
                      </span>
                    </div>
                  )}
                  
                  {enrollment ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-500">Il tuo progresso</span>
                          <span className="font-bold text-[#002FA7]">{enrollment.progress}%</span>
                        </div>
                        <Progress value={enrollment.progress} className="h-2" />
                      </div>
                      <Button className="w-full h-12 text-sm font-semibold bg-[#002FA7] hover:bg-[#001F7A] text-white rounded-lg transition-all" onClick={() => {
                        const fl = modules?.[0]?.lessons?.[0];
                        if (fl) navigate('lesson', { courseId: course.id, lessonId: fl.id });
                      }} data-testid="continue-course-btn">
                        <Play size={16} className="mr-2" /> Continua il corso
                      </Button>
                      {enrollment.progress === 100 && (
                        <Button variant="outline" className="w-full h-12 text-sm font-semibold rounded-lg border-2 border-slate-200 hover:border-[#002FA7] hover:text-[#002FA7] transition-all" onClick={() => navigate('certificate', { courseId: course.id })}>
                          <Award size={16} className="mr-2" /> Ottieni certificato
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button className="w-full h-12 text-sm font-semibold bg-[#002FA7] hover:bg-[#001F7A] text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5" size="lg" onClick={handleEnroll} disabled={enrolling} data-testid="enroll-btn">
                        {enrolling ? 'Iscrizione...' : course.price > 0 ? 'Acquista ora' : 'Iscriviti gratis'}
                      </Button>
                      {previewLesson && (
                        <Button variant="outline" className="w-full h-12 text-sm font-medium rounded-lg border-2 border-slate-200 hover:border-[#002FA7] hover:text-[#002FA7] transition-all" onClick={() => setPreviewVideo(previewLesson)}>
                          <Play size={15} className="mr-2" /> Guarda l'anteprima
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Questo corso include</p>
                    <div className="space-y-3 text-[13px] text-slate-600">
                      <div className="flex items-center gap-3"><Play size={15} className="text-[#002FA7] shrink-0" />{h > 0 ? `${h} ore e ` : ''}{m} minuti di video</div>
                      <div className="flex items-center gap-3"><BookOpen size={15} className="text-[#002FA7] shrink-0" />{totalLessons} lezioni</div>
                      <div className="flex items-center gap-3"><Shield size={15} className="text-[#002FA7] shrink-0" />Accesso illimitato</div>
                      <div className="flex items-center gap-3"><Award size={15} className="text-[#002FA7] shrink-0" />Certificato di completamento</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== COURSE BODY - UDEMY STYLE ====== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 lg:py-14 space-y-10">

        {/* What You'll Learn */}
        <div className="border border-slate-200 rounded-lg p-7 bg-white" data-testid="what-you-learn">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Cosa imparerai</h2>
          {course.whatYouLearn?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {course.whatYouLearn.map((x, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={17} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-[14px] text-slate-700 leading-relaxed">{x}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[`Padroneggiare i concetti fondamentali di ${course.title?.split('-')[0] || 'questo argomento'}`, 
                'Applicare le competenze apprese in progetti pratici', 
                'Comprendere le best practice del settore', 
                'Costruire un portfolio di lavori completati'].map((x, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={17} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-[14px] text-slate-700 leading-relaxed">{x}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explore Related Topics */}
        <div data-testid="related-topics">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Esplora argomenti correlati</h3>
          <div className="flex flex-wrap gap-2">
            {course.tags?.length > 0 ? course.tags.map((t, i) => (
              <span key={i} className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-[#002FA7]/10 hover:text-[#002FA7] text-slate-700 rounded-full cursor-pointer transition-colors">{t}</span>
            )) : null}
            {course.categoryName && <span className="px-4 py-2 text-sm font-medium bg-[#002FA7]/8 text-[#002FA7] rounded-full">{course.categoryName}</span>}
            <span className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">{LEVELS[course.level] || course.level}</span>
            {course.language && <span className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">{LANG_NAMES[course.language] || course.language}</span>}
          </div>
        </div>

        {/* Course Content Accordion */}
        <div data-testid="course-content">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Contenuto del corso</h2>
            <div className="text-sm text-slate-500">{modules?.length || 0} sezioni &middot; {totalLessons} lezioni &middot; {h > 0 ? `${h}h ` : ''}{m}min durata totale</div>
          </div>
          <Accordion type="multiple" className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
            {(modules || []).map((mod, modIdx) => (
              <AccordionItem key={mod.id} value={mod.id} className="px-0 border-0">
                <AccordionTrigger className="hover:no-underline px-5 py-3.5 hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[14px] text-slate-900">{mod.title}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-4">{mod.lessons?.length || 0} lezioni</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-3 pt-1 bg-white">
                  <div className="space-y-0">
                    {(mod.lessons || []).map(l => (
                      <div key={l.id} className="flex items-center justify-between py-2.5 group">
                        <div className="flex items-center gap-3">
                          {l.videoUrl ? <Play size={14} className="text-slate-400 shrink-0" /> : <FileText size={14} className="text-slate-400 shrink-0" />}
                          <span className="text-[13px] text-slate-700 group-hover:text-[#002FA7] transition-colors">{l.title}</span>
                          {l.isPreview && (
                            <button onClick={() => l.videoUrl && setPreviewVideo(l)} className="text-[11px] font-medium text-[#002FA7] underline underline-offset-2 hover:no-underline">Anteprima</button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {enrollment?.completedLessons?.includes(l.id) && <Check size={14} className="text-emerald-500" />}
                          <span className="text-xs text-slate-400 tabular-nums">{l.videoDuration ? `${Math.floor(l.videoDuration / 60)}:${(l.videoDuration % 60).toString().padStart(2, '0')}` : ''}</span>
                          {enrollment && (
                            <button className="text-[11px] font-medium text-[#002FA7] opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate('lesson', { courseId: course.id, lessonId: l.id })}>
                              {enrollment.completedLessons?.includes(l.id) ? 'Rivedi' : 'Inizia'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Requirements */}
        <div data-testid="requirements">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Requisiti</h2>
          <ul className="space-y-2">
            {(course.requirements?.length > 0 ? course.requirements : ['Nessun requisito specifico - questo corso è aperto a tutti', 'Un computer con connessione a internet', 'Voglia di imparare e mettersi in gioco']).map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>

        {/* Description - Expandable */}
        <ExpandableDescription description={course.description} courseTitle={course.title} />

        {/* Who is this course for */}
        <div data-testid="target-audience">
          <h2 className="text-xl font-bold text-slate-900 mb-4">A chi è rivolto questo corso</h2>
          <ul className="space-y-2">
            {(course.targetAudience?.length > 0 ? course.targetAudience : [`Chiunque voglia imparare ${course.title?.split('-')[0] || 'questo argomento'}`, 'Studenti e professionisti che vogliono ampliare le proprie competenze', 'Principianti motivati che cercano una guida strutturata']).map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />{t}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructor Section - Full */}
        {instructor && (
          <div data-testid="instructor-section">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Insegnante</h2>
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24 ring-4 ring-slate-100 shrink-0">
                <AvatarFallback className="bg-[#002FA7] text-white text-3xl font-bold">{instructor.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#002FA7] hover:underline cursor-pointer">{instructor.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{instructor.title || 'Insegnante'}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 mb-4">
                  <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" />{course.rating?.toFixed(1)} valutazione</span>
                  <span className="flex items-center gap-1.5"><Award size={14} className="text-slate-400" />{course.ratingCount} recensioni</span>
                  <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" />{course.totalStudents} studenti</span>
                  <span className="flex items-center gap-1.5"><Play size={14} className="text-slate-400" />1 corso</span>
                </div>
                <p className="text-[14px] text-slate-600 leading-relaxed">{instructor.bio}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section with Rating Breakdown */}
        <div data-testid="reviews-section">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Star size={22} className="fill-amber-400 text-amber-400" />
            <span>{course.rating?.toFixed(1)} valutazione del corso &middot; {course.ratingCount} valutazioni</span>
          </h2>
          
          {/* Rating Breakdown */}
          <RatingBreakdown reviews={reviews} totalRatings={course.ratingCount} avgRating={course.rating} />
          
          {/* Review Form */}
          {enrollment && (
            <div className="border border-slate-200 rounded-lg p-6 mt-8 bg-white">
              <h4 className="font-semibold text-slate-900 mb-4">Lascia una recensione</h4>
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setReviewForm(f => ({ ...f, rating: i }))} className="transition-transform hover:scale-110">
                    <Star size={28} className={i <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Condividi la tua esperienza con questo corso..." value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} className="rounded-lg mb-4 border-slate-200 focus:border-[#002FA7]" rows={4} />
              <Button className="rounded-lg bg-[#002FA7] hover:bg-[#001F7A] text-white font-semibold" onClick={handleReview}>Pubblica recensione</Button>
            </div>
          )}
          
          {/* Review List */}
          {(reviews || []).length > 0 ? (
            <div className="mt-6 space-y-0 divide-y divide-slate-100">
              {reviews.map(r => (
                <div key={r.id} className="py-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-slate-800 text-white font-bold text-sm">{r.userName?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-sm text-slate-900">{r.userName}</p>
                        <Stars rating={r.rating} size={12} />
                        <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' })}</span>
                      </div>
                      <p className="text-[14px] text-slate-600 leading-relaxed mt-1">{r.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Star} title="Nessuna recensione ancora" description="Sii il primo a recensire questo corso!" />
          )}
        </div>

      </section>
    </div>
  );
}

// ==================== SECURE DOCUMENT VIEWER ====================
function SecureDocumentViewer({ lesson }) {
  const [textContent, setTextContent] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!lesson?.id || !lesson?.pdfUrl) return;
    
    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setTextContent(null);
    
    const token = localStorage.getItem('lh_token');
    
    fetch(`${BACKEND_URL}/api/documents/view/${lesson.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async (res) => {
      if (!res.ok) throw new Error('Errore caricamento documento');
      
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Text content returned as JSON
        const data = await res.json();
        setTextContent(data.content);
      } else {
        // Binary content (PDF) - create blob URL
        const blob = await res.blob();
        // Create PDF blob with correct type
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        setBlobUrl(url);
      }
      setLoading(false);
    })
    .catch(e => {
      console.error('Document load error:', e);
      setError('Impossibile caricare il documento. Riprova.');
      setLoading(false);
    });
    
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);
  
  if (loading) {
    return (
      <div className="aspect-[4/5] flex items-center justify-center" data-testid="document-loading">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[#868E96]">Caricamento documento...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="aspect-[4/5] flex items-center justify-center" data-testid="document-error">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  
  // Text file viewer
  if (textContent !== null) {
    return (
      <div 
        className="aspect-[4/5] overflow-auto p-6 lg:p-8 bg-white"
        style={{userSelect: 'none', WebkitUserSelect: 'none'}}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        data-testid="secure-text-viewer"
      >
        <pre className="text-[#495057] leading-relaxed whitespace-pre-wrap font-sans text-sm">
          {textContent}
        </pre>
      </div>
    );
  }
  
  // PDF viewer via blob URL - browser native PDF viewer, no external buttons
  if (blobUrl) {
    return (
      <div 
        className="aspect-[4/5] relative"
        onContextMenu={(e) => e.preventDefault()}
        data-testid="secure-pdf-viewer"
      >
        <iframe 
          src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-full"
          title="Visualizzatore Documento"
          frameBorder="0"
          style={{pointerEvents: 'auto'}}
        />
      </div>
    );
  }
  
  return null;
}

// ==================== MODERN LESSON PLAYER ====================
function LessonPage() {
  const { navigate, viewData, user } = useAuth();
  const [data, setData] = useState(null);
  const [cur, setCur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subtitles, setSubtitles] = useState(null);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [generatingSubtitles, setGeneratingSubtitles] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!viewData?.courseId) return;
    api(`/courses/${viewData.courseId}`).then(d => {
      setData(d);
      const all = (d.modules || []).flatMap(m => m.lessons || []);
      const lesson = all.find(l => l.id === viewData.lessonId) || all[0];
      setCur(lesson);
      // Carica sottotitoli se disponibili
      if (lesson?.hasSubtitles) {
        api(`/lessons/${lesson.id}/subtitles`).then(s => setSubtitles(s.vttContent)).catch(() => {});
      }
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [viewData?.courseId, viewData?.lessonId]);

  // Carica sottotitoli quando cambia lezione
  useEffect(() => {
    if (cur?.hasSubtitles) {
      api(`/lessons/${cur.id}/subtitles`).then(s => setSubtitles(s.vttContent)).catch(() => setSubtitles(null));
    } else {
      setSubtitles(null);
    }
  }, [cur?.id]);
  
  // Genera sottotitoli AI
  const generateSubtitles = async () => {
    if (!cur?.videoUrl || !cur?.id) return;
    
    setGeneratingSubtitles(true);
    toast.info('Generazione sottotitoli AI in corso... Potrebbe richiedere alcuni minuti.');
    
    try {
      const result = await api('/subtitles/generate-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: cur.videoUrl,
          lesson_id: cur.id,
          language: data?.course?.language || 'it'
        })
      });
      
      // Save subtitles to database
      await api('/subtitles/save', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: cur.id,
          vttContent: result.vttContent,
          language: result.language
        })
      });
      
      setSubtitles(result.vttContent);
      setCur(prev => ({ ...prev, hasSubtitles: true }));
      toast.success('Sottotitoli generati con successo!');
    } catch (e) {
      toast.error('Errore generazione sottotitoli: ' + e.message);
    } finally {
      setGeneratingSubtitles(false);
    }
  };

  const markComplete = async (auto = false) => {
    if (!cur) return;
    try { 
      const result = await api(`/courses/${viewData.courseId}/progress`, { method: 'POST', body: JSON.stringify({ lessonId: cur.id }) }); 
      if (auto) {
        toast.success('Lezione completata automaticamente! +10 XP');
      } else {
        toast.success('Lezione completata! +10 XP');
      }
      setData(await api(`/courses/${viewData.courseId}`));
      
      // Se il corso è completato al 100%, mostra notifica certificato
      if (result.completed) {
        toast.success('🎉 Hai completato il corso! Ora puoi scaricare il tuo certificato!', { duration: 5000 });
      }
    } catch (e) { toast.error(e.message); }
  };

  // Gestione completamento automatico video
  const handleVideoEnded = () => {
    if (!data?.enrollment?.completedLessons?.includes(cur?.id)) {
      markComplete(true);
    }
    // Auto-passa alla prossima lezione
    const all = (data.modules || []).flatMap(m => m.lessons || []);
    const idx = all.findIndex(l => l.id === cur?.id);
    if (idx < all.length - 1) {
      setTimeout(() => {
        setCur(all[idx + 1]);
        toast.info('Passaggio alla lezione successiva...');
      }, 2000);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(playbackSpeed);
    const newSpeed = speeds[(idx + 1) % speeds.length];
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={BookOpen} title="Corso non trovato" />;
  
  const all = (data.modules || []).flatMap(m => m.lessons || []);
  const idx = all.findIndex(l => l.id === cur?.id);
  const done = data.enrollment?.completedLessons?.includes(cur?.id);
  const isVideoLesson = cur?.type === 'video' || cur?.videoUrl;
  const courseProgress = data.enrollment?.progress || 0;
  const isCourseDone = courseProgress === 100;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${showSidebar ? 'lg:mr-80' : ''} transition-all duration-300`}>
        {/* Top Navigation Bar */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('course', { id: viewData.courseId })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" data-testid="back-to-course-btn">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="font-semibold text-sm line-clamp-1">{data.course?.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Lezione {idx + 1} di {all.length}</span>
                <span>•</span>
                <span>{courseProgress}% completato</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCourseDone && (
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" onClick={() => navigate('certificate', { courseId: viewData.courseId })} data-testid="get-certificate-btn">
                <Award size={16} className="mr-2" />
                Ottieni Certificato
              </Button>
            )}
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden">
              {showSidebar ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Video Player or Content */}
        <div className="flex-1 p-4 lg:p-8">
          {isVideoLesson && cur?.videoUrl ? (
            <div ref={playerRef} className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 relative group" data-testid="video-player-container">
              {/* Video Element */}
              <div className="relative aspect-video">
                <video
                  ref={videoRef}
                  src={cur.videoUrl}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  data-testid="video-element"
                >
                  {subtitles && showSubtitles && (
                    <track
                      kind="subtitles"
                      src={`data:text/vtt;base64,${btoa(unescape(encodeURIComponent(subtitles)))}`}
                      srcLang="it"
                      label="Italiano"
                      default
                    />
                  )}
                </video>

                {/* Play/Pause Overlay */}
                <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                  <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-transform hover:scale-110 shadow-xl">
                    {isPlaying ? <Pause size={32} className="text-gray-800" /> : <Play size={32} className="text-gray-800 ml-1" />}
                  </button>
                </div>

                {/* Video Controls */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                  {/* Progress Bar */}
                  <div className="mb-3 cursor-pointer" onClick={handleSeek}>
                    <div className="h-1.5 bg-white/30 rounded-full overflow-hidden hover:h-2 transition-all">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" />}
                      </button>
                      <button onClick={() => skip(-10)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <RotateCcw size={18} className="text-white" />
                      </button>
                      <button onClick={() => skip(10)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <RotateCw size={18} className="text-white" />
                      </button>
                      <div className="flex items-center gap-2 ml-2">
                        <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                          {volume === 0 ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => {
                            setVolume(parseFloat(e.target.value));
                            if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value);
                          }}
                          className="w-20 accent-violet-500"
                        />
                      </div>
                      <span className="text-white text-sm ml-3">
                        {formatTime(videoRef.current?.currentTime)} / {formatTime(videoRef.current?.duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={changeSpeed} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors">
                        {playbackSpeed}x
                      </button>
                      {subtitles && (
                        <button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-2 rounded-lg transition-colors ${showSubtitles ? 'bg-[#002FA7] text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`} title="Sottotitoli">
                          <Subtitles size={18} />
                        </button>
                      )}
                      {!subtitles && isVideoLesson && (
                        <button 
                          onClick={generateSubtitles} 
                          disabled={generatingSubtitles}
                          className={`p-2 rounded-lg transition-colors ${generatingSubtitles ? 'bg-yellow-500/50 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`} 
                          title="Genera sottotitoli AI"
                          data-testid="generate-subtitles-btn"
                        >
                          {generatingSubtitles ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <Subtitles size={18} />
                          )}
                        </button>
                      )}
                      <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-white/20 rounded-lg transition-colors hidden lg:block">
                        <LayoutPanelLeft size={18} className="text-white" />
                      </button>
                      <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        {isFullscreen ? <Minimize size={18} className="text-white" /> : <Maximize size={18} className="text-white" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-Video Lesson Content - Documents and Text */
            <div className="bg-white rounded-sm border border-[#DEE2E6] shadow-sm overflow-hidden mb-6">
              <div className="p-6 lg:p-8">
                {(cur?.type === 'pdf' || cur?.pdfUrl) && cur?.pdfUrl ? (
                  <div className="space-y-4" onContextMenu={(e) => e.preventDefault()}>
                    {/* Document Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-[#E9ECEF]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-[#DC3545]/10 flex items-center justify-center">
                          <FileText size={20} className="text-[#DC3545]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#0A0A0A]">{cur.documentName || 'Documento'}</p>
                          <p className="text-xs text-[#868E96]">
                            {cur.pdfUrl.includes('.txt') ? 'Documento di testo' : 'Documento PDF'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        <Eye size={14} className="mr-1" /> Solo visualizzazione
                      </Badge>
                    </div>
                    {/* Secure Document Viewer */}
                    <div className="bg-[#F8F9FA] rounded-sm overflow-hidden border border-[#DEE2E6]" style={{userSelect: 'none', WebkitUserSelect: 'none'}}>
                      <SecureDocumentViewer lesson={cur} />
                    </div>
                  </div>
                ) : (
                  /* Text Content */
                  <div className="prose prose-lg max-w-none">
                    <div className="text-[#495057] leading-relaxed whitespace-pre-wrap">
                      {cur?.textContent || cur?.content || 'Contenuto in arrivo...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lesson Info & Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">{cur?.title}</h1>
                {cur?.description && <p className="text-muted-foreground">{cur.description}</p>}
              </div>
              {done ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-4 py-2 flex items-center gap-2 shrink-0">
                  <CheckCircle size={16} />
                  Completata
                </Badge>
              ) : !isVideoLesson && (
                <Button className="rounded-xl shrink-0" onClick={() => markComplete(false)} data-testid="mark-complete-btn">
                  <CheckCircle size={16} className="mr-2" />
                  Segna completata
                </Button>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              {idx > 0 && (
                <Button variant="outline" className="rounded-xl" onClick={() => setCur(all[idx - 1])} data-testid="prev-lesson-btn">
                  <ChevronLeft size={16} className="mr-2" />
                  Lezione precedente
                </Button>
              )}
              {idx < all.length - 1 && (
                <Button variant="outline" className="rounded-xl" onClick={() => setCur(all[idx + 1])} data-testid="next-lesson-btn">
                  Lezione successiva
                  <ChevronRight size={16} className="ml-2" />
                </Button>
              )}
              {idx === all.length - 1 && isCourseDone && (
                <Button className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" onClick={() => navigate('certificate', { courseId: viewData.courseId })}>
                  <Award size={16} className="mr-2" />
                  Ottieni il tuo Certificato
                </Button>
              )}
            </div>
          </div>

          {/* Auto-completion info for video lessons */}
          {isVideoLesson && !done && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Completamento automatico</p>
                <p className="text-sm text-blue-700">Questa lezione verrà segnata come completata automaticamente quando finirai di guardare il video.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Course Navigation */}
      <aside className={`fixed right-0 top-0 h-full w-80 bg-white border-l shadow-xl transform transition-transform duration-300 z-20 ${showSidebar ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 ${showSidebar ? '' : 'lg:hidden'}`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b bg-gradient-to-r from-violet-50 to-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm line-clamp-1">{data.course?.title}</h3>
              <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-white/50 rounded lg:hidden">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={courseProgress} className="flex-1 h-2 rounded-full" />
              <span className="text-sm font-semibold text-violet-700">{courseProgress}%</span>
            </div>
            {isCourseDone && (
              <div className="mt-3 p-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg flex items-center gap-2">
                <Award size={16} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-800">Corso completato! Ritira il certificato</span>
              </div>
            )}
          </div>

          {/* Lessons List */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {(data.modules || []).map((mod, modIdx) => (
              <div key={mod.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                    {modIdx + 1}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{mod.title}</p>
                </div>
                <div className="space-y-1 ml-3 border-l-2 border-gray-100 pl-4">
                  {(mod.lessons || []).map((l, lessonIdx) => {
                    const isActive = l.id === cur?.id;
                    const isCompleted = data.enrollment?.completedLessons?.includes(l.id);
                    const lessonIsVideo = l.type === 'video' || l.videoUrl;
                    
                    return (
                      <button
                        key={l.id}
                        onClick={() => setCur(l)}
                        data-testid={`lesson-item-${l.id}`}
                        className={`w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm transition-all ${
                          isActive 
                            ? 'bg-violet-100 text-violet-900 font-medium shadow-sm' 
                            : isCompleted
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-emerald-500' : isActive ? 'bg-violet-500' : 'bg-gray-200'
                        }`}>
                          {isCompleted ? (
                            <Check size={12} className="text-white" />
                          ) : lessonIsVideo ? (
                            <Play size={10} className={isActive ? 'text-white' : 'text-gray-500'} />
                          ) : (
                            <FileText size={10} className={isActive ? 'text-white' : 'text-gray-500'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="line-clamp-2 text-[13px]">{l.title}</span>
                          {l.videoDuration && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              {Math.floor(l.videoDuration / 60)}:{(l.videoDuration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ==================== AUTH PAGES ====================
function LoginPage() {
  const { login, navigate } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const d = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      login(d.user, d.token); toast.success(`Bentornato, ${d.user.name}!`);
      navigate({ admin: 'admin-dashboard', instructor: 'instructor-dashboard' }[d.user.role] || 'student-dashboard');
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200/50"><GraduationCap size={22} className="text-white" /></div>
          <h1 className="text-2xl font-bold tracking-tight">Bentornato</h1>
          <p className="text-sm text-muted-foreground mt-1">Accedi al tuo account LearnHub</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label className="text-xs font-medium">Email</Label><Input type="email" placeholder="nome@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="mt-1.5 rounded-xl h-11" /></div>
          <div><Label className="text-xs font-medium">Password</Label><Input type="password" placeholder="La tua password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required className="mt-1.5 rounded-xl h-11" /></div>
          <Button type="submit" className="w-full rounded-xl h-11 shadow-lg shadow-violet-200/50" disabled={loading}>{loading ? 'Accesso in corso...' : 'Accedi'}</Button>
        </form>
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Account demo</p>
          <p className="text-[11px] text-gray-400">Admin: admin@learnhub.it / admin123</p>
          <p className="text-[11px] text-gray-400">Insegnante: marco@learnhub.it / marco123</p>
          <p className="text-[11px] text-gray-400">Studente: student@learnhub.it / student123</p>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">Non hai un account? <button className="text-violet-600 font-semibold hover:underline" onClick={() => navigate('register')}>Registrati</button></p>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { login, navigate, viewData } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: viewData?.role || 'student' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { const d = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) }); login(d.user, d.token); toast.success('Registrazione completata!'); navigate(d.user.role === 'instructor' ? 'instructor-dashboard' : 'student-dashboard'); } catch (e) { toast.error(e.message); }
    setLoading(false);
  };
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200/50"><Rocket size={22} className="text-white" /></div>
          <h1 className="text-2xl font-bold tracking-tight">Crea il tuo account</h1>
          <p className="text-sm text-muted-foreground mt-1">Inizia il tuo percorso di apprendimento</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label className="text-xs font-medium">Nome completo</Label><Input placeholder="Mario Rossi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="mt-1.5 rounded-xl h-11" /></div>
          <div><Label className="text-xs font-medium">Email</Label><Input type="email" placeholder="nome@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="mt-1.5 rounded-xl h-11" /></div>
          <div><Label className="text-xs font-medium">Password</Label><Input type="password" placeholder="Min. 6 caratteri" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required className="mt-1.5 rounded-xl h-11" /></div>
          <div><Label className="text-xs font-medium">Ruolo</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="student">Studente</SelectItem><SelectItem value="instructor">Insegnante</SelectItem></SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full rounded-xl h-11 shadow-lg shadow-violet-200/50" disabled={loading}>{loading ? 'Registrazione...' : 'Crea account'}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">Hai gia un account? <button className="text-violet-600 font-semibold hover:underline" onClick={() => navigate('login')}>Accedi</button></p>
      </div>
    </div>
  );
}

// ==================== STUDENT DASHBOARD ====================
function StudentDashboard() {
  const { navigate, user } = useAuth();
  const [data, setData] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => { 
    Promise.all([
      api('/dashboard/student'),
      api('/student/certificates').catch(() => ({ certificates: [] }))
    ]).then(([dashData, certData]) => {
      setData(dashData);
      setCertificates(certData.certificates || []);
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={BookOpen} title="Errore" />;
  
  const inProgressCourses = data.enrolledCourses.filter(e => e.progress < 100);
  const completedCourses = data.enrolledCourses.filter(e => e.progress >= 100);
  const displayCourses = activeTab === 'all' ? data.enrolledCourses : activeTab === 'progress' ? inProgressCourses : completedCourses;
  
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header Banner */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 ring-4 ring-white/20">
              <AvatarFallback className="bg-[#002FA7] text-white text-2xl font-semibold">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
              <p className="text-white/60 text-sm">{user?.email}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {data.stats.totalCourses} corsi</span>
                <span className="flex items-center gap-1.5"><Award size={14} /> {certificates.length} certificati</span>
                <span className="flex items-center gap-1.5"><Zap size={14} /> {data.stats.totalXp || 0} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 -mt-16">
          <div className="bg-white rounded-sm border border-[#DEE2E6] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm bg-[#002FA7]/10 flex items-center justify-center">
                <BookOpen size={22} className="text-[#002FA7]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0A0A0A]">{data.stats.totalCourses}</p>
                <p className="text-xs text-[#868E96]">Corsi iscritti</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-sm border border-[#DEE2E6] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm bg-[#198754]/10 flex items-center justify-center">
                <CheckCircle size={22} className="text-[#198754]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0A0A0A]">{data.stats.completedCourses}</p>
                <p className="text-xs text-[#868E96]">Completati</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-sm border border-[#DEE2E6] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm bg-[#0DCAF0]/10 flex items-center justify-center">
                <Clock size={22} className="text-[#0DCAF0]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0A0A0A]">{data.stats.totalHours}</p>
                <p className="text-xs text-[#868E96]">Ore di studio</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-sm border border-[#DEE2E6] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm bg-[#FFC107]/10 flex items-center justify-center">
                <Award size={22} className="text-[#FFC107]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0A0A0A]">{certificates.length}</p>
                <p className="text-xs text-[#868E96]">Certificati</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Certificates Section */}
        {certificates.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">I tuoi certificati</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map(cert => (
                <div key={cert.id} className="bg-white rounded-sm border border-[#DEE2E6] p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-[#FFC107] to-[#FF8C00] flex items-center justify-center shrink-0">
                      <Award size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-[#0A0A0A] line-clamp-2">{cert.courseName}</h3>
                      <p className="text-xs text-[#868E96] mt-1">
                        Completato il {new Date(cert.issuedAt).toLocaleDateString('it-IT')}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="btn-primary rounded-sm h-8 text-xs" asChild>
                          <a href={cert.pdfUrl} download target="_blank">
                            <Download size={12} className="mr-1" /> Scarica
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Courses Tabs */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">I miei corsi</h2>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Tutti', count: data.enrolledCourses.length },
              { id: 'progress', label: 'In corso', count: inProgressCourses.length },
              { id: 'completed', label: 'Completati', count: completedCourses.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${activeTab === tab.id ? 'bg-[#0A0A0A] text-white' : 'bg-white border border-[#DEE2E6] text-[#495057] hover:bg-[#F1F3F5]'}`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
        
        {displayCourses.length === 0 ? (
          <EmptyState 
            icon={BookOpen} 
            title="Nessun corso in questa categoria" 
            description="Esplora il catalogo per trovare nuovi corsi!" 
            action={<Button className="btn-primary rounded-sm" onClick={() => navigate('catalog')}>Esplora catalogo</Button>} 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayCourses.map(e => (
              <div key={e.id} className="bg-white rounded-sm border border-[#DEE2E6] overflow-hidden card-lift group">
                <div className="relative h-36 bg-[#F1F3F5]">
                  {e.course?.coverImage ? (
                    <img src={e.course.coverImage} alt={e.course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#002FA7] to-[#0046FF] flex items-center justify-center">
                      <BookOpen size={32} className="text-white/30" />
                    </div>
                  )}
                  {/* Progress overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#DEE2E6]">
                    <div className="h-full bg-[#002FA7] transition-all" style={{ width: `${e.progress}%` }} />
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 text-[#0A0A0A] mb-2 group-hover:text-[#002FA7] transition-colors">{e.course?.title}</h3>
                  <p className="text-xs text-[#868E96] mb-3">{e.course?.instructorName}</p>
                  
                  <div className="flex items-center justify-between text-xs text-[#868E96] mb-3">
                    <span>{e.progress}% completato</span>
                    <span>{e.completedLessons?.length || 0}/{e.course?.totalLessons || 0} lezioni</span>
                  </div>
                  
                  {e.progress >= 100 ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 rounded-sm h-9 text-xs btn-primary" onClick={() => navigate('certificate', { courseId: e.courseId })}>
                        <Award size={14} className="mr-1" /> Certificato
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-sm h-9 text-xs" onClick={() => navigate('lesson', { courseId: e.courseId })}>
                        Rivedi
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full rounded-sm h-9 text-xs btn-primary" onClick={() => {
                      const firstIncomplete = e.course?.modules?.[0]?.lessons?.find(l => !e.completedLessons?.includes(l.id));
                      navigate('lesson', { courseId: e.courseId, lessonId: firstIncomplete?.id });
                    }}>
                      <Play size={14} className="mr-1" /> Continua
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-[#002FA7] to-[#0046FF] rounded-sm p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Vuoi imparare qualcosa di nuovo?</h3>
          <p className="text-white/70 mb-6">Esplora il nostro catalogo con centinaia di corsi su sviluppo, design, business e molto altro.</p>
          <Button size="lg" className="bg-white text-[#002FA7] hover:bg-white/90 rounded-sm h-12 px-8" onClick={() => navigate('catalog')}>
            Esplora il catalogo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== INSTRUCTOR DASHBOARD ====================
function InstructorDashboard() {
  const { navigate } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  
  const loadData = () => {
    setLoading(true);
    api('/instructor/dashboard').then(setData).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  };
  
  useEffect(() => { loadData(); }, []);
  
  const handleDelete = async (courseId) => {
    if (!confirm('Sei sicuro di voler eliminare questo corso?')) return;
    setDeleting(courseId);
    try {
      await api(`/instructor/courses/${courseId}`, { method: 'DELETE' });
      toast.success('Corso eliminato!');
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
    setDeleting(null);
  };
  
  const handleDuplicate = async (courseId) => {
    try {
      await api(`/instructor/courses/${courseId}/duplicate`, { method: 'POST' });
      toast.success('Corso duplicato!');
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  };
  
  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={BarChart3} title="Errore caricamento" />;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Insegnante</h1>
          <p className="text-muted-foreground text-sm">Gestisci i tuoi corsi e monitora le performance</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-violet-200/50" onClick={() => navigate('instructor-create-course')}>
          <Plus size={16} className="mr-1.5" /> Nuovo Corso
        </Button>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={BookOpen} label="Corsi Totali" value={data.stats?.totalCourses || 0} color="blue" />
        <StatCard icon={Users} label="Studenti" value={data.stats?.totalStudents || 0} color="violet" />
        <StatCard icon={DollarSign} label="Ricavi" value={`€${(data.stats?.totalRevenue || 0).toFixed(0)}`} color="green" />
        <StatCard icon={Star} label="Rating Medio" value={(data.stats?.avgRating || 0)} color="amber" />
      </div>
      
      {data.stats?.byStatus && (
        <div className="grid grid-cols-4 gap-3 mb-10">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{data.stats.byStatus.draft}</div>
            <div className="text-xs text-muted-foreground mt-1">Bozze</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{data.stats.byStatus.pending}</div>
            <div className="text-xs text-muted-foreground mt-1">In Revisione</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{data.stats.byStatus.published}</div>
            <div className="text-xs text-muted-foreground mt-1">Pubblicati</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{data.stats.byStatus.rejected}</div>
            <div className="text-xs text-muted-foreground mt-1">Rifiutati</div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold tracking-tight">I tuoi corsi</h2>
        {data.courses?.length > 0 && (
          <p className="text-sm text-muted-foreground">{data.courses.length} cors{data.courses.length === 1 ? 'o' : 'i'}</p>
        )}
      </div>
      
      {!data.courses || data.courses.length === 0 ? (
        <EmptyState 
          icon={BookOpen} 
          title="Nessun corso ancora" 
          description="Crea il tuo primo corso e inizia a insegnare"
          action={<Button className="rounded-xl" onClick={() => navigate('instructor-create-course')}><Plus size={14} className="mr-1" /> Crea il tuo primo corso</Button>} 
        />
      ) : (
        <div className="space-y-3">
          {data.courses.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 card-lift">
              <div className="flex items-start gap-4">
                {c.coverImage ? (
                  <img src={c.coverImage} alt={c.title} className="w-32 h-20 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className={`w-32 h-20 rounded-xl bg-gradient-to-br ${CAT_GRAD[c.category] || 'from-gray-400 to-gray-500'} shrink-0 flex items-center justify-center`}>
                    <BookOpen size={24} className="text-white/30" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{c.title}</h3>
                      {c.subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{c.subtitle}</p>}
                    </div>
                    <Badge variant={
                      c.status === 'published' ? 'default' : 
                      c.status === 'pending_review' ? 'secondary' :
                      c.status === 'rejected' ? 'destructive' : 'outline'
                    } className="rounded-full text-[10px] shrink-0">
                      {c.status === 'published' ? 'Pubblicato' : 
                       c.status === 'pending_review' ? 'In Revisione' :
                       c.status === 'rejected' ? 'Rifiutato' : 'Bozza'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {c.enrolledCount || 0} studenti
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {Math.floor((c.totalDuration || 0) / 60)} min
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {c.totalLessons || 0} lezioni
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" /> {(c.rating || 0).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-green-600">
                      €{(c.price || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="default" className="rounded-xl" onClick={() => navigate('instructor-edit-course', { id: c.id })}>
                      <Edit size={13} className="mr-1" /> Modifica
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate('course', { id: c.id })}>
                      <Eye size={13} className="mr-1" /> Anteprima
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleDuplicate(c.id)}>
                      <Copy size={13} className="mr-1" /> Duplica
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50" 
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                    >
                      <Trash2 size={13} className="mr-1" /> Elimina
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== CREATE COURSE ====================
function CreateCoursePage() {
  const { navigate } = useAuth();
  const [form, setForm] = useState({ title: '', shortDescription: '', description: '', category: '', level: 'beginner', price: '', language: 'it', tags: '', whatYouLearn: [''], requirements: [''], modules: [{ title: '', lessons: [{ title: '', type: 'text', content: '', duration: '' }] }] });
  const [cats, setCats] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiLoad, setAiLoad] = useState(false);

  useEffect(() => { api('/categories').then(d => setCats(d.categories || [])).catch(() => {}); }, []);
  const uf = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const addMod = () => setForm(p => ({ ...p, modules: [...p.modules, { title: '', lessons: [{ title: '', type: 'text', content: '', duration: '' }] }] }));
  const addLesson = (mi) => setForm(p => { const m = [...p.modules]; m[mi].lessons = [...m[mi].lessons, { title: '', type: 'text', content: '', duration: '' }]; return { ...p, modules: m }; });

  const genAI = async () => {
    if (!form.title) return toast.error('Inserisci un titolo');
    setAiLoad(true);
    try {
      const d = await api('/ai/course-structure', { method: 'POST', body: JSON.stringify({ topic: form.title, description: form.description }) });
      if (d.result?.modules) setForm(f => ({ ...f, modules: d.result.modules.map(m => ({ title: m.title, lessons: (m.lessons || []).map(l => ({ title: typeof l === 'string' ? l : l.title, type: 'text', content: '', duration: '' })) })) }));
      toast.success('Struttura generata!'); if (d.note) toast.info(d.note);
    } catch (e) { toast.error(e.message); }
    setAiLoad(false);
  };

  const submit = async () => {
    if (!form.title || !form.description || !form.category) return toast.error('Compila i campi obbligatori');
    setSaving(true);
    try {
      await api('/courses', { method: 'POST', body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), whatYouLearn: form.whatYouLearn.filter(Boolean), requirements: form.requirements.filter(Boolean), modules: form.modules.filter(m => m.title).map(m => ({ ...m, lessons: m.lessons.filter(l => l.title).map(l => ({ ...l, duration: parseInt(l.duration) || 0 })) })) }) });
      toast.success('Corso creato!'); navigate('instructor-dashboard');
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <button onClick={() => navigate('instructor-dashboard')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"><ChevronLeft size={14} /> Dashboard</button>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Crea un nuovo corso</h1>
      <p className="text-muted-foreground text-sm mb-8">Compila le informazioni del tuo corso</p>
      <div className="space-y-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="font-semibold">Informazioni base</h3>
          <div><Label className="text-xs font-medium">Titolo *</Label><Input placeholder="es. React e Next.js: Guida Completa" value={form.title} onChange={e => uf('title', e.target.value)} className="mt-1.5 rounded-xl" /></div>
          <div><Label className="text-xs font-medium">Breve descrizione</Label><Input placeholder="Una riga..." value={form.shortDescription} onChange={e => uf('shortDescription', e.target.value)} className="mt-1.5 rounded-xl" /></div>
          <div><Label className="text-xs font-medium">Descrizione *</Label><Textarea placeholder="Descrizione dettagliata..." value={form.description} onChange={e => uf('description', e.target.value)} rows={4} className="mt-1.5 rounded-xl" /></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label className="text-xs font-medium">Categoria *</Label><Select value={form.category} onValueChange={v => uf('category', v)}><SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Seleziona" /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.slug}>{c.icon} {c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs font-medium">Livello</Label><Select value={form.level} onValueChange={v => uf('level', v)}><SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">Principiante</SelectItem><SelectItem value="intermediate">Intermedio</SelectItem><SelectItem value="advanced">Avanzato</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs font-medium">Lingua</Label><Select value={form.language} onValueChange={v => uf('language', v)}><SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="max-h-64">{ALL_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs font-medium">Prezzo (€)</Label><Input type="number" placeholder="0 = Gratis" value={form.price} onChange={e => uf('price', e.target.value)} className="mt-1.5 rounded-xl" /></div>
          </div>
          <div><Label className="text-xs font-medium">Tag</Label><Input placeholder="react, javascript, web" value={form.tags} onChange={e => uf('tags', e.target.value)} className="mt-1.5 rounded-xl" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <h3 className="font-semibold">Cosa impareranno</h3>
          {form.whatYouLearn.map((x, i) => <div key={i} className="flex gap-2"><Input placeholder="es. Costruire app React" value={x} onChange={e => { const a = [...form.whatYouLearn]; a[i] = e.target.value; uf('whatYouLearn', a); }} className="rounded-xl" /><Button variant="ghost" size="icon" className="shrink-0" onClick={() => uf('whatYouLearn', form.whatYouLearn.filter((_, j) => j !== i))}><Trash2 size={14} /></Button></div>)}
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => uf('whatYouLearn', [...form.whatYouLearn, ''])}><Plus size={14} className="mr-1" /> Aggiungi</Button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Moduli e Lezioni</h3>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={genAI} disabled={aiLoad}><Sparkles size={14} className="mr-1" /> {aiLoad ? 'Generazione...' : 'Genera con AI'}</Button>
          </div>
          {form.modules.map((mod, mi) => (
            <div key={mi} className="border border-dashed border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="rounded-full text-[10px]">Modulo {mi + 1}</Badge>
                <Input placeholder="Titolo modulo" value={mod.title} onChange={e => { const m = [...form.modules]; m[mi] = { ...m[mi], title: e.target.value }; uf('modules', m); }} className="rounded-xl" />
                <Button variant="ghost" size="icon" className="shrink-0 text-red-400" onClick={() => uf('modules', form.modules.filter((_, i) => i !== mi))}><Trash2 size={14} /></Button>
              </div>
              <div className="space-y-2 ml-4">
                {mod.lessons.map((l, li) => (
                  <div key={li} className="flex gap-2">
                    <Input placeholder="Titolo lezione" value={l.title} onChange={e => { const m = JSON.parse(JSON.stringify(form.modules)); m[mi].lessons[li].title = e.target.value; uf('modules', m); }} className="rounded-xl flex-1" />
                    <Input type="number" placeholder="Sec" value={l.duration} onChange={e => { const m = JSON.parse(JSON.stringify(form.modules)); m[mi].lessons[li].duration = e.target.value; uf('modules', m); }} className="rounded-xl w-20" />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { const m = [...form.modules]; m[mi].lessons = m[mi].lessons.filter((_, i) => i !== li); uf('modules', m); }}><X size={14} /></Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => addLesson(mi)}><Plus size={12} className="mr-1" /> Lezione</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="rounded-xl" onClick={addMod}><Plus size={14} className="mr-1" /> Modulo</Button>
        </div>

        <div className="flex gap-3">
          <Button size="lg" className="flex-1 rounded-xl h-12 shadow-lg shadow-violet-200/50" onClick={submit} disabled={saving}>{saving ? 'Salvataggio...' : 'Crea Corso'}</Button>
          <Button size="lg" variant="outline" className="rounded-xl h-12" onClick={() => navigate('instructor-dashboard')}>Annulla</Button>
        </div>
      </div>
    </div>
  );
}

// ==================== ADMIN DASHBOARD (FULL PANEL - preserved) ====================
function AdminDashboard() {
  const { navigate, user } = useAuth();
  const [section, setSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  if (user?.role !== 'admin') return <EmptyState icon={ShieldCheck} title="Accesso negato" description="Solo amministratori." action={<Button className="rounded-xl" onClick={() => navigate('home')}>Home</Button>} />;
  const menu = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Utenti', icon: Users },
    { id: 'courses', label: 'Corsi', icon: BookOpen },
    { id: 'categories', label: 'Categorie', icon: Tag },
    { id: 'reviews', label: 'Recensioni', icon: Star },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'payments', label: 'Pagamenti', icon: CreditCard },
  ];
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-gray-950 text-white transition-all duration-300 flex flex-col shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800/50">
          {sidebarOpen && <div className="flex items-center gap-2"><Shield size={16} className="text-violet-400" /><span className="font-semibold text-sm">Admin</span></div>}
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={16} /></Button>
        </div>
        <nav className="flex-1 py-3">{menu.map(i => (
          <button key={i.id} onClick={() => setSection(i.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${section === i.id ? 'bg-violet-600/15 text-violet-400 border-r-2 border-violet-400' : 'text-gray-500 hover:text-white hover:bg-gray-800/50'}`}><i.icon size={16} className="shrink-0" />{sidebarOpen && <span>{i.label}</span>}</button>
        ))}</nav>
        {sidebarOpen && <div className="p-4 border-t border-gray-800/50"><div className="flex items-center gap-2"><Avatar className="w-7 h-7"><AvatarFallback className="bg-violet-600 text-white text-[10px]">{user?.name?.[0]}</AvatarFallback></Avatar><div className="min-w-0"><p className="text-xs font-medium truncate">{user?.name}</p><p className="text-[10px] text-gray-600">Amministratore</p></div></div></div>}
      </aside>
      <main className="flex-1 bg-gray-50/50 overflow-auto"><div className="p-6 max-w-7xl">
        {section === 'overview' && <AdminOverviewSection />}
        {section === 'users' && <AdminUsersSection />}
        {section === 'courses' && <AdminCoursesSection />}
        {section === 'categories' && <AdminCategoriesSection />}
        {section === 'reviews' && <AdminReviewsSection />}
        {section === 'analytics' && <AdminAnalyticsSection />}
        {section === 'payments' && <AdminPaymentsSection />}
      </div></main>
    </div>
  );
}

function AdminOverviewSection() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([api('/dashboard/admin').then(setData), api('/admin/analytics').then(setAnalytics)]).catch(e => toast.error(e.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={AlertCircle} title="Errore" />;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Dashboard</h1><p className="text-muted-foreground text-sm mb-6">Panoramica piattaforma</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Utenti" value={data.stats.totalUsers} color="violet" />
        <StatCard icon={BookOpen} label="Corsi" value={data.stats.publishedCourses} color="blue" />
        <StatCard icon={GraduationCap} label="Iscrizioni" value={data.stats.totalEnrollments} color="green" />
        <StatCard icon={DollarSign} label="Ricavi" value={`€${data.stats.totalRevenue}`} color="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Ricavi Mensili</h3>
          <ResponsiveContainer width="100%" height={200}><AreaChart data={analytics?.monthlyRevenue || []}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><RTooltip /><Area type="monotone" dataKey="revenue" fill="#7c3aed15" stroke="#7c3aed" strokeWidth={2} name="€" /></AreaChart></ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Distribuzione Utenti</h3>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={analytics?.userDistribution || []} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{(analytics?.userDistribution || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie><RTooltip /></PieChart></ResponsiveContainer>
        </div>
      </div>
      {data.pendingCourses?.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8"><h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500" />Corsi in attesa ({data.pendingCourses.length})</h3>
        <div className="space-y-2">{data.pendingCourses.map(c => <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100/50"><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.title}</p><p className="text-xs text-muted-foreground">{c.instructorName}</p></div>
          <Button size="sm" className="h-7 text-xs rounded-lg" onClick={async () => { await api(`/admin/courses/${c.id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'published' }) }); toast.success('Approvato!'); setData(await api('/dashboard/admin')); }}><Check size={12} className="mr-1" />Approva</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={async () => { await api(`/admin/courses/${c.id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'rejected' }) }); toast.success('Rifiutato'); setData(await api('/dashboard/admin')); }}><X size={12} /></Button>
        </div>)}</div>
      </div>}
      {analytics?.topCourses?.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Top Corsi</h3>
        <ResponsiveContainer width="100%" height={180}><BarChart data={analytics.topCourses} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="title" width={170} tick={{ fontSize: 10 }} /><RTooltip /><Bar dataKey="students" fill="#7c3aed" radius={[0, 6, 6, 0]} name="Studenti" /></BarChart></ResponsiveContainer>
      </div>}
    </div>
  );
}

function AdminUsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState('');
  const fetch_ = useCallback(async () => { setLoading(true); try { const p = new URLSearchParams(); if (search) p.set('search', search); p.set('limit', '50'); setUsers((await api(`/admin/users?${p}`)).users || []); } catch (e) { toast.error(e.message); } setLoading(false); }, [search]);
  useEffect(() => { fetch_(); }, [fetch_]);
  const filtered = roleF ? users.filter(u => u.role === roleF) : users;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Gestione Utenti</h1><p className="text-muted-foreground text-sm mb-6">{users.length} utenti</p>
      <div className="flex gap-3 mb-5"><div className="relative flex-1 max-w-sm"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" /></div>
        <Select value={roleF} onValueChange={v => setRoleF(v === 'all' ? '' : v)}><SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Tutti" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem><SelectItem value="student">Studenti</SelectItem><SelectItem value="instructor">Insegnanti</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
        <Button variant="outline" size="icon" className="rounded-xl" onClick={fetch_}><RefreshCw size={14} /></Button>
      </div>
      {loading ? <LoadingSpinner /> : <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"><table className="w-full"><thead><tr className="border-b bg-gray-50/50"><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Utente</th><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Email</th><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Ruolo</th><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">XP</th><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Stato</th><th className="text-right p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Azioni</th></tr></thead>
        <tbody>{filtered.map(u => <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"><td className="p-3.5"><div className="flex items-center gap-2.5"><Avatar className="w-8 h-8"><AvatarFallback className="text-[10px] bg-violet-50 text-violet-700">{u.name?.[0]}</AvatarFallback></Avatar><span className="text-sm font-medium">{u.name}</span></div></td><td className="p-3.5 text-sm text-muted-foreground">{u.email}</td><td className="p-3.5"><Select value={u.role} onValueChange={async v => { await api(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ role: v }) }); toast.success('Aggiornato'); fetch_(); }}><SelectTrigger className="w-28 h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Studente</SelectItem><SelectItem value="instructor">Insegnante</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></td><td className="p-3.5"><Badge variant="outline" className="text-[10px] rounded-full">{u.xp || 0}</Badge></td><td className="p-3.5">{u.suspended ? <Badge variant="destructive" className="text-[10px] rounded-full">Sospeso</Badge> : <Badge className="bg-emerald-50 text-emerald-700 text-[10px] rounded-full border-emerald-200">Attivo</Badge>}</td><td className="p-3.5 text-right"><Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={async () => { await api(`/admin/users/${u.id}/suspend`, { method: 'PUT' }); toast.success('Aggiornato'); fetch_(); }}>{u.suspended ? <UserCheck size={13} className="mr-1" /> : <UserX size={13} className="mr-1" />}{u.suspended ? 'Riattiva' : 'Sospendi'}</Button></td></tr>)}</tbody></table></div>}
    </div>
  );
}

function AdminCoursesSection() {
  const { navigate } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [cats, setCats] = useState([]);
  const [catF, setCatF] = useState('');
  const [editC, setEditC] = useState(null);
  const [editF, setEditF] = useState({});
  const fetch_ = useCallback(async () => { setLoading(true); try { const p = new URLSearchParams(); if (search) p.set('search', search); if (statusF) p.set('status', statusF); if (catF) p.set('category', catF); p.set('limit', '50'); setCourses((await api(`/admin/courses?${p}`)).courses || []); } catch (e) { toast.error(e.message); } setLoading(false); }, [search, statusF, catF]);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { api('/categories').then(d => setCats(d.categories || [])).catch(() => {}); }, []);
  const stBadge = (s) => s === 'published' ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] rounded-full">Pubblicato</Badge> : s === 'pending' ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] rounded-full">In attesa</Badge> : <Badge variant="destructive" className="text-[10px] rounded-full">Rifiutato</Badge>;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Gestione Corsi</h1><p className="text-muted-foreground text-sm mb-6">{courses.length} corsi</p>
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" /></div>
        <Select value={statusF} onValueChange={v => setStatusF(v === 'all' ? '' : v)}><SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="Stato" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem><SelectItem value="published">Pubblicati</SelectItem><SelectItem value="pending">In attesa</SelectItem><SelectItem value="rejected">Rifiutati</SelectItem></SelectContent></Select>
        <Select value={catF} onValueChange={v => setCatF(v === 'all' ? '' : v)}><SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte</SelectItem>{cats.map(c => <SelectItem key={c.id} value={c.slug}>{c.icon} {c.name}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading ? <LoadingSpinner /> : <div className="space-y-3">{courses.map(c => <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 card-lift">
        <div className={`w-14 h-10 rounded-xl bg-gradient-to-br ${CAT_GRAD[c.category] || 'from-gray-400 to-gray-500'} shrink-0 flex items-center justify-center`}><BookOpen size={14} className="text-white/30" /></div>
        <div className="flex-1 min-w-0"><h3 className="text-sm font-semibold truncate">{c.title}</h3><p className="text-[11px] text-muted-foreground">{c.instructorName} - €{c.price?.toFixed(2)} - {c.totalStudents || 0} st.</p></div>
        <div className="flex items-center gap-2 shrink-0">{stBadge(c.status)}
          {c.status === 'pending' && <><Button size="sm" className="h-7 text-xs rounded-lg" onClick={async () => { await api(`/admin/courses/${c.id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'published' }) }); toast.success('Approvato!'); fetch_(); }}><Check size={12} /></Button><Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={async () => { await api(`/admin/courses/${c.id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'rejected' }) }); toast.success('Rifiutato'); fetch_(); }}><X size={12} /></Button></>}
          <Button size="sm" variant="ghost" className="h-7 rounded-lg" onClick={() => { setEditC(c); setEditF({ title: c.title, price: c.price, level: c.level, status: c.status }); }}><Edit size={13} /></Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-lg text-red-400" onClick={async () => { if (!confirm('Eliminare?')) return; await api(`/admin/courses/${c.id}`, { method: 'DELETE' }); toast.success('Eliminato'); fetch_(); }}><Trash2 size={13} /></Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-lg" onClick={() => navigate('course', { id: c.id })}><Eye size={13} /></Button>
        </div>
      </div>)}</div>}
      {editC && <Dialog open={!!editC} onOpenChange={() => setEditC(null)}><DialogContent className="max-w-md rounded-2xl"><DialogHeader><DialogTitle>Modifica Corso</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="text-xs">Titolo</Label><Input value={editF.title || ''} onChange={e => setEditF(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
        <div><Label className="text-xs">Prezzo</Label><Input type="number" value={editF.price || 0} onChange={e => setEditF(f => ({ ...f, price: parseFloat(e.target.value) }))} className="mt-1.5 rounded-xl" /></div>
        <div><Label className="text-xs">Stato</Label><Select value={editF.status} onValueChange={v => setEditF(f => ({ ...f, status: v }))}><SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="published">Pubblicato</SelectItem><SelectItem value="pending">In attesa</SelectItem><SelectItem value="rejected">Rifiutato</SelectItem></SelectContent></Select></div>
        <div className="flex gap-2"><Button className="flex-1 rounded-xl" onClick={async () => { await api(`/admin/courses/${editC.id}`, { method: 'PUT', body: JSON.stringify(editF) }); toast.success('Aggiornato'); setEditC(null); fetch_(); }}>Salva</Button><Button variant="outline" className="rounded-xl" onClick={() => setEditC(null)}>Annulla</Button></div>
      </div></DialogContent></Dialog>}
    </div>
  );
}

function AdminCategoriesSection() {
  return <div className="p-6"><h3 className="text-lg font-semibold">Gestione Categorie</h3><p className="text-sm text-muted-foreground">Sezione in sviluppo</p></div>;
}

function InstructorCreateCoursePage() {
  const { navigate } = useAuth();
  
  return <CompleteCourseEditor initialCourse={null} onBack={() => navigate('instructor-dashboard')} />;
}

// ==================== INSTRUCTOR EDIT COURSE (NEW) ====================
function InstructorEditCoursePage() {
  const { navigate, viewData } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const courseId = viewData?.id;
  
  useEffect(() => {
    if (!courseId) {
      navigate('instructor-dashboard');
      return;
    }
    
    api(`/courses/${courseId}`)
      .then(data => setCourse(data.course))
      .catch(e => {
        toast.error(e.message);
        navigate('instructor-dashboard');
      })
      .finally(() => setLoading(false));
  }, [courseId]);
  
  if (loading) return <LoadingSpinner />;
  if (!course) return null;
  
  return <CompleteCourseEditor initialCourse={course} onBack={() => navigate('instructor-dashboard')} />;
}

// ==================== CERTIFICATE PAGE ====================
function CertificatePage() {
  const { navigate, viewData, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const courseId = viewData?.courseId;
  
  useEffect(() => {
    if (!courseId || !user) {
      navigate('home');
      return;
    }
    
    // Carica dati corso e certificato esistente
    Promise.all([
      api(`/courses/${courseId}`),
      api(`/student/courses/${courseId}/certificate`).catch(() => null)
    ]).then(([courseData, certData]) => {
      setData({ ...courseData, certificate: certData?.certificate });
    }).catch(e => {
      toast.error(e.message);
      navigate('home');
    }).finally(() => setLoading(false));
  }, [courseId, user]);
  
  const generateCertificate = async () => {
    setGenerating(true);
    try {
      const result = await api('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify({ courseId })
      });
      setData(prev => ({ ...prev, certificate: result.certificate }));
      toast.success('Certificato generato con successo!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };
  
  const downloadCertificate = () => {
    if (data?.certificate?.pdfUrl) {
      window.open(data.certificate.pdfUrl, '_blank');
    }
  };
  
  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={Award} title="Errore" />;
  
  const progress = data.enrollment?.progress || 0;
  const isCompleted = progress === 100;
  
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('course', { id: courseId })} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto mb-6 transition-colors">
            <ChevronLeft size={14} /> Torna al corso
          </button>
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-200/50">
            <Award size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Certificato di Completamento</h1>
          <p className="text-muted-foreground">{data.course?.title}</p>
        </div>
        
        {/* Progress Card */}
        <Card className="mb-8 overflow-hidden">
          <div className={`h-2 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-violet-400 to-violet-500'}`} style={{ width: `${progress}%` }} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso corso</p>
                <p className="text-3xl font-bold">{progress}%</p>
              </div>
              {isCompleted ? (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                  <BookOpen size={32} className="text-violet-600" />
                </div>
              )}
            </div>
            <Progress value={progress} className="h-3 rounded-full" />
            
            {!isCompleted && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Corso non ancora completato</p>
                  <p className="text-sm text-amber-700">Completa tutte le lezioni per sbloccare il certificato. Mancano {100 - progress}% delle lezioni.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Certificate Preview / Generate */}
        {isCompleted && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                Il tuo Attestato
              </CardTitle>
              <CardDescription>
                {data.certificate ? 'Il tuo certificato è pronto per il download' : 'Genera il tuo certificato di completamento'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {data.certificate ? (
                <div className="space-y-6">
                  {/* Certificate Preview */}
                  <div className="aspect-[1.414/1] bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border-2 border-violet-200 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-violet-300" />
                      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-violet-300" />
                    </div>
                    
                    <div className="text-center relative z-10 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                        <GraduationCap size={24} className="text-white" />
                      </div>
                      <p className="text-xs text-violet-600 font-semibold uppercase tracking-widest mb-2">LearnHub</p>
                      <h2 className="text-lg font-bold text-gray-800 mb-1">Attestato di Fine Frequenza</h2>
                      <p className="text-sm text-gray-500 mb-4">Questo certifica che</p>
                      <p className="text-2xl font-bold text-gray-900 mb-2">{user?.name}</p>
                      <p className="text-sm text-gray-500 mb-2">ha completato con successo il corso</p>
                      <p className={`font-semibold text-violet-700 mb-4 leading-tight ${(data.course?.title?.length || 0) > 50 ? 'text-sm' : (data.course?.title?.length || 0) > 30 ? 'text-base' : 'text-lg'}`}>
                        {data.course?.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        Data: {new Date(data.certificate.issuedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Codice: {data.certificate.code}</p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button className="flex-1 rounded-xl h-12" onClick={downloadCertificate} data-testid="download-certificate-btn">
                      <Download size={18} className="mr-2" />
                      Scarica PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl h-12" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/verify/${data.certificate.code}`);
                      toast.success('Link di verifica copiato!');
                    }}>
                      <Copy size={18} className="mr-2" />
                      Copia link
                    </Button>
                  </div>
                  
                  {/* Certificate Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Rilasciato il</p>
                      <p className="text-sm font-medium">{new Date(data.certificate.issuedAt).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Codice certificato</p>
                      <p className="text-sm font-medium font-mono">{data.certificate.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Insegnante</p>
                      <p className="text-sm font-medium">{data.course?.instructorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durata corso</p>
                      <p className="text-sm font-medium">{data.course?.totalLessons || 0} lezioni</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-6">
                    <Award size={40} className="text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Congratulazioni!</h3>
                  <p className="text-muted-foreground mb-6">Hai completato il corso. Genera il tuo certificato ufficiale!</p>
                  <Button 
                    size="lg" 
                    className="rounded-xl h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    onClick={generateCertificate}
                    disabled={generating}
                    data-testid="generate-certificate-btn"
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={20} className="mr-2 animate-spin" />
                        Generazione in corso...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} className="mr-2" />
                        Genera il tuo Certificato
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Back to course button */}
        {!isCompleted && (
          <div className="text-center mt-8">
            <Button size="lg" className="rounded-xl h-12" onClick={() => navigate('lesson', { courseId, lessonId: data.modules?.[0]?.lessons?.[0]?.id })}>
              <Play size={18} className="mr-2" />
              Continua il corso
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminReviewsSection() {
  return <div className="p-6"><h3 className="text-lg font-semibold">Gestione Recensioni</h3><p className="text-sm text-muted-foreground">Sezione in sviluppo</p></div>;
}

function AdminAnalyticsSection() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/admin/analytics').then(setD).catch(e => toast.error(e.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  if (!d) return <EmptyState icon={BarChart3} title="Errore" />;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Analytics</h1><p className="text-muted-foreground text-sm mb-6">Metriche dettagliate</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Ricavi totali" value={`€${d.totals.totalRevenue}`} color="green" />
        <StatCard icon={CreditCard} label="Fee piattaforma" value={`€${d.totals.platformFee}`} color="violet" />
        <StatCard icon={Users} label="Utenti" value={d.totals.totalUsers} color="blue" />
        <StatCard icon={GraduationCap} label="Iscrizioni" value={d.totals.totalEnrollments} color="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Registrazioni (30gg)</h3><ResponsiveContainer width="100%" height={220}><AreaChart data={d.dailyRegistrations}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} /><YAxis tick={{ fontSize: 11 }} /><RTooltip /><Area type="monotone" dataKey="count" fill="#7c3aed15" stroke="#7c3aed" strokeWidth={2} name="Registrazioni" /></AreaChart></ResponsiveContainer></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Iscrizioni (30gg)</h3><ResponsiveContainer width="100%" height={220}><AreaChart data={d.dailyEnrollments}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} /><YAxis tick={{ fontSize: 11 }} /><RTooltip /><Area type="monotone" dataKey="count" fill="#10b98115" stroke="#10b981" strokeWidth={2} name="Iscrizioni" /></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Ricavi Mensili</h3><ResponsiveContainer width="100%" height={220}><BarChart data={d.monthlyRevenue}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis yAxisId="l" tick={{ fontSize: 11 }} /><YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} /><RTooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar yAxisId="l" dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} name="€" /><Bar yAxisId="r" dataKey="enrollments" fill="#2563eb" radius={[6, 6, 0, 0]} name="Iscrizioni" /></BarChart></ResponsiveContainer></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Stato Corsi</h3><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={d.courseDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{d.courseDistribution.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i]} />)}</Pie><RTooltip /></PieChart></ResponsiveContainer></div>
      </div>
      {d.categoryDistribution?.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8"><h3 className="font-semibold text-sm mb-3">Corsi per Categoria</h3><ResponsiveContainer width="100%" height={180}><BarChart data={d.categoryDistribution}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><RTooltip /><Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}
      <div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-semibold text-sm mb-3">Esporta Report</h3><div className="flex gap-3 flex-wrap">{['summary', 'users', 'courses', 'enrollments'].map(t => <Button key={t} variant="outline" size="sm" className="rounded-xl" onClick={async () => { const d = await api(`/admin/reports?type=${t}`); const b = new Blob([JSON.stringify(d.report, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${t}_${new Date().toISOString().split('T')[0]}.json`; a.click(); toast.success('Scaricato!'); }}><Download size={13} className="mr-1.5" />{t === 'summary' ? 'Riepilogo' : t === 'users' ? 'Utenti' : t === 'courses' ? 'Corsi' : 'Iscrizioni'}</Button>)}</div></div>
    </div>
  );
}

function AdminPaymentsSection() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/admin/payments?limit=50').then(d => setPayments(d.payments || [])).catch(e => toast.error(e.message)).finally(() => setLoading(false)); }, []);
  const t = payments.reduce((a, p) => ({ amt: a.amt + p.amount, fee: a.fee + p.platformFee, pay: a.pay + p.instructorPayout }), { amt: 0, fee: 0, pay: 0 });
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Pagamenti</h1><p className="text-muted-foreground text-sm mb-6">Storico transazioni</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><StatCard icon={DollarSign} label="Totale" value={`€${t.amt.toFixed(2)}`} color="green" /><StatCard icon={CreditCard} label="Fee" value={`€${t.fee.toFixed(2)}`} color="violet" /><StatCard icon={TrendingUp} label="Payout" value={`€${t.pay.toFixed(2)}`} color="blue" /></div>
      <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-3 flex items-center gap-2 text-amber-700 mb-6"><AlertTriangle size={14} /><p className="text-xs">Demo mode. Configura Stripe in .env per pagamenti reali.</p></div>
      {loading ? <LoadingSpinner /> : payments.length === 0 ? <EmptyState icon={CreditCard} title="Nessuna transazione" /> : <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"><table className="w-full"><thead><tr className="border-b bg-gray-50/50"><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Data</th><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Studente</th><th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Corso</th><th className="text-right p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Importo</th><th className="text-right p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Fee</th><th className="text-center p-3.5 text-[11px] font-semibold text-muted-foreground uppercase">Stato</th></tr></thead>
        <tbody>{payments.map(p => <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="p-3.5 text-xs">{p.date ? new Date(p.date).toLocaleDateString('it-IT') : '-'}</td><td className="p-3.5 text-sm font-medium">{p.userName}</td><td className="p-3.5 text-sm max-w-48 truncate">{p.courseName}</td><td className="p-3.5 text-sm text-right font-medium">€{p.amount?.toFixed(2)}</td><td className="p-3.5 text-sm text-right text-violet-600">€{p.platformFee?.toFixed(2)}</td><td className="p-3.5 text-center"><Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] rounded-full">OK</Badge></td></tr>)}</tbody></table></div>}
    </div>
  );
}

// ==================== COMMUNITY ====================
function CommunityPage() {
  const { user, navigate } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [sel, setSel] = useState(null);
  const [comments, setComments] = useState([]);
  const [cText, setCText] = useState('');

  useEffect(() => { api('/community/posts').then(d => setPosts(d.posts || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (sel) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <button onClick={() => setSel(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"><ChevronLeft size={14} /> Forum</button>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h1 className="text-xl font-bold tracking-tight mb-3">{sel.title}</h1>
        <div className="flex items-center gap-2 mb-4"><Avatar className="w-6 h-6"><AvatarFallback className="text-[10px]">{sel.userName?.[0]}</AvatarFallback></Avatar><span className="text-sm font-medium">{sel.userName}</span><span className="text-xs text-muted-foreground">{new Date(sel.createdAt).toLocaleDateString('it-IT')}</span></div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{sel.content}</p>
        <div className="flex items-center gap-4 mt-5 pt-4 border-t">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={async () => { if (!user) return navigate('login'); const d = await api(`/community/posts/${sel.id}/upvote`, { method: 'POST' }); setSel(d.post); setPosts(p => p.map(x => x.id === sel.id ? d.post : x)); }}>
            <ThumbsUp size={14} className={`mr-1.5 ${sel.upvotedBy?.includes(user?.id) ? 'fill-violet-600 text-violet-600' : ''}`} />{sel.upvotes || 0}
          </Button>
          <span className="text-sm text-muted-foreground"><MessageSquare size={14} className="inline mr-1" />{comments.length}</span>
        </div>
      </div>
      <h3 className="font-semibold text-sm mb-4">Commenti</h3>
      <div className="space-y-3 mb-6">{comments.map(c => <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4"><div className="flex items-center gap-2 mb-1.5"><Avatar className="w-6 h-6"><AvatarFallback className="text-[10px]">{c.userName?.[0]}</AvatarFallback></Avatar><span className="text-sm font-medium">{c.userName}</span></div><p className="text-sm text-muted-foreground ml-8">{c.content}</p></div>)}</div>
      {user && <div className="flex gap-3"><Textarea placeholder="Commenta..." value={cText} onChange={e => setCText(e.target.value)} className="flex-1 rounded-xl" /><Button className="rounded-xl" onClick={async () => { if (!cText.trim()) return; const d = await api(`/community/posts/${sel.id}/comments`, { method: 'POST', body: JSON.stringify({ content: cText }) }); setComments(c => [...c, d.comment]); setCText(''); toast.success('Aggiunto!'); }}>Invia</Button></div>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8"><div><h1 className="text-2xl font-bold tracking-tight">Community</h1><p className="text-muted-foreground text-sm">Discuti e condividi</p></div>{user && <Button className="rounded-xl" onClick={() => setShowForm(!showForm)}><Plus size={14} className="mr-1" /> Nuovo</Button>}</div>
      {showForm && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 space-y-3"><Input placeholder="Titolo" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" /><Textarea placeholder="Messaggio..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="rounded-xl" /><div className="flex gap-2"><Button className="rounded-xl" onClick={async () => { if (!form.title || !form.content) return toast.error('Compila tutto'); const d = await api('/community/posts', { method: 'POST', body: JSON.stringify(form) }); setPosts(p => [d.post, ...p]); setForm({ title: '', content: '' }); setShowForm(false); toast.success('Pubblicato!'); }}>Pubblica</Button><Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Annulla</Button></div></div>}
      {loading ? <LoadingSpinner /> : posts.length === 0 ? <EmptyState icon={MessageSquare} title="Nessun post" description="Inizia la conversazione!" /> : <div className="space-y-3">{posts.map(p => <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer card-lift" onClick={async () => { const d = await api(`/community/posts/${p.id}`); setSel(d.post); setComments(d.comments || []); }}>
        <h3 className="font-semibold text-sm mb-1">{p.title}</h3><p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.content}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Avatar className="w-4 h-4"><AvatarFallback className="text-[7px]">{p.userName?.[0]}</AvatarFallback></Avatar>{p.userName}</span><span><ThumbsUp size={11} className="inline mr-0.5" />{p.upvotes || 0}</span><span><MessageSquare size={11} className="inline mr-0.5" />{p.commentCount || 0}</span></div>
      </div>)}</div>}
    </div>
  );
}

// ==================== PROFILE ====================
function ProfilePage() {
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/gamification/profile').then(setP).catch(e => toast.error(e.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  if (!p) return <EmptyState icon={Trophy} title="Errore" />;
  const pct = p.nextLevelXp > 0 ? Math.min(100, (p.xp / p.nextLevelXp) * 100) : 100;
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mb-6">
        <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-violet-100"><AvatarFallback className="text-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">{user?.name?.[0]}</AvatarFallback></Avatar>
        <h1 className="text-xl font-bold">{user?.name}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <div className="mt-5 p-5 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl">
          <div className="flex items-center justify-center gap-2 mb-2"><Trophy size={20} className="text-violet-600" /><span className="text-lg font-bold text-violet-700">Lv.{p.level} {p.levelName}</span></div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5"><span>{p.xp} XP</span><span>{p.nextLevelXp} XP</span></div>
          <Progress value={pct} className="h-2 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard icon={BookOpen} label="Iscritti" value={p.stats.coursesEnrolled} color="violet" />
        <StatCard icon={CheckCircle} label="Completati" value={p.stats.coursesCompleted} color="green" />
        <StatCard icon={Star} label="Recensioni" value={p.stats.reviewsWritten} color="amber" />
        <StatCard icon={MessageSquare} label="Post" value={p.stats.forumPosts} color="blue" />
      </div>
      {p.badges?.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 p-6"><h3 className="font-semibold text-sm mb-4">I tuoi Badge</h3><div className="grid grid-cols-2 gap-3">{p.badges.map((b, i) => <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><span className="text-2xl">{b.icon}</span><div><p className="font-medium text-sm">{b.name}</p><p className="text-[11px] text-muted-foreground">{b.description}</p></div></div>)}</div></div>}
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

function AppContent() {
  const { view, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 animate-pulse shadow-lg shadow-violet-200/50"><GraduationCap size={18} className="text-white" /></div><p className="text-sm text-muted-foreground">Caricamento...</p></div></div>;
  const V = { 
    home: HomePage, 
    catalog: CatalogPage, 
    course: CourseDetailPage, 
    lesson: LessonPage, 
    login: LoginPage, 
    register: RegisterPage, 
    'student-dashboard': StudentDashboard, 
    'instructor-dashboard': InstructorDashboard,
    'instructor-create-course': InstructorCreateCoursePage,
    'instructor-edit-course': InstructorEditCoursePage,
    'create-course': CreateCoursePage, 
    'admin-dashboard': AdminDashboard, 
    community: CommunityPage, 
    profile: ProfilePage,
    certificate: CertificatePage
  };
  const Comp = V[view] || HomePage;
  return <div className="min-h-screen bg-[#fafafa]"><Navigation /><Comp /></div>;
}
