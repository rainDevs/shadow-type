// Central word repository for timed turns (difficulty only affects damage,
// never word selection). 1000 unique words mixing arena flavor with general
// English, all lowercase a-z with no spaces.

// --- arena flavor (from the original themed pools) ---
const THEMED = [
  'ash', 'fog', 'hit', 'run', 'cut', 'fast', 'dark', 'fight', 'type', 'blade',
  'night', 'swift', 'storm', 'ember', 'frost', 'rage', 'honor', 'steel', 'dodge', 'parry',
  'lunge', 'dash', 'cloak', 'shade', 'fang', 'claw', 'surge', 'pulse', 'spark', 'blaze',
  'gloom', 'mist', 'void', 'omen', 'rival', 'dojo', 'ronin', 'ninja', 'arena', 'power',
  'speed', 'focus', 'skill', 'ghost', 'brave', 'fierce', 'venom', 'wraith', 'katana', 'sensei',
  'strike', 'force', 'attack', 'defend', 'battle', 'energy', 'warrior', 'shadow', 'combat', 'victory',
  'thunder', 'silence', 'rhythm', 'defense', 'offense', 'spirit', 'legend', 'master', 'temple', 'moonlit',
  'fighter', 'danger', 'courage', 'wisdom', 'rapid', 'steady', 'flame', 'tiger', 'crane', 'snake',
  'dragon', 'shogun', 'samurai', 'kimono', 'midnight', 'twilight', 'eclipse', 'lantern', 'garden', 'bridge',
  'tower', 'gate', 'glory', 'valor', 'might', 'darkness', 'precision', 'lightning', 'assassin', 'battlefield',
  'maelstrom', 'reckoning', 'thunderstorm', 'nightfall', 'daybreak', 'stronghold', 'watchtower', 'crossroads', 'labyrinth', 'obliterate',
  'annihilate', 'excalibur', 'serendipity', 'juxtapose', 'kaleidoscope', 'warriors', 'dragons', 'masters', 'shadows', 'unbreakable', 'indomitable',
  'inexorable', 'phantasm', 'spectrum', 'wilderness', 'quickness', 'fearlessness', 'ruthlessness', 'relentless', 'swiftness', 'deadliness',
  'shadowboxing', 'counterattack', 'overwhelming', 'underestimated', 'misunderstood', 'discipline', 'sacrifice', 'triumph', 'catastrophe', 'phenomenon',
  'extraordinary', 'magnificent', 'treacherous', 'vengeance', 'whirlwind', 'earthquake', 'volcano', 'tsunami', 'blizzard', 'pyrotechnics',
  'choreography', 'synchronized', 'silent', 'deadly',
  'warlord', 'overlord', 'underworld', 'quest', 'siege', 'ambush', 'banner', 'oath', 'rune', 'totem',
  'moonlight', 'starlight', 'swordplay', 'battlements', 'vanguard', 'onslaught',
  'relic', 'shrine', 'altar', 'idol', 'charm', 'talisman', 'monolith', 'citadel', 'bastion',
];

// --- general English: nature, food, animals, home, verbs, everyday life ---
const GENERAL = [
  'sun', 'moon', 'star', 'sky', 'cloud', 'rain', 'snow', 'wind', 'wave', 'tide',
  'river', 'lake', 'pond', 'ocean', 'sea', 'beach', 'sand', 'dune', 'hill', 'cliff',
  'cave', 'spring', 'autumn', 'winter', 'summer', 'meadow', 'prairie', 'valley', 'canyon', 'desert',
  'island', 'coast', 'reef', 'brook', 'stream', 'waterfall', 'glacier', 'aurora', 'rainbow', 'dew',
  'tree', 'leaf', 'root', 'bloom', 'petal', 'fern', 'moss', 'vine', 'bark', 'trunk',
  'apple', 'pear', 'peach', 'grape', 'berry', 'melon', 'lemon', 'mango', 'plum', 'cherry',
  'bread', 'cheese', 'honey', 'sugar', 'salt', 'pepper', 'rice', 'pasta', 'pizza', 'coffee',
  'tea', 'juice', 'milk', 'butter', 'egg', 'beans', 'carrot', 'potato', 'onion', 'garlic',
  'tomato', 'corn', 'wheat', 'oats', 'barley', 'flour', 'dough', 'crust', 'slice', 'loaf',
  'dog', 'cat', 'bird', 'fish', 'horse', 'sheep', 'goat', 'mouse', 'rabbit', 'bear',
  'wolf', 'fox', 'deer', 'eagle', 'hawk', 'owl', 'crow', 'dove', 'sparrow', 'robin',
  'whale', 'shark', 'crab', 'shrimp', 'squid', 'octopus', 'turtle', 'frog', 'toad', 'lizard',
  'spider', 'beetle', 'ant', 'bee', 'moth', 'fly', 'wasp', 'cricket', 'snail', 'worm',
  'lion', 'elephant', 'camel', 'monkey', 'panda', 'koala', 'zebra', 'hippo', 'rhino', 'leopard',
  'house', 'home', 'room', 'door', 'window', 'wall', 'floor', 'roof', 'chimney', 'porch',
  'kitchen', 'bedroom', 'attic', 'basement', 'hallway', 'closet', 'shelf', 'drawer', 'pantry', 'cellar',
  'bed', 'pillow', 'blanket', 'sheet', 'lamp', 'candle', 'mirror', 'rug', 'curtain', 'sofa',
  'table', 'desk', 'bench', 'stool', 'couch', 'chair', 'clock', 'radio', 'speaker', 'screen',
  'book', 'pen', 'pencil', 'paper', 'envelope', 'stamp', 'letter', 'novel', 'comic', 'diary',
  'phone', 'camera', 'watch', 'wallet', 'purse', 'belt', 'buckle', 'button', 'zipper', 'pocket',
  'shirt', 'pants', 'shoes', 'socks', 'hat', 'cap', 'coat', 'jacket', 'sweater', 'boots',
  'dress', 'skirt', 'scarf', 'gloves', 'mitten', 'tie', 'suit', 'vest', 'gown', 'robe',
  'uniform', 'apron', 'helmet', 'bag', 'box', 'basket', 'bottle', 'jar', 'cup', 'mug',
  'plate', 'bowl', 'tray', 'spoon', 'fork', 'knife', 'ladle', 'whisk', 'funnel', 'sieve',
  'colander', 'platter', 'grater', 'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'tooth',
  'tongue', 'cheek', 'chin', 'neck', 'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger',
  'thumb', 'nail', 'fist', 'heart', 'lung', 'liver', 'bone', 'muscle', 'skin', 'hair',
  'brow', 'lash', 'spine', 'doctor', 'nurse', 'clinic', 'pill', 'syrup', 'vaccine', 'bandage',
  'crutch', 'fever', 'cough', 'walk', 'stroll', 'march', 'tiptoe', 'wander', 'roam', 'hike',
  'trek', 'amble', 'saunter', 'jump', 'leap', 'hop', 'skip', 'bounce', 'tumble', 'roll',
  'slide', 'glide', 'soar', 'climb', 'crawl', 'swim', 'dive', 'float', 'paddle', 'row',
  'sail', 'surf', 'ski', 'throw', 'toss', 'hurl', 'fling', 'pitch', 'lob', 'chuck',
  'heave', 'launch', 'volley', 'catch', 'grab', 'seize', 'clutch', 'grip', 'grasp', 'hold',
  'carry', 'lift', 'hoist', 'push', 'pull', 'drag', 'shove', 'tug', 'yank', 'haul',
  'tow', 'wrench', 'twist', 'chase', 'pursue', 'follow', 'track', 'trail', 'stalk', 'hunt',
  'seek', 'find', 'lose', 'hide', 'sneak', 'creep', 'slink', 'prowl', 'skulk', 'lurk',
  'peek', 'glance', 'stare', 'build', 'craft', 'forge', 'shape', 'mold', 'carve', 'sculpt',
  'paint', 'draw', 'sketch', 'break', 'smash', 'crash', 'shatter', 'crack', 'split', 'tear',
  'rip', 'shred', 'burst', 'open', 'close', 'shut', 'lock', 'latch', 'bolt', 'seal',
  'unlock', 'block', 'bar', 'sing', 'hum', 'whistle', 'chant', 'cheer', 'applaud', 'clap',
  'stomp', 'snap', 'tap', 'laugh', 'giggle', 'chuckle', 'grin', 'smile', 'smirk', 'frown',
  'pout', 'sigh', 'gasp', 'think', 'ponder', 'wonder', 'dream', 'imagine', 'recall', 'forget',
  'remember', 'remind', 'memorize', 'speak', 'talk', 'whisper', 'shout', 'yell', 'scream', 'murmur',
  'mumble', 'chatter', 'babble', 'listen', 'hear', 'eavesdrop', 'heed', 'obey', 'ignore', 'neglect',
  'notice', 'observe', 'learn', 'study', 'teach', 'train', 'drill', 'quiz', 'test', 'grade',
  'tutor', 'mentor', 'work', 'labor', 'toil', 'sweat', 'strive', 'struggle', 'endeavor', 'attempt',
  'try', 'fail', 'help', 'aid', 'assist', 'serve', 'share', 'give', 'take', 'lend',
  'borrow', 'return', 'buy', 'sell', 'trade', 'swap', 'bargain', 'haggle', 'pay', 'spend',
  'save', 'waste', 'cook', 'bake', 'roast', 'grill', 'fry', 'boil', 'steam', 'simmer',
  'chop', 'mince', 'eat', 'dine', 'feast', 'nibble', 'munch', 'chew', 'swallow', 'sip',
  'gulp', 'taste', 'day', 'week', 'month', 'year', 'morning', 'noon', 'evening', 'dusk',
  'dawn', 'today', 'time', 'hour', 'minute', 'second', 'moment', 'while', 'age', 'era',
  'epoch', 'season', 'people', 'child', 'baby', 'toddler', 'teen', 'adult', 'elder', 'crowd',
  'team', 'family', 'mother', 'father', 'sister', 'brother', 'son', 'daughter', 'cousin', 'uncle',
  'friend', 'neighbor', 'buddy', 'pal', 'mate', 'companion', 'partner', 'guest', 'host', 'stranger',
  'school', 'class', 'lesson', 'homework', 'exam', 'library', 'museum', 'gallery', 'studio', 'stage',
  'money', 'coin', 'bill', 'price', 'cost', 'wage', 'salary', 'debt', 'loan', 'tax',
  'car', 'bus', 'truck', 'van', 'taxi', 'metro', 'tram', 'subway', 'ferry', 'wagon',
  'plane', 'jet', 'rocket', 'glider', 'blimp', 'balloon', 'kite', 'parachute', 'drone', 'copter',
  'road', 'street', 'lane', 'alley', 'path', 'freeway', 'highway', 'tunnel', 'crossing', 'roundabout',
  'city', 'town', 'village', 'hamlet', 'suburb', 'downtown', 'plaza', 'square', 'market', 'bazaar',
  'park', 'zoo', 'farm', 'ranch', 'orchard', 'vineyard', 'stable', 'barn', 'silo', 'shed',
  'big', 'small', 'tall', 'short', 'long', 'wide', 'narrow', 'deep', 'shallow', 'thick',
  'quick', 'slow', 'hasty', 'brisk', 'lazy', 'idle', 'still', 'calm', 'plod', 'dawdle',
  'bright', 'dim', 'vivid', 'pale', 'grand', 'lush', 'barren', 'fertile', 'dense', 'sparse',
  'hot', 'cold', 'warm', 'cool', 'chilly', 'frosty', 'icy', 'soggy', 'humid', 'balmy',
  'happy', 'sad', 'glad', 'merry', 'jolly', 'gloomy', 'grumpy', 'cranky', 'moody', 'tense',
  'kind', 'cruel', 'gentle', 'harsh', 'strict', 'stern', 'firm', 'lenient', 'tender', 'tough',
  'bold', 'daring', 'meek', 'timid', 'shy', 'proud', 'humble', 'vain', 'smug', 'wry',
  'smart', 'clever', 'witty', 'wise', 'dull', 'blank', 'bleak', 'stark', 'plain', 'sheer',
  'loud', 'quiet', 'soft', 'shrill', 'mute', 'deaf', 'hoarse', 'raspy', 'crisp', 'clear',
  'sweet', 'sour', 'bitter', 'salty', 'spicy', 'bland', 'stale', 'fresh', 'ripe', 'zesty',
  'clean', 'dirty', 'messy', 'neat', 'tidy', 'dusty', 'muddy', 'rusty', 'slick', 'smooth',
  'heavy', 'light', 'bulky', 'airy', 'solid', 'hollow', 'sturdy', 'loose', 'tight', 'slack',
  'new', 'old', 'young', 'aged', 'ancient', 'modern', 'retro', 'classic', 'vintage', 'rare',
  'true', 'false', 'real', 'fake', 'genuine', 'bogus', 'valid', 'null', 'sole', 'lone',
  'only', 'mere', 'first', 'last', 'next', 'prior', 'final', 'total', 'utter', 'entire',
  'make', 'fetch', 'put', 'set', 'lay', 'place', 'situate', 'station', 'post', 'plant',
  'go', 'come', 'leave', 'arrive', 'depart', 'enter', 'exit', 'cross', 'pass', 'travel',
  'sit', 'stand', 'kneel', 'bow', 'lean', 'rest', 'sleep', 'nap', 'doze', 'yawn',
  'stretch', 'wash', 'rinse', 'scrub', 'soak', 'dry', 'wipe', 'polish', 'sweep', 'mop',
  'dust', 'trim', 'prune', 'clip', 'snip', 'shear', 'shave', 'peel', 'core', 'pit',
  'zest', 'grind',
];

export const WORD_BANK = [...THEMED, ...GENERAL];

// Words withheld from reshuffles so cycle boundaries never repeat recent text.
const RESERVE = 150;

function shuffled(words, exclude) {
  const pool = exclude && exclude.size ? words.filter((w) => !exclude.has(w)) : words.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// A match-level deck: draws never repeat until the bank cycles, and the
// reshuffle excludes recently used words so consecutive turns stay fresh.
export function createWordDeck(words = WORD_BANK) {
  let queue = [];
  let recent = [];
  const refill = () => {
    queue = shuffled(words, new Set(recent.slice(-RESERVE)));
  };
  refill();
  return {
    draw(count) {
      const out = [];
      while (out.length < count) {
        if (queue.length === 0) refill();
        const w = queue.pop();
        if (out.length > 0 && w === out[out.length - 1] && queue.length > 0) {
          queue.unshift(w);
          continue;
        }
        out.push(w);
        recent.push(w);
      }
      return out;
    },
    reset() {
      recent = [];
      refill();
    },
  };
}
