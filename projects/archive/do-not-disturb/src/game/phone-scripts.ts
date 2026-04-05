export type PhoneScript = {
  readonly lines: readonly string[];
  readonly skipOnRetry: boolean;
};

export const PHONE_SCRIPTS = {
  NIGHT_1: {
    lines: [
      '...hello? Can you hear me?',
      'Listen carefully. There\'s something in this hotel.',
      'It follows SOUND. Stay quiet. Stay alive.',
      'The front door unlocks at midnight. Be ready.',
    ],
    skipOnRetry: true,
  },
  NIGHT_2: {
    lines: [
      'You made it. Good.',
      'There\'s another one now. She cleans.',
      'Room by room, floor by floor. Predictable.',
      'The signs on the doors... she respects those.',
    ],
    skipOnRetry: true,
  },
  NIGHT_3: {
    lines: [
      'You\'re still here? I didn\'t think\u2014',
      '...something else is here. In the dark.',
      'It doesn\'t move. Not until you\'re close.',
      'Light. You need light.',
    ],
    skipOnRetry: true,
  },
  NIGHT_4: {
    lines: [
      'They\'re faster now. Can you feel it?',
      'The hotel knows you\'re learning.',
      'Don\'t get comfortable. Don\'t get slow.',
    ],
    skipOnRetry: true,
  },
  NIGHT_5: {
    lines: [
      'The hotel changed.',
      'Nothing is where it was.',
      'But you remember, don\'t you?',
      'You\'ve been here before.',
      'You\'ve ALWAYS been here.',
    ],
    skipOnRetry: true,
  },
} as const satisfies Record<string, PhoneScript>;
