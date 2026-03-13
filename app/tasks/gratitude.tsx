import React, { useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function GratitudeScreen() {
  const [entry1, setEntry1] = useState('')
  const [entry2, setEntry2] = useState('')
  const [entry3, setEntry3] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const allFilled = entry1.trim().length > 0 && entry2.trim().length > 0 && entry3.trim().length > 0

  async function handleSave() {
    const today = new Date()
    const dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    const storageKey = 'unlockd_completed_today_' + dateKey
    const existing = await AsyncStorage.getItem(storageKey)
    const currentList: string[] = existing ? JSON.parse(existing) : []
    if (!currentList.includes('gratitude')) currentList.push('gratitude')
    await AsyncStorage.setItem(storageKey, JSON.stringify(currentList))
    setIsComplete(true)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40, flexGrow: 1 }}>

          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>Gratitude</Text>
          <Text style={{ fontSize: 13, color: '#999', marginBottom: 36 }}>Three things you are grateful for today.</Text>

          {/* Input 1 */}
          <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>01</Text>
          <TextInput
            value={entry1}
            onChangeText={setEntry1}
            placeholder="I'm grateful for..."
            placeholderTextColor="#ccc"
            multiline
            editable={!isComplete}
            style={{
              backgroundColor: '#fff',
              borderWidth: 0.5,
              borderColor: entry1.trim().length > 0 ? '#111' : '#e0dfd8',
              borderRadius: 14,
              padding: 16,
              fontSize: 14,
              color: '#111',
              lineHeight: 22,
              minHeight: 80,
              marginBottom: 20,
            }}
          />

          {/* Input 2 */}
          <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>02</Text>
          <TextInput
            value={entry2}
            onChangeText={setEntry2}
            placeholder="I'm grateful for..."
            placeholderTextColor="#ccc"
            multiline
            editable={!isComplete}
            style={{
              backgroundColor: '#fff',
              borderWidth: 0.5,
              borderColor: entry2.trim().length > 0 ? '#111' : '#e0dfd8',
              borderRadius: 14,
              padding: 16,
              fontSize: 14,
              color: '#111',
              lineHeight: 22,
              minHeight: 80,
              marginBottom: 20,
            }}
          />

          {/* Input 3 */}
          <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>03</Text>
          <TextInput
            value={entry3}
            onChangeText={setEntry3}
            placeholder="I'm grateful for..."
            placeholderTextColor="#ccc"
            multiline
            editable={!isComplete}
            style={{
              backgroundColor: '#fff',
              borderWidth: 0.5,
              borderColor: entry3.trim().length > 0 ? '#111' : '#e0dfd8',
              borderRadius: 14,
              padding: 16,
              fontSize: 14,
              color: '#111',
              lineHeight: 22,
              minHeight: 80,
              marginBottom: 36,
            }}
          />

          <View style={{ flex: 1 }} />

          {/* Button */}
          {!isComplete ? (
            <TouchableOpacity
              onPress={handleSave}
              disabled={!allFilled}
              style={{
                backgroundColor: allFilled ? '#111' : '#e0dfd8',
                borderRadius: 50,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: allFilled ? '#fff' : '#bbb', fontSize: 15, fontWeight: '700' }}>
                Save & Complete
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: '#c8f135', borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>Done ✓</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
