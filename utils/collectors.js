//utils/collectors
// 
const collectors = new Map() // Global map for active collectors

function stopUserCollector(userId) {
  if (collectors.has(userId)) {
    console.log(`Stopping previous collector for user: ${userId}`)
    collectors.get(userId).stop() // Stop active collector
    collectors.delete(userId) // Remove from map
  }
}

module.exports = { collectors, stopUserCollector }
