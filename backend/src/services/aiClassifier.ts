import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Mock responses for development without API key
const MOCK_MODE = !genAI;

export const classifyIncident = async (message: string, zone: string) => {
  if (MOCK_MODE) {
    console.warn('[AI Mock] classifyIncident');
    if (message.toLowerCase().includes('fire')) {
      return { severity: 'critical', category: 'fire', confidence: 98, suggestedAction: 'Evacuate immediately' };
    }
    return { severity: 'info', category: 'service', confidence: 80, suggestedAction: 'Send housekeeping' };
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `You are an AI classifier for a hotel crisis response system. Your job is to classify incident reports from guests and staff.
Classify this message and respond ONLY in valid JSON:
{
  "severity": "critical" | "warning" | "info",
  "category": "fire" | "medical" | "security" | "facilities" | "service",
  "confidence": 0-100,
  "suggestedAction": "one short sentence"
}
Rules:
- "critical" = immediate danger to life
- "warning" = urgent but not life-threatening
- "info" = routine request

Zone: ${zone}
Message: "${message}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // Clean up potential markdown formatting from Gemini response
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error classifying incident:', error);
    return { severity: 'warning', category: 'security', confidence: 50, suggestedAction: 'Manual review required' };
  }
};

export const answerGuestQuestion = async (question: string) => {
  if (MOCK_MODE) {
    return { answer: "I'm a mock AI. Checkout is at 11 AM.", requiresHuman: false };
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `You are a helpful AI concierge for Grand Thalassa Hotel. Answer guest questions concisely and warmly.
Respond ONLY in JSON:
{
  "answer": "your response in 1-2 sentences",
  "requiresHuman": true/false
}
Hotel facts:
- Check-in: 2 PM, Check-out: 11 AM
- Pool hours: 6 AM - 10 PM
- Main restaurant: 7 AM - 11 PM
- WiFi: GrandThalassa_Guest, password: relax2025

Guest question: "${question}"`;

    const result = await model.generateContent(prompt);
    const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error answering question:', error);
    return { answer: "I'm having trouble connecting to my knowledge base. Let me get a staff member for you.", requiresHuman: true };
  }
};

export const detectEmergencyKeywords = (message: string): boolean => {
  const keywords = ['fire', 'smoke', 'blood', 'unconscious', 'weapon', 'attack', 'heart', 'breathing', 'dying', 'emergency'];
  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
};
