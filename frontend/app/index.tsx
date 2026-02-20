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
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  const isOpen = clubInfo?.is_open ?? true;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.knightLogo}>♞</Text>
        </View>
        
        <Text style={styles.title}>Warje Chess Club</Text>
        <Text style={styles.subtitle}>Connect with your chess community</Text>
        
        {clubInfo && (
          <View style={styles.statusCard}>
            <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#42B72A' : '#F02849' }]}>
              <Ionicons name={isOpen ? 'checkmark-circle' : 'close-circle'} size={20} color="#fff" />
              <Text style={styles.statusText}>{isOpen ? 'OPEN NOW' : 'CLOSED'}</Text>
            </View>
            
            <View style={styles.timingsContainer}>
              <Ionicons name="time-outline" size={24} color="#1877F2" />
              <View style={styles.timingsText}>
                <Text style={styles.timingsLabel}>Club Timings</Text>
                <Text style={styles.timingsValue}>{clubInfo.timings}</Text>
              </View>
            </View>
          </View>
        )}
        
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
          <Text style={styles.loginButtonText}>Continue with Google</Text>
        </TouchableOpacity>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What You'll Get</Text>
          <View style={styles.feature}>
            <Ionicons name="newspaper" size={22} color="#1877F2" />
            <Text style={styles.featureText}>Daily club updates & news</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="extension-puzzle" size={22} color="#1877F2" />
            <Text style={styles.featureText}>Solve daily chess puzzles</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="people" size={22} color="#1877F2" />
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
    backgroundColor: '#F0F2F5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 100,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  knightLogo: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#65676B',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  timingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    padding: 12,
    borderRadius: 8,
  },
  timingsText: {
    marginLeft: 12,
    flex: 1,
  },
  timingsLabel: {
    fontSize: 13,
    color: '#65676B',
    marginBottom: 4,
    fontWeight: '500',
  },
  timingsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1E21',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#1877F2',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 20,
  },
  googleIcon: {
    marginRight: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featuresTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#1C1E21',
    marginLeft: 12,
    fontWeight: '400',
  },
});
