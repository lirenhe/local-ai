# Local AI – Offline-First iOS Chat App

A privacy-first iOS mobile app that runs a **small language model entirely on your device** using Apple Silicon / Metal GPU acceleration. No API keys, no cloud subscription, zero per-message cost.

## Features

| Feature | Details |
|---|---|
| 🔒 **Offline-first** | Runs 100% on-device after the model is downloaded |
| 🚀 **GPU-accelerated** | Uses Metal via llama.cpp for fast inference |
| 💬 **Streaming chat** | Token-by-token streaming with stop button |
| 🌐 **Web search** | Optional DuckDuckGo search (no API key) |
| ☁ **Cloud LLM fallback** | Connect to any OpenAI-compatible API |
| 💾 **Persisted history** | Conversations stored locally in AsyncStorage |
| 🤖 **Multiple models** | TinyLlama 1.1B, Phi-3 Mini, Gemma 2B, Qwen2 1.5B |

## Architecture

```
LocalAI/
├── App.tsx                         # Root component
├── index.js                        # Entry point
├── ios/                            # iOS native project
│   ├── Podfile                     # CocoaPods config (Metal GPU enabled)
│   └── LocalAI/
│       ├── AppDelegate.mm          # React Native bridge entry
│       ├── Info.plist              # App permissions & ATS config
│       └── LaunchScreen.storyboard
├── src/
│   ├── types/index.ts              # TypeScript type definitions
│   ├── store/useAppStore.ts        # Zustand state (conversations, models, settings)
│   ├── services/
│   │   ├── LlamaService.ts         # On-device LLM inference (llama.rn)
│   │   ├── SearchService.ts        # DuckDuckGo web search
│   │   ├── ExternalLLMService.ts   # OpenAI-compatible API client
│   │   └── ModelDownloadService.ts # GGUF model download & management
│   ├── screens/
│   │   ├── ChatScreen.tsx          # Main chat interface
│   │   ├── ModelScreen.tsx         # Model download & selection
│   │   └── SettingsScreen.tsx      # App configuration
│   ├── components/
│   │   ├── MessageBubble.tsx       # Chat message with search results
│   │   ├── ChatInput.tsx           # Text input with send/stop button
│   │   └── ModelCard.tsx           # Model download card
│   ├── navigation/AppNavigator.tsx # React Navigation setup
│   └── utils/theme.ts              # Colour palette
└── __tests__/                      # Jest unit tests
```

## Supported Models

All models use GGUF Q4_K_M quantization for optimal quality/size trade-off.

| Model | Size | Best for | Context |
|---|---|---|---|
| **TinyLlama 1.1B** | 636 MB | Older/low-RAM devices | 2K |
| **Qwen2 1.5B Instruct** | 930 MB | Multilingual, small footprint | 32K |
| **Gemma 2B IT** | 1.4 GB | Great quality for its size | 8K |
| **Phi-3 Mini 4K** | 2.2 GB | Best quality (recommended) | 4K |

> All models run via **llama.cpp** with **Metal GPU** on Apple Silicon iPhones/iPads.

## Prerequisites

- **macOS** with Xcode 15+
- **Node.js** ≥ 18
- **Ruby** ≥ 3 (for CocoaPods)
- **CocoaPods** (`sudo gem install cocoapods`)
- An iPhone or iPad with **iOS 15.1+**

## Setup

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Install iOS CocoaPods

```bash
npm run pod-install
# or: cd ios && pod install && cd ..
```

### 3. Run on a physical iOS device (recommended for GPU)

```bash
npx react-native run-ios --device
```

Or open `ios/LocalAI.xcworkspace` in Xcode and run on your device.

> **Note:** The Metal GPU acceleration for on-device inference requires a **physical device**. The simulator cannot run large language models at usable speed.

### 4. Download a model in the app

1. Open the app → tap **Models** (top right)
2. Tap **Download** on your chosen model
3. Wait for download to complete
4. Tap **Load** to load it into memory
5. Go back to **Chat** and start chatting!

## Configuration

### Internet Search

1. Go to **Settings** → **Internet Search**
2. Toggle **Enable Web Search**

When enabled, your question is first sent to DuckDuckGo, and the top results are injected as context into the prompt. No API key required.

### External Cloud LLM

1. Go to **Settings** → **Inference Backend** → **☁ Cloud LLM**
2. Enter your **API Base URL** (e.g. `https://api.openai.com/v1`)
3. Enter your **API Key**
4. Enter a **Model ID** (e.g. `gpt-3.5-turbo`)
5. Tap **Test Connection** to verify

Compatible with:
- **OpenAI** (GPT-3.5, GPT-4, GPT-4o)
- **Ollama** (`http://localhost:11434/v1`, no key needed)
- **LM Studio** (`http://localhost:1234/v1`, no key needed)
- Any **OpenAI-compatible** API

## Running Tests

```bash
npm test
```

Tests cover:
- Zustand store logic (conversations, models, settings)
- Search result formatting
- External LLM service (mocked HTTP)
- LlamaService state management

## Privacy

- All on-device conversations are **never transmitted** to any server
- Models are stored in the iOS **Documents** directory (visible in Files app)
- Web search queries go to DuckDuckGo when explicitly enabled
- External LLM requests go to your configured API endpoint only

## Troubleshooting

### "No model loaded" banner

Download and load a model from the **Models** tab first.

### App crashes when loading model

The model may be too large for available RAM. Try TinyLlama 1.1B or Qwen2 1.5B on devices with ≤ 4 GB RAM.

### Slow inference

Make sure you're running on a physical device (not simulator). Metal GPU acceleration is only available on hardware. Close other memory-heavy apps.

### Pod install fails

```bash
sudo gem install cocoapods
cd ios && pod install --repo-update
```

## Tech Stack

| Library | Purpose |
|---|---|
| React Native 0.74 | iOS mobile framework |
| llama.rn 0.11 | llama.cpp bindings for React Native |
| Zustand 4 | Lightweight state management |
| React Navigation 6 | Navigation |
| react-native-blob-util | Resume-capable file downloads |
| AsyncStorage | Persistent conversation history |
| axios | HTTP client for search & external LLMs |

## License

MIT – see [LICENSE](LICENSE)
