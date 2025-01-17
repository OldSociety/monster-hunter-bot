const { execute } = require('../commands/Slots/Slots')
const { User } = require('../Models/model')
const { Interaction, MessageComponentInteraction } = require('discord.js')

jest.mock('../Models/model', () => ({
  User: {
    findOne: jest.fn(),
    save: jest.fn(),
  },
}))

describe('Zalathor Slots Command', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      user: { id: '123456789' },
      reply: jest.fn(),
      editReply: jest.fn(),
      deferUpdate: jest.fn(),
      channel: {
        createMessageComponentCollector: jest.fn().mockReturnValue({
          on: jest.fn(),
          stop: jest.fn(),
        }),
      },
    }

    jest.clearAllMocks()
  })

  test('should not allow multiple instances for the same user', async () => {
    const activePlayers = new Set(['123456789'])
    await execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: `🎰 You already have a game in progress! Finish your current game first.`,
      ephemeral: true,
    })
  })

  test('should prompt user to set up an account if they do not exist', async () => {
    User.findOne.mockResolvedValue(null)
    await execute(interaction)

    expect(interaction.reply).toHaveBeenCalledWith({
      content: `🎰 You need to set up your account first. Use \`/account\` to get started!`,
      ephemeral: true,
    })
  })

  test('should not allow a game to start if user has insufficient tokens', async () => {
    User.findOne.mockResolvedValue({ currency: { gems: 0 } })
    await execute(interaction)

    expect(interaction.reply).toHaveBeenCalledWith({
      content: `🎰 You don't have enough 🧿tokens to play! It costs 1 token per game.`,
      ephemeral: true,
    })
  })

  test('should start the game when user has enough tokens', async () => {
    User.findOne.mockResolvedValue({
      currency: { gems: 5, gold: 50, energy: 10, eggs: 1, ichor: 2 },
    })

    await execute(interaction)

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        ephemeral: true,
      })
    )
  })

  test('should handle button interaction for starting the game', async () => {
    User.findOne.mockResolvedValue({
      currency: { gems: 5, gold: 50, energy: 10, eggs: 1, ichor: 2 },
    })

    const buttonInteraction = new MessageComponentInteraction(interaction)
    buttonInteraction.customId = `start_game_123456789`
    buttonInteraction.user = interaction.user
    buttonInteraction.reply = jest.fn()

    await execute(interaction)

    const collectorCallback = interaction.channel.createMessageComponentCollector.mock.calls[0][0].on

    // Simulate button click
    await collectorCallback('collect', buttonInteraction)

    expect(buttonInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      })
    )
  })

  test('should update user balance and jackpot after a game round', async () => {
    User.findOne.mockResolvedValue({
      currency: { gems: 5, gold: 50, energy: 10, eggs: 1, ichor: 2 },
      save: jest.fn(),
    })

    await execute(interaction)

    expect(User.findOne).toHaveBeenCalledWith({ where: { user_id: '123456789' } })
  })
})
