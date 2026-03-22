import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useFirstName } from '../utils/useFirstName';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Task definitions ──────────────────────────────────────────────────────────

const ALL_TASKS = [
  { id: 'meditation', name: 'Meditation',  meta: '5 min timer',      route: '/tasks/meditation' },
  { id: 'breathwork', name: 'Breathwork',  meta: '4-7-8 · 4 rounds', route: '/tasks/breathwork' },
  { id: 'gratitude',  name: 'Gratitude',   meta: '3 entries',         route: '/tasks/gratitude'  },
  { id: 'steps',      name: 'Steps',       meta: '2,000 steps',       route: '/tasks/steps'      },
  { id: 'exercise',   name: 'Exercise',    meta: '20 reps',           route: '/tasks/exercise'   },
];

const DEFAULT_HABITS = ALL_TASKS.map(t => t.id);
const STORAGE_PREFIX = 'unlockd_completed_today_';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const day = d.getDate();
  const month = d.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
  return `${weekday} · ${day} ${month}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RoutineScreen() {
  const firstName = useFirstName();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [activeHabits, setActiveHabits]     = useState<string[]>(DEFAULT_HABITS);
  const [streak, setStreak]                 = useState(0);
  const [bestStreak, setBestStreak]         = useState(0);
  const [time, setTime]                     = useState(() => formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        const today = new Date()
        const dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
        const storageKey = 'unlockd_completed_today_' + dateKey
        const existing = await AsyncStorage.getItem(storageKey)
        const completedList: string[] = existing ? JSON.parse(existing) : []
        setCompletedTasks(completedList)

        const habitsVal = await AsyncStorage.getItem('unlockd_active_habits')
        const habits: string[] = habitsVal ? JSON.parse(habitsVal) : DEFAULT_HABITS
        setActiveHabits(habits)

        // Load streak
        const keys = await AsyncStorage.getAllKeys()
        const streakKeys = (keys as string[]).filter(k => k.startsWith('unlockd_completed_today_'))
        const dates = streakKeys.map(k => k.replace('unlockd_completed_today_', ''))

        // Calculate current streak
        let current = 0
        const checkDate = new Date()
        while (true) {
          const dk = checkDate.getFullYear() + '-' + (checkDate.getMonth() + 1) + '-' + checkDate.getDate()
          if (dates.includes(dk)) {
            current++
            checkDate.setDate(checkDate.getDate() - 1)
          } else break
        }
        setStreak(current)

        // Calculate best streak
        const sorted = dates.sort()
        let best = 0
        let run = 1
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1])
          const curr = new Date(sorted[i])
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
          if (diff === 1) { run++; if (run > best) best = run }
          else run = 1
        }
        if (sorted.length > 0 && best === 0) best = 1
        setBestStreak(best)
      }
      loadData()
    }, [])
  );

  const tasks      = ALL_TASKS.filter(t => activeHabits.includes(t.id));
  const doneCount  = completedTasks.filter(id => activeHabits.includes(id)).length;
  const totalCount = tasks.length;
  const progress   = totalCount > 0 ? doneCount / totalCount : 0;
  const allDone    = doneCount === totalCount && totalCount > 0;

  const dateStr = formatDate(new Date());

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerDate}>{dateStr}</Text>
        <Text style={styles.headerTime}>{time}</Text>
        <Text style={styles.headerSub}>{firstName ? `${firstName.toUpperCase()}'S ROUTINE` : 'YOUR ROUTINE UNLOCKD'}</Text>

        {/* Streak cards */}
        <TouchableOpacity onPress={() => router.push('/streak')} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 4 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 32 }}>{streak}</Text>
              <Text style={{ fontSize: 9, fontWeight: '400', color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>CURRENT STREAK</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 32 }}>{bestStreak}</Text>
              <Text style={{ fontSize: 9, fontWeight: '400', color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>BEST STREAK</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { marginTop: 16 }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      {/* Task list */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {tasks.map((task, index) => {
          const isDone = completedTasks.includes(task.id);
          const isLast = index === tasks.length - 1;
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskRow, !isLast && styles.taskRowBorder]}
              onPress={() => router.push(task.route as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.circle, isDone && styles.circleDone]} />
              <Text style={[styles.taskName, isDone && styles.taskNameDone]}>
                {task.name}
              </Text>
              <Text style={styles.taskMeta}>{isDone ? 'Done' : task.meta}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* All done card */}
      {allDone && (
        <View style={styles.allDoneCard}>
          <Text style={styles.allDoneTitle}>Routine complete.</Text>
          <Text style={styles.allDoneSub}>Your phone is unlocked.</Text>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => router.push('/streak')}>
          <Text style={{ fontSize: 12, color: '#999' }}>Streak details →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/habits')}>
          <Text style={styles.bottomBarText}>Edit habits</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4f0' },

  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerDate: {
    fontSize: 10,
    color: '#aaa',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTime: {
    fontSize: 48,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -2,
    lineHeight: 52,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 10,
    color: '#888',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  progressTrack: {
    marginHorizontal: 24,
    height: 1.5,
    backgroundColor: '#e0dfd8',
    borderRadius: 2,
  },
  progressFill: {
    height: 1.5,
    backgroundColor: '#111',
    borderRadius: 2,
  },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16 },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  taskRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e7e0',
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
  circleDone: {
    backgroundColor: '#c8f135',
    borderColor: '#c8f135',
  },
  taskName: {
    flex: 1,
    marginLeft: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  taskNameDone: {
    fontWeight: '400',
    color: '#bbb',
    textDecorationLine: 'line-through',
  },
  taskMeta: { fontSize: 11, color: '#aaa' },

  allDoneCard: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e0dfd8',
    borderRadius: 14,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  allDoneTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  allDoneSub: { fontSize: 12, color: '#aaa', marginTop: 4 },

  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  bottomBarText: { fontSize: 11, color: '#aaa' },
});
