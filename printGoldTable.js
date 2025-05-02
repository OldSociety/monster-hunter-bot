// tools/huntGoldInspector.js
//
// ONE interactive tool:
//   all   -> overview of every hunt's total gold (incl. boss ×1.4)
//   <id>  -> per-fight gold for that hunt id (incl. boss ×1.4)
//   <key> -> per-fight gold for that hunt key
//   exit  -> quit

const readline = require('readline')
const { huntPages } = require('./commands/Hunt/huntPages') // adjust path

/* ------------ utility printers ------------------------------- */
function printAllPages() {
  console.log('\n=== Hunt-Gold Overview ===\n')
  const pageKeys = Object.keys(huntPages)
    .sort((a, b) => Number(a.replace('page', '')) - Number(b.replace('page', '')))

  for (const key of pageKeys) {
    const page = huntPages[key]
    console.log(`${key.toUpperCase()} – ${page.name}`)

    // each hunt’s actual total (only type==='boss' gets ×1.4)
    page.hunts.forEach(h => {
      const label = h.id.toString().padStart(2, '0')
      const actualTotal = h.battles.reduce((sum, b) => {
        const g = b.type === 'boss'
          ? Math.round(b.goldReward * 1.4)
          : b.goldReward
        return sum + g
      }, 0)

      console.log(`   Hunt ${label}: ${actualTotal} g  |  ${h.name}`)
    })

    // page subtotal
    const subtotal = page.hunts.reduce((s, h) => {
      return s + h.battles.reduce((sum, b) => {
        const g = b.type === 'boss'
          ? Math.round(b.goldReward * 1.4)
          : b.goldReward
        return sum + g
      }, 0)
    }, 0)

    console.log(`   Page subtotal: ${subtotal} g\n`)
  }
}

function findHunt(query) {
  for (const [pageKey, page] of Object.entries(huntPages)) {
    const hunt = page.hunts.find(
      h => String(h.id) === query || h.key === query
    )
    if (hunt) return { pageKey, pageName: page.name, hunt }
  }
  return null
}

function printHunt({ pageKey, pageName, hunt }) {
  console.log(`\n${pageKey.toUpperCase()} – ${pageName}`)
  console.log(`Hunt ${hunt.id} (${hunt.key}): ${hunt.name}`)
  console.log(`Energy Cost: ${hunt.energyCost}`)

  // total with boss ×1.4
  const actualTotal = hunt.battles.reduce((sum, b) => {
    const g = b.type === 'boss'
      ? Math.round(b.goldReward * 1.4)
      : b.goldReward
    return sum + g
  }, 0)
  console.log(`Total Gold : ${actualTotal} g\n`)

  // per-fight display
  hunt.battles.forEach((b, i) => {
    const lbl = b.type === 'boss'
      ? 'Boss'
      : `Fight ${i + 1}`
    const display = b.type === 'boss'
      ? Math.round(b.goldReward * 1.4)
      : b.goldReward
    console.log(`  ${lbl.padEnd(7)}: ${display} g`)
  })

  console.log('')
}

/* ------------ interactive prompt ----------------------------- */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask() {
  rl.question('all | <hunt id/key> | exit > ', txt => {
    const q = txt.trim().toLowerCase()
    if (!q || q === 'all') {
      printAllPages()
    } else if (q === 'exit') {
      rl.close()
      return
    } else {
      const info = findHunt(q)
      if (!info) console.log('❌ Hunt not found.\n')
      else printHunt(info)
    }
    ask()
  })
}

/* ------------ run (ensure pages already built) --------------- */
ask()
