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
