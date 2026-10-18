# On-chain evidence (Tiramisu)

Explorer: https://tiramisu.explorer.arkiv.network

## Wallets that create JalSaakshya entities

| Address | Role |
|---|---|
| `0x048A053E77e7771b212d04D906E7b70139fC3760` | Curator: all `source`, `obs`, `blockstat` and `lab` entities; funded the demo wallets |
| `0x690F95b7217AaF59017e2EfEA446e9af4e04a066` | Demo lab (synthetic), registered by the curator: `test` entities with `method = lab` |
| `0xAac73CBEa8dc9D65B6B45A7550F675c579D043c5` | Demo field tester A (synthetic): `site` and kit `test` entities |
| `0x4B2799ff80Fe9cd3eF0f8d1d870d9927F52d767f` | Demo field tester B (synthetic): `site` and kit `test` entities |
| `0x83EF7A30e2cDbA2CC55a2B3B041805eb875C146d` | In-app test wallet used while recording the demo |

Any other wallet that adds a test through the app also creates `site`/`test` entities; the app labels
those with their creator.

## Official WB PHED block figures (18 Oct 2026)

18 `blockstat` entities (one per Nadia block) from WB PHED's public comprehensive report, downloaded 17 Oct 2026
(PDF SHA-256 `6f3e443b…4e4ede`, see [`data/phed/`](../data/phed/README.md)). 124,297 arsenic tests, 76,665 beyond 0.01 mg/L.
Two atomic batches from the curator console:
- tx `0xa9b0c596533768e1f077777128ae4aedca87ccd201251e27dfe83e17f4ccae27`: Chakdah … Krishnaganj (9)
- tx `0xc986a812f1e4e18238d64cf48ca9fe900304333d962be0226a0ecb2a209c71e9`: Krishnanagar-I … Tehatta-II (9)

Example entity (Nabadwip): `0x116cdd01b1925fa759e1b6eabb3a162f0a67b1c233e7cb76ec04417137f93777`, check it at
https://mohitt31.github.io/jalsaakshya/?e=0x116cdd01b1925fa759e1b6eabb3a162f0a67b1c233e7cb76ec04417137f93777

## Sealing official records and demo tests (18 Oct 2026)

From the curator console (*Seal official records and demo tests*): every entity a wallet created and still owned (`createdBy(w).ownedBy(w)`) was handed to `0x000000000000000000000000000000000000dEaD` in batches of 100 ownership changes.

- **Curator `0x048A…3760`: 1,204 entities** (1,173 `obs`, 13 `source`, 18 `blockstat`) in 13 transactions:
  - `0x8ad8df239395a3fdd3777bb293660175bcf6d1ec5b0f4cca16c450a405153b69`
  - `0x2bcc9d6d1726443dd3f2d8ba9f223fedcf0dfd5419a194dc95be840a8308d940`
  - `0x76279ebe81265d21b06b02dd690d6c36d9254913d9b5137eb96bbff6b5054acf`
  - `0x4f10d8a644b3d1fad557269deb3695712f96a6d1d1904d4b052ce01c6fa24b2a`
  - `0xa8194a366d4cbd1ba154471659935f627a3f6fde635c239492a62efbfeea049d`
  - `0x587643fe0bed47037f7dce4c9a815ddef192b49113361ece135819c561784e79`
  - `0x5b0d37962cff8c1b32b917d7928e756a87481a4328834dcbc2cdc3a686f7dc5c`
  - `0x719f287ed6e81f15746d6d34a1408337a7444f3c8d2ebcde71680b94f35d11d0`
  - `0x085ed6a16a9510dd2bc5418910d784080f488de9a8a73d33a3bfde75b8bca6b4`
  - `0x3cc2796f71336b144e5fdab8c4b1d431f22b5d50ddf4b9746baa55185c8a56e0`
  - `0x4737d4f051f22275a88d2d488510607568d86b8bad732485c409a8b7ae4f9382`
  - `0x9e483f263adb134bbcb3fd38c909a88b7da2db2ecbb941aecb4f16b748c31e06`
  - `0x1277d7ee6fb1fc1191f837480d51b78a8e3e11d1297c4bc5675798fbb62bc264`
- **Demo tester A `0xAac7…43c5`:** 2 test(s), tx `0xb17f3a04fd79eb111714edd8a2c0163355a85ae815e73b7b72164b25efaac44e`
- **Demo tester B `0x4B27…767f`:** 2 test(s), tx `0x50c2dec2f2ef6856667b59cb080057e96cb0d53731d4864c544e66153cf4591e`
- **Demo lab `0x690F…a066`:** 1 test(s), tx `0x961c01851ad0c8c3e12b11bb64599303c49e7d4eb2cd1247e9e641957de50d1b`
- **In-app test wallet `0x83EF…146d`:** 2 test(s), tx `0xadb8555962fc9028da466032abaa3f25d28def87691c2e954fc6ca1dc75976ca`

The lab registry is not sealed, so the curator can still delist a lab. After sealing, nobody can delete these entities; they leave Arkiv when their lifetimes end (sources can still be renewed by anyone, through `permissionlessExtension`).

## Tester kit (19 Oct 2026)

The curator console made tester kit wallet `0xC44cd7E0C52dD3f676853C6c8d3C203ed0204270` and funded it with 0.05 test GLM.
Opening the kit link loaded that wallet in the app, which published a synthetic 2 µg/L arsenic kit reading on the
Hooghly source *Offline queue test (synthetic)*, sealed in the same transaction:
- tx `0x7e5bc62985ecb5b97137a1e3a11836bbe8ca8acb04037bb50af43d6199421c7a`.

## Sealed sources (19 Oct 2026)

A source's creator could delete it, and its sealed tests would drop out of the list with it. So a new
source is now sealed in the batch that creates it, and keeps `permissionlessExtension`:
- probe (district `Probe`, `demo = true`, 1–3 h lifetimes): source + test created and both sealed in one batch,
  tx `0x421282c5cb7cfcd173e674ec3cb97f2baeda100efd965ab2f0ac7f9f3327e904`;
- the sealed probe source renewed by another wallet (demo tester A), tx `0x292a022e1b18618710a1bdb29f7234b62433423d2bed95d2614d71765ac692db`;
- the creator's `deleteEntity` on it refused: "owned by 0x…dEaD, not 0x83EF…146d";
- the five earlier sources sealed by the curator console: demo tester A (3), tx `0x817f73eefb069e150f26119cfcef86e2c3f0b1a07113cdb78083f2972009e21f`;
  demo tester B (1), tx `0x67ba2e454a436437b13e54a954a9e04dc309ddc755e99523e951c81b21d4ebf6`; in-app test wallet (1),
  tx `0x15cb237001a0da589b08637a9f25f4cdff93cf641d73ef16830b30a139f22da4`.

`readonly` alone does not stop deletion (friction #9): probe create tx `0x0eaa40fad0bfafc91078ed69162306ab7c438ec0b8f06e7809ab95bc50c50e91`,
deleted by its own wallet in tx `0xf02255b35c1aa5cd1dbd4e0a42944dacd17afa5e804e6b5f8e5f970e01705566`.

## First sealed test (18 Oct 2026)

The in-app test wallet `0x83EF…146d` added a synthetic 2 µg/L arsenic kit reading to *Offline queue test (synthetic)*
in Hooghly. One transaction created the test, extended the source, and transferred the test's ownership to `0x…dEaD`:
- tx `0x25696c897bf953f83e68d5ca866156d8830b9efcd373f70da03c9eeb2c1cd9ee`.

## Offline queue test (18 Oct 2026)

With the browser set to offline, the in-app test wallet `0x83EF…146d` entered a synthetic 3 µg/L arsenic kit reading
for a new source *Offline queue test (synthetic)* in Hooghly. It waited in browser storage, marked "not on Arkiv yet".
When the browser came back online it was signed and sent as one atomic batch (`site` + `test`):
- tx `0x1747bc6db89e93ca22b849c018ef425cc3fce6f15a2b70c4c710f25c938e35c5`.

## Demo-video test (17 Oct 2026)

The in-app test wallet `0x83EF…146d` was funded with 0.1 test GLM by the curator. It then added a 6 µg/L arsenic kit reading to *Demo source B (synthetic)*, with the note "Synthetic reading recorded for the demo video": one atomic batch of a `test` create plus a Lifetime Extension of the source.
- tx `0x9950d0481352eb81dd32f0dd51503419948f5b0d739bab993c8287e65e3edb12`, block 701123.

## Spoof probe (17 Oct 2026)

Demo tester A wrote an `obs` entity with the curator's exact attributes. `createdBy(curator)` returned 0 of it.
- tx `0xbfe422c5a3b4eaa3cc35292b7a8169bec3af1d93f0d1db90b115014287643c45` (expired after 15 minutes by design).

## Publishing the survey dataset (15 Oct 2026)

1,173 `obs` entities and 13 `source` entities in 49 atomic batches (each document's `source` entity
lands in the same transaction as its first rows). Total cost about 0.18 test GLM.

Check it yourself:

```ts
publicClient.select({ key: true }).where(eq("app", str("jalsaakshya/v1")), eq("kind", str("obs")))
  .createdBy("0x048A053E77e7771b212d04D906E7b70139fC3760").limit(200).fetch()   // page through: 1,173
```

| Document | Transactions |
|---|---|
| `gwq_west_bengal` | `0xac89676f…` `0x40a2bd59…` `0x9aeea6d7…` `0xe7a27c8e…` `0xf8a516d5…` `0xc11aad1c…` `0xf972f046…` `0x80994974…` `0x30ac61c6…` `0x43a8d17c…` `0xf22f4398…` `0xc155a86f…` `0x4a5d1529…` `0x4f878d31…` `0x6d87c559…` `0xa76ad722…` `0x5499a061…` `0x99d1118c…` `0x777a27df…` `0xacc2e65c…` `0x3c14b4a6…` `0x359c56da…` `0xb68507b8…` `0x4c1068bb…` `0xc73dea12…` |
| `amp_purulia` | `0x567c2715…` `0x46290640…` `0xeaf4314a…` `0xb5dcd91c…` `0xa8c6ca71…` `0xa1166488…` `0x524f35de…` `0x3c308fda…` `0xf2bf4c7b…` `0xaf4d8ef8…` `0x8d40c4ac…` `0xaab906cb…` |
| `web_82587ba907b0` | `0x96932166…` `0xb0af4103…` |
| `annual_gwq_2025` | `0xf2447fa3…` |
| `web_38c724236c24` | `0xf25a1ed8…` |
| `yearbook_2015_16` | `0xc8b6847f…` |
| `pubmed_26188634` | `0x16447638…` |
| `pubmed_26164468` | `0x33ed0144…` |
| `pubmed_33893897` | `0xa73c393c…` |
| `pubmed_25408071` | `0x00b71b48…` |
| `pubmed_28676931` | `0x6bf4fdbc…` |
| `pubmed_37442929` | `0x7c7629c2…` |
| `naquim_bankura` | `0x73748d41…` |

Full hashes:

```
0xac89676f82ec366ac74d337bef59a90f0e8319813e55d295e7a4e2b32d92d18c
0x40a2bd59e086885e22757a3bec1a0da0e82f9cb6b99774ea88708e3008a0b4d5
0x9aeea6d7e2a111db9ba884dafa91506b29b5dbc1fdba9eecd08b8d5083b79bb8
0xe7a27c8eebf0a5521947e69faf1ae73d6238fdf34d8b86ffe919cbc98743c33c
0xf8a516d5fb43b296c8d4430712d0480030854172ca46f0f9cba1f985db56dc98
0xc11aad1ccb2207b95cf12fb71f6cddedb982dc1b8eb15db0713781c9a1a4d0d4
0xf972f04641d28f1711390b324a1f297f72c613755dbf51c0a2311851e044d81e
0x80994974f498beab76a7d07b68895d8e8372831d0ae0e43ba5425bc8858b5564
0x30ac61c62c4fddd7525cd5824de68c30a4cdfb8e3aaa764894dd161b11b672ed
0x43a8d17c976ae93c0b15b024ce69e6510d18a2b57329b22c5aec4c3dc17eeeef
0xf22f4398d10efa9cd98b2e47fc5b893eb2f131b8fa506c6b53a2076f069dc2c2
0xc155a86f0ae0e97605c762e8d5e9864e92d48d743fd752c2999674b3ed4ed991
0x4a5d1529eead83001bd01fe77358d84af7994494570bd898c647498700e4ff43
0x4f878d3113aef303f1304a9cd5a03b06afb0f75dac85ac5c458d09279e058ba9
0x6d87c559df68a1fdde228c3a9ee3ec1820b1517770420b0bf5511f73e188ca4b
0xa76ad722a8af9177f78ddf18d1fbb0b015c3a04c014942bfb188a36c536f499d
0x5499a0619727e77cf8357a6ba3fe59c6bd4e10a73ae9368d78c260f2610e6d0f
0x99d1118c69658e5bb74633ba8c9a31d274463749be4a8d8c1ebee280f86fba66
0x777a27df388ba7e28ef0abda0febc11d15206f3612f5f2744e1521f0fd59bfbd
0xacc2e65c0b83c438075cffbd34e0fe3e1e5154617bebec8cfc2537b0d0f7cd03
0x3c14b4a60a606f70db4955422f1842b0171ac54f9031a581161e058bdbec2cdf
0x359c56da3be4aec0484f5d771837ed904c976edbd454a664ee468c122ecd7e6c
0xb68507b8a573abba03cb8c44ef92ecb0e5cc69baf538433d4e2499c028255727
0x4c1068bbfd1c8585e34ccf0cafc704ca63fe06de226520c54b4baf362ce707ef
0xc73dea12ae8d3de8a869edbf0543d9dc8e41e005754338a7f336d0ded875f927
0x567c2715892d9ffab5e60acecab08002a089eafc03d39bede7199df9ba462995
0x4629064099c8f7282f7d74812e46e901ed419b822a01fb51fcf62b0dacdbe2c5
0xeaf4314a711a93f5ceab2c1d4ed5503addd32ce9769c62f649e3da0e2330635b
0xb5dcd91c55d83ed2ebee8e471b671dff4289cc3493b846fcb0c60aafd57eff20
0xa8c6ca71aa4db9ee5ea7fcfc7b49703bbf8917f8fac4defec602783958db3254
0xa1166488b174ef7f2b171baf64507137ac4dd8ac35da807356ca9a288e37a3d6
0x524f35de5ee1c9963401e04b0b1f715f9f22d4c7f48691629496627d7b892c5d
0x3c308fda1261c4af1e1e4478ad3e910aca6d822adb2bee08d224a01a5f19232f
0xf2bf4c7b469c8e5e5f7c106ca8d245a9dad9570d62b2b660af78a05b67c9afa4
0xaf4d8ef86c2263ffd7affef603576fa418cc1f46c45aec4dc8e375d6dcb45a3e
0x8d40c4acaa1b8e464e795e59dd9234cf340b046f004853df1e239ddc25670e8b
0xaab906cbffd61b86b8cde3165aef8bce46b9458a7af160b146cd9a5a1d39ab7b
0x969321660dde07bbdef6575ccd23a93ec29542dad6e3631b12c4e6b93345f392
0xb0af41035f7fc9e64dfdd13cce285837ed6ac0c6c9952a83480b011727b6b94a
0xf2447fa3503cf27f053d8403ef01ea8a51e467506e5be37b1537e8bb788a4462
0xf25a1ed8c61f53d2c6bbda02e0cba01b0a14836ad1d0d2ae879546d5d6bfd904
0xc8b6847f45ca04c563079097ce8fe0727045a8b5870e3f24aa508faf4bbcaf26
0x16447638a41c3d11e11be21e8db6042b7ee4a5b016b82272b739309286044412
0x33ed0144cb2af9f63f7d458539fadde7df4059ac09fc0b2f008e07bfd3627dbd
0xa73c393ce2d862cbf4ec570c4793ff8516da049623a69742200f73060ae1921c
0x00b71b484e1ca12a2c140e890d67fe563ca5bbe97946c3449b83b7dfc7ed10d8
0x6bf4fdbc8b2786845de0513c1c4bea121d4233ed9eaa082226c605d8d212ad43
0x7c7629c247b80f779d0b9007666a8058b24dd2d343cd84984b1e0e18ec245fd6
0x73748d419ecae712bc9353a46b69448400f570e2b002e9ff31eb1c8b26ed8944
```
