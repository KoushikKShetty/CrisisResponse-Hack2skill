import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const hf = process.env.HF_TOKEN ? new HfInference(process.env.HF_TOKEN) : null;
const MODEL = 'google/gemma-2-9b-it';

export const generateEmergencyProtocol = async (type: string, zone: string, description: string) => {
  if (!hf) {
    console.warn('[Gemma Mock] No HF_TOKEN provided. Returning mock protocol.');
    return [
      `Evacuate all personnel from ${zone}`,
      `Isolate the ${type} issue immediately`,
      `Await further instructions from security lead`
    ];
  }

  try {
    const response = await hf.chatCompletion({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `You are an expert AI prioritizing Rapid Crisis Response for a hospitality platform.
Generate a strict, 3-step actionable rapid emergency response protocol for the following incident:
Type: ${type}
Zone: ${zone}
Description: ${description}

Format your response EXACTLY as a JSON array of 3 strings. Example: ["Step 1", "Step 2", "Step 3"]
Do NOT include markdown, extra text, or explanations. Only the JSON array.`
        }
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const text = (response.choices?.[0]?.message?.content || '').trim();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    } catch (e) {
      console.error('Failed to parse Gemma output as JSON:', text);
    }
    
    return [
      `Secure the ${zone} area`,
      `Address the ${type} situation cautiously`,
      `Report status to central command`
    ];
  } catch (error) {
    console.error('Error generating emergency protocol with Gemma:', error);
    return [
      `Evacuate ${zone}`,
      `Contact emergency services for ${type}`,
      `Standby for updates`
    ];
  }
};
