// Vercel Serverless Function - Update Tracker via GitHub API
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify secret token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, questId, penaltyId, customAction, customXp, stats } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action required' });
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'ifeelalown';
    const REPO_NAME = 'DailyTracker';
    const FILE_PATH = 'public/data/tracker.json';

    // 1. Get current file content from GitHub
    const fileResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!fileResponse.ok) {
      throw new Error('Failed to fetch tracker file');
    }

    const fileData = await fileResponse.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    );

    // 2. Determine if it's weekend
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;

    // Quest and penalty definitions
    const quests = {
      steps: { title: '7000 Pas', xp: 15 },
      water: { title: 'Hydratation 2L', xp: 10 },
      workout: { title: 'Sport', xp: 20 },
      eatHealthy: { title: 'Manger Sain', xp: 15 },
      work: { title: isWeekend ? 'Travail 3-4h' : 'Travail 8h', xp: isWeekend ? 15 : 25 },
      reading: { title: 'Lecture 30min', xp: 15 },
      post: { title: '1 Post', xp: 20 },
      noPhoneWake: { title: 'Réveil Sans Tel', xp: 10 },
      noPhoneSleep: { title: 'Coucher Sans Tel', xp: 10 },
    };

    const penalties = {
      missedSteps: { title: 'Pas de 7000 pas', xp: -40 },
      noWater: { title: 'Pas assez d\'eau', xp: -30 },
      missedWorkout: { title: 'Pas de sport', xp: -50 },
      junkFood: { title: 'Junk food', xp: -45 },
      noWork: { title: isWeekend ? 'Pas travaillé 3-4h' : 'Pas travaillé 8h', xp: isWeekend ? -35 : -60 },
      noReading: { title: 'Pas de lecture', xp: -35 },
      noPost: { title: 'Pas de post', xp: -40 },
      phoneWake: { title: 'Tel au réveil', xp: -40 },
      phoneSleep: { title: 'Tel au coucher', xp: -40 },
      procrastination: { title: 'Procrastination', xp: -50 },
      stayedUpLate: { title: 'Couché après minuit', xp: -35 },
    };

    let xpChange = 0;
    let actionTitle = '';

    // Initialize stats if not present
    if (!currentContent.stats) {
      currentContent.stats = {
        steps: 0,
        workouts: 0,
        workHours: 0,
        readingMins: 0,
        posts: 0,
        sleepHours: 0
      };
    }
    if (!currentContent.daysTracked) currentContent.daysTracked = 0;
    if (!currentContent.questsCompleted) currentContent.questsCompleted = 0;
    if (!currentContent.questsTotal) currentContent.questsTotal = 0;

    // 3. Process the action
    if (action === 'quest' && questId && quests[questId]) {
      if (!currentContent.completedToday.includes(questId)) {
        currentContent.completedToday.push(questId);
        xpChange = quests[questId].xp;
        actionTitle = quests[questId].title;
        currentContent.questsCompleted++;
        currentContent.questsTotal++;
      } else {
        return res.status(200).json({ message: 'Quest already completed today', xp: currentContent.xp });
      }
    } else if (action === 'penalty' && penaltyId && penalties[penaltyId]) {
      if (!currentContent.penaltiesToday.includes(penaltyId)) {
        currentContent.penaltiesToday.push(penaltyId);
        xpChange = penalties[penaltyId].xp;
        actionTitle = penalties[penaltyId].title;
        currentContent.questsTotal++;
      } else {
        return res.status(200).json({ message: 'Penalty already applied today', xp: currentContent.xp });
      }
    } else if (action === 'stats' && stats) {
      // Update daily stats (steps, workHours, readingMins, sleepHours, etc.)
      if (stats.steps) currentContent.stats.steps += stats.steps;
      if (stats.workouts) currentContent.stats.workouts += stats.workouts;
      if (stats.workHours) currentContent.stats.workHours += stats.workHours;
      if (stats.readingMins) currentContent.stats.readingMins += stats.readingMins;
      if (stats.posts) currentContent.stats.posts += stats.posts;
      if (stats.sleepHours) currentContent.stats.sleepHours += stats.sleepHours;
      actionTitle = 'Stats mises à jour';
    } else if (action === 'newday') {
      // Start a new day - increment daysTracked and reset daily completions
      currentContent.daysTracked++;
      currentContent.completedToday = [];
      currentContent.penaltiesToday = [];
      actionTitle = 'Nouveau jour';
    } else if (action === 'custom' && customAction) {
      xpChange = customXp || 0;
      actionTitle = customAction;
    } else if (action === 'reset') {
      // Full reset
      currentContent.completedToday = [];
      currentContent.penaltiesToday = [];
      actionTitle = 'Reset journalier';
    } else {
      return res.status(400).json({ error: 'Invalid action or missing parameters' });
    }

    // 4. Update XP
    currentContent.xp = Math.max(0, (currentContent.xp || 0) + xpChange);

    // 5. Calculate new level
    const calculateLevel = (xp) => {
      if (xp < 0) return 1;
      return Math.floor(Math.pow(xp / 200, 0.45)) + 1;
    };
    currentContent.level = calculateLevel(currentContent.xp);

    // 6. Update rank
    const level = currentContent.level;
    if (level >= 100) currentContent.rank = 'NATIONAL';
    else if (level >= 80) currentContent.rank = 'S';
    else if (level >= 60) currentContent.rank = 'A';
    else if (level >= 40) currentContent.rank = 'B';
    else if (level >= 25) currentContent.rank = 'C';
    else if (level >= 10) currentContent.rank = 'D';
    else currentContent.rank = 'E';

    // 7. Add to history
    if (actionTitle && xpChange !== 0) {
      currentContent.history = currentContent.history || [];
      currentContent.history.push({
        action: actionTitle,
        xp: xpChange,
        date: now.toISOString(),
      });
      // Keep only last 50 entries
      if (currentContent.history.length > 50) {
        currentContent.history = currentContent.history.slice(-50);
      }
    }

    // 8. Update timestamp
    currentContent.lastUpdated = now.toISOString();

    // 9. Commit changes to GitHub
    const newContent = Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64');

    const updateResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update tracker: ${actionTitle || action}`,
          content: newContent,
          sha: fileData.sha,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`GitHub API error: ${errorData.message}`);
    }

    const winRate = currentContent.questsTotal > 0
      ? Math.round((currentContent.questsCompleted / currentContent.questsTotal) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      message: `${actionTitle} ${xpChange >= 0 ? '+' : ''}${xpChange} XP`,
      xp: currentContent.xp,
      level: currentContent.level,
      rank: currentContent.rank,
      winRate: winRate,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
