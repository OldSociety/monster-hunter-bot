// utils/raidParticipants.js
async function addParticipant(bossInstance, userId) {
    if (bossInstance.participants.includes(userId)) return           // no dups
    bossInstance.participants = [...bossInstance.participants, userId]
    await bossInstance.save()
  }
  
  module.exports = { addParticipant }
  