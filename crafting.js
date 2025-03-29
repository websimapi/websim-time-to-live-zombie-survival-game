import config from './config.js';

let room;
let craftingPanel;
let craftingOptions;

// Initialize crafting system
export function initCrafting(roomInstance) {
  room = roomInstance;
  craftingPanel = document.getElementById('crafting-panel');
  craftingOptions = document.getElementById('crafting-options');
  
  // Populate crafting options
  updateCraftingOptions();
}

// Toggle crafting panel
export function toggleCraftingPanel() {
  if (craftingPanel.classList.contains('hidden')) {
    craftingPanel.classList.remove('hidden');
    updateCraftingOptions();
  } else {
    craftingPanel.classList.add('hidden');
  }
}

// Update the crafting options based on inventory
function updateCraftingOptions() {
  craftingOptions.innerHTML = '';
  const inventory = room.presence[room.clientId]?.inventory || {};
  
  for (const recipeId in config.RECIPES) {
    const recipe = config.RECIPES[recipeId];
    const recipeElement = document.createElement('div');
    recipeElement.className = 'crafting-item';
    
    // Check if player has resources for this recipe
    let canCraft = true;
    for (const resourceType in recipe.requires) {
      const requiredAmount = recipe.requires[resourceType];
      const availableAmount = inventory[resourceType] || 0;
      if (availableAmount < requiredAmount) {
        canCraft = false;
        break;
      }
    }
    
    if (!canCraft) {
      recipeElement.classList.add('disabled');
    } else {
      recipeElement.addEventListener('click', () => craftItem(recipeId));
    }
    
    // Create recipe display
    const nameElement = document.createElement('div');
    nameElement.className = 'recipe-name';
    nameElement.textContent = recipe.name;
    
    const requiresElement = document.createElement('div');
    requiresElement.className = 'recipe-requires';
    
    for (const resourceType in recipe.requires) {
      const requiredAmount = recipe.requires[resourceType];
      const resourceElement = document.createElement('div');
      resourceElement.className = 'required-resource';
      resourceElement.textContent = `${getItemIcon(resourceType)} x${requiredAmount}`;
      requiresElement.appendChild(resourceElement);
    }
    
    recipeElement.appendChild(nameElement);
    recipeElement.appendChild(requiresElement);
    craftingOptions.appendChild(recipeElement);
  }
}

// Get an icon for an item
function getItemIcon(itemType) {
  switch(itemType) {
    case 'WOOD': return '🪵';
    case 'STONE': return '🪨';
    case 'IRON': return '⛏️';
    case 'WOODEN_SWORD': return '🗡️';
    case 'STONE_SWORD': return '⚔️';
    case 'IRON_SWORD': return '🔪';
    case 'WOODEN_WALL': return '🧱';
    case 'STONE_WALL': return '🏛️';
    case 'IRON_WALL': return '🏰';
    default: return '❓';
  }
}

// Craft an item
export function craftItem(recipeId) {
  const recipe = config.RECIPES[recipeId];
  if (!recipe) return;
  
  const inventory = { ...room.presence[room.clientId].inventory };
  
  // Check if player has resources
  for (const resourceType in recipe.requires) {
    const requiredAmount = recipe.requires[resourceType];
    const availableAmount = inventory[resourceType] || 0;
    if (availableAmount < requiredAmount) {
      console.log("Not enough resources to craft this item");
      return;
    }
  }
  
  // Consume resources
  for (const resourceType in recipe.requires) {
    const requiredAmount = recipe.requires[resourceType];
    inventory[resourceType] -= requiredAmount;
  }
  
  // Add crafted item to inventory
  inventory[recipeId] = (inventory[recipeId] || 0) + 1;
  
  // Update player presence
  room.updatePresence({
    inventory: inventory
  });
  
  // Update crafting options
  updateCraftingOptions();
}

