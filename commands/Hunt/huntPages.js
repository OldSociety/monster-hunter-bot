// huntPages.js
const fs = require('fs')
const path = require('path')

const huntPages = {}

// 1. load every page file
const pageFiles = fs
  .readdirSync(path.join(__dirname, 'pages'))
  .filter((f) => f.endsWith('.js'))

for (const file of pageFiles) {
  const page = require(`./pages/${file}`)
  huntPages[page.key] = page
}

// 2. inject gold rewards *after* all pages exist
const { buildAllPages } = require('./buildPages.js')
buildAllPages(huntPages) // ← one-time initialisation

module.exports = { huntPages }
