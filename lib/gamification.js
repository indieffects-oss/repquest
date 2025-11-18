// lib/gamification.js - v0.8 CORRECTED for your database schema (uses 'timestamp' column)
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

// Helper functions for special badge checks (FIXED: uses 'timestamp' column)
const checkHatTrick = (drillResults) => {
  const uniqueDates = [...new Set(drillResults.map(r => {
    const date = new Date(r.timestamp);
    return date.toDateString();
  }))];

  return uniqueDates.some(dateStr => {
    const dayDrills = drillResults.filter(r => {
      const drillDate = new Date(r.timestamp);
      return drillDate.toDateString() === dateStr;
    });
    return dayDrills.length >= 3;
  });
};

const checkMarathon = (drillResults) => {
  const uniqueDates = [...new Set(drillResults.map(r => {
    const date = new Date(r.timestamp);
    return date.toDateString();
  }))];

  return uniqueDates.some(dateStr => {
    const dayDrills = drillResults.filter(r => {
      const drillDate = new Date(r.timestamp);
      return drillDate.toDateString() === dateStr;
    });
    return dayDrills.length >= 10;
  });
};

const checkWeekendWarrior = (drillResults) => {
  const hasSaturday = drillResults.some(r => new Date(r.timestamp).getDay() === 6);
  const hasSunday = drillResults.some(r => new Date(r.timestamp).getDay() === 0);
  return hasSaturday && hasSunday;
};

const checkDoubleDown = (drillResults) => {
  const uniqueDates = [...new Set(drillResults.map(r => {
    const date = new Date(r.timestamp);
    return date.toDateString();
  }))];

  return uniqueDates.some(dateStr => {
    const dayDrills = drillResults.filter(r => {
      const drillDate = new Date(r.timestamp);
      return drillDate.toDateString() === dateStr;
    });
    const drillIds = dayDrills.map(d => d.drill_id);
    return drillIds.length !== new Set(drillIds).size; // Has duplicates
  });
};

const checkComebackKid = (drillResults) => {
  if (drillResults.length < 2) return false;

  // Sort by date
  const sorted = [...drillResults].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Check for any gap of 7+ days between consecutive drills
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].timestamp);
    const curr = new Date(sorted[i].timestamp);
    const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);

    if (daysDiff >= 7) {
      return true; // User came back after being away for 7+ days
    }
  }

  return false;
};

const checkSpecialBadge = (badge, drillResults, stats) => {
  console.log(`   Checking special badge: ${badge.name}`);

  switch (badge.name) {
    case '6 7':
      const has67 = drillResults.some(r => r.reps === 67);
      console.log(`     Has 67 reps? ${has67}`, drillResults.filter(r => r.reps === 67));
      return has67;

    case 'Lucky 77':
      const has77 = drillResults.some(r => r.reps === 77);
      console.log(`     Has 77 reps? ${has77}`);
      return has77;

    case 'Early Bird':
      const hasEarlyBird = drillResults.some(r => new Date(r.timestamp).getHours() < 6);
      console.log(`     Has drill before 6 AM? ${hasEarlyBird}`);
      return hasEarlyBird;

    case 'Night Owl':
      const hasNightOwl = drillResults.some(r => new Date(r.timestamp).getHours() >= 22);
      console.log(`     Has drill after 10 PM? ${hasNightOwl}`);
      return hasNightOwl;

    case 'Hat Trick':
      const hasHatTrick = checkHatTrick(drillResults);
      console.log(`     Has hat trick? ${hasHatTrick}`);
      return hasHatTrick;

    case 'Marathon':
      const hasMarathon = checkMarathon(drillResults);
      console.log(`     Has marathon? ${hasMarathon}`);
      return hasMarathon;

    case 'Weekend Warrior':
      const hasWeekendWarrior = checkWeekendWarrior(drillResults);
      console.log(`     Has weekend warrior? ${hasWeekendWarrior}`);
      return hasWeekendWarrior;

    case 'Double Down':
      const hasDoubleDown = checkDoubleDown(drillResults);
      console.log(`     Has double down? ${hasDoubleDown}`);
      return hasDoubleDown;

    case 'Comeback Kid':
      const hasComebackKid = checkComebackKid(drillResults);
      console.log(`     Has comeback kid? ${hasComebackKid}`);
      return hasComebackKid;

    case 'Social Star':
      // This would need to be tracked separately when user shares
      console.log(`     Social Star not yet implemented`);
      return false;

    default:
      console.log(`     Unknown special badge type`);
      return false;
  }
};

// Main badge checking and unlocking function
export const checkBadgeUnlocks = async (supabase, userId, stats, drillResults = null) => {
  console.log('==========================================');
  console.log('🔍 BADGE CHECK STARTED');
  console.log('==========================================');
  console.log('User ID:', userId);
  console.log('Stats:', stats);

  const unlocked = [];

  try {
    // Get drill results if not provided
    if (!drillResults) {
      console.log('📊 Fetching drill results...');
      const { data, error } = await supabase
        .from('drill_results')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error fetching drill results:', error);
        throw error;
      }
      drillResults = data || [];
      console.log(`✅ Found ${drillResults.length} drill results`);

      // Log any drills with 67 or 77 reps
      const special = drillResults.filter(r => r.reps === 67 || r.reps === 77);
      if (special.length > 0) {
        console.log('🎯 Special rep counts found:');
        special.forEach(r => console.log(`   - ${r.reps} reps on ${new Date(r.timestamp).toLocaleString()}`));
      }
    }

    // Get all badges user already has
    console.log('🏆 Fetching user badges...');
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (userBadgesError) {
      console.error('❌ Error fetching user badges:', userBadgesError);
      throw userBadgesError;
    }

    const hasBadgeIds = userBadges?.map(ub => ub.badge_id) || [];
    console.log(`✅ User already has ${hasBadgeIds.length} badges:`, hasBadgeIds);

    // Get all available badges from database
    console.log('📋 Fetching all badges from database...');
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) {
      console.error('❌ Error fetching badges:', badgesError);
      throw badgesError;
    }

    if (!allBadges || allBadges.length === 0) {
      console.error('⚠️ NO BADGES FOUND IN DATABASE!');
      console.log('You need to run your SQL INSERT script to add badges to the database.');
      return unlocked;
    }

    console.log(`✅ Found ${allBadges.length} total badges in database`);

    // Filter out badges user already has
    const availableBadges = allBadges.filter(b => !hasBadgeIds.includes(b.id));
    console.log(`📊 Checking ${availableBadges.length} badges for eligibility...`);
    console.log('==========================================');

    // Check each available badge
    for (const badge of availableBadges) {
      let shouldUnlock = false;
      console.log(`\n🎯 Checking: ${badge.name} (${badge.unlock_type})`);

      switch (badge.unlock_type) {
        case 'streak':
          const currentStreak = stats?.current_streak || 0;
          shouldUnlock = currentStreak >= badge.unlock_value;
          console.log(`   Current streak: ${currentStreak}, Required: ${badge.unlock_value}, Eligible: ${shouldUnlock}`);
          break;

        case 'reps':
          const totalReps = stats?.total_reps || 0;
          shouldUnlock = totalReps >= badge.unlock_value;
          console.log(`   Total reps: ${totalReps}, Required: ${badge.unlock_value}, Eligible: ${shouldUnlock}`);
          break;

        case 'drills':
          const sessionsCompleted = stats?.sessions_completed || 0;
          shouldUnlock = sessionsCompleted >= badge.unlock_value;
          console.log(`   Sessions completed: ${sessionsCompleted}, Required: ${badge.unlock_value}, Eligible: ${shouldUnlock}`);
          break;

        case 'special':
          shouldUnlock = checkSpecialBadge(badge, drillResults, stats);
          console.log(`   Eligible: ${shouldUnlock}`);
          break;

        default:
          console.log(`   ⚠️ Unknown unlock type: ${badge.unlock_type}`);
          shouldUnlock = false;
      }

      if (shouldUnlock) {
        console.log(`   ✅ UNLOCKING BADGE: ${badge.name}`);
        // Award the badge
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id
          });

        if (!insertError) {
          unlocked.push(badge);
          console.log(`   🎉 Successfully awarded badge!`);
        } else {
          console.error(`   ❌ Error awarding badge:`, insertError);
        }
      } else {
        console.log(`   ⏸️ Not eligible yet`);
      }
    }

    console.log('==========================================');
    console.log(`✅ BADGE CHECK COMPLETE: ${unlocked.length} new badges unlocked`);
    if (unlocked.length > 0) {
      console.log('New badges:', unlocked.map(b => b.name).join(', '));
    }
    console.log('==========================================');

    return unlocked;
  } catch (error) {
    console.error('==========================================');
    console.error('❌ FATAL ERROR in checkBadgeUnlocks:', error);
    console.error('==========================================');
    return unlocked;
  }
};

// Helper function to run badge check after completing a drill
export const checkBadgesAfterDrill = async (supabase, userId) => {
  try {
    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) throw statsError;

    // Check for badge unlocks
    const newBadges = await checkBadgeUnlocks(supabase, userId, stats);

    return newBadges;
  } catch (error) {
    console.error('Error checking badges after drill:', error);
    return [];
  }
};