import { describe, expect, it } from 'vitest';

import { toneClasses, type Tone } from './tone.js';

const TONES: Tone[] = ['neutral', 'success', 'info', 'warning', 'danger', 'accent'];

describe('toneClasses', () => {
  it.each(TONES)('%s: every slot is built on the tone-* tokens', (tone) => {
    for (const cls of Object.values(toneClasses[tone])) {
      expect(cls).toMatch(new RegExp(`tone-${tone}-(bg|fg)`));
    }
  });

  it('info differs from success (audit §2.8)', () => {
    expect(toneClasses.info.soft).not.toBe(toneClasses.success.soft);
  });
});
