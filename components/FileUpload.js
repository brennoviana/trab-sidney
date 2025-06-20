import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { database, ref, set } from '../config/Firebase';

export default function FileUpload({ onFileSelect, onUploadStart, onUploadComplete }) {
  // Save image with retry on compression
  const saveImageWithAutoCompress = async (originalUri, fileName) => {
    try {
      // First attempt with normal save
      return await saveFileToDatabase(originalUri, fileName, 'image');
    } catch (error) {
      if (error.message.includes('muito grande')) {
        // Show helpful message for large files
        Alert.alert(
          'Imagem muito grande', 
          'A imagem selecionada é muito grande (máximo 3MB).\n\n💡 Dicas:\n• Use a opção "Editar" ao selecionar\n• Escolha uma resolução menor\n• Tire uma nova foto com menor qualidade'
        );
      } else {
        // Re-throw other errors
        throw error;
      }
      return null;
    }
  };

  const saveFileToDatabase = async (fileUri, fileName, fileType) => {
    try {
      // Start upload indicator
      if (onUploadStart) onUploadStart();

      console.log('Converting file to Base64...');
      
      // Convert file to Base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Check file size (limit to ~3MB for database efficiency)
      const sizeLimit = 3 * 1024 * 1024; // 3MB in bytes
      const estimatedSize = base64.length * 0.75; // Base64 is ~33% larger than original
      
      if (estimatedSize > sizeLimit) {
        throw new Error('Arquivo muito grande. Máximo 3MB.');
      }
      
      // Create unique ID and metadata
      const timestamp = Date.now();
      const fileId = `${fileType}_${timestamp}`;
      
      // Prepare data for database
      const fileData = {
        id: fileId,
        name: fileName,
        type: fileType,
        base64: base64,
        timestamp: timestamp,
        size: estimatedSize
      };
      
      // Save to Firebase Database
      const fileRef = ref(database, `photos/${fileId}`);
      await set(fileRef, fileData);
      
      console.log('✅ File saved to database successfully!');
      
      // Complete upload indicator
      if (onUploadComplete) onUploadComplete();
      
      // Create appropriate data URI based on file type
      let dataUri;
      if (fileType === 'image') {
        dataUri = `data:image/jpeg;base64,${base64}`;
      } else {
        // For documents, use generic data URI
        dataUri = `data:application/octet-stream;base64,${base64}`;
      }
      
      return {
        uri: dataUri,
        type: fileType,
        name: fileName,
        fileId: fileId,
        isBase64: true
      };
    } catch (error) {
      console.error('Erro ao salvar arquivo:', error);
      if (onUploadComplete) onUploadComplete();
      
      let errorMessage = 'Não foi possível salvar o arquivo.';
      if (error.message.includes('muito grande')) {
        errorMessage = 'Arquivo muito grande! Máximo 3MB.\nTente uma imagem menor ou use qualidade menor.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Erro de permissão no Firebase Database.';
      }
      
      Alert.alert('Erro ao Salvar', errorMessage);
      return null;
    }
  };

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.3, // Lower quality for smaller files
        allowsMultipleSelection: false,
      });

      console.log('📷 Image picker result:', result);

      if (!result.canceled) {
        const file = result.assets[0];
        const fileName = file.uri.split('/').pop() || `image_${Date.now()}.jpg`;
        
        console.log('🖼️ Image selected:', fileName, 'Size:', file.fileSize || 'unknown');
        
        // Try to save with automatic compression if needed
        const savedFile = await saveImageWithAutoCompress(file.uri, fileName);
        
        if (savedFile) {
          console.log('✅ Image saved successfully');
          onFileSelect(savedFile);
        }
      } else {
        console.log('❌ Image selection cancelled');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const pickDocument = async () => {
    try {
      console.log('🔍 Opening document picker...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('📄 Document picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('📎 Document selected:', file.name, 'Size:', file.size);
        
        // Save to Firebase Database as Base64
        const savedFile = await saveFileToDatabase(file.uri, file.name, 'document');
        
        if (savedFile) {
          console.log('✅ Document saved successfully');
          onFileSelect(savedFile);
        }
      } else if (result.type === 'success') {
        // Handle old format (expo-document-picker v11 format)
        console.log('📎 Document selected (legacy format):', result.name, 'Size:', result.size);
        
        const savedFile = await saveFileToDatabase(result.uri, result.name, 'document');
        
        if (savedFile) {
          console.log('✅ Document saved successfully');
          onFileSelect(savedFile);
        }
      } else {
        console.log('❌ Document selection cancelled');
      }
    } catch (err) {
      console.error('❌ Erro ao selecionar documento:', err);
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