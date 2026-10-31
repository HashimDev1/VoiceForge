import { TranscriptionSegment, ScriptChoice } from '../../../shared/src/types';

/**
 * ScriptConversionService
 * 
 * Provides high-fidelity, phonetically consistent script transliteration
 * for Hindustani (Hindi/Urdu) speech:
 * - Devanagari (Hindi script)
 * - Urdu Roman (Latin script)
 * - Perso-Arabic Urdu (Arabic/Nastaliq script)
 * 
 * Strict rule: Preserves speaker's exact vocabulary, syntax, and sentence order.
 * This is orthographic transcription conversion, NOT translation.
 */
export class ScriptConversionService {
  // Mapping of Devanagari consonants to Roman Urdu
  private static readonly DEVA_CONSONANTS: Record<string, string> = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    // Nukta consonants (borrowed from Perso-Arabic / Urdu)
    'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'झ़': 'zh'
  };

  // Devanagari independent vowels
  private static readonly DEVA_INDEPENDENT_VOWELS: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'अं': 'an', 'अँ': 'an', 'अः': 'ah'
  };

  // Devanagari dependent vowel signs (matras)
  private static readonly DEVA_MATRAS: Record<string, string> = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au'
  };

  // Common Hindi/Urdu words dictionary for natural Roman Urdu spelling
  private static readonly HINDI_TO_ROMAN_COMMON: Record<string, string> = {
    'नमस्ते': 'Namaste',
    'नमस्कार': 'Namaskar',
    'आप': 'aap',
    'कैसे': 'kaise',
    'कैसी': 'kaisi',
    'हैं': 'hain',
    'है': 'hai',
    'हूँ': 'hoon',
    'हूं': 'hoon',
    'हो': 'ho',
    'था': 'tha',
    'थी': 'thi',
    'थे': 'the',
    'मैं': 'main',
    'हम': 'hum',
    'तुम': 'tum',
    'तू': 'tu',
    'यह': 'yeh',
    'ये': 'yeh',
    'वह': 'woh',
    'वो': 'woh',
    'क्या': 'kya',
    'कहाँ': 'kahan',
    'कहा': 'kaha',
    'क्यों': 'kyun',
    'कब': 'kab',
    'किस': 'kis',
    'किसने': 'kisne',
    'कौन': 'kaun',
    'कुछ': 'kuch',
    'सब': 'sab',
    'सभी': 'sabhi',
    'बहुत': 'bahut',
    'अच्छा': 'achha',
    'अच्छी': 'acchi',
    'अच्छे': 'acche',
    'नहीं': 'nahi',
    'नही': 'nahi',
    'हाँ': 'haan',
    'हां': 'haan',
    'और': 'aur',
    'भी': 'bhi',
    'तो': 'to',
    'पर': 'par',
    'से': 'se',
    'में': 'mein',
    'का': 'ka',
    'की': 'ki',
    'के': 'ke',
    'को': 'ko',
    'लिए': 'liye',
    'वाला': 'wala',
    'वाली': 'wali',
    'वाले': 'wale',
    'करना': 'karna',
    'कर': 'kar',
    'रहा': 'raha',
    'रही': 'rahi',
    'रहे': 'rahe',
    'गया': 'gaya',
    'गई': 'gayi',
    'गए': 'gaye',
    'जाना': 'jaana',
    'आना': 'aana',
    'बात': 'baat',
    'दिन': 'din',
    'रात': 'raat',
    'वक्त': 'waqt',
    'समय': 'samay',
    'दोस्त': 'dost',
    'शुक्रिया': 'shukriya',
    'धन्यवाद': 'dhanyawad',
    'स्वागत': 'swagat',
    'ख़ैरियत': 'khairiyat',
    'खैरियत': 'khairiyat',
    'ज़िंदगी': 'zindagi',
    'जिंदगी': 'zindagi',
    'प्यार': 'pyaar',
    'मोहब्बत': 'mohabbat',
    'काम': 'kaam',
    'घर': 'ghar',
    'पानी': 'paani',
    'चाय': 'chai'
  };

  // Perso-Arabic Urdu to Roman Urdu common mappings
  private static readonly URDU_TO_ROMAN_COMMON: Record<string, string> = {
    'سلام': 'Salam',
    'اسلام علیکم': 'Assalam-o-Alaikum',
    'السلام علیکم': 'Assalam-o-Alaikum',
    'وعلیکم السلام': 'Walaikum Assalam',
    'آپ': 'aap',
    'کیسے': 'kaise',
    'کیسی': 'kaisi',
    'ہیں': 'hain',
    'ہے': 'hai',
    'ہوں': 'hoon',
    'ہو': 'ho',
    'تھا': 'tha',
    'تھی': 'thi',
    'تھے': 'the',
    'میں': 'main',
    'ہم': 'hum',
    'تم': 'tum',
    'تو': 'tu',
    'یہ': 'yeh',
    'وہ': 'woh',
    'کیا': 'kya',
    'کہاں': 'kahan',
    'کیوں': 'kyun',
    'کب': 'kab',
    'کون': 'kaun',
    'کچھ': 'kuch',
    'سب': 'sab',
    'سبھی': 'sabhi',
    'بہت': 'bahut',
    'اچھا': 'achha',
    'اچھی': 'acchi',
    'اچھے': 'acche',
    'نہیں': 'nahi',
    'ہاں': 'haan',
    'اور': 'aur',
    'بھی': 'bhi',
    'پر': 'par',
    'سے': 'se',
    'کا': 'ka',
    'کی': 'ki',
    'کے': 'ke',
    'کو': 'ko',
    'لئے': 'liye',
    'لیے': 'liye',
    'والا': 'wala',
    'والی': 'wali',
    'والے': 'wale',
    'کرنا': 'karna',
    'کر': 'kar',
    'رہا': 'raha',
    'رہی': 'rahi',
    'رہے': 'rahe',
    'گیا': 'gaya',
    'گئی': 'gayi',
    'گئے': 'gaye',
    'بات': 'baat',
    'دن': 'din',
    'رات': 'raat',
    'وقت': 'waqt',
    'دوست': 'dost',
    'شکریہ': 'shukriya',
    'خیریت': 'khairiyat',
    'زندگی': 'zindagi',
    'پیار': 'pyaar',
    'محبت': 'mohabbat',
    'کام': 'kaam',
    'گھر': 'ghar',
    'پانی': 'paani',
    'چائے': 'chai'
  };

  // Perso-Arabic Urdu to Devanagari mappings
  private static readonly URDU_TO_DEVANAGARI_COMMON: Record<string, string> = {
    'سلام': 'सलाम',
    'اسلام علیکم': 'अस्सलाम-ओ-अलैकुम',
    'السلام علیکم': 'अस्सलाम-ओ-अलैकुम',
    'آپ': 'आप',
    'کیسے': 'कैसे',
    'کیسی': 'कैसी',
    'ہیں': 'हैं',
    'ہے': 'है',
    'ہوں': 'हूँ',
    'ہو': 'हो',
    'تھا': 'था',
    'تھی': 'थी',
    'تھے': 'थे',
    'میں': 'मैं',
    'ہم': 'हम',
    'تم': 'तुम',
    'تو': 'तू',
    'یہ': 'यह',
    'وہ': 'वह',
    'کیا': 'क्या',
    'کہاں': 'कहाँ',
    'کیوں': 'क्यों',
    'کب': 'कब',
    'کون': 'कौन',
    'کچھ': 'कुछ',
    'سب': 'सब',
    'بہت': 'बहुत',
    'اچھا': 'अच्छा',
    'اچھی': 'अच्छी',
    'اچھے': 'अच्छे',
    'نہیں': 'नहीं',
    'ہاں': 'हाँ',
    'اور': 'और',
    'بھی': 'भी',
    'پر': 'पर',
    'سے': 'से',
    'کا': 'का',
    'کی': 'की',
    'کے': 'के',
    'کو': 'को',
    'لئے': 'लिए',
    'لیے': 'लिए',
    'والا': 'वाला',
    'والی': 'वाली',
    'والے': 'वाले',
    'کر': 'कर',
    'رہا': 'रहा',
    'رہی': 'रही',
    'رہے': 'रहे',
    'گیا': 'गया',
    'گئی': 'गई',
    'گئے': 'गए',
    'بات': 'बात',
    'دن': 'दिन',
    'رات': 'रात',
    'وقت': 'वक़्त',
    'دوست': 'दोस्त',
    'شکریہ': 'शुक्रिया',
    'خیریت': 'ख़ैरियत',
    'زندگی': 'ज़िंदगी',
    'کام': 'काम',
    'گھر': 'घर',
    'پانی': 'पानी',
    'چائے': 'चाय'
  };

  /**
   * Transliterate Devanagari text to readable, standardized Roman Urdu.
   */
  public static devanagariToRomanUrdu(text: string): string {
    if (!text || !text.trim()) return '';

    // Tokenize preserving whitespace and punctuation
    const tokens = text.split(/(\s+|[.,!?;:"'—–()\[\]])/);

    return tokens.map((token) => {
      if (!token || /^\s+$/.test(token) || /^[.,!?;:"'—–()\[\]]+$/.test(token)) {
        return token;
      }

      // Check common dictionary first
      const stripped = token.replace(/^[.,!?;:"'—–()\[\]]+|[.,!?;:"'—–()\[\]]+$/g, '');
      if (this.HINDI_TO_ROMAN_COMMON[stripped]) {
        return token.replace(stripped, this.HINDI_TO_ROMAN_COMMON[stripped]);
      }

      // Phonetic transliteration of Devanagari characters
      let roman = '';
      let i = 0;
      const len = token.length;

      while (i < len) {
        const char = token[i];
        const nextChar = i + 1 < len ? token[i + 1] : '';

        // Check for combined nukta (e.g. क + ़ = क़)
        const twoChars = char + nextChar;
        if (nextChar === '़' && this.DEVA_CONSONANTS[twoChars]) {
          roman += this.DEVA_CONSONANTS[twoChars];
          i += 2;
          // check if followed by matra or virama
          const afterNukta = i < len ? token[i] : '';
          if (this.DEVA_MATRAS[afterNukta]) {
            roman += this.DEVA_MATRAS[afterNukta];
            i++;
          } else if (afterNukta === '्') {
            // Halant: suppress inherent 'a'
            i++;
          } else if (afterNukta !== 'ं' && afterNukta !== 'ँ' && i < len && !/\s|[.,!?]/.test(afterNukta)) {
            roman += 'a';
          }
          continue;
        }

        // Independent vowel
        if (this.DEVA_INDEPENDENT_VOWELS[char]) {
          roman += this.DEVA_INDEPENDENT_VOWELS[char];
          i++;
          continue;
        }

        // Consonant
        if (this.DEVA_CONSONANTS[char]) {
          roman += this.DEVA_CONSONANTS[char];
          i++;

          const follow = i < len ? token[i] : '';
          if (this.DEVA_MATRAS[follow]) {
            roman += this.DEVA_MATRAS[follow];
            i++;
          } else if (follow === '्') {
            // Halant: no inherent 'a'
            i++;
          } else if (follow === 'ं' || follow === 'ँ') {
            roman += 'an';
            i++;
          } else if (follow === 'ः') {
            roman += 'ah';
            i++;
          } else {
            // Check if end of word or followed by another consonant
            const isEndOfWord = (i >= len) || /[\s.,!?;:"'—–]/.test(follow);
            if (!isEndOfWord) {
              roman += 'a';
            }
          }
          continue;
        }

        // Anusvara alone
        if (char === 'ं' || char === 'ँ') {
          roman += 'n';
          i++;
          continue;
        }

        // Fallback: keep existing character (English letters, digits, symbols)
        roman += char;
        i++;
      }

      return roman;
    }).join('');
  }

  /**
   * Transliterate Perso-Arabic Urdu script to readable Roman Urdu.
   */
  public static persoArabicToRomanUrdu(text: string): string {
    if (!text || !text.trim()) return '';

    const tokens = text.split(/(\s+|[.,!?;:"'—–()\[\]])/);

    return tokens.map((token) => {
      if (!token || /^\s+$/.test(token) || /^[.,!?;:"'—–()\[\]]+$/.test(token)) {
        return token;
      }

      const stripped = token.replace(/^[.,!?;:"'—–()\[\]]+|[.,!?;:"'—–()\[\]]+$/g, '');
      if (this.URDU_TO_ROMAN_COMMON[stripped]) {
        return token.replace(stripped, this.URDU_TO_ROMAN_COMMON[stripped]);
      }

      // Elementary phonetic mapping for Perso-Arabic characters
      const charMap: Record<string, string> = {
        'آ': 'aa', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't',
        'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd',
        'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh',
        'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
        'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'گ': 'g',
        'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'o', 'ہ': 'h',
        'ھ': 'h', 'ء': '', 'ی': 'i', 'ے': 'e'
      };

      let res = '';
      for (const ch of token) {
        res += charMap[ch] !== undefined ? charMap[ch] : ch;
      }
      return res;
    }).join('');
  }

  /**
   * Transliterate Perso-Arabic Urdu text to Devanagari (Hindi script).
   */
  public static persoArabicToDevanagari(text: string): string {
    if (!text || !text.trim()) return '';

    const tokens = text.split(/(\s+|[.,!?;:"'—–()\[\]])/);

    return tokens.map((token) => {
      if (!token || /^\s+$/.test(token) || /^[.,!?;:"'—–()\[\]]+$/.test(token)) {
        return token;
      }

      const stripped = token.replace(/^[.,!?;:"'—–()\[\]]+|[.,!?;:"'—–()\[\]]+$/g, '');
      if (this.URDU_TO_DEVANAGARI_COMMON[stripped]) {
        return token.replace(stripped, this.URDU_TO_DEVANAGARI_COMMON[stripped]);
      }

      // Letter-by-letter phonetic fallback
      const arToDev: Record<string, string> = {
        'آ': 'आ', 'ا': 'अ', 'ب': 'ब', 'پ': 'प', 'ت': 'त', 'ٹ': 'ट',
        'ث': 'स', 'ج': 'ज', 'چ': 'च', 'ح': 'ह', 'خ': 'ख़', 'د': 'द',
        'ڈ': 'ड', 'ذ': 'ज़', 'ر': 'र', 'ڑ': 'ड़', 'ز': 'ज़', 'ژ': 'झ़',
        'س': 'स', 'ش': 'श', 'ص': 'स', 'ض': 'ज़', 'ط': 'त', 'ظ': 'ज़',
        'ع': 'अ', 'غ': 'ग़', 'ف': 'फ़', 'ق': 'क़', 'ک': 'क', 'گ': 'ग',
        'ل': 'ल', 'م': 'म', 'ن': 'न', 'ں': 'ँ', 'و': 'ो', 'ہ': 'ह',
        'ھ': 'ह', 'ء': '', 'ی': 'ी', 'ے': 'े'
      };

      let dev = '';
      for (const ch of token) {
        dev += arToDev[ch] !== undefined ? arToDev[ch] : ch;
      }
      return dev;
    }).join('');
  }

  /**
   * Convert transcript segments to selected Hindi/Urdu script without touching timestamps.
   */
  public static convertTranscriptSegments(
    segments: TranscriptionSegment[],
    targetScript: ScriptChoice,
    detectedLangCode: string
  ): TranscriptionSegment[] {
    if (!segments || segments.length === 0) return [];
    if (targetScript === 'original') return segments;

    const isHindiOrUrdu = ['hi', 'ur', 'hin', 'urd'].includes((detectedLangCode || '').toLowerCase());
    if (!isHindiOrUrdu) {
      // Script choice does not apply to unrelated languages (per requirement)
      return segments;
    }

    return segments.map((seg) => {
      let convertedText = seg.text;

      if (targetScript === 'urdu_roman') {
        // Check if Devanagari or Perso-Arabic
        const hasDevanagari = /[\u0900-\u097F]/.test(seg.text);
        const hasArabic = /[\u0600-\u06FF]/.test(seg.text);

        if (hasDevanagari) {
          convertedText = this.devanagariToRomanUrdu(seg.text);
        } else if (hasArabic) {
          convertedText = this.persoArabicToRomanUrdu(seg.text);
        }
      } else if (targetScript === 'hindi_devanagari') {
        const hasArabic = /[\u0600-\u06FF]/.test(seg.text);
        if (hasArabic) {
          convertedText = this.persoArabicToDevanagari(seg.text);
        }
        // If already Devanagari, it remains Devanagari
      }

      // Convert words array if present
      const convertedWords = seg.words?.map((w) => {
        let wText = w.word;
        if (targetScript === 'urdu_roman') {
          if (/[\u0900-\u097F]/.test(w.word)) {
            wText = this.devanagariToRomanUrdu(w.word);
          } else if (/[\u0600-\u06FF]/.test(w.word)) {
            wText = this.persoArabicToRomanUrdu(w.word);
          }
        } else if (targetScript === 'hindi_devanagari') {
          if (/[\u0600-\u06FF]/.test(w.word)) {
            wText = this.persoArabicToDevanagari(w.word);
          }
        }
        return {
          ...w,
          word: wText
        };
      });

      return {
        ...seg,
        text: convertedText,
        words: convertedWords
      };
    });
  }
}
