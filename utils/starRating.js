// utils/starRating.js
function getStarsBasedOnColor(color) {
    switch (color) {
      case 8421504: return '⭐★★★★'
      case 65280: return '⭐⭐★★★'
      case 255: return '⭐⭐⭐★★'
      case 8388736: return '⭐⭐⭐⭐★'
      case 16766720: return '⭐⭐⭐⭐⭐'
      default: return 'N/A'
    }
  }
  
  module.exports = { getStarsBasedOnColor }
  