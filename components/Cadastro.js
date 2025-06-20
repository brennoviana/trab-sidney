import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { database, ref, push, set, get } from '../config/Firebase';

export default function Cadastro({ onBack }) {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');

  const handleCadastro = async () => {
    if (!username.trim() || !senha.trim() || !confirmarSenha.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const usuariosRef = ref(database, '/login');
      const snapshot = await get(usuariosRef);
      const usuarios = snapshot.val() || {};

      const usuarioExiste = Object.values(usuarios).some(
        usuario => usuario.username === username
      );

      if (usuarioExiste) {
        setError('Este nome de usuário já está em uso');
        return;
      }

      const newUser = {
        username,
        senha,
        dataCadastro: Date.now()
      };

      const newUserRef = push(usuariosRef);
      await set(newUserRef, newUser);

      setUsername('');
      setSenha('');
      setConfirmarSenha('');
      setError('');
      onBack();
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      setError('Erro ao cadastrar usuário');
    }
  };

  return (
    <View style={styles.container}>

      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Cadastro</Text>
      
      <TextInput
        label="Nome de Usuário"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />
      
      <TextInput
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={styles.input}
      />
      
      <TextInput
        label="Confirmar Senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        secureTextEntry
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        mode="contained"
        onPress={handleCadastro}
        style={styles.button}
      >
        Cadastrar
      </Button>

      <Button
        mode="text"
        onPress={onBack}
        style={styles.button}
      >
        Voltar para Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    width: '100%',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});
