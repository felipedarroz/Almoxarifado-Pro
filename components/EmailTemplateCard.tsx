import React, { forwardRef } from 'react';
import { CommercialDemand } from '../types';
import { CheckSquare, PackageCheck } from 'lucide-react';

interface EmailTemplateCardProps {
    demand: CommercialDemand | null;
}

// Usamos forwardRef para que o componente pai possa "agarrar" este elemento para tirar a foto
export const EmailTemplateCard = forwardRef<HTMLDivElement, EmailTemplateCardProps>(({ demand }, ref) => {
    if (!demand) return null;

    // Processa os itens da checklist
    const checklistItems = demand.items.split('\n').filter(line => line.trim() !== '').map((line, index) => {
        const isChecked = line.trim().startsWith('[x]');
        const text = line.replace(/\[x\]|\[ \]/g, '').trim();
        // Tenta extrair código e nome
        const parts = text.split(' - ');
        const code = parts.length > 1 ? parts[0] : null;
        const name = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];

        return { id: `item-${index}`, text, isChecked, code, name };
    });

    return (
        // Este é o container invisível que será fotografado.
        // Definimos uma largura fixa para garantir que a imagem saia sempre bonita.
        <div ref={ref} style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '600px' }}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 font-sans">
                {/* Cabeçalho Verde */}
                <div className="bg-green-600 p-6 text-white flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full">
                        <PackageCheck size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold m-0">Materiais Disponíveis!</h1>
                        <p className="text-green-100 m-0 text-sm">A separação para esta obra foi concluída com sucesso.</p>
                    </div>
                </div>

                <div className="p-8 text-slate-800">
                    {/* Dados Principais */}
                    <div className="mb-8 grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                            <h2 className="text-xl font-bold text-slate-900 m-0">{demand.client_name}</h2>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Obra/Projeto</span>
                            <h3 className="text-lg font-semibold text-slate-700 m-0">{demand.project_name}</h3>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prazo Original</span>
                            <p className="m-0 font-medium">{new Date(demand.deadline).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full inline-block mt-1">
                                CONCLUÍDO (100%)
                            </span>
                        </div>
                    </div>

                    {/* Lista de Itens Concluída */}
                    <div>
                        <h4 className="text-md font-bold text-slate-700 mb-4 border-b pb-2">Lista de Materiais Conferidos</h4>
                        <div className="space-y-1">
                            {checklistItems.map((item) => (
                                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-green-50/50 border border-green-100">
                                    {/* Sempre mostra marcado como checked na imagem final */}
                                    <CheckSquare size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className={`text-sm ${item.isChecked ? 'text-slate-700' : 'text-slate-500'} flex-1 leading-tight`}>
                                        {item.code && <span className="font-mono font-bold text-xs text-slate-600 bg-slate-200/50 px-1 rounded mr-1">{item.code}</span>}
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rodapé */}
                    <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                        Gerado automaticamente pelo sistema Almoxarifado Pro - Consigaz
                    </div>
                </div>
            </div>
        </div>
    );
});
