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
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  Send, Camera, Image as ImageIcon, Sparkles, X, Bot, Terminal, LogOut, Volume2, VolumeX, FileText, ChevronRight, CheckCircle, Clock
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Message = { id: string; role: "user" | "agent"; content: string; imageUri?: string; isLoading?: boolean; };

const COMMANDS = [
  { cmd: '/scan', desc: 'Scan physical hardware or document' },
  { cmd: '/bom', desc: 'Extract Bill of Materials (BOM)' },
  { cmd: '/create-event', desc: 'Create Sourcing Event/Auction' },
  { cmd: '/generate-po', desc: 'Generate Purchase Order (PO)' },
  { cmd: '/post-po', desc: 'Post PO to ERP & Vendor' },
  { cmd: '/create-vendor', desc: 'Onboard a new vendor' },
  { cmd: '/add-product', desc: 'Add item to product catalog' },
  { cmd: '/approve-all', desc: 'Bulk approve all pending requests' },
  { cmd: '/spend-report', desc: 'Generate spend analytics report' },
  { cmd: '/analyze-bids', desc: 'Evaluate vendor proposals' },
  { cmd: '/analyze-risk', desc: 'Generate global vendor risk profile' },
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
    <LinearGradient colors={['#020617', '#0f172a', '#1e293b']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24 }} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 450, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={styles.glowOrb} />
            <Sparkles color="#00c6ff" size={56} style={{ marginBottom: 16 }} />
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1 }}>CORTEX</Text>
            <Text style={{ color: '#38bdf8', fontSize: 14, marginTop: 8, fontWeight: '600', letterSpacing: 2 }}>SECURE LOGIN</Text>
          </View>
          <BlurView intensity={20} tint="dark" style={{ padding: 24, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ gap: 16 }}>
              <TextInput placeholder="Email address" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.inputField} />
              <TextInput placeholder="Password" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry style={styles.inputField} />
              {error ? <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text> : null}
              <TouchableOpacity onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={['#00c6ff', '#0072ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.loginBtn, loading && { opacity: 0.7 }]}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{loading ? 'Authenticating...' : 'INITIALIZE'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Chat State
  const [isSpeaking, setIsSpeaking] = useState(true); 
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "agent", content: "Cortex Mobile is online. I am synced with your CPanel database. Type / to view commands." }
  ]);
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scrollViewRef = useRef<ScrollView>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (token && isSpeaking) {
      Speech.speak("Cortex Mobile is online.", { rate: 1.0, pitch: 1.1 });
    }
  }, [token]);

  useEffect(() => {
    AsyncStorage.getItem('cortex_token').then(t => {
      if (t) setToken(t);
      setIsAuthLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('cortex_token');
    Speech.stop();
    setToken(null);
    setMessages([{ id: "1", role: "agent", content: "Cortex Mobile is online. I am synced with your CPanel database. Type / to view commands." }]);
  };

  // --- CHAT LOGIC ---
  const handleTextChange = (text: string) => {
    setInput(text);
    setShowCommands(text.startsWith('/'));
  };

  const executeCommand = (cmd: string) => {
    setInput(cmd);
    setShowCommands(false);
    setTimeout(() => handleSend(cmd), 50);
  };

  const toggleVoice = () => {
    if (isSpeaking) Speech.stop();
    setIsSpeaking(!isSpeaking);
  };

  const speakText = (text: string) => {
    if (isSpeaking) {
      const cleanText = text.replace(/https?:\/\/[^\s]+/g, 'a link').replace(/[*#]/g, '');
      Speech.stop();
      Speech.speak(cleanText, { rate: 1.05, pitch: 1.1 });
    }
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
    setMessages(prev => [...prev, { id: botMsgId, role: "agent", content: "", isLoading: true }]);

    try {
      const res = await fetch('https://purchase.procgen.in/api/ai/cortex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ prompt: promptText, userName: 'Mobile User', history: [] })
      });
      const data = await res.json();
      const responseText = data.reply || data.message || data.final_response || "Command executed successfully.";
      
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: responseText, isLoading: false } : m));
      speakText(responseText);
    } catch (err: any) {
      const errText = "Network error reaching CPanel.";
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: errText, isLoading: false } : m));
      speakText("Network error reaching CPanel.");
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
    return (
      <LinearGradient colors={['#020617', '#0f172a']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </LinearGradient>
    );
  }

  if (!token) return <LoginScreen onLogin={(t) => setToken(t)} />;

  if (isCameraActive) {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', marginBottom: 20 }}>Camera permission is required.</Text>
          <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#0072ff', padding: 16, borderRadius: 12, alignItems: 'center' }}><Text style={{ color: '#fff' }}>Grant Permission</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setIsCameraActive(false)} style={{ marginTop: 20 }}><Text style={{ color: '#94a3b8' }}>Cancel</Text></TouchableOpacity>
        </SafeAreaView>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
          <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }} edges={['top', 'bottom']}>
            <View style={{ padding: 20, alignItems: "flex-end" }}>
              <TouchableOpacity onPress={() => setIsCameraActive(false)} style={{ padding: 12 }}>
                <BlurView intensity={40} tint="dark" style={{ padding: 12, borderRadius: 30, overflow: 'hidden' }}>
                  <X color="#fff" size={24} />
                </BlurView>
              </TouchableOpacity>
            </View>
            <View style={styles.cameraControls}>
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
    <LinearGradient colors={['#020617', '#0f172a', '#020617']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          
          <BlurView intensity={50} tint="dark" style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.headerIconBg}>
                <Sparkles color="#00c6ff" size={20} />
              </View>
              <View>
                <Text style={styles.headerTitle}>CORTEX</Text>
                <Text style={styles.headerSubtitle}>LIVE SYNC <Text style={{ color: '#00ffaa' }}>●</Text></Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={toggleVoice} style={{ padding: 8 }}>
                {isSpeaking ? <Volume2 color="#00c6ff" size={24} /> : <VolumeX color="#64748b" size={24} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
                <LogOut color="#ef4444" size={22} />
              </TouchableOpacity>
            </View>
          </BlurView>

          <ScrollView 
            ref={scrollViewRef} 
            style={styles.chatArea} 
            contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} 
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) => (
              <View key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {msg.role === "agent" && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Bot color="#00c6ff" size={16} />
                    <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}>CORTEX</Text>
                  </View>
                )}
                
                <LinearGradient
                  colors={msg.role === 'user' ? ['#0072ff', '#00c6ff'] : ['rgba(30,41,59,0.8)', 'rgba(15,23,42,0.8)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.agentBubble]}
                >
                  {msg.imageUri && (
                    <Image source={{ uri: msg.imageUri }} style={{ width: 220, height: 220, borderRadius: 12, marginBottom: 12 }} />
                  )}
                  {msg.isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#00c6ff" size="small" style={{ marginRight: 12 }} />
                      <Text style={{ color: "#38bdf8", fontWeight: '500' }}>Processing request...</Text>
                    </View>
                  ) : (
                    <Text style={[styles.messageText, msg.role === 'user' && { color: '#fff', fontWeight: '500' }]}>{msg.content}</Text>
                  )}
                </LinearGradient>
              </View>
            ))}
          </ScrollView>

          {showCommands && (
            <BlurView intensity={90} tint="dark" style={styles.commandMenu}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 250 }}>
                {COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase())).map((cmd, i) => (
                  <TouchableOpacity key={i} style={styles.commandItem} onPress={() => executeCommand(cmd.cmd)}>
                    <View style={{ backgroundColor: 'rgba(0,198,255,0.1)', padding: 8, borderRadius: 8 }}>
                      <Terminal color="#00c6ff" size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{cmd.cmd}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 13 }}>{cmd.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>
          )}

          <BlurView intensity={30} tint="dark" style={styles.inputContainer}>
            <TouchableOpacity onPress={() => pickImage()} style={styles.actionButton}>
              <ImageIcon color="#94a3b8" size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsCameraActive(true)} style={styles.actionButton}>
              <Camera color="#00c6ff" size={24} />
            </TouchableOpacity>

            <View style={styles.textInputWrapper}>
              <TextInput 
                style={styles.textInput} 
                placeholder="Message Cortex or type /..." 
                placeholderTextColor="#64748b" 
                value={input} 
                onChangeText={handleTextChange} 
                onSubmitEditing={() => handleSend()} 
              />
              <TouchableOpacity onPress={() => handleSend()} style={[styles.sendButton, !input.trim() && { backgroundColor: 'transparent' }]} disabled={!input.trim()}>
                <Send color={input.trim() ? "#00c6ff" : "#475569"} size={20} />
              </TouchableOpacity>
            </View>
          </BlurView>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  glowOrb: { position: 'absolute', top: -50, width: 150, height: 150, backgroundColor: '#00c6ff', borderRadius: 75, opacity: 0.15 },
  inputField: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 18, color: '#fff', fontSize: 16 },
  loginBtn: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  headerIconBg: { backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 10, borderRadius: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  headerSubtitle: { color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  chatArea: { flex: 1, width: '100%' },
  messageBubble: { padding: 18, borderRadius: 20 },
  userBubble: { borderBottomRightRadius: 4 },
  agentBubble: { borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  messageText: { color: "#e2e8f0", fontSize: 16, lineHeight: 24 },
  loadingContainer: { flexDirection: "row", alignItems: "center" },
  inputContainer: { flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", width: '100%' },
  actionButton: { padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginRight: 8 },
  textInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  textInput: { flex: 1, color: "#fff", fontSize: 16, paddingHorizontal: 20, paddingVertical: 14 },
  sendButton: { padding: 10, marginRight: 6, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  cameraControls: { paddingBottom: 50, alignItems: "center" },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: '#fff' },
  captureButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff" },
  commandMenu: { position: 'absolute', bottom: 100, left: 16, right: 16, borderRadius: 24, zIndex: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  commandItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
});