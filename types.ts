
export enum DeliveryStatus {
  PENDING = "Pendente",
  DELIVERED = "Entregue",
  NOT_RETRIEVED = "Não Retirado",
  PARTIAL_RETURN = "Devolvido Parcialmente",
  FULL_RETURN = "Devolvido Totalmente"
}

export enum AdminStatus {
  OPEN = "Aberto",
  FULFILLED = "Atendida",
  UNFULFILLED = "Não Atendida",
  CANCELED = "Cancelada"
}

export interface DeliveryItem {
  id: string;
  invoiceNumber: string; // Nota Fiscal
  issueDate: string; // Data de Emissão (ISO string YYYY-MM-DD)
  deliveryDate?: string; // Data de Entrega
  returnDate?: string; // Data de Devolução
  status: DeliveryStatus;
  receiverName?: string; // Nome do Retirante
  observations?: string; // Observações do Almoxarife
  adminStatus: AdminStatus; // Status de Fechamento Administrativo
}

export interface ProviderPendency {
  id: string;
  providerName: string; // Nome do Prestador
  referenceNumber: string; // OS ou NF
  itemName: string; // Item (ex: PI-0030)
  quantity: number; // Quantidade
  reason: string; // Motivo
  date: string; // Data do registro
  expectedResolutionDate?: string; // Data prevista para resolução
  resolved: boolean; // Se a pendência foi resolvida
}

export enum DemandPriority {
  LOW = "Baixa",
  MEDIUM = "Média",
  HIGH = "Alta",
  URGENT = "Urgente"
}

export interface CommercialDemand {
  id: string;
  title: string; // Ex: Obra Granja Viana
  requestDate: string; // Data do pedido
  deadline: string; // Data limite (Prazo esperado pelo comercial)
  completionDate?: string; // Data em que os materiais ficaram disponíveis (Realizado)
  items: string; // Lista de peças
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  priority: DemandPriority;
}

export type DeliveryFilter = {
  invoiceNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  adminStatus: string;
};

export enum UserRole {
  ADMIN = "Administrador",
  MANAGER = "Gerente",
  EDITOR = "Editor",
  VIEWER = "Visualizador"
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
  company?: string;
  company_id?: string;
}
