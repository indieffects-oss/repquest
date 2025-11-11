// lib/gamification.js
export const calculateLevel = (points) => {
  return Math.floor(points / 1000);
};

export const getPointsToNextLevel = (points) => {
  const currentLevel = calculateLevel(points);
  const nextLevelPoints = (currentLevel + 1) * 1000;
  return nextLevelPoints - points;
};

export const getLevelTier = (level) => {
  if (level >= 100) return { name: 'Diamond', color: '#60A5FA', emoji: '💎' };
  if (level >= 67) return { name: 'The 67', color: '#F59E0B', emoji: '6️⃣7️⃣' };
  if (level >= 50) return { name: 'Gold', color: '#FBBF24', emoji: '🥇' };
  if (level >= 20) return { name: 'Silver', color: '#D1D5DB', emoji: '🥈' };
  if (level >= 10) return { name: 'Bronze', color: '#CD7F32', emoji: '🥉' };
  return { name: 'Rookie', color: '#9CA3AF', emoji: '⭐' };
};

export const check67EasterEgg = (value) => {
  const str = value.toString();
  return str.includes('67');
};

export const checkBadgeUnlocks = async (supabase, userId, stats) => {
  const unlocked = [];
  
  // Get all badges user doesn't have yet
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);
  
  const hasBadgeIds = userBadges?.map(ub => ub.badge_id) || [];
  
  const { data: allBadges } = await supabase
    .from('badges')
    .select('*')
    .not('id', 'in', `(${hasBadgeIds.join(',') || 'null'})`);
  
  if (!allBadges) return unlocked;
  
  for (const badge of allBadges) {
    let shouldUnlock = false;
    
    switch(badge.unlock_type) {
      case 'level':
        const level = calculateLevel(stats.total_points || 0);
        shouldUnlock = level >= badge.unlock_value;
        break;
      case 'streak':
        shouldUnlock = stats.current_streak >= badge.unlock_value;
        break;
      case 'reps':
        shouldUnlock = stats.total_reps >= badge.unlock_value;
        break;
      case 'special':
        if (badge.name === 'Lucky 67') {
          shouldUnlock = check67EasterEgg(stats.total_points || 0);
        }
        break;
    }
    
    if (shouldUnlock) {
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badge.id
      });
      unlocked.push(badge);
    }
  }
  
  return unlocked;
};