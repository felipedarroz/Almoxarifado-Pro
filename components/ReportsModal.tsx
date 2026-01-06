import React, { useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { reportService } from '../services/reportService';
import { DeliveryItem, CommercialDemand } from '../types';

interface ReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, companyId }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            alert('Por favor, selecione as datas inicial e final.');
            return;
        }

        setLoading(true);
        try {
            // 1. Fetch Data
            const [deliveries, demands] = await Promise.all([
                dataService.getDeliveriesByDateRange(companyId, startDate, endDate),
                dataService.getDemandsByDateRange(companyId, startDate, endDate)
            ]);

            // 2. Generate Excel
            reportService.generateMonthlyReport(deliveries, demands, startDate, endDate);

            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar relatório. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Download size={18} className="text-blue-600" />
                        Relatórios e Fechamento
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleDownload} className="p-4 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Data Inicial</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Data Final</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                'Baixar Relatório Excel'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
