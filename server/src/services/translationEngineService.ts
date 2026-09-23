import { logger } from '../utils/logger';

export interface SupportedLanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' }
];

export class TranslationEngineService {
  private static translationCache = new Map<string, string>();

  /**
   * Normalizes language name or ISO code to 2-letter code
   */
  public static normalizeLangCode(lang: string): string {
    const l = (lang || '').trim().toLowerCase();
    const found = SUPPORTED_LANGUAGES.find(
      (item) => item.code.toLowerCase() === l || item.name.toLowerCase() === l || item.nativeName.toLowerCase() === l
    );
    return found ? found.code : l.slice(0, 2) || 'en';
  }

  /**
   * Resolves language name from code or name
   */
  public static getLanguageName(lang: string): string {
    const code = this.normalizeLangCode(lang);
    const found = SUPPORTED_LANGUAGES.find((item) => item.code === code);
    return found ? found.name : lang;
  }

  /**
   * Translates text from source language into target language.
   * Free engines (MyMemory / LibreTranslate / Local) + optional GPT API.
   */
  public static async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const trimmed = (text || '').trim();
    if (!trimmed) return '';

    const srcCode = this.normalizeLangCode(sourceLanguage);
    const tgtCode = this.normalizeLangCode(targetLanguage);

    if (srcCode === tgtCode) {
      return trimmed;
    }

    const cacheKey = `${srcCode}_${tgtCode}_${trimmed}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey)!;
    }

    // 1. Try GPT API if OPENAI_API_KEY is configured
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
      try {
        const translatedGpt = await this.translateWithGpt(trimmed, srcCode, tgtCode);
        if (translatedGpt) {
          this.translationCache.set(cacheKey, translatedGpt);
          return translatedGpt;
        }
      } catch (gptErr) {
        logger.warn('GPT API translation failed, falling back to free engine:', gptErr);
      }
    }

    // 2. Try MyMemory Free API
    try {
      const translatedMyMemory = await this.translateWithMyMemory(trimmed, srcCode, tgtCode);
      if (translatedMyMemory) {
        this.translationCache.set(cacheKey, translatedMyMemory);
        return translatedMyMemory;
      }
    } catch (mmErr) {
      logger.warn('MyMemory free translation failed, attempting LibreTranslate fallback:', mmErr);
    }

    // 3. Try LibreTranslate / Free API Fallback
    try {
      const translatedLibre = await this.translateWithLibreTranslate(trimmed, srcCode, tgtCode);
      if (translatedLibre) {
        this.translationCache.set(cacheKey, translatedLibre);
        return translatedLibre;
      }
    } catch (ltErr) {
      logger.warn('LibreTranslate failed, using semantic fallback:', ltErr);
    }

    // 4. Fallback: Return original text or sample multilingual translation
    const fallback = this.getFallbackTranslation(trimmed, tgtCode);
    this.translationCache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * MyMemory Translation API (Free tier: 5000 chars/day without key, 50,000 with email)
   */
  private static async translateWithMyMemory(
    text: string,
    src: string,
    tgt: string
  ): Promise<string> {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', `${src}|${tgt}`);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'VoiceForge-Studio/1.0' }
    });

    if (!res.ok) {
      throw new Error(`MyMemory API error: ${res.status}`);
    }

    const data = await res.json();
    if (data.responseData && data.responseData.translatedText) {
      let result = data.responseData.translatedText;
      // Filter out MyMemory warning banners
      if (result.includes('MYMEMORY WARNING:')) {
        result = result.replace(/MYMEMORY WARNING:[^.]*\./gi, '').trim();
      }
      if (result) return result;
    }

    throw new Error('No translated text returned from MyMemory');
  }

  /**
   * Public LibreTranslate instance fallback
   */
  private static async translateWithLibreTranslate(
    text: string,
    src: string,
    tgt: string
  ): Promise<string> {
    const res = await fetch('https://translate.terraprint.co/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: src,
        target: tgt,
        format: 'text'
      })
    });

    if (!res.ok) {
      throw new Error(`LibreTranslate error: ${res.status}`);
    }

    const data = await res.json();
    if (data.translatedText) {
      return data.translatedText;
    }

    throw new Error('No translated text from LibreTranslate');
  }

  /**
   * OpenAI GPT API Translation (Context-aware speech translation)
   */
  private static async translateWithGpt(
    text: string,
    src: string,
    tgt: string
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    const tgtName = this.getLanguageName(tgt);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert AI speech and dubbing translator. Translate the given spoken text naturally into ${tgtName}. Preserve the tone, emotion, and colloquial speaking style. Return ONLY the translated text, no quotes, no explanations.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    if (!res.ok) {
      throw new Error(`GPT translation API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  /**
   * Fallback for common phrases / offline resilience
   */
  private static getFallbackTranslation(text: string, tgtCode: string): string {
    const lower = text.toLowerCase().trim();
    const common: Record<string, Record<string, string>> = {
      'welcome to my channel': {
        ar: 'مرحبا بكم في قناتي',
        ur: 'میرے چینل پر خوش آمدید',
        hi: 'मेरे चैनल पर आपका स्वागत है',
        es: 'Bienvenidos a mi canal',
        fr: 'Bienvenue sur ma chaîne',
        de: 'Willkommen auf meinem Kanal',
        it: 'Benvenuti sul mio canale',
        pt: 'Bem-vindo ao meu canal',
        zh: '欢迎来到我的频道',
        ja: '私のチャンネルへようこそ',
        ko: '내 채널에 오신 것을 환영합니다',
        tr: 'Kanalıma hoş geldiniz'
      },
      'hello everyone': {
        ar: 'مرحبا بالجميع',
        ur: 'ہیلو سب کو',
        hi: 'नमस्ते सभी को',
        es: 'Hola a todos',
        fr: 'Bonjour à tous',
        de: 'Hallo zusammen',
        it: 'Ciao a tutti',
        pt: 'Olá a todos',
        zh: '大家好',
        ja: '皆さんこんにちは',
        ko: '여러분 안녕하세요',
        tr: 'Herkese merhaba'
      }
    };

    if (common[lower] && common[lower][tgtCode]) {
      return common[lower][tgtCode];
    }

    return text;
  }
}
