import config from './config.js';
import { initWorld, updateWorld, renderWorld, getWorldState, placeBlock, removeBlock } from './world.js';
import { initPlayer, updatePlayer, renderPlayer, handlePlayerMovement, getSelectedBlock, getInventory } from './player.js';
import { spawnZombie, updateZombies, renderZombies, initZombies } from './zombie.js';
import { initCrafting, toggleCraftingPanel, craftItem } from './crafting.js';
import { initBuilding, toggleBuildPanel, buildStructure } from './building.js';

let room;
let isGameInitialized = false;
let gameTime = 0;
let isNight = false;
let dayNightCycle = 0;
let zombieSpawnTimer = 0;
let playersList = document.getElementById('players-list');

// Initialize the game
async function initGame() {
  if (isGameInitialized) return;
  
  console.log("Initializing game...");

  room = new WebsimSocket();
  await room.initialize();

  // Initialize the room state if it doesn't exist
  if (!room.roomState.worldBlocks) {
    room.updateRoomState({
      worldBlocks: {},
      structures: {},
      gameTime: 0,
      isNight: false
    });
  }

  // Initialize player presence
  room.updatePresence({
    x: Math.floor(Math.random() * config.WORLD_SIZE * config.BLOCK_SIZE),
    y: Math.floor(Math.random() * config.WORLD_SIZE * config.BLOCK_SIZE),
    health: config.PLAYER_MAX_HEALTH,
    dead: false,
    inventory: {
      WOOD: 0,
      STONE: 0,
      IRON: 0,
      WOODEN_SWORD: 0,
      STONE_SWORD: 0,
      IRON_SWORD: 0,
      WOODEN_WALL: 0,
      STONE_WALL: 0,
      IRON_WALL: 0
    },
    equippedItem: null,
    direction: { x: 0, y: 0 },
    isAttacking: false
  });

  // Subscribe to state changes
  room.subscribeRoomState(handleRoomStateUpdate);
  room.subscribePresence(handlePresenceUpdate);
  room.subscribePresenceUpdateRequests(handlePresenceUpdateRequests);

  // Initialize game components
  const worldScene = initWorld();
  initPlayer(room, worldScene);
  initZombies(worldScene);
  initCrafting(room);
  initBuilding(room);

  setupEventListeners();
  updatePlayersList();
  
  isGameInitialized = true;
  gameLoop();
}

function handleRoomStateUpdate(newRoomState) {
  // Update local game state from room state
  gameTime = newRoomState.gameTime || 0;
  isNight = newRoomState.isNight || false;
  updateDayNightIndicator();
}

function handlePresenceUpdate(presence) {
  updatePlayersList();
}

function handlePresenceUpdateRequests(updateRequest, fromClientId) {
  if (!room.presence[room.clientId]) return;
  
  const myPresence = room.presence[room.clientId];
  
  if (updateRequest.type === 'damage') {
    const newHealth = Math.max(0, myPresence.health - updateRequest.damage);
    const isDead = newHealth <= 0;
    
    room.updatePresence({
      health: newHealth,
      dead: isDead
    });
    
    updateHealthBar();
    
    if (isDead) {
      showDeathScreen();
    }
  }
  
  if (updateRequest.type === 'resource-transfer') {
    const inventory = { ...myPresence.inventory };
    inventory[updateRequest.resource] = (inventory[updateRequest.resource] || 0) + updateRequest.amount;
    
    room.updatePresence({
      inventory: inventory
    });
  }
}

function setupEventListeners() {
  document.getElementById('close-crafting').addEventListener('click', () => {
    document.getElementById('crafting-panel').classList.add('hidden');
  });
  
  document.getElementById('close-build').addEventListener('click', () => {
    document.getElementById('build-panel').classList.add('hidden');
  });
  
  document.getElementById('respawn-btn').addEventListener('click', respawnPlayer);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'c') {
      toggleCraftingPanel();
    } else if (e.key === 'b') {
      toggleBuildPanel();
    }
  });
}

function respawnPlayer() {
  if (!room.presence[room.clientId].dead) return;
  
  room.updatePresence({
    x: Math.floor(Math.random() * config.WORLD_SIZE * config.BLOCK_SIZE),
    y: Math.floor(Math.random() * config.WORLD_SIZE * config.BLOCK_SIZE),
    health: config.PLAYER_MAX_HEALTH,
    dead: false
  });
  
  document.getElementById('death-screen').classList.add('hidden');
  document.getElementById('game-overlay').classList.add('hidden');
}

function showDeathScreen() {
  document.getElementById('death-screen').classList.remove('hidden');
  document.getElementById('game-overlay').classList.remove('hidden');
}

function updateDayNightIndicator() {
  const dayNightCycle = isNight ? 
    0.5 + (gameTime % config.NIGHT_LENGTH) / config.NIGHT_LENGTH * 0.5 : 
    (gameTime % config.DAY_LENGTH) / config.DAY_LENGTH * 0.5;
  
  const sun = document.getElementById('sun');
  sun.style.left = `${dayNightCycle * 100}px`;
  sun.style.top = `${Math.sin(dayNightCycle * Math.PI) * 30 + 5}px`;
  
  const indicator = document.getElementById('day-night-indicator');
  if (isNight) {
    indicator.style.background = 'linear-gradient(to bottom, #0a1a2a, #2a0a2a)';
    document.getElementById('sun').style.backgroundColor = '#aaa';
    document.getElementById('sun').style.boxShadow = '0 0 10px #aaa';
  } else {
    indicator.style.background = 'linear-gradient(to bottom, #87CEEB, #F08080)';
    document.getElementById('sun').style.backgroundColor = '#FFA500';
    document.getElementById('sun').style.boxShadow = '0 0 10px #FFA500';
  }
}

function updateHealthBar() {
  if (!room.presence[room.clientId]) return;
  
  const healthPercent = (room.presence[room.clientId].health / config.PLAYER_MAX_HEALTH) * 100;
  document.getElementById('health-fill').style.width = `${healthPercent}%`;
}

function updatePlayersList() {
  playersList.innerHTML = '<h3>Players</h3>';
  
  for (const clientId in room.peers) {
    const player = room.peers[clientId];
    const playerPresence = room.presence[clientId];
    
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    
    const playerAvatar = document.createElement('img');
    playerAvatar.className = 'player-avatar';
    playerAvatar.src = player.avatarUrl;
    
    const playerName = document.createElement('div');
    playerName.className = 'player-name';
    playerName.textContent = player.username;
    
    playerItem.appendChild(playerAvatar);
    playerItem.appendChild(playerName);
    
    if (playerPresence?.dead) {
      playerItem.style.opacity = '0.5';
      const deadIcon = document.createElement('span');
      deadIcon.textContent = ' 💀';
      playerName.appendChild(deadIcon);
    }
    
    playersList.appendChild(playerItem);
  }
}

function updateDayNightCycle(deltaTime) {
  // Update the game time
  gameTime += deltaTime;
  
  // Check if day or night should change
  if (!isNight && gameTime % config.DAY_LENGTH >= config.DAY_LENGTH - 1) {
    isNight = true;
    room.updateRoomState({ isNight: true });
    console.log("Night has fallen!");
  } else if (isNight && gameTime % config.NIGHT_LENGTH >= config.NIGHT_LENGTH - 1) {
    isNight = false;
    room.updateRoomState({ isNight: false });
    console.log("A new day has begun!");
  }
  
  // Update the room state with the current game time
  room.updateRoomState({ gameTime: gameTime });
  
  // Spawn zombies at night
  if (isNight) {
    zombieSpawnTimer += deltaTime;
    if (zombieSpawnTimer >= 1 / config.ZOMBIE_SPAWN_RATE) {
      zombieSpawnTimer = 0;
      const zombieId = `zombie-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const x = Math.floor(Math.random() * config.WORLD_SIZE * config.BLOCK_SIZE);
      const y = Math.floor(Math.random() * config.WORLD_SIZE * config.BLOCK_SIZE);
      
      spawnZombie(zombieId, x, y);
    }
  }
}

let lastFrameTime = 0;

function gameLoop(timestamp = 0) {
  const deltaTime = (timestamp - lastFrameTime) / 1000 || 0.016; // Provide default value
  lastFrameTime = timestamp;
  
  if (isGameInitialized) {
    updateDayNightCycle(deltaTime);
    updateWorld(deltaTime);
    updatePlayer(deltaTime);
    updateZombies(deltaTime, room);
    updateHealthBar();
    
    renderWorld();
    renderPlayer(room.presence);
    renderZombies();
  }
  
  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', initGame);