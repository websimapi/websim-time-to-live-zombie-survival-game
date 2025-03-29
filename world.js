import config from './config.js';
import * as THREE from 'three';

let scene, camera, renderer;
let worldBlocks = {};
let structures = {};
let room;
let groundTexture; // For detailed ground

// Initialize the world
export function initWorld() {
  // Get the room instance from main.js
  room = new WebsimSocket();
  
  // Set up Three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  
  // Add directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);
  
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
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Set scene position and scale appropriately
  camera.zoom = 20;
  camera.updateProjectionMatrix();
  
  // Add ground with texture
  const textureLoader = new THREE.TextureLoader();
  groundTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(config.WORLD_SIZE, config.WORLD_SIZE);
  
  const groundGeometry = new THREE.PlaneGeometry(
    config.WORLD_SIZE * config.BLOCK_SIZE,
    config.WORLD_SIZE * config.BLOCK_SIZE
  );
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: groundTexture,
    roughness: 0.8,
    metalness: 0.2
  });
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
  
  return scene; // Return the scene so it can be shared
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

// Check collision between two objects
export function checkCollision(obj1, obj1Size, obj2, obj2Size) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (obj1Size + obj2Size) / 2;
}

// Check if position is valid (not colliding with any blocks or structures)
export function isPositionValid(x, y, size) {
  // Check collision with blocks
  for (const blockId in worldBlocks) {
    const block = worldBlocks[blockId];
    if (!block) continue;
    
    if (checkCollision(
      {x, y}, 
      size, 
      {x: block.x, y: block.y}, 
      config.BLOCK_SIZE)
    ) {
      return false;
    }
  }
  
  // Check collision with structures
  for (const structureId in structures) {
    const structure = structures[structureId];
    if (!structure) continue;
    
    if (checkCollision(
      {x, y}, 
      size, 
      {x: structure.x, y: structure.y}, 
      config.BLOCK_SIZE)
    ) {
      return false;
    }
  }
  
  return true;
}

// Render the world
export function renderWorld() {
  // Clear previous blocks from scene
  scene.children = scene.children.filter(child => 
    !child.userData.isBlock && 
    !child.userData.isStructure &&
    !child.userData.isEnvironment
  );
  
  // Render blocks
  for (const blockId in worldBlocks) {
    const block = worldBlocks[blockId];
    if (!block) continue;
    
    const blockColor = config.RESOURCE_TYPES[block.type]?.color || 0xFFFFFF;
    const blockGeometry = new THREE.BoxGeometry(config.BLOCK_SIZE, config.BLOCK_SIZE, config.BLOCK_SIZE);
    const blockMaterial = new THREE.MeshStandardMaterial({ 
      color: blockColor,
      roughness: 0.7,
      metalness: 0.3
    });
    const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
    
    blockMesh.position.x = block.x;
    blockMesh.position.y = block.y;
    blockMesh.userData = { isBlock: true, blockId };
    
    // Add detail based on block type
    if (block.type === 'WOOD') {
      addWoodDetails(blockMesh);
    } else if (block.type === 'STONE') {
      addStoneDetails(blockMesh);
    } else if (block.type === 'IRON') {
      addIronDetails(blockMesh);
    }
    
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
    const structureMaterial = new THREE.MeshStandardMaterial({ 
      color: structureColor,
      roughness: 0.6,
      metalness: 0.4
    });
    const structureMesh = new THREE.Mesh(structureGeometry, structureMaterial);
    
    structureMesh.position.x = structure.x;
    structureMesh.position.y = structure.y;
    structureMesh.position.z = 0.25;
    structureMesh.userData = { isStructure: true, structureId };
    
    // Add details based on structure type
    if (structure.type === 'WOODEN_WALL') {
      addWoodWallDetails(structureMesh);
    } else if (structure.type === 'STONE_WALL') {
      addStoneWallDetails(structureMesh);
    } else if (structure.type === 'IRON_WALL') {
      addIronWallDetails(structureMesh);
    }
    
    scene.add(structureMesh);
  }
  
  // Add environmental details
  addEnvironmentalDetails();
  
  // Render
  renderer.render(scene, camera);
}

// Add wood details
function addWoodDetails(blockMesh) {
  // Create wood grain lines
  for (let i = 0; i < 3; i++) {
    const lineGeometry = new THREE.BoxGeometry(config.BLOCK_SIZE * 0.8, 0.05, 0.05);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x5D4037 });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.z = 0.5;
    line.position.y = -0.2 + i * 0.2;
    blockMesh.add(line);
  }
}

// Add stone details
function addStoneDetails(blockMesh) {
  // Create cracks and texture on stone
  for (let i = 0; i < 2; i++) {
    const crackGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.05);
    const crackMaterial = new THREE.MeshBasicMaterial({ color: 0x424242 });
    const crack = new THREE.Mesh(crackGeometry, crackMaterial);
    crack.position.z = 0.5;
    crack.position.x = -0.2 + i * 0.4;
    crack.rotation.z = Math.random() * Math.PI;
    blockMesh.add(crack);
  }
}

// Add iron details
function addIronDetails(blockMesh) {
  // Create metallic shine spots
  const shineGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xD7CCC8 });
  const shine = new THREE.Mesh(shineGeometry, shineMaterial);
  shine.position.z = 0.5;
  shine.position.x = 0.2;
  shine.position.y = 0.2;
  shine.scale.z = 0.1;
  blockMesh.add(shine);
}

// Add wooden wall details
function addWoodWallDetails(structureMesh) {
  // Add wooden planks
  for (let i = 0; i < 3; i++) {
    const plankGeometry = new THREE.BoxGeometry(config.BLOCK_SIZE * 0.9, 0.3, 0.1);
    const plankMaterial = new THREE.MeshBasicMaterial({ color: 0x6D4C41 });
    const plank = new THREE.Mesh(plankGeometry, plankMaterial);
    plank.position.z = 0.1;
    plank.position.y = -0.5 + i * 0.5;
    structureMesh.add(plank);
  }
}

// Add stone wall details
function addStoneWallDetails(structureMesh) {
  // Add stone bricks
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const brickGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.1);
      const brickMaterial = new THREE.MeshBasicMaterial({ color: 0x616161 });
      const brick = new THREE.Mesh(brickGeometry, brickMaterial);
      brick.position.z = 0.1;
      brick.position.x = -0.25 + j * 0.5;
      brick.position.y = -0.75 + i * 0.5;
      structureMesh.add(brick);
    }
  }
}

// Add iron wall details
function addIronWallDetails(structureMesh) {
  // Add metal reinforcements
  for (let i = 0; i < 2; i++) {
    const reinforcementGeometry = new THREE.BoxGeometry(config.BLOCK_SIZE, 0.1, 0.1);
    const reinforcementMaterial = new THREE.MeshBasicMaterial({ color: 0x9E9E9E });
    const reinforcement = new THREE.Mesh(reinforcementGeometry, reinforcementMaterial);
    reinforcement.position.z = 0.1;
    reinforcement.position.y = -0.5 + i * 1;
    structureMesh.add(reinforcement);
  }
  
  // Add vertical reinforcements
  for (let i = 0; i < 2; i++) {
    const vReinforcementGeometry = new THREE.BoxGeometry(0.1, 2, 0.1);
    const vReinforcementMaterial = new THREE.MeshBasicMaterial({ color: 0x9E9E9E });
    const vReinforcement = new THREE.Mesh(vReinforcementGeometry, vReinforcementMaterial);
    vReinforcement.position.z = 0.1;
    vReinforcement.position.x = -0.4 + i * 0.8;
    structureMesh.add(vReinforcement);
  }
}

// Add environmental details (trees, rocks)
function addEnvironmentalDetails() {
  // Only add environmental details if they don't exist yet
  if (scene.children.find(child => child.userData.isEnvironment)) return;
  
  // Add trees
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * config.WORLD_SIZE) * config.BLOCK_SIZE;
    const y = Math.floor(Math.random() * config.WORLD_SIZE) * config.BLOCK_SIZE;
    
    // Skip if position is occupied
    if (!isPositionValid(x, y, config.BLOCK_SIZE)) continue;
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y, 0.75);
    trunk.userData = { isEnvironment: true };
    
    // Tree leaves
    const leavesGeometry = new THREE.SphereGeometry(0.8, 8, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.z = 1.5;
    trunk.add(leaves);
    
    scene.add(trunk);
  }
  
  // Add rocks
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * config.WORLD_SIZE) * config.BLOCK_SIZE;
    const y = Math.floor(Math.random() * config.WORLD_SIZE) * config.BLOCK_SIZE;
    
    // Skip if position is occupied
    if (!isPositionValid(x, y, config.BLOCK_SIZE * 0.5)) continue;
    
    const rockGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 8);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7F7F7F,
      roughness: 0.9,
      metalness: 0.1
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, y, 0.3);
    rock.scale.z = 0.5;
    rock.rotation.x = Math.random() * Math.PI;
    rock.rotation.y = Math.random() * Math.PI;
    rock.userData = { isEnvironment: true };
    
    scene.add(rock);
  }
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