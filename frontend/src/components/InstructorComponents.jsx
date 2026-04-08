
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Eye, Save, Send, Copy, ChevronRight, Video, FileText, File, GripVertical, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// Helper per ottenere token
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('lh_token') : null;

// Helper API
const api = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.error || `Errore ${res.status}`);
  }
  
  return res.json();
};

// ==================== COURSE EDITOR COMPONENT ====================
export function CourseEditor({ course, onSave, onBack }) {
  const [formData, setFormData] = useState(course || {
    title: '',
    subtitle: '',
    description: '',
    shortDescription: '',
    category: 'web-development',
    level: 'beginner',
    language: 'it',
    price: 0,
    objectives: [],
    requirements: [],
    targetStudents: '',
    coverImage: null
  });
  
  const [sections, setSections] = useState([]);
  const [activeTab, setActiveTab] = useState('basics');
  const [loading, setLoading] = useState(false);
  
  const handleSave = async (status = 'draft') => {
    setLoading(true);
    try {
      const endpoint = course?.id 
        ? `/api/instructor/courses/${course.id}`
        : '/api/instructor/courses';
      
      const method = course?.id ? 'PUT' : 'POST';
      
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lh_token')}`
        },
        body: JSON.stringify({ ...formData, status })
      });
      
      if (!res.ok) throw new Error('Errore salvataggio corso');
      
      const data = await res.json();
      toast.success(course?.id ? 'Corso aggiornato!' : 'Corso creato!');
      
      if (onSave) onSave(data.course);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      
      const res = await fetch('/api/instructor/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lh_token')}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Errore upload');
      
      const data = await res.json();
      setFormData(prev => ({ ...prev, coverImage: data.url, coverType: 'upload' }));
      toast.success('Copertina caricata!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handleGenerateCover = async () => {
    try {
      const res = await fetch('/api/instructor/generate-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lh_token')}`
        },
        body: JSON.stringify({
          title: formData.title,
          subtitle: formData.subtitle,
          category: formData.category,
          level: formData.level
        })
      });
      
      if (!res.ok) throw new Error('Errore generazione');
      
      const data = await res.json();
      setFormData(prev => ({ ...prev, coverImage: data.url, coverType: 'generated' }));
      toast.success('Copertina generata!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{course?.id ? 'Modifica Corso' : 'Nuovo Corso'}</h1>
          <p className="text-muted-foreground">Compila tutti i campi per creare un corso professionale</p>
        </div>
        <Button variant="outline" onClick={onBack}>Torna indietro</Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basics">Informazioni</TabsTrigger>
          <TabsTrigger value="cover">Copertina</TabsTrigger>
          <TabsTrigger value="content">Contenuto</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basics" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titolo Corso *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Es: Corso Completo di React e Next.js"
                />
              </div>
              
              <div>
                <Label>Sottotitolo</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Una breve descrizione accattivante"
                />
              </div>
              
              <div>
                <Label>Descrizione Breve</Label>
                <Textarea
                  value={formData.shortDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="Descrizione di massimo 2-3 righe per il catalogo"
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Descrizione Completa</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione dettagliata del corso, cosa impareranno gli studenti..."
                  rows={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria *</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web-development">Sviluppo Web</SelectItem>
                      <SelectItem value="mobile-development">Sviluppo Mobile</SelectItem>
                      <SelectItem value="data-science">Data Science & AI</SelectItem>
                      <SelectItem value="design">Design & UX</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="photography">Fotografia</SelectItem>
                      <SelectItem value="music">Musica</SelectItem>
                      <SelectItem value="personal-growth">Crescita Personale</SelectItem>
                      <SelectItem value="finance">Finanza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Livello *</Label>
                  <Select value={formData.level} onValueChange={(val) => setFormData(prev => ({ ...prev, level: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Principiante</SelectItem>
                      <SelectItem value="intermediate">Intermedio</SelectItem>
                      <SelectItem value="advanced">Avanzato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lingua</Label>
                  <Select value={formData.language} onValueChange={(val) => setFormData(prev => ({ ...prev, language: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Prezzo (€)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cover" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Copertina del Corso</CardTitle>
              <CardDescription>Carica un'immagine o genera una copertina automatica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.coverImage && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={formData.coverImage} alt="Copertina" className="w-full h-64 object-cover" />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cover-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Carica Immagine</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG fino a 2MB</p>
                    </div>
                  </Label>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadCover}
                  />
                </div>
                
                <Button
                  variant="outline"
                  className="h-auto py-8 flex-col gap-2"
                  onClick={handleGenerateCover}
                  disabled={!formData.title}
                >
                  <GripVertical className="w-10 h-10" />
                  <span className="font-medium">Genera Automaticamente</span>
                  <span className="text-xs text-muted-foreground">Template moderno con gradient</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Contenuto del Corso</CardTitle>
              <CardDescription>Gestisci moduli e lezioni nella pagina dedicata dopo aver salvato il corso</CardDescription>
            </CardHeader>
            <CardContent>
              {course?.id ? (
                <Button onClick={() => setActiveTab('settings')}>Vai alla gestione contenuti →</Button>
              ) : (
                <p className="text-sm text-muted-foreground">Salva prima il corso per aggiungere moduli e lezioni</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Pubblicazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Stato Corso</Label>
                <div className="flex gap-2 mt-2">
                  <Badge variant={formData.status === 'draft' ? 'default' : 'outline'}>Bozza</Badge>
                  <Badge variant={formData.status === 'pending_review' ? 'default' : 'outline'}>In Revisione</Badge>
                  <Badge variant={formData.status === 'published' ? 'default' : 'outline'}>Pubblicato</Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Salva come bozza per continuare a lavorare, oppure invia in revisione quando sei pronto
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex gap-3 mt-8">
        <Button size="lg" onClick={() => handleSave('draft')} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          Salva come Bozza
        </Button>
        <Button size="lg" variant="default" onClick={() => handleSave('pending_review')} disabled={loading || !formData.title}>
          <Send className="w-4 h-4 mr-2" />
          Invia in Revisione
        </Button>
        <Button size="lg" variant="outline" onClick={onBack}>
          Annulla
        </Button>
      </div>
    </div>
  );
}

// ==================== LESSON FORM COMPONENT ====================
export function LessonForm({ lesson, sectionId, courseId, onSave, onCancel }) {
  const [formData, setFormData] = useState(lesson || {
    title: '',
    description: '',
    type: 'video',
    videoUrl: '',
    videoDuration: 0,
    pdfPages: 0,
    textContent: '',
    isPreview: false,
    isRequired: true
  });
  
  const handleSubmit = async () => {
    try {
      const endpoint = lesson?.id
        ? `/api/instructor/lessons/${lesson.id}`
        : `/api/instructor/sections/${sectionId}/lessons`;
      
      const method = lesson?.id ? 'PUT' : 'POST';
      
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lh_token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error('Errore salvataggio lezione');
      
      const data = await res.json();
      toast.success('Lezione salvata!');
      if (onSave) onSave(data.lesson);
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Titolo Lezione *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Es: Introduzione a React Hooks"
        />
      </div>
      
      <div>
        <Label>Tipo Contenuto</Label>
        <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="pdf">PDF / Documento</SelectItem>
            <SelectItem value="text">Testo / Articolo</SelectItem>
            <SelectItem value="mixed">Contenuto Misto</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {(formData.type === 'video' || formData.type === 'mixed') && (
        <div className="space-y-2">
          <Label>URL Video (YouTube, Vimeo, ecc.)</Label>
          <Input
            value={formData.videoUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
            placeholder="https://youtube.com/watch?v=..."
          />
          <Label>Durata Video (secondi)</Label>
          <Input
            type="number"
            value={formData.videoDuration}
            onChange={(e) => setFormData(prev => ({ ...prev, videoDuration: parseInt(e.target.value) || 0 }))}
            placeholder="600"
          />
        </div>
      )}
      
      {(formData.type === 'pdf' || formData.type === 'mixed') && (
        <div className="space-y-2">
          <Label>Numero Pagine PDF</Label>
          <Input
            type="number"
            value={formData.pdfPages}
            onChange={(e) => setFormData(prev => ({ ...prev, pdfPages: parseInt(e.target.value) || 0 }))}
            placeholder="10"
          />
        </div>
      )}
      
      {(formData.type === 'text' || formData.type === 'mixed') && (
        <div>
          <Label>Contenuto Testuale</Label>
          <Textarea
            value={formData.textContent}
            onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
            placeholder="Scrivi il contenuto della lezione..."
            rows={8}
          />
        </div>
      )}
      
      <div>
        <Label>Descrizione</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Breve descrizione della lezione"
          rows={3}
        />
      </div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isPreview}
            onChange={(e) => setFormData(prev => ({ ...prev, isPreview: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm">Anteprima gratuita</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRequired}
            onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm">Lezione obbligatoria</span>
        </label>
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSubmit}>Salva Lezione</Button>
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
      </div>
    </div>
  );
}
