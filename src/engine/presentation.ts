import type { LanguageCode } from "../domain/language.ts";
import type { ClaimContradictionSignal, DerivedNutrient, DerivedSignal, DietarySignal, WholePackSignal } from "./types.ts";
import type { ProductAnalysis } from "../domain/analysis.ts";

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
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  return {
    title: copy.whole,
    headline: `${number.format(signal.wholePackAmount)} ${signal.unit} ${copy.nutrients[signal.nutrient]} · ~${number.format(signal.wholePackRdaPercent)}% ${copy.daily}`,
    detail: `${copy.label} ${number.format(signal.printedServingRdaPercent)}% / ${number.format(signal.servingSize)} ${signal.quantityUnit}; ${copy.pack} ${number.format(signal.netQuantity)} ${signal.quantityUnit}.`,
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

const DIET_COPY: Record<LanguageCode, { conflict: string; profile: string; unclear: string; allergens: string; conflictDetail: string; unclearDetail: string; allergenDetail: string }> = {
  en: { conflict: "VEG MARK CHECK", profile: "DIET PROFILE", unclear: "SOURCE NOT STATED", allergens: "ALLERGENS", conflictDetail: "A vegetarian mark and an explicitly animal- or insect-derived ingredient are both printed.", unclearDetail: "The ingredient name does not establish whether its production source is animal or non-animal.", allergenDetail: "These allergen ingredients are printed on the pack." },
  hi: { conflict: "शाकाहारी चिह्न जाँच", profile: "आहार प्रोफ़ाइल", unclear: "स्रोत नहीं बताया", allergens: "एलर्जेन", conflictDetail: "शाकाहारी चिह्न और स्पष्ट पशु/कीट-व्युत्पन्न सामग्री दोनों छपे हैं।", unclearDetail: "सामग्री के नाम से उसका उत्पादन स्रोत तय नहीं होता।", allergenDetail: "ये एलर्जेन सामग्री पैक पर छपी हैं।" },
  mr: { conflict: "शाकाहारी चिन्ह तपासणी", profile: "आहार प्रोफाइल", unclear: "स्रोत दिलेला नाही", allergens: "अॅलर्जेन", conflictDetail: "शाकाहारी चिन्ह आणि स्पष्ट प्राणी/कीटक-व्युत्पन्न घटक दोन्ही छापले आहेत.", unclearDetail: "घटकाच्या नावावरून उत्पादन स्रोत ठरत नाही.", allergenDetail: "हे अॅलर्जेन घटक पॅकवर छापले आहेत." },
  bn: { conflict: "নিরামিষ চিহ্ন যাচাই", profile: "খাদ্য প্রোফাইল", unclear: "উৎস লেখা নেই", allergens: "অ্যালার্জেন", conflictDetail: "নিরামিষ চিহ্ন এবং স্পষ্ট প্রাণী/কীট-উৎপন্ন উপাদান দুটিই মুদ্রিত।", unclearDetail: "উপাদানের নাম উৎপাদন উৎস নিশ্চিত করে না।", allergenDetail: "এই অ্যালার্জেন উপাদানগুলি প্যাকে মুদ্রিত।" },
  ta: { conflict: "சைவ குறி சரிபார்ப்பு", profile: "உணவு சுயவிவரம்", unclear: "மூலம் குறிப்பிடவில்லை", allergens: "ஒவ்வாமைப் பொருட்கள்", conflictDetail: "சைவ குறியும் வெளிப்படையான விலங்கு/பூச்சி மூலப் பொருளும் அச்சிடப்பட்டுள்ளன.", unclearDetail: "மூலப்பொருளின் பெயர் அதன் உற்பத்தி மூலத்தை நிரூபிக்காது.", allergenDetail: "இந்த ஒவ்வாமைப் பொருட்கள் பேக்கில் அச்சிடப்பட்டுள்ளன." },
  te: { conflict: "శాకాహార గుర్తు తనిఖీ", profile: "ఆహార ప్రొఫైల్", unclear: "మూలం పేర్కొనలేదు", allergens: "అలెర్జెన్లు", conflictDetail: "శాకాహార గుర్తు మరియు స్పష్టమైన జంతు/కీటక మూల పదార్థం రెండూ ముద్రించబడ్డాయి.", unclearDetail: "పదార్థం పేరు ఉత్పత్తి మూలాన్ని నిర్ధారించదు.", allergenDetail: "ఈ అలెర్జెన్ పదార్థాలు ప్యాక్‌పై ముద్రించబడ్డాయి." },
  kn: { conflict: "ಸಸ್ಯಾಹಾರಿ ಗುರುತು ಪರಿಶೀಲನೆ", profile: "ಆಹಾರ ಪ್ರೊಫೈಲ್", unclear: "ಮೂಲ ತಿಳಿಸಿಲ್ಲ", allergens: "ಅಲರ್ಜನ್‌ಗಳು", conflictDetail: "ಸಸ್ಯಾಹಾರಿ ಗುರುತು ಮತ್ತು ಸ್ಪಷ್ಟ ಪ್ರಾಣಿ/ಕೀಟ ಮೂಲದ ಘಟಕ ಎರಡೂ ಮುದ್ರಿತವಾಗಿವೆ.", unclearDetail: "ಘಟಕದ ಹೆಸರು ಉತ್ಪಾದನಾ ಮೂಲವನ್ನು ದೃಢಪಡಿಸುವುದಿಲ್ಲ.", allergenDetail: "ಈ ಅಲರ್ಜನ್ ಘಟಕಗಳು ಪ್ಯಾಕ್‌ನಲ್ಲಿ ಮುದ್ರಿತವಾಗಿವೆ." },
  gu: { conflict: "શાકાહારી ચિહ્ન તપાસ", profile: "આહાર પ્રોફાઇલ", unclear: "સ્ત્રોત જણાવ્યો નથી", allergens: "એલર્જન", conflictDetail: "શાકાહારી ચિહ્ન અને સ્પષ્ટ પ્રાણી/કીટક-ઉદ્ભવ ઘટક બંને છપાયેલા છે.", unclearDetail: "ઘટકનું નામ ઉત્પાદન સ્ત્રોત નક્કી કરતું નથી.", allergenDetail: "આ એલર્જન ઘટકો પેક પર છપાયેલા છે." },
  ml: { conflict: "സസ്യാഹാര ചിഹ്ന പരിശോധന", profile: "ആഹാര പ്രൊഫൈൽ", unclear: "ഉറവിടം പറഞ്ഞിട്ടില്ല", allergens: "അലർജൻകൾ", conflictDetail: "സസ്യാഹാര ചിഹ്നവും വ്യക്തമായ മൃഗ/കീട ഉറവിട ഘടകവും അച്ചടിച്ചിട്ടുണ്ട്.", unclearDetail: "ഘടകത്തിന്റെ പേര് ഉൽപ്പാദന ഉറവിടം തെളിയിക്കുന്നില്ല.", allergenDetail: "ഈ അലർജൻ ഘടകങ്ങൾ പാക്കിൽ അച്ചടിച്ചിട്ടുണ്ട്." },
  pa: { conflict: "ਸ਼ਾਕਾਹਾਰੀ ਨਿਸ਼ਾਨ ਜਾਂਚ", profile: "ਖੁਰਾਕ ਪ੍ਰੋਫਾਈਲ", unclear: "ਸਰੋਤ ਨਹੀਂ ਦਿੱਤਾ", allergens: "ਐਲਰਜਨ", conflictDetail: "ਸ਼ਾਕਾਹਾਰੀ ਨਿਸ਼ਾਨ ਅਤੇ ਸਪੱਸ਼ਟ ਜਾਨਵਰ/ਕੀਟ ਮੂਲ ਸਮੱਗਰੀ ਦੋਵੇਂ ਛਪੇ ਹਨ।", unclearDetail: "ਸਮੱਗਰੀ ਦਾ ਨਾਮ ਉਤਪਾਦਨ ਸਰੋਤ ਸਾਬਤ ਨਹੀਂ ਕਰਦਾ।", allergenDetail: "ਇਹ ਐਲਰਜਨ ਸਮੱਗਰੀ ਪੈਕ ਉੱਤੇ ਛਪੀ ਹੈ।" },
  or: { conflict: "ଶାକାହାରୀ ଚିହ୍ନ ଯାଞ୍ଚ", profile: "ଆହାର ପ୍ରୋଫାଇଲ୍", unclear: "ଉତ୍ସ ଉଲ୍ଲେଖ ନାହିଁ", allergens: "ଆଲର୍ଜେନ୍", conflictDetail: "ଶାକାହାରୀ ଚିହ୍ନ ଏବଂ ସ୍ପଷ୍ଟ ପଶୁ/କୀଟ ଉତ୍ସ ଉପାଦାନ ଉଭୟ ମୁଦ୍ରିତ।", unclearDetail: "ଉପାଦାନର ନାମ ଉତ୍ପାଦନ ଉତ୍ସ ପ୍ରମାଣ କରେ ନାହିଁ।", allergenDetail: "ଏହି ଆଲର୍ଜେନ୍ ଉପାଦାନଗୁଡ଼ିକ ପ୍ୟାକ୍‌ରେ ମୁଦ୍ରିତ।" },
  ur: { conflict: "سبزی خور نشان کی جانچ", profile: "غذائی پروفائل", unclear: "ماخذ درج نہیں", allergens: "الرجن", conflictDetail: "سبزی خور نشان اور واضح حیوانی/حشری جزو دونوں چھپے ہیں۔", unclearDetail: "جزو کا نام پیداواری ماخذ ثابت نہیں کرتا۔", allergenDetail: "یہ الرجِن اجزا پیک پر چھپے ہیں۔" },
};

export function formatDietSignal(signal: DietarySignal, language: LanguageCode): { title: string; headline: string; detail: string } {
  const copy = DIET_COPY[language] ?? DIET_COPY.en;
  const names = signal.matches.slice(0, 3).map((match) => match.displayName).join(", ");
  if (signal.kind === "veg_mark_conflict") return { title: copy.conflict, headline: names, detail: copy.conflictDetail };
  if (signal.kind === "source_unclear") return { title: copy.unclear, headline: names, detail: copy.unclearDetail };
  if (signal.kind === "allergen_profile") return { title: copy.allergens, headline: names, detail: copy.allergenDetail };
  return { title: copy.profile, headline: names, detail: signal.matches.map((match) => match.note).slice(0, 2).join(" ") };
}

export function formatDerivedSignal(signal: DerivedSignal, language: LanguageCode): { title: string; headline: string; detail: string } {
  if (signal.kind === "whole_pack_rda") return formatWholePackSignal(signal, language);
  if (signal.kind === "claim_contradiction") return formatClaimSignal(signal, language);
  return formatDietSignal(signal, language);
}

export function buildCheckStrip(item: ProductAnalysis, signals: readonly DerivedSignal[]): Array<{ label: string; state: "alert" | "pass" | "unknown"; text: string }> {
  const dietary = signals.find((signal) => ["diet_profile", "veg_mark_conflict", "source_unclear"].includes(signal.kind));
  const allergens = signals.find((signal) => signal.kind === "allergen_profile");
  const wholePack = signals.find((signal) => signal.kind === "whole_pack_rda");
  const claim = signals.find((signal) => signal.kind === "claim_contradiction");
  const nutritionRunnable = Boolean(item.nutrition?.basis && item.nutrition.servingSize && item.nutrition.netQuantity);
  return [
    { label: "Diet", state: dietary ? dietary.severity === "high" ? "alert" : "unknown" : item.ingredientTokens?.length ? "pass" : "unknown", text: dietary ? formatDerivedSignal(dietary, "en").headline : item.ingredientTokens?.length ? "checked" : "not readable" },
    { label: "Allergens", state: allergens ? "alert" : item.ingredientTokens?.length ? "pass" : "unknown", text: allergens ? formatDerivedSignal(allergens, "en").headline : item.ingredientTokens?.length ? "none detected" : "not readable" },
    { label: "Whole pack", state: wholePack ? "alert" : nutritionRunnable ? "pass" : "unknown", text: wholePack ? formatDerivedSignal(wholePack, "en").headline : nutritionRunnable ? "checked" : "missing inputs" },
    { label: "Claims", state: claim ? "alert" : item.claimsAsPrinted?.length ? "pass" : "unknown", text: claim ? formatDerivedSignal(claim, "en").headline : item.claimsAsPrinted?.length ? "checked" : "no claim read" },
  ];
}

export function buildVerdict(signals: readonly DerivedSignal[], language: LanguageCode): string | null {
  if (!signals.length) return null;
  return signals.slice(0, 2).map((signal) => formatDerivedSignal(signal, language).headline).join(" · ");
}
