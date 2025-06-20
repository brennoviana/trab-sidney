import {useState} from 'react';
import { Text, SafeAreaView, StyleSheet, View } from 'react-native';

import Mensagens from './components/Mensagens';
import Login from './components/Login';
import Logo from './components/Logo';


export default function App() {
  const [opcao,setOpcao] = useState(true);
  const [userName,setUsername] = useState("");

  function clickMenu(name){
      setOpcao(!opcao);
      setUsername(name);
  }

  return (
    <SafeAreaView style={[styles.container, !opcao && styles.chatContainer]}>
      {opcao && (
        <>
          <Logo />
          <Text style={styles.title}>
          </Text>
        </>
      )}

      {opcao ? <Login click={clickMenu}/> : <Mensagens click={clickMenu} user={userName}/>} 
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  chatContainer: {
    padding: 0,
    justifyContent: 'flex-start',
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    margin: 24,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
