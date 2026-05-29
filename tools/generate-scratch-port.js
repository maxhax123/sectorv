const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const scratchDir = path.join(root, "scratch");
const buildDir = path.join(scratchDir, "build");
const packageDir = path.join(scratchDir, "package");

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function md5(buffer) {
  return crypto.createHash("md5").update(buffer).digest("hex");
}

function writeAsset(name, ext, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  const assetId = md5(buffer);
  const fileName = `${assetId}.${ext}`;
  fs.writeFileSync(path.join(packageDir, fileName), buffer);
  return {
    assetId,
    md5ext: fileName,
    dataFormat: ext,
    name
  };
}

function evaluateLiteral(source, openToken) {
  const start = source.indexOf(openToken);
  if (start < 0) {
    throw new Error(`Unable to locate section starting with ${openToken}`);
  }
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  let begin = -1;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === "{" || char === "[") {
      if (begin === -1) begin = i;
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0 && begin !== -1) {
        const literal = source.slice(begin, i + 1);
        return Function(`"use strict"; return (${literal});`)();
      }
    }
  }
  throw new Error(`Unable to parse literal for ${openToken}`);
}

function extractData(source) {
  const bosses = evaluateLiteral(source, "const bosses =");
  const saveSlots = evaluateLiteral(source, "const saveFileSlotDefs =");
  const ultimates = evaluateLiteral(source, "const attackLoadoutDefs =");
  const xlBullets = evaluateLiteral(source, "const xlBulletDefs =");
  const primaryBullets = evaluateLiteral(source, "const primaryBulletDefs =");
  const supportUpgrades = evaluateLiteral(source, "const supportManagementDefs =");
  const achievements = evaluateLiteral(source, "const achievementDefs =");
  const secretAchievements = evaluateLiteral(source, "const secretAchievementDefs =");
  const challenges = evaluateLiteral(source, "const challengeDefs =");

  return {
    bosses,
    saveSlots,
    ultimates,
    xlBullets,
    primaryBullets,
    supportUpgrades,
    achievements,
    secretAchievements,
    challenges
  };
}

function bossHpSeries(count) {
  return Array.from({ length: count }, (_, index) => 180 + index * 35);
}

function bossSpeedSeries(count) {
  return Array.from({ length: count }, (_, index) => 3 + (index % 4));
}

function bossFireModeSeries(count) {
  return Array.from({ length: count }, (_, index) => (index % 5) + 1);
}

function bossFireDelaySeries(count) {
  return Array.from({ length: count }, (_, index) => Number((0.65 - Math.min(index, 10) * 0.02).toFixed(2)));
}

function bossProjectileSpeedSeries(count) {
  return Array.from({ length: count }, (_, index) => 7 + (index % 6));
}

function createBackdropSvg(title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#081118"/>
      <stop offset="55%" stop-color="#10293b"/>
      <stop offset="100%" stop-color="#28180e"/>
    </linearGradient>
    <radialGradient id="vortex" cx="50%" cy="48%" r="46%">
      <stop offset="0%" stop-color="#b8ffff" stop-opacity="0.95"/>
      <stop offset="26%" stop-color="#6fe8eb" stop-opacity="0.48"/>
      <stop offset="100%" stop-color="#6fe8eb" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="480" height="360" fill="url(#bg)"/>
  <circle cx="240" cy="170" r="140" fill="url(#vortex)"/>
  <g fill="#d6f7ff" opacity="0.8">
    <circle cx="58" cy="44" r="1.8"/>
    <circle cx="84" cy="124" r="1.2"/>
    <circle cx="132" cy="82" r="2.1"/>
    <circle cx="388" cy="58" r="1.6"/>
    <circle cx="424" cy="88" r="2"/>
    <circle cx="358" cy="122" r="1.2"/>
    <circle cx="446" cy="216" r="1.5"/>
    <circle cx="98" cy="314" r="1.7"/>
    <circle cx="32" cy="278" r="1.4"/>
  </g>
  <text x="240" y="44" text-anchor="middle" fill="#ecffff" font-size="24" font-family="Trebuchet MS, Verdana, sans-serif" letter-spacing="3">${title}</text>
  <text x="240" y="70" text-anchor="middle" fill="#91deea" font-size="11" font-family="Trebuchet MS, Verdana, sans-serif" letter-spacing="2">Scratch Logic Port Scaffold</text>
  <rect x="52" y="286" width="376" height="48" rx="18" fill="#050c15" fill-opacity="0.62" stroke="#62dce0" stroke-width="1.4"/>
  <text x="240" y="306" text-anchor="middle" fill="#dffbff" font-size="12" font-family="Trebuchet MS, Verdana, sans-serif">Left and Right choose boss. Up and Down choose challenge. Enter starts battle.</text>
  <text x="240" y="322" text-anchor="middle" fill="#89dfe8" font-size="11" font-family="Trebuchet MS, Verdana, sans-serif">This build carries every boss, challenge, loadout, support upgrade, save slot, and achievement title from the HTML source into Scratch data.</text>
</svg>`;
}

function createPlayerSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="ship" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#12c7df"/>
      <stop offset="100%" stop-color="#effcff"/>
    </linearGradient>
  </defs>
  <polygon points="32,4 54,56 32,46 10,56" fill="url(#ship)" stroke="#062f39" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="32,14 40,42 32,38 24,42" fill="#0b2931" opacity="0.8"/>
  <circle cx="32" cy="23" r="5" fill="#f4fbff"/>
</svg>`;
}

function createBossSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="boss" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffad3"/>
      <stop offset="38%" stop-color="#d9ff6c"/>
      <stop offset="100%" stop-color="#536716"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="38" fill="url(#boss)" stroke="#10150d" stroke-width="7"/>
  <circle cx="60" cy="60" r="16" fill="#ffffff" fill-opacity="0.9"/>
  <path d="M60 6 L76 32 L108 28 L92 56 L112 82 L80 84 L60 112 L40 84 L8 82 L28 56 L12 28 L44 32 Z" fill="none" stroke="#d9ff96" stroke-width="5" stroke-linejoin="round" opacity="0.92"/>
</svg>`;
}

function createShotSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="36" viewBox="0 0 20 36">
  <rect x="7" y="2" width="6" height="30" rx="3" fill="#d9fbff" stroke="#18b0d4" stroke-width="2"/>
  <circle cx="10" cy="8" r="4" fill="#ffffff" opacity="0.8"/>
</svg>`;
}

function createEnemyShotSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <circle cx="11" cy="11" r="8" fill="#ffb870" stroke="#582d0f" stroke-width="3"/>
  <circle cx="11" cy="11" r="3" fill="#fff2d8"/>
</svg>`;
}

function createMenuCursorSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <path d="M18 2 L26 12 L18 34 L10 12 Z" fill="#9af4ff" stroke="#09363d" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
}

function createIdFactory(prefix) {
  let index = 0;
  return () => `${prefix}_${++index}`;
}

function addBlock(blocks, idFactory, config) {
  const id = idFactory();
  blocks[id] = {
    opcode: config.opcode,
    next: config.next ?? null,
    parent: config.parent ?? null,
    inputs: config.inputs ?? {},
    fields: config.fields ?? {},
    shadow: Boolean(config.shadow),
    topLevel: Boolean(config.topLevel)
  };
  if (config.topLevel) {
    blocks[id].x = config.x ?? 0;
    blocks[id].y = config.y ?? 0;
  }
  return id;
}

function setNext(blocks, from, to) {
  blocks[from].next = to;
}

function numberInput(value) {
  return [1, [4, String(value)]];
}

function textInput(value) {
  return [1, [10, String(value)]];
}

function blockInput(blockId) {
  return [2, blockId];
}

function menuBlock(blocks, makeId, opcode, parent, fieldName, fieldValue) {
  return addBlock(blocks, makeId, {
    opcode,
    parent,
    fields: { [fieldName]: fieldValue },
    shadow: true
  });
}

function variableReporter(blocks, makeId, parent, variableName, variableId) {
  return addBlock(blocks, makeId, {
    opcode: "data_variable",
    parent,
    fields: {
      VARIABLE: [variableName, variableId]
    }
  });
}

function listItemReporter(blocks, makeId, parent, listName, listId, indexRef) {
  return addBlock(blocks, makeId, {
    opcode: "data_itemoflist",
    parent,
    fields: {
      LIST: [listName, listId]
    },
    inputs: {
      INDEX: indexRef
    }
  });
}

function compareBlock(blocks, makeId, opcode, parent, left, right) {
  return addBlock(blocks, makeId, {
    opcode,
    parent,
    inputs: {
      OPERAND1: left,
      OPERAND2: right
    }
  });
}

function binaryBlock(blocks, makeId, opcode, parent, left, right) {
  return addBlock(blocks, makeId, {
    opcode,
    parent,
    inputs: {
      NUM1: left,
      NUM2: right
    }
  });
}

function joinBlock(blocks, makeId, parent, left, right) {
  return addBlock(blocks, makeId, {
    opcode: "operator_join",
    parent,
    inputs: {
      STRING1: left,
      STRING2: right
    }
  });
}

function keyPressed(blocks, makeId, parent, key) {
  return addBlock(blocks, makeId, {
    opcode: "sensing_keypressed",
    parent,
    fields: {
      KEY_OPTION: [key, null]
    }
  });
}

function touchingObject(blocks, makeId, parent, targetName, targetId) {
  const blockId = addBlock(blocks, makeId, {
    opcode: "sensing_touchingobject",
    parent
  });
  const menuId = menuBlock(blocks, makeId, "sensing_touchingobjectmenu", blockId, "TOUCHINGOBJECTMENU", [targetName, targetId]);
  blocks[blockId].inputs.TOUCHINGOBJECTMENU = [1, menuId];
  return blockId;
}

function xPosition(blocks, makeId, parent) {
  return addBlock(blocks, makeId, { opcode: "motion_xposition", parent });
}

function yPosition(blocks, makeId, parent) {
  return addBlock(blocks, makeId, { opcode: "motion_yposition", parent });
}

function createTargetBase({ isStage, name, costumes, layerOrder, x = 0, y = 0, size = 100, visible = true, direction = 90, rotationStyle = "all around" }) {
  return {
    isStage,
    name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes,
    sounds: [],
    volume: 100,
    layerOrder,
    ...(isStage
      ? {
          tempo: 60,
          videoTransparency: 50,
          videoState: "on",
          textToSpeechLanguage: null
        }
      : {
          visible,
          x,
          y,
          size,
          direction,
          draggable: false,
          rotationStyle
        })
  };
}

function buildStageTarget(assets, metadata, ids) {
  const target = createTargetBase({
    isStage: true,
    name: "Stage",
    layerOrder: 0,
    costumes: [
      {
        ...assets.backdrop,
        bitmapResolution: 1,
        rotationCenterX: 240,
        rotationCenterY: 180
      }
    ]
  });

  const { bosses, challenges, ultimates, xlBullets, primaryBullets, supportUpgrades, achievements, secretAchievements, saveSlots } = metadata;
  const bossHpValues = bossHpSeries(bosses.length);
  const bossSpeeds = bossSpeedSeries(bosses.length);
  const bossFireModes = bossFireModeSeries(bosses.length);
  const bossFireDelays = bossFireDelaySeries(bosses.length);
  const bossProjectileSpeeds = bossProjectileSpeedSeries(bosses.length);

  target.variables = {
    [ids.variables.gameState]: ["Game State", "menu"],
    [ids.variables.currentBossIndex]: ["Boss Index", 1],
    [ids.variables.currentBossName]: ["Current Boss", bosses[0].name],
    [ids.variables.currentBossTeaser]: ["Boss Teaser", bosses[0].teaser],
    [ids.variables.bossHP]: ["Boss HP", bossHpValues[0]],
    [ids.variables.bossMaxHP]: ["Boss Max HP", bossHpValues[0]],
    [ids.variables.bossVX]: ["Boss VX", bossSpeeds[0]],
    [ids.variables.bossFireMode]: ["Boss Fire Mode", bossFireModes[0]],
    [ids.variables.bossFireDelay]: ["Boss Fire Delay", bossFireDelays[0]],
    [ids.variables.bossProjectileSpeed]: ["Boss Projectile Speed", bossProjectileSpeeds[0]],
    [ids.variables.score]: ["Score", 0],
    [ids.variables.playerHP]: ["Player HP", 5],
    [ids.variables.challengeIndex]: ["Challenge Index", 1],
    [ids.variables.challengeName]: ["Challenge", Object.values(challenges)[0].name],
    [ids.variables.operationsFunds]: ["Operations Funds", 0],
    [ids.variables.selectedUltimate]: ["Ultimate", Object.values(ultimates)[0].name],
    [ids.variables.selectedXL]: ["XL Loadout", Object.values(xlBullets)[0].name],
    [ids.variables.selectedPrimary]: ["Primary", Object.values(primaryBullets)[0].name],
    [ids.variables.selectedSupport]: ["Support", Object.values(supportUpgrades)[0].name]
  };

  target.lists = {
    [ids.lists.bossNames]: ["Boss Names", bosses.map((boss) => boss.name)],
    [ids.lists.bossTeasers]: ["Boss Teasers", bosses.map((boss) => boss.teaser)],
    [ids.lists.bossHPValues]: ["Boss HP Values", bossHpValues],
    [ids.lists.bossSpeedValues]: ["Boss Speed Values", bossSpeeds],
    [ids.lists.bossFireModes]: ["Boss Fire Modes", bossFireModes],
    [ids.lists.bossFireDelays]: ["Boss Fire Delays", bossFireDelays],
    [ids.lists.bossProjectileSpeeds]: ["Boss Projectile Speeds", bossProjectileSpeeds],
    [ids.lists.challengeNames]: ["Challenge Names", Object.values(challenges).map((entry) => entry.name)],
    [ids.lists.challengeDescriptions]: ["Challenge Descriptions", Object.values(challenges).map((entry) => entry.desc)],
    [ids.lists.ultimateNames]: ["Ultimate Names", Object.values(ultimates).map((entry) => entry.name)],
    [ids.lists.xlNames]: ["XL Names", Object.values(xlBullets).map((entry) => entry.name)],
    [ids.lists.primaryNames]: ["Primary Names", Object.values(primaryBullets).map((entry) => entry.name)],
    [ids.lists.supportNames]: ["Support Names", Object.values(supportUpgrades).map((entry) => entry.name)],
    [ids.lists.achievementTitles]: ["Achievement Titles", Object.values(achievements).map((entry) => entry.title)],
    [ids.lists.secretAchievementTitles]: ["Secret Achievement Titles", Object.values(secretAchievements).map((entry) => entry.title)],
    [ids.lists.saveSlotNames]: ["Save Slot Names", saveSlots.map((entry) => entry.defaultName)]
  };

  target.broadcasts = {
    [ids.broadcasts.refreshSelection]: "Refresh Selection",
    [ids.broadcasts.startBattle]: "Start Battle",
    [ids.broadcasts.playerHit]: "Player Hit",
    [ids.broadcasts.returnMenu]: "Return Menu"
  };

  const blocks = {};
  const makeId = createIdFactory("stageblock");

  const flag = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 48, y: 56 });
  const setMenu = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: flag,
    fields: { VARIABLE: ["Game State", ids.variables.gameState] },
    inputs: { VALUE: textInput("menu") }
  });
  setNext(blocks, flag, setMenu);
  const setBossIndex = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setMenu,
    fields: { VARIABLE: ["Boss Index", ids.variables.currentBossIndex] },
    inputs: { VALUE: numberInput(1) }
  });
  setNext(blocks, setMenu, setBossIndex);
  const setChallengeIndex = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setBossIndex,
    fields: { VARIABLE: ["Challenge Index", ids.variables.challengeIndex] },
    inputs: { VALUE: numberInput(1) }
  });
  setNext(blocks, setBossIndex, setChallengeIndex);
  const setScore = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setChallengeIndex,
    fields: { VARIABLE: ["Score", ids.variables.score] },
    inputs: { VALUE: numberInput(0) }
  });
  setNext(blocks, setChallengeIndex, setScore);
  const setPlayerHp = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setScore,
    fields: { VARIABLE: ["Player HP", ids.variables.playerHP] },
    inputs: { VALUE: numberInput(5) }
  });
  setNext(blocks, setScore, setPlayerHp);
  const broadcastRefresh = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: setPlayerHp });
  setNext(blocks, setPlayerHp, broadcastRefresh);
  const refreshMenu = menuBlock(blocks, makeId, "event_broadcast_menu", broadcastRefresh, "BROADCAST_OPTION", ["Refresh Selection", ids.broadcasts.refreshSelection]);
  blocks[broadcastRefresh].inputs.BROADCAST_INPUT = [1, refreshMenu];

  const refreshHat = addBlock(blocks, makeId, {
    opcode: "event_whenbroadcastreceived",
    topLevel: true,
    x: 48,
    y: 236,
    fields: { BROADCAST_OPTION: ["Refresh Selection", ids.broadcasts.refreshSelection] }
  });

  const bossIndexReporterA = variableReporter(blocks, makeId, refreshHat, "Boss Index", ids.variables.currentBossIndex);
  const bossNameItem = listItemReporter(blocks, makeId, refreshHat, "Boss Names", ids.lists.bossNames, blockInput(bossIndexReporterA));
  const setBossName = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: refreshHat,
    fields: { VARIABLE: ["Current Boss", ids.variables.currentBossName] },
    inputs: { VALUE: blockInput(bossNameItem) }
  });
  setNext(blocks, refreshHat, setBossName);

  const bossIndexReporterB = variableReporter(blocks, makeId, setBossName, "Boss Index", ids.variables.currentBossIndex);
  const bossTeaserItem = listItemReporter(blocks, makeId, setBossName, "Boss Teasers", ids.lists.bossTeasers, blockInput(bossIndexReporterB));
  const setBossTeaser = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setBossName,
    fields: { VARIABLE: ["Boss Teaser", ids.variables.currentBossTeaser] },
    inputs: { VALUE: blockInput(bossTeaserItem) }
  });
  setNext(blocks, setBossName, setBossTeaser);

  const bossIndexReporterC = variableReporter(blocks, makeId, setBossTeaser, "Boss Index", ids.variables.currentBossIndex);
  const bossMaxItem = listItemReporter(blocks, makeId, setBossTeaser, "Boss HP Values", ids.lists.bossHPValues, blockInput(bossIndexReporterC));
  const setBossMax = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setBossTeaser,
    fields: { VARIABLE: ["Boss Max HP", ids.variables.bossMaxHP] },
    inputs: { VALUE: blockInput(bossMaxItem) }
  });
  setNext(blocks, setBossTeaser, setBossMax);

  const bossMaxReporter = variableReporter(blocks, makeId, setBossMax, "Boss Max HP", ids.variables.bossMaxHP);
  const setBossHp = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setBossMax,
    fields: { VARIABLE: ["Boss HP", ids.variables.bossHP] },
    inputs: { VALUE: blockInput(bossMaxReporter) }
  });
  setNext(blocks, setBossMax, setBossHp);

  const bossIndexReporterD = variableReporter(blocks, makeId, setBossHp, "Boss Index", ids.variables.currentBossIndex);
  const speedItem = listItemReporter(blocks, makeId, setBossHp, "Boss Speed Values", ids.lists.bossSpeedValues, blockInput(bossIndexReporterD));
  const setBossVx = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setBossHp,
    fields: { VARIABLE: ["Boss VX", ids.variables.bossVX] },
    inputs: { VALUE: blockInput(speedItem) }
  });
  setNext(blocks, setBossHp, setBossVx);

  const bossIndexReporterE = variableReporter(blocks, makeId, setBossVx, "Boss Index", ids.variables.currentBossIndex);
  const fireModeItem = listItemReporter(blocks, makeId, setBossVx, "Boss Fire Modes", ids.lists.bossFireModes, blockInput(bossIndexReporterE));
  const setFireMode = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setBossVx,
    fields: { VARIABLE: ["Boss Fire Mode", ids.variables.bossFireMode] },
    inputs: { VALUE: blockInput(fireModeItem) }
  });
  setNext(blocks, setBossVx, setFireMode);

  const bossIndexReporterF = variableReporter(blocks, makeId, setFireMode, "Boss Index", ids.variables.currentBossIndex);
  const fireDelayItem = listItemReporter(blocks, makeId, setFireMode, "Boss Fire Delays", ids.lists.bossFireDelays, blockInput(bossIndexReporterF));
  const setFireDelay = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setFireMode,
    fields: { VARIABLE: ["Boss Fire Delay", ids.variables.bossFireDelay] },
    inputs: { VALUE: blockInput(fireDelayItem) }
  });
  setNext(blocks, setFireMode, setFireDelay);

  const bossIndexReporterG = variableReporter(blocks, makeId, setFireDelay, "Boss Index", ids.variables.currentBossIndex);
  const projectileSpeedItem = listItemReporter(blocks, makeId, setFireDelay, "Boss Projectile Speeds", ids.lists.bossProjectileSpeeds, blockInput(bossIndexReporterG));
  const setProjectileSpeed = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setFireDelay,
    fields: { VARIABLE: ["Boss Projectile Speed", ids.variables.bossProjectileSpeed] },
    inputs: { VALUE: blockInput(projectileSpeedItem) }
  });
  setNext(blocks, setFireDelay, setProjectileSpeed);

  const challengeIndexReporter = variableReporter(blocks, makeId, setProjectileSpeed, "Challenge Index", ids.variables.challengeIndex);
  const challengeItem = listItemReporter(blocks, makeId, setProjectileSpeed, "Challenge Names", ids.lists.challengeNames, blockInput(challengeIndexReporter));
  const setChallenge = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setProjectileSpeed,
    fields: { VARIABLE: ["Challenge", ids.variables.challengeName] },
    inputs: { VALUE: blockInput(challengeItem) }
  });
  setNext(blocks, setProjectileSpeed, setChallenge);

  const playerHitHat = addBlock(blocks, makeId, {
    opcode: "event_whenbroadcastreceived",
    topLevel: true,
    x: 432,
    y: 56,
    fields: { BROADCAST_OPTION: ["Player Hit", ids.broadcasts.playerHit] }
  });
  const hpDown = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: playerHitHat,
    fields: { VARIABLE: ["Player HP", ids.variables.playerHP] },
    inputs: { VALUE: numberInput(-1) }
  });
  setNext(blocks, playerHitHat, hpDown);
  const hpReporter = variableReporter(blocks, makeId, hpDown, "Player HP", ids.variables.playerHP);
  const isDead = compareBlock(blocks, makeId, "operator_lt", hpDown, blockInput(hpReporter), numberInput(1));
  const deadIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: hpDown,
    inputs: { CONDITION: blockInput(isDead) }
  });
  setNext(blocks, hpDown, deadIf);
  const setGameOver = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: deadIf,
    fields: { VARIABLE: ["Game State", ids.variables.gameState] },
    inputs: { VALUE: textInput("game_over") }
  });
  blocks[deadIf].inputs.SUBSTACK = blockInput(setGameOver);

  const foreverHat = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 432, y: 214 });
  const forever = addBlock(blocks, makeId, { opcode: "control_forever", parent: foreverHat });
  setNext(blocks, foreverHat, forever);
  const bossHpReporter = variableReporter(blocks, makeId, forever, "Boss HP", ids.variables.bossHP);
  const bossDead = compareBlock(blocks, makeId, "operator_lt", forever, blockInput(bossHpReporter), numberInput(1));
  const gameStateReporter = variableReporter(blocks, makeId, forever, "Game State", ids.variables.gameState);
  const running = compareBlock(blocks, makeId, "operator_equals", forever, blockInput(gameStateReporter), textInput("running"));
  const both = addBlock(blocks, makeId, {
    opcode: "operator_and",
    parent: forever,
    inputs: {
      OPERAND1: blockInput(running),
      OPERAND2: blockInput(bossDead)
    }
  });
  const winIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: forever,
    inputs: { CONDITION: blockInput(both) }
  });
  blocks[forever].inputs.SUBSTACK = blockInput(winIf);
  const setVictory = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: winIf,
    fields: { VARIABLE: ["Game State", ids.variables.gameState] },
    inputs: { VALUE: textInput("victory") }
  });
  blocks[winIf].inputs.SUBSTACK = blockInput(setVictory);
  const addFunds = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: setVictory,
    fields: { VARIABLE: ["Operations Funds", ids.variables.operationsFunds] },
    inputs: { VALUE: numberInput(100) }
  });
  setNext(blocks, setVictory, addFunds);

  target.blocks = blocks;
  return target;
}

function buildPlayerTarget(asset, ids) {
  const target = createTargetBase({
    isStage: false,
    name: "PlayerShip",
    layerOrder: 4,
    costumes: [{ ...asset, bitmapResolution: 1, rotationCenterX: 32, rotationCenterY: 32 }],
    x: 0,
    y: -128,
    size: 88,
    direction: 90,
    rotationStyle: "don't rotate"
  });
  const blocks = {};
  const makeId = createIdFactory("playerblock");

  const flag = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 42, y: 52 });
  const show = addBlock(blocks, makeId, { opcode: "looks_show", parent: flag });
  setNext(blocks, flag, show);
  const goto = addBlock(blocks, makeId, {
    opcode: "motion_gotoxy",
    parent: show,
    inputs: { X: numberInput(0), Y: numberInput(-128) }
  });
  setNext(blocks, show, goto);
  const rotation = addBlock(blocks, makeId, {
    opcode: "motion_setrotationstyle",
    parent: goto,
    fields: { STYLE: ["don't rotate", null] }
  });
  setNext(blocks, goto, rotation);
  const forever = addBlock(blocks, makeId, { opcode: "control_forever", parent: rotation });
  setNext(blocks, rotation, forever);

  const stateReporter = variableReporter(blocks, makeId, forever, "Game State", ids.variables.gameState);
  const running = compareBlock(blocks, makeId, "operator_equals", forever, blockInput(stateReporter), textInput("running"));
  const activeIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: forever,
    inputs: { CONDITION: blockInput(running) }
  });
  blocks[forever].inputs.SUBSTACK = blockInput(activeIf);

  const leftIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  blocks[activeIf].inputs.SUBSTACK = blockInput(leftIf);
  blocks[leftIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, leftIf, "left arrow"));
  blocks[leftIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_changexby",
    parent: leftIf,
    inputs: { DX: numberInput(-8) }
  }));

  const rightIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, leftIf, rightIf);
  blocks[rightIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, rightIf, "right arrow"));
  blocks[rightIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_changexby",
    parent: rightIf,
    inputs: { DX: numberInput(8) }
  }));

  const upIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, rightIf, upIf);
  blocks[upIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, upIf, "up arrow"));
  blocks[upIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_changeyby",
    parent: upIf,
    inputs: { DY: numberInput(7) }
  }));

  const downIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, upIf, downIf);
  blocks[downIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, downIf, "down arrow"));
  blocks[downIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_changeyby",
    parent: downIf,
    inputs: { DY: numberInput(-7) }
  }));

  const xGtIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, downIf, xGtIf);
  const xPosA = xPosition(blocks, makeId, xGtIf);
  blocks[xGtIf].inputs.CONDITION = blockInput(compareBlock(blocks, makeId, "operator_gt", xGtIf, blockInput(xPosA), numberInput(220)));
  blocks[xGtIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_setx",
    parent: xGtIf,
    inputs: { X: numberInput(220) }
  }));

  const xLtIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, xGtIf, xLtIf);
  const xPosB = xPosition(blocks, makeId, xLtIf);
  blocks[xLtIf].inputs.CONDITION = blockInput(compareBlock(blocks, makeId, "operator_lt", xLtIf, blockInput(xPosB), numberInput(-220)));
  blocks[xLtIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_setx",
    parent: xLtIf,
    inputs: { X: numberInput(-220) }
  }));

  const yGtIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, xLtIf, yGtIf);
  const yPosA = yPosition(blocks, makeId, yGtIf);
  blocks[yGtIf].inputs.CONDITION = blockInput(compareBlock(blocks, makeId, "operator_gt", yGtIf, blockInput(yPosA), numberInput(156)));
  blocks[yGtIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_sety",
    parent: yGtIf,
    inputs: { Y: numberInput(156) }
  }));

  const yLtIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, yGtIf, yLtIf);
  const yPosB = yPosition(blocks, makeId, yLtIf);
  blocks[yLtIf].inputs.CONDITION = blockInput(compareBlock(blocks, makeId, "operator_lt", yLtIf, blockInput(yPosB), numberInput(-156)));
  blocks[yLtIf].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_sety",
    parent: yLtIf,
    inputs: { Y: numberInput(-156) }
  }));

  const shootIf = addBlock(blocks, makeId, { opcode: "control_if", parent: activeIf });
  setNext(blocks, yLtIf, shootIf);
  blocks[shootIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, shootIf, "space"));
  const fireBroadcast = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: shootIf });
  blocks[shootIf].inputs.SUBSTACK = blockInput(fireBroadcast);
  const fireMenu = menuBlock(blocks, makeId, "event_broadcast_menu", fireBroadcast, "BROADCAST_OPTION", ["Fire", ids.broadcasts.fire]);
  blocks[fireBroadcast].inputs.BROADCAST_INPUT = [1, fireMenu];
  const wait = addBlock(blocks, makeId, {
    opcode: "control_wait",
    parent: fireBroadcast,
    inputs: { DURATION: numberInput(0.12) }
  });
  setNext(blocks, fireBroadcast, wait);

  target.blocks = blocks;
  return target;
}

function buildBossTarget(asset, ids) {
  const target = createTargetBase({
    isStage: false,
    name: "BossCore",
    layerOrder: 3,
    costumes: [{ ...asset, bitmapResolution: 1, rotationCenterX: 60, rotationCenterY: 60 }],
    x: 0,
    y: 104,
    size: 112,
    direction: 90
  });
  const blocks = {};
  const makeId = createIdFactory("bossblock");

  const flag = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 44, y: 60 });
  const hide = addBlock(blocks, makeId, { opcode: "looks_hide", parent: flag });
  setNext(blocks, flag, hide);

  const startHat = addBlock(blocks, makeId, {
    opcode: "event_whenbroadcastreceived",
    topLevel: true,
    x: 44,
    y: 164,
    fields: { BROADCAST_OPTION: ["Start Battle", ids.broadcasts.startBattle] }
  });
  const show = addBlock(blocks, makeId, { opcode: "looks_show", parent: startHat });
  setNext(blocks, startHat, show);
  const goto = addBlock(blocks, makeId, {
    opcode: "motion_gotoxy",
    parent: show,
    inputs: { X: numberInput(0), Y: numberInput(104) }
  });
  setNext(blocks, show, goto);
  const say = addBlock(blocks, makeId, {
    opcode: "looks_sayforsecs",
    parent: goto,
    inputs: { MESSAGE: textInput("Target online"), SECS: numberInput(1.5) }
  });
  setNext(blocks, goto, say);

  const foreverHat = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 428, y: 60 });
  const forever = addBlock(blocks, makeId, { opcode: "control_forever", parent: foreverHat });
  setNext(blocks, foreverHat, forever);
  const stateReporter = variableReporter(blocks, makeId, forever, "Game State", ids.variables.gameState);
  const running = compareBlock(blocks, makeId, "operator_equals", forever, blockInput(stateReporter), textInput("running"));
  const hpReporter = variableReporter(blocks, makeId, forever, "Boss HP", ids.variables.bossHP);
  const alive = compareBlock(blocks, makeId, "operator_gt", forever, blockInput(hpReporter), numberInput(0));
  const active = addBlock(blocks, makeId, {
    opcode: "operator_and",
    parent: forever,
    inputs: { OPERAND1: blockInput(running), OPERAND2: blockInput(alive) }
  });
  const activeIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: forever,
    inputs: { CONDITION: blockInput(active) }
  });
  blocks[forever].inputs.SUBSTACK = blockInput(activeIf);
  const vxReporter = variableReporter(blocks, makeId, activeIf, "Boss VX", ids.variables.bossVX);
  const move = addBlock(blocks, makeId, {
    opcode: "motion_changexby",
    parent: activeIf,
    inputs: { DX: blockInput(vxReporter) }
  });
  blocks[activeIf].inputs.SUBSTACK = blockInput(move);

  const xPosA = xPosition(blocks, makeId, activeIf);
  const tooRight = compareBlock(blocks, makeId, "operator_gt", activeIf, blockInput(xPosA), numberInput(178));
  const rightIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: activeIf,
    inputs: { CONDITION: blockInput(tooRight) }
  });
  setNext(blocks, move, rightIf);
  const setRight = addBlock(blocks, makeId, {
    opcode: "motion_setx",
    parent: rightIf,
    inputs: { X: numberInput(178) }
  });
  blocks[rightIf].inputs.SUBSTACK = blockInput(setRight);
  const negateA = binaryBlock(blocks, makeId, "operator_subtract", setRight, numberInput(0), blockInput(variableReporter(blocks, makeId, setRight, "Boss VX", ids.variables.bossVX)));
  const setVxLeft = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: setRight,
    fields: { VARIABLE: ["Boss VX", ids.variables.bossVX] },
    inputs: { VALUE: blockInput(negateA) }
  });
  setNext(blocks, setRight, setVxLeft);

  const xPosB = xPosition(blocks, makeId, activeIf);
  const tooLeft = compareBlock(blocks, makeId, "operator_lt", activeIf, blockInput(xPosB), numberInput(-178));
  const leftIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: activeIf,
    inputs: { CONDITION: blockInput(tooLeft) }
  });
  setNext(blocks, rightIf, leftIf);
  const setLeft = addBlock(blocks, makeId, {
    opcode: "motion_setx",
    parent: leftIf,
    inputs: { X: numberInput(-178) }
  });
  blocks[leftIf].inputs.SUBSTACK = blockInput(setLeft);
  const absVx = compareBlock(blocks, makeId, "operator_lt", setLeft, blockInput(variableReporter(blocks, makeId, setLeft, "Boss VX", ids.variables.bossVX)), numberInput(0));
  const ifElse = addBlock(blocks, makeId, {
    opcode: "control_if_else",
    parent: setLeft,
    inputs: { CONDITION: blockInput(absVx) }
  });
  setNext(blocks, setLeft, ifElse);
  const negAgain = binaryBlock(blocks, makeId, "operator_subtract", ifElse, numberInput(0), blockInput(variableReporter(blocks, makeId, ifElse, "Boss VX", ids.variables.bossVX)));
  const setPositiveA = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: ifElse,
    fields: { VARIABLE: ["Boss VX", ids.variables.bossVX] },
    inputs: { VALUE: blockInput(negAgain) }
  });
  const keepPositive = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: ifElse,
    fields: { VARIABLE: ["Boss VX", ids.variables.bossVX] },
    inputs: { VALUE: blockInput(variableReporter(blocks, makeId, ifElse, "Boss VX", ids.variables.bossVX)) }
  });
  blocks[ifElse].inputs.SUBSTACK = blockInput(setPositiveA);
  blocks[ifElse].inputs.SUBSTACK2 = blockInput(keepPositive);

  target.blocks = blocks;
  return target;
}

function buildShotTarget(asset, ids) {
  const target = createTargetBase({
    isStage: false,
    name: "Shot",
    layerOrder: 5,
    costumes: [{ ...asset, bitmapResolution: 1, rotationCenterX: 10, rotationCenterY: 18 }],
    x: 0,
    y: -120,
    size: 72,
    visible: false,
    direction: 90
  });
  const blocks = {};
  const makeId = createIdFactory("shotblock");
  const flag = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 42, y: 56 });
  const hide = addBlock(blocks, makeId, { opcode: "looks_hide", parent: flag });
  setNext(blocks, flag, hide);

  const fireHat = addBlock(blocks, makeId, {
    opcode: "event_whenbroadcastreceived",
    topLevel: true,
    x: 42,
    y: 152,
    fields: { BROADCAST_OPTION: ["Fire", ids.broadcasts.fire] }
  });
  const makeClone = addBlock(blocks, makeId, { opcode: "control_create_clone_of", parent: fireHat });
  setNext(blocks, fireHat, makeClone);
  const cloneMenu = menuBlock(blocks, makeId, "control_create_clone_of_menu", makeClone, "CLONE_OPTION", ["myself", "_myself_"]);
  blocks[makeClone].inputs.CLONE_OPTION = [1, cloneMenu];

  const cloneHat = addBlock(blocks, makeId, { opcode: "control_start_as_clone", topLevel: true, x: 42, y: 244 });
  const show = addBlock(blocks, makeId, { opcode: "looks_show", parent: cloneHat });
  setNext(blocks, cloneHat, show);
  const goto = addBlock(blocks, makeId, { opcode: "motion_goto", parent: show });
  setNext(blocks, show, goto);
  const gotoMenu = menuBlock(blocks, makeId, "motion_goto_menu", goto, "TO", ["PlayerShip", ids.targets.player]);
  blocks[goto].inputs.TO = [1, gotoMenu];
  const offset = addBlock(blocks, makeId, {
    opcode: "motion_changeyby",
    parent: goto,
    inputs: { DY: numberInput(18) }
  });
  setNext(blocks, goto, offset);
  const repeat = addBlock(blocks, makeId, { opcode: "control_repeat_until", parent: offset });
  setNext(blocks, offset, repeat);
  const touchEdge = touchingObject(blocks, makeId, repeat, "_edge_", "_edge_");
  const touchBoss = touchingObject(blocks, makeId, repeat, "BossCore", ids.targets.boss);
  const stop = addBlock(blocks, makeId, {
    opcode: "operator_or",
    parent: repeat,
    inputs: { OPERAND1: blockInput(touchEdge), OPERAND2: blockInput(touchBoss) }
  });
  blocks[repeat].inputs.CONDITION = blockInput(stop);
  blocks[repeat].inputs.SUBSTACK = blockInput(addBlock(blocks, makeId, {
    opcode: "motion_changeyby",
    parent: repeat,
    inputs: { DY: numberInput(16) }
  }));
  const hitIf = addBlock(blocks, makeId, { opcode: "control_if", parent: repeat });
  setNext(blocks, repeat, hitIf);
  blocks[hitIf].inputs.CONDITION = blockInput(touchingObject(blocks, makeId, hitIf, "BossCore", ids.targets.boss));
  const hpDown = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: hitIf,
    fields: { VARIABLE: ["Boss HP", ids.variables.bossHP] },
    inputs: { VALUE: numberInput(-5) }
  });
  blocks[hitIf].inputs.SUBSTACK = blockInput(hpDown);
  const scoreUp = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: hpDown,
    fields: { VARIABLE: ["Score", ids.variables.score] },
    inputs: { VALUE: numberInput(1) }
  });
  setNext(blocks, hpDown, scoreUp);
  const deleteClone = addBlock(blocks, makeId, { opcode: "control_delete_this_clone", parent: hitIf });
  setNext(blocks, hitIf, deleteClone);
  target.blocks = blocks;
  return target;
}

function buildEnemyShotTarget(asset, ids) {
  const target = createTargetBase({
    isStage: false,
    name: "EnemyShot",
    layerOrder: 2,
    costumes: [{ ...asset, bitmapResolution: 1, rotationCenterX: 11, rotationCenterY: 11 }],
    x: 0,
    y: 100,
    size: 80,
    visible: false,
    direction: 180
  });
  const blocks = {};
  const makeId = createIdFactory("enemyblock");

  const flag = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 46, y: 56 });
  const hide = addBlock(blocks, makeId, { opcode: "looks_hide", parent: flag });
  setNext(blocks, flag, hide);
  const forever = addBlock(blocks, makeId, { opcode: "control_forever", parent: hide });
  setNext(blocks, hide, forever);
  const stateReporter = variableReporter(blocks, makeId, forever, "Game State", ids.variables.gameState);
  const running = compareBlock(blocks, makeId, "operator_equals", forever, blockInput(stateReporter), textInput("running"));
  const fireIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: forever,
    inputs: { CONDITION: blockInput(running) }
  });
  blocks[forever].inputs.SUBSTACK = blockInput(fireIf);
  const createClone = addBlock(blocks, makeId, { opcode: "control_create_clone_of", parent: fireIf });
  blocks[fireIf].inputs.SUBSTACK = blockInput(createClone);
  const cloneMenu = menuBlock(blocks, makeId, "control_create_clone_of_menu", createClone, "CLONE_OPTION", ["myself", "_myself_"]);
  blocks[createClone].inputs.CLONE_OPTION = [1, cloneMenu];
  const wait = addBlock(blocks, makeId, {
    opcode: "control_wait",
    parent: createClone,
    inputs: { DURATION: blockInput(variableReporter(blocks, makeId, createClone, "Boss Fire Delay", ids.variables.bossFireDelay)) }
  });
  setNext(blocks, createClone, wait);

  const cloneHat = addBlock(blocks, makeId, { opcode: "control_start_as_clone", topLevel: true, x: 46, y: 226 });
  const show = addBlock(blocks, makeId, { opcode: "looks_show", parent: cloneHat });
  setNext(blocks, cloneHat, show);
  const gotoBoss = addBlock(blocks, makeId, { opcode: "motion_goto", parent: show });
  setNext(blocks, show, gotoBoss);
  const gotoMenu = menuBlock(blocks, makeId, "motion_goto_menu", gotoBoss, "TO", ["BossCore", ids.targets.boss]);
  blocks[gotoBoss].inputs.TO = [1, gotoMenu];
  const point = addBlock(blocks, makeId, { opcode: "motion_pointtowards", parent: gotoBoss });
  setNext(blocks, gotoBoss, point);
  const pointMenu = menuBlock(blocks, makeId, "motion_pointtowards_menu", point, "TOWARDS", ["PlayerShip", ids.targets.player]);
  blocks[point].inputs.TOWARDS = [1, pointMenu];
  const repeat = addBlock(blocks, makeId, { opcode: "control_repeat_until", parent: point });
  setNext(blocks, point, repeat);
  const hitEdge = touchingObject(blocks, makeId, repeat, "_edge_", "_edge_");
  const hitPlayer = touchingObject(blocks, makeId, repeat, "PlayerShip", ids.targets.player);
  const stop = addBlock(blocks, makeId, {
    opcode: "operator_or",
    parent: repeat,
    inputs: { OPERAND1: blockInput(hitEdge), OPERAND2: blockInput(hitPlayer) }
  });
  blocks[repeat].inputs.CONDITION = blockInput(stop);
  const move = addBlock(blocks, makeId, {
    opcode: "motion_movesteps",
    parent: repeat,
    inputs: { STEPS: blockInput(variableReporter(blocks, makeId, repeat, "Boss Projectile Speed", ids.variables.bossProjectileSpeed)) }
  });
  blocks[repeat].inputs.SUBSTACK = blockInput(move);
  const hitIf = addBlock(blocks, makeId, { opcode: "control_if", parent: repeat });
  setNext(blocks, repeat, hitIf);
  blocks[hitIf].inputs.CONDITION = blockInput(touchingObject(blocks, makeId, hitIf, "PlayerShip", ids.targets.player));
  const playerHitBroadcast = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: hitIf });
  blocks[hitIf].inputs.SUBSTACK = blockInput(playerHitBroadcast);
  const playerHitMenu = menuBlock(blocks, makeId, "event_broadcast_menu", playerHitBroadcast, "BROADCAST_OPTION", ["Player Hit", ids.broadcasts.playerHit]);
  blocks[playerHitBroadcast].inputs.BROADCAST_INPUT = [1, playerHitMenu];
  const deleteClone = addBlock(blocks, makeId, { opcode: "control_delete_this_clone", parent: hitIf });
  setNext(blocks, hitIf, deleteClone);

  target.blocks = blocks;
  return target;
}

function buildMenuCursorTarget(asset, metadata, ids) {
  const target = createTargetBase({
    isStage: false,
    name: "MenuCursor",
    layerOrder: 6,
    costumes: [{ ...asset, bitmapResolution: 1, rotationCenterX: 18, rotationCenterY: 18 }],
    x: -190,
    y: 126,
    size: 60,
    visible: true,
    direction: 90,
    rotationStyle: "don't rotate"
  });
  const blocks = {};
  const makeId = createIdFactory("menublock");

  const flag = addBlock(blocks, makeId, { opcode: "event_whenflagclicked", topLevel: true, x: 40, y: 52 });
  const show = addBlock(blocks, makeId, { opcode: "looks_show", parent: flag });
  setNext(blocks, flag, show);
  const forever = addBlock(blocks, makeId, { opcode: "control_forever", parent: show });
  setNext(blocks, show, forever);
  const stateReporter = variableReporter(blocks, makeId, forever, "Game State", ids.variables.gameState);
  const menuMode = compareBlock(blocks, makeId, "operator_equals", forever, blockInput(stateReporter), textInput("menu"));
  const menuIf = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: forever,
    inputs: { CONDITION: blockInput(menuMode) }
  });
  blocks[forever].inputs.SUBSTACK = blockInput(menuIf);

  const leftIf = addBlock(blocks, makeId, { opcode: "control_if", parent: menuIf });
  blocks[menuIf].inputs.SUBSTACK = blockInput(leftIf);
  blocks[leftIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, leftIf, "left arrow"));
  const bossIndexDown = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: leftIf,
    fields: { VARIABLE: ["Boss Index", ids.variables.currentBossIndex] },
    inputs: { VALUE: numberInput(-1) }
  });
  blocks[leftIf].inputs.SUBSTACK = blockInput(bossIndexDown);
  const bossIndexReporterA = variableReporter(blocks, makeId, bossIndexDown, "Boss Index", ids.variables.currentBossIndex);
  const belowOne = compareBlock(blocks, makeId, "operator_lt", bossIndexDown, blockInput(bossIndexReporterA), numberInput(1));
  const wrapLeft = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: bossIndexDown,
    inputs: { CONDITION: blockInput(belowOne) }
  });
  setNext(blocks, bossIndexDown, wrapLeft);
  const setLastBoss = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: wrapLeft,
    fields: { VARIABLE: ["Boss Index", ids.variables.currentBossIndex] },
    inputs: { VALUE: numberInput(metadata.bosses.length) }
  });
  blocks[wrapLeft].inputs.SUBSTACK = blockInput(setLastBoss);
  const refreshA = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: setLastBoss });
  setNext(blocks, setLastBoss, refreshA);
  const refreshMenuA = menuBlock(blocks, makeId, "event_broadcast_menu", refreshA, "BROADCAST_OPTION", ["Refresh Selection", ids.broadcasts.refreshSelection]);
  blocks[refreshA].inputs.BROADCAST_INPUT = [1, refreshMenuA];
  const waitA = addBlock(blocks, makeId, {
    opcode: "control_wait",
    parent: refreshA,
    inputs: { DURATION: numberInput(0.18) }
  });
  setNext(blocks, refreshA, waitA);

  const rightIf = addBlock(blocks, makeId, { opcode: "control_if", parent: menuIf });
  setNext(blocks, leftIf, rightIf);
  blocks[rightIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, rightIf, "right arrow"));
  const bossIndexUp = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: rightIf,
    fields: { VARIABLE: ["Boss Index", ids.variables.currentBossIndex] },
    inputs: { VALUE: numberInput(1) }
  });
  blocks[rightIf].inputs.SUBSTACK = blockInput(bossIndexUp);
  const bossIndexReporterB = variableReporter(blocks, makeId, bossIndexUp, "Boss Index", ids.variables.currentBossIndex);
  const aboveLast = compareBlock(blocks, makeId, "operator_gt", bossIndexUp, blockInput(bossIndexReporterB), numberInput(metadata.bosses.length));
  const wrapRight = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: bossIndexUp,
    inputs: { CONDITION: blockInput(aboveLast) }
  });
  setNext(blocks, bossIndexUp, wrapRight);
  const setFirstBoss = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: wrapRight,
    fields: { VARIABLE: ["Boss Index", ids.variables.currentBossIndex] },
    inputs: { VALUE: numberInput(1) }
  });
  blocks[wrapRight].inputs.SUBSTACK = blockInput(setFirstBoss);
  const refreshB = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: setFirstBoss });
  setNext(blocks, setFirstBoss, refreshB);
  const refreshMenuB = menuBlock(blocks, makeId, "event_broadcast_menu", refreshB, "BROADCAST_OPTION", ["Refresh Selection", ids.broadcasts.refreshSelection]);
  blocks[refreshB].inputs.BROADCAST_INPUT = [1, refreshMenuB];
  const waitB = addBlock(blocks, makeId, { opcode: "control_wait", parent: refreshB, inputs: { DURATION: numberInput(0.18) } });
  setNext(blocks, refreshB, waitB);

  const upIf = addBlock(blocks, makeId, { opcode: "control_if", parent: menuIf });
  setNext(blocks, rightIf, upIf);
  blocks[upIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, upIf, "up arrow"));
  const challengeDown = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: upIf,
    fields: { VARIABLE: ["Challenge Index", ids.variables.challengeIndex] },
    inputs: { VALUE: numberInput(-1) }
  });
  blocks[upIf].inputs.SUBSTACK = blockInput(challengeDown);
  const challengeReporterA = variableReporter(blocks, makeId, challengeDown, "Challenge Index", ids.variables.challengeIndex);
  const challengeBelow = compareBlock(blocks, makeId, "operator_lt", challengeDown, blockInput(challengeReporterA), numberInput(1));
  const wrapChallengeUp = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: challengeDown,
    inputs: { CONDITION: blockInput(challengeBelow) }
  });
  setNext(blocks, challengeDown, wrapChallengeUp);
  const setLastChallenge = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: wrapChallengeUp,
    fields: { VARIABLE: ["Challenge Index", ids.variables.challengeIndex] },
    inputs: { VALUE: numberInput(Object.keys(metadata.challenges).length) }
  });
  blocks[wrapChallengeUp].inputs.SUBSTACK = blockInput(setLastChallenge);
  const refreshC = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: setLastChallenge });
  setNext(blocks, setLastChallenge, refreshC);
  const refreshMenuC = menuBlock(blocks, makeId, "event_broadcast_menu", refreshC, "BROADCAST_OPTION", ["Refresh Selection", ids.broadcasts.refreshSelection]);
  blocks[refreshC].inputs.BROADCAST_INPUT = [1, refreshMenuC];
  const waitC = addBlock(blocks, makeId, { opcode: "control_wait", parent: refreshC, inputs: { DURATION: numberInput(0.18) } });
  setNext(blocks, refreshC, waitC);

  const downIf = addBlock(blocks, makeId, { opcode: "control_if", parent: menuIf });
  setNext(blocks, upIf, downIf);
  blocks[downIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, downIf, "down arrow"));
  const challengeUp = addBlock(blocks, makeId, {
    opcode: "data_changevariableby",
    parent: downIf,
    fields: { VARIABLE: ["Challenge Index", ids.variables.challengeIndex] },
    inputs: { VALUE: numberInput(1) }
  });
  blocks[downIf].inputs.SUBSTACK = blockInput(challengeUp);
  const challengeReporterB = variableReporter(blocks, makeId, challengeUp, "Challenge Index", ids.variables.challengeIndex);
  const challengeAbove = compareBlock(blocks, makeId, "operator_gt", challengeUp, blockInput(challengeReporterB), numberInput(Object.keys(metadata.challenges).length));
  const wrapChallengeDown = addBlock(blocks, makeId, {
    opcode: "control_if",
    parent: challengeUp,
    inputs: { CONDITION: blockInput(challengeAbove) }
  });
  setNext(blocks, challengeUp, wrapChallengeDown);
  const setFirstChallenge = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: wrapChallengeDown,
    fields: { VARIABLE: ["Challenge Index", ids.variables.challengeIndex] },
    inputs: { VALUE: numberInput(1) }
  });
  blocks[wrapChallengeDown].inputs.SUBSTACK = blockInput(setFirstChallenge);
  const refreshD = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: setFirstChallenge });
  setNext(blocks, setFirstChallenge, refreshD);
  const refreshMenuD = menuBlock(blocks, makeId, "event_broadcast_menu", refreshD, "BROADCAST_OPTION", ["Refresh Selection", ids.broadcasts.refreshSelection]);
  blocks[refreshD].inputs.BROADCAST_INPUT = [1, refreshMenuD];
  const waitD = addBlock(blocks, makeId, { opcode: "control_wait", parent: refreshD, inputs: { DURATION: numberInput(0.18) } });
  setNext(blocks, refreshD, waitD);

  const enterIf = addBlock(blocks, makeId, { opcode: "control_if", parent: menuIf });
  setNext(blocks, downIf, enterIf);
  blocks[enterIf].inputs.CONDITION = blockInput(keyPressed(blocks, makeId, enterIf, "enter"));
  const startBroadcast = addBlock(blocks, makeId, { opcode: "event_broadcast", parent: enterIf });
  blocks[enterIf].inputs.SUBSTACK = blockInput(startBroadcast);
  const startMenu = menuBlock(blocks, makeId, "event_broadcast_menu", startBroadcast, "BROADCAST_OPTION", ["Start Battle", ids.broadcasts.startBattle]);
  blocks[startBroadcast].inputs.BROADCAST_INPUT = [1, startMenu];
  const waitStart = addBlock(blocks, makeId, { opcode: "control_wait", parent: startBroadcast, inputs: { DURATION: numberInput(0.25) } });
  setNext(blocks, startBroadcast, waitStart);

  const startHat = addBlock(blocks, makeId, {
    opcode: "event_whenbroadcastreceived",
    topLevel: true,
    x: 424,
    y: 52,
    fields: { BROADCAST_OPTION: ["Start Battle", ids.broadcasts.startBattle] }
  });
  const hideOnStart = addBlock(blocks, makeId, { opcode: "looks_hide", parent: startHat });
  setNext(blocks, startHat, hideOnStart);
  const setRunning = addBlock(blocks, makeId, {
    opcode: "data_setvariableto",
    parent: hideOnStart,
    fields: { VARIABLE: ["Game State", ids.variables.gameState] },
    inputs: { VALUE: textInput("running") }
  });
  setNext(blocks, hideOnStart, setRunning);

  const returnHat = addBlock(blocks, makeId, {
    opcode: "event_whenbroadcastreceived",
    topLevel: true,
    x: 424,
    y: 184,
    fields: { BROADCAST_OPTION: ["Return Menu", ids.broadcasts.returnMenu] }
  });
  const showOnReturn = addBlock(blocks, makeId, { opcode: "looks_show", parent: returnHat });
  setNext(blocks, returnHat, showOnReturn);

  target.blocks = blocks;
  return target;
}

function buildProject(metadata) {
  const assets = {
    backdrop: writeAsset("Sector V Arena", "svg", createBackdropSvg("Sector V: Chrono-Drift")),
    player: writeAsset("Player Ship", "svg", createPlayerSvg()),
    boss: writeAsset("Boss Core", "svg", createBossSvg()),
    shot: writeAsset("Player Shot", "svg", createShotSvg()),
    enemyShot: writeAsset("Enemy Shot", "svg", createEnemyShotSvg()),
    cursor: writeAsset("Menu Cursor", "svg", createMenuCursorSvg())
  };

  const ids = {
    targets: {
      stage: "target_stage",
      player: "target_player",
      boss: "target_boss",
      shot: "target_shot",
      enemyShot: "target_enemy_shot",
      menuCursor: "target_menu_cursor"
    },
    variables: {
      gameState: "var_game_state",
      currentBossIndex: "var_current_boss_index",
      currentBossName: "var_current_boss_name",
      currentBossTeaser: "var_current_boss_teaser",
      bossHP: "var_boss_hp",
      bossMaxHP: "var_boss_max_hp",
      bossVX: "var_boss_vx",
      bossFireMode: "var_boss_fire_mode",
      bossFireDelay: "var_boss_fire_delay",
      bossProjectileSpeed: "var_boss_projectile_speed",
      score: "var_score",
      playerHP: "var_player_hp",
      challengeIndex: "var_challenge_index",
      challengeName: "var_challenge_name",
      operationsFunds: "var_operations_funds",
      selectedUltimate: "var_selected_ultimate",
      selectedXL: "var_selected_xl",
      selectedPrimary: "var_selected_primary",
      selectedSupport: "var_selected_support"
    },
    lists: {
      bossNames: "list_boss_names",
      bossTeasers: "list_boss_teasers",
      bossHPValues: "list_boss_hp_values",
      bossSpeedValues: "list_boss_speed_values",
      bossFireModes: "list_boss_fire_modes",
      bossFireDelays: "list_boss_fire_delays",
      bossProjectileSpeeds: "list_boss_projectile_speeds",
      challengeNames: "list_challenge_names",
      challengeDescriptions: "list_challenge_descriptions",
      ultimateNames: "list_ultimate_names",
      xlNames: "list_xl_names",
      primaryNames: "list_primary_names",
      supportNames: "list_support_names",
      achievementTitles: "list_achievement_titles",
      secretAchievementTitles: "list_secret_achievement_titles",
      saveSlotNames: "list_save_slot_names"
    },
    broadcasts: {
      refreshSelection: "broadcast_refresh_selection",
      startBattle: "broadcast_start_battle",
      playerHit: "broadcast_player_hit",
      returnMenu: "broadcast_return_menu",
      fire: "broadcast_fire"
    }
  };

  const stage = buildStageTarget(assets, metadata, ids);
  stage.id = ids.targets.stage;
  const player = buildPlayerTarget(assets.player, ids);
  player.id = ids.targets.player;
  const boss = buildBossTarget(assets.boss, ids);
  boss.id = ids.targets.boss;
  const shot = buildShotTarget(assets.shot, ids);
  shot.id = ids.targets.shot;
  const enemyShot = buildEnemyShotTarget(assets.enemyShot, ids);
  enemyShot.id = ids.targets.enemyShot;
  const menuCursor = buildMenuCursorTarget(assets.cursor, metadata, ids);
  menuCursor.id = ids.targets.menuCursor;

  return {
    targets: [stage, player, boss, shot, enemyShot, menuCursor],
    monitors: [
      { id: ids.variables.currentBossName, mode: "default", opcode: "data_variable", params: { VARIABLE: "Current Boss" }, spriteName: null, value: metadata.bosses[0].name, width: 0, height: 0, x: 10, y: 8, visible: true },
      { id: ids.variables.challengeName, mode: "default", opcode: "data_variable", params: { VARIABLE: "Challenge" }, spriteName: null, value: Object.values(metadata.challenges)[0].name, width: 0, height: 0, x: 10, y: 36, visible: true },
      { id: ids.variables.gameState, mode: "default", opcode: "data_variable", params: { VARIABLE: "Game State" }, spriteName: null, value: "menu", width: 0, height: 0, x: 10, y: 64, visible: true },
      { id: ids.variables.bossHP, mode: "default", opcode: "data_variable", params: { VARIABLE: "Boss HP" }, spriteName: null, value: 180, width: 0, height: 0, x: 10, y: 92, visible: true },
      { id: ids.variables.playerHP, mode: "default", opcode: "data_variable", params: { VARIABLE: "Player HP" }, spriteName: null, value: 5, width: 0, height: 0, x: 10, y: 120, visible: true },
      { id: ids.variables.score, mode: "default", opcode: "data_variable", params: { VARIABLE: "Score" }, spriteName: null, value: 0, width: 0, height: 0, x: 10, y: 148, visible: true },
      { id: ids.variables.operationsFunds, mode: "default", opcode: "data_variable", params: { VARIABLE: "Operations Funds" }, spriteName: null, value: 0, width: 0, height: 0, x: 10, y: 176, visible: true }
    ],
    extensions: [],
    meta: {
      semver: "3.0.0",
      vm: "0.2.0",
      agent: "Codex"
    }
  };
}

function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const metadata = extractData(html);

  ensureCleanDir(buildDir);
  ensureCleanDir(packageDir);

  const project = buildProject(metadata);

  fs.writeFileSync(path.join(packageDir, "project.json"), `${JSON.stringify(project, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(buildDir, "port-data.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(buildDir, "port-summary.json"),
    `${JSON.stringify({
      bossCount: metadata.bosses.length,
      challengeCount: Object.keys(metadata.challenges).length,
      ultimateCount: Object.keys(metadata.ultimates).length,
      xlCount: Object.keys(metadata.xlBullets).length,
      primaryCount: Object.keys(metadata.primaryBullets).length,
      supportCount: Object.keys(metadata.supportUpgrades).length,
      achievementCount: Object.keys(metadata.achievements).length,
      secretAchievementCount: Object.keys(metadata.secretAchievements).length,
      saveSlotCount: metadata.saveSlots.length
    }, null, 2)}\n`,
    "utf8"
  );

  console.log(`Prepared Scratch package files in ${packageDir}`);
}

main();
