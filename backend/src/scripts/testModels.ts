import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    console.log('Fetching available models for this API key...');
    const response = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).generateContent('test');
    // We won't reach here if it fails
    console.log(response.response.text());
  } catch (err: any) {
    console.error('Error:', err.message);
  }

  // Use fetch to hit the REST API directly to bypass the library and get the real error
  try {
    console.log('\n--- Direct REST API Test ---');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log('Available models:', data.models?.map((m: any) => m.name) || data);
  } catch (err: any) {
    console.error('REST Error:', err.message);
  }
};

run();
