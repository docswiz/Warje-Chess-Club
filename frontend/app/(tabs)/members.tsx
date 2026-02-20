import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Member {
  user_id: string;
  name: string;
  email: string;
  role: string;
  subscription_status: string;
  subscription_expires_at: string;
  created_at: string;
}

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubscriptionAction = async (
    userId: string,
    action: string,
    memberName: string
  ) => {
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Subscription`,
      `${memberName} - Select duration:`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: '1 Month',
          onPress: () => updateSubscription(userId, action, 1),
        },
        {
          text: '3 Months',
          onPress: () => updateSubscription(userId, action, 3),
        },
        {
          text: '6 Months',
          onPress: () => updateSubscription(userId, action, 6),
        },
        {
          text: '12 Months',
          onPress: () => updateSubscription(userId, action, 12),
        },
      ]
    );
  };

  const updateSubscription = async (
    userId: string,
    action: string,
    months: number
  ) => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(
        `${BACKEND_URL}/api/admin/members/${userId}/subscription?action=${action}&months=${months}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        Alert.alert('Success', `Subscription ${action}d for ${months} month(s)`);
        loadMembers();
      } else {
        Alert.alert('Error', 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const handleDeactivate = (userId: string, memberName: string) => {
    Alert.alert(
      'Deactivate Subscription',
      `Are you sure you want to deactivate ${memberName}'s subscription?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('session_token');
              const response = await fetch(
                `${BACKEND_URL}/api/admin/members/${userId}/subscription?action=deactivate`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Subscription deactivated');
                loadMembers();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate subscription');
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: Member }) => {
    const expiresAt = new Date(item.subscription_expires_at);
    const daysRemaining = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isExpired = daysRemaining < 0;
    const isActive = item.subscription_status === 'active';

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
            {item.role === 'owner' && (
              <View style={styles.ownerBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#1877F2" />
                <Text style={styles.ownerText}>Owner</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.subscriptionInfo}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isActive && !isExpired ? '#42B72A' : '#F02849' },
              ]}
            >
              <Text style={styles.statusText}>
                {isActive && !isExpired ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
            {isActive && !isExpired && (
              <Text style={styles.daysRemaining}>
                {daysRemaining} days left
              </Text>
            )}
          </View>

          <Text style={styles.expiryText}>
            Expires: {expiresAt.toLocaleDateString()}
          </Text>
        </View>

        {item.role !== 'owner' && (
          <View style={styles.actionButtons}>
            {isActive && !isExpired ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.extendButton]}
                  onPress={() =>
                    handleSubscriptionAction(item.user_id, 'extend', item.name)
                  }
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Extend</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deactivateButton]}
                  onPress={() => handleDeactivate(item.user_id, item.name)}
                >
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Deactivate</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.activateButton]}
                onPress={() =>
                  handleSubscriptionAction(item.user_id, 'activate', item.name)
                }
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Activate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Total Members: {members.length}</Text>
        <TouchableOpacity onPress={() => setRefreshing(true) || loadMembers()}>
          <Ionicons name="refresh" size={24} color="#1877F2" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadMembers}
            colors={['#1877F2']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
  },
  listContent: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  memberHeader: {
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#65676B',
    marginBottom: 8,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  ownerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1877F2',
    marginLeft: 4,
  },
  subscriptionInfo: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  daysRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: '#42B72A',
  },
  expiryText: {
    fontSize: 13,
    color: '#65676B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activateButton: {
    backgroundColor: '#42B72A',
  },
  extendButton: {
    backgroundColor: '#1877F2',
  },
  deactivateButton: {
    backgroundColor: '#F02849',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
