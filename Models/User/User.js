module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('Users', {
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 500,
    },
    currency: {
      type: DataTypes.JSON,
      defaultValue: {
        energy: 10,
        tokens: 0,
        eggs: 0,
        ichor: 0,
        dice: 0,
        gear: 0
      },
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    brute_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    spellsword_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stealth_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    top_monsters: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    top_brutes: {
      type: DataTypes.JSON,
      defaultValue: [], 
    },
    top_spellswords: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    top_stealths: {
      type: DataTypes.JSON,
      defaultValue: [], 
    },
    completedLevels: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    current_raidHp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_chat_message: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_daily_claim: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    daily_streak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_free_claim: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  })

  return User
}
