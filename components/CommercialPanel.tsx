import React, { useState } from 'react';
import { CommercialDemand, DemandPriority, UserRole } from '../types';
import { Plus, Search, Calendar, Briefcase, Trash2, CheckCircle2, Clock, X, Save, CheckSquare, Pencil, AlertCircle } from 'lucide-react';

interface CommercialPanelProps {
  demands: CommercialDemand[];
  onAddDemand: (demand: CommercialDemand) => void;
  onUpdateDemand: (demand: CommercialDemand) => void;
  onCompleteDemand: (id: string, completionDate: string) => void;
  onUpdateStatus: (id: string, status: CommercialDemand['status']) => void;
  onDeleteDemand: (id: string) => void;
  userRole: UserRole;
  systemToday: string;
}

export const CommercialPanel: React.FC<CommercialPanelProps> = ({ 
  demands, 
  onAddDemand, 
  onUpdateDemand,
  onCompleteDemand,
  onUpdateStatus, 
  onDeleteDemand,
  userRole,
  systemToday
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDemand, setEditingDemand] = useState<CommercialDemand | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<CommercialDemand>>({
    title: '',
    deadline: systemToday,
    items: '',
    priority: DemandPriority.MEDIUM,
    status: 'Pendente'
  });

  const canEdit = userRole !== UserRole.VIEWER;

  const filteredDemands = demands.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.items.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const urgentDemands = filteredDemands.filter(d => d.priority === DemandPriority.URGENT);
  const highDemands = filteredDemands.filter(d => d.priority === DemandPriority.HIGH);
  const normalDemands = filteredDemands.filter(d => d.priority === DemandPriority.MEDIUM || d.priority === DemandPriority.LOW);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.deadline && formData.items) {
      if (editingDemand) {
        onUpdateDemand({ ...editingDemand, ...formData } as CommercialDemand);
      } else {
        onAddDemand({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: formData.title,
          requestDate: systemToday,
          deadline: formData.deadline,
          items: formData.items,
          priority: formData.priority || DemandPriority.MEDIUM,
          status: 'Pendente'
        } as CommercialDemand);
      }
      setIsModalOpen(false);
    }
  };

  const getPriorityStyles = (p: DemandPriority) => {
    switch(p) {
        case DemandPriority.URGENT: return 'bg-red-50 text-red-700 border-red-200';
        case DemandPriority.HIGH: return 'bg-orange-50 text-orange-700 border-orange-200';
        default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const renderCard = (item: CommercialDemand) => {
    const isDeleting = deleteConfirmId === item.id;

    return (
        <div key={item.id} className={`relative bg-white rounded-xl shadow-sm border p-4 mb-4 transition-all hover:shadow-md ${item.status === 'Concluído' ? 'border-green-200 bg-green-50/20' : 'border-slate-200'}`}>
            {/* OVERLAY DE CONFIRMAÇÃO DE EXCLUSÃO NO PRÓPRIO CARD */}
            {isDeleting && (
                <div className="absolute inset-0 bg-white/95 z-10 rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
                    <AlertCircle className="text-red-500 mb-2" size={24} />
                    <p className="text-xs font-bold text-slate-800 mb-3">Excluir esta demanda?</p>
                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="flex-1 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onDeleteDemand(item.id); 
                                setDeleteConfirmId(null); 
                            }}
                            className="flex-1 py-1.5 text-[10px] font-bold bg-red-600 text-white rounded-lg"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${getPriorityStyles(item.priority)}`}>
                    {item.priority}
                </span>
                <div className="flex gap-1">
                    <button onClick={() => {
                        const dateStr = item.deadline.replace(/-/g, '');
                        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Entrega: ' + item.title)}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent(item.items)}`, '_blank');
                    }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded" title="Agenda"><Calendar size={16} /></button>
                    
                    {canEdit && (
                        <>
                            <button onClick={() => { setEditingDemand(item); setFormData({...item}); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded" title="Editar"><Pencil size={16} /></button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id); }} 
                                className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded border border-transparent hover:border-red-100" 
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <h4 className="font-bold text-slate-800 leading-tight mb-1">{item.title}</h4>
            
            <div className="space-y-1 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>Prazo: <strong>{new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
                </div>
                {item.completionDate && (
                    <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold">
                        <CheckSquare size={10} /> Disponível: {new Date(item.completionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                )}
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px] font-mono text-slate-600 mb-3 max-h-24 overflow-y-auto whitespace-pre-line">
                {item.items}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${item.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.status}
                </span>
                {canEdit && item.status !== 'Concluído' && (
                    <button onClick={() => onCompleteDemand(item.id, systemToday)} className="text-[10px] font-bold text-green-600 border border-green-200 px-3 py-1.5 rounded-lg bg-white hover:bg-green-50 shadow-sm transition-colors">
                        Concluir
                    </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
           <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Briefcase className="text-purple-600" /> Comercial</h2>
           <p className="text-xs text-slate-500">Programação estratégica de obras.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Filtrar..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {canEdit && <button onClick={() => { setEditingDemand(null); setFormData({ title: '', deadline: systemToday, items: '', priority: DemandPriority.MEDIUM, status: 'Pendente' }); setIsModalOpen(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors">+ Nova Demanda</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
            <h3 className="text-xs font-black uppercase tracking-tighter text-red-600 mb-4 bg-red-50 p-2 rounded border border-red-100 flex items-center justify-center gap-2">Urgentes <span className="bg-red-200 px-1.5 rounded-full">{urgentDemands.length}</span></h3>
            {urgentDemands.map(renderCard)}
            {urgentDemands.length === 0 && <p className="text-center text-xs text-slate-400 py-6 italic border border-dashed rounded-lg">Nenhuma urgência.</p>}
        </div>
        <div>
            <h3 className="text-xs font-black uppercase tracking-tighter text-orange-600 mb-4 bg-orange-50 p-2 rounded border border-orange-100 flex items-center justify-center gap-2">Alta Prioridade <span className="bg-orange-200 px-1.5 rounded-full">{highDemands.length}</span></h3>
            {highDemands.map(renderCard)}
            {highDemands.length === 0 && <p className="text-center text-xs text-slate-400 py-6 italic border border-dashed rounded-lg">Sem pendências altas.</p>}
        </div>
        <div>
            <h3 className="text-xs font-black uppercase tracking-tighter text-slate-600 mb-4 bg-slate-100 p-2 rounded border border-slate-200 flex items-center justify-center gap-2">Geral <span className="bg-slate-300 px-1.5 rounded-full">{normalDemands.length}</span></h3>
            {normalDemands.map(renderCard)}
            {normalDemands.length === 0 && <p className="text-center text-xs text-slate-400 py-6 italic border border-dashed rounded-lg">Sem demandas gerais.</p>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b bg-purple-50 flex justify-between items-center">
                    <h2 className="font-bold text-purple-900">{editingDemand ? 'Editar Demanda' : 'Nova Demanda'}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-purple-400 hover:text-purple-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Título / Obra</label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prazo</label>
                            <input type="date" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prioridade</label>
                            <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as DemandPriority})}>
                                {Object.values(DemandPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Peças Necessárias</label>
                        <textarea required placeholder="PI-0030 - 20 unidades..." className="w-full h-32 px-3 py-2 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-purple-500" value={formData.items} onChange={e => setFormData({...formData, items: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 shadow-md">Salvar Demanda</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
