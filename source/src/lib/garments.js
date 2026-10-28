// Garment silhouettes, all drawn in an 80×100 box (same 4:5 shape as the photo frame).
// `d` is the outer shape, `details` are inner lines (seams, collars, pockets).

export const SHAPE_W = 80;
export const SHAPE_H = 100;

export const GARMENT_SHAPES = {
  tshirt: {
    d: 'M27 9 Q40 19 53 9 L65 13 C70 15 73 19 75 24 L79 37 L67 41 L64 34 L64 91 Q64 95 60 95 L20 95 Q16 95 16 91 L16 34 L13 41 L1 37 L5 24 C7 19 10 15 15 13 Z',
    details: 'M27 9 Q40 23 53 9',
  },
  shirt: {
    d: 'M28 8 L40 17 L52 8 L64 12 C69 14 72 18 73 24 L78 63 L69 65 L64 35 L64 92 Q64 95 61 95 L19 95 Q16 95 16 92 L16 35 L11 65 L2 63 L7 24 C8 18 11 14 16 12 Z',
    details: 'M40 17 L40 95 M28 8 L34 20 L40 17 L46 20 L52 8',
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
    d: 'M29 5 L34 5 Q40 14 46 5 L51 5 L53 27 Q56 32 52 37 L67 91 Q68 95 64 95 L16 95 Q12 95 13 91 L28 37 Q24 32 27 27 Z',
    details: 'M28 37 Q40 41 52 37',
  },
  skirt: {
    d: 'M24 22 L56 22 L67 88 Q68 92 64 92 L16 92 Q12 92 13 88 Z',
    details: 'M24 29 L56 29 M33 29 L28 92 M47 29 L52 92',
  },
  pants: {
    d: 'M20 5 L60 5 Q62 5 62 7 L67 92 Q67 95 64 95 L46 95 Q43 95 43 92 L40 40 L37 92 Q37 95 34 95 L16 95 Q13 95 13 92 L18 7 Q18 5 20 5 Z',
    details: 'M18 12 L62 12 M40 12 L40 30',
  },
  jeans: {
    d: 'M20 5 L60 5 Q62 5 62 7 L67 92 Q67 95 64 95 L46 95 Q43 95 43 92 L40 40 L37 92 Q37 95 34 95 L16 95 Q13 95 13 92 L18 7 Q18 5 20 5 Z',
    details: 'M18 12 L62 12 M40 12 L40 30 M19 12 Q24 22 30 12 M50 12 Q56 22 61 12',
  },
  shorts: {
    d: 'M19 20 L61 20 Q63 20 63 22 L67 64 Q67 67 64 67 L46 67 Q43 67 43 64 L40 42 L37 64 Q37 67 34 67 L16 67 Q13 67 13 64 L17 22 Q17 20 19 20 Z',
    details: 'M17 27 L63 27 M40 27 L40 40',
  },
  bundle: {
    d: 'M12 74 L68 74 Q72 74 72 78 L72 90 Q72 94 68 94 L12 94 Q8 94 8 90 L8 78 Q8 74 12 74 Z M15 54 L65 54 Q69 54 69 58 L69 70 Q69 74 65 74 L15 74 Q11 74 11 70 L11 58 Q11 54 15 54 Z M18 34 L62 34 Q66 34 66 38 L66 50 Q66 54 62 54 L18 54 Q14 54 14 50 L14 38 Q14 34 18 34 Z',
    details: 'M30 34 L30 54 M50 54 L50 74 M34 74 L34 94',
  },
  accessories: {
    d: 'M16 38 L64 38 Q67 38 67 41 L72 90 Q72 95 67 95 L13 95 Q8 95 8 90 L13 41 Q13 38 16 38 Z M27 38 C27 16 53 16 53 38 L49 38 C49 22 31 22 31 38 Z',
    details: 'M12 52 L68 52',
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
