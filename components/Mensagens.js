import React, { useState, useEffect, useRef } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Linking, Alert, AppState } from 'react-native';
import { TextInput, Button, Text, Avatar, IconButton, Menu } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';

import { database, ref, push, set, onValue, off, remove, update, get } from '../config/Firebase';
import FileUpload from './FileUpload';

export default function Mensagens(props) {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showContacts, setShowContacts] = useState(true);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const updateOnlineStatus = async (isOnline) => {
    try {
      const userStatusRef = ref(database, `users/${props.user}/status`);
      await set(userStatusRef, {
        online: isOnline,
        lastSeen: Date.now()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const updateTypingStatus = async (targetUser, typing) => {
    if (!targetUser) return;
    
    try {
      const chatId = [props.user, targetUser].sort().join('_');
      const typingRef = ref(database, `typing/${chatId}/${props.user}`);
      
      if (typing) {
        await set(typingRef, {
          typing: true,
          timestamp: Date.now()
        });
      } else {
        await remove(typingRef);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleTextChange = (text) => {
    setMessage(text);
    
    if (!selectedUser) return;
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(selectedUser.username, true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(selectedUser.username, false);
    }, 2000);
    
    if (text.length === 0) {
      setIsTyping(false);
      updateTypingStatus(selectedUser.username, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return 'file';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'file-pdf-box';
      case 'doc':
      case 'docx':
        return 'file-word-box';
      case 'xls':
      case 'xlsx':
        return 'file-excel-box';
      case 'ppt':
      case 'pptx':
        return 'file-powerpoint-box';
      case 'zip':
      case 'rar':
        return 'zip-box';
      case 'txt':
        return 'file-document';
      case 'mp3':
      case 'wav':
        return 'file-music';
      case 'mp4':
      case 'avi':
        return 'file-video';
      default:
        return 'file';
    }
  };

  useEffect(() => {
    updateOnlineStatus(true);

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        updateOnlineStatus(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        updateOnlineStatus(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      updateOnlineStatus(false);
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const usersStatusRef = ref(database, 'users');
    const unsubscribe = onValue(usersStatusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const onlineData = {};
        Object.keys(data).forEach(username => {
          if (data[username].status) {
            onlineData[username] = data[username].status;
          }
        });
        setOnlineUsers(onlineData);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    const chatId = [props.user, selectedUser.username].sort().join('_');
    const typingRef = ref(database, `typing/${chatId}`);
    
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      const typing = {};
      
      if (data) {
        Object.keys(data).forEach(username => {
          if (username !== props.user && data[username].typing) {
            const timeDiff = Date.now() - data[username].timestamp;
            if (timeDiff < 5000) {
              typing[username] = true;
            }
          }
        });
      }
      
      setTypingUsers(typing);
    });

    return () => unsubscribe();
  }, [selectedUser]);

  useEffect(() => {
    const usuariosRef = ref(database, '/login');
    const onValueChange = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.values(data).filter(user => user.username !== props.user);
        setUsuarios(usersList);
      }
    };
    const unsubscribe = onValue(usuariosRef, onValueChange);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    const chatId = [props.user, selectedUser.username].sort().join('_');
    const messagesRef = ref(database, `/chats/${chatId}`);

    const onValueChange = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(Object.values(data));
      } else {
        setMessages([]);
      }
    };

    const unsubscribe = onValue(messagesRef, onValueChange);
    return () => unsubscribe();
  }, [selectedUser]);

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || !selectedUser) return;

    const chatId = [props.user, selectedUser.username].sort().join('_');
    const newMessage = {
      sender: props.user,
      text: message,
      timestamp: Date.now(),
      isRead: false,
      file: selectedFile
    };

    try {
      const messageRef = ref(database, `/chats/${chatId}`);
      const newMessageRef = push(messageRef);
      await set(newMessageRef, {
        ...newMessage,
        id: newMessageRef.key
      });
      
      setMessage('');
      setSelectedFile(null);
      setIsTyping(false);
      updateTypingStatus(selectedUser.username, false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    }
  };

  const downloadDocument = async (file) => {
    try {
      console.log('📥 Starting document download for:', file.name);
      
      setDownloadingFiles(prev => new Set(prev).add(file.fileId || file.name));
      
      if (file.isBase64 && file.fileId) {
        console.log('📄 Retrieving document from database:', file.fileId);
        
        const fileRef = ref(database, `photos/${file.fileId}`);
        const snapshot = await get(fileRef);
        
        if (!snapshot.exists()) {
          Alert.alert('Erro', 'Arquivo não encontrado no banco de dados.');
          return;
        }
        
        const fileData = snapshot.val();
        const base64Data = fileData.base64;
        
        const fileName = file.name || 'document';
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        console.log('💾 Saving file to:', fileUri);
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('✅ File saved successfully');
        
        Alert.alert(
          'Download Concluído! 📥',
          `Arquivo "${fileName}" foi salvo.\n\nDeseja abrir o arquivo?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Abrir', 
              onPress: () => openDocument(fileUri, fileName)
            }
          ]
        );
        
      } else {
        console.log('📎 Handling regular file');
        openDocument(file.uri, file.name);
      }
      
    } catch (error) {
      console.error('❌ Erro ao baixar documento:', error);
      Alert.alert('Erro', 'Não foi possível baixar o documento.');
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.fileId || file.name);
        return newSet;
      });
    }
  };

  const openDocument = async (fileUri, fileName) => {
    try {
      console.log('🔍 Trying to open document:', fileUri);
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Erro', 'Arquivo não encontrado.');
        return;
      }
      
      console.log('📄 File info:', fileInfo);
      
      const canOpen = await Linking.canOpenURL(fileUri);
      if (canOpen) {
        await Linking.openURL(fileUri);
        console.log('✅ Document opened successfully');
      } else {
        Alert.alert(
          'Arquivo Salvo 📁',
          `O arquivo "${fileName}" foi salvo em:\n\n${fileUri}\n\nVocê pode acessá-lo pelo gerenciador de arquivos do seu dispositivo.`
        );
      }
      
    } catch (error) {
      console.error('❌ Erro ao abrir documento:', error);
      Alert.alert(
        'Arquivo Salvo 📁',
        `O arquivo "${fileName}" foi salvo com sucesso, mas não foi possível abri-lo automaticamente.\n\nVocê pode encontrá-lo no gerenciador de arquivos.`
      );
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!selectedUser) return;

    const chatId = [props.user, selectedUser.username].sort().join('_');
    try {
      await update(ref(database, `/chats/${chatId}/${messageId}`), {
        text: newText,
        edited: true
      });
      setEditingMessage(null);
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
      alert('Erro ao editar mensagem');
    }
  };

  const renderContact = ({ item }) => {
    const isOnline = onlineUsers[item.username]?.online;
    const lastSeen = onlineUsers[item.username]?.lastSeen;
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => {
          setSelectedUser(item);
          setShowContacts(false);
        }}
      >
        <View style={styles.avatarContainer}>
          <Avatar.Text size={40} label={item.username.substring(0, 2).toUpperCase()} />
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.username}</Text>
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 
             lastSeen ? `Visto ${new Date(lastSeen).toLocaleTimeString()}` : 
             'Offline'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender === props.user;
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={styles.messageContent}>
          {item.file && (
            <View style={styles.fileContainer}>
              {item.file.type === 'image' ? (
                <Image
                  source={{ uri: item.file.uri }}
                  style={styles.fileImage}
                  resizeMode="cover"
                />
              ) : (
                <TouchableOpacity 
                  style={styles.fileDocument}
                  onPress={() => downloadDocument(item.file)}
                  disabled={downloadingFiles.has(item.file.fileId || item.file.name)}
                >
                  <IconButton icon={getFileIcon(item.file.name)} size={24} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{item.file.name}</Text>
                    <Text style={styles.downloadHint}>
                      {downloadingFiles.has(item.file.fileId || item.file.name) 
                        ? 'Baixando...' 
                        : 'Toque para baixar'
                      }
                    </Text>
                  </View>
                  {downloadingFiles.has(item.file.fileId || item.file.name) ? (
                    <ActivityIndicator size="small" color="#2196f3" />
                  ) : (
                    <IconButton icon="download" size={20} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          {editingMessage === item.id ? (
            <View style={styles.editContainer}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                style={styles.editInput}
              />
              <IconButton
                icon="check"
                size={20}
                onPress={() => handleEditMessage(item.id, message)}
              />
              <IconButton
                icon="close"
                size={20}
                onPress={() => {
                  setEditingMessage(null);
                  setMessage('');
                }}
              />
            </View>
          ) : (
            <>
              <Text style={styles.messageText}>{item.text}</Text>
              <View style={styles.messageFooter}>
                <Text style={styles.messageTime}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                  {item.edited && ' (editado)'}
                </Text>
                {isOwnMessage && (
                  <Text style={styles.readStatus}>
                    {item.isRead ? '✓✓' : '✓'}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
        {isOwnMessage && !editingMessage && (
          <Menu
            visible={editingMessage === item.id}
            onDismiss={() => setEditingMessage(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setEditingMessage(item.id)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setEditingMessage(item.id);
                setMessage(item.text);
              }}
              title="Editar"
            />
            <Menu.Item
              onPress={() => remove(ref(database, `/chats/${chatId}/${item.id}`))}
              title="Excluir"
            />
          </Menu>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.usernameTop}>
          {showContacts ? 'Contatos' : `Conversa com ${selectedUser?.username}`}
        </Text>
        {!showContacts && (
          <Button
            mode="text"
            onPress={() => setShowContacts(true)}
            style={styles.backButton}
          >
            Voltar
          </Button>
        )}
      </View>

      {showContacts ? (
        <FlatList
          data={usuarios}
          renderItem={renderContact}
          keyExtractor={(item) => item.username}
          style={styles.contactsList}
        />
      ) : (
        <>
          <FlatList
            data={messages.sort((a, b) => a.timestamp - b.timestamp)}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
          />
          <View style={styles.inputContainer}>
            <FileUpload 
              onFileSelect={setSelectedFile}
              onUploadStart={() => setIsUploading(true)}
              onUploadComplete={() => setIsUploading(false)}
            />
            {isUploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#2196f3" />
                <Text style={styles.uploadingText}>Salvando foto...</Text>
              </View>
            )}
            {selectedFile && !isUploading && (
              <View style={styles.selectedFileContainer}>
                <Text style={styles.selectedFileText}>📎 {selectedFile.name}</Text>
                <IconButton
                  icon="close"
                  size={16}
                  onPress={() => setSelectedFile(null)}
                />
              </View>
            )}
            <TextInput
              label="Mensagem"
              value={message}
              onChangeText={setMessage}
              style={styles.input}
              disabled={isUploading}
            />
            <Button 
              mode="contained" 
              onPress={handleSend} 
              style={styles.sendButton}
              disabled={isUploading}
            >
              Enviar
            </Button>
          </View>
        </>
      )}

      <Button
        mode="contained"
        onPress={() => props.click()}
        style={styles.button_logout}
      >
        Sair
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    marginTop: 30
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  usernameTop: {
    fontWeight: 'bold',
    fontSize: 18
  },
  backButton: {
    marginLeft: 10
  },
  contactsList: {
    flex: 1
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  contactName: {
    marginLeft: 15,
    fontSize: 16
  },
  messagesList: {
    flex: 1
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%'
  },
  ownMessage: {
    alignSelf: 'flex-end'
  },
  otherMessage: {
    alignSelf: 'flex-start'
  },
  messageContent: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#e3f2fd'
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3f2fd'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5'
  },
  messageText: {
    fontSize: 16
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 5
  },
  readStatus: {
    fontSize: 12,
    color: '#2196f3',
    marginTop: 2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  input: {
    flex: 1,
    marginRight: 10
  },
  sendButton: {
    marginLeft: 10
  },
  button_logout: {
    marginTop: 20,
    backgroundColor: 'red'
  },
  fileContainer: {
    marginBottom: 8,
  },
  fileImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  fileDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
    borderStyle: 'dashed',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  downloadHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    marginRight: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 4,
    borderRadius: 8,
    marginRight: 8,
    maxWidth: 150,
  },
  selectedFileText: {
    fontSize: 12,
    color: '#2196f3',
    flex: 1,
  },
});
