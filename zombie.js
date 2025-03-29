import config from './config.js';
import * as THREE from 'three';

let zombies = {};
let zombieMeshes = {};
let room;
let scene;

// Initialize zombies
export function initZombies(worldScene) {
  room = new WebsimSocket();
  scene = worldScene; // Use the provided scene
}

// Spawn a new zombie
export function spawnZombie(zombieId, x, y) {
  if (zombies[zombieId]) return;
  
  const zombie = {
    id: zombieId,
    x,
    y,
    health: config.ZOMBIE_MAX_HEALTH,
    targetId: null // Will target the nearest player
  };
  
  zombies[zombieId] = zombie;
  
  // Create the zombie mesh
  createZombieMesh(zombieId, x, y);
  
  // Update the room state with the new zombie
  const zombieState = { ...room.roomState.zombies } || {};
  zombieState[zombieId] = zombie;
  room.updateRoomState({ zombies: zombieState });
}

// Create a zombie mesh
function createZombieMesh(zombieId, x, y) {
  const zombieGroup = new THREE.Group();
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2E8B57,
    roughness: 0.8,
    metalness: 0.2
  });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.position.z = 0.9;
  zombieGroup.add(bodyMesh);
  
  // Head
  const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2E8B57,
    roughness: 0.8,
    metalness: 0.2
  });
  const headMesh = new THREE.Mesh(headGeometry, headMaterial);
  headMesh.position.z = 2.0;
  zombieGroup.add(headMesh);
  
  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(0.2, 0.2, 2.1);
  zombieGroup.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(-0.2, 0.2, 2.1);
  zombieGroup.add(rightEye);
  
  // Arms (longer and more menacing)
  const armGeometry = new THREE.BoxGeometry(0.3, 0.3, 1);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
  
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.55, 0, 0.9);
  leftArm.rotation.x = -0.3;
  zombieGroup.add(leftArm);
  
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.55, 0, 0.9);
  rightArm.rotation.x = -0.3;
  zombieGroup.add(rightArm);
  
  // Legs
  const legGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.9);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
  
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.25, 0, 0.45);
  zombieGroup.add(leftLeg);
  
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.25, 0, 0.45);
  zombieGroup.add(rightLeg);
  
  zombieGroup.position.x = x;
  zombieGroup.position.y = y;
  
  zombieMeshes[zombieId] = zombieGroup;
  scene.add(zombieGroup);
}

// Update zombies
export function updateZombies(deltaTime, roomInstance) {
  room = roomInstance;
  
  // Update zombie positions based on room state
  if (room.roomState.zombies) {
    zombies = room.roomState.zombies;
  }
  
  // Only the "host" player (first connected) updates zombie behavior
  if (isHostPlayer()) {
    const updatedZombies = { ...zombies };
    
    for (const zombieId in zombies) {
      const zombie = zombies[zombieId];
      if (!zombie) continue;
      
      // Find nearest player to target
      const targetPlayer = findNearestPlayer(zombie);
      
      if (targetPlayer) {
        // Move towards target player
        const dirX = targetPlayer.x - zombie.x;
        const dirY = targetPlayer.y - zombie.y;
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);
        
        if (distance > 0) {
          const normalizedDirX = dirX / distance;
          const normalizedDirY = dirY / distance;
          
          const newX = zombie.x + normalizedDirX * config.ZOMBIE_SPEED * deltaTime;
          const newY = zombie.y + normalizedDirY * config.ZOMBIE_SPEED * deltaTime;
          
          // Check collision before moving
          const { isPositionValid } = await import('./world.js');
          if (isPositionValid(newX, newY, config.ZOMBIE_SIZE)) {
            updatedZombies[zombieId] = {
              ...zombie,
              x: newX,
              y: newY,
              targetId: targetPlayer.id
            };
          }
          
          // Attack player if close enough
          if (distance < 1.5) {
            attackPlayer(targetPlayer.id);
          }
        }
      }
    }
    
    // Update room state with zombie positions
    room.updateRoomState({ zombies: updatedZombies });
  }
}

// Render zombies
export function renderZombies() {
  // Create meshes for new zombies
  for (const zombieId in zombies) {
    const zombie = zombies[zombieId];
    if (!zombie) continue;
    
    if (!zombieMeshes[zombieId]) {
      createZombieMesh(zombieId, zombie.x, zombie.y);
    }
    
    // Update zombie positions
    if (zombieMeshes[zombieId]) {
      zombieMeshes[zombieId].position.x = zombie.x;
      zombieMeshes[zombieId].position.y = zombie.y;
    }
  }
  
  // Remove meshes for deleted zombies
  for (const zombieId in zombieMeshes) {
    if (!zombies[zombieId]) {
      scene.remove(zombieMeshes[zombieId]);
      delete zombieMeshes[zombieId];
    }
  }
}

// Find the nearest player to a zombie
function findNearestPlayer(zombie) {
  let nearestPlayer = null;
  let minDistance = Infinity;
  
  for (const clientId in room.presence) {
    const player = room.presence[clientId];
    if (!player || player.dead) continue;
    
    const distance = Math.sqrt(
      Math.pow(player.x - zombie.x, 2) + 
      Math.pow(player.y - zombie.y, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestPlayer = {
        ...player,
        id: clientId
      };
    }
  }
  
  return nearestPlayer;
}

// Attack a player
function attackPlayer(playerId) {
  room.requestPresenceUpdate(playerId, {
    type: 'damage',
    damage: config.ZOMBIE_DAMAGE
  });
}

// Damage a zombie
export function damageZombie(zombieId, damage) {
  if (!zombies[zombieId]) return;
  
  const updatedZombies = { ...zombies };
  const zombie = { ...updatedZombies[zombieId] };
  zombie.health -= damage;
  
  if (zombie.health <= 0) {
    // Zombie is dead
    updatedZombies[zombieId] = null;
  } else {
    updatedZombies[zombieId] = zombie;
  }
  
  room.updateRoomState({ zombies: updatedZombies });
}

// Check if current player is the "host" (first connected player)
function isHostPlayer() {
  const clientIds = Object.keys(room.peers);
  return clientIds.length > 0 && clientIds[0] === room.clientId;
}