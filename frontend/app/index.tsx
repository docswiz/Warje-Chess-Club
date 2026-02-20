import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [clubInfo, setClubInfo] = React.useState<any>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)/feed');
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Fetch club info
    fetch(`${BACKEND_URL}/api/club-info`)
      .then(res => res.json())
      .then(data => setClubInfo(data))
      .catch(err => console.error('Failed to load club info:', err));
  }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = `${BACKEND_URL}/auth-callback`;
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    Linking.openURL(authUrl);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  const isOpen = clubInfo?.is_open ?? true;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="chess-knight" size={120} color="#8B4513" />
        </View>
        
        <Text style={styles.title}>Warje Chess Club</Text>
        <Text style={styles.subtitle}>Connect with your chess community</Text>
        
        {clubInfo && (
          <View style={styles.statusCard}>
            <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#228B22' : '#DC143C' }]}>
              <Ionicons name={isOpen ? 'checkmark-circle' : 'close-circle'} size={20} color="#fff" />
              <Text style={styles.statusText}>{isOpen ? 'OPEN' : 'CLOSED'}</Text>
            </View>
            
            <View style={styles.timingsContainer}>
              <Ionicons name="time-outline" size={24} color="#8B4513" />
              <View style={styles.timingsText}>
                <Text style={styles.timingsLabel}>Club Timings</Text>
                <Text style={styles.timingsValue}>{clubInfo.timings}</Text>
              </View>
            </View>
          </View>
        )}
        
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
          <Text style={styles.loginButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Member Benefits</Text>
          <View style={styles.feature}>
            <Ionicons name="newspaper" size={20} color="#8B4513" />
            <Text style={styles.featureText}>Daily club updates & news</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="extension-puzzle" size={20} color="#8B4513" />
            <Text style={styles.featureText}>Solve daily chess puzzles</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="people" size={20} color="#8B4513" />
            <Text style={styles.featureText}>Community engagement</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    backgroundColor: '#F5F5DC',
    padding: 24,
    borderRadius: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  timingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5DC',
    padding: 12,
    borderRadius: 8,
  },
  timingsText: {
    marginLeft: 12,
    flex: 1,
  },
  timingsLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timingsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 24,
  },
  googleIcon: {
    marginRight: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
});
