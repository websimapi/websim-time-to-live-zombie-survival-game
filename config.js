export default {
  // Game configuration
  WORLD_SIZE: 50, // Size of the world in blocks
  BLOCK_SIZE: 1, // Size of each block
  
  // Player settings
  PLAYER_SPEED: 5,
  PLAYER_SIZE: 0.8, // Added player size for collision detection
  PLAYER_MAX_HEALTH: 100,
  PLAYER_ATTACK_RANGE: 2,
  PLAYER_ATTACK_DAMAGE: 20,
  
  // Zombie settings
  ZOMBIE_SPEED: 3,
  ZOMBIE_SIZE: 0.8, // Added zombie size for collision detection
  ZOMBIE_DAMAGE: 10,
  ZOMBIE_SPAWN_RATE: 0.2, // Zombies per second during night
  ZOMBIE_MAX_HEALTH: 50,
  
  // Day/Night cycle
  DAY_LENGTH: 300, // seconds (5 minutes)
  NIGHT_LENGTH: 180, // seconds (3 minutes)
  
  // Resources
  RESOURCE_TYPES: {
    WOOD: {
      name: "Wood",
      color: "#8B4513",
      durability: 2
    },
    STONE: {
      name: "Stone",
      color: "#808080",
      durability: 4
    },
    IRON: {
      name: "Iron",
      color: "#A19D94",
      durability: 6
    }
  },
  
  // Crafting recipes
  RECIPES: {
    WOODEN_SWORD: {
      name: "Wooden Sword",
      requires: { WOOD: 3 },
      damage: 15
    },
    STONE_SWORD: {
      name: "Stone Sword",
      requires: { WOOD: 1, STONE: 3 },
      damage: 25
    },
    IRON_SWORD: {
      name: "Iron Sword",
      requires: { WOOD: 1, IRON: 3 },
      damage: 35
    },
    WOODEN_WALL: {
      name: "Wooden Wall",
      requires: { WOOD: 5 },
      health: 50
    },
    STONE_WALL: {
      name: "Stone Wall",
      requires: { STONE: 5 },
      health: 100
    },
    IRON_WALL: {
      name: "Iron Wall",
      requires: { IRON: 5 },
      health: 200
    }
  }
};