import React, { useState, useRef, useEffect } from 'react';
import { CommercialDemand, DemandPriority, UserRole } from '../types';
import { Plus, Search, Calendar, Briefcase, Trash2, CheckCircle2, Clock, X, Save, CheckSquare, Pencil, AlertCircle, Check, Square, ImageDown, LayoutList, FileText, User, Hash, MessageSquare } from 'lucide-react';
import { formatDate } from '../utils';
import html2canvas from 'html2canvas';
import { EmailTemplateCard } from './EmailTemplateCard';

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
    const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
    const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false); // For creating NEW demands only
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Novo estado para controlar qual demanda será "fotografada"
    const [demandForImage, setDemandForImage] = useState<CommercialDemand | null>(null);
    const imageTemplateRef = useRef<HTMLDivElement>(null);

    // Derived state
    const selectedDemand = demands.find(d => d.id === selectedDemandId) || null;

    // Form data for the DETAILED VIEW (Editing)
    const [detailsFormData, setDetailsFormData] = useState<Partial<CommercialDemand>>({});

    // Form data for the CREATE MODAL
    const [createFormData, setCreateFormData] = useState<Partial<CommercialDemand>>({
        title: '',
        client_name: '',
        project_name: '',
        deadline: systemToday,
        items: '',
        priority: DemandPriority.MEDIUM,
        status: 'Pendente'
    });

    // Update details form when selected demand changes
    useEffect(() => {
        if (selectedDemand) {
            setDetailsFormData({ ...selectedDemand });
        }
    }, [selectedDemand]);

    const handleGenerateImage = async (demand: CommercialDemand) => {
        setDemandForImage(demand);
        setTimeout(async () => {
            if (imageTemplateRef.current) {
                try {
                    const canvas = await html2canvas(imageTemplateRef.current, { scale: 2, backgroundColor: null });
                    const image = canvas.toDataURL("image/png");
                    const link = document.createElement('a');
                    link.href = image;
                    const safeName = (demand.project_name || demand.title).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    link.download = `CONCLUIDO_${safeName}.png`;
                    link.click();
                    alert("Imagem gerada! Verifique seus downloads e anexe ao e-mail.");
                } catch (error) {
                    console.error("Erro ao gerar imagem:", error);
                    alert("Não foi possível gerar a imagem.");
                } finally {
                    setDemandForImage(null);
                }
            }
        }, 100);
    };

    const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.EDITOR;
    const canAdd = canEdit || userRole === UserRole.COMMERCIAL;

    const filteredDemands = demands.filter(d =>
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation: needs client_name (which acts as title/obra), deadline, and items
        if (createFormData.client_name && createFormData.deadline && createFormData.items) {
            const finalTitle = createFormData.client_name; // Client name IS the Obra name now
            const newDemand: CommercialDemand = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: finalTitle,
                client_name: createFormData.client_name,
                project_name: '', // Deprecated or same as client
                requestDate: systemToday,
                deadline: createFormData.deadline || systemToday,
                items: createFormData.items || '',
                priority: createFormData.priority || DemandPriority.MEDIUM,
                status: 'Pendente',
                salesperson_name: '',
                project_code: '',
                observations: ''
            };
            onAddDemand(newDemand);
            setIsModalOpen(false);
            // Auto select and switch to details
            setSelectedDemandId(newDemand.id);
            setActiveTab('details');
        }
    };

    const handleUpdateDetails = () => {
        if (selectedDemand && detailsFormData) {
            onUpdateDemand({ ...selectedDemand, ...detailsFormData } as CommercialDemand);
            alert('Alterações salvas com sucesso!');
        }
    };

    const parseChecklist = (text: string) => {
        return text.split('\n').filter(line => line.trim()).map(line => {
            const isChecked = line.trim().startsWith('[x]') || line.trim().startsWith('[X]');
            const cleanText = line.replace(/^\[[xX ]\]\s*/, '').trim();
            return { text: cleanText, checked: isChecked, originalLine: line };
        });
    };

    const calculateProgress = (text: string) => {
        const items = parseChecklist(text);
        if (items.length === 0) return 0;
        const checked = items.filter(i => i.checked).length;
        return Math.round((checked / items.length) * 100);
    };

    const toggleItemCheck = (demand: CommercialDemand, index: number, isDetailsView = false) => {
        if (!canEdit) return;
        const lines = demand.items.split('\n');
        let contentCount = 0;
        const newLines = lines.map(line => {
            if (!line.trim()) return line;
            if (contentCount === index) {
                const isChecked = line.trim().startsWith('[x]') || line.trim().startsWith('[X]');
                const cleanText = line.replace(/^\[[xX ]\]\s*/, '').trim();
                contentCount++;
                return isChecked ? cleanText : `[x] ${cleanText}`;
            }
            contentCount++;
            return line;
        });
        const newItems = newLines.join('\n');

        if (isDetailsView) {
            setDetailsFormData(prev => ({ ...prev, items: newItems }));
            // Also update immediately in background if it's the selected demand
            onUpdateDemand({ ...demand, items: newItems });
        } else {
            onUpdateDemand({ ...demand, items: newItems });
        }
    };

    const getPriorityStyles = (p: DemandPriority) => {
        switch (p) {
            case DemandPriority.URGENT: return 'bg-red-50 text-red-700 border-red-200';
            case DemandPriority.HIGH: return 'bg-orange-50 text-orange-700 border-orange-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    // --- RENDERERS ---

    const renderOverview = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, obra..."
                            className="pl-9 pr-3 py-2 border rounded-lg text-sm bg-white w-64 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    {canAdd && (
                        <button
                            onClick={() => {
                                setCreateFormData({ title: '', client_name: '', project_name: '', deadline: systemToday, items: '', priority: DemandPriority.MEDIUM, status: 'Pendente' });
                                setIsModalOpen(true);
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} /> Novo Projeto
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="px-4 py-3 border-b text-center w-24">Prioridade</th>
                            <th className="px-4 py-3 border-b text-center w-24">Status</th>
                            <th className="px-4 py-3 border-b">Cliente</th>
                            <th className="px-4 py-3 border-b">Vendedor</th>
                            <th className="px-4 py-3 border-b text-center">Progresso</th>
                            <th className="px-4 py-3 border-b">Prazo</th>
                            <th className="px-4 py-3 border-b text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDemands.map(demand => {
                            const progress = calculateProgress(demand.items);
                            return (
                                <tr
                                    key={demand.id}
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedDemandId === demand.id ? 'bg-purple-50' : ''}`}
                                    onClick={() => { setSelectedDemandId(demand.id); setActiveTab('details'); }}
                                >
                                    <td className="px-4 py-3 text-center align-middle">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getPriorityStyles(demand.priority)}`}>
                                            {demand.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${demand.status === 'Concluído' ? 'bg-green-100 text-green-700' :
                                            demand.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {demand.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700 align-middle">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{demand.client_name || demand.title}</span>
                                            {demand.project_code && <span className="text-[10px] text-slate-400 font-mono">{demand.project_code}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 align-middle text-sm">
                                        {demand.salesperson_name || '-'}
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden max-w-[100px] mx-auto">
                                            <div className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className="text-[10px] text-center text-slate-400 mt-1">{progress}%</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500 align-middle">
                                        {formatDate(demand.deadline)}
                                    </td>
                                    <td className="px-4 py-3 text-right align-middle">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedDemandId(demand.id); setActiveTab('details'); }}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded hover:bg-indigo-50"
                                                title="Editar"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(demand.id); }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded hover:bg-red-50"
                                                title="Excluir"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        {deleteConfirmId === demand.id && (
                                            <div className="absolute right-10 mt-[-30px] bg-white shadow-xl border border-red-100 p-2 rounded-lg z-50 flex gap-2 animate-in slide-in-from-right-5 fade-in">
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteDemand(demand.id); setDeleteConfirmId(null); }} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Confirmar</button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">Cancelar</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredDemands.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                    <p>Nenhuma demanda encontrada.</p>
                </div>
            )}
        </div>
    );

    const renderDetails = () => {
        if (!selectedDemand) {
            return (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma obra selecionada</h3>
                    <p className="text-slate-500 mb-6">Selecione uma obra na aba "Visão Geral" para ver os detalhes.</p>
                    <button onClick={() => setActiveTab('overview')} className="text-purple-600 font-bold hover:underline">Ir para Visão Geral</button>
                </div>
            );
        }

        const checklistItems = parseChecklist(detailsFormData.items || '');
        const progress = calculateProgress(detailsFormData.items || '');

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{detailsFormData.client_name || detailsFormData.title}</h2>
                        <p className="text-xs text-slate-500">Detalhes e acompanhamento</p>
                    </div>
                    <div className="flex gap-2">
                        {canEdit && (
                            <button onClick={handleUpdateDetails} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <Save size={16} /> Salvar Alterações
                            </button>
                        )}
                        {progress === 100 && (
                            <button onClick={() => handleGenerateImage(selectedDemand)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition-colors flex items-center gap-2">
                                <ImageDown size={16} /> Baixar Conclusão
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* COLUNA 1: Informações do Cliente */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2 mb-2">
                            <User size={14} /> Informações da Obra
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Cliente (Nome da Obra)</label>
                                <input
                                    disabled={!canEdit}
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={detailsFormData.client_name || ''}
                                    onChange={e => setDetailsFormData({ ...detailsFormData, client_name: e.target.value })}
                                    placeholder="Nome da Obra / Cliente"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Código da Obra</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                                    <input
                                        disabled={!canEdit}
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                                        value={detailsFormData.project_code || ''}
                                        onChange={e => setDetailsFormData({ ...detailsFormData, project_code: e.target.value })}
                                        placeholder="EX: 2024-001"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Vendedor / Consultor</label>
                                <input
                                    disabled={!canEdit}
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={detailsFormData.salesperson_name || ''}
                                    onChange={e => setDetailsFormData({ ...detailsFormData, salesperson_name: e.target.value })}
                                    placeholder="Quem atendeu"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Prazo de Entrega</label>
                                <input
                                    disabled={!canEdit}
                                    type="date"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={detailsFormData.deadline || ''}
                                    onChange={e => setDetailsFormData({ ...detailsFormData, deadline: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                <select
                                    disabled={!canEdit}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={detailsFormData.status}
                                    onChange={e => setDetailsFormData({ ...detailsFormData, status: e.target.value as any })}
                                >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Em Andamento">Em Andamento</option>
                                    <option value="Concluído">Concluído</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA 2: Checklist */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black uppercase text-slate-600 flex items-center gap-2">
                                <CheckSquare size={14} /> Checklist
                            </h3>
                            <span className="text-xs font-bold text-slate-400">{progress}%</span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-4">
                            <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-purple-600'}`} style={{ width: `${progress}%` }} />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {checklistItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => toggleItemCheck(selectedDemand, idx, true)}
                                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${item.checked
                                        ? 'bg-green-50 border-green-100'
                                        : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`mt-0.5 ${item.checked ? 'text-green-500' : 'text-slate-300'}`}>
                                        {item.checked ? <CheckCircle2 size={16} /> : <Square size={16} />}
                                    </div>
                                    <span className={`text-sm ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                            {checklistItems.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Nenhum item adicionado.</p>}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Editar lista (Bruto)</label>
                            <textarea
                                disabled={!canEdit}
                                className="w-full h-24 text-xs p-2 border rounded bg-white font-mono"
                                value={detailsFormData.items}
                                onChange={e => setDetailsFormData({ ...detailsFormData, items: e.target.value })}
                                placeholder="Digite os itens, um por linha..."
                            />
                        </div>
                    </div>

                    {/* COLUNA 3: Observações */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2 mb-2">
                            <MessageSquare size={14} /> Observações
                        </h3>
                        <textarea
                            disabled={!canEdit}
                            className="w-full h-[calc(100%-2rem)] min-h-[300px] p-4 border rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
                            value={detailsFormData.observations || ''}
                            onChange={e => setDetailsFormData({ ...detailsFormData, observations: e.target.value })}
                            placeholder="Adicione observações, notas ou comentários sobre esta obra..."
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Hidden Templates */}
            <EmailTemplateCard ref={imageTemplateRef} demand={demandForImage} />

            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-1">
                <div className="flex gap-6">
                    <button
                        className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-slate-500 hover:text-purple-500 hover:border-purple-200'
                            }`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <LayoutList size={18} /> Visão Geral
                    </button>
                    <button
                        className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'details'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-slate-500 hover:text-purple-500 hover:border-purple-200'
                            }`}
                        onClick={() => setActiveTab('details')}
                    >
                        <FileText size={18} /> Obras (Detalhes)
                    </button>
                </div>

                {selectedDemand && activeTab === 'overview' && (
                    <div className="text-xs text-slate-400 mb-3 animate-in fade-in">
                        Última seleção: <strong>{selectedDemand.project_name || selectedDemand.title}</strong>
                        <button onClick={() => setActiveTab('details')} className="ml-2 text-purple-600 underline">Ir para detalhes</button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in zoom-in-95 duration-200">
                {activeTab === 'overview' ? renderOverview() : renderDetails()}
            </div>

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b bg-purple-50 flex justify-between items-center">
                            <h2 className="font-bold text-purple-900">Novo Projeto</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-purple-400 hover:text-purple-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cliente (Nome da Obra)</label>
                                    <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" value={createFormData.client_name || ''} onChange={e => setCreateFormData({ ...createFormData, client_name: e.target.value })} placeholder="Nome da Obra / Cliente" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prazo</label>
                                    <input type="date" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" value={createFormData.deadline} onChange={e => setCreateFormData({ ...createFormData, deadline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prioridade</label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" value={createFormData.priority} onChange={e => setCreateFormData({ ...createFormData, priority: e.target.value as DemandPriority })}>
                                        {Object.values(DemandPriority).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Peças Necessárias</label>
                                <p className="text-[10px] text-slate-400 mb-1">Use linhas separadas para cada item.</p>
                                <textarea required placeholder="PI-0030 - 20 unidades..." className="w-full h-32 px-3 py-2 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-purple-500" value={createFormData.items} onChange={e => setCreateFormData({ ...createFormData, items: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 shadow-md">Criar Projeto</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
