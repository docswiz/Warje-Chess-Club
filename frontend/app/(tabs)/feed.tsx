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
        setPosts(data);
        
        // Load puzzle statuses
        for (const post of data) {
          if (post.is_puzzle) {
            loadPuzzleStatus(post.post_id);
          }
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

  const renderPost = ({ item }: { item: Post }) => {
    const puzzleStatus = item.is_puzzle ? puzzleStatuses[item.post_id] : null;

    return (
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

        {item.is_puzzle && (
          <View style={styles.puzzleSection}>
            <View style={styles.puzzleHeader}>
              <Ionicons name="extension-puzzle" size={24} color="#8B4513" />
              <Text style={styles.puzzleLabel}>Chess Puzzle</Text>
            </View>
            
            {puzzleStatus && (
              <View style={styles.puzzleStatus}>
                {puzzleStatus.has_solved ? (
                  <Text style={styles.solvedText}>✓ Solved!</Text>
                ) : (
                  <Text style={styles.attemptsText}>
                    Attempts: {puzzleStatus.attempts_used}/2
                  </Text>
                )}
              </View>
            )}

            {puzzleStatus && !puzzleStatus.has_solved && puzzleStatus.attempts_remaining > 0 && (
              <TouchableOpacity
                style={styles.solveButton}
                onPress={() => setSelectedPuzzle(item)}
              >
                <Text style={styles.solveButtonText}>Solve Puzzle</Text>
              </TouchableOpacity>
            )}
            
            {puzzleStatus && puzzleStatus.attempts_remaining === 0 && !puzzleStatus.has_solved && (
              <Text style={styles.noAttemptsText}>No attempts remaining</Text>
            )}
          </View>
        )}

        <Text style={styles.postDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
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
  puzzleSection: {
    backgroundColor: '#F5F5DC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  puzzleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  puzzleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginLeft: 8,
  },
  puzzleStatus: {
    marginBottom: 8,
  },
  solvedText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  attemptsText: {
    fontSize: 14,
    color: '#666',
  },
  solveButton: {
    backgroundColor: '#8B4513',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  solveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  noAttemptsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
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
