import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Post {
  post_id: string;
  title: string;
  content: string;
  image?: string;
  is_puzzle: boolean;
  puzzle_answer?: string;
  success_message?: string;
  failure_message?: string;
  created_by: string;
  created_at: string;
}

interface PuzzleStatus {
  attempts_used: number;
  attempts_remaining: number;
  has_solved: boolean;
}

export default function Feed() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [puzzleStatuses, setPuzzleStatuses] = useState<{ [key: string]: PuzzleStatus }>({});
  const [selectedPuzzle, setSelectedPuzzle] = useState<Post | null>(null);
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activePuzzle, setActivePuzzle] = useState<Post | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter out puzzles - we'll show only the latest one separately
        const regularPosts = data.filter((p: Post) => !p.is_puzzle);
        const puzzles = data.filter((p: Post) => p.is_puzzle);
        
        // Get the most recent puzzle
        const latestPuzzle = puzzles.length > 0 ? puzzles[0] : null;
        
        setPosts(regularPosts);
        setActivePuzzle(latestPuzzle);
        
        // Load puzzle status if there's an active puzzle
        if (latestPuzzle) {
          loadPuzzleStatus(latestPuzzle.post_id);
        }
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPuzzleStatus = async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/puzzles/${postId}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const status = await response.json();
        setPuzzleStatuses(prev => ({ ...prev, [postId]: status }));
      }
    } catch (error) {
      console.error('Failed to load puzzle status:', error);
    }
  };

  const handlePuzzleSubmit = async () => {
    if (!selectedPuzzle || !puzzleAnswer.trim()) return;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/puzzles/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          post_id: selectedPuzzle.post_id,
          answer: puzzleAnswer,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          result.is_correct ? 'Success!' : 'Incorrect',
          result.message,
          [{ text: 'OK' }]
        );
        
        // Reload puzzle status
        await loadPuzzleStatus(selectedPuzzle.post_id);
        setSelectedPuzzle(null);
        setPuzzleAnswer('');
      }
    } catch (error) {
      console.error('Failed to submit puzzle:', error);
      Alert.alert('Error', 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>{item.content}</Text>
      
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.postImage}
          resizeMode="contain"
        />
      )}

      <Text style={styles.postDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderDailyPuzzle = () => {
    if (!activePuzzle) return null;
    
    const puzzleStatus = puzzleStatuses[activePuzzle.post_id];

    return (
      <View style={styles.dailyPuzzleCard}>
        <View style={styles.dailyPuzzleHeader}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text style={styles.dailyPuzzleTitle}>Daily Chess Puzzle</Text>
        </View>
        
        <Text style={styles.puzzleTitle}>{activePuzzle.title}</Text>
        <Text style={styles.puzzleContent}>{activePuzzle.content}</Text>
        
        {activePuzzle.image && (
          <Image
            source={{ uri: activePuzzle.image }}
            style={styles.puzzleImage}
            resizeMode="contain"
          />
        )}

        {puzzleStatus && (
          <View style={styles.puzzleStatus}>
            {puzzleStatus.has_solved ? (
              <View style={styles.solvedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#228B22" />
                <Text style={styles.solvedText}>Solved!</Text>
              </View>
            ) : (
              <View style={styles.attemptsBadge}>
                <Ionicons name="sync" size={20} color="#666" />
                <Text style={styles.attemptsText}>
                  Attempts: {puzzleStatus.attempts_used}/2
                </Text>
              </View>
            )}
          </View>
        )}

        {puzzleStatus && !puzzleStatus.has_solved && puzzleStatus.attempts_remaining > 0 && (
          <TouchableOpacity
            style={styles.solvePuzzleButton}
            onPress={() => setSelectedPuzzle(activePuzzle)}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.solvePuzzleButtonText}>Solve Puzzle</Text>
          </TouchableOpacity>
        )}
        
        {puzzleStatus && puzzleStatus.attempts_remaining === 0 && !puzzleStatus.has_solved && (
          <View style={styles.noAttemptsContainer}>
            <Ionicons name="close-circle" size={20} color="#DC143C" />
            <Text style={styles.noAttemptsText}>No attempts remaining</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user?.role === 'owner' && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/(tabs)/admin')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.adminButtonText}>Create Post</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderDailyPuzzle()}
        ListEmptyComponent={
          activePuzzle ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )
        }
      />

      <Modal
        visible={selectedPuzzle !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPuzzle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Solve the Puzzle</Text>
            <Text style={styles.modalSubtitle}>{selectedPuzzle?.title}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your answer (e.g., Nf3)"
              value={puzzleAnswer}
              onChangeText={setPuzzleAnswer}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setSelectedPuzzle(null);
                  setPuzzleAnswer('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handlePuzzleSubmit}
                disabled={submitting || !puzzleAnswer.trim()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  adminButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dailyPuzzleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  dailyPuzzleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  dailyPuzzleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginLeft: 12,
  },
  puzzleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  puzzleContent: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 24,
  },
  puzzleImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
  },
  puzzleStatus: {
    marginBottom: 12,
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  solvedText: {
    fontSize: 16,
    color: '#228B22',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  attemptsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5DC',
    padding: 8,
    borderRadius: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  solvePuzzleButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solvePuzzleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  noAttemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  noAttemptsText: {
    fontSize: 14,
    color: '#DC143C',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#DDD',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#8B4513',
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
