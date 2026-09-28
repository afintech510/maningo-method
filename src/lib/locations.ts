// Per-town content for the neighbor-town landing pages (/pilates-in-<slug>).
//
// These pages exist to capture local search intent from the towns around the
// East Moriches studio. To avoid thin "doorway" pages, every entry MUST
// carry genuinely town-specific substance — a unique intro, real driving
// directions from that town, a local landmark, and at least one FAQ that only
// makes sense for that town. Do NOT reuse copy across towns. The homepage
// already owns East Moriches itself, so it gets no page here.
//
// Studio: 533 Montauk Highway, East Moriches NY 11940 (from October 1, 2026),
// directly on Montauk Highway (NY-27A), the road that threads every hamlet below.
// Drive times/distances are approximate, measured along Montauk Highway.

export type LocationFaq = { q: string; a: string };

export type Location = {
  /** URL segment — page lives at /pilates-in-<slug>. */
  slug: string;
  /** Display name of the town. */
  town: string;
  /** Approximate drive time from the town center, in minutes. */
  driveMinutes: number;
  /** Approximate distance from the town center, in miles. */
  distanceMi: number;
  /** A recognizable landmark/anchor in that town, used in copy. */
  landmark: string;
  /** Unique 2–3 sentence intro. No two towns share this. */
  intro: string;
  /** Turn-by-turn-ish directions from the town to the studio. */
  directions: string;
  /** Why someone from this specific town would train here. */
  localAngle: string;
  /** At least one town-specific Q/A. */
  faq: LocationFaq[];
};

export const LOCATIONS: Record<string, Location> = {
  westhampton: {
    slug: 'westhampton',
    town: 'Westhampton',
    driveMinutes: 15,
    distanceMi: 8,
    landmark: 'Westhampton Beach Main Street and the Performing Arts Center',
    intro:
      'Maningo Method is a dedicated Mat & Sculpt Pilates studio a straight shot west of Westhampton and Westhampton Beach on Montauk Highway — no traffic-clogged turns. You get small, all-levels group classes (max 20) without the Main Street parking hunt or a 40-minute drive toward Riverhead. It is an easy, in-and-out option for a Westhampton morning workout.',
    directions:
      'From Westhampton Beach, head west on Montauk Highway (NY-27A / Main Street) through Quiogue and Westhampton, then on through Eastport. Stay on Montauk Highway into East Moriches — the studio is at U Gotta Dance, 533 Montauk Highway. Classes are in the rear building. It is about a 15-minute drive.',
    localAngle:
      'Heading west out of Westhampton in the morning means driving against the eastbound summer traffic, so a 7am class is an easy start to the day — and you are back before Main Street gets busy.',
    faq: [
      {
        q: 'How far is Maningo Method from Westhampton Beach?',
        a: 'About 8 miles and a 15-minute drive west on Montauk Highway — closer than driving toward Riverhead or out east toward Southampton for a class.',
      },
      {
        q: 'Is the drive from Westhampton easy in summer?',
        a: 'Yes. You are heading west, against the worst of the eastbound beach traffic, and the whole trip stays on Montauk Highway.',
      },
    ],
  },

  'east-quogue': {
    slug: 'east-quogue',
    town: 'East Quogue',
    driveMinutes: 20,
    distanceMi: 12,
    landmark: 'the East Quogue village center near Montauk Highway',
    intro:
      'For East Quogue, Maningo Method is a Mat & Sculpt Pilates option to the west — a single, mostly straight run down Montauk Highway. Classes stay small (max 20, all levels), so you get real attention instead of a packed corporate-studio room. It is a quiet, focused way to start the day before the summer crowds fill the highway.',
    directions:
      'From East Quogue, take Montauk Highway (NY-27A) west through Quogue, Westhampton and Eastport, continuing into East Moriches. The studio is at U Gotta Dance, 533 Montauk Highway. Classes are in the rear building. Plan on roughly a 20-minute drive.',
    localAngle:
      'In season, heading east toward Southampton means sitting in beach traffic; the drive west is calmer and more predictable. An early class here gets you back home before the day even starts.',
    faq: [
      {
        q: 'Which way do I drive from East Quogue?',
        a: 'West on Montauk Highway through Quogue, Westhampton and Eastport into East Moriches — about 12 miles and 20 minutes, going against the worst of the summer eastbound traffic.',
      },
      {
        q: 'Is it worth the drive from East Quogue?',
        a: 'If you want a small, all-levels class with real form coaching, yes — and the westbound drive is usually lighter than heading east, particularly on summer weekends.',
      },
    ],
  },

  remsenburg: {
    slug: 'remsenburg',
    town: 'Remsenburg',
    driveMinutes: 8,
    distanceMi: 4,
    landmark: 'Remsenburg Academy and the South Country Road neighborhoods',
    intro:
      'From Remsenburg, Maningo Method is a short hop west on Montauk Highway — under ten minutes from most of the hamlet. Small Mat & Sculpt group classes (max 20, all levels) mean you can roll out of the quiet residential streets and onto the mat without committing to a long drive or a big-box membership. It is about as local as a workout gets out here.',
    directions:
      'From Remsenburg, head north to Montauk Highway (NY-27A) and turn west, through Eastport and into East Moriches. The studio is at U Gotta Dance, 533 Montauk Highway. Classes are in the rear building. It is about an 8-minute drive from most of Remsenburg.',
    localAngle:
      'Because Remsenburg is so close, it is easy to make Pilates a real routine here rather than an occasional trip — a Tuesday, Thursday, and Saturday habit that fits between school drop-off and the rest of your morning.',
    faq: [
      {
        q: 'How close is the studio to Remsenburg?',
        a: 'Close — about 4 miles and roughly 8 minutes west on Montauk Highway.',
      },
      {
        q: 'Is it an easy trip with a school-morning schedule?',
        a: 'Yes. Classes run early (from 7am Tuesday through Saturday), so a session fits neatly around school drop-off and the rest of your day.',
      },
    ],
  },
};

export const LOCATION_LIST: Location[] = Object.values(LOCATIONS);
