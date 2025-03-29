import config from './config.js';
import * as THREE from 'three';

let scene, camera, renderer;
let worldBlocks = {};
let structures = {};
let room;

// Initialize the world
export function initWorld() {
  // Get the room instance from main.js
  room = new WebsimSocket();
  
  // Set up Three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue
  
  // Camera
  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2, window.innerWidth / 2,
    window.innerHeight / 2, window.innerHeight / -2,
    0.1, 1000
  );
  camera.position.z = 10;
  
  // Renderer
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Add ground
  const groundGeometry = new THREE.PlaneGeometry(
    config.WORLD_SIZE * config.BLOCK_SIZE,
    config.WORLD_SIZE * config.BLOCK_SIZE
  );
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x7CFC00 }); // Green
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);
  
  // Add resources
  generateResources();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Subscribe to room state changes
  room.subscribeRoomState((state) => {
    if (state.worldBlocks) {
      worldBlocks = state.worldBlocks;
    }
    if (state.structures) {
      structures = state.structures;
    }
  });
}

// Generate resources in the world
function generateResources() {
  // Only generate resources if worldBlocks is empty
  if (Object.keys(room.roomState.worldBlocks || {}).length > 0) {
    worldBlocks = room.roomState.worldBlocks;
    return;
  }
  
  const newWorldBlocks = {};
  
  // Generate wood resources
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * config.WORLD_SIZE);
    const y = Math.floor(Math.random() * config.WORLD_SIZE);
    const blockId = `wood-${x}-${y}`;
    newWorldBlocks[blockId] = {
      type: 'WOOD',
      x: x * config.BLOCK_SIZE,
      y: y * config.BLOCK_SIZE,
      health: config.RESOURCE_TYPES.WOOD.durability
    };
  }
  
  // Generate stone resources
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * config.WORLD_SIZE);
    const y = Math.floor(Math.random() * config.WORLD_SIZE);
    const blockId = `stone-${x}-${y}`;
    newWorldBlocks[blockId] = {
      type: 'STONE',
      x: x * config.BLOCK_SIZE,
      y: y * config.BLOCK_SIZE,
      health: config.RESOURCE_TYPES.STONE.durability
    };
  }
  
  // Generate iron resources
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(Math.random() * config.WORLD_SIZE);
    const y = Math.floor(Math.random() * config.WORLD_SIZE);
    const blockId = `iron-${x}-${y}`;
    newWorldBlocks[blockId] = {
      type: 'IRON',
      x: x * config.BLOCK_SIZE,
      y: y * config.BLOCK_SIZE,
      health: config.RESOURCE_TYPES.IRON.durability
    };
  }
  
  // Update the room state with the new world blocks
  room.updateRoomState({ worldBlocks: newWorldBlocks });
  worldBlocks = newWorldBlocks;
}

// Update the world state
export function updateWorld(deltaTime) {
  // Nothing to update in world state for now
}

// Render the world
export function renderWorld() {
  // Clear previous blocks from scene
  scene.children = scene.children.filter(child => !child.userData.isBlock);
  
  // Render blocks
  for (const blockId in worldBlocks) {
    const block = worldBlocks[blockId];
    if (!block) continue;
    
    const blockColor = config.RESOURCE_TYPES[block.type]?.color || 0xFFFFFF;
    const blockGeometry = new THREE.BoxGeometry(config.BLOCK_SIZE, config.BLOCK_SIZE, config.BLOCK_SIZE);
    const blockMaterial = new THREE.MeshBasicMaterial({ color: blockColor });
    const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
    
    blockMesh.position.x = block.x;
    blockMesh.position.y = block.y;
    blockMesh.userData = { isBlock: true, blockId };
    
    scene.add(blockMesh);
  }
  
  // Render structures
  for (const structureId in structures) {
    const structure = structures[structureId];
    if (!structure) continue;
    
    let structureColor;
    if (structure.type === 'WOODEN_WALL') structureColor = 0x8B4513;
    else if (structure.type === 'STONE_WALL') structureColor = 0x808080;
    else if (structure.type === 'IRON_WALL') structureColor = 0xA19D94;
    else structureColor = 0xFFFFFF;
    
    const structureGeometry = new THREE.BoxGeometry(config.BLOCK_SIZE, config.BLOCK_SIZE * 2, config.BLOCK_SIZE / 2);
    const structureMaterial = new THREE.MeshBasicMaterial({ color: structureColor });
    const structureMesh = new THREE.Mesh(structureGeometry, structureMaterial);
    
    structureMesh.position.x = structure.x;
    structureMesh.position.y = structure.y;
    structureMesh.position.z = 0.25;
    structureMesh.userData = { isBlock: true, structureId };
    
    scene.add(structureMesh);
  }
  
  // Render
  renderer.render(scene, camera);
}

// Get world state
export function getWorldState() {
  return { worldBlocks, structures };
}

// Place a block in the world
export function placeBlock(type, x, y) {
  const blockId = `${type.toLowerCase()}-${Date.now()}`;
  const newBlock = {
    type,
    x,
    y,
    health: config.RESOURCE_TYPES[type].durability
  };
  
  const updatedBlocks = { ...worldBlocks };
  updatedBlocks[blockId] = newBlock;
  
  room.updateRoomState({ worldBlocks: updatedBlocks });
}

// Remove a block from the world
export function removeBlock(blockId) {
  const updatedBlocks = { ...worldBlocks };
  updatedBlocks[blockId] = null;
  
  room.updateRoomState({ worldBlocks: updatedBlocks });
}

// Place a structure in the world
export function placeStructure(type, x, y) {
  const structureId = `${type.toLowerCase()}-${Date.now()}`;
  const healthByType = {
    WOODEN_WALL: 50,
    STONE_WALL: 100,
    IRON_WALL: 200
  };
  
  const newStructure = {
    type,
    x,
    y,
    health: healthByType[type] || 50
  };
  
  const updatedStructures = { ...structures };
  updatedStructures[structureId] = newStructure;
  
  room.updateRoomState({ structures: updatedStructures });
}

// Damage a block
export function damageBlock(blockId, damage) {
  if (!worldBlocks[blockId]) return false;
  
  const block = { ...worldBlocks[blockId] };
  block.health -= damage;
  
  if (block.health <= 0) {
    // Block is destroyed
    removeBlock(blockId);
    return true;
  } else {
    // Block is damaged
    const updatedBlocks = { ...worldBlocks };
    updatedBlocks[blockId] = block;
    room.updateRoomState({ worldBlocks: updatedBlocks });
    return false;
  }
}

// Update camera position to follow a player
export function updateCameraPosition(x, y) {
  camera.position.x = x;
  camera.position.y = y;
}