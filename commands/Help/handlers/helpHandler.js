const fs = require('fs')
const path = require('path')

module.exports = {
  loadHelpCommand(commandName) {
    const helpFiles = fs.readdirSync(path.join(__dirname, '../commands/help'))
    const commandFile = helpFiles.find(
      (file) => file.toLowerCase() === `${commandName.toLowerCase()}.js`
    )

    if (commandFile) {
      return require(path.join(__dirname, '../commands/help', commandFile))
    } else {
      throw new Error(`Command help file not found for "${commandName}"`)
    }
  },
}
