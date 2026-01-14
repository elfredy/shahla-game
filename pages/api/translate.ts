import type { NextApiRequest, NextApiResponse } from 'next';

interface TranslateRequest {
  text: string;
  targetLang: 'TR' | 'EN';
}

interface TranslateResponse {
  translation: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ translation: '', error: 'Method not allowed' });
  }

  try {
    const { text, targetLang }: TranslateRequest = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({ translation: '', error: 'Missing text or targetLang' });
    }

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ translation: '', error: 'DeepL API key not configured' });
    }

    // DeepL API endpoint
    const apiUrl = 'https://api.deepl.com/v2/translate';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'DE',
        target_lang: targetLang,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API error:', response.status, errorText);
      return res.status(response.status).json({
        translation: '',
        error: `DeepL API error: ${response.status}`,
      });
    }

    const data = await response.json();
    
    if (data.translations && data.translations.length > 0) {
      return res.status(200).json({
        translation: data.translations[0].text,
      });
    }

    return res.status(500).json({
      translation: '',
      error: 'No translation received from DeepL API',
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({
      translation: '',
      error: error.message || 'Internal server error',
    });
  }
}
