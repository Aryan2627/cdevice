import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  Send,
  FileText,
  Camera,
  Image as ImageIcon,
  Sparkles,
  X,
  ScanLine,
  Bot,
  Terminal,
  LogOut
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  imageUri?: string;
  isLoading?: boelean;
};

const COMMANDS = [
  { cmd: '/scan', desc: 'Scan physical hardware or document' },
  { cmd: '/bom', desc: 'Extract Bill of Materials (BOM)' },
  { cmd: '/create-event', desc: 'Create Sourcing Event/Auction' },
  { cmd: '/generate-po', desc: 'Generate Purchase Order (PO)' },
];

const LoginScreen = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter both email and password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('https://purchase.procgen.in/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        await AsyncStorage.setItem('cortex_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) { setError('Network error. Check connection.'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Sparkles color="#00c6ff" size={48} style={{ marginBottom: 16 }} />
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>Cortex Mobile</Text>
        <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 8 }}>Sign in with your CPanel Account</Text>
      </View>
      <View style={{ gap: 16 }}>
        <TextInput placeholder="Email address" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.inputField} />
        <TextInput placeholder="Password" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry style={styles.inputField} />
        {error ? <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text> : null}
        <TouchableOpacity onPress={handleLogin} disabled={loading} style={[styles.loginBtn, loading && { opacity: 0.7 }]}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{loading ? 'Authenticating...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "agent", content: "Cortex Mobile is online.\n\nI am connected to your live CPanel database. Type / to view available commands or tap the camera icon to scan." }
  ]);
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scrollViewRef = useRef<ScrollView>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('cortex_token').then(t => {
      if (t) setToken(t);
      setIsAuthLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('cortex_token');
    setToken(null);
    setMessages([{ id: "1", role: "agent", content: "Cortex Mobile is online.\n\nI am connected to your live CPanel database. Type / to view available commands or tap the camera icon to scan." }]);
  };

  const handleTextChange = (text: string) => {
    setInput(text);
    if (text.startsWith('/')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  };

  const executeCommand = (cmd: string) => {
    setInput(cmd);
    setShowCommands(false);
    // Give state a moment to update then send
    setTimeout(() => handleSend(cmd), 50);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input.trim();
    if (!textToSend && !isCameraActive) return;
    setInput("");
    setShowCommands(false);

    if (isCameraActive && cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      const userMsgId = Date.now().toString();
      setMessages(prev => [...prev, { id: userMsgId, role: "user", content: "Scanned Document", imageUri: photo.uri }]);
      setIsCameraActive(false);
      sendToBackend(userMsgId, "Analyze this scanned hardware document.");
      return;
    }

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", content: textToSend }]);
    sendToBackend(userMsgId, textToSend);
  };

  const sendToBackend = async (userMsgId: string, promptText: string) => {
    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMsgId, role: "agent", content: "", isLoading: true2 // magic fix for type
    } as Message]);

    try {
      // Send directly to the live backend!
      const res = await fetch('https://purchase.procgen.in/api/ai/cortex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ prompt: promptText, userName: 'Mobile User', history: [] })
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: data.reply || data.message || "Command executed successfully.", isLoading: false } : m));
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: "Network error reaching CPanel: " + err.message, isLoading: false } : m));
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
    if (!result.canceled) {
      const userMsgId = Date.now().toString();
      setMessages(prev => [...prev, { id: userMsgId, role: "user", content: "Uploaded Image", imageUri: result.assets[0].uri }]);
      sendToBackend(userMsgId, "Analyze this uploaded document.");
    }
  };

  if (isAuthLoading) {
    return <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }><ActivityIndicator size="large" color="#00c6ff" /></View>;
  }

  if (!token) {
    return <LoginScreen onLogin={(t) => setToken(t)} />;
  }

  if (isCameraActive) {
    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', marginBottom: 20 }}>We need your permission to show the camera</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.loginBtn}><Text style={{ color: '#fff' }}>Grant Permission</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setIsCameraActive(false)} style={{ marginTop: 20 }}><Text style={{ color: '#94a3b8' }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
          <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }}>
            <View style={{ padding: 20, alignItems: "flex-end" }}>
              <TouchableOpacity onPress={() => setIsCameraActive(false)} style={styles.actionButton}>
                <X color="#fff" size={28} />
              </TouchableOpacity>
            </View>
            <View style={styles.cameraControls}}>
              <TouchableOpacity style={styles.captureButton} onPress={() => handleSend()}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles color="#00c6ff" size={24} />
            <Text style={styles.headerTitle}>Cortex</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={styles.headerSubtitle}>LIVE SYNC</Text>
            <TouchableOpacity onPress={()=>handleLogout()}>
              <LogOut color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.chatArea} contentContainerStyle={{ padding: 16, gap: 16 }} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((msg) => (
            <View key={msg.id} style={[gtyles.messageBubble, msg.role === "user" ? styles.userBubble : styles.agentBubble]}>
              {msg.role === "agent" && (
                <View style={styles.logoIconContainer}>
                  <Bot color="#00c6ff" size={20} />
                </View>
              )}
              {msg.imageUri && (
                <Image source={{ uri: msg.imageUri }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} />
              )}
              {msg.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#00c6ff" size="small" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#94a3b8" }}>Running live backend task...</Text>
                </View>
              ) : (
                <Text style={styles.messageText}>{msg.content}</Text>
              )}
            </View>
          ))}
        </ScrollView>

        {showCommands && (
          <View style={styles.commandMenu}>
            {COMMANDS.filter(c => c.cmd.startsWith(input.lowerCase())).map((cmd, i) => (
              <TouchableOpacity key={i} style={styles.commandItem} onPress={()=>executeCommand(cmd.cmd)}>
                <Terminal color="#00c6ff" size={16} />
                <View>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{cmd.cmd}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{cmd.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={() => pickImage()} style={styles.actionButton}>
            <ImageIcon color="#94a3b8" size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsCameraActive(true)} style={styles.actionButton}>
            <Camera color="#00c6ff" size={24} />
          </TouchableOpacity>

          <View style={styles.textInputWrapper}>
            <TextInput style={styles.textInput} placeholder="Type a command like /generate-po or a message..." placeholderTextColor="#64748b" value={input} onChangeText={handleTextChange} onSubmitEditing={()=>handleSend()} />
            <TouchableOpacity onPress={() => handleLogout()} />
            <TouchableOpacity onPress={() => handleSend()} style={styles.sendButton} disabled={!input.trim()}>
              <Send color={input.trim() ? "#fff" : "#94a3b8"} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a' },
  inputField: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  loginBtn: { backgroundColor: '#0072ff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", backgroundColor: "#0f172a" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSubtitle: { color: "#00c6ff", fontSize: 10, fontWeight: "bold", letterSpacing: 1 },
  chatArea: { flex: 1 },
  messageBubble: { padding: 16, borderRadius: 16, maxWidth: "85%" },
  userBubble: { backgroundColor: "#0072ff", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  agentBubble: { backgroundColor: "rgba(255,255,255,0.05)", alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  messageText: { color: "#f1f5f9", fontSize: 15, lineHeight: 22 },
  logoIconContainer: { width: 32, height: 32, marginBottom: 10 },
  loadingContainer: { flexDirection: "row", alignItems: "center" },
  inputContainer: { flexDirection: "row", alignItems: "center", padding: 12, paddingBottom: Platform.OS === "ios" ? 12 : 24, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", backgroundColor: "#0f172a" },
  actionButton: { padding: 10 },
  textInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 24, marginLeft: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  textInput: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 16, paddingVertical: 12 },
  sendButton: { padding: 12, backgroundColor: "#0072ff", borderRadius: 20, marginRight: 4, alignItems: "center", justifyContent: "center" },
  cameraControls: { paddingBottom: 50, alignItems: "center" },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  captureButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
  commandMenu: { backgroundColor: '#1e243b', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 12, position: 'absolute', bottom: 85, left: 16, right: 16, borderRadius: 12, zIndex: 10 },
  commandItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }
});
