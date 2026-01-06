
import React, { useState, useMemo, useEffect } from 'react';
import { Package, Plus, Search, Filter, FileDown, Sparkles, LogOut, LayoutDashboard, Lock, Unlock, AlertCircle, ClipboardList, Truck, Briefcase, Save as SaveIcon, CheckCircle, X, Download, Upload as UploadIcon, BarChart3, ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { DeliveryItem, DeliveryStatus, DeliveryFilter, User, UserRole, AdminStatus, ProviderPendency, CommercialDemand, DemandPriority } from './types';
import { StatusBadge } from './components/StatusBadge';
import { DeliveryForm } from './components/DeliveryForm';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { DashboardStats } from './components/DashboardStats';
import { PendencyPanel } from './components/PendencyPanel';
import { CommercialPanel } from './components/CommercialPanel';
import { CalendarView } from './components/CalendarView';
import { generateDeliveryReport } from './services/geminiService';
import { generateId } from './utils';
import { supabase } from './services/supabaseClient';
import { dataService } from './services/dataService';

// Chaves padrão para evitar perda de dados ao atualizar (LEGACY - Removing usage)
const STORAGE_KEYS = {
  DELIVERIES: 'almox_deliveries',
  PENDENCIES: 'almox_pendencies',
  COMMERCIAL: 'almox_commercial',
  USERS: 'almox_users',
  RECEIVERS: 'almox_receivers'
};

// Gera a data de hoje dinamicamente no formato YYYY-MM-DD
const getSystemToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SYSTEM_TODAY = getSystemToday();
const ITEMS_PER_PAGE = 50;

const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', role: UserRole.ADMIN, password: '1234' },
  { id: '2', username: 'editor', role: UserRole.EDITOR, password: '1234' },
  { id: '3', username: 'visualizador', role: UserRole.VIEWER, password: '1234' },
  { id: '4', username: 'gerente', role: UserRole.MANAGER, password: '1234' },
];

const INITIAL_RECEIVERS = ["ID GÁS", "R MARINHO", "STARGAZ", "VICENTE", "TÉCNICO PRÓPRIO", "JG"];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Users state is now only for admin panel viewing, fetched from profiles potentially,
  // but for now we'll keep it as local state or fetch it if needed.
  // We will remove the initial local users storage logic for auth purposes.
  const [users, setUsers] = useState<User[]>([]);
  const [receivers, setReceivers] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECEIVERS);
    return saved ? JSON.parse(saved) : INITIAL_RECEIVERS;
  });

  /* REMOVING LOCALSTORAGE INIT
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return saved ? JSON.parse(saved) : [];
  });
  */
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [pendencies, setPendencies] = useState<ProviderPendency[]>([]);
  const [commercialDemands, setCommercialDemands] = useState<CommercialDemand[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'deliveries' | 'pendencies' | 'commercial' | 'calendar'>('deliveries');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryItem | undefined>(undefined);
  const [filters, setFilters] = useState<DeliveryFilter>({
    invoiceNumber: '',
    startDate: '',
    endDate: '',
    status: '',
    adminStatus: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // REMOVED LocalStorage Sync Effect

  // Load Data Effect
  useEffect(() => {
    if (currentUser?.company_id) {
      loadData(currentUser.company_id);
    }
  }, [currentUser?.company_id]);

  const loadData = async (companyId: string) => {
    setSaveStatus('saving');
    try {
      const [del, pen, com] = await Promise.all([
        dataService.getDeliveries(companyId),
        dataService.getPendencies(companyId),
        dataService.getDemands(companyId)
      ]);
      setDeliveries(del);
      setPendencies(pen);
      setCommercialDemands(com);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados do servidor.");
    } finally {
      setSaveStatus('saved');
    }
  };

  // Supabase Auth and Profile Effect
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoadingSession(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setLoadingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setCurrentUser({
          id: data.id,
          username: data.username,
          role: data.role as UserRole,
          company: data.company,
          company_id: data.company_id
        });
        setShowDashboard(data.role !== UserRole.VIEWER);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingSession(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleManualSave = () => {
    if (currentUser?.company_id) loadData(currentUser.company_id);
  };

  const handleExportBackup = () => {
    const data = { deliveries, pendencies, commercialDemands, users, receivers };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_almox_pro_${SYSTEM_TODAY}.json`;
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.deliveries) setDeliveries(data.deliveries);
        if (data.pendencies) setPendencies(data.pendencies);
        if (data.commercialDemands) setCommercialDemands(data.commercialDemands);
        alert("Backup restaurado!");
      } catch (err) { alert("Erro ao importar."); }
    };
    reader.readAsText(file);
  };

  // handleRegister is no longer needed in App.tsx as Login handles it directly
  // But we might need to update the users list if we want to display them in AdminPanel.
  // For this 'EXECUTION' phase, we will focus on Auth. AdminPanel users list would need
  // a separate fetching mechanism from Supabase.

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(item => {
      const matchInvoice = item.invoiceNumber.toLowerCase().includes(filters.invoiceNumber.toLowerCase());
      const matchStatus = filters.status ? item.status === filters.status : true;
      const matchAdminStatus = filters.adminStatus ? item.adminStatus === filters.adminStatus : true;
      const matchStart = filters.startDate ? item.issueDate >= filters.startDate : true;
      const matchEnd = filters.endDate ? item.issueDate <= filters.endDate : true;
      return matchInvoice && matchStatus && matchStart && matchEnd && matchAdminStatus;
    });
  }, [deliveries, filters]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE);
  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSave = async (item: DeliveryItem) => {
    if (!currentUser?.company_id) return;
    setSaveStatus('saving');

    try {
      if (editingItem) {
        await dataService.updateDelivery(item);
        setDeliveries(prev => prev.map(d => d.id === item.id ? item : d));
      } else {
        const newItem = await dataService.createDelivery(item, currentUser.company_id);
        setDeliveries(prev => [newItem, ...prev]);
      }
      setIsFormOpen(false);
      setEditingItem(undefined);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar entrega.");
    } finally {
      setSaveStatus('saved');
    }
  };

  const handleUpdateReceiver = (id: string, newReceiver: string) => {
    setDeliveries(prev => prev.map(item =>
      item.id === id ? { ...item, receiverName: newReceiver } : item
    ));
  };

  const handleUpdateStatus = (id: string, newStatus: DeliveryStatus) => {
    setDeliveries(prev => prev.map(item =>
      item.id === id ? { ...item, status: newStatus } : item
    ));
  };

  const handleUpdateDeliveryDate = (id: string, newDate: string) => {
    setDeliveries(prev => prev.map(item =>
      item.id === id ? { ...item, deliveryDate: newDate } : item
    ));
  };

  const handleUpdateAdminStatus = (id: string, newStatus: AdminStatus) => {
    setDeliveries(prev => prev.map(item =>
      item.id === id ? { ...item, adminStatus: newStatus } : item
    ));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este registro permanentemente?')) {
      try {
        await dataService.deleteDelivery(id);
        setDeliveries(prev => prev.filter(d => d.id !== id));
      } catch (error) {
        console.error(error);
        alert("Erro ao excluir.");
      }
    }
  };

  const getStatusColorClass = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED: return 'text-green-700 bg-green-50 border-green-200';
      case DeliveryStatus.NOT_RETRIEVED: return 'text-red-700 bg-red-50 border-red-200';
      case DeliveryStatus.PARTIAL_RETURN: return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case DeliveryStatus.FULL_RETURN: return 'text-orange-700 bg-orange-50 border-orange-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  if (loadingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando sessão...</div>;
  }

  if (!currentUser) return (
    <Login
      onLoginSuccess={() => { }} // Session listener handles the state update
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-slate-900 shadow-md sticky top-0 z-30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg"><Package className="text-white w-6 h-6" /></div>
              <h1 className="text-xl font-bold text-white hidden sm:block">Almoxarifado Pro</h1>
            </div>
            <div onClick={handleManualSave} className="cursor-pointer text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
              {saveStatus === 'saved' ? <CheckCircle size={12} className="inline mr-1" /> : <SaveIcon size={12} className="inline mr-1 animate-spin" />}
              {saveStatus === 'saved' ? 'Sincronizado' : 'Salvando...'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right mr-3 hidden sm:block border-r border-slate-700 pr-4">
              <div className="text-xs text-slate-300 font-medium">{currentUser.username}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{currentUser.company || '...'}</div>
            </div>
            {isAdmin && (
              <div className="flex gap-1 border-r border-slate-700 pr-2 mr-2">
                <button onClick={handleExportBackup} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><Download size={18} /></button>
                <label className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                  <UploadIcon size={18} /><input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            )}
            {isAdmin && <button onClick={() => setShowAdminPanel(!showAdminPanel)} className={`p-2 rounded-lg transition-colors ${showAdminPanel ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Painel Administrativo"><LayoutDashboard size={20} /></button>}
            {!showAdminPanel && currentUser.role !== UserRole.VIEWER && (
              <button onClick={() => { setEditingItem(undefined); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-colors"><Plus size={20} /></button>
            )}
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showAdminPanel ? (
          <AdminPanel
            users={users}
            onUpdateUserRole={(id, role) => setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))}
            onImportData={async (items) => {
              if (!currentUser?.company_id) return;
              setSaveStatus('saving');
              try {
                const promises = items.map(item => dataService.createDelivery(item, currentUser.company_id!));
                const savedItems = await Promise.all(promises);
                setDeliveries(prev => [...savedItems, ...prev]);
                alert(`${savedItems.length} registros importados e salvos com sucesso!`);
              } catch (error) {
                console.error("Erro ao importar:", error);
                alert("Erro ao salvar dados importados.");
              } finally {
                setSaveStatus('saved');
                setShowAdminPanel(false);
              }
            }}
            onCreateUser={(u) => setUsers(prev => [...prev, u])}
            onDeleteUser={(id) => setUsers(prev => prev.filter(u => u.id !== id))}
            receivers={receivers}
            onAddReceiver={(r) => setReceivers(prev => [...prev, r])} // Keep local for now or move to DB later
            onDeleteReceiver={(r) => setReceivers(prev => prev.filter(x => x !== r))}
          />
        ) : (
          <>
            <div className="flex space-x-1 mb-6 bg-slate-200/50 p-1 rounded-xl w-fit">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  <BarChart3 size={16} />
                  Dashboard
                </button>
              )}
              <button onClick={() => setActiveTab('deliveries')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'deliveries' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Entregas</button>
              <button onClick={() => setActiveTab('pendencies')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pendencies' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Pendências</button>
              <button onClick={() => setActiveTab('commercial')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'commercial' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Comercial</button>
              <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>
                <CalendarRange size={16} /> Calendário
              </button>
            </div>

            {isAdmin && activeTab === 'dashboard' && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Painel de Controle</h2>
                  <p className="text-sm text-slate-500">Visão integrada dos módulos operacional, de pendências e comercial.</p>
                </div>
                <DashboardStats
                  items={deliveries}
                  commercialDemands={commercialDemands}
                  pendencies={pendencies}
                  systemToday={SYSTEM_TODAY}
                />
              </div>
            )}

            {activeTab === 'deliveries' && (
              <div className="animate-in fade-in duration-300">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative md:col-span-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="text" placeholder="Buscar NF..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white" value={filters.invoiceNumber} onChange={(e) => setFilters(prev => ({ ...prev, invoiceNumber: e.target.value }))} />
                    </div>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="">Status Entrega</option>
                      {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={filters.adminStatus} onChange={(e) => setFilters(prev => ({ ...prev, adminStatus: e.target.value }))}>
                      <option value="">Status Admin</option>
                      {Object.values(AdminStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-2 md:col-span-2">
                      <input type="date" className="w-1/2 px-2 py-2 border rounded-lg text-sm bg-white" title="Início Emissão" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                      <input type="date" className="w-1/2 px-2 py-2 border rounded-lg text-sm bg-white" title="Fim Emissão" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-800">Nota Fiscal</th>
                          <th className="px-4 py-3 font-bold text-slate-800">Emissão</th>
                          <th className="px-4 py-3 font-bold text-slate-800">Status</th>
                          <th className="px-4 py-3 font-bold text-slate-800 w-36">Data Entrega</th>
                          <th className="px-4 py-3 font-bold text-slate-800">Técnico</th>
                          <th className="px-4 py-3 font-bold text-slate-800">Finalização</th>
                          <th className="px-4 py-3 font-bold text-slate-800 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(item => {
                          // Garante que undefined seja tratado como 'Aberto'
                          const currentAdminStatus = item.adminStatus || AdminStatus.OPEN;
                          // Bloqueia edição se Status Admin não for 'Aberto' e usuário não for admin
                          const isLocked = currentAdminStatus !== AdminStatus.OPEN && !isAdmin;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-slate-900">{item.invoiceNumber}</td>
                              <td className="px-4 py-3 text-slate-500">{new Date(item.issueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                              <td className="px-4 py-3">
                                <select
                                  disabled={isLocked}
                                  value={item.status}
                                  onChange={(e) => handleUpdateStatus(item.id, e.target.value as DeliveryStatus)}
                                  className={`w-full max-w-[140px] px-2 py-1 text-xs border rounded-full font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-blue-200 ${getStatusColorClass(item.status)} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  disabled={isLocked}
                                  value={item.deliveryDate || ''}
                                  onChange={(e) => handleUpdateDeliveryDate(item.id, e.target.value)}
                                  className={`w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 text-slate-700 bg-white ${isLocked ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  disabled={isLocked}
                                  className={`w-full max-w-[180px] px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer ${isLocked ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-white'}`}
                                  value={item.receiverName || ''}
                                  onChange={(e) => handleUpdateReceiver(item.id, e.target.value)}
                                >
                                  <option value="">Selecione o Técnico...</option>
                                  {receivers.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  disabled={!isAdmin}
                                  className={`w-full max-w-[150px] px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer ${!isAdmin ? 'bg-slate-100 opacity-70 cursor-not-allowed' : 'bg-white'
                                    }`}
                                  value={currentAdminStatus}
                                  onChange={(e) => handleUpdateAdminStatus(item.id, e.target.value as AdminStatus)}
                                >
                                  {Object.values(AdminStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-3 font-medium">
                                  {isLocked ? (
                                    <span className="text-slate-400 text-xs flex items-center gap-1 cursor-not-allowed" title="Finalizado pelo Administrador">
                                      <Lock size={12} />
                                    </span>
                                  ) : (
                                    <button onClick={() => { setEditingItem(item); setIsFormOpen(true); }} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button>
                                  )}
                                  {isAdmin && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs">Excluir</button>}
                                </div>
                              </td>
                            </tr>
                          );
                        }) : <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">Sem registros.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION CONTROLS */}
                  {totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Mostrando <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredDeliveries.length)}</strong> de <strong>{filteredDeliveries.length}</strong> registros
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600'}`}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium text-slate-700">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600'}`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'pendencies' && (
              <PendencyPanel
                pendencies={pendencies}
                onAddPendency={async (p) => {
                  if (!currentUser.company_id) return;
                  try {
                    const saved = await dataService.createPendency(p, currentUser.company_id);
                    setPendencies(prev => [saved, ...prev]);
                  } catch (e) { console.error(e); alert('Erro ao salvar pendência'); }
                }}
                onUpdatePendency={async (p) => {
                  try {
                    await dataService.updatePendency(p);
                    setPendencies(prev => prev.map(old => old.id === p.id ? p : old));
                  } catch (e) { console.error(e); alert('Erro ao atualizar'); }
                }}
                onResolvePendency={async (id) => {
                  const item = pendencies.find(p => p.id === id);
                  if (item) {
                    const updated = { ...item, resolved: true };
                    try {
                      await dataService.updatePendency(updated);
                      setPendencies(prev => prev.map(p => p.id === id ? updated : p));
                    } catch (e) { console.error(e); }
                  }
                }}
                onDeletePendency={async (id) => {
                  if (confirm('Excluir pendência?')) {
                    try {
                      await dataService.deletePendency(id);
                      setPendencies(prev => prev.filter(p => p.id !== id));
                    } catch (e) { console.error(e); }
                  }
                }}
                userRole={currentUser.role}
              />
            )}
            {activeTab === 'commercial' && <CommercialPanel
              demands={commercialDemands}
              onAddDemand={async (d) => {
                if (!currentUser.company_id) return;
                try {
                  const saved = await dataService.createDemand(d, currentUser.company_id);
                  setCommercialDemands(prev => [saved, ...prev]);
                } catch (e) { console.error(e); alert("Erro ao salvar demanda"); }
              }}
              onUpdateDemand={async (d) => {
                try {
                  await dataService.updateDemand(d);
                  setCommercialDemands(prev => prev.map(x => x.id === d.id ? d : x));
                } catch (e) { console.error(e); }
              }}
              onCompleteDemand={async (id, date) => {
                const item = commercialDemands.find(d => d.id === id);
                if (item) {
                  const updated = { ...item, status: 'Concluído' as const, completionDate: date };
                  try {
                    await dataService.updateDemand(updated);
                    setCommercialDemands(prev => prev.map(d => d.id === id ? updated : d));
                  } catch (e) { console.error(e); }
                }
              }}
              onUpdateStatus={async (id, s) => {
                const item = commercialDemands.find(d => d.id === id);
                if (item) {
                  const updated = { ...item, status: s as any };
                  try {
                    await dataService.updateDemand(updated);
                    setCommercialDemands(prev => prev.map(d => d.id === id ? updated : d));
                  } catch (e) { console.error(e); }
                }
              }}
              onDeleteDemand={async (id) => {
                if (confirm('Excluir solicitação comercial?')) {
                  try {
                    await dataService.deleteDemand(id);
                    setCommercialDemands(prev => prev.filter(d => d.id !== id));
                  } catch (e) { console.error(e); }
                }
              }}
              userRole={currentUser.role}
              systemToday={SYSTEM_TODAY}
            />}

            {activeTab === 'calendar' && (
              <CalendarView
                commercialDemands={commercialDemands}
                pendencies={pendencies}
              />
            )}

          </>
        )}
      </main>

      {isFormOpen && <DeliveryForm initialData={editingItem} onSave={handleSave} onCancel={() => setIsFormOpen(false)} userRole={currentUser.role} receivers={receivers} systemToday={SYSTEM_TODAY} />}
    </div>
  );
}
