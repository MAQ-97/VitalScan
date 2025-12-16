import { GoogleGenAI } from "@google/genai";
import { VitalsResult } from "../types";

/**
 * AI Triage Service
 * 
 * Uses Google Gemini API to analyze vital signs and provide a wellness assessment.
 */
export const generateTriageReport = async (vitals: VitalsResult): Promise<string> => {
  // Initialize the Gemini client. 
  // The API key is obtained exclusively from process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const { heartRate, respiratoryRate, hrv, confidence } = vitals;

  const prompt = `
    Analyze the following vital signs data and provide a triage assessment report.

    Patient Vitals:
    - Heart Rate: ${heartRate} BPM
    - Respiratory Rate: ${respiratoryRate || 'N/A'} BPM
    - HRV (SDNN): ${hrv || 'N/A'} ms
    - Signal Confidence: ${confidence}%

    Please generate a report in Markdown format with the following structure:

    ### Assessment: [Status Summary]

    [Brief explanation of the findings]

    **Recorded Vitals:**
    *   **Heart Rate:** ${heartRate} BPM
    *   **Resp. Rate:** ${respiratoryRate ? respiratoryRate : '--'} BPM
    *   **Stress Index:** ${hrv ? hrv : '--'} ms
    *   **Signal Quality:** ${confidence}%

    ### Recommended Actions
    *   [Action 1]
    *   [Action 2]
    ...

    ### Screening Questions
    *   [Question 1]
    *   [Question 2]
    ...

    Note:
    - If signal confidence is low (<50%), strictly advise retaking the scan.
    - Provide a professional, reassuring, and objective assessment.
    - Do not act as a doctor or provide a medical diagnosis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful medical triage assistant. Your goal is to screen vital signs for potential issues. You are not a doctor. Always imply that these are screening results.",
        temperature: 0.7,
      },
    });

    return response.text || "No assessment generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
