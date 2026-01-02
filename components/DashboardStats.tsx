
import React, { useMemo, useState } from 'react';
import { DeliveryItem, DeliveryStatus, CommercialDemand, ProviderPendency } from '../types';
import { Clock, CheckCircle2, AlertTriangle, XCircle, FileText, AlertOctagon, Target, Briefcase, Package, ClipboardList, Settings2, Save } from 'lucide-react';

interface DashboardStatsProps {
  items: DeliveryItem[];
  commercialDemands?: CommercialDemand[];
  pendencies?: ProviderPendency[];
  systemToday: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ items, commercialDemands = [], pendencies = [], systemToday }) => {
  // Estado para configurar o limite de dias críticos (Persistente)
  const [criticalThreshold, setCriticalThreshold] = useState(() => {
    const saved = localStorage.getItem('almox_critical_threshold');
    return saved ? parseInt(saved) : 4;
  });
  
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(criticalThreshold);

  const handleSaveThreshold = () => {
    const val = Math.max(1, tempThreshold); // Mínimo de 1 dia
    setCriticalThreshold(val);
    localStorage.setItem('almox_critical_threshold', val.toString());
    setIsEditingThreshold(false);
  };

  const stats = useMemo(() => {
    const total = items.length;
    // Se não houver dados em nenhum módulo, retorna null
    if (total === 0 && commercialDemands.length === 0 && pendencies.length === 0) return null;

    // Data de referência do sistema
    const today = new Date(systemToday + 'T00:00:00');
    
    // --- METRICAS DE NOTAS (LOGISTICA) ---
    const awaitingAttendance = items.filter(i => i.status === DeliveryStatus.DELIVERED).length;
    const fullReturns = items.filter(i => i.status === DeliveryStatus.FULL_RETURN).length;
    const partialReturns = items.filter(i => i.status === DeliveryStatus.PARTIAL_RETURN).length;
    
    let totalDays = 0;
    let countWithDelivery = 0;
    let stagnantCount = 0;

    items.forEach(item => {
      if (item.deliveryDate && item.issueDate) {
        const start = new Date(item.issueDate + 'T00:00:00');
        const end = new Date(item.deliveryDate + 'T00:00:00');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        totalDays += diffDays;
        countWithDelivery++;
      }

      if (item.status === DeliveryStatus.PENDING && item.issueDate) {
         const issueDate = new Date(item.issueDate + 'T00:00:00');
         const diffTime = today.getTime() - issueDate.getTime();
         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
         // Usa o limite configurável
         if (diffDays > criticalThreshold) stagnantCount++;
      }
    });

    const avgTime = countWithDelivery > 0 ? (totalDays / countWithDelivery).toFixed(1) : '0';

    // --- METRICAS COMERCIAIS ---
    const totalObras = commercialDemands.length;
    const concludedDemands = commercialDemands.filter(d => d.status === 'Concluído');
    const onTimeDemands = concludedDemands.filter(d => {
        if (!d.completionDate) return false;
        return d.completionDate <= d.deadline;
    }).length;

    const commercialCompliancePct = concludedDemands.length > 0 
        ? ((onTimeDemands / concludedDemands.length) * 100).toFixed(1) 
        : '0';

    // --- METRICAS DE PENDENCIAS ---
    const totalPendencies = pendencies.length;
    const resolvedPendencies = pendencies.filter(p => p.resolved).length;
    const activePendencies = totalPendencies - resolvedPendencies;
    const pendencyResolutionPct = totalPendencies > 0 
        ? ((resolvedPendencies / totalPendencies) * 100).toFixed(1) 
        : '0';

    return {
      // Notas
      total,
      awaitingAttendance,
      fullReturns,
      partialReturns,
      avgTime,
      stagnantCount,
      awaitingPct: total > 0 ? ((awaitingAttendance / total) * 100).toFixed(1) : '0',
      fullReturnPct: total > 0 ? ((fullReturns / total) * 100).toFixed(1) : '0',
      partialReturnPct: total > 0 ? ((partialReturns / total) * 100).toFixed(1) : '0',
      // Comercial
      totalObras,
      commercialCompliancePct,
      // Pendencias
      totalPendencies,
      resolvedPendencies,
      activePendencies,
      pendencyResolutionPct
    };
  }, [items, commercialDemands, pendencies, systemToday, criticalThreshold]);

  if (!stats) return null;

  // Helper para barra de progresso
  const ProgressBar = ({ pct, colorClass }: { pct: string, colorClass: string }) => (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
      <div 
        className={`h-1.5 rounded-full ${colorClass}`} 
        style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
      ></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 mb-8">
      
      {/* ================= MODULO 1: INDICADORES DE NOTAS ================= */}
      <section>
          {/* Header Bar Azul */}
          <div className="flex items-center gap-3 p-3 mb-4 bg-gradient-to-r from-blue-50 via-blue-50/50 to-transparent border-l-4 border-blue-500 rounded-r-xl">
             <div className="p-1.5 bg-white rounded-lg shadow-sm text-blue-600">
               <Package size={18} />
             </div>
             <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Indicadores de Notas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Total Issued */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText size={20} /></div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
               </div>
               <div>
                  <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                  <p className="text-xs text-slate-500 font-medium">Notas Emitidas</p>
               </div>
            </div>

            {/* Tempo Médio */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio</span>
                    <Clock size={16} className="text-slate-300" />
                </div>
                <div>
                    <span className="text-3xl font-bold text-slate-700">{stats.avgTime}</span>
                    <span className="text-xs text-slate-400 ml-1">dias</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Da emissão à entrega</div>
            </div>

            {/* Critical Delay - EDITÁVEL */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow border-l-4 border-l-red-500 group relative">
               <div className="flex justify-between items-start mb-1">
                  <div className="w-full">
                    <div className="flex justify-between items-center w-full">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Atraso Crítico</p>
                        <button 
                            onClick={() => {
                                setTempThreshold(criticalThreshold);
                                setIsEditingThreshold(!isEditingThreshold);
                            }}
                            className="text-slate-300 hover:text-slate-600 transition-colors"
                            title="Configurar dias"
                        >
                            <Settings2 size={14} />
                        </button>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 h-6">
                        <span>Pendente &gt;</span>
                        {isEditingThreshold ? (
                            <div className="flex items-center gap-1 bg-white shadow-lg p-1 rounded border border-slate-200 absolute right-2 top-8 z-10">
                                <input 
                                    type="number" 
                                    min="1"
                                    className="w-12 px-1 py-0.5 text-xs border border-red-300 rounded focus:ring-1 focus:ring-red-500 bg-red-50 text-red-900 font-bold text-center"
                                    value={tempThreshold}
                                    onChange={(e) => setTempThreshold(parseInt(e.target.value))}
                                    autoFocus
                                />
                                <button onClick={handleSaveThreshold} className="text-green-600 hover:text-green-700 bg-green-50 p-1 rounded"><Save size={14} /></button>
                            </div>
                        ) : (
                            <span 
                                className="font-bold border-b border-dotted border-slate-400 cursor-help hover:text-red-600 hover:border-red-500 transition-colors"
                                title="Clique na engrenagem para alterar"
                            >
                                {criticalThreshold}
                            </span>
                        )}
                        <span>dias</span>
                    </div>
                  </div>
               </div>
               <div className="mt-1 flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-slate-800">{stats.stagnantCount}</span>
                    <span className="text-xs text-slate-500 ml-1">notas</span>
                  </div>
                  <AlertOctagon size={20} className="text-red-500 opacity-20" />
               </div>
            </div>
          </div>

          {/* Sub-metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {/* Awaiting Attendance */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Aguardando Atend.</span>
                <CheckCircle2 size={14} className="text-emerald-200 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700">{stats.awaitingAttendance}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.awaitingPct}%</span>
                </div>
                <ProgressBar pct={stats.awaitingPct} colorClass="bg-emerald-500" />
              </div>
            </div>

            {/* Full Returns */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Dev. Totais</span>
                <XCircle size={14} className="text-orange-200 group-hover:text-orange-500 transition-colors" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700">{stats.fullReturns}</span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{stats.fullReturnPct}%</span>
                </div>
                <ProgressBar pct={stats.fullReturnPct} colorClass="bg-orange-500" />
              </div>
            </div>

            {/* Partial Returns */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Dev. Parciais</span>
                <AlertTriangle size={14} className="text-yellow-200 group-hover:text-yellow-500 transition-colors" />
              </div>
              <div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700">{stats.partialReturns}</span>
                    <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">{stats.partialReturnPct}%</span>
                 </div>
                 <ProgressBar pct={stats.partialReturnPct} colorClass="bg-yellow-500" />
              </div>
            </div>
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= MODULO 2: PENDÊNCIAS COM PRESTADOR ================= */}
        <section className="flex flex-col h-full">
            {/* Header Bar Laranja */}
            <div className="flex items-center gap-3 p-3 mb-4 bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent border-l-4 border-orange-500 rounded-r-xl">
                <div className="p-1.5 bg-white rounded-lg shadow-sm text-orange-600">
                  <ClipboardList size={18} />
                </div>
                <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wide">Pendências com Prestador</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 h-full">
                 {/* Card Ativas */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Itens Pendentes</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.activePendencies}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">Aguardando regularização</p>
                </div>

                {/* Card Resolução */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Taxa de Resolução</p>
                    <div className="flex items-end gap-2 mb-1">
                        <p className="text-3xl font-bold text-slate-700">{stats.pendencyResolutionPct}%</p>
                    </div>
                    <ProgressBar pct={stats.pendencyResolutionPct} colorClass="bg-green-500" />
                    <p className="text-[10px] text-slate-400 mt-2">{stats.resolvedPendencies} de {stats.totalPendencies} ok</p>
                </div>
            </div>
        </section>

        {/* ================= MODULO 3: INDICADOR COMERCIAL ================= */}
        <section className="flex flex-col h-full">
             {/* Header Bar Roxo */}
             <div className="flex items-center gap-3 p-3 mb-4 bg-gradient-to-r from-purple-50 via-purple-50/50 to-transparent border-l-4 border-purple-500 rounded-r-xl">
                <div className="p-1.5 bg-white rounded-lg shadow-sm text-purple-600">
                  <Briefcase size={18} />
                </div>
                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide">Indicador Comercial</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-center h-full">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Atendimento no Prazo</p>
                        <p className="text-[10px] text-slate-500">Obras com materiais entregues vs prazo</p>
                    </div>
                    <Target className="text-purple-500" size={20} />
                </div>
                
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold text-slate-800">{stats.commercialCompliancePct}%</span>
                </div>
                
                <ProgressBar pct={stats.commercialCompliancePct} colorClass="bg-purple-500" />
                
                <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        <strong>{stats.totalObras}</strong> Obras Totais
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};
