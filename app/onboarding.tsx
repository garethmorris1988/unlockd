import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ─────────────────────────────────────────────────────────────────────

type HabitId = 'meditation' | 'breathwork' | 'gratitude' | 'steps' | 'exercise';
type GoalId  = 'stress' | 'fitness' | 'focus' | 'morning' | 'all';

// ─── Data ──────────────────────────────────────────────────────────────────────

const ALL_HABITS: { id: HabitId; name: string; benefit: string }[] = [
  { id: 'meditation', name: 'Meditation', benefit: "Lowers cortisol before the day's stress hits." },
  { id: 'breathwork', name: 'Breathwork', benefit: 'Activates your parasympathetic nervous system.' },
  { id: 'gratitude',  name: 'Gratitude',  benefit: 'Primes your brain to notice positives all day.' },
  { id: 'steps',      name: 'Steps',      benefit: 'Boosts dopamine and wakes up your body naturally.' },
  { id: 'exercise',   name: 'Push Ups',   benefit: 'Raises energy and focus for hours after.' },
];

const GOAL_OPTIONS: { id: GoalId; label: string }[] = [
  { id: 'stress',  label: 'Reduce stress & anxiety'     },
  { id: 'fitness', label: 'Build a fitness habit'        },
  { id: 'focus',   label: 'Improve focus & productivity' },
  { id: 'morning', label: 'Fix my morning routine'       },
  { id: 'all',     label: 'All of the above'             },
];

const STRUGGLE_OPTIONS = [
  'Too much phone first thing',
  'No morning routine',
  'Lack of consistency',
  'Low energy all day',
];

const GOAL_HABITS: Record<GoalId, HabitId[]> = {
  stress:  ['meditation', 'breathwork', 'gratitude'],
  fitness: ['exercise', 'steps', 'breathwork'],
  focus:   ['meditation', 'gratitude', 'steps'],
  morning: ['meditation', 'breathwork', 'gratitude', 'steps', 'exercise'],
  all:     ['meditation', 'breathwork', 'gratitude', 'steps', 'exercise'],
};

const GOAL_INSIGHTS: Record<GoalId, { title: string; cards: { title: string; body: string }[] }> = {
  stress: {
    title: 'The science of stress relief',
    cards: [
      { title: 'Cortisol peaks in the first hour', body: 'Your stress hormone is highest right after waking. A structured morning routine signals safety to your nervous system, cutting cortisol faster.' },
      { title: 'Breathwork rewires your threat response', body: 'Slow controlled breathing activates the vagus nerve, shifting your body from fight-or-flight to rest-and-digest within minutes.' },
      { title: 'Gratitude breaks the anxiety loop', body: 'Writing what you are grateful for interrupts rumination. Studies show it reduces generalised anxiety symptoms by up to 27% over 4 weeks.' },
    ],
  },
  fitness: {
    title: 'The science of movement',
    cards: [
      { title: 'Morning exercise sticks longer', body: 'People who work out in the morning are 3x more likely to maintain the habit at 12 months. Fewer distractions mean fewer excuses.' },
      { title: 'Reps before breakfast burn more fat', body: 'Exercising in a fasted state increases fat oxidation by up to 20%, making your morning session more metabolically efficient.' },
      { title: 'Consistency beats intensity every time', body: 'A 15 minute morning movement habit done daily produces better long-term results than an intense session done unpredictably.' },
    ],
  },
  focus: {
    title: 'The science of focus',
    cards: [
      { title: 'First 90 minutes = peak neuroplasticity', body: 'Your brain is most receptive to deep work in the first 90 minutes after waking. Protecting this window from your phone is the single highest leverage thing you can do.' },
      { title: 'Habit stacking compounds over weeks', body: 'Each completed task raises dopamine, which primes motivation for the next. A consistent morning stack can double your productive output within 30 days.' },
      { title: 'Phone-free mornings mean deeper focus', body: 'Checking your phone within 15 minutes of waking floods your brain with reactive thinking. Delaying it by even 30 minutes measurably improves sustained attention all day.' },
    ],
  },
  morning: {
    title: 'The science of mornings',
    cards: [
      { title: 'Your first hour sets your whole day', body: 'Research shows that how you spend the first 60 minutes after waking determines your dominant mood, energy and focus level for the next 8 hours.' },
      { title: 'Friction is the enemy of consistency', body: 'The reason most routines fail is not willpower — it is unstructured choice. A locked phone removes the single biggest source of morning friction.' },
      { title: 'Small wins create momentum', body: 'Completing even one intentional morning habit triggers a dopamine release that carries forward. The routine does not need to be long — it needs to be done.' },
    ],
  },
  all: {
    title: 'The science of winning mornings',
    cards: [
      { title: 'Your morning is your most valuable asset', body: 'The first hour after waking is the only part of your day with zero external demands. What you do with it determines everything that follows.' },
      { title: 'Compound habits outperform single goals', body: 'Combining movement, mindfulness and intention in one session creates a neurological stack that amplifies each individual benefit by up to 40%.' },
      { title: 'Identity follows action', body: 'Every morning you complete your routine, you cast a vote for the person you want to become. After 30 days, that identity is no longer aspirational — it is just who you are.' },
    ],
  },
};

const FIRST_PROGRESS_STEP = 2;
const LAST_PROGRESS_STEP  = 6;
const PROGRESS_BAR_COUNT  = LAST_PROGRESS_STEP - FIRST_PROGRESS_STEP + 1; // 5

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep]         = useState(1);
  const [goal, setGoal]         = useState<GoalId | null>(null);
  const [struggle, setStruggle] = useState<string | null>(null);
  const [habits, setHabits]     = useState<HabitId[]>([]);
  const [lockHour, setLockHour] = useState(6);
  const [lockMin, setLockMin]   = useState(30);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  function selectGoal(id: GoalId) {
    setGoal(id);
    setHabits(GOAL_HABITS[id]);
  }

  function toggleHabit(id: HabitId) {
    if (habits.includes(id)) {
      if (habits.length === 1) return;
      setHabits(habits.filter(h => h !== id));
    } else {
      setHabits([...habits, id]);
    }
  }

  function adjustTime(type: 'hour' | 'min', dir: 1 | -1) {
    if (type === 'hour') {
      setLockHour(h => (h + dir + 24) % 24);
    } else {
      setLockMin(m => (m + dir * 15 + 60) % 60);
    }
  }

  async function finish() {
    await Promise.all([
      AsyncStorage.setItem('unlockd_active_habits', JSON.stringify(habits.length ? habits : GOAL_HABITS.all)),
      AsyncStorage.setItem('unlockd_lock_time', JSON.stringify({ hour: lockHour, min: lockMin })),
      AsyncStorage.setItem('unlockd_onboarding_done', 'true'),
    ]);
    router.replace('/motivation');
  }

  const showProgress = step >= FIRST_PROGRESS_STEP && step <= LAST_PROGRESS_STEP;
  const insightCards = goal ? GOAL_INSIGHTS[goal].cards : [];
  const insightTitle = goal ? GOAL_INSIGHTS[goal].title : '';
  const padH = String(lockHour).padStart(2, '0');
  const padM = String(lockMin).padStart(2, '0');

  // ── Step 1: Welcome ────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.step1}>
          <View />
          <View>
            <Text style={styles.s1Label}>UNLOCKD</Text>
            <Text style={styles.s1Title}>unlock your{'\n'}morning.</Text>
            <Text style={styles.s1Subtitle}>Build the routine that changes everything.</Text>
          </View>
          <View>
            <TouchableOpacity style={styles.ctaDark} onPress={() => setStep(2)}>
              <Text style={styles.ctaDarkText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/routine')}>
              <Text style={styles.s1AlreadyHave}>Already have an account?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Steps 2-7 ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setStep(s => s - 1)}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Progress lines */}
      {showProgress && (
        <View style={styles.progressRow}>
          {Array.from({ length: PROGRESS_BAR_COUNT }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressBar,
                (i + FIRST_PROGRESS_STEP) <= step && styles.progressBarActive,
              ]}
            />
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Step 2: Goal ──────────────────────────────────────────────── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>What's your main goal?</Text>
            <Text style={styles.stepSubtitle}>We'll build your routine around this.</Text>
            <View style={styles.optionsList}>
              {GOAL_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionPill, goal === opt.id && styles.optionPillSelected]}
                  onPress={() => selectGoal(opt.id)}
                >
                  <Text style={[styles.optionText, goal === opt.id && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.ctaDark, !goal && styles.ctaDisabled]}
              onPress={() => goal && setStep(3)}
            >
              <Text style={styles.ctaDarkText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Insight ───────────────────────────────────────────── */}
        {step === 3 && goal && (
          <View>
            <Text style={styles.insightGoalLabel}>{GOAL_OPTIONS.find(g => g.id === goal)?.label.toUpperCase()}</Text>
            <Text style={styles.stepTitle}>{insightTitle}</Text>
            <View style={styles.insightCards}>
              {insightCards.map((card, i) => (
                <View key={i} style={styles.insightCard}>
                  <Text style={styles.insightCardTitle}>{card.title}</Text>
                  <Text style={styles.insightCardBody}>{card.body}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.ctaDark} onPress={() => setStep(4)}>
              <Text style={styles.ctaDarkText}>I'm in →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 4: Struggle ──────────────────────────────────────────── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>What's your biggest struggle?</Text>
            <Text style={styles.stepSubtitle}>Be honest — we'll work around it.</Text>
            <View style={styles.optionsList}>
              {STRUGGLE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionPill, struggle === opt && styles.optionPillSelected]}
                  onPress={() => setStruggle(opt)}
                >
                  <Text style={[styles.optionText, struggle === opt && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.ctaDark, !struggle && styles.ctaDisabled]}
              onPress={() => struggle && setStep(5)}
            >
              <Text style={styles.ctaDarkText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 5: Habits ────────────────────────────────────────────── */}
        {step === 5 && (
          <View>
            <Text style={[styles.stepTitle, { fontSize: 20 }]}>Your personalised routine</Text>
            <Text style={[styles.stepSubtitle, { marginBottom: 16 }]}>Toggle to customise.</Text>
            <View style={styles.habitsList}>
              {ALL_HABITS.map(habit => {
                const isOn = habits.includes(habit.id);
                return (
                  <TouchableOpacity
                    key={habit.id}
                    style={[styles.habitCard, isOn && styles.habitCardOn]}
                    onPress={() => toggleHabit(habit.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.habitInfo}>
                      <Text style={[styles.habitName, isOn && styles.habitNameOn]}>
                        {habit.name}
                      </Text>
                      <Text style={[styles.habitBenefit, isOn && styles.habitBenefitOn]}>
                        {habit.benefit}
                      </Text>
                    </View>
                    <View style={[styles.togglePill, isOn && styles.togglePillOn]} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={[styles.ctaDark, { marginTop: 20 }]} onPress={() => setStep(6)}>
              <Text style={styles.ctaDarkText}>This looks good →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 6: Lock time ─────────────────────────────────────────── */}
        {step === 6 && (
          <View style={styles.lockStep}>
            <Text style={styles.stepTitle}>When does your day start?</Text>
            <Text style={[styles.stepSubtitle, { marginBottom: 32 }]}>
              Your phone locks from this time.
            </Text>
            <View style={styles.timePicker}>
              <View style={styles.timeUnit}>
                <TouchableOpacity onPress={() => adjustTime('hour', 1)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 16, color: '#999' }}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{padH}</Text>
                <TouchableOpacity onPress={() => adjustTime('hour', -1)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 16, color: '#999' }}>▼</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.timeSep}>:</Text>
              <View style={styles.timeUnit}>
                <TouchableOpacity onPress={() => adjustTime('min', 1)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 16, color: '#999' }}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{padM}</Text>
                <TouchableOpacity onPress={() => adjustTime('min', -1)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 16, color: '#999' }}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.lockNote}>
              Phone locks every morning at {padH}:{padM}
            </Text>
            <TouchableOpacity style={styles.ctaDark} onPress={() => setStep(7)}>
              <Text style={styles.ctaDarkText}>Set My Lock Time →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 7: Paywall ───────────────────────────────────────────── */}
        {step === 7 && (
          <View>
            <Text style={[styles.stepTitle, { fontSize: 26, letterSpacing: -0.5 }]}>
              your routine is ready.
            </Text>
            <Text style={[styles.stepSubtitle, { marginBottom: 20 }]}>
              7 days free — cancel anytime.
            </Text>

            {/* Annual card */}
            <TouchableOpacity
              style={[styles.planCard, { borderWidth: selectedPlan === 'annual' ? 2 : 0.5, borderColor: selectedPlan === 'annual' ? '#111' : '#e0dfd8' }]}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={styles.planCardRow}>
                <View>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planPrice}>£35.99/yr · save 40%</Text>
                </View>
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>BEST VALUE</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Monthly card */}
            <TouchableOpacity
              style={[styles.planCard, { borderWidth: selectedPlan === 'monthly' ? 2 : 0.5, borderColor: selectedPlan === 'monthly' ? '#111' : '#e0dfd8', backgroundColor: '#fff' }]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>£4.99/month</Text>
            </TouchableOpacity>

            {/* Features */}
            <View style={styles.featuresList}>
              {[
                'Morning phone lock',
                '5 morning habits with science-backed guidance',
                'Streak tracking & daily motivation',
              ].map((feat, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity style={styles.ctaDark} onPress={finish}>
              <Text style={styles.ctaDarkText}>Start 7-Day Free Trial</Text>
            </TouchableOpacity>
            <Text style={styles.paywallNote}>{selectedPlan === 'annual' ? 'Then £35.99/year · Cancel anytime' : 'Then £4.99/month · Cancel anytime'}</Text>
            <TouchableOpacity onPress={finish}>
              <Text style={styles.restoreText}>Restore purchases</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4f0' },

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  step1: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  s1Label: {
    fontSize: 10,
    color: '#bbb',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  s1Title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 12,
  },
  s1Subtitle: {
    fontSize: 13,
    color: '#999',
    lineHeight: 20,
  },
  s1AlreadyHave: {
    fontSize: 12,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 12,
  },

  // ── Steps 2-7 chrome ───────────────────────────────────────────────────────
  backBtn: {
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 13, color: '#aaa' },

  progressRow: {
    flexDirection: 'row',
    gap: 3,
    paddingTop: 56,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  progressBarActive: { backgroundColor: '#111' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  // ── Shared step elements ───────────────────────────────────────────────────
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 20,
  },

  // ── Goal / Struggle options ────────────────────────────────────────────────
  optionsList: { gap: 8, marginBottom: 24 },
  optionPill: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#ddd',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionPillSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  optionText: { fontSize: 13, color: '#888' },
  optionTextSelected: { fontWeight: '700', color: '#fff' },

  // ── Insight cards ──────────────────────────────────────────────────────────
  insightGoalLabel: {
    fontSize: 10,
    color: '#aaa',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  insightCards: { gap: 10, marginBottom: 24, marginTop: 20 },
  insightCard: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e0dfd8',
    borderRadius: 12,
    padding: 16,
  },
  insightCardTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 6 },
  insightCardBody: { fontSize: 12, fontWeight: '400', color: '#999', lineHeight: 18 },

  // ── Habit cards ────────────────────────────────────────────────────────────
  habitsList: { gap: 8 },
  habitCard: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e0dfd8',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitCardOn: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 13, fontWeight: '700', color: '#111' },
  habitNameOn: { color: '#fff' },
  habitBenefit: { fontSize: 11, color: '#ccc', marginTop: 2 },
  habitBenefitOn: { color: '#555' },
  togglePill: { width: 36, height: 20, backgroundColor: '#ddd', borderRadius: 10 },
  togglePillOn: { backgroundColor: '#c8f135' },

  // ── Lock time picker ───────────────────────────────────────────────────────
  lockStep: { alignItems: 'center' },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeUnit: { alignItems: 'center', gap: 8 },
  timeArrow: { fontSize: 14, color: '#ccc' },
  timeValue: {
    fontSize: 52,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -2,
  },
  timeSep: { fontSize: 40, fontWeight: '800', color: '#111' },
  lockNote: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },

  // ── Paywall ────────────────────────────────────────────────────────────────
  planCard: {
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  planCardMonthly: {
    borderWidth: 0.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: '#111',
  },
  planCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: { fontSize: 14, fontWeight: '800', color: '#111' },
  planPrice: { fontSize: 11, color: '#888', marginTop: 2 },
  bestBadge: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  featuresList: { gap: 8, marginBottom: 20, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#111' },
  featureText: { fontSize: 11, color: '#666', flex: 1 },
  paywallNote: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 8,
  },
  restoreText: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 6,
  },

  // ── CTA ────────────────────────────────────────────────────────────────────
  ctaDark: {
    backgroundColor: '#111',
    borderRadius: 50,
    padding: 16,
    alignItems: 'center',
  },
  ctaDarkText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  ctaDisabled: { opacity: 0.3 },
});
