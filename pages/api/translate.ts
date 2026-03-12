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

    const rawKey = process.env.DEEPL_API_KEY;
    if (!rawKey) {
      return res.status(500).json({ translation: '', error: 'DeepL API key not configured' });
    }
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

    // DeepL Free keys end with ":fx" → api-free.deepl.com; Pro → api.deepl.com
    const freeUrl = 'https://api-free.deepl.com/v2/translate';
    const proUrl = 'https://api.deepl.com/v2/translate';
    const isFreeKey = apiKey.endsWith(':fx');

    const doRequest = (url: string) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ShahlaWordsGame/1.0',
        },
        body: JSON.stringify({
          text: [text],
          source_lang: 'DE',
          target_lang: targetLang,
        }),
      });

    let response = await doRequest(isFreeKey ? freeUrl : proUrl);

    // If 403 with Pro URL, retry once with Free URL (in case key is Free but :fx was lost)
    if (!response.ok && response.status === 403 && !isFreeKey) {
      response = await doRequest(freeUrl);
    }

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
