# Frontend Technical Design

This document outlines the core technical architecture and design decisions for the DeepCAD frontend application.

## 1. 3D Viewport Technology

The 3D viewport is the centerpiece of the application. The chosen technology stack is `three.js` managed via `React-Three-Fiber (R3F)` and supplemented by the `@react-three/drei` helper library.

### 1.1. Model Exchange Format: `glTF`

- **Standard Format**: All 3D models rendered in the frontend will be standardized to the `glTF` (`.gltf` or `.glb`) format.
- **Backend Responsibility**: Backend services (e.g., `geometry_service`, `meshing_service`) are responsible for converting any source CAD or mesh data (like STEP, VTK, etc.) into `glTF` before sending it to the client. This includes applying **Draco compression** to minimize geometry size.
- **Rationale**: `glTF` is the "JPEG for 3D," designed for efficient transmission and fast GPU rendering, making it ideal for web-based applications.

### 1.2. Model Loading and Interaction

- **Loading**: Models will be loaded using the `useGLTF` hook from `@react-three/drei`. Loading progress will be monitored via the `useProgress` hook to provide user feedback.
- **Interaction (Picking)**: `R3F`'s built-in event system (e.g., `onClick`, `onPointerOver` on `<mesh>` elements) will be used for selecting parts of a model. Selection state will be managed in a global store.
- **Performance Optimization**: For large-scale models, the following strategies will be employed:
    - **Level of Detail (LOD)**: Dynamically switch between different model resolutions based on camera distance.
    - **GPU Instancing**: Use `InstancedMesh` for rendering large numbers of identical objects (e.g., repeating elements in a structure).

### 1.3. CAE Result Visualization

- **Data Flow**: Post-processing results (e.g., stress, displacement) will be sent from the backend as a separate data file (e.g., JSON) mapping vertex IDs to result values.
- **Rendering**: The frontend will dynamically update the `BufferGeometry`'s vertex colors based on this data, using a custom shader (`ShaderMaterial`) or built-in `three.js` materials to create a color map (heatmap). A corresponding legend will be displayed in the UI.

---

## 2. Backend API & Communication

A hybrid approach using both RESTful HTTP API and WebSocket is adopted for clear and efficient client-server communication.

### 2.1. Responsibility Division

- **HTTP API (Axios)**: Used for synchronous, request-response actions like initiating a task, fetching initial data, or uploading files. The `axios` instance in `src/api/client.ts` provides a centralized point for configuration and error handling.
- **WebSocket**: Used for real-time, asynchronous server-to-client pushes, primarily for notifying the client of long-running task progress and other backend events.

### 2.2. API Design Principles

- **Authentication**: HTTP requests will use `Bearer JWT` in the `Authorization` header. WebSocket connections will be authenticated via a token in the connection query parameters or subprotocol.
- **Versioning**: API endpoints will be versioned (e.g., `/api/v1/...`) to ensure backward compatibility and smooth future upgrades.

### 2.3. Long-Running Task Workflow (e.g., Meshing)

1.  **Initiation (HTTP)**: Client sends a `POST` request to an endpoint like `/api/v1/tasks/meshing`. The server immediately creates a task in a queue (e.g., Celery) and returns a `taskId`.
2.  **Initial UI Update**: Client receives the `taskId` and adds a "pending" task to the `useDomainStore`. The UI updates automatically.
3.  **Progress Updates (WebSocket)**: As the backend worker processes the task, it reports progress. A backend service pushes `task_update` events via WebSocket to the client.
4.  **Live UI Feedback**: The WebSocket client on the frontend receives these updates and calls the `updateTask` action in the store, causing the UI (e.g., `TaskProgressIndicator`) to re-render with the new progress.
5.  **Completion (WebSocket)**: A final `task_update` event is sent when the task is `completed` or `failed`.

---

## 3. Forms & User Input

The combination of `Ant Design`, `React-Hook-Form`, and `Zod` is chosen for building robust, scalable, and type-safe forms.

### 3.1. Schema & Validation with `Zod`

- **Schema-First**: Instead of manual validation rules, we will use `Zod` to define a schema for each form's data.
- **Benefits**:
    - **Single Source of Truth**: The schema defines the shape, types, and validation rules.
    - **Type Safety**: TypeScript types are automatically inferred from the schema.
    - **Integration**: `@hookform/resolvers` allows `Zod` schemas to be used directly by `react-hook-form`.

### 3.2. Dynamic & Conditional Fields

- **Conditional Rendering**: `react-hook-form`'s `watch` API will be used to listen for changes in one field (e.g., a dropdown) to conditionally render other form inputs.
- **Dynamic Lists**: For managing lists of items (e.g., multiple boundary conditions), `react-hook-form`'s `useFieldArray` hook will be used.

### 3.3. Componentization

- Complex or reusable groups of inputs (e.g., a vector input with X, Y, Z fields) will be encapsulated into their own React components and integrated into the main form using the `<Controller />` component from `react-hook-form`. 