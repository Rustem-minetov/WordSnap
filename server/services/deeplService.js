const axios = require('axios');
const NodeCache = require('node-cache');

// Cache translations for 24 hours to save API calls
const translationCache = new NodeCache({ stdTTL: 86400 });

async function translateText(text, targetLang = 'RU', sourceLang = null) {
  const cacheKey = `${text}_${targetLang}`;
  const cached = translationCache.get(cacheKey);
  
  if (cached) {
    console.log(`[Cache Hit] ${text}`);
    return cached;
  }

  const apiKey = process.env.DEEPL_API_KEY;
  
  if (!apiKey || apiKey === 'your_deepl_api_key_here') {
    throw new Error('DeepL API Key is not configured on the server.');
  }

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api-free.deepl.com/v2/translate',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        text,
        target_lang: targetLang,
        ...(sourceLang && { source_lang: sourceLang })
      }).toString(),
      timeout: 5000 // 5 seconds timeout
    });

    if (response.status !== 200) {
      throw new Error(`DeepL API responded with status ${response.status}: ${response.statusText}`);
    }

    const result = response.data.translations[0].text;
    translationCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('DeepL Service Error:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      throw new Error('DeepL Authorization Failed (403). Check your API Key.');
    }
    throw new Error(error.response?.data?.message || 'Translation service failed.');
  }
}

module.exports = { translateText };
