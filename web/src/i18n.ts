export type Lang = "en" | "hi" | "bn"

export const DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah",
  "Jalpaiguri", "Jhargram", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Medinipur",
  "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur",
]

const en = {
  tagline: "Official arsenic and fluoride readings for your village, each cited to its government report page.",
  district: "District", contaminant: "Contaminant", both: "Both", arsenic: "Arsenic", fluoride: "Fluoride",
  only_above: "Only above the drinking-water limit", since: "Sampled since", any: "Any year", place: "Village or block starts with",
  above: "Above limit", within: "Within limit", limit: "limit", source: "Source", row: "Show the table row",
  creator: "created by curator", loading: "Reading Arkiv…", shown: "records shown", none: "No surveyed records match. That does not mean the water is safe: it may never have been tested.",
  more: "Load more", official: "Survey records", community: "Community field tests",
  community_note: "Reports from field kits or labs, written by anyone. They are labelled with their author's wallet, are not checked by the curator, and fade after 90 days unless someone confirms them.",
  reported_by: "reported by", unverified: "not verified", fades: "fades in", confirm: "I re-tested: keep alive 90 more days",
  confirmed: "confirmed ✓", just_confirmed: "just confirmed", no_field: "No field tests for this district yet.",
  add: "Add a field test", signer: "Sign with", injected: "Browser wallet (MetaMask)", burner: "Test wallet in this browser",
  injected_note: "Your wallet will ask to add the Arkiv Tiramisu testnet.", burner_note: "Test wallet:",
  submit: "Publish to Arkiv", signing: "Waiting for signature…", saved: "Saved on Arkiv.",
  no_personal: "Please do not include phone numbers, emails or names.",
  live_on: "● live: new reports appear here as they land", live_off: "live feed unavailable", live_new: "New report:",
  sources: "Reports on Arkiv", safety: "Survey values describe a place and time, not your own well today. Test your water at an accredited lab.",
  how: "How this works",
}
type Labels = typeof en

const hi: Partial<Labels> = {
  tagline: "आपके गाँव के आर्सेनिक और फ्लोराइड के सरकारी आँकड़े, हर एक के साथ रिपोर्ट का पेज।",
  district: "ज़िला", contaminant: "प्रदूषक", both: "दोनों", arsenic: "आर्सेनिक", fluoride: "फ्लोराइड",
  only_above: "सिर्फ़ पीने की सीमा से ऊपर", since: "कब से", any: "कोई भी साल", place: "गाँव / ब्लॉक का नाम",
  above: "सीमा से ऊपर", within: "सीमा के अंदर", source: "स्रोत", official: "सर्वे रिकॉर्ड", community: "फ़ील्ड टेस्ट",
  add: "फ़ील्ड टेस्ट जोड़ें", submit: "Arkiv पर भेजें",
  safety: "सर्वे के आँकड़े किसी जगह और समय के हैं, आज आपके कुएँ के नहीं। अपना पानी मान्यता प्राप्त लैब में जाँचें।",
}

const bn: Partial<Labels> = {
  tagline: "আপনার গ্রামের আর্সেনিক ও ফ্লোরাইডের সরকারি তথ্য, প্রতিটির সাথে রিপোর্টের পাতা।",
  district: "জেলা", contaminant: "দূষক", both: "দুটোই", arsenic: "আর্সেনিক", fluoride: "ফ্লোরাইড",
  only_above: "শুধু পানীয় জলের সীমার উপরে", since: "কবে থেকে", any: "যে কোনো বছর", place: "গ্রাম / ব্লকের নাম",
  above: "সীমার উপরে", within: "সীমার মধ্যে", source: "উৎস", official: "সমীক্ষার রেকর্ড", community: "ফিল্ড টেস্ট",
  add: "ফিল্ড টেস্ট যোগ করুন", submit: "Arkiv-এ পাঠান",
  safety: "সমীক্ষার মান একটি জায়গা ও সময়ের, আজ আপনার নলকূপের নয়। স্বীকৃত ল্যাবে জল পরীক্ষা করান।",
}

export const LABELS: Record<Lang, Partial<Labels>> & { en: Labels } = { en, hi, bn }
