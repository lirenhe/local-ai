# Local AI

An iOS application that answers questions directly on-device using a small language model — no internet connection required.

---

## High-Level Plan

### Phase 1 — Foundation (current)
- [x] Initialize Xcode project (SwiftUI, iOS 17+, iPhone & iPad, simulator-ready)
- [x] Scaffold app layers: `App`, `Views`, `Models`, `Services`
- [x] Chat UI: scrolling message list, streaming text bubble, input bar with send button
- [x] `LLMService` stub with token-streaming interface (ready to swap in a real model)
- [x] `ChatViewModel` wiring UI ↔ service via `async/await`

### Phase 2 — On-Device Inference
- [ ] Choose and bundle a small language model
  - Option A: **llama.cpp** (GGUF quantised model, e.g. Phi-3-mini-4k-instruct Q4_K_M ~2 GB)
  - Option B: **Apple Core ML** converted model via `coremltools`
- [ ] Add a Swift wrapper / SPM package for the chosen inference engine
- [ ] Implement real `LLMService.loadModel()` — load from app bundle or on-demand download
- [ ] Implement real `LLMService.generate()` — run inference with token streaming
- [ ] Tune context window, system prompt, and sampling parameters

### Phase 3 — UX Polish
- [ ] Splash / loading screen while model loads into memory
- [ ] Conversation history persistence (`SwiftData` or `UserDefaults`)
- [ ] Settings screen: temperature, max tokens, model selection
- [ ] Markdown rendering for assistant responses
- [ ] Haptic feedback and voice input (optional)

### Phase 4 — Performance & Distribution
- [ ] Profile memory footprint and inference latency on target devices
- [ ] Background model warm-up to reduce first-response latency
- [ ] App icon, launch screen, and App Store assets
- [ ] TestFlight beta distribution
- [ ] App Store submission

---

## Project Structure

```
LocalAI/
├── App/
│   └── LocalAIApp.swift        # @main entry point
├── Views/
│   ├── ContentView.swift       # Root NavigationStack
│   ├── ChatView.swift          # Scrolling chat + input bar
│   └── MessageBubble.swift     # Per-message UI component
├── Models/
│   ├── ChatMessage.swift       # Value type: role, content, timestamp
│   └── ChatViewModel.swift     # ObservableObject driving ChatView
└── Services/
    └── LLMService.swift        # On-device inference engine (stub → real)
```

## Requirements

| Requirement | Value |
|---|---|
| Xcode | 15+ |
| iOS deployment target | 17.0 |
| Swift | 5.9+ |
| Simulator | iPhone 15 / iPad Air (M1) or newer |

## Getting Started

1. Open `LocalAI.xcodeproj` in Xcode 15+.
2. Select the **LocalAI** scheme and pick any iPhone or iPad simulator.
3. Press **⌘R** to build and run.
4. The chat UI loads with a stub model. Replace `LLMService.generate()` with real inference to enable on-device answers (see Phase 2 above).
