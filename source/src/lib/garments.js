// Garment silhouettes, all drawn in an 80×100 box (same 4:5 shape as the photo frame).
// `d` is the outer shape, `details` are inner lines (seams, collars, pockets).

export const SHAPE_W = 80;
export const SHAPE_H = 100;

export const GARMENT_SHAPES = {
  tshirt: {
    d: 'M34 19 Q40 26 46 19 L54.0 19.0 Q58.0 19.0 61.0 21.6 L76.5 34.7 Q78.0 36.0 76.8 37.6 L71.2 44.4 Q70.0 46.0 68.0 46.0 L64.0 46.0 L64.0 84.0 Q64.0 87.0 61.0 87.0 L19.0 87.0 Q16.0 87.0 16.0 84.0 L16.0 46.0 L12.0 46.0 Q10.0 46.0 8.8 44.4 L3.2 37.6 Q2.0 36.0 3.5 34.7 L19.0 21.6 Q22.0 19.0 26.0 19.0 L34 19 Z',
    details: 'M34 19 Q40 29 46 19',
  },
  shirt: {
    d: 'M46.0 24.0 L51.0 24.0 Q54.0 24.0 56.4 25.8 L79.2 43.7 Q80.8 44.9 79.6 46.5 L74.0 53.6 Q72.8 55.2 71.2 53.9 L58.0 43.6 L58.0 77.0 Q58.0 80.0 55.0 80.0 L25.0 80.0 Q22.0 80.0 22.0 77.0 L22.0 43.6 L8.8 53.9 Q7.2 55.2 6.0 53.6 L0.4 46.5 Q-0.8 44.9 0.8 43.7 L23.6 25.8 Q26.0 24.0 29.0 24.0 L34.0 24.0 Q40 31 46 24 Z',
    details: 'M35 24 Q40 34 45 24',
  },
  sweater: {
    d: 'M27 9 Q40 18 53 9 L64 13 C69 15 72 19 73 25 L78 66 L68 68 L64 36 L65 89 L66 95 L14 95 L15 89 L16 36 L12 68 L2 66 L7 25 C8 19 11 15 16 13 Z',
    details: 'M15 89 L65 89 M27 9 Q40 22 53 9',
  },
  jacket: {
    d: 'M28 8 L40 16 L52 8 L64 12 C69 14 72 18 73 24 L78 64 L69 66 L64 36 L64 92 Q64 95 61 95 L19 95 Q16 95 16 92 L16 36 L11 66 L2 64 L7 24 C8 18 11 14 16 12 Z',
    details: 'M40 16 L40 95 M28 8 L33 38 L40 16 L47 38 L52 8 M22 70 L32 70 M48 70 L58 70',
  },
  coat: {
    d: 'M27 7 L40 15 L53 7 L65 11 C70 13 73 17 74 23 L79 70 L70 72 L66 38 L67 95 Q67 98 64 98 L16 98 Q13 98 13 95 L14 38 L10 72 L1 70 L6 23 C7 17 10 13 15 11 Z',
    details: 'M40 15 L40 98 M27 7 L33 40 L40 15 L47 40 L53 7 M35 50 L35 50 M35 62 L35 62',
  },
  dress: {
    d: 'M46.0 9.0 L50.0 9.0 Q52.0 9.0 53.7 10.0 L54.7 10.6 Q57.0 12.0 57.0 15.0 L57.0 24.0 Q57.0 28.0 56.0 31.9 L55.2 35.1 Q54.0 40.0 55.5 44.8 L68.1 85.1 Q69.0 88.0 66.0 88.0 L14.0 88.0 Q11.0 88.0 11.9 85.1 L24.5 44.8 Q26.0 40.0 24.8 35.1 L24.0 31.9 Q23.0 28.0 23.0 24.0 L23.0 15.0 Q23.0 12.0 25.3 10.6 L26.3 10.0 Q28.0 9.0 30.0 9.0 L34.0 9.0 Q40 17 46 9 Z',
    details: 'M27 40 Q40 44 53 40',
  },
  skirt: {
    d: 'M55.0 24.0 Q57.0 24.0 57.4 26.0 L69.2 80.1 Q70.0 84.0 66.0 84.0 L14.0 84.0 Q10.0 84.0 10.8 80.1 L22.6 26.0 Q23.0 24.0 25.0 24.0 Z',
    details: 'M23 30 L57 30',
  },
  pants: {
    d: 'M58.0 11.0 Q61.0 11.0 61.3 14.0 L67.7 87.0 Q68.0 90.0 65.0 90.0 L48.0 90.0 Q45.0 90.0 44.7 87.0 L40.3 47.0 Q40.0 44.0 39.7 47.0 L35.3 87.0 Q35.0 90.0 32.0 90.0 L15.0 90.0 Q12.0 90.0 12.3 87.0 L18.7 14.0 Q19.0 11.0 22.0 11.0 Z',
    details: 'M19 18 L61 18 M40 18 L40 32',
  },
  jeans: {
    d: 'M20 5 L60 5 Q62 5 62 7 L67 92 Q67 95 64 95 L46 95 Q43 95 43 92 L40 40 L37 92 Q37 95 34 95 L16 95 Q13 95 13 92 L18 7 Q18 5 20 5 Z',
    details: 'M18 12 L62 12 M40 12 L40 30 M19 12 Q24 22 30 12 M50 12 Q56 22 61 12',
  },
  shorts: {
    d: 'M58.0 26.0 Q61.0 26.0 61.4 29.0 L66.6 63.0 Q67.0 66.0 64.0 66.0 L47.0 66.0 Q44.0 66.0 43.3 63.1 L40.7 50.9 Q40.0 48.0 39.3 50.9 L36.7 63.1 Q36.0 66.0 33.0 66.0 L16.0 66.0 Q13.0 66.0 13.4 63.0 L18.6 29.0 Q19.0 26.0 22.0 26.0 Z',
    details: 'M19 32 L61 32 M40 32 L40 42',
  },
  bundle: {
    d: 'M12 74 L68 74 Q72 74 72 78 L72 90 Q72 94 68 94 L12 94 Q8 94 8 90 L8 78 Q8 74 12 74 Z M15 54 L65 54 Q69 54 69 58 L69 70 Q69 74 65 74 L15 74 Q11 74 11 70 L11 58 Q11 54 15 54 Z M18 34 L62 34 Q66 34 66 38 L66 50 Q66 54 62 54 L18 54 Q14 54 14 50 L14 38 Q14 34 18 34 Z',
    details: 'M30 34 L30 54 M50 54 L50 74 M34 74 L34 94',
  },
  accessories: {
    d: 'M60.0 40.0 Q64.0 40.0 64.4 44.0 L68.5 83.0 Q69.0 88.0 64.0 88.0 L16.0 88.0 Q11.0 88.0 11.5 83.0 L15.6 44.0 Q16.0 40.0 20.0 40.0 Z M27 40 C27 18 53 18 53 40 L49 40 C49 24 31 24 31 40 Z',
    details: 'M12 54 L68 54',
  },
  general: {
    d: 'M8 5 L72 5 Q76 5 76 9 L76 91 Q76 95 72 95 L8 95 Q4 95 4 91 L4 9 Q4 5 8 5 Z',
    details: '',
  },
};

export function garmentShape(id) {
  return GARMENT_SHAPES[id] ?? GARMENT_SHAPES.tshirt;
}

// Camera templates (the outline shown while taking the photo)
export const CAMERA_TEMPLATES = [
  { id: 'tshirt', label: 'Top' },
  { id: 'shirt', label: 'Long sleeve' },
  { id: 'dress', label: 'Dress' },
  { id: 'pants', label: 'Pants' },
  { id: 'skirt', label: 'Skirt' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'accessories', label: 'Bag / Acc.' },
  { id: 'general', label: 'Free' },
];

export function templateForGarment(garment) {
  if (CAMERA_TEMPLATES.some((t) => t.id === garment)) return garment;
  if (garment === 'jeans') return 'pants';
  if (['sweater', 'jacket', 'coat'].includes(garment)) return 'shirt';
  if (garment === 'bundle') return 'general';
  return 'tshirt';
}
