// All fabric content lives in this one file.
// To add a fabric, copy an entry in FABRICS and change its values.
//
// Ratings run from 1 to 5. More means more of that quality.
// They are relative guides for comparing fabrics, not lab results.

export const GROUPS = [
  { id: 'clothing', label: 'Clothing' },
  { id: 'bedding', label: 'Bedding' },
  { id: 'bath', label: 'Bath' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'furnishing', label: 'Furnishing' },
];

// lowIsBetter marks the two ratings where fewer points is the good result.
export const RATINGS = [
  { id: 'strength', label: 'Strength' },
  { id: 'durability', label: 'Durability' },
  { id: 'breathability', label: 'Breathability' },
  { id: 'absorbency', label: 'Absorbency' },
  { id: 'drying', label: 'Drying speed' },
  { id: 'wrinkle', label: 'Wrinkle resistance' },
  { id: 'shrinkage', label: 'Shrinkage', lowIsBetter: true },
  { id: 'pilling', label: 'Pilling', lowIsBetter: true },
  { id: 'colour', label: 'Colour fastness' },
  { id: 'softness', label: 'Softness' },
  { id: 'warmth', label: 'Warmth' },
  { id: 'stretch', label: 'Stretch' },
];

export const RATING_WORDS = ['', 'Very low', 'Low', 'Medium', 'High', 'Very high'];

export const PRICE_WORDS = ['', 'Low', 'Low to medium', 'Medium to high', 'High'];

// How each surface is built. Shown in close-up mode.
export const WEAVES = {
  plain: {
    label: 'Plain weave',
    explain: 'Each thread goes over one thread and under the next, like a simple mat.',
  },
  twill: {
    label: 'Twill weave',
    explain: 'Threads pass over two or more threads at a time. This makes slanted lines on the surface.',
  },
  satin: {
    label: 'Satin weave',
    explain: 'Threads float over many threads before going under one. Long floats make the surface smooth and shiny.',
  },
  knit: {
    label: 'Knit',
    explain: 'One thread is looped through itself row after row. The loops let the cloth stretch.',
  },
  pile: {
    label: 'Pile',
    explain: 'Extra threads stand up from the base cloth as loops or cut ends. This makes a soft, raised surface.',
  },
};

// physics
//   gsm        weight used by the cloth simulation
//   stiffness  0 = falls limp, 1 = holds its shape like a board
//   stretch    0 = no give, 1 = very stretchy
//   damping    how quickly movement dies down (0 to 1)
//   gather     how closely the clips are pushed together (1 = flat, 0.7 = deep folds)
//
// look
//   colour         thread colour
//   threadsPerTile threads in one repeat of the generated texture
//   threadMm       drawn width of one thread, in millimetres (larger than life)
//   warpWidth, weftWidth  thread thickness as a share of the space it has (1 = no gaps)
//   irregularity   0 = machine even, 1 = very uneven hand-spun yarn
//   threadOpacity  1 = solid thread, lower lets light through
//   roughness, sheen, sheenRoughness  surface response to light
//   bump           depth of the thread relief

export const FABRICS = [
  {
    id: 'cotton-mulmul',
    name: 'Cotton mulmul',
    aka: 'Also called malmal or muslin',
    summary:
      'A very thin, soft cotton cloth. It feels light as air and keeps you cool in hot, sticky weather.',
    groups: ['clothing', 'bedding', 'kitchen'],
    fibre: 'Cotton. It grows as soft fluff around the seeds of the cotton plant.',
    weave: 'plain',
    weaveNote: 'Fine threads in a loose plain weave, with tiny gaps between them.',
    gsm: 'Roughly 50 to 80 GSM. This is very light.',
    uses: [
      'Summer kurtas, dupattas and soft cotton saris',
      'Baby clothes, swaddles and nappies',
      'Dohars, the light summer quilts made of three mulmul layers',
      'Straining paneer, curd and ghee in the kitchen',
    ],
    season: 'Summer and monsoon. It is too thin for winter on its own.',
    wash:
      'Wash gently in cold water with mild soap. Wash dark colours alone the first few times. Do not wring it hard. Dry it in shade.',
    store:
      'Fold it and keep it in a dry cupboard. Iron it while slightly damp. It needs no special care against insects.',
    price: { level: 2, note: 'Plain mulmul is cheap. Hand block printed mulmul costs more.' },
    touch:
      'Very thin, soft and a little cool. Hold it up and you can see the shape of your hand through it. Crush it in your fist and the creases stay.',
    ratings: {
      strength: [2, 'The threads are fine and loosely woven, so it can tear if pulled hard.'],
      durability: [2, 'It grows thinner with each wash and wears through sooner than thick cotton.'],
      breathability: [5, 'Air passes easily through the gaps in the loose weave.'],
      absorbency: [4, 'Cotton soaks up sweat well, though thin cloth cannot hold much water.'],
      drying: [5, 'It is so thin that it dries very fast on the line.'],
      wrinkle: [1, 'Cotton creases easily, and thin cloth has no body to spring back.'],
      shrinkage: [4, 'Loose cotton weaves pull tighter in the first wash unless pre-washed.'],
      pilling: [1, 'It turns softer with age but rarely forms little balls of fibre.'],
      colour: [3, 'This depends on the dye. Hand prints may bleed in the first few washes.'],
      softness: [5, 'Fine threads and a loose weave make it gentle enough for a baby.'],
      warmth: [1, 'It is thin and airy, so it holds almost no body heat.'],
      stretch: [1, 'It is woven, not knitted, so it gives only a little on the slant.'],
    },
    physics: { gsm: 65, stiffness: 0.06, stretch: 0.03, damping: 0.25, gather: 0.74 },
    look: {
      colour: '#f2eee4',
      threadsPerTile: 16,
      threadMm: 1.4,
      warpWidth: 0.8,
      weftWidth: 0.76,
      irregularity: 0.35,
      threadOpacity: 0.92,
      roughness: 0.95,
      sheen: 0.45,
      sheenRoughness: 0.75,
      bump: 1.3,
    },
  },
];
