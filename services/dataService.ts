
import { supabase } from './supabaseClient';
import { DeliveryItem, ProviderPendency, CommercialDemand } from '../types';

// Mappers
const mapDeliveryToApp = (data: any): DeliveryItem => ({
    id: data.id,
    invoiceNumber: data.invoice_number,
    issueDate: data.issue_date,
    deliveryDate: data.delivery_date,
    returnDate: data.return_date,
    status: data.status,
    receiverName: data.receiver_name,
    observations: data.observations,
    adminStatus: data.admin_status,
    company_id: data.company_id
});

const mapPendencyToApp = (data: any): ProviderPendency => ({
    id: data.id,
    providerName: data.provider_name,
    referenceNumber: data.reference_number,
    itemName: data.item_name,
    quantity: Number(data.quantity),
    reason: data.reason,
    date: data.date,
    expectedResolutionDate: data.expected_resolution_date,
    resolved: data.resolved,
    company_id: data.company_id
});

const mapDemandToApp = (data: any): CommercialDemand => ({
    id: data.id,
    title: data.title,
    requestDate: data.request_date,
    deadline: data.deadline,
    completionDate: data.completion_date,
    items: data.items,
    status: data.status,
    priority: data.priority,
    company_id: data.company_id
});

// Services
export const dataService = {
    // Deliveries
    async getDeliveries(companyId: string) {
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDeliveryToApp);
    },

    async createDelivery(item: Omit<DeliveryItem, 'id'>, companyId: string) {
        const payload = {
            invoice_number: item.invoiceNumber,
            issue_date: item.issueDate,
            delivery_date: item.deliveryDate,
            return_date: item.returnDate,
            status: item.status,
            receiver_name: item.receiverName,
            observations: item.observations,
            admin_status: item.adminStatus,
            company_id: companyId
        };

        const { data, error } = await supabase
            .from('deliveries')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return mapDeliveryToApp(data);
    },

    async updateDelivery(item: DeliveryItem) {
        const payload = {
            invoice_number: item.invoiceNumber,
            issue_date: item.issueDate,
            delivery_date: item.deliveryDate,
            return_date: item.returnDate,
            status: item.status,
            receiver_name: item.receiverName,
            observations: item.observations,
            admin_status: item.adminStatus
        };

        const { error } = await supabase
            .from('deliveries')
            .update(payload)
            .eq('id', item.id);

        if (error) throw error;
    },

    async deleteDelivery(id: string) {
        const { error } = await supabase.from('deliveries').delete().eq('id', id);
        if (error) throw error;
    },

    // Pendencies
    async getPendencies(companyId: string) {
        const { data, error } = await supabase
            .from('pendencies')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapPendencyToApp);
    },

    async createPendency(item: Omit<ProviderPendency, 'id'>, companyId: string) {
        const payload = {
            provider_name: item.providerName,
            reference_number: item.referenceNumber,
            item_name: item.itemName,
            quantity: item.quantity,
            reason: item.reason,
            date: item.date,
            expected_resolution_date: item.expectedResolutionDate,
            resolved: item.resolved,
            company_id: companyId
        };

        const { data, error } = await supabase
            .from('pendencies')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return mapPendencyToApp(data);
    },

    async updatePendency(item: ProviderPendency) {
        const payload = {
            provider_name: item.providerName,
            reference_number: item.referenceNumber,
            item_name: item.itemName,
            quantity: item.quantity,
            reason: item.reason,
            date: item.date,
            expected_resolution_date: item.expectedResolutionDate,
            resolved: item.resolved
        };

        const { error } = await supabase
            .from('pendencies')
            .update(payload)
            .eq('id', item.id);

        if (error) throw error;
    },

    async deletePendency(id: string) {
        const { error } = await supabase.from('pendencies').delete().eq('id', id);
        if (error) throw error;
    },

    // Commercial Demands
    async getDemands(companyId: string) {
        const { data, error } = await supabase
            .from('commercial_demands')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDemandToApp);
    },

    async createDemand(item: Omit<CommercialDemand, 'id'>, companyId: string) {
        const payload = {
            title: item.title,
            request_date: item.requestDate,
            deadline: item.deadline,
            completion_date: item.completionDate,
            items: item.items,
            status: item.status,
            priority: item.priority,
            company_id: companyId
        };

        const { data, error } = await supabase
            .from('commercial_demands')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return mapDemandToApp(data);
    },

    async updateDemand(item: CommercialDemand) {
        const payload = {
            title: item.title,
            request_date: item.requestDate,
            deadline: item.deadline,
            completion_date: item.completionDate,
            items: item.items,
            status: item.status,
            priority: item.priority
        };

        const { error } = await supabase
            .from('commercial_demands')
            .update(payload)
            .eq('id', item.id);

        if (error) throw error;
    },

    async deleteDemand(id: string) {
        const { error } = await supabase.from('commercial_demands').delete().eq('id', id);
        if (error) throw error;
    }
};
