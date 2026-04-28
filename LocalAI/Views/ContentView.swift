import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            ChatView()
                .navigationTitle("Local AI")
                .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    ContentView()
}
