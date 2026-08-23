import type { LanguageCode } from "../domain/language.ts";
import type { ClaimContradictionSignal, DerivedNutrient, WholePackSignal } from "./types.ts";

const COPY: Record<LanguageCode, { whole: string; daily: string; label: string; pack: string; nutrients: Record<DerivedNutrient, string> }> = {
  en: { whole: "WHOLE PACK", daily: "of the pack's daily reference", label: "Label shows", pack: "whole pack is", nutrients: { added_sugars: "added sugar", saturated_fat: "saturated fat", sodium: "sodium", total_fat: "total fat" } },
  hi: { whole: "पूरा पैक", daily: "पैक के दैनिक संदर्भ का", label: "लेबल दिखाता है", pack: "पूरा पैक है", nutrients: { added_sugars: "अतिरिक्त चीनी", saturated_fat: "संतृप्त वसा", sodium: "सोडियम", total_fat: "कुल वसा" } },
  mr: { whole: "संपूर्ण पॅक", daily: "पॅकच्या दैनिक संदर्भापैकी", label: "लेबलवर", pack: "संपूर्ण पॅक", nutrients: { added_sugars: "अतिरिक्त साखर", saturated_fat: "सॅच्युरेटेड फॅट", sodium: "सोडियम", total_fat: "एकूण फॅट" } },
  bn: { whole: "পুরো প্যাক", daily: "প্যাকের দৈনিক মানের", label: "লেবেলে দেখানো", pack: "পুরো প্যাক", nutrients: { added_sugars: "যোগ করা চিনি", saturated_fat: "স্যাচুরেটেড ফ্যাট", sodium: "সোডিয়াম", total_fat: "মোট ফ্যাট" } },
  ta: { whole: "முழு பேக்", daily: "பேக்கின் தினசரி அளவில்", label: "லேபிளில்", pack: "முழு பேக்", nutrients: { added_sugars: "சேர்க்கப்பட்ட சர்க்கரை", saturated_fat: "செறிவுற்ற கொழுப்பு", sodium: "சோடியம்", total_fat: "மொத்த கொழுப்பு" } },
  te: { whole: "మొత్తం ప్యాక్", daily: "ప్యాక్ రోజువారీ సూచనలో", label: "లేబుల్‌లో", pack: "మొత్తం ప్యాక్", nutrients: { added_sugars: "చేర్చిన చక్కెర", saturated_fat: "సంతృప్త కొవ్వు", sodium: "సోడియం", total_fat: "మొత్తం కొవ్వు" } },
  kn: { whole: "ಪೂರ್ಣ ಪ್ಯಾಕ್", daily: "ಪ್ಯಾಕ್‌ನ ದೈನಂದಿನ ಉಲ್ಲೇಖದಲ್ಲಿ", label: "ಲೇಬಲ್‌ನಲ್ಲಿ", pack: "ಪೂರ್ಣ ಪ್ಯಾಕ್", nutrients: { added_sugars: "ಸೇರಿಸಿದ ಸಕ್ಕರೆ", saturated_fat: "ಸ್ಯಾಚುರೇಟೆಡ್ ಕೊಬ್ಬು", sodium: "ಸೋಡಿಯಂ", total_fat: "ಒಟ್ಟು ಕೊಬ್ಬು" } },
  gu: { whole: "આખું પેક", daily: "પેકના દૈનિક સંદર્ભનું", label: "લેબલ બતાવે છે", pack: "આખું પેક", nutrients: { added_sugars: "ઉમેરેલી ખાંડ", saturated_fat: "સંતૃપ્ત ચરબી", sodium: "સોડિયમ", total_fat: "કુલ ચરબી" } },
  ml: { whole: "മുഴുവൻ പാക്ക്", daily: "പാക്കിന്റെ പ്രതിദിന സൂചികയിൽ", label: "ലേബലിൽ", pack: "മുഴുവൻ പാക്ക്", nutrients: { added_sugars: "ചേർത്ത പഞ്ചസാര", saturated_fat: "പൂരിത കൊഴുപ്പ്", sodium: "സോഡിയം", total_fat: "ആകെ കൊഴുപ്പ്" } },
  pa: { whole: "ਪੂਰਾ ਪੈਕ", daily: "ਪੈਕ ਦੇ ਰੋਜ਼ਾਨਾ ਹਵਾਲੇ ਦਾ", label: "ਲੇਬਲ ਦਿਖਾਉਂਦਾ ਹੈ", pack: "ਪੂਰਾ ਪੈਕ", nutrients: { added_sugars: "ਮਿਲਾਈ ਖੰਡ", saturated_fat: "ਸੈਚੁਰੇਟਿਡ ਫੈਟ", sodium: "ਸੋਡੀਅਮ", total_fat: "ਕੁੱਲ ਫੈਟ" } },
  or: { whole: "ସମ୍ପୂର୍ଣ୍ଣ ପ୍ୟାକ୍", daily: "ପ୍ୟାକ୍‌ର ଦୈନିକ ସନ୍ଦର୍ଭର", label: "ଲେବଲ୍‌ରେ", pack: "ସମ୍ପୂର୍ଣ୍ଣ ପ୍ୟାକ୍", nutrients: { added_sugars: "ଯୋଗ କରାଯାଇଥିବା ଚିନି", saturated_fat: "ସାଚୁରେଟେଡ୍ ଫ୍ୟାଟ୍", sodium: "ସୋଡିୟମ୍", total_fat: "ମୋଟ ଫ୍ୟାଟ୍" } },
  ur: { whole: "پورا پیک", daily: "پیک کے یومیہ حوالہ کا", label: "لیبل دکھاتا ہے", pack: "پورا پیک", nutrients: { added_sugars: "شامل شدہ چینی", saturated_fat: "سیر شدہ چکنائی", sodium: "سوڈیم", total_fat: "کل چکنائی" } },
};

export function formatWholePackSignal(signal: WholePackSignal, language: LanguageCode): { title: string; headline: string; detail: string } {
  const copy = COPY[language] ?? COPY.en;
  return {
    title: copy.whole,
    headline: `${signal.wholePackAmount} ${signal.unit} ${copy.nutrients[signal.nutrient]} · ~${signal.wholePackRdaPercent}% ${copy.daily}`,
    detail: `${copy.label} ${signal.printedServingRdaPercent}% / ${signal.servingSize} ${signal.quantityUnit}; ${copy.pack} ${signal.netQuantity} ${signal.quantityUnit}.`,
  };
}

const CLAIM_COPY: Record<LanguageCode, { title: string; detail: string }> = {
  en: { title: "CLAIM CHECK", detail: "The printed claim conflicts with the printed ingredient." },
  hi: { title: "दावे की जाँच", detail: "छपा दावा छपी सामग्री से मेल नहीं खाता।" },
  mr: { title: "दावा तपासणी", detail: "छापील दावा छापील घटकाशी जुळत नाही." },
  bn: { title: "দাবি যাচাই", detail: "মুদ্রিত দাবির সঙ্গে মুদ্রিত উপাদান মেলে না।" },
  ta: { title: "கூற்று சரிபார்ப்பு", detail: "அச்சிட்ட கூற்று அச்சிட்ட மூலப்பொருளுடன் முரண்படுகிறது." },
  te: { title: "క్లెయిమ్ తనిఖీ", detail: "ముద్రించిన క్లెయిమ్ ముద్రించిన పదార్థంతో సరిపోలదు." },
  kn: { title: "ಹೇಳಿಕೆ ಪರಿಶೀಲನೆ", detail: "ಮುದ್ರಿತ ಹೇಳಿಕೆ ಮುದ್ರಿತ ಘಟಕದೊಂದಿಗೆ ಹೊಂದುವುದಿಲ್ಲ." },
  gu: { title: "દાવાની તપાસ", detail: "છાપેલો દાવો છાપેલા ઘટક સાથે મેળ ખાતો નથી." },
  ml: { title: "അവകാശവാദ പരിശോധന", detail: "അച്ചടിച്ച അവകാശവാദം അച്ചടിച്ച ചേരുവയുമായി പൊരുത്തപ്പെടുന്നില്ല." },
  pa: { title: "ਦਾਅਵੇ ਦੀ ਜਾਂਚ", detail: "ਛਪਿਆ ਦਾਅਵਾ ਛਪੀ ਸਮੱਗਰੀ ਨਾਲ ਮੇਲ ਨਹੀਂ ਖਾਂਦਾ।" },
  or: { title: "ଦାବି ଯାଞ୍ଚ", detail: "ମୁଦ୍ରିତ ଦାବି ମୁଦ୍ରିତ ଉପାଦାନ ସହ ମେଳ ଖାଉନାହିଁ।" },
  ur: { title: "دعوے کی جانچ", detail: "چھپا ہوا دعویٰ چھپے ہوئے جزو سے مطابقت نہیں رکھتا۔" },
};

export function formatClaimSignal(signal: ClaimContradictionSignal, language: LanguageCode): { title: string; headline: string; detail: string } {
  const copy = CLAIM_COPY[language] ?? CLAIM_COPY.en;
  return { title: copy.title, headline: `“${signal.claimAsPrinted}” ≠ ${signal.foundIngredient}`, detail: copy.detail };
}
