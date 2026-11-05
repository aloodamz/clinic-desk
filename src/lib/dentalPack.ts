/*
 * Dental specialty pack: default visit length, cost and aftercare steps per
 * treatment. Frontend mirror of packs/dental/pack.json. No medicine names.
 */

export interface TreatmentDef {
  minutes: number;
  cost: number;
  aftercare?: string;
}

const PACK: Record<string, TreatmentDef> = {
  Consultation: { minutes: 20, cost: 500 },
  "Check-up and cleaning": { minutes: 30, cost: 1200 },
  Scaling: { minutes: 30, cost: 1500 },
  Filling: { minutes: 30, cost: 1800 },
  "Root canal": {
    minutes: 60,
    cost: 6500,
    aftercare:
      "Avoid chewing on that side until the crown is fitted. Mild soreness for a day or two is normal. Keep the next sitting date.",
  },
  Crown: { minutes: 45, cost: 5500 },
  Extraction: {
    minutes: 30,
    cost: 2000,
    aftercare:
      "Bite on the gauze for 30 minutes. Soft food today, avoid rinsing or spitting hard, avoid the straw. Mild swelling is normal.",
  },
  "Wisdom tooth removal": {
    minutes: 60,
    cost: 4500,
    aftercare:
      "Bite on gauze for 30 minutes. Soft food today, avoid rinsing hard today, use a cold pack outside the cheek. Mild swelling for 2 to 3 days is normal.",
  },
  "X-ray (IOPA)": { minutes: 10, cost: 300 },
  "Braces consultation": { minutes: 30, cost: 500 },
  Implant: {
    minutes: 90,
    cost: 32000,
    aftercare:
      "Soft food for a week, avoid the surgery side when chewing, avoid smoking. Mild swelling for 2 to 3 days is normal.",
  },
  Aligners: { minutes: 45, cost: 95000 },
  "Teeth whitening": { minutes: 45, cost: 7000 },
};

export const TREATMENTS = Object.keys(PACK);

export const FDI = {
  upper: ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  lower: ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
} as const;

const DEFAULT: TreatmentDef = { minutes: 30, cost: 1000 };

export const AFTERCARE: Record<string, string> = Object.fromEntries(
  Object.entries(PACK)
    .filter(([, v]) => v.aftercare)
    .map(([k, v]) => [k, v.aftercare!]),
);

export function treatmentMinutes(treatment: string): number {
  return PACK[treatment]?.minutes ?? DEFAULT.minutes;
}

export function treatmentCost(treatment: string): number {
  return PACK[treatment]?.cost ?? DEFAULT.cost;
}
