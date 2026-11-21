// The words for the story pages (/stories/<id>/), meditation pages (/meditations/<id>/) and
// guides (/guides/<slug>/). Plain data only; paragraphs are HTML. Story openings and meditation
// words come from scripts.json (copied from the app's narration scripts).
import type { QA, Section } from './library';

export type GuidedPage = {
  id: string;
  title: string;
  description: string;
  /** What happens, in a few short paragraphs, without giving the ending away. */
  about: string[];
  /** Who it suits. */
  forWho: string;
  faq: QA[];
};

export const STORY_PAGES: GuidedPage[] = [
  {
    id: 'lighthouse-keeper',
    title: 'The Lighthouse Keeper: a sleep story by the sea | Sleep Moore',
    description: 'A 45-minute sleep story: one quiet night minding a lighthouse while the keeper is ashore, read by one calm voice over the sound of the sea. Read and hear how it begins, free.',
    about: [
      'The keeper has gone ashore for the night and left you the cottage, the kettle and the light. Nothing goes wrong. You make tea, climb the stairs, tend the lamp, and watch the beam sweep the water while the rain comes and goes.',
      'The story is read slowly, with long pauses, over a real recording of the sea. When the voice ends the sea carries on and fades, so there is no jolt of silence.',
    ],
    forWho: 'For anyone who likes weather on the window and a small, safe task to fall asleep in the middle of.',
    faq: [
      { q: 'How long is The Lighthouse Keeper?', a: 'The narration runs about 27 minutes, and the whole journey, with the sea carrying on after the voice, about 45 minutes.' },
      { q: 'Is The Lighthouse Keeper free?', a: 'Yes. Every story in Sleep Moore at launch is free, with no account.' },
    ],
  },
  {
    id: 'night-ferry',
    title: 'The Night Ferry: a sleep story on a still lake | Sleep Moore',
    description: 'A 35-minute sleep story: a slow night ferry across a still lake under the stars, in a berth by a round window, read over the sound of water on the hull. Hear the opening free.',
    about: [
      'A small white ferry leaves the pier at night with you in a berth by a round window. The engine hums, the water talks along the hull, and the far shore slides by in the dark.',
      'Read slowly by one calm voice over a real recording of small waves along a hull. After the story the water carries on and fades.',
    ],
    forWho: 'For people who sleep well on boats and trains, and for nights when a gentle sense of moving on helps.',
    faq: [
      { q: 'How long is The Night Ferry?', a: 'About 9 minutes of narration, then the sound of the water carries on, around 35 minutes in all.' },
      { q: 'Is The Night Ferry free?', a: 'Yes. Every story in Sleep Moore at launch is free, with no account.' },
    ],
  },
  {
    id: 'midnight-express',
    title: 'The Midnight Express: a night train sleep story | Sleep Moore',
    description: 'A 35-minute sleep story aboard an overnight sleeper train through the mountains, read by one calm voice over the rhythm of the wheels. Read and hear how it begins, free.',
    about: [
      'An old sleeper train pulls out of an almost empty station. You have a small walnut-panelled compartment, a red armchair, a blanket and a hot drink, and the mountains go by in the dark.',
      'The narration is read over a real recording of a train carriage, the wheels meeting each joint in the rail. When the voice ends, the train keeps going.',
    ],
    forWho: 'For anyone who has ever slept better on a train than at home.',
    faq: [
      { q: 'How long is The Midnight Express?', a: 'About 9 minutes of narration, then the train carries on, around 35 minutes in all.' },
      { q: 'Can I just listen to the train without the story?', a: 'Yes. <a href="/sounds/train/">Train sounds for sleep</a> plays the same carriage recording on its own.' },
    ],
  },
];

export const MEDITATION_PAGES: GuidedPage[] = [
  {
    id: 'two-minute-method',
    title: 'The two-minute method: fall asleep fast, guided | Sleep Moore',
    description: 'A free 7-minute guided version of the "military method" for falling asleep: relax the body part by part, then still the mind. Every word, how it works, and how to practise it.',
    about: [
      'This is our guided version of the technique often called the <b>military method</b>. It was popularised by <i>Relax and Win</i>, a 1981 book by the coach Lloyd Bud Winter, which says US Navy pilots learned to fall asleep in two minutes with it after a few weeks of practice.',
      'The steps are simple: relax the face, drop the shoulders, let the arms go heavy, breathe out and let the chest settle, relax the legs, then quiet the mind with a calm picture or a repeated phrase. <a href="/guides/military-method/">More on the method and what is known about it</a>.',
    ],
    forWho: 'For nights when your body is tired but you cannot switch off, and for practising until the steps happen by themselves.',
    faq: [
      { q: 'Does the military method really work in two minutes?', a: 'The two-minute figure comes from the book, not from a clinical trial, and the book says it took weeks of practice. Progressive relaxation itself is a well-established part of sleep therapy. Most people find it helps; few manage two minutes on the first night.' },
      { q: 'How long is this meditation?', a: 'About 7 minutes of guidance. In the app a soft pad plays on after the voice ends, then fades.' },
    ],
  },
  {
    id: 'soften-head-to-toe',
    title: 'Body scan for sleep: Soften, Head to Toe (11 min) | Sleep Moore',
    description: 'A free 11-minute guided body scan for sleep: a slow wave of warmth through the whole body, from the crown to the toes. Read every word and hear the first minutes.',
    about: [
      'A classic body scan, done slowly. Your attention travels from the top of your head to the tips of your toes, and each part is invited to soften as warmth reaches it. There is nothing to do well; you only notice and let go.',
    ],
    forWho: 'For physical tension at bedtime: tight shoulders, a clenched jaw, restless legs.',
    faq: [
      { q: 'What is a body scan meditation?', a: 'Moving your attention slowly through the body, part by part, noticing and relaxing each one. It is part of many relaxation and mindfulness programmes and is widely used at bedtime.' },
      { q: 'How long is it?', a: 'About 11 minutes of guidance. In the app a soft pad plays on after the voice ends, then fades.' },
    ],
  },
  {
    id: 'let-the-day-go',
    title: 'Sleep meditation for racing thoughts | Sleep Moore',
    description: 'A free 9-minute guided meditation for a busy mind at bedtime: set each thought on a leaf and let the stream carry it away. Read every word and hear the first minutes.',
    about: [
      'Built on a well-known exercise from Acceptance and Commitment Therapy, <i>leaves on a stream</i>. You picture a quiet stream at dusk, and each time a thought arrives you set it on a leaf and watch the water carry it off. You do not argue with the thought or chase it. You just let it go downstream.',
    ],
    forWho: 'For when your mind replays the day or rehearses tomorrow the moment the light goes off.',
    faq: [
      { q: 'What should I do if the same thought keeps coming back?', a: 'Put it on another leaf. Thoughts returning is normal and not a sign that it is not working. Each time you set one down, you practise not following it.' },
      { q: 'How long is it?', a: 'About 9 minutes of guidance, then the pad plays on and fades.' },
    ],
  },
  {
    id: 'back-to-sleep',
    title: 'Woke up at 3am? A meditation to get back to sleep | Sleep Moore',
    description: 'A free 8-minute guided meditation for waking in the night: slow the breath, count down, and drift back to sleep without checking the time. Read every word and hear the first minutes.',
    about: [
      'For the middle of the night. It begins by telling you that waking is normal and the night is not lost, then slows your breathing to a count of four in and six out, softens the body, and counts you down.',
      'It is read slowly and quietly, so it does not wake you further.',
    ],
    forWho: 'For waking at two, three or four in the morning with a busy head.',
    faq: [
      { q: 'Should I look at the clock when I wake in the night?', a: 'Try not to. Working out how much sleep is left tends to wake the mind up. Start the meditation without checking the time.' },
      { q: 'Why breathe out for longer than in?', a: 'A slow breath with a longer exhale is one of the simplest ways to calm the body, and it is used in many relaxation methods.' },
    ],
  },
  {
    id: 'yoga-nidra',
    title: 'Yoga Nidra for sleep: free 19-minute guided session | Sleep Moore',
    description: 'A free 19-minute Yoga Nidra for sleep: an intention, a slow journey around the body, and the breath counted down. What Yoga Nidra is, every word of the practice, and the first minutes.',
    about: [
      'Yoga Nidra, "yogic sleep", is a guided practice of lying still and following a voice around the body. Its modern form was set out by Swami Satyananda Saraswati in the 1970s. More recently it has also been called NSDR, non-sleep deep rest.',
      'Ours follows the traditional shape: settling, listening to sounds near and far, an intention (sankalpa) said three times, a rotation of awareness through the body, breath counting, and then rest. You can fall asleep at any point; that is fine.',
    ],
    forWho: 'For the deepest rest when you have twenty minutes, at bedtime or in the afternoon.',
    faq: [
      { q: 'Is Yoga Nidra the same as NSDR?', a: 'NSDR (non-sleep deep rest) is a newer, secular name for practices like Yoga Nidra. The structure is much the same: lying still and following guided attention around the body.' },
      { q: 'Is it OK to fall asleep during Yoga Nidra?', a: 'Yes. At bedtime that is the point. In a daytime session, try to stay just awake.' },
    ],
  },
];

/** Guides (/guides/<slug>/): honest answers to the questions people ask about sleep sounds. */
export type Guide = {
  slug: string;
  h1: string;
  /** Shorter name for cards and lists. */
  short: string;
  title: string;
  description: string;
  /** The answer in two or three sentences, first, so people and AI assistants get it at once. */
  answer: string;
  sections: Section[];
  faq: QA[];
  related: { href: string; label: string }[];
  updated: string;
};

export const GUIDES: Guide[] = [
  {
    slug: 'brown-pink-white-green-noise',
    h1: 'Brown, pink, white and green noise: what is the difference?',
    short: 'Brown, pink, white and green noise compared',
    title: 'Brown vs pink vs white vs green noise for sleep | Sleep Moore',
    description: 'Brown, pink, white and green noise compared: how each one sounds, what it masks best, and which to choose for sleep. Play all four in your browser to hear the difference.',
    answer: 'They are all random noise with the energy spread differently. White noise is even across every frequency and sounds like a hiss. Pink noise falls off gently and sounds like steady rain. Brown noise falls off steeply and sounds like a deep rumble. Green noise keeps only the middle and sounds like wind in trees. For sleep, most people prefer pink or brown.',
    sections: [
      {
        h: 'The four colours at a glance',
        p: [],
        list: [
          '<b><a href="/sounds/white-noise/">White noise</a></b>: equal energy at every frequency. Bright and hissy, like a detuned radio. Best at masking high sounds such as voices and birds.',
          '<b><a href="/sounds/pink-noise/">Pink noise</a></b>: equal energy in every octave, about 3 decibels quieter per octave up. Balanced, like steady rain or surf. A good all-rounder.',
          '<b><a href="/sounds/brown-noise/">Brown noise</a></b>: about 6 decibels quieter per octave up. Deep and soft, like a distant waterfall. Best at masking low sounds such as traffic and footsteps.',
          '<b><a href="/sounds/green-noise/">Green noise</a></b>: the middle of the range only, without deep bass or high hiss. Airy, like wind through trees. Not a technical standard.',
        ],
      },
      {
        h: 'Why the names are colours',
        p: [
          'The names borrow from light. White light has every colour in equal measure, so noise with every frequency in equal measure is white. Pink light leans towards red, the low end of the spectrum, and so does pink noise. Brown noise is named after the botanist Robert Brown and <i>Brownian motion</i>, not the colour, and is also called red noise. Green noise is a newer, informal name.',
        ],
      },
      {
        h: 'Which one should you use?',
        p: [
          'Choose by what you are trying to cover and what you can stand to hear for hours. If voices or a partner’s snoring wake you, white or pink. If it is traffic, a lift or a neighbour’s bass, brown. If you simply find silence hard, pick whichever you stop noticing fastest.',
          'The colour matters less than the volume and placement. Keep it low, across the room, and steady all night if noise wakes you later on. <a href="/guides/how-loud-sleep-sounds/">How loud sleep sounds should be</a>.',
        ],
      },
      {
        h: 'Does one colour improve sleep more than another?',
        p: [
          'Not in any proven way. Pink noise has the most research behind it, but those studies used short bursts timed to deep-sleep brain waves in a lab, not a steady sound from a speaker. A 2021 systematic review found the overall evidence that continuous noise improves sleep was of low quality. What all of them do is mask other sounds. <a href="/guides/do-sleep-sounds-help/">What the research says</a>.',
        ],
      },
    ],
    faq: [
      { q: 'Which noise colour is best for sleep?', a: 'There is no single best. Most people find pink or brown noise more pleasant than white because they have less hiss. Pick the one you stop noticing first, at a low volume.' },
      { q: 'Is brown noise just deeper white noise?', a: 'In effect, yes: the same kind of random signal with much less energy in the high frequencies, so it sounds like a rumble instead of a hiss.' },
      { q: 'Is green noise a real thing?', a: 'It is a real sound but an informal name, for noise concentrated in the middle frequencies. Unlike white, pink and brown noise, it has no standard definition.' },
    ],
    related: [{ href: '/sounds/brown-noise/', label: 'Play brown noise' }, { href: '/sounds/pink-noise/', label: 'Play pink noise' }, { href: '/sounds/white-noise/', label: 'Play white noise' }, { href: '/sounds/green-noise/', label: 'Play green noise' }],
    updated: '2026-11-21',
  },
  {
    slug: 'do-sleep-sounds-help',
    h1: 'Do sleep sounds actually help you sleep?',
    short: 'Do sleep sounds actually help?',
    title: 'Do sleep sounds help you sleep? What research says | Sleep Moore',
    description: 'An honest answer: what the research on white noise and sleep sounds shows, what it does not, and who sleep sounds help most. From the makers of a sleep sounds app, without the hype.',
    answer: 'They reliably help in one way: masking the sudden noises that wake you or keep you up. Beyond that the evidence is thin. A 2021 systematic review found the research that steady noise improves sleep was of low quality. If noise disturbs your nights, sleep sounds are worth trying; if your room is already quiet, they help mostly by being a calm routine.',
    sections: [
      {
        h: 'What sleep sounds do well: masking',
        p: [
          'You are woken less by how loud a room is than by changes in it: a door, a car, a cough. A steady sound raises the background, so those changes stand out less. This is called sound masking, and it is well understood. It is why offices and hotels use it.',
        ],
      },
      {
        h: 'What the research says',
        p: [
          'A 2021 systematic review in <i>Sleep Medicine Reviews</i> looked at the studies of continuous noise as a sleep aid and found the evidence was of very low quality: small studies, short ones, and mixed results. Some found people fell asleep faster with white noise, especially in noisy places like hospitals; others found no difference.',
          'Pink noise gets the most excitement, but the best-known studies played short bursts timed to deep-sleep brain waves using sensors on the head, which is not what a phone speaker does. <a href="/guides/brown-pink-white-green-noise/">More on the noise colours</a>.',
          'Nature sounds such as <a href="/sounds/rain/">rain</a> and <a href="/sounds/ocean-waves/">waves</a> mask noise like any steady sound, and many people simply find them pleasant. That is not nothing: a calm, familiar sound is a good signal that the day is over.',
        ],
      },
      {
        h: 'Who they help most',
        p: [],
        list: [
          'People who live with noise: traffic, neighbours, a snoring partner, a city at night.',
          'People who sleep somewhere new: hotels, travel, a new flat.',
          'People who find silence uncomfortable or who replay the day when it is quiet. A <a href="/stories/lighthouse-keeper/">sleep story</a> or a <a href="/meditations/let-the-day-go/">meditation</a> can do more here than noise.',
        ],
      },
      {
        h: 'When to talk to someone',
        p: [
          'If you regularly struggle to sleep for more than a few weeks, talk to a doctor. The best-supported treatment for long-term insomnia is cognitive behavioural therapy for insomnia (CBT-I), not sounds. Sleep sounds are a comfort and a mask, not a cure.',
        ],
      },
    ],
    faq: [
      { q: 'Is it bad to sleep with sound on every night?', a: 'There is no good evidence of harm at low volume. Keep it below conversation level, across the room, and you can use it every night.' },
      { q: 'Do sleep sounds work for insomnia?', a: 'They can help you fall asleep in a noisy room, but they do not treat insomnia. For long-term insomnia, CBT-I is the recommended first treatment.' },
    ],
    related: [{ href: '/guides/how-loud-sleep-sounds/', label: 'How loud should sleep sounds be?' }, { href: '/sounds/rain/', label: 'Play rain sounds' }, { href: '/sounds/brown-noise/', label: 'Play brown noise' }],
    updated: '2026-11-21',
  },
  {
    slug: 'how-loud-sleep-sounds',
    h1: 'How loud should sleep sounds be?',
    short: 'How loud should sleep sounds be?',
    title: 'How loud should white noise and sleep sounds be? | Sleep Moore',
    description: 'How loud to play white noise and sleep sounds: quieter than conversation, across the room, just loud enough to cover what wakes you. Simple checks without a meter, and advice for babies.',
    answer: 'Quieter than you think. Aim for about the level of a quiet conversation or softer, roughly 40 to 50 decibels where you lie, and only as loud as it takes to cover the noise that wakes you. Put the speaker across the room, not by your ear.',
    sections: [
      {
        h: 'A simple check without a meter',
        p: [],
        list: [
          'Lie down and turn the sound up until the noise you want to cover (traffic, a neighbour) blends into it. Stop there.',
          'You should still be able to talk to someone in the room without raising your voice.',
          'If you notice it after ten minutes, it is too loud. A good sleep sound disappears.',
        ],
      },
      {
        h: 'Why it matters',
        p: [
          'Hearing damage comes from loud sound over long periods, and a night is a long period. Workplace limits start at 85 decibels over eight hours; at night you want to be far below that, well under the level of normal speech.',
          'Louder also does not mask better beyond a point. What matters is filling the gaps in the silence, not drowning the room.',
        ],
      },
      {
        h: 'For babies and children',
        p: [
          'Be extra careful. A 2014 study in <i>Pediatrics</i> tested infant sleep machines and found some could exceed 85 decibels at full volume when placed close to a crib. Keep the speaker well away from the cot, the volume low, and consider a timer.',
        ],
      },
      {
        h: 'Where to put the speaker',
        p: [
          'Across the room is better than on the pillow. Sound spreads more evenly, the level at your ear is lower, and it masks noise from the door or window it sits between. If you share a bed, put it on the side of the person who wakes more easily.',
          'Phone speakers struggle with low sounds, so people turn them up to compensate. A small bedside speaker at a lower volume sounds fuller and is kinder to your ears.',
        ],
      },
      {
        h: 'Which sounds are easiest to keep quiet',
        p: [
          '<a href="/sounds/brown-noise/">Brown noise</a> and <a href="/sounds/rain/">rain</a> mask well at low volume because their energy is in the lower frequencies. <a href="/sounds/white-noise/">White noise</a> is bright, so it is easy to play louder than you need.',
        ],
      },
    ],
    faq: [
      { q: 'Is 50 decibels too loud for sleep?', a: 'About 50 decibels where you lie is a sensible upper limit for an all-night sound. Quieter is better if it still covers the noise.' },
      { q: 'Should I use headphones to sleep?', a: 'Soft sleep headphones are fine at low volume. Keep the volume lower than with a speaker, because the sound is right at your ear.' },
    ],
    related: [{ href: '/guides/sleep-timer-or-all-night/', label: 'Sleep timer or all night?' }, { href: '/sounds/brown-noise/', label: 'Play brown noise' }],
    updated: '2026-11-21',
  },
  {
    slug: 'sleep-timer-or-all-night',
    h1: 'Sleep timer or all night: which is better?',
    short: 'Sleep timer or all night?',
    title: 'Sleep sounds all night or on a timer? How to choose | Sleep Moore',
    description: 'Should sleep sounds play all night or stop on a timer? If noise wakes you, all night. If you only need help falling asleep, a 30 to 60 minute timer that fades slowly. How to choose.',
    answer: 'It depends on why you use them. If noise wakes you during the night, play the sound all night, because a timer stops the masking just when you need it. If you only need help falling asleep, a 30 to 60 minute timer with a slow fade is enough.',
    sections: [
      {
        h: 'All night: when noise is the problem',
        p: [
          'Traffic at five, a partner who snores, a neighbour who gets up early: these happen after you have fallen asleep, so the mask needs to still be there. A sudden stop in the middle of the night can even wake light sleepers. Play it quietly and let it run.',
        ],
      },
      {
        h: 'A timer: when falling asleep is the problem',
        p: [
          'If your room is quiet and you use sound to stop your mind wandering, you do not need it once you are asleep. A 30 to 60 minute timer covers most nights with room to spare.',
          'The fade matters. A sound that stops dead is a change, and changes wake people. Sleep Moore fades out slowly, the sharper sounds first, then the rest.',
        ],
      },
      {
        h: 'A middle way: fade low, not to nothing',
        p: [
          'If you want help falling asleep and some cover later on, play the sound all night but quietly, or set a long timer. A sound that drops to a low level and stays there keeps masking without filling the room.',
          'Whatever you choose, keep the same routine for a week before judging it. A new sound can be noticeable for the first night or two and then disappears into the background.',
        ],
      },
      {
        h: 'Stories and meditations',
        p: [
          'Guided sessions end by themselves. In Sleep Moore the background sound carries on after the voice and then fades, so there is no sudden silence. Try <a href="/meditations/back-to-sleep/">Back to Sleep</a> if you wake in the night.',
        ],
      },
    ],
    faq: [
      { q: 'What is the best sleep timer length?', a: '45 minutes is a good default. Use 30 if you fall asleep quickly, an hour if you take a while.' },
      { q: 'Will a sound stopping wake me up?', a: 'A sudden stop can wake light sleepers, because the change is what the brain notices. That is why a slow fade matters. Sleep Moore fades the sharper sounds first and the rest over several minutes.' },
      { q: 'Is it bad to leave sleep sounds on all night?', a: 'Not at a low volume. Keep it below conversation level and across the room.' },
    ],
    related: [{ href: '/guides/how-loud-sleep-sounds/', label: 'How loud should sleep sounds be?' }, { href: '/sounds/rain/', label: 'Play rain sounds' }],
    updated: '2026-11-21',
  },
  {
    slug: 'military-method',
    h1: 'The military method: can you fall asleep in two minutes?',
    short: 'The military method for falling asleep',
    title: 'Military method for falling asleep: does it work? | Sleep Moore',
    description: 'The "military method" for falling asleep in two minutes: where it comes from, the steps, what the evidence says, and a free guided version to follow tonight.',
    answer: 'The military method is a relax-the-body, quiet-the-mind routine popularised by the 1981 book Relax and Win. You relax your face, shoulders, arms, chest and legs in turn, then clear your mind for about ten seconds. The two-minute claim comes from the book and has not been tested in a trial, but the technique is a sound form of progressive relaxation and helps many people with practice.',
    sections: [
      {
        h: 'Where it comes from',
        p: [
          'The method is usually traced to <i>Relax and Win: Championship Performance</i> by Lloyd Bud Winter, a coach who worked with US Navy pilots during the Second World War. The book says that after six weeks of practice almost all of the pilots could fall asleep within two minutes, even sitting up, with noise around them.',
        ],
      },
      {
        h: 'The steps',
        p: [],
        list: [
          'Relax your whole face: forehead, eyes, jaw, tongue.',
          'Drop your shoulders as low as they will go, then let each arm go heavy, one side at a time.',
          'Breathe out and let your chest settle.',
          'Relax your legs: thighs, then calves, then feet.',
          'Clear your mind for about ten seconds. Picture lying in a canoe on a calm lake under a clear sky, or repeat "don’t think" slowly to yourself.',
        ],
      },
      {
        h: 'Does it work?',
        p: [
          'No clinical trial has tested the military method itself, so the two-minute claim is the book’s, not science’s. But its parts are well supported: progressive muscle relaxation and calm imagery are long-standing parts of sleep therapy. The honest version is that it helps many people relax enough to sleep, and that it gets faster with practice. Expect weeks, not one night.',
        ],
      },
      {
        h: 'Try it guided',
        p: [
          'Following the steps from memory while trying to sleep is hard. <a href="/meditations/two-minute-method/">The Two-Minute Method</a> is a free 7-minute guided version, read slowly by one calm voice, ending in a boat on a still lake.',
        ],
      },
    ],
    faq: [
      { q: 'Can you really fall asleep in two minutes?', a: 'Some people can after weeks of practice, but no trial shows that most people do. Treat two minutes as a goal, not a promise.' },
      { q: 'Why is it called the military method?', a: 'Because the book that popularised it described teaching it to US Navy pilots in the Second World War.' },
    ],
    related: [{ href: '/meditations/two-minute-method/', label: 'The Two-Minute Method, guided' }, { href: '/meditations/soften-head-to-toe/', label: 'A body scan for sleep' }],
    updated: '2026-11-21',
  },
];
export const GUIDES_BY_SLUG: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));
