'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {
  localStorage: { getItem: () => 'ru' },
  IOMA_GEO: null
};

const map = require('../routes-map.js');
const advice = require('../route-advice.js');

test('Yiwu rail and road schemes do not silently default to Manzhouli', () => {
  for (const mode of ['rail', 'road']) {
    const route = map.routeFor('yw', mode);
    assert.ok(route, `expected a candidate route for Yiwu / ${mode}`);
    assert.notEqual(route.gw, 'zab', `Yiwu / ${mode} must not default to Manzhouli–Zabaikalsk`);
    assert.equal(route.status, 'candidate');
    assert.equal(route.viaConfirmed, false);
  }
});

test('routeTo does not replace a missing destination route with a route to Moscow', () => {
  const route = map.routeTo('yw', 'msk', 'rail');
  assert.ok(route);
  assert.equal(route.path.at(-1), 'msk');
  assert.notEqual(route.gw, 'zab');
  assert.equal(route.status, 'candidate');
});

test('Manzhouli remains an eligible candidate for northern China origins', () => {
  const route = map.routeFor('bj', 'rail');
  assert.ok(route);
  assert.equal(route.gw, 'zab');
  assert.equal(route.viaConfirmed, false);
});

test('Blagoveshchensk–Heihe is not presented as an available road crossing', () => {
  const result = advice.advise({
    from: 'Harbin',
    to: 'Благовещенск',
    weight: 1200,
    volume: 8,
    lang: 'ru'
  });
  assert.equal(result.ok, true);
  const road = result.options.find(option => option.id === 'auto');
  assert.ok(road);
  assert.match(road.via, /временно приостановлено/);
  assert.equal(road.viaConfirmed, false);
  assert.equal(road.viaStatus, 'requires_confirmation');
});

test('generic central-China route advice does not state Manzhouli as the default', () => {
  const result = advice.advise({
    from: 'Yiwu',
    to: 'Москва',
    weight: 1200,
    volume: 8,
    lang: 'ru'
  });
  assert.equal(result.ok, true);
  for (const option of result.options.filter(option => ['auto', 'rail'].includes(option.id))) {
    assert.doesNotMatch(option.via || '', /Маньчжурия/);
    assert.equal(option.viaConfirmed, false);
    assert.equal(option.viaStatus, 'requires_confirmation');
  }
});
