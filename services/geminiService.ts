import { GoogleGenAI } from "@google/genai";
import { VitalsResult } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateTriageReport = async (vitals: VitalsResult) => {
  try {
    const ai = initGenAI();
    
    const prompt = `
      You are an AI medical assistant for a rural clinic in Africa. 
      Analyze the following patient vitals collected via rPPG (contactless face scan):
      
      Heart Rate: ${vitals.heartRate} BPM
      Respiratory Rate: ${vitals.respiratoryRate || 'N/A'} BPM
      Stress Index (HRV): ${vitals.hrv || 'N/A'} ms
      Signal Confidence: ${vitals.confidence}%
      
      Instructions:
      1. Provide a brief assessment (Normal, Elevated, Low).
      2. Suggest immediate next steps for the nurse/clinician.
      3. Ask 3 relevant follow-up questions to ask the patient based on these vitals.
      
      Keep the tone professional, supportive, and concise. Do not make a definitive medical diagnosis.
      Output format: Plain text with clear headers.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Triage Error:", error);
    return "Unable to generate AI triage report at this time. Please proceed with standard manual triage protocols.";
  }
};