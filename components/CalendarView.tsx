
import React, { useState, useMemo } from 'react';
import { CommercialDemand, ProviderPendency } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle } from 'lucide-react';

interface CalendarViewProps {
  commercialDemands: CommercialDemand[];
  pendencies: ProviderPendency[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ commercialDemands, pendencies }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthYearString = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getEventsForDay = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = checkDate.toISOString().split('T')[0];

    // Filter Commercial Deadlines
    const commercialEvents = commercialDemands.filter(
        d => d.deadline === dateStr && d.status !== 'Concluído'
    ).map(d => ({
        id: d.id,
        title: d.title,
        type: 'commercial',
        priority: d.priority
    }));

    // Filter Pendency Resolutions
    const pendencyEvents = pendencies.filter(
        p => p.expectedResolutionDate === dateStr && !p.resolved
    ).map(p => ({
        id: p.id,
        title: `Pend: ${p.providerName}`,
        type: 'pendency',
        priority: 'Normal'
    }));

    return [...commercialEvents, ...pendencyEvents];
  };

  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentDate);
    const startDay = firstDayOfMonth(currentDate);
    const daysArray = [];

    // Empty cells for days before start of month
    for (let i = 0; i < startDay; i++) {
      daysArray.push(<div key={`empty-${i}`} className="h-32 bg-slate-50 border-r border-b border-slate-200"></div>);
    }

    // Day cells
    for (let day = 1; day <= totalDays; day++) {
      const events = getEventsForDay(day);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

      daysArray.push(
        <div key={day} className={`h-32 border-r border-b border-slate-200 p-2 relative group hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}>
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                {day}
            </span>
            
            <div className="mt-1 space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                {events.map((event, idx) => (
                    <div 
                        key={`${event.type}-${event.id}`} 
                        className={`text-[10px] px-1.5 py-1 rounded border truncate cursor-help ${
                            event.type === 'commercial' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                        title={event.title}
                    >
                        {event.type === 'commercial' && <Clock size={10} className="inline mr-1" />}
                        {event.type === 'pendency' && <AlertTriangle size={10} className="inline mr-1" />}
                        {event.title}
                    </div>
                ))}
            </div>
        </div>
      );
    }

    return daysArray;
  };

  return (
    <div className="animate-in fade-in duration-500">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
                        <CalendarIcon className="text-blue-600" />
                        {monthYearString}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
                        Hoje
                    </button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {renderCalendarDays()}
            </div>
            
            {/* Legend */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                    <span>Prazo Obra (Comercial)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                    <span>Resolução Pendência</span>
                </div>
            </div>
        </div>
    </div>
  );
};
