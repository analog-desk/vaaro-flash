import type { LightingId, SubjectId } from './types';

export interface Lesson {
  id: string;
  title: string;
  /** Relevant when the current shot matches any of these. */
  when?: { subjects?: SubjectId[]; lighting?: LightingId[]; flash?: boolean; film?: boolean };
  body: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'four-controls',
    title: 'The four controls when using flash',
    when: { flash: true },
    body: [
      'Aperture and ISO change both the flash and the ambient exposure.',
      'Shutter speed (at or below sync) changes only the ambient exposure. The flash pulse lasts around 1/1000 s or less, so it is over long before the shutter closes.',
      'Flash power and flash-to-subject distance change only the flash exposure.',
      'So: choose the aperture for depth of field, set the shutter for how bright the background should be, then set the power or distance for the subject.',
    ],
  },
  {
    id: 'guide-number',
    title: 'Guide numbers',
    when: { flash: true },
    body: [
      'A guide number (GN) is the flash output expressed as aperture × distance. The iT32 is rated GN 18 in metres, which is GN 59 in feet (ISO 100): f/9 at 2 m or f/4.5 at 4 m at full power. Use GN and distance in the same unit.',
      'GN scales with the square root of ISO: ISO 400 doubles it (√4 = 2). It also scales with the square root of power: 1/4 power halves it.',
      'Required power = (aperture × distance ÷ GN)². Every stop of loss from a diffuser or bounce doubles the power needed.',
      'Manufacturer ratings are often optimistic. An independent test of the iT32 measured about GN 11.5 against Godox\'s 18 (metre figures; 38 vs 59 in feet), a difference of about 1.3 stops. Calibrate your own unit.',
    ],
  },
  {
    id: 'inverse-square',
    title: 'Inverse-square falloff',
    when: { flash: true },
    body: [
      'Light from a small source spreads out: at twice the distance it covers four times the area, so it is two stops dimmer.',
      'This is why direct flash makes black backgrounds: a wall 4 m behind a subject at 2 m gets (2/6)² = 1/9 of the light, about 3.2 stops less.',
      'Move the subject away from the background for a darker background; move the flash closer to the subject for faster falloff across the frame.',
    ],
  },
  {
    id: 'sync',
    title: 'Flash sync speed',
    when: { flash: true },
    body: [
      'A focal-plane shutter is two curtains. At fast speeds the second curtain starts closing before the first has fully opened, so only a moving slit exposes the film. A flash fired then lights only that slit.',
      'The AE-1 Program\'s fastest full-open speed for flash is 1/60 s. Faster and part of the frame stays black. With the iT32 it will not set this for you.',
      'The X-T5 syncs at 1/250 s with the mechanical shutter. Above that, high-speed sync (HSS) pulses the flash, at a large cost in output.',
    ],
  },
  {
    id: 'balance',
    title: 'Balancing ambient light and flash',
    when: { flash: true, lighting: ['night', 'blue', 'indoor', 'lowlight', 'mixed'] },
    body: [
      'Decide how bright the background should be relative to the subject. Natural: 0 to −1 stop. Moody: −1.5 to −2. The 90s snapshot look: −3 or darker.',
      'Slow sync (dragging the shutter) lets more ambient in. With subject movement, ambient light records a soft ghost around the flash-frozen image.',
      'Keep ambient on the subject at least 1.5–2 stops under the flash if you want sharp results at slow shutter speeds.',
    ],
  },
  {
    id: 'fill',
    title: 'Fill flash ratios',
    when: { flash: true, lighting: ['sunny', 'golden', 'backlit', 'overcast'] },
    body: [
      'Fill flash adds light to shadows without becoming the main light. −2 stops is subtle, −1 is clearly visible, 0 makes flash the dominant look.',
      'In bright light the sync speed limits you: on the AE-1 at 1/60 s, ISO 100 film already needs f/16–f/22 in sun, which limits the iT32 to about 1 m of fill.',
      'Often a reflector or turning the subject to put the sun behind them is a better fill than a small flash.',
    ],
  },
  {
    id: 'soft',
    title: 'Hard light, soft light, bounce and diffusion',
    when: { flash: true },
    body: [
      'Softness comes from the size of the light relative to the subject, not from the modifier\'s name. A bare iT32 head is tiny, so it gives hard light with crisp shadows.',
      'Bouncing off a ceiling or wall turns a large area into the light source. That gives much softer light, but it costs the extra path length plus 1–2 stops of surface loss.',
      'A clip-on diffuser costs about a stop and softens only slightly outdoors (no walls to bounce from). Indoors it spreads light to nearby surfaces.',
      'Coloured surfaces tint the bounce. A green wall gives green light.',
    ],
  },
  {
    id: 'offcamera',
    title: 'Off-camera direction',
    when: { flash: true, subjects: ['portrait', 'fashion', 'product', 'food'] },
    body: [
      '45° to the side and slightly above (Rembrandt-style) gives shape with a small triangle of light on the far cheek.',
      '90° to the side (split light) lights half the face: dramatic, high contrast.',
      'Behind the subject (rim) outlines hair and shoulders and separates them from a dark background.',
      'Only the flash-to-subject distance matters for exposure. Where the camera stands does not.',
    ],
  },
  {
    id: 'film-types',
    title: 'Colour negative, slide and B&W film',
    when: { film: true },
    body: [
      'Colour negative (C-41) has wide latitude and tolerates overexposure far better than underexposure. Most stocks look good from about −1 to +2 or more stops; how much varies by stock.',
      'Slide film (E-6) gives a positive image with narrow latitude: about ±⅓ stop for critical work. Meter for the highlights.',
      'B&W negative is developed to taste: expose for the shadows, and development controls the highlights and contrast.',
      'Chromogenic B&W (XP2 Super) is processed in C-41 and behaves like colour negative.',
    ],
  },
  {
    id: 'latitude',
    title: 'Exposure latitude, over- and underexposure',
    when: { film: true },
    body: [
      'Latitude is how far from correct you can expose and still get a usable image. It differs by stock, processing, scanning and taste.',
      'There is no universal rule like "always overexpose negative film by one stop". Some stocks (Portra 400) look great with generous exposure; others (Ektar) are less forgiving; slide film does not tolerate it at all.',
      'Underexposed colour negative gets grainy, muddy and colour-shifted shadows. Overexposed negatives get denser and lower in contrast, and eventually lose highlight separation.',
    ],
  },
  {
    id: 'push-pull',
    title: 'Push and pull processing vs. the ISO dial',
    when: { film: true, lighting: ['night', 'lowlight', 'verydark', 'indoor'] },
    body: [
      'Changing the AE-1\'s film-speed dial only changes how the meter calculates. It does not change the film.',
      'Pushing means rating the film faster (e.g. Tri-X at 1600) and telling the lab to develop longer to compensate. The whole roll must be shot at that rating.',
      'Pulling is the reverse: rate slower, develop shorter, for lower contrast.',
      'Pushing adds contrast and grain, and does not create real shadow detail. B&W 400 films push well; colour negative pushes 1–2 stops with colour shifts; many slide films push less well.',
    ],
  },
  {
    id: 'grain',
    title: 'Grain',
    when: { film: true },
    body: [
      'Faster films use larger silver halide crystals, so they show more grain. Underexposure and pushing make grain more visible.',
      'Colour negative usually shows less grain with more exposure. Scanning sharpness settings can exaggerate it.',
    ],
  },
  {
    id: 'colour-temp',
    title: 'Colour temperature',
    when: { lighting: ['golden', 'blue', 'indoor', 'night', 'mixed', 'lowlight'] },
    body: [
      'Daylight and flash are about 5500–6000 K. Household lamps are about 2700–3200 K: much warmer. Shade and blue hour are 7000–10000 K: cooler.',
      'Daylight film renders tungsten light orange. Tungsten film (500T, 800T) renders it neutral but renders daylight and flash blue.',
      'A CTO (orange) gel on the flash matches it to warm room light, so the subject and the room are the same colour.',
    ],
  },
  {
    id: 'reciprocity',
    title: 'Reciprocity failure',
    when: { film: true, lighting: ['blue', 'night', 'verydark', 'lowlight'] },
    body: [
      'At exposures longer than about 1 s, most films respond less than the meter expects, so they need extra time.',
      'Harman (Ilford) publishes a formula: corrected time = metered time ^ p (1.31 for HP5 Plus). Kodak publishes tables. Fujifilm Provia 100F and Acros II need no correction for very long times.',
      'Digital sensors do not have reciprocity failure.',
    ],
  },
  {
    id: 'dof',
    title: 'Depth of field and focus',
    body: [
      'Depth of field grows with smaller apertures, shorter focal lengths and greater distance.',
      'Hyperfocal focusing: focus at the hyperfocal distance and everything from half that distance to infinity is acceptably sharp. At 35mm f/8 on film it is about 5 m.',
      'Zone focus for street: pre-set 2.5–3 m at f/8 and you are sharp from roughly 1.7 m to 6 m without touching the ring.',
      'On the AE-1 Program\'s split-image screen, focus on an edge or the iris of an eye until the two halves line up.',
    ],
  },
  {
    id: 'metering',
    title: 'Metering with the AE-1 Program',
    when: { film: true },
    body: [
      'The AE-1 Program meters centre-weighted average: the centre of the frame counts most.',
      'Bright skies or windows in the frame make it underexpose the subject. Meter a mid-tone (skin in shade, grass, jeans) and set it manually.',
      'With manual flash, the meter reads only the ambient light. Use it to judge the background exposure at your chosen shutter speed.',
    ],
  },
];

export const GLOSSARY: { term: string; def: string }[] = [
  { term: 'EV (exposure value)', def: 'A number for scene brightness or exposure settings. +1 EV = twice the light. Sun ≈ EV 15, a lit room ≈ EV 6 (at ISO 100).' },
  { term: 'Stop', def: 'A doubling or halving of light. f/4 → f/5.6, 1/60 → 1/125, ISO 200 → 400, 1/4 → 1/8 power are each one stop.' },
  { term: 'Guide number (GN)', def: 'Flash output as aperture × distance at full power and a stated ISO. iT32: 18 m at ISO 100 (rated).' },
  { term: 'Sync speed', def: 'Fastest shutter at which the whole frame is open when the flash fires. AE-1 Program 1/60 s, X-T5 1/250 s.' },
  { term: 'TTL', def: 'Through-the-lens flash metering. Needs a camera and trigger that talk to each other. Not possible on the AE-1 Program.' },
  { term: 'HSS', def: 'High-speed sync: the flash pulses to work above sync speed, losing a lot of power.' },
  { term: 'Key light', def: 'The main light that sets the subject\'s exposure.' },
  { term: 'Fill light', def: 'A weaker light that lifts shadows without setting the exposure.' },
  { term: 'Slow sync / dragging the shutter', def: 'A slow shutter with flash, so the ambient background records too.' },
  { term: 'Rear-curtain sync', def: 'Fires the flash at the end of the exposure so motion trails follow the subject. Available on the X-T5, not the AE-1.' },
  { term: 'Ghosting', def: 'A soft, blurred image from ambient light around the sharp flash-frozen subject during slow sync.' },
  { term: 'Inverse-square law', def: 'Light intensity falls with the square of distance: double the distance, a quarter of the light.' },
  { term: 'Bounce', def: 'Pointing the flash at a surface so the surface becomes a larger, softer light source.' },
  { term: 'Latitude', def: 'How far from correct a film can be exposed and still give a usable image.' },
  { term: 'EI (exposure index)', def: 'The speed you actually rate a film at, which may differ from the box ISO.' },
  { term: 'Push / pull', def: 'Rating film faster/slower and developing longer/shorter to compensate.' },
  { term: 'Reciprocity failure', def: 'Film losing sensitivity at long (or very short) exposures.' },
  { term: 'Depth of field', def: 'The distance range that looks acceptably sharp.' },
  { term: 'Hyperfocal distance', def: 'Focus distance that gives sharpness from half that distance to infinity.' },
  { term: 'Circle of confusion', def: 'The blur size still accepted as sharp. 0.03 mm for 35mm film, 0.02 mm for APS-C.' },
  { term: 'Zone focusing', def: 'Pre-setting focus so a range of distances is sharp without refocusing.' },
  { term: 'Crop factor', def: 'APS-C (X-T5) is 1.5×: a 35mm lens frames like a 52mm lens on 35mm film.' },
  { term: 'C-41 / E-6 / ECN-2', def: 'Development processes: colour negative / slide / motion-picture negative.' },
  { term: 'Rem-jet', def: 'Black anti-halation backing on cinema film; must be removed in ECN-2 processing.' },
  { term: 'Halation', def: 'Red glow around bright lights on film without anti-halation layers (e.g. CineStill).' },
  { term: 'Orthochromatic', def: 'Film that does not see red light. Red renders dark.' },
  { term: 'Colour temperature', def: 'Colour of light in kelvin. Low = warm (tungsten ≈ 3200 K), high = cool (shade ≈ 7500 K).' },
  { term: 'CTO gel', def: 'Orange filter for the flash that matches it to tungsten light.' },
];

export const EXERCISES: { title: string; steps: string[] }[] = [
  {
    title: 'Calibrate your iT32 guide number',
    steps: [
      'ISO 100 film (or the X-T5 at ISO 100, manual flash). Subject: a grey card or face at exactly 2 m, in a room with dim ambient.',
      'Shutter 1/60 s, flash direct at 1/1 power.',
      'Shoot f/5.6, f/8, f/11 and f/16, noting each frame.',
      'Pick the best-exposed frame: your GN = that aperture × 2. Enter it under Guide number → My value.',
    ],
  },
  {
    title: 'Drag the shutter',
    steps: [
      'Indoor or night scene, flash direct, power fixed.',
      'Shoot the same frame at 1/60, 1/30, 1/15 and 1/8 s.',
      'The subject should stay the same while the background brightens a stop each time.',
    ],
  },
  {
    title: 'See inverse-square falloff',
    steps: [
      'Fix power and aperture. Put people at 1 m, 2 m and 4 m from the flash.',
      'Each doubling of distance should be two stops darker.',
    ],
  },
  {
    title: 'Direct vs bounce vs off-camera',
    steps: ['Same subject, same position. Shoot direct, bounced off the ceiling, and off-camera at 45°.', 'Use the app for each power. Compare shadows and skin texture.'],
  },
  {
    title: 'Find your film\'s latitude',
    steps: ['On one roll of colour negative, shoot a scene at −2, −1, 0, +1, +2 and +3 stops.', 'Note which frames you prefer. That is your personal exposure rating for this stock and lab.'],
  },
];

export interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export const QUIZ: QuizQ[] = [
  {
    q: 'With the flash as the main light, you change the shutter from 1/60 to 1/15 s. What happens?',
    options: ['Subject and background both get 2 stops brighter', 'Background gets ~2 stops brighter; subject stays about the same', 'Nothing changes', 'Subject gets brighter, background stays the same'],
    answer: 1,
    explain: 'At normal sync, shutter speed only changes the ambient part of the exposure.',
  },
  {
    q: 'Your subject moves from 2 m to 4 m. How much more flash power do you need?',
    options: ['1 stop (×2)', '2 stops (×4)', '4 stops', 'None'],
    answer: 1,
    explain: 'Inverse-square law: double the distance gives a quarter of the light.',
  },
  {
    q: 'GN 18 at ISO 100. What is it at ISO 400?',
    options: ['72', '36', '25.5', '18'],
    answer: 1,
    explain: 'GN scales with √(ISO ratio): √4 = 2, so 36.',
  },
  {
    q: 'You want flash fill in bright sun on the AE-1 Program with ISO 400 film. What is the problem?',
    options: ['No problem', 'At 1/60 s even f/22 overexposes the ambient', 'The flash is too strong', 'TTL will fail'],
    answer: 1,
    explain: 'Sunny 16 at ISO 400 at 1/60 s needs about f/45. Use ISO 100 film or an ND filter (which also cuts the flash).',
  },
  {
    q: 'Which film gives you the least room for exposure error?',
    options: ['Portra 400', 'HP5 Plus', 'Velvia 50', 'XP2 Super'],
    answer: 2,
    explain: 'Slide film (Velvia) has narrow latitude, about ±⅓ stop for critical work.',
  },
  {
    q: 'You set the AE-1\'s film-speed dial to 1600 with Tri-X loaded but tell the lab nothing. Result?',
    options: ['A pushed roll', 'Two stops underexposed negatives, developed normally', 'No difference', 'Overexposed negatives'],
    answer: 1,
    explain: 'The dial only changes metering. Pushing needs longer development too.',
  },
  {
    q: 'Bouncing off a white ceiling instead of firing direct usually needs…',
    options: ['Less power', 'The same power', 'More power: longer path plus surface loss', 'A faster shutter'],
    answer: 2,
    explain: 'The light travels further and the ceiling absorbs and scatters some of it.',
  },
];
