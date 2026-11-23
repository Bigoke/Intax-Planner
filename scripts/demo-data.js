// Demo data for smoke tests (same as the in-app example practice).
'use strict';
const E = require('../src/engine/engine.js');
const ex = require('../src/data/example.js').buildExample(E);
ex.settings.practice.name = 'Bigoke Tax & Accounting';
module.exports = ex;
