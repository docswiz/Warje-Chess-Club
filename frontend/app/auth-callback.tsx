import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as Linking from 'expo-linking';

export default function AuthCallback() {
  const { login } = useAuth();
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get the URL that opened the app
        const url = await Linking.getInitialURL();
        console.log('Callback URL:', url);

        if (url) {
          // Extract session_id from URL fragment
          const fragment = url.split('#')[1];
          if (fragment) {
            const params = new URLSearchParams(fragment);
            const sessionId = params.get('session_id');

            if (sessionId) {
              console.log('Session ID found:', sessionId);
              await login(sessionId);
              router.replace('/(tabs)/feed');
              return;
            }
          }
        }

        // If no session_id found, redirect to login
        console.log('No session ID found');
        router.replace('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/');
      }
    };

    processAuth();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8B4513" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B4513',
  },
});
