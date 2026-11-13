// Site-wide settings. Flip a feature to true when you're ready for it.
window.MME_CONFIG = {
  features: {
    // Shows a small "Download recipe (PDF)" button on every recipe page.
    // The page already has a print-ready layout, so turning this on works right away
    // (the button opens the browser's "Save as PDF").
    pdfDownload: false,
    // Shows ad slots (recipe pages + recipe lists). Paste your AdSense publisher id below first.
    ads: false,
  },
  ads: {
    adsenseClient: "", // e.g. "ca-pub-1234567890123456"
  },
  // Email signup in the footer. Paste the form address from a free newsletter service (e.g. Buttondown, MailerLite,
  // Kit) to switch it on. Leave empty to hide it.
  newsletter: { action: "", field: "email" },
  social: {
    tiktok: "https://www.tiktok.com/@macrosmadeez",
    instagram: "https://www.instagram.com/macrosmadeez",
    youtube: "https://www.youtube.com/@FitForkKitchen",
  },
  email: "macrosmadeez@gmail.com",
};
