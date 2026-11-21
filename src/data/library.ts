// The words for the sound pages (/sounds/<slug>/), story pages, meditation pages and guides.
// Plain data only. Paragraphs are HTML (links allowed); structured data strips the tags.
// Keep claims honest: say what the research shows and what it does not.

export type Section = { h: string; p: string[]; list?: string[] };
export type QA = { q: string; a: string };

export type SoundPage = {
  /** URL slug; the mix is `sound-<slug>` in worlds.ts. */
  slug: string;
  /** Square art in src/assets/tiles/<tile>.jpg (the app's sound tile). */
  tile: string;
  tileAlt: string;
  /** Small label above the name. */
  cap: string;
  /** The page heading, what people type. */
  h1: string;
  title: string;
  description: string;
  /** One line under the heading. */
  line: string;
  /** Quick facts shown as chips in the hero. */
  chips: string[];
  sections: Section[];
  faq: QA[];
  /** Other sound pages to suggest. */
  related: string[];
  /** Worlds that use this sound. */
  worlds: string[];
};

const VOLUME = 'Keep it low: about as loud as a quiet conversation, or softer. It only has to cover the sounds that would wake you, not fill the room.';

export const SOUND_PAGES: SoundPage[] = [
  {
    slug: 'rain',
    tile: 'rain',
    tileAlt: 'Raindrops falling into a dark puddle, lit gold',
    cap: 'Nature sound',
    h1: 'Rain sounds for sleep',
    title: 'Rain sounds for sleep: free, play in your browser | Sleep Moore',
    description: 'Free rain sounds for sleep, recorded for real and looped without a seam. Play steady rain here, add heavier rain or far-off thunder, and set a timer to fade it out.',
    line: 'Steady rain on a roof and leaves, recorded for real and looped with no seam to wake you.',
    chips: ['Real recording', 'Seamless loop', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'This is a real recording of steady rain falling on a roof and the leaves around it, not a synthesised hiss. We remastered it into a loop and crossfaded the end into the start, so there is no click or gap every thirty seconds for your ear to catch on.',
          'Use the faders to make it your own. Bring up <b>heavy rain</b> for a downpour, or add <b>thunder</b> rolling somewhere far off. Everything stays in your browser; nothing to install to try it.',
        ],
      },
      {
        h: 'Why rain helps people sleep',
        p: [
          'Rain is steady without being still. It covers the sudden sounds that wake you, a car door, a neighbour, a creaking floor, because a quiet room makes every small noise stand out and a constant sound blurs the edges of it. That is called masking, and it is the main thing any sleep sound does.',
          'Rain also has most of its energy in the lower and middle frequencies, much like <a href="/sounds/pink-noise/">pink noise</a>, so it sounds soft rather than hissy. And for most people it simply means being indoors, warm and dry, while the weather happens somewhere else.',
          'To be straight with you: the research on sleep sounds is thinner than the apps suggest. A 2021 review in <i>Sleep Medicine Reviews</i> found the evidence that steady noise improves sleep was of low quality. What it reliably does is mask noise. If your nights are interrupted by sound, that matters a lot. <a href="/guides/do-sleep-sounds-help/">More on what the research says</a>.',
        ],
      },
      {
        h: 'How to use it tonight',
        p: [VOLUME, 'Put the phone or speaker across the room rather than by your ear, set a sleep timer of 30 to 60 minutes if you only need help falling asleep, or leave it all night if noise wakes you later on.'],
      },
    ],
    faq: [
      { q: 'Is it better to sleep with rain sounds on all night?', a: 'If sounds wake you during the night, all night is better, because a timer stops the masking just when you might need it. If you only struggle to fall asleep, a 30 to 60 minute timer that fades out slowly is enough. <a href="/guides/sleep-timer-or-all-night/">How to choose</a>.' },
      { q: 'Are these real rain recordings?', a: 'Yes. Every nature sound in Sleep Moore is a real recording, either our own or released into the public domain, remastered into a seamless loop.' },
      { q: 'Rain or white noise: which is better for sleep?', a: 'Both mask noise. Rain is softer and less hissy because its energy sits lower, which most people find easier to fall asleep to. White noise masks high-pitched sounds slightly better. Try both here and keep the one you stop noticing first.' },
    ],
    related: ['thunderstorm', 'pink-noise', 'fireplace'],
    worlds: ['rainy-cabin', 'rainfall-sanctuary'],
  },
  {
    slug: 'thunderstorm',
    tile: 'rain-storm',
    tileAlt: 'Rain running down a window, lightning beyond the glass',
    cap: 'Nature sound',
    h1: 'Thunderstorm sounds for sleep',
    title: 'Thunderstorm sounds for sleep: rain and thunder | Sleep Moore',
    description: 'Free thunderstorm sounds for sleep: rain on the glass with thunder rolling far off, never close enough to startle. Real recordings, mixed live in your browser.',
    line: 'Rain on the glass and thunder rolling far off, never close enough to make you jump.',
    chips: ['Real recordings', 'No sudden cracks', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'Two recordings play together: rain against a window with a storm passing, and low thunder rolling a long way away. We left out the sharp, close cracks on purpose. A thunderstorm for sleep should feel like weather outside, not something happening to you.',
          'Turn the thunder down if it is too much, or bring in <b>wind</b> for a wilder night.',
        ],
      },
      {
        h: 'Why storms are so easy to sleep to',
        p: [
          'Steady rain masks small noises, and distant thunder gives the ear something slow and deep that never asks for attention. Many people also link storms with being safe indoors, which makes it easier to let go.',
          'If you find thunder exciting rather than calming, start with <a href="/sounds/rain/">plain rain</a> and add thunder later, quietly.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Storm far off:</b> storm 60%, thunder 30%, wind off. The calmest version, mostly rain.", "<b>Wild night:</b> storm 70%, thunder 55%, wind 35%. Weather you are glad to be inside from.", "<b>Summer storm:</b> keep the thunder low and add <a href=\"/sounds/fan/\">a fan</a> in the app, like a warm night with the window open."] },
      { h: 'How to use it tonight', p: [VOLUME, 'Thunder has the most low end of any sound here, so small phone speakers will lose some of it. A pillow speaker or a small bedside speaker gives it its weight.'] },
    ],
    faq: [
      { q: 'Will the thunder wake me up?', a: 'It is recorded far away and levelled so there are no sudden peaks. If you are sensitive to it, lower the thunder fader and keep the rain up.' },
      { q: 'Are thunderstorm sounds good for anxiety at night?', a: 'Some people find them very calming and some do not. They are not a treatment for anxiety, but a steady, familiar sound can make the room feel less empty. If storms make you uneasy, try <a href="/sounds/rain/">rain</a> or <a href="/sounds/brown-noise/">brown noise</a> instead.' },
      { q: "Why do thunderstorms make me sleepy?", a: "Rain gives a steady sound that hides small noises, thunder is slow and low, and a storm usually means staying indoors. Together they tell the body there is nothing to do but rest." },
    ],
    related: ['rain', 'brown-noise', 'ocean-waves'],
    worlds: ['rainfall-sanctuary'],
  },
  {
    slug: 'ocean-waves',
    tile: 'ocean',
    tileAlt: 'A teal ocean wave curling over, lit against a dark sky',
    cap: 'Nature sound',
    h1: 'Ocean waves for sleep',
    title: 'Ocean wave sounds for sleep: real surf, free | Sleep Moore',
    description: 'Free ocean wave sounds for sleep: slow surf folding onto sand, recorded for real and looped without a seam. Add a sea breeze or palms and set a timer to fade it out.',
    line: 'Slow waves folding onto sand. The tide does the breathing for you.',
    chips: ['Real recording', 'Seamless loop', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'A real recording of small waves on a sandy beach, slow and regular. Add <b>wind</b> for a breeze off the water or <b>palms</b> for the fronds overhead, and it becomes our <a href="/worlds/ocean-hideaway/">Ocean Hideaway</a>.',
        ],
      },
      {
        h: 'Why waves help',
        p: [
          'Surf rises and falls every few seconds, slower than your breathing. Many people find their breath settles towards it without trying, which is the same idea behind slow-breathing exercises. The sound also masks noise from outside, like any steady sound.',
          'Unlike rain, waves come and go, so a few people find them less steady. If that is you, try <a href="/sounds/rain/">rain</a> or <a href="/sounds/pink-noise/">pink noise</a>.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Calm bay:</b> surf 70%, nothing else. The simplest, slowest version.", "<b>Sea breeze:</b> surf 75%, wind 30%. Cooler, wider, a bit more air.", "<b>Island night:</b> surf 70%, wind 20%, palms 40%. Our <a href=\"/worlds/ocean-hideaway/\">Ocean Hideaway</a> in all but name."] },
      { h: 'How to use it tonight', p: [VOLUME] },
    ],
    faq: [
      { q: 'Are ocean sounds better than white noise for sleep?', a: 'They do the same job, masking noise, in a softer way. Ocean sounds have more low end and natural movement, white noise is flatter and covers high-pitched sounds a little better. Most people prefer the ocean for falling asleep.' },
      { q: 'Can I add rain to the waves?', a: 'Yes. In the Sleep Moore app you can swap any layer for one of forty sounds, including rain, and save the mix for tomorrow night.' },
      { q: "Are ocean waves good for falling asleep quickly?", a: "Many people find the slow rise and fall easy to breathe along with, which helps them settle. Try breathing out as each wave draws back." },
      { q: "Is the ocean sound a real recording?", a: "Yes, a real recording of small waves on sand, looped so the join cannot be heard." },
    ],
    related: ['rain', 'river', 'pink-noise'],
    worlds: ['ocean-hideaway', 'moonlit-cove'],
  },
  {
    slug: 'brown-noise',
    tile: 'brown',
    tileAlt: 'Folds of warm brown velvet, softly lit',
    cap: 'Noise colour',
    h1: 'Brown noise for sleep',
    title: 'Brown noise for sleep: deep, free, play now | Sleep Moore',
    description: 'Free brown noise for sleep: a deep, soft rumble with no hiss. What brown noise is, how it differs from white and pink noise, and how loud to play it. Play it here.',
    line: 'A deep, low rumble, like a waterfall heard from the next room. All of the cover, none of the hiss.',
    chips: ['Deep and soft', 'No hiss', 'Free'],
    sections: [
      {
        h: 'What brown noise is',
        p: [
          'Brown noise is random noise with most of its energy in the low frequencies. Each octave up is about 6 decibels quieter than the one below, so it sounds like a deep rumble: a waterfall, a strong wind behind a closed window, the inside of a plane.',
          'The name has nothing to do with the colour. It comes from Robert Brown and <i>Brownian motion</i>, the random drift of tiny particles, which the signal resembles. It is also called red noise.',
        ],
      },
      {
        h: 'Why so many people sleep to it',
        p: [
          'White noise covers every frequency evenly, which our ears hear as a bright hiss. Brown noise keeps the cover low and drops the hiss, so it masks the thud of traffic, footsteps and voices through a wall without sounding harsh. A lot of people who cannot stand white noise find brown noise easy to fall asleep to.',
          'You will also see claims that brown noise helps focus or ADHD. There is very little research on brown noise specifically, so we will not make that promise. What it reliably does at night is mask other sounds. <a href="/guides/brown-pink-white-green-noise/">Brown, pink, white and green noise compared</a>.',
        ],
      },
      {
        h: 'How to use it tonight',
        p: [VOLUME, 'Brown noise is mostly bass, and phone speakers barely reproduce bass, so it can sound thin and quiet on a phone. Headphones, a pillow speaker or a small bedside speaker do it justice. Resist turning a phone all the way up instead.'],
      },
    ],
    faq: [
      { q: 'Is brown noise better than white noise for sleep?', a: 'Neither is better for everyone. Brown noise is deeper and softer and masks low sounds such as traffic and voices well; white noise is brighter and masks high sounds slightly better. Most people find brown noise easier to fall asleep to. Play both on this site and see which you stop noticing.' },
      { q: 'Is it safe to sleep with brown noise all night?', a: 'At a low volume, yes for adults. Keep it below conversation level and away from your ear. Loud sound for hours is what harms hearing, not the kind of sound.' },
      { q: 'What does brown noise sound like?', a: 'A steady, deep rumble with no rhythm: like a waterfall from a distance, heavy rain on a roof heard from inside, or a plane cabin. Press play above to hear it.' },
      { q: 'Is brown noise the same as red noise?', a: 'Yes. Both names describe noise whose power falls by about 6 decibels per octave.' },
    ],
    related: ['pink-noise', 'white-noise', 'fan'],
    worlds: [],
  },
  {
    slug: 'white-noise',
    tile: 'white',
    tileAlt: 'A cloud of tiny white sparks scattered against deep blue',
    cap: 'Noise colour',
    h1: 'White noise for sleep',
    title: 'White noise for sleep: free, play in your browser | Sleep Moore',
    description: 'Free white noise for sleep. What white noise is, how it masks sound, how loud to play it, and when pink or brown noise is a better choice. Play it here, no app needed.',
    line: 'Every frequency at once: an even hiss that covers the sounds that would wake you.',
    chips: ['Covers high sounds', 'Even and steady', 'Free'],
    sections: [
      {
        h: 'What white noise is',
        p: [
          'White noise has equal energy at every frequency, the way white light contains every colour. Because our hearing groups sound by octaves, and each octave up holds twice as many frequencies, white noise sounds bright and hissy to us: like a detuned radio or a shower running close by.',
        ],
      },
      {
        h: 'Why it works',
        p: [
          'Sleep is broken less by how loud a room is than by sudden changes in it. White noise fills in the silence so that a door, a dog or a voice stands out far less. Because it covers the high frequencies strongly, it is especially good at masking voices, birds and the high whine of electronics.',
          'If the hiss bothers you, try <a href="/sounds/pink-noise/">pink noise</a> (softer) or <a href="/sounds/brown-noise/">brown noise</a> (deepest). <a href="/guides/brown-pink-white-green-noise/">How the noise colours compare</a>.',
        ],
      },
      { h: 'How to use it tonight', p: [VOLUME, 'White noise is the easiest of all the sounds to play too loud, because it is bright. Start low and only turn it up until the noise you want to cover fades into it.'] },
    ],
    faq: [
      { q: 'Is white noise good for babies?', a: 'Many parents use it. Keep it quiet and well away from the cot: a 2014 study in <i>Pediatrics</i> found that some infant sound machines could exceed 85 decibels at full volume close up, louder than is safe for long periods. Low, distant and steady is the rule.' },
      { q: 'Should I sleep with white noise every night?', a: 'There is no known harm in using a quiet sound every night. Some people find they come to rely on it and sleep worse without it, which is only a problem if you travel without your phone.' },
      { q: 'White noise or a fan?', a: 'A fan is a kind of natural noise with more low end and a faint hum, which many people find homelier. Try the <a href="/sounds/fan/">fan</a> here and compare.' },
    ],
    related: ['pink-noise', 'brown-noise', 'fan'],
    worlds: [],
  },
  {
    slug: 'pink-noise',
    tile: 'pink',
    tileAlt: 'A swirl of soft pink smoke against deep blue',
    cap: 'Noise colour',
    h1: 'Pink noise for sleep',
    title: 'Pink noise for sleep: what it is and how to use it | Sleep Moore',
    description: 'Free pink noise for sleep: softer than white noise, like steady rain. What pink noise is, what the research on pink noise and deep sleep really found, and how to use it.',
    line: 'Softer than white noise and brighter than brown, like steady rain with no drops in it.',
    chips: ['Balanced', 'Rain-like', 'Free'],
    sections: [
      {
        h: 'What pink noise is',
        p: [
          'Pink noise has equal energy in every octave, so it sounds balanced to our ears: each step up in pitch is a little quieter (about 3 decibels per octave). The result is softer than <a href="/sounds/white-noise/">white noise</a> and brighter than <a href="/sounds/brown-noise/">brown noise</a>. Steady rain, rustling leaves and surf all sit close to pink.',
        ],
      },
      {
        h: 'Pink noise and deep sleep: what the research says',
        p: [
          'Pink noise gets the most attention in sleep research, but the studies are more specific than headlines suggest. The most cited work, such as a 2017 study at Northwestern University, played short <i>bursts</i> of pink noise timed precisely to the brain’s slow waves during deep sleep, measured with sensors on the head. In small groups of older adults that deepened slow-wave sleep and helped memory the next day.',
          'A steady pink noise from a speaker is not the same thing, and there is no good evidence it deepens sleep by itself. What it does do, like any steady sound, is mask the noises that wake you, gently. <a href="/guides/do-sleep-sounds-help/">What the research says about sleep sounds</a>.',
        ],
      },
      { h: 'How to use it tonight', p: [VOLUME] },
    ],
    faq: [
      { q: 'Is pink noise better than white noise for sleep?', a: 'Most people find it more pleasant because it has less hiss. It masks low and middle sounds well and high sounds slightly less than white noise. Try both here.' },
      { q: 'Does pink noise improve deep sleep?', a: 'Short bursts of pink noise timed to deep-sleep brain waves improved deep sleep in small lab studies. A steady pink noise played all night has not been shown to do the same. It still masks noise, which helps if sound wakes you.' },
    ],
    related: ['white-noise', 'brown-noise', 'rain'],
    worlds: [],
  },
  {
    slug: 'green-noise',
    tile: 'green',
    tileAlt: 'A green succulent rosette, softly lit',
    cap: 'Noise colour',
    h1: 'Green noise for sleep',
    title: 'Green noise for sleep: what it is, play it free | Sleep Moore',
    description: 'Free green noise for sleep: the middle of the sound spectrum, like wind through trees. What green noise is (and is not), how it compares with pink and brown noise, and how to use it.',
    line: 'The middle of the sound, with the very low and very high gently taken away. Like wind moving through trees.',
    chips: ['Mid-range', 'Gentle', 'Free'],
    sections: [
      {
        h: 'What green noise is',
        p: [
          'Green noise is noise centred on the middle frequencies, roughly where the human voice sits, with the deep rumble and the high hiss rolled off. It is sometimes described as "the sound of nature", because wind in trees and distant water sit in the same range.',
          'Unlike <a href="/sounds/white-noise/">white</a>, <a href="/sounds/pink-noise/">pink</a> and <a href="/sounds/brown-noise/">brown noise</a>, green noise has no agreed technical definition. Different apps make it differently. Ours is pink noise shaped around the middle of the range.',
        ],
      },
      {
        h: 'Who it suits',
        p: [
          'If white noise is too hissy and brown noise feels heavy or boomy, green noise sits in between. Because it covers the range of speech well, it is good for masking voices through a wall.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Just green:</b> green noise 65%. Even and airy.", "<b>Forest stream:</b> green noise 50%, water 35%. The noise fills the gaps, the stream gives it life.", "<b>Summer meadow:</b> green noise 45%, crickets 30%, for a night with the windows open."] },
      { h: 'How to use it tonight', p: [VOLUME] },
    ],
    faq: [
      { q: 'Is green noise real?', a: 'It is a real sound, but not a scientific standard like white or pink noise. The name is used for noise concentrated in the middle frequencies.' },
      { q: 'Green noise or pink noise for sleep?', a: 'They are close. Green noise drops the deep and high ends, so it sounds a little more airy and less full. Try both on this site.' },
      { q: "Does green noise help you focus?", a: "Some people use it for focus as well as sleep, because it covers voices without much hiss. There is little research on green noise specifically, so try it and see." },
      { q: "Why is it called green noise?", a: "Probably because it is said to sound like nature, and because the middle of the audible range was compared to green, the middle of the visible spectrum. The name is informal." },
    ],
    related: ['pink-noise', 'brown-noise', 'river'],
    worlds: [],
  },
  {
    slug: 'fan',
    tile: 'fan',
    tileAlt: 'A brass desk fan, lit warm against a dark blue background',
    cap: 'Home sound',
    h1: 'Fan noise for sleeping',
    title: 'Fan noise for sleeping: free, no fan needed | Sleep Moore',
    description: 'Free fan noise for sleeping: a box fan on low, steady all night, without the cold draught. Why fan noise works, and how it compares with white and brown noise. Play it here.',
    line: 'A fan on low, steady all night, without the draught.',
    chips: ['Steady hum', 'No draught', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'A real fan, recorded on a low setting: the soft rush of moving air with a faint motor hum underneath. Many people have slept with a fan on since childhood and cannot sleep in silence. This gives you the sound without the draught, the dust or the noise of one more thing in the room.',
        ],
      },
      {
        h: 'Why fan noise works',
        p: [
          'A fan is a kind of natural noise: broad like <a href="/sounds/white-noise/">white noise</a> but with more low end, closer to <a href="/sounds/brown-noise/">brown noise</a>. It masks sudden sounds the same way. And for a lot of people it is simply the sound of home, which might be the most important part.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Box fan:</b> fan 75%, nothing else.", "<b>Big old fan:</b> fan 60%, brown noise 35%. Deeper and heavier, the fan from childhood.", "<b>Warm, wet night:</b> fan 60%, rain 30%. A fan running while rain falls outside."] },
      { h: 'How to use it tonight', p: [VOLUME, 'Bring up the brown noise fader for a heavier, deeper fan, or add a little rain for a summer storm outside an open window.'] },
    ],
    faq: [
      { q: 'Is it bad to sleep with a fan on every night?', a: 'For the sound, no. A real fan can dry your eyes, nose and throat and stir up dust, which is one reason people switch to a recording.' },
      { q: 'Fan noise or white noise?', a: 'A fan is warmer and less hissy than white noise, with a low hum. Most people who grew up with a fan prefer it.' },
      { q: "Why do people need a fan to sleep?", a: "Mostly habit and masking. A fan gives a steady sound that hides other noises, and after years of sleeping with one, silence can feel wrong. A recording gives the sound without the cold air." },
      { q: "Is fan noise the same as white noise?", a: "Close, but warmer. A fan has more low end and a faint motor hum, so it sits between white and brown noise." },
    ],
    related: ['brown-noise', 'white-noise', 'train'],
    worlds: [],
  },
  {
    slug: 'fireplace',
    tile: 'fire',
    tileAlt: 'A campfire burning in a ring of stones at night',
    cap: 'Nature sound',
    h1: 'Fireplace sounds for sleep',
    title: 'Crackling fireplace sounds for sleep: free | Sleep Moore',
    description: 'Free crackling fireplace sounds for sleep: logs settling, the odd crack and hiss, with no sharp pops. Real recording; add rain on the roof or wind outside. Play it here.',
    line: 'Logs settling in the grate, the odd soft crack and hiss.',
    chips: ['Real recording', 'Softened crackle', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'A real wood fire, recorded close. We gently tamed the loudest pops so the crackle stays cosy instead of startling, and looped it without a seam. Add <b>rain</b> for a fire indoors on a wet night, which is our <a href="/worlds/rainy-cabin/">Rainy Cabin</a>, or <b>wind</b> for a cold one outside.',
        ],
      },
      {
        h: 'Why a fire is so easy to sleep to',
        p: [
          'A fire is irregular in a slow, predictable way: soft crackles with no rhythm to follow. It works best mixed with something steadier like rain, which gives the steady cover while the fire gives the warmth.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Fire alone:</b> fire 80%. Close, warm and quiet.", "<b>Rainy cabin:</b> fire 65%, rain 70%. The best-loved mix: warm inside, wet outside. It is our <a href=\"/worlds/rainy-cabin/\">Rainy Cabin</a>.", "<b>Winter lodge:</b> fire 70%, wind 30%, and add snow in the app for <a href=\"/worlds/snowfall-lodge/\">Snowfall Lodge</a>."] },
      { h: 'How to use it tonight', p: [VOLUME] },
    ],
    faq: [
      { q: 'Will the crackling wake me up?', a: 'We softened the sharpest pops. If you are a light sleeper, keep the fire lower than the rain so the crackles sit inside a steady sound.' },
      { q: "Is a crackling fire good for sleep?", a: "For many people, yes, especially mixed with a steadier sound like rain. On its own the crackle is irregular, so keep it low if you are a light sleeper." },
      { q: "Is it a real fire recording?", a: "Yes, a real wood fire recorded close, with the sharpest pops gently softened." },
    ],
    related: ['rain', 'crickets', 'train'],
    worlds: ['rainy-cabin', 'snowfall-lodge', 'desert-camp'],
  },
  {
    slug: 'train',
    tile: 'train',
    tileAlt: 'A polished brass train wheel on a rail, lit gold',
    cap: 'Journey sound',
    h1: 'Train sounds for sleep',
    title: 'Train sounds for sleep: a night sleeper carriage | Sleep Moore',
    description: 'Free train sounds for sleep: a sleeper carriage rocking steadily through the night, the wheels meeting each rail joint. Real recording, with rain on the window if you like.',
    line: 'A sleeper carriage rocking steadily on, the wheels meeting each joint in the rail.',
    chips: ['Real recording', 'Steady rhythm', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'The inside of a train at night: the low rumble of the carriage, the rhythm of the wheels over the rail joints, and nothing else. No announcements, no doors. It is the bed under our story <a href="/stories/midnight-express/">The Midnight Express</a>.',
        ],
      },
      {
        h: 'Why trains put people to sleep',
        p: [
          'A train gives a steady rumble, which masks noise, and a slow rhythm, which gives a busy mind something easy to rest on. A lot of people sleep better on trains than in hotels, and this is that sound without the ticket.',
          'There is something else, too. On a train someone else is doing the travelling. You cannot hurry it and nothing needs you until morning, which is a good frame of mind to fall asleep in. The rhythm is also slow enough that you can let your breathing settle against it without counting.',
          'If the rhythm keeps you listening instead of drifting, lower the train under a little <a href="/sounds/rain/">rain</a> so the clicks soften into the background.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Night sleeper:</b> train 75%. Just the carriage and the rails.", "<b>Rain on the window:</b> train 65%, rain 35%. A wet night through the hills.", "<b>Mountain pass:</b> train 70%, wind 25%, wind pressing on the carriage."] },
      { h: 'How to use it tonight', p: [VOLUME, 'Add rain for a wet night outside the window.'] },
    ],
    faq: [
      { q: 'Is there a sleep story with train sounds?', a: 'Yes. <a href="/stories/midnight-express/">The Midnight Express</a> is a 35-minute night journey read over this train recording. Hear the opening on its page.' },
      { q: "Why do trains help people sleep?", a: "A train carriage gives a deep, steady rumble that masks other noise, plus a slow rhythm from the rail joints that is easy to rest your attention on." },
      { q: "Is the train sound a real recording?", a: "Yes, recorded inside a moving carriage, looped without a seam." },
    ],
    related: ['fan', 'rain', 'ocean-waves'],
    worlds: [],
  },
  {
    slug: 'crickets',
    tile: 'night',
    tileAlt: 'A cricket on a blade of grass at night, fireflies behind it',
    cap: 'Nature sound',
    h1: 'Cricket sounds for sleep',
    title: 'Cricket and summer night sounds for sleep: free | Sleep Moore',
    description: 'Free cricket sounds for sleep: a warm summer night full of crickets, recorded for real. Add a stream or a breeze and set a timer to fade it out. Play it in your browser.',
    line: 'A warm night full of crickets, the window open, the day finally cooling off.',
    chips: ['Real recording', 'Summer night', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'A real summer night: crickets in the grass, near and far, with the faint air of the dark around them. Add a <b>stream</b> for water running nearby, or a <b>breeze</b>. With wind and water it becomes our <a href="/worlds/alpine-lake/">Alpine Lake</a>.',
        ],
      },
      {
        h: 'Why crickets help',
        p: [
          'Crickets sit high in pitch and chirp in a steady pulse, so they cover high sounds like a ticking clock or a whining charger. For many people they are also the sound of summer holidays and sleeping with the window open, which is a good thing to think about while falling asleep.',
          'A field of crickets is also very regular. Each one repeats its call, and hundreds together blur into a soft, shimmering wash. Light sleepers who find rain too heavy often prefer this lighter, airier sound.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Summer night:</b> crickets 75%. A warm evening with the window open.", "<b>By the water:</b> crickets 60%, water 40%. Crickets on the bank of a stream.", "<b>Lakeside:</b> crickets 55%, water 30%, wind 25%. Close to our <a href=\"/worlds/alpine-lake/\">Alpine Lake</a>."] },
      { h: 'How to use it tonight', p: [VOLUME] },
    ],
    faq: [
      { q: 'Are crickets too high-pitched to sleep to?', a: 'For some people. If so, lower them and bring up the stream, which adds a softer, lower layer underneath.' },
      { q: "Do cricket sounds help you sleep?", a: "They mask high sounds well and remind many people of warm, slow summer nights. If the pitch bothers you, keep them low under a stream." },
      { q: "Are these real crickets?", a: "Yes, a real summer night recording." },
    ],
    related: ['river', 'ocean-waves', 'fireplace'],
    worlds: ['alpine-lake', 'moonlit-cove', 'desert-camp'],
  },
  {
    slug: 'river',
    tile: 'stream',
    tileAlt: 'A small waterfall running over mossy stones',
    cap: 'Nature sound',
    h1: 'River and stream sounds for sleep',
    title: 'River and stream sounds for sleep: free | Sleep Moore',
    description: 'Free river and stream sounds for sleep: clear water running over stone, recorded for real and looped without a seam. Add crickets or a breeze. Play it here, no app needed.',
    line: 'Clear water running over stone, steady as breathing.',
    chips: ['Real recording', 'Seamless loop', 'Free'],
    sections: [
      {
        h: 'What you are hearing',
        p: [
          'A small stream running over rocks, recorded for real. Moving water is one of the steadiest sounds in nature, close to <a href="/sounds/pink-noise/">pink noise</a> but with tiny, ever-changing detail that keeps it from feeling artificial. It runs through our <a href="/worlds/temple-garden/">Temple Garden</a>.',
        ],
      },
      {
        h: 'Why running water helps',
        p: [
          'It masks noise as well as any noise colour, without sounding like a machine. Many people who find white noise too harsh are happy with a stream all night.',
          'Water over stone is never quite the same twice, but it never really changes either. That balance, detail without events, is what makes it easy to stop listening to. It also has a wide spread of frequencies, a little like <a href="/sounds/pink-noise/">pink noise</a>, so it covers both low rumbles and higher sounds.',
        ],
      },
      { h: 'Mixes to try', p: ['Use the faders beside this page, or build these in the app:'], list: ["<b>Mountain stream:</b> water 80%. Bright, quick water over stone.", "<b>Night by the river:</b> water 65%, crickets 30%. A warm night beside the bank.", "<b>Windy valley:</b> water 70%, wind 30%. Cooler and wider."] },
      { h: 'How to use it tonight', p: [VOLUME] },
    ],
    faq: [
      { q: 'Does the sound of water make you need the toilet at night?', a: 'Some people say so. If that is you, try rain or brown noise instead, which mask just as well.' },
      { q: "Is a river or stream sound good for sleep?", a: "Yes for most people. Running water is very steady, masks noise well, and has natural detail that keeps it from sounding like a machine." },
      { q: "Is it a real recording?", a: "Yes, a small stream recorded for real and looped without a seam." },
    ],
    related: ['crickets', 'rain', 'green-noise'],
    worlds: ['temple-garden', 'rainfall-sanctuary', 'alpine-lake'],
  },
];
export const SOUND_PAGES_BY_SLUG: Record<string, SoundPage> = Object.fromEntries(SOUND_PAGES.map((p) => [p.slug, p]));
