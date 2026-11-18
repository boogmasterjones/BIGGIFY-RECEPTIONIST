import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecordingNotice, recordingOn, recordingStartMarkup, callbackToken } from '../src/recording.js';
import { greetingFor, systemPrompt } from '../src/prompt.js';
import { telnyxAnswer } from '../src/telnyx.js';

const biz = { id: 'b1', name: 'Rapid Water Heater', recordCalls: true };

test('the notice is worked into the answering-service sentence', () => {
  const g = "Hi, thanks for calling Rapid Water Heater. We're tied up right now, so this is the answering service. When's a good time to call you back, or should we just call as soon as we can?";
  assert.equal(
    withRecordingNotice(g),
    "Hi, thanks for calling Rapid Water Heater. We're tied up right now, so this is the answering service, and this call's recorded so we get your details right. When's a good time to call you back, or should we just call as soon as we can?",
  );
});

test('custom greetings get the notice too; one that mentions recording is left alone', () => {
  assert.match(withRecordingNotice('Thanks for calling Kwekel. The office is closed right now, so this is the answering service. When?'), /answering service, and this call's recorded/);
  assert.equal(withRecordingNotice('Hello, you reached Bob. When should we call?'), "Hello, you reached Bob. This call's recorded so we get your details right. When should we call?");
  assert.equal(withRecordingNotice('Calls are recorded. Hi.'), 'Calls are recorded. Hi.');
});

test('recording and the notice always go together', () => {
  const xml = telnyxAnswer(biz, 'https://x.test', '', '+19413931313', '+19415550000');
  assert.match(xml, /<Start><Recording channels="single"/);
  assert.ok(xml.indexOf('<Start>') < xml.indexOf('<Connect>'));
  assert.match(greetingFor(biz), /recorded/);
  assert.match(xml, /this call&apos;s recorded/);
  assert.match(systemPrompt(biz), /The call is recorded/);

  const off = { ...biz, recordCalls: false };
  assert.doesNotMatch(telnyxAnswer(off, 'https://x.test', '', '+1', '+1'), /Recording/);
  assert.doesNotMatch(greetingFor(off), /record/i);
  assert.doesNotMatch(systemPrompt(off), /recorded/);

  // the env fallback business (no row) is never recorded
  assert.equal(recordingOn({ id: null, name: 'x' }), false);
  assert.doesNotMatch(greetingFor(null), /record/i);
  // RECORD_CALLS=off switches everything off
  process.env.RECORD_CALLS = 'off';
  try {
    assert.equal(recordingOn(biz), false);
    assert.doesNotMatch(greetingFor(biz), /record/i);
  } finally {
    delete process.env.RECORD_CALLS;
  }
  assert.doesNotMatch(greetingFor(biz, { recorded: false }), /record/i);
});

test('the callback link carries a token tied to the numbers', () => {
  const m = recordingStartMarkup('https://x.test', '+19413931313', '+19415550000');
  assert.match(m, /recordingStatusCallback="https:\/\/x\.test\/recording-status-telnyx\?to=%2B19413931313&amp;from=%2B19415550000&amp;k=[0-9a-f]{32}"/);
  assert.notEqual(callbackToken('+1', '+2'), callbackToken('+1', '+3'));
});
