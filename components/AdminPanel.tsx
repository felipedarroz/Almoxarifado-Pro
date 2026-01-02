
import React, { useState, useRef } from 'react';
import { User, UserRole, DeliveryItem, DeliveryStatus, AdminStatus } from '../types';
import { Upload, UserCog, Save, Plus, Trash2, Key, FileSpreadsheet, AlertCircle, Settings, Truck } from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { generateId } from '../utils';


interface AdminPanelProps {
  users: User[];
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onImportData: (items: DeliveryItem[]) => void;
  onCreateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  receivers?: string[];
  onAddReceiver?: (name: string) => void;
  onDeleteReceiver?: (name: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  onUpdateUserRole,
  onImportData,
  onCreateUser,
  onDeleteUser,
  receivers = [],
  onAddReceiver,
  onDeleteReceiver
}) => {
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'import' | 'users' | 'config'>('import');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  // New User State
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.VIEWER });
  const [newReceiver, setNewReceiver] = useState('');

  const processImportedData = (data: any[]) => {
    try {
      const newItems: DeliveryItem[] = data.map((row: any) => {
        const invoice = row['Nota Fiscal'] || row['NF'] || row['Nota'] || row['Invoice'] || Object.values(row)[0];
        let dateStr = new Date().toISOString().split('T')[0];
        const rawDate = row['Data de Emissão'] || row['Data'] || row['Emissão'] || row['Issue Date'] || Object.values(row)[1];

        if (rawDate) {
          if (typeof rawDate === 'number') {
            const date = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
            dateStr = date.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string') {
            if (rawDate.includes('/')) {
              const parts = rawDate.split('/');
              if (parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString().split('T')[0];
            }
          }
        }

        return {
          id: generateId(),
          invoiceNumber: String(invoice || 'UNKNOWN'),
          issueDate: dateStr,
          status: DeliveryStatus.PENDING,
          adminStatus: AdminStatus.OPEN,
          receiverName: '',
          observations: ''
        };
      }).filter(i => i.invoiceNumber !== 'UNKNOWN' && i.invoiceNumber !== 'undefined');

      if (newItems.length > 0) {
        onImportData(newItems);
        setImportStatus(`Sucesso! ${newItems.length} registros importados.`);
        setTimeout(() => setImportStatus(''), 5000);
      } else {
        setImportStatus('Erro: Nenhum dado válido encontrado na planilha.');
      }
    } catch (error) {
      console.error(error);
      setImportStatus('Erro ao processar dados. Verifique o formato.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Lendo arquivo...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      processImportedData(jsonData);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      setImportStatus('Erro ao ler arquivo Excel. Verifique se o arquivo não está corrompido.');
    }
  };

  const handleTextImport = () => {
    const lines = importText.trim().split('\n');
    const data = lines.map(line => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      return { 'Nota Fiscal': parts[0]?.trim(), 'Data de Emissão': parts[1]?.trim() };
    });
    processImportedData(data);
    setImportText('');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.username && newUser.password) {
      onCreateUser({
        id: generateId(),
        username: newUser.username,
        password: newUser.password,
        role: newUser.role
      });
      setNewUser({ username: '', password: '', role: UserRole.VIEWER });
    }
  };

  const handleAddReceiverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReceiver.trim() && onAddReceiver) {
      onAddReceiver(newReceiver.trim());
      setNewReceiver('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 min-w-[150px] py-3 px-4 text-sm font-medium text-center transition-colors ${activeTab === 'import' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Upload size={16} />
            Importar Dados
          </div>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[150px] py-3 px-4 text-sm font-medium text-center transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserCog size={16} />
            Gerenciar Usuários
          </div>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 min-w-[150px] py-3 px-4 text-sm font-medium text-center transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Settings size={16} />
            Opções Retirantes
          </div>
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-center">
              <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Upload de Arquivo Excel</h3>
              <p className="text-xs text-slate-500 mb-4">Suporta .xlsx, .xls e .csv. O sistema identificará "Nota Fiscal" e "Data de Emissão".</p>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" id="excel-upload" onChange={handleFileUpload} ref={fileInputRef} />
              <label htmlFor="excel-upload" className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block">Selecionar Arquivo</label>
            </div>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs">OU CÓDIGO MANUAL (CSV)</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <div>
              <textarea
                className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                placeholder={`NF-1001, 2023-11-01\nNF-1002, 2023-11-02`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button onClick={handleTextImport} className="mt-2 px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
                <Save size={16} /> Processar Texto
              </button>
            </div>
            {importStatus && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${importStatus.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <AlertCircle size={16} /> {importStatus}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Plus size={16} /> Adicionar Novo Usuário
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" placeholder="Nome de Usuário" className="px-3 py-2 border border-slate-300 rounded text-sm bg-white text-slate-900" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                <input type="password" placeholder="Senha" className="px-3 py-2 border border-slate-300 rounded text-sm bg-white text-slate-900" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                <select className="px-3 py-2 border border-slate-300 rounded text-sm bg-white text-slate-900" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                  {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors">Criar</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-medium text-slate-800">Usuário</th>
                    <th className="px-4 py-2 font-medium text-slate-800">Senha</th>
                    <th className="px-4 py-2 font-medium text-slate-800">Permissão</th>
                    <th className="px-4 py-2 font-medium text-slate-800 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                      <td className="px-4 py-3 flex items-center gap-1 text-xs text-slate-400"><Key size={12} /> ••••••</td>
                      <td className="px-4 py-3">
                        <select value={user.role} onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)} className="bg-white border border-slate-300 text-slate-700 text-xs rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none" disabled={user.username === 'admin'}>
                          {Object.values(UserRole).map(role => (<option key={role} value={role}>{role}</option>))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.username !== 'admin' && (
                          <button onClick={() => onDeleteUser(user.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Truck size={16} className="text-blue-600" /> Gerenciar Lista de Retirantes
              </h3>
              <form onSubmit={handleAddReceiverSubmit} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Novo Retirante (Ex: VICENTE)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                  value={newReceiver}
                  onChange={e => setNewReceiver(e.target.value.toUpperCase())}
                  required
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded text-sm font-medium transition-colors flex items-center gap-1">
                  <Plus size={16} /> Adicionar
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {receivers.map((receiver) => (
                  <div key={receiver} className="bg-white border border-slate-200 px-3 py-2 rounded flex justify-between items-center group">
                    <span className="text-sm font-medium text-slate-700">{receiver}</span>
                    <button
                      onClick={() => onDeleteReceiver && onDeleteReceiver(receiver)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
