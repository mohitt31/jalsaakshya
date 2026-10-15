export type Lang = "en" | "hi" | "bn"

export const DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah",
  "Jalpaiguri", "Jhargram", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Medinipur",
  "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur",
]

const en = {
  tagline: "Official arsenic and fluoride readings for your village, each cited to its government report page, and the current test status of your drinking-water source.",
  district: "District", contaminant: "Contaminant", both: "Both", arsenic: "Arsenic", fluoride: "Fluoride",
  only_above: "Only above the drinking-water limit", since: "Sampled since", any: "Any year", place: "Village or block starts with",
  above: "Above limit", within: "Within limit", limit: "limit", source: "Source", row: "Show the table row",
  sampled: "sampled", years_old: "years ago", year_unknown: "sampling year not stated",
  creator: "created by curator", loading: "Reading Arkiv…", shown: "records shown",
  none: "No surveyed records match. That does not mean the water is safe: it may never have been tested.",
  more: "Load more", official: "Official survey records", sites_title: "Drinking-water sources: current test status",
  sites_note: "Tests added by Pani Samiti members, ASHAs, field staff or labs. A lab result from a lab in the curator's registry decides. A kit reading only screens: near or above the limit it needs lab confirmation. A source with no current test shows as test overdue, never as safe.",
  st_unsafe: "Unsafe (lab)", st_safe: "Within limit", st_confirm: "Needs lab confirmation", st_overdue: "Test overdue",
  tests: "current tests", no_live: "No current test.", no_sites: "No drinking-water sources listed in this district yet. Add the first test below.",
  sources_listed: "sources", new_site: "New source…", need_place: "Name the source (village and well).",
  add: "Add a test result", signer: "Sign with", injected: "Browser wallet (MetaMask)", burner: "Test wallet in this browser",
  injected_note: "Your wallet will ask to add the Arkiv Tiramisu testnet.", burner_note: "Test wallet:",
  submit: "Publish to Arkiv", signing: "Waiting for signature…", saved: "Saved on Arkiv.",
  no_personal: "Please do not include phone numbers, emails or names.",
  live_on: "● live: new test results appear here as they land", live_off: "live feed unavailable", live_new: "New test:",
  sources: "Reports on Arkiv", labs_title: "Registered labs", safety: "Survey values describe a place and time, not your own well today. Test your water at an accredited lab.",
  how: "How this works",
}
type Labels = typeof en

const hi: Partial<Labels> = {
  tagline: "आपके गाँव के आर्सेनिक और फ्लोराइड के सरकारी आँकड़े, हर एक के साथ रिपोर्ट का पेज।",
  district: "ज़िला", contaminant: "प्रदूषक", both: "दोनों", arsenic: "आर्सेनिक", fluoride: "फ्लोराइड",
  only_above: "सिर्फ़ पीने की सीमा से ऊपर", since: "कब से", any: "कोई भी साल", place: "गाँव / ब्लॉक का नाम",
  above: "सीमा से ऊपर", within: "सीमा के अंदर", source: "स्रोत", official: "सरकारी सर्वे रिकॉर्ड", sites_title: "पीने के पानी के स्रोत: जाँच की स्थिति", st_unsafe: "असुरक्षित (लैब)", st_safe: "सीमा के अंदर", st_confirm: "लैब से पुष्टि ज़रूरी", st_overdue: "जाँच बाकी",
  add: "जाँच का नतीजा जोड़ें", submit: "Arkiv पर भेजें",
  safety: "सर्वे के आँकड़े किसी जगह और समय के हैं, आज आपके कुएँ के नहीं। अपना पानी मान्यता प्राप्त लैब में जाँचें।",
}

const bn: Partial<Labels> = {
  tagline: "আপনার গ্রামের আর্সেনিক ও ফ্লোরাইডের সরকারি তথ্য, প্রতিটির সাথে রিপোর্টের পাতা।",
  district: "জেলা", contaminant: "দূষক", both: "দুটোই", arsenic: "আর্সেনিক", fluoride: "ফ্লোরাইড",
  only_above: "শুধু পানীয় জলের সীমার উপরে", since: "কবে থেকে", any: "যে কোনো বছর", place: "গ্রাম / ব্লকের নাম",
  above: "সীমার উপরে", within: "সীমার মধ্যে", source: "উৎস", official: "সরকারি সমীক্ষার রেকর্ড", sites_title: "পানীয় জলের উৎস: পরীক্ষার অবস্থা", st_unsafe: "অনিরাপদ (ল্যাব)", st_safe: "সীমার মধ্যে", st_confirm: "ল্যাবে নিশ্চিত করা দরকার", st_overdue: "পরীক্ষা বাকি",
  add: "পরীক্ষার ফল যোগ করুন", submit: "Arkiv-এ পাঠান",
  safety: "সমীক্ষার মান একটি জায়গা ও সময়ের, আজ আপনার নলকূপের নয়। স্বীকৃত ল্যাবে জল পরীক্ষা করান।",
}

export const LABELS: Record<Lang, Partial<Labels>> & { en: Labels } = { en, hi, bn }
