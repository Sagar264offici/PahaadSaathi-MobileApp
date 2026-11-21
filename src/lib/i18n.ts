/**
 * PahaadSaathi — Bilingual String Helper
 * Supports English (en) and Hindi (hi)
 */

export type Lang = 'en' | 'hi';

export interface BilingualString {
  en: string;
  hi: string;
}

export function t(str: BilingualString, lang: Lang): string {
  return str[lang];
}

export const strings = {
  // Report Screen
  reportIncident:       { en: 'Report Incident',              hi: 'घटना रिपोर्ट करें' },
  reportIncidentSub:    { en: 'Document a hazard with photo + GPS', hi: 'फोटो और GPS से खतरा दर्ज करें' },
  photoEvidence:        { en: 'Photo Evidence',               hi: 'फोटो साक्ष्य' },
  photoOptional:        { en: 'Optional but strongly recommended', hi: 'वैकल्पिक लेकिन अनुशंसित' },
  takePhoto:            { en: 'Take Photo',                   hi: 'फोटो लें' },
  chooseGallery:        { en: 'From Gallery',                 hi: 'गैलरी से' },
  gpsTagged:            { en: 'GPS auto-tagged',              hi: 'GPS स्वतः टैग' },
  captureLocation:      { en: 'Capture Location',             hi: 'स्थान कैप्चर करें' },
  locationPlaceholder:  { en: 'e.g. Rudraprayag bypass, NH-07', hi: 'जैसे रुद्रप्रयाग बाईपास, NH-07' },
  incidentType:         { en: 'Incident Type',                hi: 'घटना का प्रकार' },
  severity:             { en: 'Severity',                     hi: 'गंभीरता' },
  description:          { en: 'Description',                  hi: 'विवरण' },
  descPlaceholder:      { en: 'Describe what you see...',     hi: 'आप क्या देख रहे हैं...' },
  submitReport:         { en: 'Submit Report',                hi: 'रिपोर्ट जमा करें' },
  sendSms:              { en: 'Send via SMS',                 hi: 'SMS से भेजें' },
  submitting:           { en: 'Submitting…',                  hi: 'जमा हो रहा है…' },
  offline:              { en: 'Offline — SMS will be used',   hi: 'ऑफलाइन — SMS उपयोग होगा' },
  online:               { en: 'Online — Secure report',       hi: 'ऑनलाइन — सुरक्षित रिपोर्ट' },
  reporterPhone:        { en: 'Your phone (for authority verification)', hi: 'आपका फोन (सत्यापन के लिए)' },
  phonePlaceholder:     { en: '+91 XXXXX XXXXX',              hi: '+91 XXXXX XXXXX' },

  // Control Room
  controlRoom:          { en: 'District Control Room',        hi: 'जिला नियंत्रण कक्ष' },
  officerLogin:         { en: 'Officer Login',                hi: 'अधिकारी लॉगिन' },
  phoneOtp:             { en: 'Enter phone number',           hi: 'फोन नंबर दर्ज करें' },
  sendOtp:              { en: 'Send OTP',                     hi: 'OTP भेजें' },
  enterOtp:             { en: 'Enter OTP',                    hi: 'OTP दर्ज करें' },
  verifyOtp:            { en: 'Verify & Login',               hi: 'सत्यापित करें और लॉगिन करें' },
  pendingReports:       { en: 'Pending Verification',         hi: 'सत्यापन लंबित' },
  callToVerify:         { en: 'Call Reporter',                hi: 'रिपोर्टर को कॉल करें' },
  markReal:             { en: 'Confirm ✓ Real',               hi: 'वास्तविक ✓ पुष्टि करें' },
  markFake:             { en: 'Dismiss ✗ Fake',               hi: 'नकली ✗ खारिज करें' },
  verified:             { en: 'Verified',                     hi: 'सत्यापित' },
  dismissed:            { en: 'Dismissed',                    hi: 'खारिज' },
  auditLog:             { en: 'Audit Log',                    hi: 'ऑडिट लॉग' },

  // General
  back:                 { en: 'Back',                         hi: 'वापस' },
  cancel:               { en: 'Cancel',                       hi: 'रद्द करें' },
  retry:                { en: 'Retry',                        hi: 'पुनः प्रयास करें' },
  loading:              { en: 'Loading…',                     hi: 'लोड हो रहा है…' },
  gpsCapturing:         { en: 'Locating…',                    hi: 'स्थान खोजा जा रहा है…' },
  gpsLocked:            { en: 'GPS Locked',                   hi: 'GPS लॉक' },
};
