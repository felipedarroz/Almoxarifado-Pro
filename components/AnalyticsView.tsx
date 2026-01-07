import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { DeliveryItem, DeliveryStatus } from '../types';
import { parseDate } from '../utils';
import { TrendingUp, Users, PieChart as PieIcon, AlertTriangle } from 'lucide-react';

interface AnalyticsViewProps {
    deliveries: DeliveryItem[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ deliveries }) => {

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

    // 2. Processar dados para Ranking de Técnicos
    const techData = useMemo(() => {
        const grouped: Record<string, number> = {};
        deliveries.forEach(d => {
            if (d.receiverName) {
                grouped[d.receiverName] = (grouped[d.receiverName] || 0) + 1;
            }
        });
        return Object.entries(grouped)
            .map(([name, count]) => ({ name, entregas: count }))
            .sort((a, b) => b.entregas - a.entregas)
            .slice(0, 5); // Top 5
    }, [deliveries]);

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

                {/* GRÁFICO 2: TOP TÉCNICOS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Users size={16} /> Top 5 Técnicos (Volumetria)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={techData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="entregas" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
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
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
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
                                    .filter(d => d.status !== DeliveryStatus.DELIVERED && d.status !== DeliveryStatus.FULL_RETURN)
                                    .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime())
                                    .slice(0, 10)
                                    .map(d => (
                                        <tr key={d.id} className="border-b hover:bg-slate-50">
                                            <td className="px-3 py-2 font-medium">{d.invoiceNumber}</td>
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
