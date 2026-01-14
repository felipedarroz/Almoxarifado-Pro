import React, { useState, useMemo, useEffect, useTransition } from 'react';

import { Package, Plus, Search, Filter, FileDown, Sparkles, LogOut, LayoutDashboard, Lock, Unlock, AlertCircle, ClipboardList, Truck, Briefcase, Save as SaveIcon, CheckCircle, X, Download, Upload as UploadIcon, BarChart3, ChevronLeft, ChevronRight, CalendarRange, FileText, PieChart, Clock } from 'lucide-react';
import { DeliveryItem, DeliveryStatus, DeliveryFilter, User, UserRole, UserStatus, AdminStatus, ProviderPendency, CommercialDemand, DemandPriority, Technician } from './types';
import { StatusBadge } from './components/StatusBadge';
import { AnalyticsView } from './components/AnalyticsView';
import { DeliveryForm } from './components/DeliveryForm';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { DashboardStats } from './components/DashboardStats';
import { PendencyPanel } from './components/PendencyPanel';
import { CommercialPanel } from './components/CommercialPanel';
import { CalendarView } from './components/CalendarView';
import { generateDeliveryReport } from './services/geminiService';
import { generateId, formatDate } from './utils';
import { supabase } from './services/supabaseClient';
import { dataService } from './services/dataService';
import { ReportsModal } from './components/ReportsModal';

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
  const [isPending, startTransition] = useTransition();

  // Users state is now only for admin panel viewing, fetched from profiles potentially,
  // but for now we'll keep it as local state or fetch it if needed.
  // We will remove the initial local users storage logic for auth purposes.
  const [users, setUsers] = useState<User[]>([]);
  // Receivers now store Technicians (objects)
  const [receivers, setReceivers] = useState<Technician[]>([]);

  /* REMOVING LOCALSTORAGE INIT
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return saved ? JSON.parse(saved) : [];
  });
  */
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [pendencies, setPendencies] = useState<ProviderPendency[]>([]);
  const [commercialDemands, setCommercialDemands] = useState<CommercialDemand[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'deliveries' | 'pendencies' | 'commercial' | 'calendar' | 'admin'>('deliveries');
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


  const [showDashboard, setShowDashboard] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showReportsModal, setShowReportsModal] = useState(false);

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
      const [del, pen, com, techs] = await Promise.all([
        dataService.getDeliveries(companyId),
        dataService.getPendencies(companyId),
        dataService.getDemands(companyId),
        dataService.getTechnicians(companyId)
      ]);
      setDeliveries(del);
      setPendencies(pen);
      setCommercialDemands(com);
      setReceivers(techs);

      // If admin, fetch users too
      if (currentUser?.role === UserRole.ADMIN) {
        dataService.getUsers(companyId).then(u => setUsers(u)).catch(err => console.error("Erro ao carregar usuários:", err));
      }

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
          company_id: data.company_id,
          status: data.status
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
  const isManager = currentUser?.role === UserRole.MANAGER;
  const isEditor = currentUser?.role === UserRole.EDITOR;
  const isCommercial = currentUser?.role === UserRole.COMMERCIAL;

  const canViewDashboard = isAdmin || isManager || isEditor || isCommercial;
  const canEdit = isAdmin || isEditor;

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
    }).sort((a, b) => {
      // 1. Sort by Date Descending
      if (a.issueDate > b.issueDate) return -1;
      if (a.issueDate < b.issueDate) return 1;
      // 2. Sort by Invoice Number Descending
      return b.invoiceNumber.localeCompare(a.invoiceNumber, undefined, { numeric: true });
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

  const handleUpdateReceiver = async (id: string, newReceiver: string) => {
    const item = deliveries.find(d => d.id === id);
    if (!item) return;
    const updated = { ...item, receiverName: newReceiver };

    setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
    try {
      await dataService.updateDelivery(updated);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar técnico.');
      setDeliveries(prev => prev.map(d => d.id === id ? item : d));
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: DeliveryStatus) => {
    const item = deliveries.find(d => d.id === id);
    if (!item) return;
    const updated = { ...item, status: newStatus };

    setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
    try {
      await dataService.updateDelivery(updated);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status.');
      setDeliveries(prev => prev.map(d => d.id === id ? item : d));
    }
  };

  const handleUpdateAdminStatus = async (id: string, newStatus: AdminStatus) => {
    const item = deliveries.find(d => d.id === id);
    if (!item) return;
    const updated = { ...item, adminStatus: newStatus };

    setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
    try {
      await dataService.updateDelivery(updated);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status administrativo.');
      setDeliveries(prev => prev.map(d => d.id === id ? item : d));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedDeliveries.map(d => d.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedItems(newSelected);
  };

  const handleBulkStatusUpdate = async (newStatus: DeliveryStatus) => {
    if (!currentUser?.company_id) return;
    setSaveStatus('saving');
    const itemsToUpdate = deliveries.filter(d => selectedItems.has(d.id));

    try {
      const promises = itemsToUpdate.map(item => {
        const updated = { ...item, status: newStatus };
        return dataService.updateDelivery(updated);
      });

      await Promise.all(promises);

      setDeliveries(prev => prev.map(d => selectedItems.has(d.id) ? { ...d, status: newStatus } : d));
      setSelectedItems(new Set());
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status em lote.');
    } finally {
      setSaveStatus('saved');
    }
  };

  const handleBulkAdminStatusUpdate = async (newStatus: AdminStatus) => {
    if (!currentUser?.company_id || !isAdmin) return;
    setSaveStatus('saving');
    const itemsToUpdate = deliveries.filter(d => selectedItems.has(d.id));

    try {
      const promises = itemsToUpdate.map(item => {
        const updated = { ...item, adminStatus: newStatus };
        return dataService.updateDelivery(updated);
      });

      await Promise.all(promises);

      setDeliveries(prev => prev.map(d => selectedItems.has(d.id) ? { ...d, adminStatus: newStatus } : d));
      setSelectedItems(new Set());
      alert('Status administrativo atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status administrativo em lote.');
    } finally {
      setSaveStatus('saved');
    }
  };

  const handleUpdateDeliveryDate = async (id: string, newDate: string) => {
    const item = deliveries.find(d => d.id === id);
    if (!item) return;
    const updated = { ...item, deliveryDate: newDate };

    setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
    try {
      await dataService.updateDelivery(updated);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar data.');
      setDeliveries(prev => prev.map(d => d.id === id ? item : d));
    }
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

  // Block pending users
  if (currentUser.status === UserStatus.PENDING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Cadastro em Análise</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Seu cadastro foi recebido com sucesso e está aguardando aprovação do administrador.
            <br />
            Você receberá um e-mail assim que seu acesso for liberado.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <LogOut size={16} />
            Sair e tentar novamente mais tarde
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="flex flex-col items-start px-6 py-8 border-b border-slate-800">
          <div className="flex flex-col items-start gap-1 mb-2">
            <h1 className="text-4xl font-black text-white tracking-wider leading-none">PRUMO</h1>
            <span className="text-[10px] text-slate-400 font-bold tracking-[0.15em] uppercase whitespace-nowrap">Gestor de Processos</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Menu Principal</p>

          {!isCommercial && (
            <>
              <button
                onClick={() => startTransition(() => setActiveTab('deliveries'))}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'deliveries' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                <Truck size={18} className={activeTab === 'deliveries' ? 'text-blue-400' : 'text-slate-500'} />
                Entregas
              </button>

              <button
                onClick={() => startTransition(() => setActiveTab('pendencies'))}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'pendencies' ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                <ClipboardList size={18} className={activeTab === 'pendencies' ? 'text-orange-400' : 'text-slate-500'} />
                Pendências
              </button>
            </>
          )}

          <button
            onClick={() => startTransition(() => setActiveTab('commercial'))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'commercial' ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            <Briefcase size={18} className={activeTab === 'commercial' ? 'text-purple-400' : 'text-slate-500'} />
            Comercial
          </button>

          <button
            onClick={() => startTransition(() => setActiveTab('calendar'))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'calendar' ? 'bg-teal-600/10 text-teal-400 border border-teal-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            <CalendarRange size={18} className={activeTab === 'calendar' ? 'text-teal-400' : 'text-slate-500'} />
            Calendário
          </button>

          {canViewDashboard && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Administração</p>
                <button
                  onClick={() => startTransition(() => setActiveTab('dashboard'))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  <BarChart3 size={18} className={activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'} />
                  Dashboard
                </button>

                <button
                  onClick={() => startTransition(() => setActiveTab('analytics'))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'analytics' ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  <PieChart size={18} className={activeTab === 'analytics' ? 'text-purple-400' : 'text-slate-500'} />
                  Analytics
                </button>

                {isAdmin && (
                  <button
                    onClick={() => startTransition(() => setActiveTab('admin'))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'admin' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    <LayoutDashboard size={18} className={activeTab === 'admin' ? 'text-indigo-400' : 'text-slate-500'} />
                    Painel Admin
                  </button>
                )}
              </div>
            </>
          )}

          {(isAdmin || isManager || isEditor) && (
            <button
              onClick={() => setShowReportsModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all duration-200"
            >
              <FileText size={18} className="text-slate-500" />
              Relatórios
            </button>
          )}

        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div onClick={handleManualSave} className="mb-4 cursor-pointer text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
            {saveStatus === 'saved' ? <CheckCircle size={12} className="text-emerald-500" /> : <SaveIcon size={12} className="animate-spin text-blue-500" />}
            <span>{saveStatus === 'saved' ? 'Sistema Sincronizado' : 'Salvando alterações...'}</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.company || '...'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">

            <button onClick={() => supabase.auth.signOut()} className="col-span-2 flex items-center justify-center gap-2 w-full p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors text-xs font-medium">
              <LogOut size={14} /> Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-md">
          <div className="flex items-center gap-2">
            <Package className="text-blue-500 w-6 h-6" />
            <h1 className="font-bold">Almoxarifado Pro</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()}><LogOut size={20} /></button>
        </div>

        {/* Mobile Nav (Horizontal Scroll) */}
        {activeTab !== 'admin' && (
          <div className="md:hidden bg-white border-b border-slate-200 overflow-x-auto">
            <div className="flex space-x-1 p-2 min-w-max">
              {!isCommercial && (
                <>
                  <button onClick={() => startTransition(() => setActiveTab('deliveries'))} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'deliveries' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}>Entregas</button>
                  <button onClick={() => startTransition(() => setActiveTab('pendencies'))} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'pendencies' ? 'bg-orange-50 text-orange-600' : 'text-slate-600'}`}>Pendências</button>
                </>
              )}
              <button onClick={() => startTransition(() => setActiveTab('commercial'))} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'commercial' ? 'bg-purple-50 text-purple-600' : 'text-slate-600'}`}>Comercial</button>
              {canViewDashboard && <button onClick={() => startTransition(() => setActiveTab('dashboard'))} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}>Dashboard</button>}
            </div>
          </div>
        )}

        {/* Content Top Bar (Desktop) */}
        {/* Content Top Bar (Desktop) */}
        <header className={`hidden md:flex items-center justify-between px-8 py-5 backdrop-blur-sm sticky top-0 z-20 transition-colors duration-300 ${activeTab === 'dashboard' ? 'bg-indigo-50/80 border-b border-indigo-100' :
          activeTab === 'analytics' ? 'bg-purple-50/80 border-b border-purple-100' :
            activeTab === 'deliveries' ? 'bg-blue-50/80 border-b border-blue-100' :
              activeTab === 'pendencies' ? 'bg-orange-50/80 border-b border-orange-100' :
                activeTab === 'commercial' ? 'bg-purple-50/80 border-b border-purple-100' :
                  activeTab === 'calendar' ? 'bg-teal-50/80 border-b border-teal-100' :
                    activeTab === 'admin' ? 'bg-slate-200/80 border-b border-slate-300' :
                      'bg-slate-50/50'
          }`}>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${activeTab === 'dashboard' ? 'text-indigo-900' :
              activeTab === 'analytics' ? 'text-purple-900' :
                activeTab === 'deliveries' ? 'text-blue-900' :
                  activeTab === 'pendencies' ? 'text-orange-900' :
                    activeTab === 'commercial' ? 'text-purple-900' :
                      activeTab === 'calendar' ? 'text-teal-900' :
                        activeTab === 'admin' ? 'text-slate-900' :
                          'text-slate-800'
              }`}>
              {activeTab === 'dashboard' && 'Dashboard Gerencial'}
              {activeTab === 'analytics' && 'Análise de Dados'}
              {activeTab === 'deliveries' && 'Controle de Entregas'}
              {activeTab === 'pendencies' && 'Quadro de Pendências'}
              {activeTab === 'commercial' && 'Gestão Comercial'}
              {activeTab === 'calendar' && 'Calendário Operacional'}
              {activeTab === 'admin' && 'Painel Administrativo'}
            </h2>
            <p className={`text-sm font-medium mt-1 transition-colors duration-300 ${activeTab === 'dashboard' ? 'text-indigo-600/80' :
              activeTab === 'analytics' ? 'text-purple-600/80' :
                activeTab === 'deliveries' ? 'text-blue-600/80' :
                  activeTab === 'pendencies' ? 'text-orange-600/80' :
                    activeTab === 'commercial' ? 'text-purple-600/80' :
                      activeTab === 'calendar' ? 'text-teal-600/80' :
                        activeTab === 'admin' ? 'text-slate-600/80' :
                          'text-slate-500'
              }`}>
              {activeTab === 'dashboard' && 'Visão geral dos indicadores de performance'}
              {activeTab === 'analytics' && 'Métricas detalhadas e relatórios estatísticos'}
              {activeTab === 'deliveries' && 'Gerencie todas as notas fiscais e entregas'}
              {activeTab === 'pendencies' && 'Acompanhe pendências com fornecedores'}
              {activeTab === 'commercial' && 'Pipeline de solicitações e orçamentos'}
              {activeTab === 'calendar' && 'Agenda de entregas e prazos importantes'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Actions can go here */}
            {activeTab === 'deliveries' && !showReportsModal && canEdit && (
              <button
                onClick={() => { setEditingItem(undefined); setIsFormOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all font-medium active:scale-95"
              >
                <Plus size={18} />
                <span>Novo Item</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 pb-20 scroll-smooth">
          {activeTab === 'admin' ? (
            <AdminPanel
              users={users}
              onUpdateUserRole={async (id, role) => {
                try {
                  await dataService.updateUserRole(id, role);
                  setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
                  alert('Função atualizada com sucesso!');
                } catch (e) {
                  console.error(e);
                  alert('Erro ao atualizar função do usuário.');
                }
              }}
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
                  setActiveTab('deliveries');
                }
              }}
              onCreateUser={(u) => { alert('Criação de usuários desabilitada. Utilize o painel externo.'); }}
              onDeleteUser={(id) => { alert('Remoção de usuários desabilitada. Utilize o painel externo.'); }}
              receivers={receivers.map(r => r.name)}
              technicians={receivers}
              onAddReceiver={async (name) => {
                if (!currentUser?.company_id) return;
                try {
                  const newTech = await dataService.createTechnician(name, currentUser.company_id);
                  setReceivers(prev => [...prev, newTech]);
                } catch (e) { console.error(e); alert('Erro ao adicionar técnico.'); }
              }}
              onDeleteReceiver={async (name) => {
                const tech = receivers.find(t => t.name === name);
                if (tech) {
                  try {
                    await dataService.deleteTechnician(tech.id);
                    setReceivers(prev => prev.filter(t => t.id !== tech.id));
                  } catch (e) { console.error(e); alert('Erro ao remover técnico.'); }
                }
              }}
            />
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">

              {canViewDashboard && activeTab === 'dashboard' && (
                <div className="animate-in fade-in duration-300">
                  <DashboardStats
                    items={deliveries}
                    commercialDemands={commercialDemands}
                    pendencies={pendencies}
                    systemToday={SYSTEM_TODAY}
                  />
                </div>
              )}

              {canViewDashboard && activeTab === 'analytics' && (
                <AnalyticsView deliveries={deliveries} commercialDemands={commercialDemands} />
              )}

              {activeTab === 'deliveries' && (
                <div className="animate-in fade-in duration-300">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="Buscar NF..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={filters.invoiceNumber} onChange={(e) => setFilters(prev => ({ ...prev, invoiceNumber: e.target.value }))} />
                      </div>
                      <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                        <option value="">Status Entrega</option>
                        {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={filters.adminStatus} onChange={(e) => setFilters(prev => ({ ...prev, adminStatus: e.target.value }))}>
                        <option value="">Status Admin</option>
                        {Object.values(AdminStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="flex gap-2 md:col-span-2">
                        <input type="date" className="w-1/2 px-2 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" title="Início Emissão" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                        <input type="date" className="w-1/2 px-2 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" title="Fim Emissão" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {/* BULK ACTIONS BAR */}
                    {selectedItems.size > 0 && (
                      <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <span className="font-bold">{selectedItems.size}</span> itens selecionados
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="text-xs border-blue-200 rounded-lg px-2 py-1.5 focus:ring-blue-500 bg-white"
                            onChange={(e) => {
                              if (e.target.value) handleBulkStatusUpdate(e.target.value as DeliveryStatus);
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Alterar Status Entrega...</option>
                            {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>

                          {isAdmin && (
                            <select
                              className="text-xs border-blue-200 rounded-lg px-2 py-1.5 focus:ring-blue-500 bg-white"
                              onChange={(e) => {
                                if (e.target.value) handleBulkAdminStatusUpdate(e.target.value as AdminStatus);
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>Alterar Finalização...</option>
                              {Object.values(AdminStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}

                          <button onClick={() => setSelectedItems(new Set())} className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2">Cancelar</button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-4 py-3 w-8 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={paginatedDeliveries.length > 0 && paginatedDeliveries.every(d => selectedItems.has(d.id))}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                              />
                            </th>
                            <th className="px-4 py-3 font-bold text-slate-800 text-center">Nota Fiscal</th>
                            <th className="px-4 py-3 font-bold text-slate-800 text-center">Emissão</th>
                            <th className="px-4 py-3 font-bold text-slate-800 text-center">Status</th>
                            <th className="px-4 py-3 font-bold text-slate-800 w-36 text-center">Data Entrega</th>
                            <th className="px-4 py-3 font-bold text-slate-800 text-center">Técnico</th>
                            <th className="px-4 py-3 font-bold text-slate-800 text-center">Finalização</th>
                            <th className="px-4 py-3 font-bold text-slate-800 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(item => {
                            const currentAdminStatus = item.adminStatus || AdminStatus.OPEN;
                            const isLocked = currentAdminStatus !== AdminStatus.OPEN && !isAdmin;
                            const isReadOnly = !canEdit;

                            return (
                              <tr key={item.id} className={`hover:bg-slate-50 ${selectedItems.has(item.id) ? 'bg-blue-50/50' : ''}`}>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedItems.has(item.id)}
                                    onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                                  />
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-900 text-center">{item.invoiceNumber}</td>
                                <td className="px-4 py-3 text-slate-500 text-center">{formatDate(item.issueDate)}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center">
                                    <select
                                      disabled={isLocked || isReadOnly}
                                      value={item.status}
                                      onChange={(e) => handleUpdateStatus(item.id, e.target.value as DeliveryStatus)}
                                      className={`w-full max-w-[140px] px-2 py-1 text-xs border rounded-full font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-blue-200 ${getStatusColorClass(item.status)} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                      {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="date"
                                    disabled={isLocked || isReadOnly}
                                    value={item.deliveryDate || ''}
                                    onChange={(e) => handleUpdateDeliveryDate(item.id, e.target.value)}
                                    className={`w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 text-slate-700 bg-white ${isLocked ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''}`}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <select
                                    disabled={isLocked || isReadOnly}
                                    className={`w-full max-w-[180px] px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer ${isLocked ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-white'}`}
                                    value={item.receiverName || ''}
                                    onChange={(e) => handleUpdateReceiver(item.id, e.target.value)}
                                  >
                                    <option value="">Selecione o Técnico...</option>
                                    {receivers.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-center">
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
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center gap-3 font-medium">
                                    {isLocked ? (
                                      <span className="text-slate-400 text-xs flex items-center gap-1 cursor-not-allowed" title="Finalizado pelo Administrador">
                                        <Lock size={12} />
                                      </span>
                                    ) : (
                                      canEdit && <button onClick={() => { setEditingItem(item); setIsFormOpen(true); }} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button>
                                    )}
                                    {isAdmin && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs">Excluir</button>}
                                  </div>
                                </td>
                              </tr>
                            );
                          }) : <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400 italic">Sem registros.</td></tr>}
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

            </div>
          )}
        </main>

        {isFormOpen && <DeliveryForm initialData={editingItem} onSave={handleSave} onCancel={() => setIsFormOpen(false)} userRole={currentUser.role} receivers={receivers.map(r => r.name)} systemToday={SYSTEM_TODAY} />}

        <ReportsModal
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
          companyId={currentUser.company_id || ''}
        />
      </div>
    </div>
  );
}
