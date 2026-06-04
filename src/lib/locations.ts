// Per-town content for the neighbor-town landing pages (/pilates-in-<slug>).
//
// These pages exist to capture local search intent from the towns immediately
// around the Speonk studio. To avoid thin "doorway" pages, every entry MUST
// carry genuinely town-specific substance — a unique intro, real driving
// directions from that town, a local landmark, and at least one FAQ that only
// makes sense for that town. Do NOT reuse copy across towns. The homepage
// already owns Speonk itself, so Speonk gets no page here.
//
// Studio: 295 Montauk Highway, Suite 7, Speonk NY 11972 (inside Host Hampton),
// directly on Montauk Highway (NY-27A), the road that threads every hamlet below.

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
    driveMinutes: 10,
    distanceMi: 5,
    landmark: 'Westhampton Beach Main Street and the Performing Arts Center',
    intro:
      'Maningo Method is the closest dedicated Mat & Sculpt Pilates studio to Westhampton and Westhampton Beach — a straight shot west on Montauk Highway, no traffic-clogged turns. You get small, all-levels group classes (max 20) without the Main Street parking hunt or a 40-minute drive toward Riverhead. It is the easy, in-and-out option for a Westhampton morning workout.',
    directions:
      'From Westhampton Beach, head west on Montauk Highway (NY-27A / Main Street) through Quiogue and Westhampton. Stay on Montauk Highway as it crosses into Speonk — the studio is on your right at 295 Montauk Highway, Suite 7, inside the Host Hampton building. It is about a 10-minute drive.',
    localAngle:
      'Plenty of Westhampton and Westhampton Beach regulars already pass the studio on their way to and from the village. Booking a 7am class on the way into town beats fighting for a Main Street spot, and there is always open parking right at the door.',
    faq: [
      {
        q: 'How far is Maningo Method from Westhampton Beach?',
        a: 'About 5 miles and a 10-minute drive west on Montauk Highway — closer than driving toward Riverhead or out east toward Southampton for a class.',
      },
      {
        q: 'Is there parking, unlike Westhampton Beach Main Street?',
        a: 'Yes. The studio sits inside Host Hampton just off Montauk Highway with its own free lot — no metered village parking, no circling the block.',
      },
    ],
  },

  'east-quogue': {
    slug: 'east-quogue',
    town: 'East Quogue',
    driveMinutes: 15,
    distanceMi: 8,
    landmark: 'the East Quogue village center near Montauk Highway',
    intro:
      'For East Quogue, Maningo Method is the nearby Mat & Sculpt Pilates option to the west — a single, mostly straight run down Montauk Highway with no need to head all the way into Southampton. Classes stay small (max 20, all levels), so you get real attention instead of a packed corporate-studio room. It is a quiet, focused way to start the day before the summer crowds fill the highway.',
    directions:
      'From East Quogue, take Montauk Highway (NY-27A) west through Quogue and Westhampton, continuing into Speonk. The studio is at 295 Montauk Highway, Suite 7, inside Host Hampton, on the north side of the road. Plan on roughly a 15-minute drive.',
    localAngle:
      'East Quogue sits between Maningo Method and the bigger Southampton studios, but the drive west is shorter and far calmer — especially in season, when heading east means sitting in beach traffic. An early class here gets you back home before the day even starts.',
    faq: [
      {
        q: 'Which way do I drive from East Quogue?',
        a: 'West on Montauk Highway through Quogue and Westhampton into Speonk — about 8 miles and 15 minutes, going against the worst of the summer eastbound traffic.',
      },
      {
        q: 'Is this closer than driving into Southampton for Pilates?',
        a: 'For most of East Quogue, yes — and the westbound drive is usually lighter, particularly on summer weekends.',
      },
    ],
  },

  remsenburg: {
    slug: 'remsenburg',
    town: 'Remsenburg',
    driveMinutes: 5,
    distanceMi: 2,
    landmark: 'Remsenburg Academy and the South Country Road neighborhoods',
    intro:
      'Remsenburg and Speonk share a school district and a border, which makes Maningo Method effectively your neighborhood Pilates studio — under five minutes from most of Remsenburg. Small Mat & Sculpt group classes (max 20, all levels) mean you can roll out of the quiet residential streets and onto the mat without committing to a long drive or a big-box membership. It is about as local as a workout gets out here.',
    directions:
      'From Remsenburg, head north to Montauk Highway (NY-27A) and turn west toward Speonk. The studio is a short hop down at 295 Montauk Highway, Suite 7, inside the Host Hampton building on the right. It is under a 5-minute drive from most of Remsenburg.',
    localAngle:
      'Because Remsenburg is so close, it is easy to make Pilates a real routine here rather than an occasional trip — a Tuesday, Thursday, and Saturday habit that fits between school drop-off and the rest of your morning.',
    faq: [
      {
        q: 'How close is the studio to Remsenburg?',
        a: 'Very — about 2 miles and under 5 minutes. Remsenburg borders Speonk, so it is essentially your nearest Pilates studio.',
      },
      {
        q: 'Is it an easy trip with a school-morning schedule?',
        a: 'Yes. Classes run early (from 7am Tuesday through Saturday), so a session fits neatly around Remsenburg-Speonk drop-off and the rest of your day.',
      },
    ],
  },
};

export const LOCATION_LIST: Location[] = Object.values(LOCATIONS);
