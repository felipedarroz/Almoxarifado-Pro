
import React, { useState } from 'react';
import { ProviderPendency, UserRole } from '../types';
import { Plus, Search, AlertTriangle, CheckCircle2, X, Save, ClipboardList, Calendar } from 'lucide-react';
import { generateId } from '../utils';

interface PendencyPanelProps {
    pendencies: ProviderPendency[];
    onAddPendency: (pendency: ProviderPendency) => void;
    onUpdatePendency: (pendency: ProviderPendency) => void;
    onResolvePendency: (id: string) => void;
    onDeletePendency: (id: string) => void;
    userRole: UserRole;
}

export const PendencyPanel: React.FC<PendencyPanelProps> = ({
    pendencies,
    onAddPendency,
    onUpdatePendency,
    onResolvePendency,
    onDeletePendency,
    userRole
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<ProviderPendency>>({
        providerName: '',
        referenceNumber: '',
        itemName: '',
        quantity: 1,
        reason: '',
        expectedResolutionDate: ''
    });

    const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.EDITOR;

    const filteredPendencies = pendencies.filter(p =>
        p.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.providerName && formData.referenceNumber && formData.itemName && formData.reason) {
            onAddPendency({
                id: generateId(),
                providerName: formData.providerName,
                referenceNumber: formData.referenceNumber,
                itemName: formData.itemName,
                quantity: Number(formData.quantity) || 0,
                reason: formData.reason,
                date: new Date().toISOString(),
                expectedResolutionDate: formData.expectedResolutionDate,
                resolved: false
            } as ProviderPendency);

            setFormData({
                providerName: '',
                referenceNumber: '',
                itemName: '',
                quantity: 1,
                reason: '',
                expectedResolutionDate: ''
            });
            setIsModalOpen(false);
        }
    };

    const handleDateChange = (id: string, newDate: string) => {
        const pendency = pendencies.find(p => p.id === id);
        if (pendency) {
            onUpdatePendency({ ...pendency, expectedResolutionDate: newDate });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="text-orange-500" />
                        Pendências de Prestadores
                    </h2>
                    <p className="text-sm text-slate-500">Gerencie itens não retirados ou entregues por técnicos.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar Prestador, OS ou Item..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Nova Pendência</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-orange-50 border-b border-orange-100 text-center">
                            <tr>
                                <th className="px-4 py-3 font-bold text-slate-800 border-r border-orange-200">Prestador</th>
                                <th className="px-4 py-3 font-bold text-slate-800 border-r border-orange-200">Ordem de Serviço</th>
                                <th className="px-4 py-3 font-bold text-slate-800 border-r border-orange-200">Item</th>
                                <th className="px-4 py-3 font-bold text-slate-800 border-r border-orange-200">Quantidade</th>
                                <th className="px-4 py-3 font-bold text-slate-800 border-r border-orange-200">Motivo</th>
                                <th className="px-4 py-3 font-bold text-slate-800 w-40 border-r border-orange-200">Previsão Resolução</th>
                                <th className="px-4 py-3 font-bold text-slate-800">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-center">
                            {filteredPendencies.length > 0 ? (
                                filteredPendencies.map(item => (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.resolved ? 'opacity-60 bg-slate-50' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-slate-700 border-r border-slate-100">{item.providerName}</td>
                                        <td className="px-4 py-3 font-medium text-slate-700 border-r border-slate-100">{item.referenceNumber}</td>
                                        <td className="px-4 py-3 font-medium text-slate-700 border-r border-slate-100">{item.itemName}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100">{item.quantity}</td>
                                        <td className="px-4 py-3 font-medium text-slate-700 italic max-w-xs truncate border-r border-slate-100" title={item.reason}>
                                            {item.reason}
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100">
                                            {/* CAMPO EDITÁVEL DE DATA */}
                                            {item.resolved ? (
                                                <span className="text-xs text-slate-400">Resolvido</span>
                                            ) : (
                                                <input
                                                    type="date"
                                                    disabled={!canEdit}
                                                    className="w-full px-2 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 bg-white"
                                                    value={item.expectedResolutionDate || ''}
                                                    onChange={(e) => handleDateChange(item.id, e.target.value)}
                                                    title="Definir data prevista para resolução"
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                {canEdit && !item.resolved && (
                                                    <button
                                                        onClick={() => onResolvePendency(item.id)}
                                                        className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                                                        title="Marcar como Resolvido"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                )}
                                                {canEdit && (
                                                    <button
                                                        onClick={() => onDeletePendency(item.id)}
                                                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                                        title="Excluir"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                                {item.resolved && <span className="text-xs font-medium text-green-600 px-2 py-1 bg-green-50 rounded-full">Resolvido</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <ClipboardList size={32} className="text-slate-300" />
                                            <p>Nenhuma pendência registrada.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b bg-orange-50">
                            <h2 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                Nova Pendência
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-orange-900/50 hover:text-orange-900">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Prestador</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-900"
                                    placeholder="Ex: Carlos Técnico"
                                    value={formData.providerName}
                                    onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Número OS/NF</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-900"
                                        placeholder="Ex: OS-9988"
                                        value={formData.referenceNumber}
                                        onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-900"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Item / Descrição</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-900"
                                    placeholder="Ex: PI-0030 - TUBO DE AÇO"
                                    value={formData.itemName}
                                    onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Calendar size={14} /> Previsão de Resolução (Opcional)
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-900"
                                    value={formData.expectedResolutionDate || ''}
                                    onChange={e => setFormData({ ...formData, expectedResolutionDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                                <textarea
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 h-24 resize-none bg-white text-slate-900"
                                    placeholder="Descreva por que o material não foi retirado..."
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors"
                                >
                                    <Save size={16} />
                                    Salvar Pendência
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
