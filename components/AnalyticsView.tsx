import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { DeliveryItem, DeliveryStatus, CommercialDemand } from '../types';
import { parseDate } from '../utils';
import { TrendingUp, Users, PieChart as PieIcon, AlertTriangle, Target } from 'lucide-react';

interface AnalyticsViewProps {
    deliveries: DeliveryItem[];
    commercialDemands: CommercialDemand[]; // Adicionado
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ deliveries, commercialDemands = [] }) => {

    // 1. Processar dados para Gráfico de Tendência (Emitidas vs Entregues no Mesmo Dia)
    const trendData = useMemo(() => {
        const grouped: Record<string, { emitted: number, sameDay: number }> = {};

        deliveries.forEach(d => {
            const issueDateObj = parseDate(d.issueDate);
            if (!issueDateObj) return;

            // Chave de agrupamento sempre YYYY-MM-DD (para ordenar corretamente)
            const dateKey = issueDateObj.toISOString().split('T')[0];

            if (!grouped[dateKey]) {
                grouped[dateKey] = { emitted: 0, sameDay: 0 };
            }

            // Conta emissão
            grouped[dateKey].emitted += 1;

            // Conta se foi entregue no mesmo dia
            if (d.deliveryDate) {
                const deliveryDateObj = parseDate(d.deliveryDate);
                if (deliveryDateObj) {
                    const deliveryDateKey = deliveryDateObj.toISOString().split('T')[0];
                    if (deliveryDateKey === dateKey && d.status === DeliveryStatus.DELIVERED) {
                        grouped[dateKey].sameDay += 1;
                    }
                }
            }
        });

        // Transforma em array e ordena por data
        return Object.entries(grouped)
            .map(([date, counts]) => ({
                date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                fullDate: date,
                emitidas: counts.emitted,
                entreguesMesmoDia: counts.sameDay
            }))
            .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
            .slice(-30); // Últimos 30 dias com movimento
    }, [deliveries]);

    // 2. Processar SLA Comercial (Aderência ao Prazo)
    const slaData = useMemo(() => {
        const completed = commercialDemands.filter(d => d.status === 'Concluído' && d.completionDate);
        if (completed.length === 0) return { percent: 0, onTime: 0, total: 0 };

        let onTimeCount = 0;
        completed.forEach(d => {
            if (!d.completionDate) return;
            const deadline = parseDate(d.deadline);
            const completion = parseDate(d.completionDate);

            // Considera entregue no prazo se completion <= deadline
            if (deadline && completion && completion <= deadline) {
                onTimeCount++;
            }
        });

        const percent = Math.round((onTimeCount / completed.length) * 100);
        return { percent, onTime: onTimeCount, total: completed.length };
    }, [commercialDemands]);

    // Dados para o Gauge Chart (Pizza adaptada)
    const gaugeData = [
        { name: 'No Prazo', value: slaData.percent },
        { name: 'Fora do Prazo', value: 100 - slaData.percent }
    ];

    // 3. Processar Status (Pizza)
    const statusData = useMemo(() => {
        const grouped: Record<string, number> = {};
        deliveries.forEach(d => {
            grouped[d.status] = (grouped[d.status] || 0) + 1;
        });
        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [deliveries]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Cabeçalho */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-purple-600" />
                    Análise de Performance
                </h2>
                <p className="text-sm text-slate-500">Visualização gráfica de tendências e volumetria.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* GRÁFICO 1: TENDÊNCIA TEMPORAL */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={16} /> Emissão vs Entrega Imediata (30 dias)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorEmitidas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSameDay" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend verticalAlign="top" height={36} />
                                <Area type="monotone" dataKey="emitidas" name="Notas Emitidas" stroke="#8884d8" fillOpacity={1} fill="url(#colorEmitidas)" />
                                <Area type="monotone" dataKey="entreguesMesmoDia" name="Entregue Mesmo Dia" stroke="#10b981" fillOpacity={1} fill="url(#colorSameDay)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRÁFICO 2: SLA COMERCIAL (GAUGE) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 w-full mb-2">
                        <Target size={16} className="text-purple-600" /> Aderência ao Prazo (Commercial SLA)
                    </h3>
                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="70%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill={slaData.percent >= 80 ? '#22c55e' : slaData.percent >= 50 ? '#f59e0b' : '#ef4444'} />
                                    <Cell fill="#e2e8f0" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Texto Centralizado */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-20 pointer-events-none">
                            <span className="text-4xl font-black text-slate-800">{slaData.percent}%</span>
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">NO PRAZO</span>
                        </div>
                    </div>
                    <div className="text-center text-xs text-slate-500 mt-[-20px]">
                        Baseado em {slaData.total} obras concluídas.<br />
                        ({slaData.onTime} entregues no prazo)
                    </div>
                </div>

                {/* GRÁFICO 3: DISTRIBUIÇÃO DE STATUS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <PieIcon size={16} /> Distribuição de Status
                    </h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    label={({ name, percent, value }) => `${value}`}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend formatter={(value, entry: any) => {
                                    const { payload } = entry;
                                    return `${value} (${payload.value})`;
                                }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TABELA DE ALERTA: ATRASOS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2 text-red-600">
                        <AlertTriangle size={16} /> Atenção: Notas Atrasadas (Não Entregues)
                    </h3>
                    <div className="overflow-y-auto h-[260px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2">NF</th>
                                    <th className="px-3 py-2">Dias</th>
                                    <th className="px-3 py-2">Técnico</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveries
                                    .filter(d => {
                                        const s = d.status.toLowerCase();
                                        return s !== 'entregue' && s !== 'devolvido totalmente';
                                    })
                                    .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime())
                                    .slice(0, 10)
                                    .map(d => (
                                        <tr key={d.id} className="border-b hover:bg-slate-50">
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-slate-800">{d.invoiceNumber}</div>
                                                <div className={`text-[10px] font-bold uppercase mt-0.5 ${d.status === DeliveryStatus.PENDING ? 'text-red-500' :
                                                    d.status.toLowerCase().includes('parcial') ? 'text-yellow-600' :
                                                        d.status.toLowerCase().includes('retirado') ? 'text-orange-600' :
                                                            'text-slate-500'
                                                    }`}>
                                                    {d.status}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-red-500 font-bold">
                                                {Math.floor((new Date().getTime() - new Date(d.issueDate).getTime()) / (1000 * 60 * 60 * 24))} dias
                                            </td>
                                            <td className="px-3 py-2 text-slate-500 text-xs truncate max-w-[100px]">{d.receiverName || '-'}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};
