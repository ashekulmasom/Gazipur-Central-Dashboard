# Gazipur Central Dashboard — Achievers' Club & Market Service

GitHub Pages-এ চলা স্ট্যাটিক সাইট। কোনো সার্ভার লাগে না।

## লিংক
| কে | লিংক | কীভাবে ঢুকবেন |
|---|---|---|
| ডিএসও (User) | https://ashekulmasom.github.io/Gazipur-Central-Dashboard/ | নিজের RA (DSO) ওয়ালেট |
| অপারেশন ম্যানেজার (OM) | https://ashekulmasom.github.io/Gazipur-Central-Dashboard/?as=om | ডিস্ট্রিবিউটরের MA ওয়ালেট → Achievers' Club + Market Service |
| Market Service (সরাসরি) | https://ashekulmasom.github.io/Gazipur-Central-Dashboard/service.html | MA ওয়ালেট বা অ্যাডমিন |
| অ্যাডমিন | https://ashekulmasom.github.io/Gazipur-Central-Dashboard/admin.html | GitHub টোকেন (Contents: Read and write) → সব পেজ |

## ফাইল
```
index.html          Achievers' Club (DSO / OM / Admin)
service.html        Market Service (OM / Admin)
admin.html          রিপোর্ট আপলোড, মাস নির্বাচন, টার্গেট সেটিংস, ক্রাইটেরিয়া, প্রকাশ
assets/engine.js    রিপোর্ট পড়া ও হিসাব (অ্যাডমিন)
assets/core.js      স্কোর, লগইন, হেডার (সব পেজ)
assets/style.css
logo.jpg
data/index.json             মাসের তালিকা + মার্কেট সার্ভিস ক্রাইটেরিয়া
data/YYYY-MM.json           ওই মাসের Achievers' Club ডেটা
data/YYYY-MM-service.json   ওই মাসের Market Service (আরএ-ভিত্তিক)
data/YYYY-MM-agentmap.json  এজেন্ট→আরএ ম্যাপ (হ্যাশ করা)
```

## হিসাবের নিয়ম
- **TRX** = MTD CI AMT + MTD CO AMT (সর্বশেষ TRX রিপোর্ট)। গত মাসের একই তারিখের TRX রিপোর্ট দিলে LMTD ও MoM গ্রোথ।
- **REG** = D0 Pin Change & CI Count (Both)
- **UBP** = Bill Pay রিপোর্টের "MTD" (কাউন্ট), গ্রোথের জন্য "LMTD"
- **A2M** = TRX_AMT · **D2C** = D2C_TRX_AMOUNT (শুধু ওএম-এর BZP = A2M + D2C)
- **SAV-VOL** = নতুন সেভিংসের Instalment Volume · **SAV-CNT** = নতুন সেভিংসের সংখ্যা (NEW_CUSTOMER_STATUS = Y)
- UBP, A2M, SAVINGS ও LMTD TRX-এর এজেন্ট→আরএ ম্যাপ নেওয়া হয় **সর্বশেষ TRX রিপোর্ট** থেকে।
- কলাম নাম দেখে পড়া হয়, তাই কলামের জায়গা বদলালেও সমস্যা নেই।
- MTD টার্গেট = মাসিক টার্গেট × (রিপোর্টের দিন ÷ মাসের দিন); প্রতিটি রিপোর্টের নিজের Till তারিখ ধরা হয়।

| ওজন | TRX | REG | SAV-VOL | SAV-CNT | UBP | A2M / BZP |
|---|---|---|---|---|---|---|
| ডিএসও | 30 | 30 | 10 | 10 | 20 | — |
| ডিএসএস | 30 | 20 | 10 | 10 | 25 | A2M 5 |
| ওএম | 30 | 20 | 7.5 | 7.5 | 20 | BZP 15 |

স্কোর = Σ ওজন × min(অর্জন %, 100%)। ডিএসএস পুরো টেরিটরিতে এক তালিকায় র‍্যাঙ্ক হয়; ডিএসও প্রতিটি ডিএইচ-এর ভেতরে।

## প্রতিদিনের কাজ
1. admin.html → টোকেন দিয়ে সাইন ইন
2. মাস বেছে নিন (ডিফল্ট: গতকালের মাস)
3. ফাইল টেনে আনুন → "GitHub-এ প্রকাশ করুন"

## টোকেন বানানো
GitHub → Settings → Developer settings → Fine-grained tokens → Repository access: Gazipur-Central-Dashboard → Permissions: Contents = Read and write.
