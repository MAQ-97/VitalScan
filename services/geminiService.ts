import { GoogleGenAI } from "@google/genai";
import { VitalsResult } from "../types";

export const generateTriageReport = async (vitals: VitalsResult): Promise<string> => {
  // Initialize the Gemini client with the API key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const { heartRate, respiratoryRate, hrv, confidence } = vitals;
  const rr = respiratoryRate || 0;
  const hrvVal = hrv || 0;

  const prompt = `
    Analyze the following vital signs collected via rPPG (remote photoplethysmography) and provide a clinical triage assessment.

    Patient Vitals:
    - Heart Rate: ${heartRate} BPM
    - Respiratory Rate: ${rr > 0 ? rr + ' breaths/min' : 'Not detected'}
    - Heart Rate Variability (HRV/SDNN): ${hrvVal > 0 ? hrvVal + ' ms' : 'Not detected'}
    - Signal Confidence: ${confidence}%

    Please generate a professional yet accessible response in Markdown format with the following sections:
    1. **Assessment**: A summary of the findings (e.g., Normal, Tachycardia, Bradycardia, etc.).
    2. **Explanation**: A detailed explanation of the vitals relative to standard resting ranges.
    3. **Recommended Actions**: A bulleted list of actionable advice for the user.
    4. **Screening Questions**: A list of follow-up questions to ask the patient to rule out common issues (dehydration, stress, etc.).

    Important:
    - If Signal Confidence is below 50%, explicitly warn that the results may be inaccurate due to lighting or movement and suggest retaking the scan.
    - If Heart Rate is significantly high (>100) or low (<60), prioritize medical advice in the actions.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};
