import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { MessageCard } from '../components/MessageCard';
import { useTranslation } from 'react-i18next';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          setQuery(transcript);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
      return;
    }

    try {
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          setQuery(e.value[0]);
        }
      };
      Voice.onSpeechError = (e: SpeechErrorEvent) => {
        console.error('Speech error', e);
        setIsListening(false);
      };
      Voice.onSpeechEnd = () => {
        setIsListening(false);
      };
    } catch (error) {
      console.log('Voice init error', error);
    }

    return () => {
      if (Platform.OS !== 'web') {
        try {
          Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
        } catch (error) {}
      }
    };
  }, []);

  const { listen } = useLocalSearchParams();

  useEffect(() => {
    if (listen === 'true') {
      toggleListening();
    }
  }, [listen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 0) {
        performSearch(query);
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await api.messages.search(q);
      setResults(data.messages || []);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = async () => {
    if (Platform.OS === 'web') {
      if (!recognitionRef.current) {
        Alert.alert(t('common.error'), 'Voice search is not supported in this browser.');
        return;
      }
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        setQuery('');
        setIsListening(true);
        recognitionRef.current.lang = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
        recognitionRef.current.start();
      }
      return;
    }

    if (isListening) {
      try {
        await Voice.stop();
        setIsListening(false);
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        setQuery('');
        setIsListening(true);
        await Voice.start(i18n.language === 'ar' ? 'ar-SA' : 'en-US');
      } catch (e) {
        console.error(e);
        setIsListening(false);
        Alert.alert(t('common.error'), 'Could not start voice recognition. Ensure you are running a custom Dev Build.');
      }
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.iconDefault} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.iconDefault}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <MaterialIcons name="close" size={20} color={colors.iconDefault} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleListening} style={styles.clearButton}>
            <MaterialIcons name={isListening ? "mic" : "mic-none"} size={20} color={isListening ? colors.error : colors.iconDefault} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="search-off" size={48} color={colors.border} />
          <Text style={styles.emptyText}>{t('search.no_results')}</Text>
          <Text style={styles.emptySub}>{t('search.no_results_sub')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MessageCard
              message={item}
              onPress={() => router.push(item.parent_id ? `/thread/${item.parent_id}` : `/chat/${item.channel_slug}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textDim,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  }
});
