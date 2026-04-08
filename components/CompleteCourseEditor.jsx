'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, Save, Send, Video, FileText, File, BookOpen, Clock, ArrowLeft, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('lh_token') : null;

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

export function CompleteCourseEditor({ initialCourse, onBack }) {
  const [course, setCourse] = useState(initialCourse || {
    title: '',
    subtitle: '',
    description: '',
    category: 'web-development',
    level: 'beginner',
    price: 0,
    coverImage: null
  });
  
  const [sections, setSections] = useState([]);
  const [lessons, setLessons] = useState({});
  const [activeTab, setActiveTab] = useState('info');
  const [editingLesson, setEditingLesson] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Carica sezioni e lezioni se corso esiste
  useEffect(() => {
    if (course?.id) {
      loadCourseContent();
    }
  }, [course?.id]);
  
  const loadCourseContent = async () => {
    try {
      const [sectionsData] = await Promise.all([
        api(`/courses/${course.id}/modules`)
      ]);
      
      setSections(sectionsData.modules || []);
      
      const lessonsData = {};
      for (const section of (sectionsData.modules || [])) {
        const lessonRes = await api(`/modules/${section.id}/lessons`);
        lessonsData[section.id] = lessonRes.lessons || [];
      }
      setLessons(lessonsData);
    } catch (e) {
      console.error(e);
    }
  };
  
  const saveCourse = async (status = 'draft') => {
    try {
      if (!course.title) {
        toast.error('Inserisci almeno il titolo del corso');
        return;
      }
      
      const endpoint = course?.id 
        ? `/instructor/courses/${course.id}`
        : '/instructor/courses';
      
      const method = course?.id ? 'PUT' : 'POST';
      
      const data = await api(endpoint, {
        method,
        body: JSON.stringify({ ...course, status })
      });
      
      setCourse(data.course);
      toast.success(course?.id ? 'Corso aggiornato!' : 'Corso creato!');
      
      // Salva nel localStorage per persistenza
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentCourseId', data.course.id);
      }
      
      // Ricarica contenuto se corso già esistente
      if (data.course.id) {
        await loadCourseContent();
      }
      
      return data.course;
    } catch (e) {
      toast.error(e.message);
      throw e;
    }
  };
  
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      
      const res = await fetch('/api/instructor/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Errore upload');
      
      const data = await res.json();
      setCourse(prev => ({ ...prev, coverImage: data.url, coverType: 'upload' }));
      toast.success('Copertina caricata!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };
  
  const handleGenerateCover = async () => {
    if (!course.title) {
      toast.error('Inserisci prima il titolo del corso');
      return;
    }
    
    try {
      const data = await api('/instructor/generate-cover', {
        method: 'POST',
        body: JSON.stringify({
          title: course.title,
          subtitle: course.subtitle,
          category: course.category,
          level: course.level
        })
      });
      
      setCourse(prev => ({ ...prev, coverImage: data.url, coverType: 'generated' }));
      toast.success('Copertina generata!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const addSection = async () => {
    // Se il corso non esiste ancora, lo salviamo automaticamente prima
    let courseId = course?.id;
    if (!courseId) {
      if (!course.title) {
        toast.error('Inserisci almeno il titolo del corso prima di aggiungere moduli');
        return;
      }
      toast.info('Salvataggio corso in corso...');
      try {
        const savedCourse = await saveCourse('draft');
        if (!savedCourse?.id) {
          toast.error('Errore durante il salvataggio del corso');
          return;
        }
        courseId = savedCourse.id;
        // Aggiorna lo stato del corso
        setCourse(savedCourse);
      } catch (e) {
        toast.error('Errore durante il salvataggio: ' + e.message);
        return;
      }
    }
    
    try {
      const data = await api(`/instructor/courses/${courseId}/sections`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Nuova Sezione', description: '' })
      });
      
      setSections(prev => [...prev, data.section]);
      setLessons(prev => ({ ...prev, [data.section.id]: [] }));
      toast.success('Sezione creata!');
    } catch (e) {
      toast.error(e.message);
    }
  };
  
  const deleteSection = async (sectionId) => {
    if (!confirm('Eliminare questa sezione?')) return;
    
    try {
      await api(`/instructor/sections/${sectionId}`, { method: 'DELETE' });
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setLessons(prev => {
        const newLessons = { ...prev };
        delete newLessons[sectionId];
        return newLessons;
      });
      toast.success('Sezione eliminata');
      loadCourseContent();
    } catch (e) {
      toast.error(e.message);
    }
  };
  
  // Aggiorna titolo sezione con debounce
  const updateSectionTitle = async (sectionId, newTitle) => {
    // Aggiorna localmente subito
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title: newTitle } : s));
    
    // Salva sul server (debounced)
    clearTimeout(window.sectionTitleTimeout);
    window.sectionTitleTimeout = setTimeout(async () => {
      try {
        await api(`/instructor/sections/${sectionId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: newTitle })
        });
      } catch (e) {
        toast.error('Errore salvataggio titolo');
      }
    }, 500);
  };
  
  const saveLesson = async (lessonData, sectionId) => {
    try {
      const endpoint = lessonData.id
        ? `/instructor/lessons/${lessonData.id}`
        : `/instructor/sections/${sectionId}/lessons`;
      
      const method = lessonData.id ? 'PUT' : 'POST';
      
      await api(endpoint, {
        method,
        body: JSON.stringify(lessonData)
      });
      
      toast.success('Lezione salvata!');
      setEditingLesson(null);
      loadCourseContent();
    } catch (e) {
      toast.error(e.message);
    }
  };
  
  const deleteLesson = async (lessonId, sectionId) => {
    if (!confirm('Eliminare questa lezione?')) return;
    
    try {
      await api(`/instructor/lessons/${lessonId}`, { method: 'DELETE' });
      setLessons(prev => ({
        ...prev,
        [sectionId]: prev[sectionId].filter(l => l.id !== lessonId)
      }));
      toast.success('Lezione eliminata');
      loadCourseContent();
    } catch (e) {
      toast.error(e.message);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{course?.id ? 'Modifica Corso' : 'Nuovo Corso'}</h1>
          {course?.id && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{Math.floor((course.totalDuration || 0) / 60)} min</span>
              <BookOpen className="w-4 h-4 ml-2" />
              <span>{course.totalLessons || 0} lezioni</span>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna indietro
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informazioni</TabsTrigger>
          <TabsTrigger value="cover">Copertina</TabsTrigger>
          <TabsTrigger value="content">Contenuto</TabsTrigger>
        </TabsList>
        
        {/* TAB INFORMAZIONI */}
        <TabsContent value="info" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Corso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titolo *</Label>
                <Input
                  value={course.title}
                  onChange={(e) => setCourse(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Es: Corso Completo di React"
                />
              </div>
              
              <div>
                <Label>Sottotitolo</Label>
                <Input
                  value={course.subtitle}
                  onChange={(e) => setCourse(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Breve descrizione accattivante"
                />
              </div>
              
              <div>
                <Label>Descrizione</Label>
                <Textarea
                  value={course.description}
                  onChange={(e) => setCourse(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione dettagliata del corso..."
                  rows={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={course.category} onValueChange={(val) => setCourse(prev => ({ ...prev, category: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web-development">Sviluppo web</SelectItem>
                      <SelectItem value="mobile-development">Sviluppo mobile</SelectItem>
                      <SelectItem value="data-science">Data science</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Livello</Label>
                  <Select value={course.level} onValueChange={(val) => setCourse(prev => ({ ...prev, level: val }))}>
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
                  <Label>Lingua del corso</Label>
                  <Select value={course.language || 'it'} onValueChange={(val) => setCourse(prev => ({ ...prev, language: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">Inglese</SelectItem>
                      <SelectItem value="es">Spagnolo</SelectItem>
                      <SelectItem value="fr">Francese</SelectItem>
                      <SelectItem value="de">Tedesco</SelectItem>
                      <SelectItem value="pt">Portoghese</SelectItem>
                      <SelectItem value="zh">Cinese</SelectItem>
                      <SelectItem value="ja">Giapponese</SelectItem>
                      <SelectItem value="ko">Coreano</SelectItem>
                      <SelectItem value="ar">Arabo</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ru">Russo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Prezzo (€)</Label>
                  <Input
                    type="number"
                    value={course.price}
                    onChange={(e) => setCourse(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex gap-3">
            <Button size="lg" onClick={() => saveCourse('draft')}>
              <Save className="w-4 h-4 mr-2" />
              Salva come Bozza
            </Button>
            {course?.id && (
              <Button size="lg" variant="default" onClick={() => saveCourse('pending_review')}>
                <Send className="w-4 h-4 mr-2" />
                Invia in Revisione
              </Button>
            )}
          </div>
        </TabsContent>
        
        {/* TAB COPERTINA */}
        <TabsContent value="cover" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Copertina del Corso</CardTitle>
              <CardDescription>Carica un'immagine o genera automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.coverImage && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={course.coverImage} alt="Copertina" className="w-full h-64 object-cover" />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cover-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {uploading ? 'Caricamento...' : 'Carica Immagine'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG fino a 2MB</p>
                    </div>
                  </Label>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadCover}
                    disabled={uploading}
                  />
                </div>
                
                <Button
                  variant="outline"
                  className="h-auto py-8 flex-col gap-2"
                  onClick={handleGenerateCover}
                  disabled={!course.title}
                >
                  <BookOpen className="w-10 h-10" />
                  <span className="font-medium">Genera Automaticamente</span>
                  <span className="text-xs text-muted-foreground">Template moderno</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB CONTENUTO */}
        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Moduli e Lezioni</CardTitle>
                  <CardDescription>Organizza il contenuto del corso</CardDescription>
                </div>
                <Button onClick={addSection} data-testid="add-module-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Modulo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nessun modulo. Inizia aggiungendone uno!</p>
                  <Button className="mt-4" onClick={addSection}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crea il primo modulo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sections.map((section, idx) => (
                    <Card key={section.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-violet-600">{idx + 1}.</span>
                              <Input
                                value={section.title}
                                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                className="font-semibold text-base border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                                placeholder="Titolo sezione..."
                                data-testid={`section-title-${section.id}`}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {(lessons[section.id] || []).length} lezioni • {Math.floor((section.totalDuration || 0) / 60)} min
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteSection(section.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(lessons[section.id] || []).map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-3 p-3 border rounded-lg mb-2 hover:bg-gray-50 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lesson.type === 'video' ? 'bg-blue-100 text-blue-600' : lesson.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              {lesson.type === 'video' && <Video className="w-4 h-4" />}
                              {lesson.type === 'pdf' && <FileText className="w-4 h-4" />}
                              {(lesson.type === 'text' || lesson.type === 'mixed') && <File className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{lesson.title}</p>
                                {lesson.isPreview && (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full whitespace-nowrap">
                                    Anteprima Gratuita
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {lesson.type === 'video' ? 'Video' : lesson.type === 'pdf' ? 'PDF' : 'Testo'} 
                                {lesson.videoDuration ? ` • ${Math.floor(lesson.videoDuration / 60)}:${(lesson.videoDuration % 60).toString().padStart(2, '0')}` : ''}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingLesson({ ...lesson, sectionId: section.id })}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteLesson(lesson.id, section.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setEditingLesson({ sectionId: section.id })}>
                          <Plus className="w-4 h-4 mr-2" />
                          Aggiungi Lezione
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* DIALOG LEZIONE */}
      {editingLesson && (
        <LessonDialog
          lesson={editingLesson}
          onSave={(data) => saveLesson(data, editingLesson.sectionId)}
          onClose={() => setEditingLesson(null)}
        />
      )}
    </div>
  );
}

function LessonDialog({ lesson, onSave, onClose }) {
  const [formData, setFormData] = useState(lesson.id ? lesson : {
    title: '',
    description: '',
    type: 'video',
    videoUrl: '',
    videoDuration: 0,
    pdfUrl: '',
    pdfPages: 0,
    textContent: '',
    isRequired: true,
    isPreview: false
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato video non supportato. Usa MP4, WebM, OGG o MOV.');
      return;
    }
    
    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Il video è troppo grande. Massimo 500MB.');
      return;
    }
    
    setUploading(true);
    setUploadProgress(10);
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'video');
      
      setUploadProgress(30);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('lh_token') : null;
      const res = await fetch('/api/instructor/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });
      
      setUploadProgress(80);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore upload video');
      }
      
      const data = await res.json();
      setUploadProgress(100);
      
      // Update form with video URL and duration
      setFormData(prev => ({ 
        ...prev, 
        videoUrl: data.url,
        videoDuration: data.duration || prev.videoDuration
      }));
      
      toast.success('Video caricato con successo!');
    } catch (error) {
      toast.error('Errore durante l\'upload: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type - support multiple document formats
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ];
    const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Formato non supportato. Usa: PDF, DOC, DOCX, TXT, RTF, ODT');
      return;
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Il file è troppo grande. Massimo 50MB.');
      return;
    }
    
    setUploadingPdf(true);
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'document');
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('lh_token') : null;
      const res = await fetch('/api/instructor/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore upload documento');
      }
      
      const data = await res.json();
      
      // Update form with document URL
      setFormData(prev => ({ 
        ...prev, 
        pdfUrl: data.url,
        documentName: file.name
      }));
      
      toast.success('Documento caricato con successo!');
    } catch (error) {
      toast.error('Errore durante l\'upload: ' + error.message);
    } finally {
      setUploadingPdf(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson.id ? 'Modifica Lezione' : 'Nuova Lezione'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titolo Lezione *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Es: Introduzione a React Hooks"
              data-testid="lesson-title-input"
            />
          </div>
          
          <div>
            <Label>Descrizione</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Breve descrizione della lezione..."
              rows={2}
            />
          </div>
          
          <div>
            <Label>Tipo Contenuto</Label>
            <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>Video (carica dal PC)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>PDF / Documento</span>
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <span>Testo / Articolo</span>
                  </div>
                </SelectItem>
                <SelectItem value="mixed">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Contenuto Misto (Video + PDF + Testo)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(formData.type === 'video' || formData.type === 'mixed') && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video della Lezione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Video */}
                <div>
                  <Label htmlFor="video-upload" className="cursor-pointer">
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${uploading ? 'border-blue-400 bg-blue-50' : 'hover:border-blue-400'}`}>
                      {uploading ? (
                        <div className="space-y-2">
                          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
                          <p className="text-sm font-medium text-blue-600">Caricamento in corso... {uploadProgress}%</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                          <p className="text-sm font-medium">Carica video dal tuo PC</p>
                          <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV • Max 500MB</p>
                        </>
                      )}
                    </div>
                  </Label>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    className="hidden"
                    onChange={handleVideoUpload}
                    disabled={uploading}
                    data-testid="video-upload-input"
                  />
                </div>
                
                {/* Video Preview */}
                {formData.videoUrl && (
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video 
                      src={formData.videoUrl} 
                      controls 
                      className="w-full max-h-48"
                      onLoadedMetadata={(e) => {
                        const duration = Math.floor(e.target.duration);
                        if (duration && !formData.videoDuration) {
                          setFormData(prev => ({ ...prev, videoDuration: duration }));
                        }
                      }}
                    />
                    <div className="p-2 bg-gray-900 text-white text-xs flex items-center justify-between">
                      <span className="truncate">{formData.videoUrl.split('/').pop()}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-white hover:text-red-400 h-6 px-2"
                        onClick={() => setFormData(prev => ({ ...prev, videoUrl: '', videoDuration: 0 }))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label>Durata Video (secondi)</Label>
                  <Input
                    type="number"
                    value={formData.videoDuration || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, videoDuration: parseInt(e.target.value) || 0 }))}
                    placeholder="Es: 600 (per 10 minuti)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.videoDuration > 0 ? `${Math.floor(formData.videoDuration / 60)} minuti e ${formData.videoDuration % 60} secondi` : 'La durata viene rilevata automaticamente'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {(formData.type === 'pdf' || formData.type === 'mixed') && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Document */}
                <div>
                  <Label htmlFor="pdf-upload" className="cursor-pointer">
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${uploadingPdf ? 'border-amber-400 bg-amber-50' : 'hover:border-amber-400'}`}>
                      {uploadingPdf ? (
                        <div className="space-y-2">
                          <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto" />
                          <p className="text-sm font-medium text-amber-600">Caricamento documento...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                          <p className="text-sm font-medium">Carica documento dal tuo PC</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT, RTF • Max 50MB</p>
                        </>
                      )}
                    </div>
                  </Label>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                    data-testid="document-upload-input"
                  />
                </div>
                
                {/* Document Preview */}
                {formData.pdfUrl && (
                  <div className="rounded-lg overflow-hidden border bg-white">
                    <div className="p-3 bg-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <span className="text-sm font-medium truncate">{formData.pdfUrl.split('/').pop()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2"
                          onClick={() => window.open(formData.pdfUrl, '_blank')}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Visualizza
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700 h-7 px-2"
                          onClick={() => setFormData(prev => ({ ...prev, pdfUrl: '', pdfPages: 0 }))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label>Numero Pagine PDF</Label>
                  <Input
                    type="number"
                    value={formData.pdfPages || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, pdfPages: parseInt(e.target.value) || 0 }))}
                    placeholder="Es: 25"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stima: 2 minuti per pagina = {(formData.pdfPages || 0) * 2} minuti totali
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {(formData.type === 'text' || formData.type === 'mixed') && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-sm">Contenuto Testuale</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.textContent || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                  placeholder="Scrivi qui il contenuto della lezione..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stima: 200 parole al minuto
                </p>
              </CardContent>
            </Card>
          )}
          
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPreview || false}
                onChange={(e) => setFormData(prev => ({ ...prev, isPreview: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Anteprima Gratuita</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRequired !== false}
                onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Lezione Obbligatoria</span>
            </label>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => onSave(formData)} disabled={!formData.title} size="lg">
              <Save className="w-4 h-4 mr-2" />
              Salva Lezione
            </Button>
            <Button variant="outline" onClick={onClose} size="lg">
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
