// models/TrainingSession.js
module.exports = (sequelize, DataTypes) => {
  const TrainingSession = sequelize.define(
    'TrainingSession',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      monsterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      bonus: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING, 
        allowNull: false,
        defaultValue: 'in-progress',
      },
    },
    {
      timestamps: true,
      tableName: 'TrainingSessions',
    }
  )

  return TrainingSession
}
