// tools/huntGoldInspector.js
//
// ONE interactive tool:
//   all   -> overview of every hunt's total gold
//   <id>  -> per-fight gold for that hunt id
//   <key> -> per-fight gold for that hunt key
//   exit  -> quit

const readline = require('readline')
const { huntPages } = require('./commands/Hunt/huntPages') // adjust path

/* ------------ utility printers ------------------------------- */
function printAllPages() {
  console.log('\n=== Hunt-Gold Overview ===\n')
  const pageKeys = Object.keys(huntPages).sort(
    (a, b) => Number(a.replace('page', '')) - Number(b.replace('page', ''))
  )
  for (const key of pageKeys) {
    const page = huntPages[key]
    console.log(`${key.toUpperCase()} – ${page.name}`)
    page.hunts.forEach((h) => {
      const label = h.id.toString().padStart(2, '0')
      console.log(`   Hunt ${label}: ${h.totalGold} g  |  ${h.name}`)
    })
    const subtotal = page.hunts.reduce((s, h) => s + h.totalGold, 0)
    console.log(`   Page subtotal: ${subtotal} g\n`)
  }
}

function findHunt(query) {
  for (const [pageKey, page] of Object.entries(huntPages)) {
    const hunt = page.hunts.find(
      (h) => String(h.id) === query || h.key === query
    )
    if (hunt) return { pageKey, pageName: page.name, hunt }
  }
  return null
}

function printHunt({ pageKey, pageName, hunt }) {
  console.log(`\n${pageKey.toUpperCase()} – ${pageName}`)
  console.log(`Hunt ${hunt.id} (${hunt.key}): ${hunt.name}`)
  console.log(`Energy Cost: ${hunt.energyCost}`)
  console.log(`Total Gold : ${hunt.totalGold}\n`)
  hunt.battles.forEach((b, i) => {
    const lbl = i === hunt.battles.length - 1 ? 'Boss' : `Fight ${i + 1}`
    console.log(`  ${lbl.padEnd(7)}: ${b.goldReward} g`)
  })
  console.log('')
}

/* ------------ interactive prompt ----------------------------- */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask() {
  rl.question('all | <hunt id/key> | exit > ', (txt) => {
    const q = txt.trim().toLowerCase()
    if (!q || q === 'all') {
      printAllPages()
    } else if (q === 'exit') {
      return rl.close()
    } else {
      const info = findHunt(q)
      if (!info) console.log('❌ Hunt not found.\n')
      else printHunt(info)
    }
    ask() // loop
  })
}

/* ------------ run (ensure pages already built) --------------- */
ask()
