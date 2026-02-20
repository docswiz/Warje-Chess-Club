import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Subscription {
  status: string;
  expires_at: string | null;
  is_active: boolean;
}

export default function SubscriptionScreen() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  const isActive = subscription?.is_active;
  const expiresAt = subscription?.expires_at
    ? new Date(subscription.expires_at)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isActive ? 'checkmark-circle' : 'close-circle'}
            size={80}
            color={isActive ? '#228B22' : '#DC143C'}
          />
        </View>

        <Text style={styles.statusTitle}>
          {isActive ? 'Active Membership' : 'Inactive Membership'}
        </Text>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={24} color="#8B4513" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: isActive ? '#228B22' : '#DC143C' }]}>
                {subscription?.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {expiresAt && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={24} color="#8B4513" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Expires On</Text>
                <Text style={styles.infoValue}>
                  {expiresAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {expiresAt && isActive && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={24} color="#8B4513" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Days Remaining</Text>
                <Text style={styles.infoValue}>
                  {Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Membership Benefits</Text>
          <View style={styles.benefit}>
            <Ionicons name="checkmark" size={20} color="#228B22" />
            <Text style={styles.benefitText}>Access to daily club updates</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark" size={20} color="#228B22" />
            <Text style={styles.benefitText}>Solve chess puzzles</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark" size={20} color="#228B22" />
            <Text style={styles.benefitText}>View chess positions</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark" size={20} color="#228B22" />
            <Text style={styles.benefitText}>Community engagement</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoContainer: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  infoText: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  benefitsContainer: {
    backgroundColor: '#F5F5DC',
    padding: 16,
    borderRadius: 8,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
