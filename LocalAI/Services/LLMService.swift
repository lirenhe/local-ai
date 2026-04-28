import Foundation
import Combine

/// Manages the on-device language model lifecycle.
///
/// Replace the stub `generate` implementation with a real on-device
/// inference engine (e.g. llama.cpp via a Swift wrapper, or Apple's
/// `CoreML`-converted model) once a model file is bundled with the app.
final class LLMService {

    // MARK: - Singleton

    static let shared = LLMService()
    private init() {}

    // MARK: - State

    private(set) var isModelLoaded = false

    // MARK: - Public API

    /// Load the bundled model into memory.
    /// Call once, e.g. from `LocalAIApp.init()` or a splash screen.
    func loadModel() async throws {
        // TODO: Replace with real model loading logic.
        // Example: load a .gguf file via llama.cpp bindings.
        try await Task.sleep(for: .milliseconds(200)) // simulate I/O
        isModelLoaded = true
    }

    /// Generate a response for the given conversation history.
    ///
    /// The `onToken` closure is called for every generated token so the UI
    /// can stream text in real time.
    func generate(
        messages: [ChatMessage],
        onToken: @escaping (String) -> Void
    ) async throws -> String {
        guard isModelLoaded else {
            throw LLMError.modelNotLoaded
        }

        // TODO: Replace with real inference.
        // Stub: echo the last user message back as a placeholder.
        let userInput = messages.last(where: { $0.role == .user })?.content ?? ""
        let reply = "You said: \"\(userInput)\". (Model not yet integrated — replace LLMService.generate with real inference.)"

        for word in reply.components(separatedBy: " ") {
            try await Task.sleep(for: .milliseconds(40))
            onToken(word + " ")
        }

        return reply
    }

    // MARK: - Errors

    enum LLMError: LocalizedError {
        case modelNotLoaded

        var errorDescription: String? {
            switch self {
            case .modelNotLoaded:
                return "The language model has not been loaded yet."
            }
        }
    }
}
