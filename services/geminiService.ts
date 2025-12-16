import { VitalsResult } from "../types";

/**
 * OFFLINE TRIAGE PROTOCOL
 * 
 * This service replaces the cloud-based AI with a deterministic rule-based system.
 * It runs entirely on-device with no external API calls.
 */

export const generateTriageReport = async (vitals: VitalsResult): Promise<string> => {
  // Simulate a brief "analysis" delay for UX consistency
  await new Promise(resolve => setTimeout(resolve, 1500));

  const { heartRate, respiratoryRate, hrv, confidence } = vitals;
  const rr = respiratoryRate || 0;
  const hrvVal = hrv || 0;

  // --- Rule-Based Assessment Logic ---
  let assessment = "Normal Vitals";
  let explanation = "Vital signs are within standard resting ranges for an adult.";
  const actions: string[] = [];
  const questions: string[] = [];

  // 1. Heart Rate Analysis
  if (heartRate > 100) {
    assessment = "Tachycardia (Elevated Heart Rate)";
    explanation = `Resting heart rate of ${heartRate} BPM is above the normal range (60-100 BPM).`;
    actions.push("Rest for 15 minutes and retake scan.");
    actions.push("Hydrate with water.");
    questions.push("Have you exercised or consumed caffeine recently?");
    questions.push("Do you feel palpitations or anxiety?");
  } else if (heartRate < 60) {
    assessment = "Bradycardia (Low Heart Rate)";
    explanation = `Resting heart rate of ${heartRate} BPM is below the normal range. This may be normal for athletes.`;
    actions.push("Check for dizziness or fatigue.");
    questions.push("Are you an athlete?");
    questions.push("Do you feel lightheaded?");
  }

  // 2. Respiratory Rate Analysis
  if (rr > 20) {
    if (assessment === "Normal Vitals") assessment = "Tachypnea (Elevated Breathing)";
    explanation += ` Respiratory rate is elevated (${rr} bpm).`;
    actions.push("Check oxygen saturation if possible.");
    questions.push("Do you feel short of breath?");
  }

  // 3. Stress / HRV Analysis
  let stressLevel = "Normal";
  if (hrvVal < 30 && hrvVal > 0) {
    stressLevel = "High";
    questions.push("Are you under significant stress today?");
  }

  // Signal Quality Disclaimer
  if (confidence < 50) {
    assessment = " inconclusive (Low Signal Quality)";
    explanation = "The scan quality was low due to lighting or movement.";
    actions.unshift("RETAKE SCAN in better lighting.");
  }

  // --- Generate Markdown Output ---
  return `
### Assessment: ${assessment}

${explanation}

**Recorded Vitals:**
*   **Heart Rate:** ${heartRate} BPM
*   **Resp. Rate:** ${rr > 0 ? rr : '--'} breaths/min
*   **Stress Index:** ${hrvVal > 0 ? hrvVal + ' (HRV)' : '--'}
*   **Signal Confidence:** ${confidence}%

### Recommended Actions
${actions.length > 0 ? actions.map(a => `* ${a}`).join('\n') : '* Maintain normal wellness routine.'}

### Screening Questions
${questions.length > 0 ? questions.map(q => `* ${q}`).join('\n') : '* How are you feeling overall?'}

---
*Offline Triage Protocol v1.0 (No Cloud)*
`;
};
