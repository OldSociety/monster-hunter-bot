module.exports = {
  name: 'messageCreate',
  execute(message, client) {
    if (message.author.bot) return
    // console.log(
    //   `Message received from ${message.author.tag}: ${message.content}`
    // )
  },
}
