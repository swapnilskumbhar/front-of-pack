import type { LanguageCode } from "../domain/language.ts";
import type { ClaimContradictionSignal, DerivedNutrient, DerivedSignal, DietarySignal, ReferenceRdaSignal, WholePackSignal } from "./types.ts";
import type { Finding, FindingKind, FindingTopic, ProductAnalysis } from "../domain/analysis.ts";
import { didAnyRuleBasedCheckRun } from "./rating.ts";

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

const RDA_SCOPE_COPY: Record<LanguageCode, { serving: string; pack: string; calculated: string; online: string }> = {
  en: { serving: "serving", pack: "whole pack", calculated: "calculated", online: "online match" },
  hi: { serving: "सर्विंग", pack: "पूरा पैक", calculated: "गणना", online: "ऑनलाइन मिलान" },
  mr: { serving: "सर्व्हिंग", pack: "संपूर्ण पॅक", calculated: "गणना", online: "ऑनलाइन जुळणी" },
  bn: { serving: "পরিবেশন", pack: "পুরো প্যাক", calculated: "গণনা", online: "অনলাইন মিল" },
  ta: { serving: "பரிமாறல்", pack: "முழு பேக்", calculated: "கணக்கீடு", online: "இணையப் பொருத்தம்" },
  te: { serving: "సర్వింగ్", pack: "మొత్తం ప్యాక్", calculated: "లెక్కింపు", online: "ఆన్‌లైన్ సరిపోలిక" },
  kn: { serving: "ಸರ್ವಿಂಗ್", pack: "ಪೂರ್ಣ ಪ್ಯಾಕ್", calculated: "ಲೆಕ್ಕ", online: "ಆನ್‌ಲೈನ್ ಹೊಂದಾಣಿಕೆ" },
  gu: { serving: "સર્વિંગ", pack: "આખું પેક", calculated: "ગણતરી", online: "ઓનલાઇન મેળ" },
  ml: { serving: "സെർവിംഗ്", pack: "മുഴുവൻ പാക്ക്", calculated: "കണക്കാക്കിയത്", online: "ഓൺലൈൻ പൊരുത്തം" },
  pa: { serving: "ਸਰਵਿੰਗ", pack: "ਪੂਰਾ ਪੈਕ", calculated: "ਗਣਨਾ", online: "ਆਨਲਾਈਨ ਮੇਲ" },
  or: { serving: "ସର୍ଭିଂ", pack: "ସମ୍ପୂର୍ଣ୍ଣ ପ୍ୟାକ୍", calculated: "ଗଣନା", online: "ଅନଲାଇନ୍ ମେଳ" },
  ur: { serving: "سرونگ", pack: "پورا پیک", calculated: "حساب", online: "آن لائن مماثلت" },
};

export function formatReferenceRdaSignal(signal: ReferenceRdaSignal, language: LanguageCode): { title: string; headline: string; detail: string } {
  const copy = COPY[language] ?? COPY.en;
  const scopeCopy = RDA_SCOPE_COPY[language] ?? RDA_SCOPE_COPY.en;
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const scope = signal.scope === "whole_pack" ? scopeCopy.pack
    : signal.scope === "per_serving" ? scopeCopy.serving
      : signal.scope === "per_100ml" ? "100 ml" : "100 g";
  const provenance = signal.source === "hosted_web_search" ? ` · ${scopeCopy.online}` : "";
  return {
    title: copy.nutrients[signal.nutrient],
    headline: `${number.format(signal.amount)} ${signal.unit} / ${scope} · ~${number.format(signal.rdaPercent)}% RDA (${scopeCopy.calculated})${provenance}`,
    detail: `FSSAI adult reference: ${number.format(signal.referenceAmount)} ${signal.unit}.`,
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
  const names = signal.matches.slice(0, 6).map((match) => match.displayName).join(", ");
  if (signal.kind === "veg_mark_conflict") return { title: copy.conflict, headline: names, detail: copy.conflictDetail };
  if (signal.kind === "source_unclear") return { title: copy.unclear, headline: names, detail: copy.unclearDetail };
  if (signal.kind === "allergen_profile") return { title: copy.allergens, headline: names, detail: copy.allergenDetail };
  return { title: copy.profile, headline: names, detail: signal.matches.map((match) => match.note).slice(0, 3).join(" ") };
}

export function formatDerivedSignal(signal: DerivedSignal, language: LanguageCode): { title: string; headline: string; detail: string } {
  if (signal.kind === "whole_pack_rda") return formatWholePackSignal(signal, language);
  if (signal.kind === "reference_rda") return formatReferenceRdaSignal(signal, language);
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
  return signals.map((signal) => formatDerivedSignal(signal, language).headline).join(" · ");
}

export type AttentionLevel = "needs_attention" | "some_caution" | "no_major_concern" | "not_enough_information";

export function buildAttentionIndicator(item: ProductAnalysis, signals: readonly DerivedSignal[], language: LanguageCode): { level: AttentionLevel; title: string; summary: string } {
  const highSignal = signals.find((signal) => signal.severity === "high");
  const uncertainSignal = signals.find((signal) => signal.kind === "source_unclear");
  const materialFinding = getDecisionFindings(item).find((finding) => finding.level === "attention");
  if (highSignal) {
    return { level: "needs_attention", title: indicatorTitle("needs_attention", language), summary: formatDerivedSignal(highSignal, language).headline };
  }
  if (materialFinding) {
    return { level: "some_caution", title: indicatorTitle("some_caution", language), summary: materialFinding.explanation };
  }
  if (uncertainSignal) {
    return { level: "some_caution", title: indicatorTitle("some_caution", language), summary: formatDerivedSignal(uncertainSignal, language).headline };
  }
  const ranAnyCheck = didAnyRuleBasedCheckRun(item, signals);
  if (ranAnyCheck && !item.needsClearerImage) {
    return { level: "no_major_concern", title: indicatorTitle("no_major_concern", language), summary: item.summary ?? "" };
  }
  return { level: "not_enough_information", title: indicatorTitle("not_enough_information", language), summary: item.retakeGuidance ?? item.summary ?? "More of the package is needed for a useful decision." };
}

export function buildProductProfile(item: ProductAnalysis, signals: readonly DerivedSignal[]): string | null {
  if (item.profile?.length) return item.profile.map((tag) => tag.label).slice(0, 6).join(" · ");
  const parts: string[] = [];
  if (item.printedVegMark === "veg") parts.push("VEG mark");
  if (item.printedVegMark === "non_veg") parts.push("NON-VEG mark");
  if (item.claimsAsPrinted?.some((claim) => /caffeine/iu.test(claim))) parts.push("caffeine declared");
  if (signals.some((signal) => signal.kind === "veg_mark_conflict" || signal.kind === "diet_profile" && signal.severity === "high")) parts.push("animal/insect-derived ingredient");
  if (signals.some((signal) => signal.kind === "source_unclear")) parts.push("ingredient source unclear");
  if (signals.some((signal) => signal.kind === "allergen_profile")) parts.push("allergens identified");
  return parts.length ? parts.slice(0, 6).join(" · ") : null;
}

export function getDecisionFindings(item: ProductAnalysis): Finding[] {
  const onlineEvidenceIds = new Set(
    (item.evidence ?? []).filter((evidence) => evidence.origin === "hosted_web_search").map((evidence) => evidence.id),
  );
  return (item.findings ?? []).filter((finding) => {
    if (finding.level === "unknown" || isMissingInformationFinding(finding.title, finding.explanation)) return false;
    const reliesOnWeb = (finding.evidenceIds ?? []).some((id) => onlineEvidenceIds.has(id));
    if (reliesOnWeb && item.webMatchConfidence !== "high" && item.webMatchConfidence !== "medium") return false;
    return finding.level === "attention" || finding.kind !== "label_fact" ||
      /(?:vegetarian|\bveg\b|non-veg|caffeine)/iu.test(`${finding.title} ${finding.explanation}`);
  });
}

export function getDecisionUsefulWebEvidenceIds(item: ProductAnalysis): Set<string> {
  if (item.webMatchConfidence !== "high" && item.webMatchConfidence !== "medium") return new Set();
  const webEvidenceIds = new Set(
    (item.evidence ?? []).filter((evidence) => evidence.origin === "hosted_web_search").map((evidence) => evidence.id),
  );
  return new Set(getDecisionFindings(item).flatMap((finding) => finding.evidenceIds ?? []).filter((id) => webEvidenceIds.has(id)));
}

export type ShopperIndicatorTone = "red" | "amber" | "green" | "grey";
export type ShopperIndicatorOrigin = "engine" | "model";
export type ShopperIndicatorTopic = FindingTopic | "unknown";

export interface ShopperIndicator {
  tone: ShopperIndicatorTone;
  origin: ShopperIndicatorOrigin;
  topic: ShopperIndicatorTopic;
  ruleId: string | null;
  title: string;
  detail: string;
  evidenceIds: string[];
}

/** The only primary-response contract: named facts, never an unexplained umbrella rating. */
export function buildShopperIndicators(
  item: ProductAnalysis,
  signals: readonly DerivedSignal[],
  language: LanguageCode,
): ShopperIndicator[] {
  const indicators: ShopperIndicator[] = getDecisionFindings(item).map((finding) => {
    return {
      tone: finding.level === "attention" ? "amber" : "green",
      origin: "model",
      topic: findingTopic(finding),
      ruleId: null,
      title: finding.title.trim().toUpperCase(),
      detail: finding.explanation.trim(),
      evidenceIds: finding.evidenceIds ?? [],
    };
  });

  for (const signal of signals) {
    const copy = formatDerivedSignal(signal, language);
    const tone: ShopperIndicatorTone = signal.severity === "high"
      ? "red"
      : signal.kind === "source_unclear" ||
          (signal.kind === "whole_pack_rda" || signal.kind === "reference_rda") && signal.severity === "moderate"
        ? "amber"
        : "green";
    const title = (signal.kind === "whole_pack_rda" || signal.kind === "reference_rda") && signal.severity === "high"
      ? `${highWord(language)} ${COPY[language]?.nutrients[signal.nutrient] ?? COPY.en.nutrients[signal.nutrient]}`.toUpperCase()
      : signal.kind === "whole_pack_rda"
        ? (COPY[language]?.nutrients[signal.nutrient] ?? COPY.en.nutrients[signal.nutrient]).toUpperCase()
        : copy.title.toUpperCase();
    const topic = signalTopic(signal);
    const canMerge = ["added_sugars", "saturated_fat", "sodium", "total_fat", "allergen"].includes(topic);
    const sameTopic = canMerge ? indicators.find((indicator) => indicator.topic === topic) : undefined;
    if (sameTopic) {
      sameTopic.title = title;
      sameTopic.detail = copy.headline;
      sameTopic.tone = signal.severity === "info" && sameTopic.tone === "amber" ? "amber" : tone;
      sameTopic.origin = "engine";
      sameTopic.topic = topic;
      sameTopic.ruleId = signalRuleId(signal);
      if (signal.kind === "reference_rda") sameTopic.evidenceIds = [...new Set([...sameTopic.evidenceIds, ...signal.evidenceIds])];
    } else {
      indicators.push({
        tone,
        origin: "engine",
        topic,
        ruleId: signalRuleId(signal),
        title,
        detail: copy.headline,
        evidenceIds: signal.kind === "reference_rda" ? signal.evidenceIds : [],
      });
    }
  }

  if (indicators.length > 0) return indicators.sort(compareIndicators);

  const ranAnyCheck = didAnyRuleBasedCheckRun(item, signals);
  if (ranAnyCheck && !item.needsClearerImage) {
    return [{ tone: "green", origin: "model", topic: "label", ruleId: null, title: indicatorTitle("no_major_concern", language), detail: item.summary, evidenceIds: [] }];
  }
  return [{
    tone: "grey",
    origin: "model",
    topic: "unknown",
    ruleId: null,
    title: indicatorTitle("not_enough_information", language),
    detail: item.retakeGuidance ?? item.summary ?? "Send one clear back-panel photo.",
    evidenceIds: [],
  }];
}

function compareIndicators(left: ShopperIndicator, right: ShopperIndicator): number {
  const attention = (indicator: ShopperIndicator) => indicator.tone === "red" || indicator.tone === "amber" ? 0 : indicator.tone === "green" ? 1 : 2;
  const topic: Record<ShopperIndicatorTopic, number> = {
    statutory_warning: 0,
    allergen: 1,
    added_sugars: 2,
    saturated_fat: 3,
    sodium: 4,
    total_fat: 5,
    palm_oil: 6,
    claim: 7,
    diet: 8,
    preservatives: 9,
    colours: 10,
    total_sugars: 11,
    nutrition: 12,
    ingredient: 13,
    label: 14,
    other: 15,
    unknown: 16,
  };
  const tone = (indicator: ShopperIndicator) => ({ red: 0, amber: 1, green: 2, grey: 3 })[indicator.tone];
  const origin = (indicator: ShopperIndicator) => indicator.origin === "engine" ? 0 : 1;
  return attention(left) - attention(right) || topic[left.topic] - topic[right.topic] || tone(left) - tone(right) || origin(left) - origin(right);
}

function findingTopic(finding: Finding): ShopperIndicatorTopic {
  if (finding.topic) return finding.topic;
  const kind: FindingKind = finding.kind;
  if (kind === "regulatory_context") return "statutory_warning";
  if (kind === "nutrition" || kind === "experimental_fop") return "nutrition";
  if (kind === "ingredient") return "ingredient";
  if (kind === "claim_audit") return "claim";
  return "label";
}

function signalTopic(signal: DerivedSignal): ShopperIndicatorTopic {
  if (signal.kind === "whole_pack_rda" || signal.kind === "reference_rda") return signal.nutrient;
  if (signal.kind === "allergen_profile") return "allergen";
  if (signal.kind === "claim_contradiction") return "claim";
  return "diet";
}

function signalRuleId(signal: DerivedSignal): string {
  if (signal.kind === "whole_pack_rda") return "rule-whole-pack-rda";
  if (signal.kind === "reference_rda") return "rule-reference-rda";
  if (signal.kind === "claim_contradiction") return "rule-claim-consistency";
  if (signal.kind === "allergen_profile") return "rule-allergen-profile";
  if (signal.kind === "veg_mark_conflict") return "rule-veg-mark-conflict";
  if (signal.kind === "source_unclear") return "rule-source-unclear";
  return "rule-diet-profile";
}

function highWord(language: LanguageCode): string {
  const words: Record<LanguageCode, string> = {
    en: "HIGH", hi: "अधिक", mr: "जास्त", bn: "বেশি", ta: "அதிக", te: "అధిక", kn: "ಹೆಚ್ಚು",
    gu: "વધુ", ml: "ഉയർന്ന", pa: "ਵੱਧ", or: "ଅଧିକ", ur: "زیادہ",
  };
  return words[language] ?? words.en;
}

export function isMissingInformationFinding(title: string, explanation: string): boolean {
  return /(?:not visible|unreadable|missing|needed|need(?:s|ed)?|not shown|cannot be assessed)/iu.test(`${title} ${explanation}`);
}

function indicatorTitle(level: AttentionLevel, language: LanguageCode): string {
  const titles: Record<LanguageCode, Record<AttentionLevel, string>> = {
    en: { needs_attention: "NEEDS ATTENTION", some_caution: "SOME CAUTION", no_major_concern: "NO MAJOR CONCERN FOUND", not_enough_information: "NOT ENOUGH INFORMATION" },
    hi: { needs_attention: "ध्यान दें", some_caution: "कुछ सावधानी", no_major_concern: "कोई बड़ी चिंता नहीं मिली", not_enough_information: "पर्याप्त जानकारी नहीं" },
    mr: { needs_attention: "लक्ष द्या", some_caution: "काही सावधगिरी", no_major_concern: "मोठी चिंता आढळली नाही", not_enough_information: "पुरेशी माहिती नाही" },
    bn: { needs_attention: "মনোযোগ প্রয়োজন", some_caution: "কিছু সতর্কতা", no_major_concern: "বড় উদ্বেগ পাওয়া যায়নি", not_enough_information: "যথেষ্ট তথ্য নেই" },
    ta: { needs_attention: "கவனம் தேவை", some_caution: "சில எச்சரிக்கை", no_major_concern: "பெரிய கவலை இல்லை", not_enough_information: "போதிய தகவல் இல்லை" },
    te: { needs_attention: "శ్రద్ధ అవసరం", some_caution: "కొంత జాగ్రత్త", no_major_concern: "పెద్ద ఆందోళన కనిపించలేదు", not_enough_information: "తగిన సమాచారం లేదు" },
    kn: { needs_attention: "ಗಮನ ಅಗತ್ಯ", some_caution: "ಸ್ವಲ್ಪ ಎಚ್ಚರಿಕೆ", no_major_concern: "ದೊಡ್ಡ ಕಳವಳ ಕಂಡಿಲ್ಲ", not_enough_information: "ಸಾಕಷ್ಟು ಮಾಹಿತಿ ಇಲ್ಲ" },
    gu: { needs_attention: "ધ્યાન જરૂરી", some_caution: "થોડી સાવચેતી", no_major_concern: "મોટી ચિંતા મળી નથી", not_enough_information: "પૂરતી માહિતી નથી" },
    ml: { needs_attention: "ശ്രദ്ധ വേണം", some_caution: "കുറച്ച് ജാഗ്രത", no_major_concern: "വലിയ ആശങ്ക കണ്ടെത്തിയില്ല", not_enough_information: "മതിയായ വിവരം ഇല്ല" },
    pa: { needs_attention: "ਧਿਆਨ ਦੀ ਲੋੜ", some_caution: "ਕੁਝ ਸਾਵਧਾਨੀ", no_major_concern: "ਵੱਡੀ ਚਿੰਤਾ ਨਹੀਂ ਮਿਲੀ", not_enough_information: "ਕਾਫ਼ੀ ਜਾਣਕਾਰੀ ਨਹੀਂ" },
    or: { needs_attention: "ଧ୍ୟାନ ଆବଶ୍ୟକ", some_caution: "କିଛି ସାବଧାନତା", no_major_concern: "ବଡ଼ ଚିନ୍ତା ମିଳିଲା ନାହିଁ", not_enough_information: "ପର୍ଯ୍ୟାପ୍ତ ସୂଚନା ନାହିଁ" },
    ur: { needs_attention: "توجہ درکار", some_caution: "کچھ احتیاط", no_major_concern: "کوئی بڑی تشویش نہیں ملی", not_enough_information: "کافی معلومات نہیں" },
  };
  return titles[language]?.[level] ?? titles.en[level];
}
