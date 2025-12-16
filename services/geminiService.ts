import { GoogleGenAI } from "@google/genai";
import { VitalsResult } from "../types";

/**
 * AI Triage Service
 * 
 * Uses Google Gemini API to analyze vital signs and provide a triage report.
 */
export const generateTriageReport = async (vitals: VitalsResult): Promise<string> => {
  // Initialize the client with the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const rr = vitals.respiratoryRate ? `${vitals.respiratoryRate} BPM` : 'Not Measured';
  const hrv = vitals.hrv ? `${vitals.hrv} ms` : 'Not Measured';

  const prompt = `
    You are a medical triage assistant. Analyze the following vital signs and provide a brief assessment.
    
    Patient Vitals:
    - Heart Rate: ${vitals.heartRate} BPM
    - Respiratory Rate: ${rr}
    - HRV (Stress Index): ${hrv}
    - Signal Confidence: ${vitals.confidence}%
    
    Please provide a structured response in Markdown:
    1. Assessment: A summary of the patient's condition.
    2. Explanation: Analysis of the vital signs.
    3. Recommended Actions: Immediate advice or steps.
    4. Screening Questions: Follow-up questions to ask the patient.
    
    Disclaimer: This is for informational purposes only and does not replace professional medical advice.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Unable to generate triage report.";
};