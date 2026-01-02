import { GoogleGenAI } from "@google/genai";
import { DeliveryItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDeliveryReport = async (items: DeliveryItem[]): Promise<string> => {
  try {
    const dataSummary = JSON.stringify(items.map(i => ({
      status: i.status,
      date: i.issueDate,
      receiver: i.receiverName || "N/A"
    })));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze the following JSON data representing warehouse delivery items.
        
        Data: ${dataSummary}

        Please provide a concise, professional executive summary in Portuguese (pt-BR).
        Focus on:
        1. Completion rate (percentage of "Entregue").
        2. Any issues (high number of "Não Retirado" or Returns).
        3. A brief recommendation for the warehouse manager.
        
        Keep it under 100 words. Format as Markdown.
      `,
    });

    return response.text || "Não foi possível gerar o relatório no momento.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Erro ao conectar com a IA para gerar o relatório.";
  }
};