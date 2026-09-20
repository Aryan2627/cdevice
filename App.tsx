import { StatusBar } from "expo-status-bar";
import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  Send,
  Camera,
  Image as ImageIcon,
  Sparkles,
  X,
  ScanLine,
} from "lucide-react-native";

type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  imageUri?: string;
  isLoading?: boolean;
};

const LoginScreen = ({ onLogin }: { onLogin: (token?: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('https://purchase.procgen.in/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        onLogin();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError('Network error. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    !isLoggedIn ? <LoginScreen onLogin={() => setIsLoggedIn(true)} /> : 
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24, maxWidth: 600, width: '100%', alignSelf: 'center' }}
    >
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Sparkles color="#00c6ff" size={48} style={{ marginBottom: 16 }} />
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>Cortex Mobile</Text>
        <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 8 }}>Sign in with your CPanel Account</Text>
      </View>

      <View style={{ gap: 16 }}>
        <TextInput
          placeholder="Email address"
          placeholderTextColor="#475569"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            color: '#fff',
            fontSize: 16
          }}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#475569"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            color: '#fff',
            fontSize: 16
          }}
        />

        {error ? <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: '#0072ff',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 8,
            opacity: loading ? 0.7 : 1
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content:
        "Cortex Mobile is online.\n\nI can analyze documents, hardware, and screens directly from your phone. Tap the camera icon to scan something.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scrollViewRef = useRef<ScrollView>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = (text: string, imgUri?: string) => {
    if (!text.trim() && !imgUri) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      imageUri: imgUri,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate Agent processing
    const loadId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: loadId, role: "agent", content: "", isLoading: true },
    ]);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId
            ? {
                ...m,
                isLoading: false,
                content: imgUri
                  ? "I've scanned the image. I detect procurement hardware (Dell Latitude series) with a visible asset tag. Extracted S/N: 7A8B9C.\n\nWould you like me to cross-reference this with your active Purchase Orders?"
                  : "I understand. I am searching the enterprise procurement database for your request...",
              }
            : m
        )
      );
    }, 2500);
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        alert("Camera permission is required to scan documents.");
        return;
      }
    }
    setIsCameraActive(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setIsCameraActive(false);
        handleSend("Please analyze this captured image.", photo.uri);
      } catch (e) {
        console.error(e);
        setIsCameraActive(false);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      handleSend("Please analyze this uploaded screenshot.", result.assets[0].uri);
    }
  };

  if (isCameraActive) {
    return (
    !isLoggedIn ? <LoginScreen onLogin={() => setIsLoggedIn(true)} /> : 
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                onPress={() => setIsCameraActive(false)}
                style={styles.closeButton}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Scan Document</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.scanFrame}>
              <ScanLine color="rgba(0, 198, 255, 0.5)" size={120} />
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                onPress={takePicture}
                style={styles.captureButton}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    !isLoggedIn ? <LoginScreen onLogin={() => setIsLoggedIn(true)} /> : 
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <View style={styles.logoIconContainer}>
            <Sparkles color="#fff" size={18} />
          </View>
          <Text style={styles.headerTitle}>Cortex</Text>
        </View>
        <Text style={styles.headerSubtitle}>Mobile Copilot</Text>
      </View>

      {/* Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              msg.role === "user" ? styles.messageUser : styles.messageAgent,
            ]}
          >
            {msg.role === "agent" && (
              <View style={styles.agentAvatar}>
                <Sparkles color="#fff" size={12} />
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === "user" ? styles.bubbleUser : styles.bubbleAgent,
              ]}
            >
              {msg.imageUri && (
                <Image
                  source={{ uri: msg.imageUri }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              {msg.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#00c6ff" />
                  <Text style={styles.loadingText}>Analyzing visual data...</Text>
                </View>
              ) : (
                <Text
                  style={
                    msg.role === "user"
                      ? styles.messageTextUser
                      : styles.messageTextAgent
                  }
                >
                  {msg.content}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.actionButton}>
            <ImageIcon color="#94a3b8" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openCamera} style={styles.actionButton}>
            <Camera color="#00c6ff" size={22} />
          </TouchableOpacity>

          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask Cortex..."
              placeholderTextColor="#64748b"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity
              onPress={() => handleSend(input)}
              style={[
                styles.sendButton,
                { opacity: input.trim() ? 1 : 0.5 },
              ]}
              disabled={!input.trim()}
            >
              <Send color="#fff" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0072ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chatArea: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "85%",
  },
  messageUser: {
    alignSelf: "flex-end",
  },
  messageAgent: {
    alignSelf: "flex-start",
  },
  agentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(0, 198, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "rgba(0, 198, 255, 0.4)",
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    overflow: "hidden",
  },
  bubbleUser: {
    backgroundColor: "#2563eb",
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomLeftRadius: 4,
  },
  messageTextUser: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextAgent: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  actionButton: {
    padding: 10,
  },
  textInputWrapper: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  textInput: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
    color: "#fff",
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
    backgroundColor: "#000",
  },
  camera: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
  },
  cameraOverlay: {
    flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: '#0f172a',
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scanFrame: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0, 198, 255, 0.4)",
    marginHorizontal: 40,
    height: 300,
    borderRadius: 16,
    backgroundColor: "rgba(0, 198, 255, 0.05)",
  },
  cameraControls: {
    paddingBottom: 50,
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
});