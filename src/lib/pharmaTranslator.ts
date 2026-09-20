// Comprehensive Pharmaceutical & Medical English Translation and Transliteration Engine

export function isArabicOrKurdishText(text: string): boolean {
  if (!text) return false;
  // Arabic Unicode block: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

// Convert Eastern Arabic numerals (٠-٩) to Western (0-9)
export function normalizeArabicNumbers(text: string): string {
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = text;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(easternDigits[i], String(i));
  }
  return res;
}

// Direct known drug / pharmaceutical dictionary
const PHARMA_DICTIONARY: Record<string, string> = {
  // Common Painkillers & Antipyretics
  'بنادول': 'Panadol',
  'بانادول': 'Panadol',
  'بنادول اكسترا': 'Panadol Extra',
  'بانادول اكسترا': 'Panadol Extra',
  'بنادول كولد اند فلو': 'Panadol Cold & Flu',
  'بنادول نايت': 'Panadol Night',
  'بنادول اكتيفاست': 'Panadol Actifast',
  'بنادول ادفانس': 'Panadol Advance',
  'بنادول جوينت': 'Panadol Joint',
  'بنادول سينس': 'Panadol Sinus',
  'باراسيتامول': 'Paracetamol',
  'باراسيتامول 500': 'Paracetamol 500mg',
  'باراسيتامول 1000': 'Paracetamol 1000mg',
  'سيتامول': 'Cetamol',
  'فيفادول': 'Fevadol',
  'ادول': 'Adol',
  'بروفين': 'Brufen',
  'ايبوبروفين': 'Ibuprofen',
  'فولتارين': 'Voltaren',
  'ديكلوفيناك': 'Diclofenac',
  'ديكلوفيناك صوديوم': 'Diclofenac Sodium',
  'ديكلوفيناك بوتاسيوم': 'Diclofenac Potassium',
  'كاتافاست': 'Catafast',
  'كاتافلام': 'Cataflam',
  'اولفين': 'Olfen',
  'اسبرين': 'Aspirin',
  'اسبرين بروتكت': 'Aspirin Protect',
  'جوسبرين': 'Jusprin',
  'كوكسيب': 'Coxib',
  'سيليكوكسيب': 'Celecoxib',
  'سيلبركس': 'Celebrex',
  'ميلوكسيكام': 'Meloxicam',
  'موفيكس': 'Mobic',
  'نابروكسين': 'Naproxen',
  'بروك سين': 'Proxen',
  'بارافون': 'Parafon',
  'ميولجين': 'Myolgin',
  'ريلاكسون': 'Relaxon',
  'ترامادول': 'Tramadol',
  'بونستان': 'Ponstan',
  'ميفيناميك': 'Mefenamic Acid',

  // Antibiotics & Antivirals
  'اموكسيسيلين': 'Amoxicillin',
  'اموكسيل': 'Amoxil',
  'اوغمنتين': 'Augmentin',
  'اوجمنتين': 'Augmentin',
  'كلافوكس': 'Klavox',
  'ميجاموكس': 'Megamox',
  'ازيثرومايسين': 'Azithromycin',
  'زيتروماكس': 'Zithromax',
  'زوسين': 'Zocin',
  'سيبروفلوكساسين': 'Ciprofloxacin',
  'سيبرو': 'Cipro',
  'سيفيكسيم': 'Cefixime',
  'سوبراكس': 'Suprax',
  'سيفادروكسيل': 'Cefadroxil',
  'سيفوروكسيم': 'Cefuroxime',
  'زيناسيف': 'Zinacef',
  'سفترياكسون': 'Ceftriaxone',
  'روسيفين': 'Rocephin',
  'سيفوتاكسيم': 'Cefotaxime',
  'كلاريثرومايسين': 'Clarithromycin',
  'كلاسيد': 'Klacid',
  'دوكسيسايكلين': 'Doxycycline',
  'تتراسايكلين': 'Tetracycline',
  'ميترونيدازول': 'Metronidazole',
  'فلاجيل': 'Flagyl',
  'اسيكلوفير': 'Acyclovir',
  'زوفيراكس': 'Zovirax',

  // Gastrointestinal & Antacids
  'اوميبرازول': 'Omeprazole',
  'لوسيك': 'Losec',
  'جاستروزول': 'Gastrozole',
  'نيكسيوم': 'Nexium',
  'ايزوميبرازول': 'Esomeprazole',
  'بانتوبرازول': 'Pantoprazole',
  'كونترولوك': 'Controloc',
  'لانسوبرازول': 'Lansoprazole',
  'لانزور': 'Lanzor',
  'فاموتيدين': 'Famotidine',
  'انتودين': 'Antodine',
  'رانيتيدين': 'Ranitidine',
  'زانتاك': 'Zantac',
  'موتيليوم': 'Motilium',
  'دومبيريدون': 'Domperidone',
  'بلاسل': 'Plasil',
  'ميتوكلوبراميد': 'Metoclopramide',
  'دوسباتالين': 'Duspatalin',
  'ميبفيرين': 'Mebeverine',
  'كولونا': 'Colona',
  'سباسموبان': 'Spasmopan',
  'بوسكوبان': 'Buscopan',
  'هيوسين': 'Hyoscine',
  'مالوكس': 'Maalox',
  'جافيسكون': 'Gaviscon',
  'انتينال': 'Antinal',
  'ديسفلاتيل': 'Disflatyl',
  'سيميثيكون': 'Simethicone',

  // Cardiovascular & Hypertension
  'كونكور': 'Concor',
  'بيسوبرولول': 'Bisoprolol',
  'املوديبين': 'Amlodipine',
  'نورفاسك': 'Norvasc',
  'كابتوبريل': 'Captopril',
  'كابوتين': 'Capoten',
  'لوسارتان': 'Losartan',
  'كوزار': 'Cozaar',
  'فالسارتان': 'Valsartan',
  'ديوفان': 'Diovan',
  'اتينولول': 'Atenolol',
  'تينورمين': 'Tenormin',
  'انديرال': 'Inderal',
  'بروبرانولول': 'Propranolol',
  'اتورفاستاتين': 'Atorvastatin',
  'ليبيتور': 'Lipitor',
  'اتور': 'Ator',
  'روسوفاستاتين': 'Rosuvastatin',
  'كريستور': 'Crestor',
  'بلافيكس': 'Plavix',
  'كلوبيدوجريل': 'Clopidogrel',
  'لازيكس': 'Lasix',
  'فوروسيميد': 'Furosemide',

  // Diabetes & Endocrine
  'جلوكوفاج': 'Glucophage',
  'ميتفورمين': 'Metformin',
  'سيدوفاج': 'Cidophage',
  'اماريل': 'Amaryl',
  'جليميبريد': 'Glimepiride',
  'داونيل': 'Daonil',
  'جليبينكلاميد': 'Glibenclamide',
  'جانوفيا': 'Januvia',
  'سيتاجليبتين': 'Sitagliptin',
  'جانوميت': 'Janumet',
  'جالفوس': 'Galvus',
  'جالفوس مت': 'Galvus Met',
  'فورسيجا': 'Forxiga',
  'جارديانس': 'Jardiance',
  'التيروكسين': 'Eltroxin',
  'ليفوثيروكسين': 'Levothyroxine',

  // Allergy & Respiratory
  'كلاريتين': 'Claritin',
  'لوراتادين': 'Loratadine',
  'زيرتك': 'Zyrtec',
  'سيتريزين': 'Cetirizine',
  'ايريوس': 'Aerius',
  'ديسلوراتادين': 'Desloratadine',
  'تيلفاست': 'Telfast',
  'فيكسوفينادين': 'Fexofenadine',
  'هيستادين': 'Histadin',
  'كولد اند فلو': 'Cold & Flu',
  'كومتركس': 'Comtrex',
  'كونجستال': 'Congestal',
  'فلودريكس': 'Fludrex',
  'فينتولين': 'Ventolin',
  'سالبوتامول': 'Salbutamol',
  'بروسبان': 'Prospan',
  'اولفنت': 'Allvent',
  'ميوكوسولفان': 'Mucosolvan',
  'امبروكسول': 'Ambroxol',
  'بيسولفون': 'Bisolvon',
  'برومهيكسين': 'Bromhexine',
  'سيريتيد': 'Seretide',
  'سينجولير': 'Singulair',
  'مونتيلوكاست': 'Montelukast',

  // Corticosteroids
  'ديكساميثازون': 'Dexamethasone',
  'ديكساميد': 'Dexamid',
  'هيدروكورتيزون': 'Hydrocortisone',
  'بريدنيزولون': 'Prednisolone',
  'كورتيديرم': 'Cortiderm',
  'بيتاميثازون': 'Betamethasone',
  'بيتنيفيت': 'Betnovate',
  'ديرموفيت': 'Dermovate',
  'كلوبيتاسول': 'Clobetasol',

  // Vitamins & Supplements
  'فيتامين سي': 'Vitamin C',
  'فيتامين ج': 'Vitamin C',
  'سيفيتيل': 'Cevitil',
  'فيتامين د': 'Vitamin D',
  'فيتامين د3': 'Vitamin D3',
  'ديفارول': 'Devarol',
  'اوستيوكير': 'Osteocare',
  'فيتامين ب': 'Vitamin B',
  'فيتامين ب12': 'Vitamin B12',
  'فيتامين ب كومبلكس': 'Vitamin B-Complex',
  'نيوروبيون': 'Neurobion',
  'نيوروربين': 'Neurorubine',
  'فيتامين هـ': 'Vitamin E',
  'اوميغا 3': 'Omega-3',
  'زيت السمك': 'Fish Oil',
  'زنك': 'Zinc',
  'كالسيوم': 'Calcium',
  'حديد': 'Iron',
  'فيروجلوبين': 'Feroglobin',
  'فيروسانول': 'Ferosanol',
  'فوليك اسيد': 'Folic Acid',
  'حمض الفوليك': 'Folic Acid',
  'كولاجين': 'Collagen',
  'سنتروم': 'Centrum',
  'بيوتين': 'Biotin',
  'مغنيسيوم': 'Magnesium',

  // Antifungal & Skin / Eye
  'كانستين': 'Canesten',
  'كلوتريمازول': 'Clotrimazole',
  'دكتارين': 'Daktarin',
  'ميكونازول': 'Miconazole',
  'ديفلوكان': 'Diflucan',
  'فلوكونازول': 'Fluconazole',
  'فيوسيدين': 'Fucidin',
  'فيوسيديك اسيد': 'Fusidic Acid',
  'ميبو': 'Mebo',
  'بانثينول': 'Panthenol',
  'بيبانثين': 'Bepanthen',
  'توبرادكس': 'Tobradex',
  'توبريكس': 'Tobrex',
  'توبرامايسين': 'Tobramycin',
  'اوتريفين': 'Otrivin',
  'زايلوميتازولين': 'Xylometazoline',
  'نورمال سلاين': 'Normal Saline',

  // Neuro / Psych
  'نيوروتوب': 'Neurotop',
  'كاربامازيبين': 'Carbamazepine',
  'تيجريتول': 'Tegretol',
  'جابابنتين': 'Gabapentin',
  'نيورونتين': 'Neurontin',
  'ليريكا': 'Lyrica',
  'بريجابالين': 'Pregabalin',
  'سيتالوبرام': 'Citalopram',
  'سيرترالين': 'Sertraline',
  'زولوفت': 'Zoloft'
};

// Forms & Types dictionary
const PHARMA_FORMS_AND_UNITS: Record<string, string> = {
  'حبوب': 'Tab',
  'أقراص': 'Tab',
  'اقراص': 'Tab',
  'حبة': 'Tab',
  'قرص': 'Tab',
  'حەب': 'Tab',
  'كبسول': 'Cap',
  'كبسولات': 'Cap',
  'كبسولة': 'Cap',
  'کەپسول': 'Cap',
  'شراب': 'Syrup',
  'شربات': 'Syrup',
  'شەربەت': 'Syrup',
  'نقط': 'Drops',
  'قطرة': 'Drops',
  'قترة': 'Drops',
  'قەترە': 'Drops',
  'مرهم': 'Ointment',
  'دهن': 'Ointment',
  'مەرهەم': 'Ointment',
  'كريم': 'Cream',
  'جل': 'Gel',
  'جيل': 'Gel',
  'حقن': 'Inj',
  'حقنة': 'Inj',
  'إبرة': 'Inj',
  'ابرة': 'Inj',
  'امبول': 'Ampoule',
  'أمبول': 'Ampoule',
  'دەرزی': 'Inj',
  'بخاخ': 'Spray',
  'رذاذ': 'Spray',
  'غسول': 'Lotion',
  'فوار': 'Effervescent',
  'ظرف': 'Sachet',
  'أظرف': 'Sachets',
  'اظرف': 'Sachets',
  'تحاميل': 'Suppository',
  'تحميلة': 'Suppository',
  'ملغم': 'mg',
  'ملغ': 'mg',
  'مغ': 'mg',
  'مل': 'ml',
  'ملل': 'ml',
  'غم': 'g',
  'غرام': 'g',
  'علبة': 'Box',
  'باكيت': 'Pack',
  'شريط': 'Strip',
  'قطعة': 'Pcs',
  'لتر': 'L'
};

// Phonetic transliteration table for Arabic letters to Latin
const ARABIC_PHONETICS: Record<string, string> = {
  'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'Aa', 'ء': '',
  'ب': 'B', 'ت': 'T', 'ث': 'Th', 'ج': 'J', 'ح': 'H',
  'خ': 'Kh', 'د': 'D', 'ذ': 'Dh', 'ر': 'R', 'ز': 'Z',
  'س': 'S', 'ش': 'Sh', 'ص': 'S', 'ض': 'D', 'ط': 'T',
  'ظ': 'Z', 'ع': 'A', 'غ': 'Gh', 'ف': 'F', 'ق': 'Q',
  'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H',
  'و': 'O', 'ؤ': 'O', 'ي': 'Y', 'ئ': 'Y', 'ى': 'A',
  'ة': 'a', 'گ': 'G', 'چ': 'Ch', 'پ': 'P', 'ژ': 'Zh', 'ڤ': 'V',
  'ۆ': 'O', 'ێ': 'E', 'ە': 'a', 'ڵ': 'l', 'ڕ': 'r'
};

export function transliterateArabicToEnglish(text: string): string {
  if (!text) return '';
  const normalized = normalizeArabicNumbers(text);
  let result = '';
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (ARABIC_PHONETICS[char] !== undefined) {
      result += ARABIC_PHONETICS[char];
    } else {
      result += char;
    }
  }

  // Clean up double vowels or messy strings
  return result
    .replace(/\s+/g, ' ')
    .replace(/\b([a-z])/g, (_, letter) => letter.toUpperCase())
    .trim();
}

/**
 * Translates a raw pharmacy receipt / medicine name into clean English pharmaceutical terminology
 */
export function toPharmaceuticalEnglish(rawName: string, nameAr?: string, dosageForm?: string): string {
  if (!rawName && !nameAr) return 'Product';
  
  const sourceText = normalizeArabicNumbers((rawName || nameAr || '').trim());

  // If already mostly English (contains Latin letters and few or no Arabic characters), return cleaned Latin text
  if (!isArabicOrKurdishText(sourceText)) {
    return sourceText;
  }

  // 1. Check exact or longest matching drug name in PHARMA_DICTIONARY
  let workingText = sourceText;
  const sortedDictKeys = Object.keys(PHARMA_DICTIONARY).sort((a, b) => b.length - a.length);

  for (const arKey of sortedDictKeys) {
    if (workingText.includes(arKey)) {
      workingText = workingText.replaceAll(arKey, PHARMA_DICTIONARY[arKey]);
    }
  }

  // 2. Replace forms, units, and terms
  const sortedFormKeys = Object.keys(PHARMA_FORMS_AND_UNITS).sort((a, b) => b.length - a.length);
  for (const formKey of sortedFormKeys) {
    const regex = new RegExp(`(^|\\s)${formKey}(\\s|$)`, 'g');
    workingText = workingText.replace(regex, `$1${PHARMA_FORMS_AND_UNITS[formKey]}$2`);
  }

  // 3. If any Arabic words still remain in workingText, transliterate them
  const words = workingText.split(/\s+/);
  const translatedWords = words.map(w => {
    if (isArabicOrKurdishText(w)) {
      return transliterateArabicToEnglish(w);
    }
    return w;
  });

  let finalName = translatedWords.join(' ').replace(/\s+/g, ' ').trim();

  // If dosageForm provided and not in name, append it nicely
  if (dosageForm && dosageForm !== 'Tablet' && !finalName.toLowerCase().includes(dosageForm.toLowerCase())) {
    finalName += ` (${dosageForm})`;
  }

  // Capitalize properly
  finalName = finalName.replace(/\b([a-z])/g, (_, l) => l.toUpperCase());

  return finalName || sourceText;
}
