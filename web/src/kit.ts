// Tester kit links. A block office (the curator console) makes a fresh tester wallet, funds it with a little
// test GLM and sends the link on WhatsApp: https://…/jalsaakshya/#kit=<private key>. Opening it on the tester's
// phone makes that wallet the page's test wallet, so she can publish a reading right away: no faucet, no
// captcha, no crypto app. The key sits in the URL fragment, which browsers never send to any server, and is
// removed from the address bar at once. Whoever holds the link can sign as that tester, so it is a personal
// link; a previous test wallet on the phone is kept, not overwritten.
import { privateKeyToAccount } from "viem/accounts"

const BURNER_KEY = "jalsaakshya.burner.v1"
const TEXT: Record<string, (a: string) => string> = {
  en: (a) => `Tester kit loaded. This phone now has a funded tester wallet (${a}). Open "Add a test result" to publish a reading: no faucet, no sign-up.`,
  hi: (a) => `टेस्टर किट लोड हो गई। इस फ़ोन में अब पैसे वाला टेस्टर वॉलेट है (${a})। रीडिंग डालने के लिए "जाँच का नतीजा जोड़ें" खोलें: न फ़ॉसेट, न साइन-अप।`,
  bn: (a) => `টেস্টার কিট লোড হয়েছে। এই ফোনে এখন টাকা-ভরা টেস্টার ওয়ালেট আছে (${a})। রিডিং দিতে "পরীক্ষার ফল যোগ করুন" খুলুন: ফসেট বা সাইন-আপ লাগবে না।`,
}

const m = location.hash.match(/(?:^#|&)kit=(0x[0-9a-fA-F]{64})(?:&|$)/)
if (m) {
  const pk = m[1]
  let ok = false
  try {
    const prev = localStorage.getItem(BURNER_KEY)
    if (prev && prev.toLowerCase() !== pk.toLowerCase()) localStorage.setItem(`jalsaakshya.burner.prev.${Date.now()}`, prev)
    localStorage.setItem(BURNER_KEY, pk)
    ok = true
  } catch { /* storage blocked: the kit cannot be kept on this phone */ }
  history.replaceState(null, "", location.pathname + location.search)
  if (ok) {
    const a = privateKeyToAccount(pk as `0x${string}`).address
    let lang = new URLSearchParams(location.search).get("lang") || ""
    try { lang ||= localStorage.getItem("jalsaakshya.lang") || "" } catch { /* ignore */ }
    const say = TEXT[lang] || TEXT.en
    const box = document.createElement("div")
    box.className = "wrap"
    box.innerHTML = `<p class="card" style="border-left:5px solid var(--accent);margin:12px auto"></p>`
    box.querySelector("p")!.textContent = say(`${a.slice(0, 6)}…${a.slice(-4)}`)
    document.querySelector("header")?.after(box)
  }
}
