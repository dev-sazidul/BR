export const PRINT_DPI = 300;
export const PRESETS_CHECKED_ON = "2026-10-29";

export const ACCEPTANCE_NOTICE =
  "Solva removes the background and frames the photo. It does not certify that a government, employer, or website will accept the file. Many authorities reject photos that were edited, filtered, printed at home, or made with an online tool.";

export type BackgroundColor = { name: string; hex: string };

export type PhotoPreset = {
  id: string;
  kind: "portrait" | "document";
  country: string;
  document: string;
  searchText: string;
  width: number;
  height: number;
  unit: "mm" | "in" | "px";
  widthPx: number;
  heightPx: number;
  dpi: number;
  /** Millimetres used when placing the photo on a print sheet. Null when the source specified pixels only. */
  printWidthMm: number | null;
  printHeightMm: number | null;
  /** Chin-to-crown height as a fraction of the photo height, when a source states that ratio. */
  headMin: number | null;
  headMax: number | null;
  /** Space Solva leaves above the estimated crown, as a fraction of the photo height. */
  crownGap: number;
  backgroundColors: BackgroundColor[];
  backgroundStrict: boolean;
  allowPhotoBackground: boolean;
  backgroundNote: string;
  framing: string;
  verified: boolean;
  disputed: boolean;
  lastChecked: string;
  sources: Array<{ label: string; url: string }>;
  sourceNote: string;
};

export function mmToPx(mm: number, dpi = PRINT_DPI): number {
  return Math.max(1, Math.round((mm / 25.4) * dpi));
}

export function inchesToPx(inches: number, dpi = PRINT_DPI): number {
  return Math.max(1, Math.round(inches * dpi));
}

const portraitColors: BackgroundColor[] = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Light gray", hex: "#E6E6E6" },
  { name: "Light blue", hex: "#D6E6F2" },
];

function portrait(input: {
  id: string;
  document: string;
  widthPx: number;
  heightPx: number;
  framing: string;
}): PhotoPreset {
  const printWidthMm = (input.widthPx / PRINT_DPI) * 25.4;
  const printHeightMm = (input.heightPx / PRINT_DPI) * 25.4;
  return {
    id: input.id,
    kind: "portrait",
    country: "Professional portrait",
    document: input.document,
    searchText: input.document,
    width: input.widthPx,
    height: input.heightPx,
    unit: "px",
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    dpi: PRINT_DPI,
    printWidthMm,
    printHeightMm,
    headMin: 0.55,
    headMax: 0.68,
    crownGap: 0.12,
    backgroundColors: portraitColors,
    backgroundStrict: false,
    allowPhotoBackground: true,
    backgroundNote: "A plain colour or a simple office, studio, or outdoor scene.",
    framing: input.framing,
    verified: false,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [],
    sourceNote:
      "This is a Solva framing guide for a profile photo. It is not a rule from LinkedIn, an employer, or a school, and it is not an official document size.",
  };
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  portrait({
    id: "linkedin",
    document: "LinkedIn profile photo",
    widthPx: 1000,
    heightPx: 1000,
    framing: "Square frame with the head near the upper centre and the shoulders in the lower part of the photo.",
  }),
  portrait({
    id: "cv",
    document: "CV or resume photo",
    widthPx: 800,
    heightPx: 1000,
    framing: "A 4:5 frame with space above the hair and both shoulders inside the photo.",
  }),
  portrait({
    id: "corporate",
    document: "Corporate headshot",
    widthPx: 900,
    heightPx: 1200,
    framing: "A 3:4 frame, head centred, with room for the shoulders.",
  }),
  portrait({
    id: "business",
    document: "Business profile photo",
    widthPx: 1000,
    heightPx: 1000,
    framing: "Square frame suited to a staff page or company directory.",
  }),
  portrait({
    id: "student",
    document: "Student profile photo",
    widthPx: 600,
    heightPx: 800,
    framing: "A 3:4 frame for a class or student profile. Schools set their own rules.",
  }),
  portrait({
    id: "social",
    document: "Social profile photo",
    widthPx: 1080,
    heightPx: 1080,
    framing: "Square frame for a general profile picture. Apps often crop this to a circle.",
  }),
  {
    id: "bd-child",
    kind: "document",
    country: "Bangladesh",
    document: "Child e-passport photo (under 6)",
    searchText: "bangladesh child e-passport 3r gray",
    width: 3.5,
    height: 5,
    unit: "in",
    widthPx: inchesToPx(3.5),
    heightPx: inchesToPx(5),
    dpi: PRINT_DPI,
    printWidthMm: 3.5 * 25.4,
    printHeightMm: 5 * 25.4,
    headMin: null,
    headMax: null,
    crownGap: 0.1,
    backgroundColors: [{ name: "Gray", hex: "#C0C0C0" }],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Gray. The mission page does not publish a hex value; this gray is Solva’s plain fill.",
    framing:
      "The mission page asks for two recent 3R laboratory prints with a gray background for applicants under 6. 3R is the standard 3.5 × 5 inch print. The page does not restate those inches.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Consulate General of Bangladesh, Chennai — e-passport instructions",
        url: "https://chennai.mofa.gov.bd/en/site/page/General-Instructions-for-E-Passport",
      },
    ],
    sourceNote:
      "That page says adult applicants generally do not attach a separate photograph because the photo is captured during biometric enrollment. This preset is only the child-under-6 print described there.",
  },
  {
    id: "bd-adult",
    kind: "document",
    country: "Bangladesh",
    document: "Adult passport photo",
    searchText: "bangladesh adult passport",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: null,
    headMax: null,
    crownGap: 0.12,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: false,
    allowPhotoBackground: false,
    backgroundNote: "No adult background colour was verified.",
    framing: "No adult print size was found on the Bangladesh mission page reviewed for this preset.",
    verified: false,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Consulate General of Bangladesh, Chennai — e-passport instructions",
        url: "https://chennai.mofa.gov.bd/en/site/page/General-Instructions-for-E-Passport",
      },
    ],
    sourceNote:
      "Unverified. The linked page says a separate photograph is not attached for an ordinary adult e-passport. The 35 × 45 mm size is only a studio-style option and is not an official Bangladesh passport size.",
  },
  {
    id: "us-passport",
    kind: "document",
    country: "United States",
    document: "Passport",
    searchText: "united states usa passport",
    width: 2,
    height: 2,
    unit: "in",
    widthPx: inchesToPx(2),
    heightPx: inchesToPx(2),
    dpi: PRINT_DPI,
    printWidthMm: 2 * 25.4,
    printHeightMm: 2 * 25.4,
    headMin: 1 / 2,
    headMax: 1.375 / 2,
    crownGap: 0.1,
    backgroundColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Off-white", hex: "#F4F1EA" },
    ],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "White or off-white.",
    framing:
      "The head, from the bottom of the chin to the top of the hair, must be between 1 inch and 1 3/8 inches on the 2 × 2 inch print.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "U.S. Department of State — passport photos",
        url: "https://travel.state.gov/en/passports/apply/help/photos.html",
      },
    ],
    sourceNote:
      "The State Department specifies 2 × 2 inches (51 × 51 mm), not a pixel size. This file is 600 × 600 pixels so that 300 dpi is 2 × 2 inches when the printer does not scale it. The same page says not to digitally alter the photo. Replacing the background is an alteration.",
  },
  {
    id: "uk-passport",
    kind: "document",
    country: "United Kingdom",
    document: "Passport",
    searchText: "united kingdom uk britain passport",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: 600,
    heightPx: 771,
    dpi: 435,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: 29 / 45,
    headMax: 34 / 45,
    crownGap: 0.1,
    backgroundColors: [
      { name: "Cream", hex: "#F3EDE3" },
      { name: "Light grey", hex: "#D9D9D9" },
      { name: "White", hex: "#FFFFFF" },
    ],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Plain cream or light grey on the public GOV.UK page. White is included because the photo-standards page also accepts a plain light background.",
    framing:
      "Printed photos are 45 mm high by 35 mm wide. From the crown of the head to the chin must be 29–34 mm.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "GOV.UK — passport photo requirements",
        url: "https://www.gov.uk/photos-for-passports/photo-requirements",
      },
      {
        label: "GOV.UK — photo standards",
        url: "https://www.gov.uk/government/publications/photographic-standards/photo-standards-accessible",
      },
      {
        label: "The Passport (Amendment) Regulations 2022, Schedule 2",
        url: "https://www.legislation.gov.uk/uksi/2022/1382/schedule/2",
      },
    ],
    sourceNote:
      "The public page also says printed photos must be unaltered by computer software. A digital application needs a file at least 600 pixels wide and 750 pixels high. This file is 600 × 771 pixels so it keeps the 35:45 print shape and meets that minimum. Printed size is still 35 × 45 mm.",
  },
  {
    id: "ca-passport",
    kind: "document",
    country: "Canada",
    document: "Passport",
    searchText: "canada passport",
    width: 50,
    height: 70,
    unit: "mm",
    widthPx: mmToPx(50),
    heightPx: mmToPx(70),
    dpi: PRINT_DPI,
    printWidthMm: 50,
    printHeightMm: 70,
    headMin: 31 / 70,
    headMax: 36 / 70,
    crownGap: 0.14,
    backgroundColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Light", hex: "#E8E8E8" },
    ],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Plain white or light-coloured, with a clear difference between the face and the background.",
    framing: "The face, from chin to crown, must be 31–36 mm on the 50 × 70 mm print.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Immigration, Refugees and Citizenship Canada — passport photos",
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html",
      },
    ],
    sourceNote:
      "IRCC says photos must be taken by a commercial photographer, printed professionally, and not altered with editing software, filters, or AI tools. Home prints are refused. This tool cannot make a photo acceptable to IRCC.",
  },
  {
    id: "au-passport",
    kind: "document",
    country: "Australia",
    document: "Passport",
    searchText: "australia passport",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: 32 / 45,
    headMax: 36 / 45,
    crownGap: 0.08,
    backgroundColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Light grey", hex: "#E6E6E6" },
    ],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Plain white or light grey.",
    framing:
      "Accepted prints are 35–40 mm wide and 45–50 mm high. The face, from chin to crown, must be 32–36 mm. This preset uses 35 × 45 mm, which sits inside that range. On a taller print the same face is a smaller share of the photo.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Australian Passport Office — photo guidelines",
        url: "https://www.passports.gov.au/PhotoGuidelines",
      },
    ],
    sourceNote:
      "The Australian Passport Office does not recommend photos from an online service or a mobile app. It allows brightness and contrast only, and it does not allow retouching. This file is one size inside the accepted range, not a certificate that the photo meets the guidelines.",
  },
  {
    id: "in-passport",
    kind: "document",
    country: "India",
    document: "Passport upload (ICAO)",
    searchText: "india passport icao",
    width: 630,
    height: 810,
    unit: "px",
    widthPx: 630,
    heightPx: 810,
    dpi: PRINT_DPI,
    printWidthMm: null,
    printHeightMm: null,
    headMin: 0.8,
    headMax: 0.85,
    crownGap: 0.04,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "White.",
    framing:
      "The linked mission sheet asks for a 630 × 810 pixel colour photo in which the face takes up 80–85% of the photograph, with the full head from the top of the hair to the bottom of the chin.",
    verified: true,
    disputed: true,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Permanent Mission of India to the UN — ICAO photograph guidelines",
        url: "https://pmindiaun.gov.in/public_files/assets/pdf/ICAO_Guidlines_PMI_12_09_2025.pdf",
      },
      {
        label: "Passport Seva — upload notice",
        url: "https://mportal.passportindia.gov.in/gpsp/MainNavigation/UploadPhoto",
      },
    ],
    sourceNote:
      "The passport portal notice says ICAO photographs are required from 1 September 2025. Older consulate sheets still list 35 × 35 mm for passport services and 51 × 51 mm for visa and OCI. Those are separate presets. The pixel rule does not state a print size; a print-sheet copy uses 300 dpi only as Solva’s conversion.",
  },
  {
    id: "in-visa",
    kind: "document",
    country: "India",
    document: "Visa or OCI",
    searchText: "india visa oci",
    width: 51,
    height: 51,
    unit: "mm",
    widthPx: mmToPx(51),
    heightPx: mmToPx(51),
    dpi: PRINT_DPI,
    printWidthMm: 51,
    printHeightMm: 51,
    headMin: null,
    headMax: null,
    crownGap: 0.12,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Plain white, without a border.",
    framing:
      "The Consulate General in San Francisco lists 51 × 51 mm for visa and OCI, and says the face should cover about 60–70% of the photo area. That is an area share, not a chin-to-crown height, so Solva does not convert it into a head-height guide.",
    verified: true,
    disputed: true,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Consulate General of India, San Francisco — photo specification",
        url: "https://www.cgisf.gov.in/page/faqs-passports/",
      },
    ],
    sourceNote:
      "The same consulate page lists 35 × 35 mm for passport services. The 2025 ICAO upload sheet lists 630 × 810 pixels for passport applications. Use the size that matches the application you are filing.",
  },
  {
    id: "in-passport-35",
    kind: "document",
    country: "India",
    document: "Passport services (35 mm sheet)",
    searchText: "india passport 35",
    width: 35,
    height: 35,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(35),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 35,
    headMin: null,
    headMax: null,
    crownGap: 0.1,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Plain white.",
    framing: "This consulate sheet lists 35 × 35 mm for passport services.",
    verified: true,
    disputed: true,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Consulate General of India, San Francisco — photo specification",
        url: "https://www.cgisf.gov.in/page/faqs-passports/",
      },
    ],
    sourceNote:
      "Sources disagree. The 2025 passport upload notice points to a 630 × 810 pixel ICAO photo. Do not treat 35 × 35 mm as the only current passport size.",
  },
  {
    id: "pk-visa",
    kind: "document",
    country: "Pakistan",
    document: "Visa",
    searchText: "pakistan visa mrp",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: null,
    headMax: null,
    crownGap: 0.12,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "Plain white.",
    framing:
      "The Directorate General of Immigration & Passports asks for a photo 45 mm high by 35 mm wide, showing the full head and shoulders. The page does not publish a chin-to-crown measurement.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "DGIP e-services — photograph requirements",
        url: "https://onlinemrp.dgip.gov.pk/photo-requirements/",
      },
      {
        label: "DGIP — visa",
        url: "https://www.dgip.gov.pk/visa/",
      },
    ],
    sourceNote:
      "The e-services page describes the visa-application photograph and says the file should not exceed 5 MB and should not be edited in other software. The ordinary-passport page reviewed the same day does not repeat this size, so this preset is the visa photograph.",
  },
  {
    id: "ae-icao",
    kind: "document",
    country: "United Arab Emirates",
    document: "ICAO sample",
    searchText: "united arab emirates uae icao",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: 0.7,
    headMax: 0.8,
    crownGap: 0.08,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: false,
    allowPhotoBackground: false,
    backgroundNote: "The brochure does not give one required colour on the pages reviewed.",
    framing:
      "The ICP brochure says the face should take 70–80% of the photograph and describes the width as “40–35 mm”. It does not state a single height. 35 × 45 mm is not taken from that sentence.",
    verified: false,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "UAE ICP — ICAO brochure",
        url: "https://smartservices.icp.gov.ae/echannels/web/client/manual/icao/icao_english.pdf",
      },
    ],
    sourceNote:
      "Unverified. The brochure’s width line is ambiguous, and Solva did not find a single official height. Do not describe this file as an official UAE passport photo.",
  },
  {
    id: "sa-special",
    kind: "document",
    country: "Saudi Arabia",
    document: "Diplomatic or special passport",
    searchText: "saudi arabia diplomatic special",
    width: 40,
    height: 60,
    unit: "mm",
    widthPx: mmToPx(40),
    heightPx: mmToPx(60),
    dpi: PRINT_DPI,
    printWidthMm: 40,
    printHeightMm: 60,
    headMin: null,
    headMax: null,
    crownGap: 0.12,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: true,
    allowPhotoBackground: false,
    backgroundNote: "White.",
    framing:
      "The Ministry of Foreign Affairs page asks for a 4 × 6 cm colour photo on a white background, facing the camera, with the full face visible. It also describes attire. This tool does not check clothing.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Saudi Ministry of Foreign Affairs — diplomatic or special passport",
        url: "https://www.mofa.gov.sa/ar/eservices/Pages/svc80.aspx",
      },
    ],
    sourceNote:
      "This page is for diplomatic and special passports. It is not the ordinary Absher passport service. The ordinary issuance page reviewed the same day does not publish a photo size.",
  },
  {
    id: "sa-ordinary",
    kind: "document",
    country: "Saudi Arabia",
    document: "Ordinary passport",
    searchText: "saudi arabia ordinary absher",
    width: 40,
    height: 60,
    unit: "mm",
    widthPx: mmToPx(40),
    heightPx: mmToPx(60),
    dpi: PRINT_DPI,
    printWidthMm: 40,
    printHeightMm: 60,
    headMin: null,
    headMax: null,
    crownGap: 0.12,
    backgroundColors: [{ name: "White", hex: "#FFFFFF" }],
    backgroundStrict: false,
    allowPhotoBackground: false,
    backgroundNote: "No ordinary-passport background colour was verified.",
    framing: "No ordinary-passport print size was found on the Absher issuance page.",
    verified: false,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "National Platform — issuing the Saudi passport",
        url: "https://my.gov.sa/en/services/112093",
      },
    ],
    sourceNote:
      "Unverified. The linked ordinary-passport service does not state a photo size. 40 × 60 mm is the diplomatic and special size on a different page, repeated here only as a size you can export. Do not describe it as the ordinary passport requirement.",
  },
  {
    id: "schengen-cz",
    kind: "document",
    country: "Schengen area",
    document: "Visa — Czech specification",
    searchText: "schengen european union czech visa",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: null,
    headMax: null,
    crownGap: 0.1,
    backgroundColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Light grey", hex: "#E6E6E6" },
    ],
    backgroundStrict: false,
    allowPhotoBackground: false,
    backgroundNote: "The Czech page does not name one background colour. Use a plain light background and confirm it with the consulate.",
    framing:
      "Czechia specifies 35 × 45 mm, a full-face view, and at least 13 mm from the eyes to the bottom of the chin. Solva does not measure the eyes, so that 13 mm rule is not checked.",
    verified: true,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "Ministry of Foreign Affairs of the Czech Republic — photo",
        url: "https://mzv.gov.cz/jnp/en/information_for_aliens/supporting_documents_overview/photo.html",
      },
    ],
    sourceNote:
      "This is one Schengen state’s visa photo rule. It is not a single size for every European Union or Schengen consulate.",
  },
  {
    id: "schengen-icao",
    kind: "document",
    country: "Schengen area",
    document: "Visa — no single EU size",
    searchText: "schengen european union icao visa",
    width: 35,
    height: 45,
    unit: "mm",
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    printWidthMm: 35,
    printHeightMm: 45,
    headMin: null,
    headMax: null,
    crownGap: 0.1,
    backgroundColors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Light grey", hex: "#E6E6E6" },
    ],
    backgroundStrict: false,
    allowPhotoBackground: false,
    backgroundNote: "The Commission page does not name one background colour.",
    framing: "The European Commission asks for a photo that meets ICAO standards and does not publish one millimetre size for every Schengen state.",
    verified: false,
    disputed: false,
    lastChecked: PRESETS_CHECKED_ON,
    sources: [
      {
        label: "European Commission — applying for a Schengen visa",
        url: "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en",
      },
    ],
    sourceNote:
      "Unverified as a union-wide size. 35 × 45 mm is included because several member states publish it, including Czechia. France-Visas describes a width of 35–40 mm and a face covering 70–80% of the photo, without one height. Confirm the consulate that will take the application.",
  },
];

export const COUNTRY_ORDER = [
  "Bangladesh",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Pakistan",
  "United Arab Emirates",
  "Saudi Arabia",
  "Schengen area",
];

export function presetById(id: string): PhotoPreset {
  const preset = PHOTO_PRESETS.find((item) => item.id === id);
  if (!preset) throw new Error(`Unknown photo preset: ${id}`);
  return preset;
}

export function portraitPresets(): PhotoPreset[] {
  return PHOTO_PRESETS.filter((preset) => preset.kind === "portrait");
}

export function documentPresets(): PhotoPreset[] {
  return PHOTO_PRESETS.filter((preset) => preset.kind === "document");
}

export function sizeLabel(preset: PhotoPreset): string {
  if (preset.unit === "px") return `${preset.width} × ${preset.height} px`;
  if (preset.unit === "in") return `${preset.width} × ${preset.height} in`;
  return `${preset.width} × ${preset.height} mm`;
}

export function printMillimetres(preset: PhotoPreset): { width: number; height: number; fromSource: boolean } {
  if (preset.printWidthMm != null && preset.printHeightMm != null) {
    return { width: preset.printWidthMm, height: preset.printHeightMm, fromSource: preset.unit !== "px" };
  }
  return {
    width: (preset.widthPx / preset.dpi) * 25.4,
    height: (preset.heightPx / preset.dpi) * 25.4,
    fromSource: false,
  };
}

export function printSizeNote(preset: PhotoPreset): string {
  const mm = printMillimetres(preset);
  const inchesW = (mm.width / 25.4).toFixed(2);
  const inchesH = (mm.height / 25.4).toFixed(2);
  const printed = `${mm.width.toFixed(1)} × ${mm.height.toFixed(1)} mm (${inchesW} × ${inchesH} in)`;
  if (!mm.fromSource) {
    return `The source does not state this print size. At ${preset.dpi} dpi the file is about ${printed}. Printer scaling changes the physical size.`;
  }
  return `At ${preset.dpi} dpi the file prints at about ${printed}. Printer scaling and “fit to page” change the physical size.`;
}

export type BackgroundChoice =
  | { kind: "color"; hex: string }
  | { kind: "photo"; id: string }
  | { kind: "transparent" };

export function backgroundConflict(preset: PhotoPreset, choice: BackgroundChoice): string | null {
  if (choice.kind === "photo") {
    if (!preset.allowPhotoBackground) {
      return "This document preset asks for a plain background. A photo scene does not match that. The selection was left as you chose it.";
    }
    return null;
  }
  if (choice.kind === "transparent") {
    if (preset.kind === "document") {
      return "This document preset uses a solid background. Transparency was left on because you chose it.";
    }
    return null;
  }
  const listed = preset.backgroundColors.some((color) => color.hex.toLowerCase() === choice.hex.toLowerCase());
  if (preset.backgroundStrict && !listed) {
    return "This colour is outside the colours listed for the selected preset. The selection was left as you chose it.";
  }
  return null;
}
