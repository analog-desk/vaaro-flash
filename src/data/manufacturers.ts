export type ManufacturerId =
  | 'kodak'
  | 'fujifilm'
  | 'ilford'
  | 'harman'
  | 'kentmere'
  | 'cinestill'
  | 'lomography'
  | 'foma'
  | 'rollei'
  | 'adox'
  | 'agfa'
  | 'orwo'
  | 'ferrania'
  | 'bergger'
  | 'washi'
  | 'fpp'
  | 'flic'
  | 'dubblefilm'
  | 'revolog'
  | 'streetcandy'
  | 'lucky'
  | 'shanghai'
  | 'kosmo'
  | 'jch'
  | 'catlabs'
  | 'reflx'
  | 'santacolor'
  | 'silberra'
  | 'kono'
  | 'oriental'
  | 'argenti'
  | 'polaroid';

export interface Manufacturer {
  id: ManufacturerId;
  name: string;
  country?: string;
  kind: 'manufacturer' | 'brand / respooler' | 'boutique / effects';
  note: string;
}

// "Manufacturer" means the company coats its own emulsions. "Brand / respooler" sells film made by someone else,
// usually without naming the source. Where the source is confirmed or widely reported, each stock says so.
export const MANUFACTURERS: Record<ManufacturerId, Manufacturer> = {
  kodak: { id: 'kodak', name: 'Kodak', country: 'USA', kind: 'manufacturer', note: 'Eastman Kodak coats the film; Kodak Alaris distributes still film.' },
  fujifilm: { id: 'fujifilm', name: 'Fujifilm', country: 'Japan', kind: 'manufacturer', note: 'Fujifilm still coats its slide film and Acros II. Some newer Fujifilm-branded colour negative film is widely reported to be made by Kodak.' },
  ilford: { id: 'ilford', name: 'Ilford', country: 'UK', kind: 'manufacturer', note: 'Ilford-brand B&W film is made by Harman technology in Mobberley, England.' },
  harman: { id: 'harman', name: 'Harman', country: 'UK', kind: 'manufacturer', note: 'Harman technology makes Ilford, Kentmere and Harman-brand films, including the Phoenix colour films.' },
  kentmere: { id: 'kentmere', name: 'Kentmere', country: 'UK', kind: 'manufacturer', note: 'Budget B&W line made by Harman technology.' },
  cinestill: { id: 'cinestill', name: 'CineStill', country: 'USA', kind: 'brand / respooler', note: 'Adapts Kodak motion-picture film for C-41 by removing the rem-jet backing.' },
  lomography: { id: 'lomography', name: 'Lomography', country: 'Austria', kind: 'brand / respooler', note: 'Sells film made by several factories; sources are rarely confirmed.' },
  foma: { id: 'foma', name: 'Foma (Fomapan)', country: 'Czech Republic', kind: 'manufacturer', note: 'Foma Bohemia coats its own B&W films.' },
  rollei: { id: 'rollei', name: 'Rollei', country: 'Germany', kind: 'brand / respooler', note: 'Rollei-brand film (Maco / Rollei film) uses emulsions from several factories, including Agfa-Gevaert aerial films.' },
  adox: { id: 'adox', name: 'ADOX', country: 'Germany', kind: 'manufacturer', note: 'ADOX coats some films in its own factory and sources others.' },
  agfa: { id: 'agfa', name: 'Agfa / AgfaPhoto', country: 'Germany / Belgium', kind: 'brand / respooler', note: 'Current AgfaPhoto-brand film is licensed; current APX is widely reported to be made by Harman. Agfa-Gevaert still makes aerial and technical films.' },
  orwo: { id: 'orwo', name: 'ORWO / Original Wolfen', country: 'Germany', kind: 'manufacturer', note: 'Makes cine-derived B&W film and, since 2023, Wolfen colour negative film.' },
  ferrania: { id: 'ferrania', name: 'Ferrania', country: 'Italy', kind: 'manufacturer', note: 'Revived Italian factory making B&W film.' },
  bergger: { id: 'bergger', name: 'Bergger', country: 'France', kind: 'brand / respooler', note: 'French brand; Pancro 400 is a dual-emulsion B&W film.' },
  washi: { id: 'washi', name: 'Film Washi', country: 'France', kind: 'boutique / effects', note: 'Hand-rolled film repurposed from technical, aerial and sound-recording stocks. Specs are thin; check the box.' },
  fpp: { id: 'fpp', name: 'Film Photography Project', country: 'USA', kind: 'boutique / effects', note: 'Repurposed and hand-rolled specialty films. Batches change; check the box.' },
  flic: { id: 'flic', name: 'Flic Film', country: 'Canada', kind: 'brand / respooler', note: 'Canadian brand behind Street Candy and several respooled cine films.' },
  dubblefilm: { id: 'dubblefilm', name: 'Dubblefilm', country: 'UK', kind: 'boutique / effects', note: 'Effects films pre-exposed for colour shifts, plus respooled stocks. Specs are not fully published.' },
  revolog: { id: 'revolog', name: 'Revolog', country: 'Austria', kind: 'boutique / effects', note: 'Pre-exposed effects films (light leaks, textures, colour tints) on a colour negative base.' },
  streetcandy: { id: 'streetcandy', name: 'Street Candy', country: 'Canada', kind: 'brand / respooler', note: 'Flic Film\'s B&W line, repurposed from surveillance/technical stock.' },
  lucky: { id: 'lucky', name: 'Lucky', country: 'China', kind: 'manufacturer', note: 'Chinese manufacturer; availability outside China varies.' },
  shanghai: { id: 'shanghai', name: 'Shanghai', country: 'China', kind: 'manufacturer', note: 'Shanghai Jiancheng Film still manufactures GP3.' },
  kosmo: { id: 'kosmo', name: 'Kosmo Foto', country: 'UK', kind: 'brand / respooler', note: 'Sells rebranded B&W film; sources are not officially named.' },
  jch: { id: 'jch', name: 'JCH (Japan Camera Hunter)', country: 'Japan', kind: 'brand / respooler', note: 'StreetPan 400 is made by Agfa-Gevaert from surveillance film.' },
  catlabs: { id: 'catlabs', name: 'CatLABS', country: 'USA', kind: 'brand / respooler', note: 'Boston-based seller of the X Film line.' },
  reflx: { id: 'reflx', name: 'Reflx Lab', country: 'China / Taiwan', kind: 'brand / respooler', note: 'Respools Kodak Vision3 motion-picture film.' },
  santacolor: { id: 'santacolor', name: 'SantaColor', country: 'Germany', kind: 'brand / respooler', note: 'Optik Oldschool\'s respool of Kodak Aerocolor IV.' },
  silberra: { id: 'silberra', name: 'Silberra', country: 'Russia', kind: 'brand / respooler', note: 'Small-batch B&W films; availability varies.' },
  kono: { id: 'kono', name: 'KONO!', country: 'Austria', kind: 'boutique / effects', note: 'Creative and effects films made from re-purposed motion-picture stock.' },
  oriental: { id: 'oriental', name: 'Oriental', country: 'Japan', kind: 'manufacturer', note: 'Oriental Seagull B&W film; current supply unverified.' },
  argenti: { id: 'argenti', name: 'Argenti', country: 'Spain', kind: 'brand / respooler', note: 'Converts bulk B&W films into 35mm.' },
  polaroid: { id: 'polaroid', name: 'Polaroid', country: 'Netherlands', kind: 'manufacturer', note: 'Integral instant film. Not usable in 35mm cameras.' },
};
