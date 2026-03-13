import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TaskId = 'meditation' | 'breathwork' | 'gratitude' | 'steps' | 'exercise';

const STORAGE_KEY = 'unlockd_completed_today';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function markComplete(taskId: TaskId) {
  const key = `${STORAGE_KEY}_${getTodayKey()}`;
  const existing = await AsyncStorage.getItem(key);
  const completed: TaskId[] = existing ? JSON.parse(existing) : [];
  if (!completed.includes(taskId)) {
    completed.push(taskId);
    await AsyncStorage.setItem(key, JSON.stringify(completed));
  }
}

export async function getCompletedToday(): Promise<TaskId[]> {
  const key = `${STORAGE_KEY}_${getTodayKey()}`;
  const existing = await AsyncStorage.getItem(key);
  return existing ? JSON.parse(existing) : [];
}

export async function resetToday() {
  const key = `${STORAGE_KEY}_${getTodayKey()}`;
  await AsyncStorage.removeItem(key);
}