import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function FileUpload({ onFileSelect }) {
  const pickImage = async () => {
    try {
      // Solicitar permissão para acessar a galeria
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar suas imagens.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        onFileSelect({
          uri: file.uri,
          type: 'image',
          name: file.uri.split('/').pop(),
        });
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        onFileSelect({
          uri: result.uri,
          type: 'document',
          name: result.name,
        });
      }
    } catch (err) {
      console.error('Erro ao selecionar documento:', err);
      Alert.alert('Erro', 'Não foi possível selecionar o documento.');
    }
  };

  return (
    <View style={styles.container}>
      <IconButton
        icon="image"
        size={24}
        onPress={pickImage}
        style={styles.button}
      />
      <IconButton
        icon="file"
        size={24}
        onPress={pickDocument}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  button: {
    margin: 0,
  },
}); 