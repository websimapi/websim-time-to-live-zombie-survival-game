import config from './config.js';
import { placeStructure } from './world.js';

let room;
let buildPanel;
let buildOptions;
let buildMode = false;
let selectedStructure = null;

// Initialize building system
export function initBuilding(roomInstance) {
  room = roomInstance;
  buildPanel = document.getElementById('build-panel');
  buildOptions = document.getElementById('build-options');
  
  // Populate building options
  updateBuildOptions();
  
  // Add event listener for placing structures
  document.addEventListener('click', handlePlaceStructure);
}

// Toggle build panel
export function toggleBuildPanel() {
  if (buildPanel.classList.contains('hidden')) {
    buildPanel.classList.remove('hidden');
    updateBuildOptions();
  } else {
    buildPanel.classList.add('hidden');
    buildMode = false;
    selectedStructure = null;
  }
}

// Update the building options based on inventory
function updateBuildOptions() {
  buildOptions.innerHTML = '';
  const inventory = room.presence[room.clientId]?.inventory || {};
  
  // Only show wall structures in the build panel
  const wallRecipes = Object.entries(config.RECIPES).filter(([id]) => id.includes('_WALL'));
  
  for (const [recipeId, recipe] of wallRecipes) {
    const structureElement = document.createElement('div');
    structureElement.className = 'build-item';
    
    // Check if player has this structure in inventory
    const availableAmount = inventory[recipeId] || 0;
    if (availableAmount <= 0) {
      structureElement.classList.add('disabled');
    } else {
      structureElement.addEventListener('click', () => selectStructure(recipeId));
    }
    
    // Create structure display
    const nameElement = document.createElement('div');
    nameElement.className = 'structure-name';
    nameElement.textContent = recipe.name;
    
    const countElement = document.createElement('div');
    countElement.className = 'structure-count';
    countElement.textContent = `Available: ${availableAmount}`;
    
    structureElement.appendChild(nameElement);
    structureElement.appendChild(countElement);
    buildOptions.appendChild(structureElement);
  }
}

// Select a structure to build
function selectStructure(structureType) {
  selectedStructure = structureType;
  buildMode = true;
  buildPanel.classList.add('hidden');
  
  // Change cursor to indicate building mode
  document.body.style.cursor = 'crosshair';
}

// Handle structure placement
function handlePlaceStructure(event) {
  if (!buildMode || !selectedStructure) return;
  
  const inventory = { ...room.presence[room.clientId].inventory };
  if ((inventory[selectedStructure] || 0) <= 0) {
    buildMode = false;
    selectedStructure = null;
    document.body.style.cursor = 'default';
    return;
  }
  
  // Get the click position in world coordinates
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = room.presence[room.clientId].x + (event.clientX - window.innerWidth / 2) / 50;
  const y = room.presence[room.clientId].y + (window.innerHeight / 2 - event.clientY) / 50;
  
  // Place the structure at the clicked position
  placeStructure(selectedStructure, x, y);
  
  // Reduce the count in inventory
  inventory[selectedStructure]--;
  
  // Update player presence
  room.updatePresence({
    inventory: inventory
  });
  
  // Exit build mode after placing
  buildMode = false;
  selectedStructure = null;
  document.body.style.cursor = 'default';
}

