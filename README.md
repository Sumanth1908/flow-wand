# 🪄 FlowWand: Event Mesh Designer

**FlowWand** is a premium, interactive laboratory for designing and simulating complex data event meshes. Built for data architects and engineers, it allows you to visualize the flow of data across Kafka topics and Flink processing jobs with an intuitive, IDE-grade interface.

![FlowWand Preview](https://raw.githubusercontent.com/Sumanth1908/flow-wand/main/public/preview.png) *(Placeholder for actual preview image)*

## ✨ Key Features

-   **🎨 Dynamic Architecture Canvas**: Design your pipeline using specialized nodes for Kafka Topics and Flink Jobs. Derived from React Flow for a smooth, high-performance experience.
-   **🚀 Interactive Simulation Center**: Fire custom JSON events into your mesh. Watch data particles traverse the paths in real-time, highlighting active routes and processing stages.
-   **🌈 Flow-based Theming**: Organize your mesh into logical "Flows". Assign vibrant colors to different architectural domains, which dynamically update the canvas highlights, edges, and simulation effects.
-   **📝 Live Event Logging**: Monitor the simulation step-by-step with a high-fidelity console. Inspect payloads as they transform through Flink jobs.
-   **💾 Project Management**: Create multiple projects, save your progress locally, and export/import your architectures as portable JSON templates.
-   **🌑 Premium Aesthetics**: A "glassmorphic" Dark Mode interface designed for deep work, featuring smooth animations powered by Framer Motion.

## 🛠️ Technology Stack

-   **Core**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
-   **Graph Engine**: [@xyflow/react](https://reactflow.dev/) (React Flow)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Styling**: Vanilla CSS with a custom design system

## 🚀 Getting Started

To run FlowWand locally:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Sumanth1908/flow-wand.git
    cd flow-wand
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Launch the development server**:
    ```bash
    npm run dev
    ```

4.  **Open your browser**: Navigate to `http://localhost:5173`.

## 📖 Usage Highlights

-   **Creating Nodes**: Use the sidebar to add Topics and Jobs. Jobs will automatically link to the topics they consume from or produce to.
-   **Defining Flows**: Create a Flow, assign it a color, and select the jobs it contains. Click the Flow in the sidebar to "spotlight" that specific architecture on the canvas.
-   **Simulating**: Click the "Simulation" button in the bottom right. Fire an event from a source topic to see the data flow through your pipeline.

## 📄 License

MIT © [Sumanth1908](https://github.com/Sumanth1908)