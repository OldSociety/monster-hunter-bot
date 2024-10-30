// handlers/messageHandler.js

module.exports = (client, User) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || message.channel.type === 'DM') return

    const commandPrefix = '/'
    if (message.content.startsWith(commandPrefix)) return

    if (message.reference && message.reference.messageId) {
      try {
        const repliedTo = await message.channel.messages.fetch(
          message.reference.messageId
        )
        if (repliedTo.author && repliedTo.author.id === client.user.id) return
      } catch (error) {
        console.error('Error fetching the referenced message:', error)
      }
    }

    if (message.mentions.has(client.user)) return

    const now = new Date()
    const userID = message.author.id
    const userName = message.author.username

    try {
      let userData = await User.findOne({ where: { user_id: userID } })

      if (!userData) {
        userData = await User.create({
          user_id: userID,
          user_name: userName,
          gold: 100, // Initial amount of gold
          last_chat_message: now,
        })
      }

      const lastMessageTime = new Date(userData.last_chat_message)
      const minutesSinceLastMessage = (now - lastMessageTime) / (1000 * 60)

      if (minutesSinceLastMessage >= 1) {
        const goldToAdd = Math.floor(Math.random() * 3) + 1 // Award 1-3 gold randomly every minute
        const newGoldAmount = userData.gold + goldToAdd

        // Update user's gold and last message time
        await User.update(
          {
            gold: newGoldAmount,
            last_chat_message: now,
          },
          { where: { user_id: userID } }
        )
      }
    } catch (error) {
      console.error('Error updating user gold:', error)
    }
  })
}
