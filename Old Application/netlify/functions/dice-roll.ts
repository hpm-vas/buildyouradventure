import type { Handler, HandlerEvent } from "@netlify/functions";

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

interface DiceRollRequest {
  diceType: DiceType;
  diceCount: number;
  modifier?: number;
  difficulty: number;
  manualRolls?: number[];  // GM override: manually specify each die result
}

interface DiceRollResponse {
  rolls: number[];
  total: number;
  success: boolean;
  manualOverride: boolean;
}

// Get the maximum value for each dice type
function getDiceMax(diceType: DiceType): number {
  const maxValues: Record<DiceType, number> = {
    'd4': 4,
    'd6': 6,
    'd8': 8,
    'd10': 10,
    'd12': 12,
    'd20': 20,
    'd100': 100,
  };
  return maxValues[diceType];
}

// Validate that a dice type is valid
function isValidDiceType(type: string): type is DiceType {
  return ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].includes(type);
}

// Roll a single die
function rollDie(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Parse request
  let request: DiceRollRequest;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const { diceType, diceCount, modifier = 0, difficulty, manualRolls } = request;

  // Validate dice type
  if (!diceType || !isValidDiceType(diceType)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid dice type', 
        validTypes: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] 
      }),
    };
  }

  // Validate dice count
  if (!diceCount || diceCount < 1 || diceCount > 10) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Dice count must be between 1 and 10' }),
    };
  }

  // Validate difficulty
  if (typeof difficulty !== 'number') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Difficulty is required' }),
    };
  }

  const diceMax = getDiceMax(diceType);
  let rolls: number[];
  let manualOverride = false;

  // Check for manual override (GM input)
  if (manualRolls && Array.isArray(manualRolls) && manualRolls.length === diceCount) {
    // Validate each manual roll is within valid range
    const allValid = manualRolls.every(roll => 
      typeof roll === 'number' && roll >= 1 && roll <= diceMax
    );
    
    if (allValid) {
      rolls = manualRolls;
      manualOverride = true;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Manual rolls must be between 1 and ${diceMax} for ${diceType}` 
        }),
      };
    }
  } else {
    // Roll the dice server-side
    rolls = Array.from({ length: diceCount }, () => rollDie(diceMax));
  }

  // Calculate total
  const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
  const total = rollSum + modifier;
  const success = total >= difficulty;

  const response: DiceRollResponse = {
    rolls,
    total,
    success,
    manualOverride,
  };

  console.log(`Dice roll: ${diceCount}${diceType}${modifier >= 0 ? '+' : ''}${modifier} = [${rolls.join(', ')}] + ${modifier} = ${total} vs DC ${difficulty} → ${success ? 'SUCCESS' : 'FAILURE'}${manualOverride ? ' (GM Override)' : ''}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response),
  };
};

export { handler };
