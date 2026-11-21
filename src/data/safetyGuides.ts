export interface EmergencySafetyGuide {
  id: string;
  category:
    | 'landslide'
    | 'flash_flood'
    | 'earthquake'
    | 'avalanche'
    | 'forest_fire'
    | 'accident';
  titleEn: string;
  titleHi: string;
  severity: 'high' | 'critical';
  dosEn: string[];
  dosHi: string[];
  dontsEn: string[];
  dontsHi: string[];
  vitalHelpline: string;
  offlineTipEn: string;
  offlineTipHi: string;
}

export const MOUNTAIN_SAFETY_GUIDES: EmergencySafetyGuide[] = [
  {
    id: 'guide_landslide',
    category: 'landslide',
    titleEn: 'Landslide & Rockfall Preparedness',
    titleHi: 'भूस्खलन एवं मलबा सुरक्षा निर्देशिका',
    severity: 'critical',
    dosEn: [
      'Stay alert for unusual sounds like trees cracking or boulders knocking together.',
      'If escaping path is clear, move immediately away from the landslide path up slope or to stable high ground.',
      'If trapped inside a vehicle or building, curl into a tight ball and protect your head.',
      'Report any newly forming road cracks or weeping water on slopes immediately.',
    ],
    dosHi: [
      'पत्थरों के गिरने या पेड़ों के चटकने जैसी असामान्य आवाजों के प्रति सतर्क रहें।',
      'यदि रास्ता सुरक्षित हो, तो तुरंत ढलान से दूर पक्के ऊंचे स्थान की ओर जाएं।',
      'यदि वाहन या इमारत में फंस जाएं, तो सिर को दोनों हाथों से ढककर सुरक्षित बैठें।',
      'सड़क पर दरारें या ढलानों से अचानक पानी बहने की सूचना तुरंत अधिकारियों को दें।',
    ],
    dontsEn: [
      'Do not cross freshly deposited mud or debris piles; secondary slides frequently follow.',
      'Do not stay under steep river embankments during or immediately after heavy rain.',
      'Do not park vehicles directly under active shooting-stone overhangs.',
    ],
    dontsHi: [
      'ताजे मलबे के ऊपर से गुजरने की कोशिश न करें; दोबारा मलबा आने का खतरा रहता है।',
      'भारी बारिश के दौरान नदी के तेज कटाव वाले किनारों पर न रुकें।',
      'पत्थर गिरने वाले सक्रिय क्षेत्रों (शूटिंग स्टोन जोन) के नीचे वाहन पार्क न करें।',
    ],
    vitalHelpline: '1078 / 112',
    offlineTipEn: 'Landslides are most active 2-4 hours after intense continuous rainfall.',
    offlineTipHi: 'लगातार मूसलाधार बारिश के 2-4 घंटे बाद भूस्खलन की संभावना सर्वाधिक होती है।',
  },
  {
    id: 'guide_flash_flood',
    category: 'flash_flood',
    titleEn: 'Flash Flood & Cloudburst Safety',
    titleHi: 'बादल फटना एवं अचानक बाढ़ सुरक्षा निर्देश',
    severity: 'critical',
    dosEn: [
      'Immediately climb to higher ground away from riverbeds, nullahs, and streams.',
      'Disconnect electrical equipment if water enters premises.',
      'Listen for a roaring sound from upstream valleys indicating a burst dam or surge.',
    ],
    dosHi: [
      'नदी के किनारों, बरसाती नालों और खड्डों से तुरंत ऊंचे स्थानों पर जाएं।',
      'यदि परिसर में पानी भरने लगे तो बिजली का मुख्य स्विच बंद करें।',
      'ऊपरी घाटी से बादलों की तेज गर्जना या पानी के तेज बहाव की आवाज पर सतर्क रहें।',
    ],
    dontsEn: [
      'Never drive or walk through moving water; 6 inches of rapid water can knock you down.',
      'Never seek shelter under narrow bridges or inside riverbed dry washes.',
    ],
    dontsHi: [
      'तेज बहते पानी में कभी वाहन न चलाएं और न ही पैदल पार करने की कोशिश करें।',
      'सकरे पुलों के नीचे या सूखे नदी तलछट में आश्रय न लें।',
    ],
    vitalHelpline: '1070 / 1078',
    offlineTipEn: 'Cloudburst runoffs accelerate rapidly down steep Himalayan ravines.',
    offlineTipHi: 'पहाड़ी घाटियों में बादल फटने का पानी अत्यंत तीव्र गति से नीचे आता है।',
  },
  {
    id: 'guide_earthquake',
    category: 'earthquake',
    titleEn: 'High-Altitude Earthquake Protocol',
    titleHi: 'पर्वतीय भूकंप सुरक्षा प्रक्रिया',
    severity: 'critical',
    dosEn: [
      'DROP, COVER, and HOLD ON under sturdy furniture away from stone masonry.',
      'If outdoors, move into an open meadow away from unstable slopes, power lines, and tall pines.',
      'Check yourself for injuries before moving.',
    ],
    dosHi: [
      'मजबूत मेज या तख्त के नीचे झुकें, सिर ढकें और मजबूती से पकड़ें।',
      'यदि खुले में हैं, तो ढलानों, बिजली के खंभों और ऊंची चट्टानों से दूर खुले मैदान में आएं।',
      'झटके रुकने के बाद सुरक्षित रूप से बाहर निकलें।',
    ],
    dontsEn: [
      'Do not use elevators or run into narrow alleyways with stone parapets.',
      'Do not light matches or gas stoves until gas lines are verified safe.',
    ],
    dontsHi: [
      'संकीर्ण गलियों में पत्थरों की दीवारों के पास न खड़े हों।',
      'गैस रिसाव की जांच किए बिना माचिस या आग न जलाएं।',
    ],
    vitalHelpline: '112 / 1070',
    offlineTipEn: 'Expect aftershocks. Mountain slopes destabilized by shaking are prone to delayed slides.',
    offlineTipHi: 'भूकंप के झटकों के बाद पहाड़ी ढलानों पर भूस्खलन की आशंका बढ़ जाती है।',
  },
  {
    id: 'guide_avalanche',
    category: 'avalanche',
    titleEn: 'Snow Avalanche Survival',
    titleHi: 'हिमस्खलन (एवलांच) बचाव निर्देशिका',
    severity: 'critical',
    dosEn: [
      'If caught in a slide, make swimming motions upward to stay near the surface.',
      'Before snow stops moving, cup hands over mouth to create an air pocket.',
      'Thrust an arm or ski pole toward the snow surface to signal rescuers.',
    ],
    dosHi: [
      'यदि बर्फ के बहाव में फंस जाएं, तो सतह पर रहने के लिए तैरने जैसी गति करें।',
      'बर्फ रुकने से ठीक पहले मुंह के आगे दोनों हाथों से हवा का स्थान (एयर पॉकेट) बनाएं।',
      'हाथ या लाठी को ऊपर बर्फ से बाहर निकालने का प्रयास करें ताकि बचाव दल देख सके।',
    ],
    dontsEn: [
      'Do not scream continuously while buried; it wastes vital oxygen. Shout only when hearing footsteps.',
      'Do not traverse open snow gullies during midday sunshine following heavy snowfall.',
    ],
    dontsHi: [
      'अनावश्यक चिल्लाकर ऑक्सीजन नष्ट न करें; बचाव दल के पैरों की आवाज आने पर ही आवाज लगाएं।',
      'ताजा भारी बर्फबारी के बाद दोपहर की धूप में ढलानों को पार न करें।',
    ],
    vitalHelpline: 'SDRF 9411112973',
    offlineTipEn: 'Survivors found within the first 15 minutes have a 93% survival rate.',
    offlineTipHi: 'पहले 15 मिनट के भीतर बाहर निकाले जाने पर बचने की 93% संभावना होती है।',
  },
  {
    id: 'guide_forest_fire',
    category: 'forest_fire',
    titleEn: 'Forest Fire & Pine Needle Haze',
    titleHi: 'वनाग्नि एवं धुआं बचाव',
    severity: 'high',
    dosEn: [
      'Move perpendicular or downhill away from the fire front; fire travels uphill much faster.',
      'Breathe through a wet cloth or mask to filter pine resin smoke.',
      'Seek open barren ground, rocky riverbeds, or roads cleared of dry pine needles (Pirul).',
    ],
    dosHi: [
      'आग की दिशा के लंबवत (दाएं/बाएं) या नीचे की ओर भागें; आग ऊपर की ओर अत्यंत तीव्र गति से बढ़ती है।',
      'चीड़ के धुएं से बचने के लिए गीले कपड़े से मुंह और नाक ढकें।',
      'पत्थरों वाले नदी तल या पक्की सड़क पर शरण लें जहां सूखा पिरुल (चीड़ की पत्तियां) न हो।',
    ],
    dontsEn: [
      'Do not try to outrun fire up a steep dry slope.',
      'Do not discard cigarette butts or light open campfires in forest corridors.',
    ],
    dontsHi: [
      'सूखी पहाड़ी ढलान पर ऊपर की ओर आग से आगे निकलने का प्रयास न करें।',
      'जंगल क्षेत्र में बीड़ी-सिगरेट या खुली आग न जलाएं।',
    ],
    vitalHelpline: '1926 (Forest Dept) / 112',
    offlineTipEn: 'Dry chir pine needles ignite spontaneously under high mountain temperatures.',
    offlineTipHi: 'सूखे पिरुल में आग अत्यंत तेजी से विस्फोटक रूप ले सकती है।',
  },
  {
    id: 'guide_accident',
    category: 'accident',
    titleEn: 'Mountain Road Accident Response',
    titleHi: 'पहाड़ी मार्ग दुर्घटना एवं प्राथमिक चिकित्सा',
    severity: 'high',
    dosEn: [
      'Place warning stones or hazard triangles 50m before blind curves to alert oncoming traffic.',
      'Call 108 for ambulance and 112 for police immediately.',
      'Apply direct firm pressure on bleeding wounds with clean cloth.',
      'Keep injured persons warm with blankets to counter mountain hypothermia.',
    ],
    dosHi: [
      'अंधे मोड़ों पर आ रहे वाहनों को सचेत करने के लिए 50 मीटर पहले चेतावनी पत्थर या संकेत लगाएं।',
      'एम्बुलेंस के लिए 108 और पुलिस के लिए 112 पर तुरंत कॉल करें।',
      'खून बह रहे घाव पर साफ कपड़े से सीधा दबाव बनाएं।',
      'घायलों को ठंड और हाइपोथर्मिया से बचाने के लिए कंबल या गर्म कपड़ों से ढकें।',
    ],
    dontsEn: [
      'Do not move persons with suspected spinal or neck injuries unless in immediate fire danger.',
      'Do not give water or food to unconscious or semi-conscious persons.',
    ],
    dontsHi: [
      'रीढ़ या गर्दन की चोट वाले व्यक्ति को हिलाने-डुलाने से बचें।',
      'बेहोश या अर्ध-बेहोश व्यक्ति को पानी या भोजन न दें।',
    ],
    vitalHelpline: '108 (Ambulance) / 1033 (Highway)',
    offlineTipEn: 'Every minute counts: provide kilometer marker or prominent landmark when calling.',
    offlineTipHi: 'कॉल करते समय निकटतम किलोमीटर पत्थर या प्रमुख मोड़ का विवरण दें।',
  },
];
