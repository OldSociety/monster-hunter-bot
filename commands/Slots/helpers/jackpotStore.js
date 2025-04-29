// jackpotStore.js
const { readFile, writeFile } = require('fs').promises;
const PATH = './jackpot.json';

async function loadJackpot(defaultValue = 100_000) {
  try {
    const raw = await readFile(PATH, 'utf8');
    return JSON.parse(raw).value;
  } catch (_) {
    // first run or file missing
    await saveJackpot(defaultValue);
    return defaultValue;
  }
}

async function saveJackpot(value) {
  await writeFile(PATH, JSON.stringify({ value }), 'utf8');
}

module.exports = { loadJackpot, saveJackpot };
