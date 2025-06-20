import React, { useState, useEffect } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { TextInput, Button, Text, Avatar, IconButton, Menu } from 'react-native-paper';

import { database, ref, push, set, onValue, off, remove, update } from '../config/Firebase';
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

  // Carregar lista de usuários
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

  // Carregar mensagens da conversa selecionada
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

  // Enviar mensagem
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
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    }
  };

  // Editar mensagem
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

  // Renderizar contato
  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => {
        setSelectedUser(item);
        setShowContacts(false);
      }}
    >
      <Avatar.Text size={40} label={item.username.substring(0, 2).toUpperCase()} />
      <Text style={styles.contactName}>{item.username}</Text>
    </TouchableOpacity>
  );

  // Renderizar mensagem
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
                <View style={styles.fileDocument}>
                  <IconButton icon="file" size={24} />
                  <Text style={styles.fileName}>{item.file.name}</Text>
                </View>
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
            <FileUpload onFileSelect={setSelectedFile} />
            <TextInput
              label="Mensagem"
              value={message}
              onChangeText={setMessage}
              style={styles.input}
            />
            <Button mode="contained" onPress={handleSend} style={styles.sendButton}>
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
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
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
});
