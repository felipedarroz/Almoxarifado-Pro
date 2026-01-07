
import React, { useState, useEffect } from 'react';
import { DeliveryItem, DeliveryStatus, AdminStatus, UserRole } from '../types';
import { X, Save, Lock } from 'lucide-react';
import { generateId, parseDate } from '../utils';

interface DeliveryFormProps {
  initialData?: DeliveryItem;
  onSave: (item: DeliveryItem) => void;
  onCancel: () => void;
  userRole: UserRole;
  receivers?: string[];
  systemToday: string;
}

export const DeliveryForm: React.FC<DeliveryFormProps> = ({ initialData, onSave, onCancel, userRole, receivers = [], systemToday }) => {
  const [formData, setFormData] = useState<DeliveryItem>({
    id: '', // Será setado no mount se for novo
    invoiceNumber: '',
    issueDate: systemToday,
    deliveryDate: '',
    returnDate: '',
    status: DeliveryStatus.PENDING,
    adminStatus: AdminStatus.OPEN,
    receiverName: '',
    observations: ''
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      // Normaliza datas para YYYY-MM-DD para garantir que os inputs type="date" funcionem
      const normalize = (dateStr?: string) => {
        const d = parseDate(dateStr);
        return d ? d.toISOString().split('T')[0] : '';
      };

      setFormData({
        ...initialData,
        issueDate: normalize(initialData.issueDate) || systemToday,
        deliveryDate: normalize(initialData.deliveryDate),
        returnDate: normalize(initialData.returnDate),
        observations: initialData.observations || ''
      });
    } else {
      setFormData(prev => ({ ...prev, id: generateId() }));
    }
  }, [initialData, systemToday]);

  const isReceiverRequired = formData.status === DeliveryStatus.DELIVERED;

  // CORREÇÃO: Bloqueia NF e Data APENAS se estiver editando um item existente (preserva histórico).
  // Se for um novo cadastro, o Editor DEVE conseguir preencher.
  const isBaseInfoDisabled = !!initialData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do campo retirante é opcional aqui agora, pois pode ser editado na grid,
    // mas mantemos a regra se o usuário tentar salvar como 'Entregue' via formulário sem nome.
    if (isReceiverRequired && (!formData.receiverName || formData.receiverName.trim() === '')) {
      setError("O campo 'Técnico' é obrigatório quando o status é 'Entregue'.");
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">
            {initialData ? 'Editar Entrega' : 'Nova Entrega'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Nota Fiscal
                {isBaseInfoDisabled && <Lock size={12} className="text-slate-400" />}
              </label>
              <input
                type="text"
                required
                disabled={isBaseInfoDisabled}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${isBaseInfoDisabled
                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Ex: 12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Data de Emissão
                {isBaseInfoDisabled && <Lock size={12} className="text-slate-400" />}
              </label>
              <input
                type="date"
                required
                disabled={isBaseInfoDisabled}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${isBaseInfoDisabled
                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status da Entrega</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                value={formData.status}
                onChange={(e) => {
                  const newStatus = e.target.value as DeliveryStatus;
                  setFormData(prev => ({
                    ...prev,
                    status: newStatus,
                    // Se mudar para Não Retirado, limpamos o nome, senão mantemos o que estava
                    receiverName: newStatus === DeliveryStatus.NOT_RETRIEVED ? '' : prev.receiverName
                  }));
                  setError(null);
                }}
              >
                {Object.values(DeliveryStatus).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-slate-900"
                  value={formData.deliveryDate || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Devolução</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-slate-900"
                  value={formData.returnDate || ''}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                />
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Técnico
              </label>
              <select
                required={isReceiverRequired}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${isReceiverRequired && !formData.receiverName
                  ? 'border-red-300 focus:border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 focus:border-blue-500 bg-white text-slate-900'
                  }`}
                value={formData.receiverName || ''}
                onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
              >
                <option value="">Selecione o Técnico</option>
                {receivers.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                {!receivers.includes(formData.receiverName || '') && formData.receiverName && (
                  <option value={formData.receiverName}>{formData.receiverName}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Almoxarife)</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-24 resize-none bg-white text-slate-900"
              value={formData.observations || ''}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Descreva brevemente detalhes sobre a entrega ou devolução..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Save size={16} />
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
