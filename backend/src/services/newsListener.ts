import axios from 'axios';
import { HfInference } from '@huggingface/inference';
import { getIO } from './socketService';
import dotenv from 'dotenv';

dotenv.config();

const hf = process.env.HF_TOKEN ? new HfInference(process.env.HF_TOKEN) : null;
const MODEL = 'google/gemma-2-9b-it';

// Mock data fallback to ensure hackathon demo is 100% reliable
const MOCK_NEWS = [
  {
    title: "Category 4 Hurricane approaching coastal regions",
    description: "Meteorologists warn of severe winds and flooding over the next 48 hours affecting hotels and resorts.",
  },
  {
    title: "New AI trends transforming the hotel industry",
    description: "Hotels are adopting AI to automate check-ins and improve guest experiences worldwide.",
  },
  {
    title: "Major earthquake strikes tourist district",
    description: "A 6.2 magnitude earthquake hit the coastal tourist district. Emergency services mobilized.",
  }
];

export const processDailyNews = async (useMock = true) => {
  try {
    let newsArticle;

    if (useMock) {
      newsArticle = MOCK_NEWS[Math.floor(Math.random() * MOCK_NEWS.length)];
    } else {
      // Fetch live news from newsdata.io
      const url = 'https://newsdata.io/api/1/latest?apikey=pub_a868cfe2ec3a4d1b9e54a31392b6eef9&q=hospitality crisis';
      try {
        const response = await axios.get(url);
        if (response.data && response.data.results && response.data.results.length > 0) {
          const result = response.data.results[0];
          newsArticle = {
            title: result.title || 'No Title',
            description: result.description || result.content || 'No Description available.',
          };
        } else {
          console.warn('No news found from API. Falling back to mock data.');
          newsArticle = MOCK_NEWS[0];
        }
      } catch (apiErr) {
        console.warn('News API failed, using mock:', apiErr);
        newsArticle = MOCK_NEWS[0];
      }
    }

    // RAG: Send the news to Gemma to classify and summarize
    let classification = "GENERAL";
    let summary = "No summary available.";

    if (hf) {
      try {
        const response = await hf.chatCompletion({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: `Analyze the following news article for a hospitality crisis platform.
Title: ${newsArticle.title}
Description: ${newsArticle.description}

1. Classify the news as either "EMERGENCY" (if it poses a risk to hotel operations, guests, or staff) or "GENERAL" (if it's just industry news).
2. Write a 1-sentence summary of how it impacts the hotel.

Format your response EXACTLY as a JSON object:
{"classification": "EMERGENCY", "summary": "Your summary here"}
or
{"classification": "GENERAL", "summary": "Your summary here"}

Only output the JSON. No markdown, no explanation.`
            }
          ],
          max_tokens: 100,
          temperature: 0.1,
        });

        const text = (response.choices?.[0]?.message?.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(text);
          classification = parsed.classification || classification;
          summary = parsed.summary || summary;
        } catch (e) {
          console.error('Failed to parse Gemma news output as JSON:', text);
          // Try to detect emergency from the text itself
          if (text.toLowerCase().includes('emergency')) {
            classification = 'EMERGENCY';
          }
          summary = text.substring(0, 100);
        }
      } catch (hfErr) {
        console.warn('Gemma classification failed, using keyword fallback:', hfErr);
        // Keyword-based fallback
        const emergencyKeywords = ['hurricane', 'earthquake', 'flood', 'fire', 'attack', 'evacuation', 'storm', 'emergency'];
        const lower = (newsArticle.title + ' ' + newsArticle.description).toLowerCase();
        classification = emergencyKeywords.some(k => lower.includes(k)) ? 'EMERGENCY' : 'GENERAL';
        summary = `AI processing unavailable. Based on keywords: ${newsArticle.title}`;
      }
    } else {
      // Fallback if no HF Token
      const emergencyKeywords = ['hurricane', 'earthquake', 'flood', 'fire', 'attack', 'evacuation', 'storm', 'emergency'];
      const lower = (newsArticle.title + ' ' + newsArticle.description).toLowerCase();
      classification = emergencyKeywords.some(k => lower.includes(k)) ? 'EMERGENCY' : 'GENERAL';
      summary = `${newsArticle.title}`;
    }

    const newsData = {
      title: newsArticle.title,
      classification,
      summary,
      timestamp: new Date().toISOString()
    };

    // Emit to clients
    const io = getIO();
    if (io) {
      io.of('/chat').emit('news_update', newsData);
    }

    return newsData;
  } catch (error) {
    console.error('Error processing daily news:', error);
    throw error;
  }
};
