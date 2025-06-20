import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { database, ref, onValue } from '../config/Firebase';
import Cadastro from './Cadastro';

export default function Login(props) {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [mensagemLogin, setMensagemLogin] = useState('');
  const [showCadastro, setShowCadastro] = useState(false);

  useEffect(() => {
    const usuariosRef = ref(database, '/login');
    const onValueChange = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsuarios(Object.values(data));
      }
    };
    const unsubscribe = onValue(usuariosRef, onValueChange);
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !senha.trim()) {
      setMensagemLogin('Digite usuário e senha!');
      return;
    }

    const usuarioEncontrado = usuarios.find(
      usuario => usuario.username === username
    );

    if (usuarioEncontrado) {
      if (usuarioEncontrado.senha === senha) {
        setMensagemLogin('');
        props.click(usuarioEncontrado.username);
      } else {
        setMensagemLogin('Senha incorreta!');
      }
    } else {
      setMensagemLogin('Usuário não encontrado!');
    }
  };

  if (showCadastro) {
    return <Cadastro onBack={() => setShowCadastro(false)} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Login</Text>

      <TextInput
        label="Usuário"
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

      {mensagemLogin ? (
        <Text style={styles.error}>{mensagemLogin}</Text>
      ) : null}

      <Button
        mode="contained"
        onPress={handleLogin}
        style={styles.button}
      >
        Entrar
      </Button>

      <Button
        mode="text"
        onPress={() => setShowCadastro(true)}
        style={styles.button}
      >
        Criar nova conta
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2c3e50',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#ffffff',
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  button: {
    marginTop: 15,
    paddingVertical: 8,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  error: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#fadbd8',
    padding: 10,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
});
