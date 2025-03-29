import config from './config.js';
import * as THREE from 'three';
import { updateCameraPosition, damageBlock } from './world.js';

let room;
let playerMeshes = {};
let playerDirection = { x: 0, y: 0 };
let selectedBlockId = null;
let mouse = { x: 0, y: 0 };
let raycaster = new THREE.Raycaster();

// Initialize player
export function initPlayer(roomInstance) {
  room = roomInstance;
  
  // Set up keyboard input handling
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Set up mouse input
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mousedown', handleMouseDown);
  
  // Update inventory UI
  updateInventoryUI();
}

// Handle keyboard input for movement
function handleKeyDown(event) {
  if (room.presence[room.clientId]?.dead) return;
  
  switch(event.key) {
    case 'w':
    case 'ArrowUp':
      playerDirection.y = 1;
      break;
    case 's':
    case 'ArrowDown':
      playerDirection.y = -1;
      break;
    case 'a':
    case 'ArrowLeft':
      playerDirection.x = -1;
      break;
    case 'd':
    case 'ArrowRight':
      playerDirection.x = 1;
      break;
    case '1': case '2': case '3': case '4': case '5':
    case '6': case '7': case '8': case '9':
      equipItemFromSlot(parseInt(event.key) - 1);
      break;
  }
  
  // Update direction in presence
  if (room.presence[room.clientId]) {
    room.updatePresence({
      direction: { ...playerDirection }
    });
  }
}

function handleKeyUp(event) {
  if (room.presence[room.clientId]?.dead) return;
  
  switch(event.key) {
    case 'w':
    case 'ArrowUp':
    case 's':
    case 'ArrowDown':
      playerDirection.y = 0;
      break;
    case 'a':
    case 'ArrowLeft':
    case 'd':
    case 'ArrowRight':
      playerDirection.x = 0;
      break;
  }
  
  // Update direction in presence
  if (room.presence[room.clientId]) {
    room.updatePresence({
      direction: { ...playerDirection }
    });
  }
}

// Handle mouse movement
function handleMouseMove(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Handle mouse click
function handleMouseDown(event) {
  if (room.presence[room.clientId]?.dead) return;
  
  if (event.button === 0) { // Left click
    mineBlock();
  } else if (event.button === 2) { // Right click
    attackZombie();
  }
}

// Mine a block at the selected position
function mineBlock() {
  if (!selectedBlockId) return;
  
  const equippedItem = room.presence[room.clientId]?.equippedItem;
  let damage = 1; // Base damage
  
  // Increase damage if using a sword
  if (equippedItem && equippedItem.includes('_SWORD')) {
    const swordType = equippedItem;
    if (swordType === 'WOODEN_SWORD') damage = 2;
    else if (swordType === 'STONE_SWORD') damage = 3;
    else if (swordType === 'IRON_SWORD') damage = 5;
  }
  
  const blockDestroyed = damageBlock(selectedBlockId, damage);
  
  if (blockDestroyed) {
    // Extract block type from the ID
    const blockIdParts = selectedBlockId.split('-');
    const resourceType = blockIdParts[0].toUpperCase();
    
    // Add to inventory
    const inventory = { ...room.presence[room.clientId].inventory };
    inventory[resourceType] = (inventory[resourceType] || 0) + 1;
    
    room.updatePresence({
      inventory: inventory,
      isAttacking: true
    });
    
    // Reset attacking state after animation
    setTimeout(() => {
      room.updatePresence({
        isAttacking: false
      });
    }, 200);
    
    updateInventoryUI();
  }
}

// Attack a zombie
function attackZombie() {
  const equippedItem = room.presence[room.clientId]?.equippedItem;
  let damage = config.PLAYER_ATTACK_DAMAGE;
  
  // Increase damage if using a sword
  if (equippedItem && equippedItem.includes('_SWORD')) {
    if (equippedItem === 'WOODEN_SWORD') damage = 30;
    else if (equippedItem === 'STONE_SWORD') damage = 40;
    else if (equippedItem === 'IRON_SWORD') damage = 50;
  }
  
  // Set attacking state
  room.updatePresence({
    isAttacking: true
  });
  
  // Reset attacking state after animation
  setTimeout(() => {
    room.updatePresence({
      isAttacking: false
    });
  }, 200);
  
  // Broadcast attack to all zombies in range
  // This is handled in zombie.js
}

// Update player movement
export function updatePlayer(deltaTime) {
  if (!room.presence[room.clientId] || room.presence[room.clientId].dead) return;
  
  // Move player based on direction
  const playerSpeed = config.PLAYER_SPEED * deltaTime;
  const direction = room.presence[room.clientId].direction;
  
  if (direction.x !== 0 || direction.y !== 0) {
    // Normalize diagonal movement
    const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    const normalizedDir = {
      x: direction.x / magnitude,
      y: direction.y / magnitude
    };
    
    const newX = room.presence[room.clientId].x + normalizedDir.x * playerSpeed;
    const newY = room.presence[room.clientId].y + normalizedDir.y * playerSpeed;
    
    // Update position in presence
    room.updatePresence({
      x: newX,
      y: newY
    });
  }
  
  // Update camera to follow player
  updateCameraPosition(
    room.presence[room.clientId].x,
    room.presence[room.clientId].y
  );
}

// Render all players
export function renderPlayer(presenceData) {
  // Create new meshes for new players
  for (const clientId in presenceData) {
    const playerPresence = presenceData[clientId];
    
    // Skip if player presence doesn't have position or is dead
    if (!playerPresence || !playerPresence.hasOwnProperty('x') || !playerPresence.hasOwnProperty('y') || playerPresence.dead) {
      continue;
    }
    
    // Create player mesh if it doesn't exist
    if (!playerMeshes[clientId]) {
      createPlayerMesh(clientId);
    }
    
    // Update player position
    if (playerMeshes[clientId]) {
      playerMeshes[clientId].position.x = playerPresence.x;
      playerMeshes[clientId].position.y = playerPresence.y;
      
      // Update player attack animation
      if (playerPresence.isAttacking) {
        playerMeshes[clientId].rotation.z = Math.PI / 4;
      } else {
        playerMeshes[clientId].rotation.z = 0;
      }
      
      // Update player weapon
      updatePlayerWeapon(clientId, playerPresence.equippedItem);
    }
  }
  
  // Remove meshes for disconnected players
  for (const clientId in playerMeshes) {
    if (!presenceData[clientId]) {
      removePlayerMesh(clientId);
    }
  }
}

// Create a player mesh
function createPlayerMesh(clientId) {
  const playerGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.6);
  
  // Use different color for current player
  const playerColor = clientId === room.clientId ? 0x42b883 : 0xff6347;
  const playerMaterial = new THREE.MeshBasicMaterial({ color: playerColor });
  
  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.position.z = 0.8; // Raise player off the ground
  
  // Create a weapon mesh
  const weaponGeometry = new THREE.BoxGeometry(0.2, 1.2, 0.1);
  const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
  const weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
  
  weaponMesh.position.y = 0.8; // Position the weapon to the right of the player
  weaponMesh.visible = false; // Hide by default
  playerMesh.add(weaponMesh);
  playerMesh.userData.weaponMesh = weaponMesh;
  
  // Add username text
  if (room.peers[clientId]) {
    const peerInfo = room.peers[clientId];
    const textSprite = createTextSprite(peerInfo.username);
    textSprite.position.z = 1.5;
    playerMesh.add(textSprite);
  }
  
  playerMeshes[clientId] = playerMesh;
  scene.add(playerMesh);
}

// Update player's weapon based on equipped item
function updatePlayerWeapon(clientId, equippedItem) {
  const playerMesh = playerMeshes[clientId];
  if (!playerMesh || !playerMesh.userData.weaponMesh) return;
  
  const weaponMesh = playerMesh.userData.weaponMesh;
  
  // Show/hide weapon based on equipped item
  if (equippedItem && equippedItem.includes('_SWORD')) {
    weaponMesh.visible = true;
    
    // Update weapon color based on type
    if (equippedItem === 'WOODEN_SWORD') {
      weaponMesh.material.color.set(0x8B4513);
    } else if (equippedItem === 'STONE_SWORD') {
      weaponMesh.material.color.set(0x808080);
    } else if (equippedItem === 'IRON_SWORD') {
      weaponMesh.material.color.set(0xA19D94);
    }
  } else {
    weaponMesh.visible = false;
  }
}

// Remove a player mesh
function removePlayerMesh(clientId) {
  if (playerMeshes[clientId]) {
    scene.remove(playerMeshes[clientId]);
    delete playerMeshes[clientId];
  }
}

// Create text sprite for username
function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  
  context.font = '24px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  
  return sprite;
}

// Get player movement direction
export function handlePlayerMovement() {
  return playerDirection;
}

// Get the currently selected block
export function getSelectedBlock() {
  return selectedBlockId;
}

// Get player inventory
export function getInventory() {
  return room.presence[room.clientId]?.inventory || {};
}

// Update the inventory UI
function updateInventoryUI() {
  if (!room.presence[room.clientId]) return;
  
  const inventory = room.presence[room.clientId].inventory;
  const inventoryElement = document.getElementById('inventory');
  inventoryElement.innerHTML = '';
  
  // Display resources
  for (const resourceType in config.RESOURCE_TYPES) {
    const count = inventory[resourceType] || 0;
    addInventoryItem(inventoryElement, resourceType, count);
  }
  
  // Display craftable items
  for (const itemType in config.RECIPES) {
    const count = inventory[itemType] || 0;
    if (count > 0) {
      addInventoryItem(inventoryElement, itemType, count);
    }
  }
}

// Add an item to the inventory UI
function addInventoryItem(inventoryElement, itemType, count) {
  const itemElement = document.createElement('div');
  itemElement.className = 'inventory-item';
  if (room.presence[room.clientId].equippedItem === itemType) {
    itemElement.classList.add('selected');
  }
  
  itemElement.textContent = getItemIcon(itemType);
  
  const countElement = document.createElement('div');
  countElement.className = 'inventory-count';
  countElement.textContent = count;
  
  itemElement.appendChild(countElement);
  itemElement.setAttribute('data-item', itemType);
  
  itemElement.addEventListener('click', () => {
    equipItem(itemType);
  });
  
  inventoryElement.appendChild(itemElement);
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

// Equip an item
function equipItem(itemType) {
  room.updatePresence({
    equippedItem: itemType
  });
  updateInventoryUI();
}

// Equip an item from inventory slot
function equipItemFromSlot(slotIndex) {
  const inventoryItems = document.querySelectorAll('.inventory-item');
  if (slotIndex >= 0 && slotIndex < inventoryItems.length) {
    const itemType = inventoryItems[slotIndex].getAttribute('data-item');
    equipItem(itemType);
  }
}

