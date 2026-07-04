import type { MemeTextBox } from '@/shared/lib/types'

/**
 * Curated meme template catalog with hand-annotated, percent-based text boxes.
 *
 * `imgflipImageUrl` points at imgflip's clean blank template (no watermark);
 * the seed script downloads it and re-hosts to Blob. Box geometry is annotated
 * by eye — imgflip's API gives box_count but not coordinates.
 *
 * Dimensions are the blank template's native size.
 */
export interface SeedTemplate {
  slug: string
  name: string
  imgflipImageUrl: string
  width: number
  height: number
  description: string
  captionGuide: string
  boxRoles: string[]
  examples: string[][]
  toneTags: string[]
  textBoxes: MemeTextBox[]
  source: 'imgflip'
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    slug: 'drake-hotline-bling',
    name: 'Drake Hotline Bling',
    imgflipImageUrl: 'https://i.imgflip.com/30b1gx.jpg',
    width: 1200,
    height: 1200,
    description:
      'Two-panel reaction meme. Top: Drake rejecting/disapproving something. Bottom: Drake approving/preferring the better alternative.',
    captionGuide:
      'Box 0 = the worse or rejected option (Drake looks away in disgust). Box 1 = the preferred, better option (Drake points approvingly). The two should be a contrast on the same theme.',
    boxRoles: ['rejected option', 'preferred option'],
    examples: [
      ['Writing tests before shipping', 'Shipping on Friday and praying'],
      ['Reading the documentation', 'Guessing until it works'],
    ],
    toneTags: ['reaction', 'preference', 'contrast'],
    textBoxes: [
      { index: 0, xPct: 50, yPct: 2, wPct: 47, hPct: 44, align: 'center', style: 'plain-black', maxChars: 60 },
      { index: 1, xPct: 50, yPct: 52, wPct: 47, hPct: 44, align: 'center', style: 'plain-black', maxChars: 60 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'two-buttons',
    name: 'Two Buttons',
    imgflipImageUrl: 'https://i.imgflip.com/1g8my4.jpg',
    width: 600,
    height: 908,
    description:
      'A sweating person agonizing over two red buttons they must choose between. Used for difficult or contradictory choices.',
    captionGuide:
      'Box 0 = first button label. Box 1 = second button label. The two options should be a hard, funny, or contradictory dilemma. Keep each label short.',
    boxRoles: ['first button', 'second button'],
    examples: [
      ['Fix the bug', 'Ship it and log a ticket'],
      ['Go to sleep', 'One more episode'],
    ],
    toneTags: ['dilemma', 'choice', 'anxiety'],
    textBoxes: [
      { index: 0, xPct: 3, yPct: 6, wPct: 40, hPct: 16, align: 'center', style: 'impact-outline', maxChars: 30 },
      { index: 1, xPct: 38, yPct: 2, wPct: 40, hPct: 16, align: 'center', style: 'impact-outline', maxChars: 30 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'distracted-boyfriend',
    name: 'Distracted Boyfriend',
    imgflipImageUrl: 'https://i.imgflip.com/1ur9b0.jpg',
    width: 1200,
    height: 800,
    description:
      'A man walking with his girlfriend turns to check out another woman. The girlfriend looks offended. Used for being tempted by a new shiny thing over what you already have.',
    captionGuide:
      'Box 0 = the new tempting thing (the other woman). Box 1 = the person being tempted (the boyfriend). Box 2 = the loyal thing being neglected (the girlfriend).',
    boxRoles: ['the tempting new thing', 'the person tempted', 'the neglected loyal thing'],
    examples: [
      ['New JS framework', 'Me', 'The project I promised to finish'],
      ['Energy drink', 'My sleep schedule', 'Actual rest'],
    ],
    toneTags: ['temptation', 'distraction', 'labels'],
    textBoxes: [
      { index: 0, xPct: 60, yPct: 42, wPct: 26, hPct: 14, align: 'center', style: 'label-white', maxChars: 24 },
      { index: 1, xPct: 33, yPct: 60, wPct: 22, hPct: 14, align: 'center', style: 'label-white', maxChars: 24 },
      { index: 2, xPct: 6, yPct: 46, wPct: 22, hPct: 14, align: 'center', style: 'label-white', maxChars: 24 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'change-my-mind',
    name: 'Change My Mind',
    imgflipImageUrl: 'https://i.imgflip.com/24y43o.jpg',
    width: 482,
    height: 361,
    description:
      'A man sitting at a table outdoors with a sign, inviting people to change his mind about a provocative or opinionated statement.',
    captionGuide:
      'Single box on the sign = a spicy, funny, or contrarian opinion presented as fact. One line, declarative.',
    boxRoles: ['the hot take on the sign'],
    examples: [['Cereal is a soup'], ['Tabs are better than spaces']],
    toneTags: ['opinion', 'hot take', 'debate'],
    textBoxes: [
      { index: 0, xPct: 34, yPct: 68, wPct: 34, hPct: 16, align: 'center', style: 'plain-black', maxChars: 50 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'one-does-not-simply',
    name: 'One Does Not Simply',
    imgflipImageUrl: 'https://i.imgflip.com/1bij.jpg',
    width: 568,
    height: 335,
    description:
      'Boromir from Lord of the Rings gesturing. Classic top/bottom caption format for "one does not simply do X".',
    captionGuide:
      'Box 0 (top) usually starts "One does not simply". Box 1 (bottom) completes the difficult or impossible task. Impact caption style.',
    boxRoles: ['top caption', 'bottom caption'],
    examples: [
      ['One does not simply', 'Center a div on the first try'],
      ['One does not simply', 'Leave the house without their phone'],
    ],
    toneTags: ['classic', 'difficulty', 'top-bottom'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 23, align: 'center', style: 'impact-outline', maxChars: 45 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'uno-draw-25',
    name: 'UNO Draw 25 Cards',
    imgflipImageUrl: 'https://i.imgflip.com/3lmzyx.jpg',
    width: 500,
    height: 494,
    description:
      'A person holds two UNO cards: a custom card vs "Draw 25". Used when someone refuses a reasonable request and accepts a worse punishment instead.',
    captionGuide:
      'Box 0 = the reasonable request being refused (top context). Box 1 = the thing written on the left card (what they stubbornly choose instead of complying).',
    boxRoles: ['the reasonable request', 'the stubborn refusal'],
    examples: [
      ['Write unit tests', 'Draw 25 cards'],
      ['Use TypeScript', 'Ship raw JavaScript'],
    ],
    toneTags: ['refusal', 'stubborn', 'choice'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 2, wPct: 90, hPct: 18, align: 'center', style: 'impact-outline', maxChars: 45 },
      { index: 1, xPct: 6, yPct: 52, wPct: 42, hPct: 28, align: 'center', style: 'plain-black', maxChars: 35 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'bernie-once-again',
    name: 'Bernie I Am Once Again Asking For Your Support',
    imgflipImageUrl: 'https://i.imgflip.com/3oevdk.jpg',
    width: 750,
    height: 750,
    description:
      'Bernie Sanders at a microphone asking for support. Used to humorously request something repeatedly or beg for help/resources.',
    captionGuide:
      'Box 0 = the recurring situation (top). Box 1 = what Bernie is asking for this time — phrased as "I am once again asking for…".',
    boxRoles: ['the recurring context', 'what is being asked for'],
    examples: [
      ['Every sprint planning', 'Realistic deadlines'],
      ['Every deploy Friday', 'Someone to review my PR'],
    ],
    toneTags: ['begging', 'recurring', 'relatable'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 4, wPct: 90, hPct: 18, align: 'center', style: 'impact-outline', maxChars: 50 },
      { index: 1, xPct: 5, yPct: 72, wPct: 90, hPct: 22, align: 'center', style: 'plain-black', maxChars: 55 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'left-exit-12',
    name: 'Left Exit 12 Off Ramp',
    imgflipImageUrl: 'https://i.imgflip.com/22bdq6.jpg',
    width: 804,
    height: 767,
    description:
      'A car swerves toward an off-ramp while a passenger screams. Used when someone ignores the right path and takes a chaotic shortcut.',
    captionGuide:
      'Box 0 = the exit sign / wrong path label. Box 1 = the person driving toward it. Box 2 = the passenger screaming the correct approach.',
    boxRoles: ['the wrong exit / shortcut', 'the person taking it', 'the voice of reason'],
    examples: [
      ['Skip the docs', 'Me', 'Just read the error message'],
      ['Rewrite from scratch', 'Junior dev', 'Fix the one line'],
    ],
    toneTags: ['bad decision', 'shortcut', 'labels'],
    textBoxes: [
      { index: 0, xPct: 58, yPct: 6, wPct: 30, hPct: 16, align: 'center', style: 'label-white', maxChars: 28 },
      { index: 1, xPct: 8, yPct: 52, wPct: 28, hPct: 14, align: 'center', style: 'label-white', maxChars: 24 },
      { index: 2, xPct: 34, yPct: 78, wPct: 32, hPct: 14, align: 'center', style: 'label-white', maxChars: 28 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'epic-handshake',
    name: 'Epic Handshake',
    imgflipImageUrl: 'https://i.imgflip.com/28j0te.jpg',
    width: 900,
    height: 645,
    description:
      'Two muscular arms clasp in an epic handshake. Used when two unrelated groups or ideas unexpectedly agree on something.',
    captionGuide:
      'Box 0 = first group/idea (left arm). Box 1 = second group/idea (right arm). Box 2 = optional center label for what unites them. Left and right should be an unexpected pairing.',
    boxRoles: ['first group', 'second group', 'what they agree on'],
    examples: [
      ['Frontend devs', 'Backend devs', 'Blaming the network'],
      ['Coffee addicts', 'Sleep deprived people', 'One more cup'],
    ],
    toneTags: ['unity', 'unexpected', 'agreement'],
    textBoxes: [
      { index: 0, xPct: 2, yPct: 36, wPct: 28, hPct: 18, align: 'center', style: 'label-white', maxChars: 26 },
      { index: 1, xPct: 70, yPct: 36, wPct: 28, hPct: 18, align: 'center', style: 'label-white', maxChars: 26 },
      { index: 2, xPct: 30, yPct: 54, wPct: 40, hPct: 20, align: 'center', style: 'plain-black', maxChars: 30 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'always-has-been',
    name: 'Always Has Been',
    imgflipImageUrl: 'https://i.imgflip.com/46e43q.png',
    width: 960,
    height: 540,
    description:
      'An astronaut discovers a shocking truth about Earth; another astronaut aims a gun. Used for revelations that were obvious all along.',
    captionGuide:
      'Box 0 = the discovery question ("Wait, it\'s all X?"). Box 1 = the calm confirmation ("Always has been"). Second line is the punchline.',
    boxRoles: ['the shocked discovery', 'the calm confirmation'],
    examples: [
      ['Wait, it\'s all technical debt?', 'Always has been'],
      ['Wait, it\'s all copy-paste from Stack Overflow?', 'Always has been'],
    ],
    toneTags: ['revelation', 'twist', 'obvious'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 6, wPct: 90, hPct: 18, align: 'center', style: 'label-white', maxChars: 45 },
      { index: 1, xPct: 5, yPct: 78, wPct: 90, hPct: 18, align: 'center', style: 'label-white', maxChars: 40 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'waiting-skeleton',
    name: 'Waiting Skeleton',
    imgflipImageUrl: 'https://i.imgflip.com/2fm6x.jpg',
    width: 298,
    height: 403,
    description:
      'A skeleton sitting on a bench, having waited forever. Used for things that take absurdly long or never arrive.',
    captionGuide:
      'Box 0 = what you are waiting for (top). Box 1 = how long it has been or the punchline (bottom). Emphasize endless waiting.',
    boxRoles: ['what you are waiting for', 'how long / punchline'],
    examples: [
      ['Me waiting for CI to pass', 'Still waiting'],
      ['Waiting for the client feedback', 'Season 2 of my life'],
    ],
    toneTags: ['waiting', 'patience', 'never'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'grus-plan',
    name: "Gru's Plan",
    imgflipImageUrl: 'https://i.imgflip.com/26jxvz.jpg',
    width: 700,
    height: 449,
    description:
      'Four-panel Gru plan meme: present a plan, show step 1, step 2, then realize step 2 creates a fatal flaw. Used for plans that backfire.',
    captionGuide:
      'Box 0 = the initial plan. Box 1 = step 1. Box 2 = step 2. Box 3 = the realization that step 2 was a terrible idea. Escalate to a backfire.',
    boxRoles: ['the plan', 'step 1', 'step 2', 'the fatal flaw'],
    examples: [
      ['Ship fast', 'Skip tests', 'Deploy Friday', 'Production is on fire'],
      ['Save money', 'Cancel the subscription', 'Forget what it was for', 'Everything broke'],
    ],
    toneTags: ['plan', 'backfire', 'four-panel'],
    textBoxes: [
      { index: 0, xPct: 2, yPct: 4, wPct: 22, hPct: 38, align: 'center', style: 'plain-black', maxChars: 28 },
      { index: 1, xPct: 26, yPct: 4, wPct: 22, hPct: 38, align: 'center', style: 'plain-black', maxChars: 28 },
      { index: 2, xPct: 50, yPct: 4, wPct: 22, hPct: 38, align: 'center', style: 'plain-black', maxChars: 28 },
      { index: 3, xPct: 74, yPct: 4, wPct: 22, hPct: 38, align: 'center', style: 'plain-black', maxChars: 28 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'sad-pablo-escobar',
    name: 'Sad Pablo Escobar',
    imgflipImageUrl: 'https://i.imgflip.com/1c1uej.jpg',
    width: 720,
    height: 709,
    description:
      'Pablo Escobar sitting alone looking dejected. Used for loneliness, boredom, or waiting with nothing to do.',
    captionGuide:
      'Box 0 = the setup (top). Box 1 = the lonely middle thought. Box 2 = the sad punchline (bottom). Tone is melancholy or bored.',
    boxRoles: ['setup', 'middle thought', 'sad punchline'],
    examples: [
      ['When nobody replies in the group chat', 'Just me and my thoughts', 'Forever alone'],
      ['Weekend with no plans', 'Refresh Twitter again', 'Still nothing'],
    ],
    toneTags: ['sad', 'lonely', 'bored'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 18, align: 'center', style: 'impact-outline', maxChars: 45 },
      { index: 1, xPct: 5, yPct: 40, wPct: 90, hPct: 18, align: 'center', style: 'impact-outline', maxChars: 45 },
      { index: 2, xPct: 5, yPct: 76, wPct: 90, hPct: 18, align: 'center', style: 'impact-outline', maxChars: 45 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'disaster-girl',
    name: 'Disaster Girl',
    imgflipImageUrl: 'https://i.imgflip.com/23ls.jpg',
    width: 500,
    height: 375,
    description:
      'A girl smirks in front of a house on fire. Used when someone causes chaos but looks pleased or unbothered.',
    captionGuide:
      'Box 0 = what caused the disaster (top, the fire/chaos). Box 1 = the smug person or their thought (bottom). Imply they started it.',
    boxRoles: ['the chaos / disaster', 'the smug culprit'],
    examples: [
      ['Production after my deploy', 'It was a one-line change'],
      ['The codebase I inherited', 'I\'ll refactor it later'],
    ],
    toneTags: ['chaos', 'smug', 'destruction'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'x-x-everywhere',
    name: 'X, X Everywhere',
    imgflipImageUrl: 'https://i.imgflip.com/1ihzfe.jpg',
    width: 2118,
    height: 1440,
    description:
      'Woody and Buzz from Toy Story surrounded by something everywhere. Used when something is overwhelmingly pervasive.',
    captionGuide:
      'Box 0 = name the thing (top, often just "X"). Box 1 = "X, X everywhere" or the reaction (bottom). Replace X with the subject.',
    boxRoles: ['the thing', 'everywhere reaction'],
    examples: [
      ['Bugs', 'Bugs everywhere'],
      ['Meetings', 'Meetings everywhere'],
    ],
    toneTags: ['everywhere', 'overwhelming', 'classic'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 35 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 45 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'woman-yelling-cat',
    name: 'Woman Yelling At Cat',
    imgflipImageUrl: 'https://i.imgflip.com/345v97.jpg',
    width: 680,
    height: 438,
    description:
      'Split panel: angry woman yelling on the left, confused cat at a salad on the right. Used for misunderstandings or one-sided arguments.',
    captionGuide:
      'Box 0 = the angry/yelling side (left panel). Box 1 = the confused/defensive side (right panel). They should talk past each other.',
    boxRoles: ['the yeller', 'the confused one'],
    examples: [
      ['You need to optimize that loop!', 'It\'s O(n) and that\'s fine'],
      ['Stop using AI for everything!', 'But it wrote my commit message'],
    ],
    toneTags: ['argument', 'misunderstanding', 'split'],
    textBoxes: [
      { index: 0, xPct: 2, yPct: 5, wPct: 46, hPct: 88, align: 'center', style: 'plain-black', maxChars: 55 },
      { index: 1, xPct: 50, yPct: 5, wPct: 48, hPct: 88, align: 'center', style: 'plain-black', maxChars: 55 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'batman-slapping-robin',
    name: 'Batman Slapping Robin',
    imgflipImageUrl: 'https://i.imgflip.com/9ehk.jpg',
    width: 400,
    height: 387,
    description:
      'Batman slaps Robin mid-sentence. Used to shut down a bad suggestion or correct someone harshly.',
    captionGuide:
      'Box 0 = Robin\'s bad idea (left). Box 1 = Batman\'s corrective slap line (right). Right should dismiss or fix the left.',
    boxRoles: ['the bad suggestion', 'the harsh correction'],
    examples: [
      ['Let\'s push directly to main', 'We have a staging branch'],
      ['Just use jQuery', 'It\'s 2026'],
    ],
    toneTags: ['correction', 'slap', 'shutdown'],
    textBoxes: [
      { index: 0, xPct: 4, yPct: 5, wPct: 44, hPct: 30, align: 'center', style: 'impact-outline', maxChars: 35 },
      { index: 1, xPct: 52, yPct: 5, wPct: 44, hPct: 30, align: 'center', style: 'impact-outline', maxChars: 35 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'mocking-spongebob',
    name: 'Mocking Spongebob',
    imgflipImageUrl: 'https://i.imgflip.com/1otk96.jpg',
    width: 502,
    height: 353,
    description:
      'Spongebob chicken pose used to mock someone by repeating their words in alternating caps (mImIcK mOcK).',
    captionGuide:
      'Box 0 = the original statement (top, normal). Box 1 = the mocking repeat (bottom, same words but mockingly — the LLM should use alternating caps).',
    boxRoles: ['original statement', 'mocking repeat'],
    examples: [
      ['I don\'t need sleep', 'i DoN\'t NeEd SlEeP'],
      ['It works on my machine', 'iT wOrKs On My MaChInE'],
    ],
    toneTags: ['mocking', 'mimic', 'sarcasm'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 45 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 45 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'ancient-aliens',
    name: 'Ancient Aliens',
    imgflipImageUrl: 'https://i.imgflip.com/26am.jpg',
    width: 500,
    height: 437,
    description:
      'Giorgio Tsoukalos from Ancient Aliens gesturing wildly. Used for far-fetched explanations or blaming aliens/the supernatural.',
    captionGuide:
      'Box 0 = a mundane mystery or question (top). Box 1 = the absurd "aliens" explanation (bottom). Second line should be an over-the-top conclusion.',
    boxRoles: ['the mystery', 'the absurd explanation'],
    examples: [
      ['Why did the build fail?', 'Aliens'],
      ['Where did that bug come from?', 'Ancient bugs'],
    ],
    toneTags: ['conspiracy', 'absurd', 'explanation'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 45 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'trade-offer',
    name: 'Trade Offer',
    imgflipImageUrl: 'https://i.imgflip.com/54hjww.jpg',
    width: 607,
    height: 794,
    description:
      'A man presenting a trade: "I receive X, you receive Y." Used for uneven or cheeky exchanges.',
    captionGuide:
      'Box 0 = top header/context. Box 1 = "I receive" (left sign). Box 2 = "You receive" (right sign). The trade should feel lopsided or funny.',
    boxRoles: ['header / context', 'I receive', 'you receive'],
    examples: [
      ['Trade offer', 'Your code review', 'My broken code'],
      ['Trade offer', 'Credit for the idea', 'All the debugging work'],
    ],
    toneTags: ['trade', 'uneven', 'deal'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 2, wPct: 90, hPct: 14, align: 'center', style: 'impact-outline', maxChars: 40 },
      { index: 1, xPct: 8, yPct: 50, wPct: 38, hPct: 18, align: 'center', style: 'plain-black', maxChars: 35 },
      { index: 2, xPct: 54, yPct: 50, wPct: 38, hPct: 18, align: 'center', style: 'plain-black', maxChars: 35 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'yall-got-any-more',
    name: "Y'all Got Any More Of That",
    imgflipImageUrl: 'https://i.imgflip.com/21uy0f.jpg',
    width: 600,
    height: 471,
    description:
      'Pablo Escobar sweating, craving something intensely. Used for addiction to a habit, substance, or activity.',
    captionGuide:
      'Box 0 = the setup (top). Box 1 = what they are craving, phrased as "Y\'all got any more of that [X]?" (bottom).',
    boxRoles: ['setup', 'the craving'],
    examples: [
      ['When the coffee wears off', 'Y\'all got any more of that caffeine?'],
      ['After one good deploy', 'Y\'all got any more of that green CI?'],
    ],
    toneTags: ['craving', 'addiction', 'relatable'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 45 },
      { index: 1, xPct: 5, yPct: 74, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 50 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'expanding-brain',
    name: 'Expanding Brain',
    imgflipImageUrl: 'https://i.imgflip.com/1jwhww.jpg',
    width: 857,
    height: 1202,
    description:
      'Four-panel ascending brain enlightenment meme. Each level is a progressively more absurd or galaxy-brain take.',
    captionGuide:
      'Box 0 = most basic take (bottom). Box 1 = slightly smarter. Box 2 = advanced. Box 3 = galaxy-brain absurd take (top). Each level should escalate.',
    boxRoles: ['basic take', 'smarter take', 'advanced take', 'galaxy brain'],
    examples: [
      ['Copy-paste from Stack Overflow', 'Read the docs', 'Read the source code', 'Rewrite the language'],
      ['if/else', 'switch', 'strategy pattern', 'Become the pattern'],
    ],
    toneTags: ['escalation', 'galaxy brain', 'four-panel'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 72, wPct: 90, hPct: 14, align: 'center', style: 'plain-black', maxChars: 40 },
      { index: 1, xPct: 5, yPct: 52, wPct: 90, hPct: 14, align: 'center', style: 'plain-black', maxChars: 40 },
      { index: 2, xPct: 5, yPct: 32, wPct: 90, hPct: 14, align: 'center', style: 'plain-black', maxChars: 40 },
      { index: 3, xPct: 5, yPct: 5, wPct: 90, hPct: 16, align: 'center', style: 'plain-black', maxChars: 40 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'this-is-fine',
    name: 'This Is Fine',
    imgflipImageUrl: 'https://i.imgflip.com/wxica.jpg',
    width: 580,
    height: 282,
    description:
      'A dog sitting in a burning room saying "This is fine." Used for ignoring obvious disasters while pretending everything is OK.',
    captionGuide:
      'Box 0 = the disaster being ignored (top). Box 1 = the denial / "This is fine" reaction (bottom). Tone is calm amid chaos.',
    boxRoles: ['the disaster', 'the denial'],
    examples: [
      ['Production is down', 'This is fine'],
      ['20 open Jira tickets', 'This is fine'],
    ],
    toneTags: ['denial', 'chaos', 'calm'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 3, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 40 },
      { index: 1, xPct: 5, yPct: 72, wPct: 90, hPct: 22, align: 'center', style: 'impact-outline', maxChars: 35 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'tuxedo-winnie-pooh',
    name: 'Tuxedo Winnie The Pooh',
    imgflipImageUrl: 'https://i.imgflip.com/2ybua0.png',
    width: 800,
    height: 582,
    description:
      'Two-panel Winnie the Pooh: plain version vs tuxedo fancy version. Used to show a basic vs refined/superior way to say or do the same thing.',
    captionGuide:
      'Box 0 = the basic/plain version (top panel, right side). Box 1 = the fancy/superior version (bottom panel, right side). Same idea, second is more refined or pretentious.',
    boxRoles: ['basic version', 'fancy version'],
    examples: [
      ['bug fix', 'critical system stability enhancement'],
      ['meeting', 'synergy alignment session'],
    ],
    toneTags: ['fancy', 'contrast', 'refinement'],
    textBoxes: [
      { index: 0, xPct: 52, yPct: 3, wPct: 46, hPct: 44, align: 'center', style: 'plain-black', maxChars: 45 },
      { index: 1, xPct: 52, yPct: 52, wPct: 46, hPct: 44, align: 'center', style: 'plain-black', maxChars: 55 },
    ],
    source: 'imgflip',
  },
  {
    slug: 'is-this-a-pigeon',
    name: 'Is This A Pigeon',
    imgflipImageUrl: 'https://i.imgflip.com/1o00in.jpg',
    width: 1587,
    height: 1425,
    description:
      'Anime character pointing at a butterfly asking "Is this a pigeon?" Used for misidentifying or mislabeling things confidently.',
    captionGuide:
      'Box 0 = the person misidentifying. Box 1 = the thing being pointed at (mislabeled). Box 2 = the wrong label / question ("Is this a X?").',
    boxRoles: ['the confused person', 'the thing pointed at', 'the wrong label'],
    examples: [
      ['Junior dev', 'A CSS bug', 'Is this a backend issue?'],
      ['Me', 'JSON', 'Is this a database?'],
    ],
    toneTags: ['misidentification', 'confusion', 'anime'],
    textBoxes: [
      { index: 0, xPct: 5, yPct: 5, wPct: 38, hPct: 14, align: 'center', style: 'label-white', maxChars: 28 },
      { index: 1, xPct: 55, yPct: 32, wPct: 38, hPct: 14, align: 'center', style: 'label-white', maxChars: 28 },
      { index: 2, xPct: 5, yPct: 78, wPct: 90, hPct: 16, align: 'center', style: 'plain-black', maxChars: 45 },
    ],
    source: 'imgflip',
  },
]
