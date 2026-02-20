import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AdminScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPuzzle, setIsPuzzle] = useState(false);
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failureMessage, setFailureMessage] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    if (isPuzzle && !puzzleAnswer.trim()) {
      Alert.alert('Error', 'Please provide the puzzle answer');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          image: imageBase64,
          is_puzzle: isPuzzle,
          puzzle_answer: isPuzzle ? puzzleAnswer : null,
          success_message: isPuzzle && successMessage ? successMessage : null,
          failure_message: isPuzzle && failureMessage ? failureMessage : null,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Post created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setTitle('');
              setContent('');
              setImageBase64(null);
              setIsPuzzle(false);
              setPuzzleAnswer('');
              setSuccessMessage('');
              setFailureMessage('');
              router.replace('/(tabs)/feed');
            },
          },
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create post');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter post title"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter post content"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Image</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="image" size={24} color="#8B4513" />
            <Text style={styles.imageButtonText}>
              {imageBase64 ? 'Change Image' : 'Select Image'}
            </Text>
          </TouchableOpacity>
          {imageBase64 && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageBase64(null)}
              >
                <Ionicons name="close-circle" size={32} color="#DC143C" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.switchGroup}>
          <View style={styles.switchLabel}>
            <Ionicons name="extension-puzzle" size={24} color="#8B4513" />
            <Text style={styles.label}>This is a chess puzzle</Text>
          </View>
          <Switch
            value={isPuzzle}
            onValueChange={setIsPuzzle}
            trackColor={{ false: '#DDD', true: '#D2B48C' }}
            thumbColor={isPuzzle ? '#8B4513' : '#f4f3f4'}
          />
        </View>

        {isPuzzle && (
          <View style={styles.puzzleFields}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Puzzle Answer * (e.g., Nf3)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter the correct move"
                value={puzzleAnswer}
                onChangeText={setPuzzleAnswer}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Success Message</Text>
              <TextInput
                style={styles.input}
                placeholder="Message shown when correct (optional)"
                value={successMessage}
                onChangeText={setSuccessMessage}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Failure Message</Text>
              <TextInput
                style={styles.input}
                placeholder="Message shown when all attempts used (optional)"
                value={failureMessage}
                onChangeText={setFailureMessage}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Create Post</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B4513',
  },
  backButton: {
    backgroundColor: '#FFF8DC',
    padding: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 16,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#8B4513',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  puzzleFields: {
    backgroundColor: '#F5F5DC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
