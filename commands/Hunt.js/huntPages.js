// huntPages.js

const fs = require('fs')
const path = require('path')

const huntPages = {}

// Load all hunt pages from the `pages/` folder
const pageFiles = fs.readdirSync(path.join(__dirname, 'pages')).filter(file => file.endsWith('.js'))

for (const file of pageFiles) {
  const page = require(`./pages/${file}`)
  huntPages[page.key] = page
}

module.exports = { huntPages }
