import Foundation

/// View-model backing `ChatView`.
@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published var inputText: String = ""
    @Published private(set) var isGenerating = false

    private let llm = LLMService.shared

    // MARK: - Initialiser

    init() {
        Task { try? await llm.loadModel() }
    }

    // MARK: - Actions

    func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isGenerating else { return }

        inputText = ""
        let userMsg = ChatMessage(role: .user, content: text)
        messages.append(userMsg)

        isGenerating = true
        defer { isGenerating = false }

        var assistantMsg = ChatMessage(role: .assistant, content: "")
        messages.append(assistantMsg)
        let assistantIndex = messages.index(before: messages.endIndex)

        do {
            _ = try await llm.generate(messages: messages) { [weak self] token in
                guard let self else { return }
                Task { @MainActor in
                    self.messages[assistantIndex].content += token
                }
            }
        } catch {
            messages[assistantIndex].content = "Error: \(error.localizedDescription)"
        }
    }
}
