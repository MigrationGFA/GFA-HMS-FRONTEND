// Reusable Laboratory Result Templates
// Used by Result Entry, Validation, Amendment, Microbiology, Histopathology
// All clinical templates use dropdowns where applicable to prevent free-typing errors.

export type FieldType = 'select' | 'number' | 'text' | 'textarea' | 'multiselect';

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  unit?: string;
  ref?: string;          // reference range / normal value
  critical?: string[];   // values that trigger critical alert
  required?: boolean;
}

export interface ResultTemplate {
  id: string;
  name: string;
  category: 'Serology' | 'Haematology' | 'Microbiology' | 'Chemistry' | 'Toxicology' | 'Andrology' | 'Histopathology' | 'Other';
  description?: string;
  fields: TemplateField[];
}

const yesNo = ['Positive', 'Negative'];

export const labResultTemplates: ResultTemplate[] = [
  {
    id: 'tpl-hiv', name: 'HIV Screening', category: 'Serology',
    description: 'Determine / Stat-Pak / Uni-Gold algorithm.',
    fields: [
      { key: 'result', label: 'HIV Result', type: 'select', required: true,
        options: ['Negative', 'Positive', 'Indeterminate', 'Repeat Test Required'],
        critical: ['Positive'] },
      { key: 'method', label: 'Method', type: 'select', options: ['Determine', 'Stat-Pak', 'Uni-Gold', 'ELISA'] },
      { key: 'comment', label: 'Comment', type: 'textarea' },
    ],
  },
  {
    id: 'tpl-hbsag', name: 'HBsAg (Hepatitis B)', category: 'Serology',
    fields: [
      { key: 'result', label: 'HBsAg', type: 'select', required: true, options: yesNo, critical: ['Positive'] },
      { key: 'method', label: 'Method', type: 'select', options: ['Rapid Strip', 'ELISA'] },
    ],
  },
  {
    id: 'tpl-hcv', name: 'HCV (Hepatitis C)', category: 'Serology',
    fields: [
      { key: 'result', label: 'HCV Antibody', type: 'select', required: true, options: yesNo, critical: ['Positive'] },
      { key: 'method', label: 'Method', type: 'select', options: ['Rapid Strip', 'ELISA'] },
    ],
  },
  {
    id: 'tpl-bloodgroup', name: 'Blood Group & Rhesus', category: 'Haematology',
    fields: [
      { key: 'group', label: 'ABO/Rh', type: 'select', required: true,
        options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      { key: 'method', label: 'Method', type: 'select', options: ['Tile', 'Tube', 'Gel'] },
    ],
  },
  {
    id: 'tpl-genotype', name: 'Haemoglobin Genotype', category: 'Haematology',
    fields: [
      { key: 'genotype', label: 'Genotype', type: 'select', required: true,
        options: ['AA', 'AS', 'AC', 'SS', 'SC', 'CC'], critical: ['SS', 'SC'] },
    ],
  },
  {
    id: 'tpl-pregnancy', name: 'Pregnancy Test (β-hCG)', category: 'Serology',
    fields: [{ key: 'result', label: 'Result', type: 'select', required: true, options: yesNo }],
  },
  {
    id: 'tpl-malaria', name: 'Malaria Parasite', category: 'Microbiology',
    fields: [
      { key: 'result', label: 'Result', type: 'select', required: true, options: yesNo, critical: ['Positive'] },
      { key: 'density', label: 'Parasite Density', type: 'select', options: ['+', '++', '+++', '++++'] },
      { key: 'species', label: 'Species', type: 'select', options: ['P. falciparum', 'P. vivax', 'P. ovale', 'P. malariae', 'Mixed'] },
    ],
  },
  {
    id: 'tpl-udsa', name: 'Urine Drug Screen', category: 'Toxicology',
    description: 'Multi-panel rapid screen — every panel uses Positive/Negative dropdown.',
    fields: [
      { key: 'thc', label: 'Cannabis (THC)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'amp', label: 'Amphetamines (AMP)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'met', label: 'Methamphetamines (MET)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'coc', label: 'Cocaine (COC)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'opi', label: 'Opiates (OPI)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'bzo', label: 'Benzodiazepines (BZO)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'tra', label: 'Tramadol (TRA)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'bar', label: 'Barbiturates (BAR)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'mtd', label: 'Methadone (MTD)', type: 'select', options: yesNo, critical: ['Positive'] },
      { key: 'comment', label: 'Comment', type: 'textarea' },
    ],
  },
  {
    id: 'tpl-culture', name: 'Culture & Sensitivity', category: 'Microbiology',
    fields: [
      { key: 'specimen', label: 'Specimen', type: 'select', required: true,
        options: ['Urine', 'Stool', 'Sputum', 'Blood', 'Wound Swab', 'Ear Swab', 'HVS', 'Urethral Swab', 'CSF'] },
      { key: 'organism', label: 'Organism Isolated', type: 'select', required: true,
        options: ['No Growth', 'Escherichia coli', 'Staphylococcus aureus', 'Klebsiella pneumoniae',
                  'Pseudomonas aeruginosa', 'Proteus mirabilis', 'Streptococcus pneumoniae',
                  'Enterococcus faecalis', 'Salmonella typhi', 'Candida albicans', 'Other'] },
      { key: 'colony', label: 'Colony Count (CFU/mL)', type: 'select', options: ['<10^3', '10^3–10^4', '10^4–10^5', '>10^5'] },
      { key: 'antibiotic', label: 'Antibiotic', type: 'select',
        options: ['Ampicillin', 'Amoxicillin-Clavulanate', 'Ceftriaxone', 'Cefuroxime', 'Ciprofloxacin',
                  'Levofloxacin', 'Gentamicin', 'Amikacin', 'Meropenem', 'Imipenem', 'Vancomycin',
                  'Cotrimoxazole', 'Nitrofurantoin', 'Erythromycin', 'Azithromycin'] },
      { key: 'sensitivity', label: 'Sensitivity', type: 'select', options: ['Sensitive', 'Intermediate', 'Resistant'] },
      { key: 'comment', label: 'Comment', type: 'textarea' },
    ],
  },
  {
    id: 'tpl-sfa', name: 'Seminal Fluid Analysis', category: 'Andrology',
    fields: [
      { key: 'abstinence', label: 'Days of Abstinence', type: 'number' },
      { key: 'volume', label: 'Volume', type: 'number', unit: 'mL', ref: '≥1.5' },
      { key: 'liquefaction', label: 'Liquefaction Time', type: 'select', options: ['<30 min', '30–60 min', '>60 min'] },
      { key: 'appearance', label: 'Appearance', type: 'select', options: ['Greyish-opalescent', 'Yellow', 'Brownish', 'Bloody'] },
      { key: 'viscosity', label: 'Viscosity', type: 'select', options: ['Normal', 'Increased'] },
      { key: 'ph', label: 'pH', type: 'number', ref: '7.2–8.0' },
      { key: 'concentration', label: 'Sperm Concentration', type: 'number', unit: '×10⁶/mL', ref: '≥15' },
      { key: 'motility', label: 'Total Motility', type: 'select', options: ['<20%', '20–39%', '40–59%', '≥60%'], ref: '≥40%' },
      { key: 'progressive', label: 'Progressive Motility', type: 'select', options: ['<10%', '10–31%', '≥32%'], ref: '≥32%' },
      { key: 'morphology', label: 'Normal Morphology', type: 'select', options: ['<4%', '4–14%', '≥15%'], ref: '≥4%' },
      { key: 'wbc', label: 'WBC', type: 'select', options: ['Nil', '+', '++', '+++'] },
      { key: 'conclusion', label: 'Conclusion', type: 'select',
        options: ['Normozoospermia', 'Oligozoospermia', 'Asthenozoospermia', 'Teratozoospermia',
                  'Oligoasthenoteratozoospermia', 'Azoospermia'] },
    ],
  },
  {
    id: 'tpl-fbc', name: 'Full Blood Count (FBC)', category: 'Haematology',
    fields: [
      { key: 'hb', label: 'Haemoglobin', type: 'number', unit: 'g/dL', ref: 'M:13–17 / F:12–15', critical: ['<7'] },
      { key: 'pcv', label: 'PCV', type: 'number', unit: '%', ref: 'M:40–54 / F:36–47' },
      { key: 'wbc', label: 'WBC', type: 'number', unit: '×10⁹/L', ref: '4.0–11.0' },
      { key: 'platelets', label: 'Platelets', type: 'number', unit: '×10⁹/L', ref: '150–400' },
      { key: 'neutrophils', label: 'Neutrophils', type: 'number', unit: '%' },
      { key: 'lymphocytes', label: 'Lymphocytes', type: 'number', unit: '%' },
    ],
  },
  {
    id: 'tpl-histopath', name: 'Histopathology Report', category: 'Histopathology',
    fields: [
      { key: 'specimen', label: 'Specimen Type', type: 'select', options: ['Biopsy', 'Surgical Resection', 'Cytology', 'FNAC'] },
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'gross', label: 'Gross Description', type: 'textarea' },
      { key: 'micro', label: 'Microscopic Description', type: 'textarea' },
      { key: 'diagnosis', label: 'Histological Diagnosis', type: 'textarea', required: true },
      { key: 'grade', label: 'Grade', type: 'select', options: ['Benign', 'Atypical', 'Low Grade', 'High Grade', 'Malignant'] },
    ],
  },
];

export const getTemplate = (id: string) => labResultTemplates.find(t => t.id === id);
export const templatesByCategory = () => {
  const map: Record<string, ResultTemplate[]> = {};
  labResultTemplates.forEach(t => { (map[t.category] = map[t.category] || []).push(t); });
  return map;
};
