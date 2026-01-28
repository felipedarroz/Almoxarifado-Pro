
import { supabase } from './supabaseClient';
import { DeliveryItem, ProviderPendency, CommercialDemand, Technician } from '../types';

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
    adminStatus: data.admin_status || 'Aberto',
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
    client_name: data.client_name,
    project_name: data.project_name,
    salesperson_name: data.salesperson_name,
    project_code: data.project_code,
    observations: data.observations,
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
            .order('issue_date', { ascending: false })
            .order('invoice_number', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDeliveryToApp);
    },

    async getDeliveriesByDateRange(companyId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('company_id', companyId)
            .gte('issue_date', startDate)
            .lte('issue_date', endDate)
            .order('issue_date', { ascending: true });

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

    async getDemandsByDateRange(companyId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('commercial_demands')
            .select('*')
            .eq('company_id', companyId)
            .gte('request_date', startDate)
            .lte('request_date', endDate)
            .order('request_date', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapDemandToApp);
    },

    async createDemand(item: Omit<CommercialDemand, 'id'>, companyId: string) {
        const payload = {
            title: item.title,
            client_name: item.client_name,
            project_name: item.project_name,
            salesperson_name: item.salesperson_name,
            project_code: item.project_code,
            observations: item.observations,
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
            client_name: item.client_name,
            project_name: item.project_name,
            salesperson_name: item.salesperson_name,
            project_code: item.project_code,
            observations: item.observations,
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
    },

    // Users (Profiles)
    async getUsers(companyId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', companyId)
            .order('username', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async updateUserRole(id: string, role: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', id);

        if (error) throw error;
    },

    // Technicians
    async getTechnicians(companyId: string) {
        const { data, error } = await supabase
            .from('technicians')
            .select('*')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []) as Technician[];
    },

    async createTechnician(name: string, companyId: string) {
        const { data, error } = await supabase
            .from('technicians')
            .insert({ name, company_id: companyId })
            .select()
            .single();

        if (error) throw error;
        return data as Technician;
    },

    async deleteTechnician(id: string) {
        const { error } = await supabase.from('technicians').delete().eq('id', id);
        if (error) throw error;
    }
};
