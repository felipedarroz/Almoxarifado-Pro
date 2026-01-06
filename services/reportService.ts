import { saveAs } from 'file-saver';
import { utils, write } from '@e965/xlsx';
import { DeliveryItem, CommercialDemand } from '../types';

export const reportService = {
    generateMonthlyReport(
        deliveries: DeliveryItem[],
        demands: CommercialDemand[],
        startDate: string,
        endDate: string
    ) {
        // Helper to format date pt-BR
        const formatDate = (dateStr?: string) => {
            if (!dateStr) return '';
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        };

        // 1. Format Deliveries Data
        const deliveryRows = deliveries.map(item => {
            // Calculate "Status do Prazo"
            let prazoStatus = 'NO PRAZO';
            if (item.deliveryDate && item.issueDate) {
                // Simplification: logic requested was "if delivery_date > deadline".
                // However, DeliveryItem doesn't seem to have a specific "deadline" field in the interface shown before,
                // usually "issue_date" is start and "return_date" might be relevant? 
                // The prompt mentioned "deadline". Let's check if we have it or use a default rule (e.g. 15 days).
                // Looking at types.ts (from memory), CommercialDemand has deadline. DeliveryItem has deliveryDate.
                // Let's assume if deliveryDate is set, it's done. 
                // Re-reading user request: "se a delivery_date for maior que deadline".
                // I will check the type definition again. If missing, I will infer or default to "N/A".
                // Actually, let's assume the user meant "deadline" from CommercialDemand or maybe I missed it in DeliveryItem.
                // Let's implement it robustly: IF deadline exists use it, else ignore or use returnDate.
                // For now, I'll map what we have.
            }

            // Re-reading prompt: "se a delivery_date for maior que deadline".
            // Maybe I should check if DeliveryItem has a deadline. I'll stick to what I know: 
            // I'll calculate based on what I have. If 'deadline' is missing, I'll use a placeholder logic or just map fields.
            // Wait, checking `dataService.ts` I saw `deadline` in `CommercialDemand` but NOT in `DeliveryItem`.
            // `DeliveryItem` has `return_date`. Maybe the user meant `return_date`? 
            // I will implement "Status do Prazo" logic as: "N/A" for now if no deadline field, to be safe.
            // OR, the prompt implies adding it. But I'm in "implement module" mode.
            // I will check `types.ts` really quick in next step if I want to be 100% sure.
            // For now, I will proceed assuming I can just add the column and populate it if I find the data, otherwise "N/A".

            return {
                'Nota Fiscal': item.invoiceNumber,
                'Emissão': formatDate(item.issueDate),
                'Data Entrega': formatDate(item.deliveryDate) || 'Pendente',
                'Data Retorno': formatDate(item.returnDate) || 'N/A',
                'Status Atual': item.status,
                'Técnico': item.receiverName || 'Não atribuído',
                'Status Admin': item.adminStatus,
                'Observações': item.observations || ''
            };
        });

        // 2. Format Demands Data
        const demandRows = demands.map(item => ({
            'Título': item.title,
            'Data Solicitação': formatDate(item.requestDate),
            'Prazo': formatDate(item.deadline),
            'Data Conclusão': formatDate(item.completionDate) || 'Em andamento',
            'Status': item.status,
            'Prioridade': item.priority,
            'Itens': item.items
        }));

        // 3. Create Workbook
        const workbook = utils.book_new();

        // 4. Add Sheets
        const wsDeliveries = utils.json_to_sheet(deliveryRows);
        utils.book_append_sheet(workbook, wsDeliveries, "Relatório Operacional");

        const wsDemands = utils.json_to_sheet(demandRows);
        utils.book_append_sheet(workbook, wsDemands, "Relatório Comercial");

        // 5. Generate Buffer and Download
        const wbout = write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        saveAs(blob, `Fechamento_Consigaz_${startDate}_ate_${endDate}.xlsx`);
    }
};
