# dbNet Frontend Refactoring Plan (Next Version)

This document outlines the plan to refactor and recreate the dbNet frontend. The goal is to modernize the UI, improve maintainability, and make it easier for AI to assist in development by breaking the application into well-defined, compartmentalized pieces. The new frontend will be built in the `ui` path. Old source code can stay in `frontend` for reference

## 1. Context: dbNet Frontend Functionality

Based on the current codebase (`frontend/src`), dbNet's frontend is a React application (`react`, `react-router-dom`) using PrimeReact for UI components and Hookstate (`@hookstate/core`) for state management. It appears to be an electron-based application (from `package.json` and `main`/`renderer` directories).

Key functionalities include:

*   **Connection Management**:
    *   Users can choose from a list of predefined database connections (`ConnectionChooser.tsx`, `state/connection.ts`).
    *   The application initializes by loading connections and selecting one, potentially based on the URL hash or local storage (`App.tsx`, `Default.tsx`, `state/dbnet.ts`).
*   **Tabbed Interface**:
    *   The main working area is organized into tabs (`components/TabNames.tsx`, `components/SubTabs.tsx`).
    *   Tabs can host query editors or results views.
    *   The state for tabs, including their content and selected connection/database, is managed (`state/tab.ts`).
*   **Schema Exploration**:
    *   A dedicated panel (likely `SchemaPanel.tsx`, part of `LeftPane.tsx`) displays database schemas (databases, tables, columns).
    *   It fetches schema information from the backend (`state/dbnet.ts` - `getAllSchemata`, `getSchemata`).
*   **Query Execution**:
    *   Users can write and execute SQL queries, likely in a Monaco-based editor (`TabEditor.tsx`, `state/editor.ts`, `state/monaco/`).
    *   Queries are submitted to the backend, and results are processed (`state/query.ts`, `store/api.tsx`).
*   **Results Display**:
    *   Query results are displayed, likely in a table/grid format (`TabTable.tsx`, potentially using `@glideapps/glide-data-grid` mentioned in `package.json`).
    *   Includes features for viewing row details (`RowViewPanel.tsx`) and potentially exporting data.
*   **Data/API Interaction**:
    *   A custom API client (`store/api.tsx`) handles `fetch` requests (GET/POST) to a backend (defaulting to `http://localhost:5987`).
    *   It processes different response types (JSON, JSONLines, CSV/TSV) and includes header parsing for column information.
*   **History and Job Management**:
    *   Functionality for viewing query history (`HistoryPanel.tsx`) and managing jobs (`JobPanel.tsx`, `state/job.ts`).
    *   Uses Dexie.js for client-side storage of history and workspace settings (`state/dbnet.ts` - `getDexieDb`).
*   **Layout and UI Components**:
    *   The main layout (`Default.tsx`) uses a `Splitter` to divide the screen into `LeftPane` (likely for schema/navigation) and `RightPane` (for tabs with editors/results).
    *   A `TopMenuBar.tsx` provides main application actions.
    *   PrimeReact components (`primereact`, `primeicons`, `primeflex`) are used extensively for UI elements.
    *   Global toast notifications are available (`App.tsx`).
*   **State Management**:
    *   Hookstate (`@hookstate/core`) is the primary state management library.
    *   A central `DbNet` class (`state/dbnet.ts`) orchestrates application state, API calls, and event-like triggers.
    *   State is structured into modules like `connection.ts`, `query.ts`, `tab.ts`, `workspace.ts`, `editor.ts`.

## 2. Refactoring Strategy

The refactoring will focus on:
*   **Modern UI/UX**: Transitioning to a more modern look and feel, potentially using a different UI component library or a more flexible styling approach (e.g., Tailwind CSS).
*   **Componentization**: Breaking down large components into smaller, reusable, and independently testable units.
*   **Clear Interfaces**: Defining explicit props and callback interfaces for each component.
*   **Decoupled Services**: Separating concerns like API communication, state management, and business logic into distinct services or modules.
*   **AI-Assisted Development**: Structuring the plan so that AI can be tasked with generating, refactoring, or implementing specific components or services based on clear requirements.
* General AI Role and Guidelines:
  You are an expert in TypeScript, Node.js, React, Shadcn UI, Radix UI and Tailwind.
  
  Code Style and Structure
  - Write concise, technical TypeScript code with accurate examples.
  - Prefer iteration and modularization over code duplication.
  - Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
  - Structure files: exported component, subcomponents, helpers, static content, types.
  
  Naming Conventions
  - Use lowercase with dashes for directories (e.g., components/auth-wizard).
  - Favor named exports for components.
  
  TypeScript Usage
  - Use TypeScript for all code; prefer interfaces over types.
  - Avoid enums; use maps instead.
  - Use functional components with TypeScript interfaces.
  
  Syntax and Formatting
  - Use the "function" keyword for pure functions.
  - Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
  - Use declarative JSX.
  
  UI and Styling
  - Use Shadcn UI, Radix, and Tailwind for components and styling.
  - Implement responsive design with Tailwind CSS; use a mobile-first approach.
  
  Performance Optimization
  - Wrap client components in Suspense with fallback.
  - Use dynamic loading for non-critical components.
  - Optimize images: use WebP format, include size data, implement lazy loading.
  
  Key Conventions
  - Use 'nuqs' for URL search parameter state management.
  - Optimize Web Vitals (LCP, CLS, FID).
  - Limit 'use client':
    - Favor server components and Next.js SSR.
    - Use only for Web API access in small components.
    - Avoid for data fetching or state management.

## 3. Refactoring Plan: Modules and AI Tasks

We will break the application into the following key modules/areas. For each, we'll define current observations, refactoring goals, and how AI can assist. **Important: Throughout the implementation of these modules, developers (and AI assisting them) should refer to the existing codebase in the `frontend/` directory. The primary goal is to modernize the UI and underlying architecture, but the core UX flows and essential functionalities should be replicated to ensure a familiar user experience, unless explicitly decided otherwise.**

### Module 1: Core Application Shell & Layout

*   **Current**: `App.tsx`, `Default.tsx`, `panes/LeftPane.tsx`, `panes/RightPane.tsx`. Uses PrimeReact Splitter.
*   **Refactoring Goals**:
    *   Define a clean, modern main application layout using functional React components and TypeScript.
    *   Establish a root component structure adhering to the file structure guidelines (exported component, subcomponents, etc.).
    *   Implement responsive design for different screen sizes using Tailwind CSS, following a mobile-first approach.
    *   Potentially replace PrimeReact Splitter with a modern, flexible alternative, possibly leveraging Radix UI utilities or a suitable Shadcn UI component, styled with Tailwind CSS.
*   **AI Tasks**:
    *   **Task 1.1**: Generate a basic React/TypeScript application shell (`MainLayout.tsx`) with a two-pane layout (left for navigation/schema, right for content tabs) using Tailwind CSS for styling and layout. Specify proportions and resizability. Potentially incorporate structural components from Shadcn UI/Radix UI. Ensure client components are wrapped in Suspense with a fallback.
    *   **Task 1.2**: Create basic placeholder functional components (using TypeScript interfaces for props) for `TopMenuBar`, `LeftPaneContainer`, and `RightPaneContainer`.
    *   **Task 1.3**: Implement routing (e.g., using `react-router-dom v6+`) if complex deep linking or view navigation is required. Consider using 'nuqs' for managing URL search parameter state for simpler routing needs.

### Module 2: API Client Service

*   **Current**: `store/api.tsx`. Uses global `fetch` with custom response parsing.
*   **Refactoring Goals**:
    *   Create a dedicated, injectable API client service module (`services/api-client.ts`).
    *   Use a modern data fetching library like `TanStack Query/React Query` for better caching, request lifecycle management, and error handling. This choice helps in limiting direct 'use client' for data fetching logic, aligning with best practices.
    *   Define clear TypeScript interfaces for API requests and responses (in `types/api.ts`).
    *   Centralize API endpoint definitions (e.g., in `services/api-endpoints.ts`).
*   **AI Tasks**:
    *   **Task 2.1**: Define TypeScript interfaces for common API request payloads and response structures (e.g., `ConnectionInfo`, `DatabaseSchema`, `TableDetails`, `QueryResult`, `QueryError`), preferring interfaces over types.
    *   **Task 2.2**: Implement an `ApiClient` class or set of functions (using the `function` keyword for pure helper functions) within `services/api-client.ts`. This should use `TanStack Query/React Query` (which typically wraps `fetch` or `axios`), include methods for GET and POST, header management, and standardized error handling.
    *   **Task 2.3**: Refactor existing API call logic from `store/api.tsx` and `state/dbnet.ts` to use the new `ApiClient`. AI can help map old `fetch` calls to the new methods, ensuring concise and technical TypeScript code.

### Module 3: State Management Service

*   **Current**: Hookstate with a central `DbNet` class (`state/dbnet.ts`) and various state modules (`state/*.ts`). Global window objects are also used (`window.dbnet`).
*   **Refactoring Goals**:
    *   Adopt a modern React state management solution like Zustand or Redux Toolkit, structured within the `store/` directory.
    *   Ensure state is serializable and easily debuggable. State management logic should minimize the need for 'use client' directives in components.
    *   Define clear state slices or stores (e.g., `connectionSlice.ts`, `schemaSlice.ts`) for different parts of the application.
    *   Eliminate reliance on `window.dbnet` and other global state variables.
    *   Consider 'nuqs' for URL search parameter state management where appropriate (e.g., active connection ID, selected tab).
*   **AI Tasks**:
    *   **Task 3.1**: Design the structure for the new state management solution (e.g., define Zustand stores or Redux slices using TypeScript interfaces for state shapes) for:
        *   `connectionState`: List of available connections, selected connection, connection status.
        *   `schemaState`: Cached schema information per connection/database.
        *   `tabState`: List of open tabs, active tab, content per tab (query, results, type).
        *   `editorState`: Content and settings for query editors.
        *   `settingsState`: User preferences.
    *   **Task 3.2**: Generate the boilerplate for these state modules, including initial state, actions/reducers/mutators (as functions), and selectors, all typed with TypeScript interfaces.
    *   **Task 3.3**: Assist in migrating logic from the existing `DbNet` class and individual state files into the new state management structure, ensuring code is concise and modular.

### Module 4: Connection Management UI & Logic

*   **Current**: `ConnectionChooser.tsx`, parts of `Default.tsx`, `state/connection.ts`, `state/dbnet.ts`.
*   **Refactoring Goals**:
    *   A clear, user-friendly way to manage and select connections, using functional React components.
    *   Improved error handling and feedback during connection attempts.
    *   Decouple UI from direct state manipulation, using hooks to interact with the state layer.
    *   Components styled with Tailwind CSS, utilizing Shadcn UI/Radix UI components for UI elements.
*   **AI Tasks**:
    *   **Task 4.1**: Generate a React functional component `ConnectionManager` (in `features/connection/ConnectionManager.tsx`) using TypeScript interfaces for props. It should:
        *   Display a list of available connections (fetched via the `ApiClient` and managed by `connectionSlice`).
        *   Allow selecting a connection.
        *   Show a modal (using Shadcn UI/Radix UI Modal component) or form for adding/editing connection configurations.
        *   Use the `ApiClient` to fetch connection lists and the `connectionSlice` to update application state.
    *   **Task 4.2**: Style the `ConnectionManager` component and its subcomponents using Tailwind CSS, incorporating Shadcn UI/Radix UI components (e.g., for modals, lists, buttons, input fields). Ensure the design is responsive and follows a mobile-first approach.

### Module 5: Schema Explorer Panel

*   **Current**: `SchemaPanel.tsx` uses PrimeReact `Tree` and `ContextMenu`.
*   **Refactoring Goals**:
    *   Replicate the existing hierarchical tree view (Databases -> Schemas -> Tables/Views) using a performant tree component, potentially from Shadcn UI/Radix UI if available and suitable, or a well-regarded library like `react-arborist` or `rc-tree`, wrapped in `components/navigation/tree-view.tsx`. All components should be functional with TypeScript interfaces.
    *   Maintain the top bar with connection name and a refresh button, styled with Tailwind CSS.
    *   Implement custom node rendering to include icons (consider SVG icons), distinguish views, and show informative tooltips (using Shadcn UI/Radix UI Tooltip) on hover.
    *   Provide a text-based filter for the tree (e.g. using a Shadcn UI Input).
    *   Replicate single-click and double-click behaviors on table/view nodes.
    *   Implement a context menu using Shadcn UI/Radix UI ContextMenu, with actions comparable to the existing one.
    *   Ensure tree expansion state is preserved (e.g., in `schemaSlice` or `uiSlice`).
    *   Lazy loading of schema parts should be a primary consideration for performance; wrap client components in Suspense with fallback where appropriate.
*   **AI Tasks**:
    *   **Task 5.1**: Design the data structure for the schema tree (e.g., `TreeNodeInterface` with properties like `id`, `name`, `type: 'database' | 'schema' | 'table' | 'view'`, `children`, `tooltipData: { count?: number, typeSpecificInfo?: string }`). Use maps instead of enums for `type`.
    *   **Task 5.2**: Generate a React functional component `SchemaExplorerPanel` (in `features/schema-explorer/SchemaExplorerPanel.tsx`) that includes:
        *   The top bar (connection name, refresh button, styled with Tailwind CSS).
        *   A filter input field (Shadcn UI Input).
        *   The `TreeView` component for rendering the schema.
    *   **Task 5.3**: Develop the `TreeView` component (or adapt a library) with custom node rendering (declarative JSX) for icons, labels, and tooltips, and to differentiate views.
    *   **Task 5.4**: Implement the logic for single-click (triggering meta detail view) and double-click (dispatching an action to open a new query tab).
    *   **Task 5.5**: Design and implement the context menu for schema nodes using Shadcn UI/Radix UI ContextMenu components. AI can help structure the menu items and map them to actions (e.g., calling functions in `useSchema` hook or dispatching to state stores).
    *   **Task 5.6**: Implement API calls via `ApiClient` to fetch schema information, updating `schemaSlice`. This should support lazy-loading children on node expansion.
    *   **Task 5.7**: Manage tree expansion and selection state within `schemaSlice` or `uiSlice`, with persistence via `persistenceService`. Consider if 'nuqs' can be used for simple selection state in the URL.

### Module 6: Tab Management System

*   **Current**: `components/TabNames.tsx` uses PrimeReact `TabMenu`. `state/tab.ts` handles tab state.
*   **Refactoring Goals**:
    *   Implement a robust and intuitive tab management system using functional components from `features/tab-management/`, styled with Tailwind CSS and utilizing Shadcn UI/Radix UI tab components.
    *   Replicate tab bar appearance: display tab names, loading indicators (spinners from Shadcn UI or custom).
    *   Implement tooltips (Shadcn UI/Radix UI Tooltip) on tab hover.
    *   Provide "Add Tab" (+) functionality.
    *   Allow closing tabs (e.g., with an 'x' icon on each tab or via context menu).
    *   Implement a right-click context menu (Shadcn UI/Radix UI ContextMenu) for tabs.
    *   Ensure tab state is managed cleanly in `tabSlice` and persisted. The active tab ID could be managed by 'nuqs'.
    *   Support reordering of tabs via drag-and-drop.
*   **AI Tasks**:
    *   **Task 6.1**: Generate a `TabBar` React functional component (in `features/tab-management/TabBar.tsx`) using Shadcn UI/Radix UI tab components as a base, styled with Tailwind CSS. It should:
        *   Render tab headers based on data from `tabSlice`.
        *   Display loading indicators.
        *   Show tooltips.
        *   Include an "Add Tab" button.
        *   Handle tab selection and active state.
        *   Support drag-and-drop for reordering.
    *   **Task 6.2**: Implement the `TabContentHost` functional component (in `features/tab-management/TabContentHost.tsx`) that dynamically renders content for the active tab, wrapping client components in Suspense with fallback.
    *   **Task 6.3**: Develop the tab context menu using Shadcn UI/Radix UI ContextMenu components. Actions: Rename, Close, Close Others, etc. For query tabs, add Change Connection & Database.
    *   **Task 6.4**: Implement the logic in `tabSlice` (or a `useTabs` hook) for tab operations using TypeScript interfaces for actions and state.
    *   **Task 6.5**: Ensure tab state (including active tab via 'nuqs' if applicable) is persisted and restored using `persistenceService`.

### Module 7: Query Editor Component

*   **Current**: `TabEditor.tsx`, `state/editor.ts`, `state/monaco/`. Uses Monaco editor.
*   **Refactoring Goals**:
    *   Integrate Monaco editor within a React functional component (`features/query-editor/QueryEditorTab.tsx`).
    *   Provide robust SQL syntax highlighting and explore schema-aware autocompletion (linking to `schemaSlice`).
    *   Allow running entire query or selected blocks.
    *   Clearly highlight/decorate the executed SQL block.
    *   Implement Monaco's Vim mode toggle.
    *   Replicate essential context menu items using Shadcn UI/Radix UI ContextMenu.
    *   Design the editor component to accommodate a future AI assistance overlay, providing necessary hooks (cursor position, selected text).
    *   Manage editor content/settings per tab, persisted via `settingsSlice` or `tabSlice`.
*   **AI Tasks**:
    *   **Task 7.1**: Create a `QueryEditor` React functional component (e.g., in `components/specific/MonacoEditor.tsx` or directly within `features/query-editor/`) that wraps Monaco. Define props using TypeScript interfaces: `initialContent: string`, `language: string`, `onChange: (value: string) => void`, `onExecuteQuery: (query: string, selection?: Range) => void`, `options?: monaco.editor.IStandaloneEditorConstructionOptions`.
    *   **Task 7.2**: Implement Monaco editor setup: SQL language configuration, syntax highlighting, Vim mode toggle (`monaco-vim`), text selection, and decoration mechanism.
    *   **Task 7.3**: Develop a basic context menu for the editor using Shadcn UI/Radix UI ContextMenu components. Suggest initial actions (Format, Copy, Paste).
    *   **Task 7.4**: Define a TypeScript interface or mechanism within `QueryEditor` for an external "AI Assistant" component to interact with (get cursor/selection, insert/replace text).
    *   **Task 7.5**: Integrate this `QueryEditor` into the `QueryEditorTab` component. Query content and settings should be managed via `tabSlice` and/or `settingsSlice`.
    *   **Task 7.6**: (Advanced) Explore Monaco's `registerCompletionItemProvider` for dynamic autocompletion based on `schemaSlice`.

### Module 8: Results Display Component

*   **Current**: `TabTable.tsx` (likely uses `@glideapps/glide-data-grid`) and `TabToolbar.tsx`.
*   **Refactoring Goals**:
    *   Utilize `@glideapps/glide-data-grid` within a React functional component framework.
    *   Implement a modernized `ResultsToolbar` component (in `features/results-viewer/ResultsToolbar.tsx`) using Shadcn UI/Radix UI components for controls, styled with Tailwind CSS.
    *   Display column name and data type on hover over column headers (using Shadcn UI/Radix UI Tooltip).
    *   Introduce tabbed results (using Shadcn UI/Radix UI Tabs) within each main query results view: each execution generates a new result sub-tab.
    *   Allow users to pin specific result sub-tabs.
    *   Implement smart naming for result sub-tabs (extracted from SQL).
    *   Cache results in frontend with Dexie, ensuring data is efficiently managed and cleaned up.
    *   Optimize for Web Vitals (LCP, CLS, FID) when displaying large datasets.
*   **AI Tasks**:
    *   **Task 8.1**: Define props (using TypeScript interfaces) for a `ResultsViewerContainer` functional component (in `features/results-viewer/ResultsViewerContainer.tsx`). This component will manage its own set of result sub-tabs.
    *   **Task 8.2**: Generate the `ResultsGrid` functional component (in `features/results-viewer/ResultsGrid.tsx`) using `@glideapps/glide-data-grid`. Props: `columns: ColumnDefInterface[]`, `data: RowInterface[]`, `isLoading: boolean`, `error?: string`. Implement column header tooltips (Shadcn UI/Radix UI Tooltip).
    *   **Task 8.3**: Generate a `ResultsToolbar` React functional component. Style with Tailwind CSS and use Shadcn UI/Radix UI components for buttons, inputs, dropdowns.
        *   Actions: Execute/Kill, Refresh, Show SQL, Limit Dropdown, Row Viewer Toggle, etc.
    *   **Task 8.4**: Implement result sub-tabbing (using Shadcn UI/Radix UI Tabs) and pinning logic within `ResultsViewerContainer`. Manage `ResultStateInterface` objects.
    *   **Task 8.5**: Develop a utility `function inferResultTabName(sql: string): string` (in `features/results-viewer/results-utils.ts` or `utils/helpers.ts`). AI can assist with regex or lightweight parsing logic.
    *   **Task 8.6**: Integrate `ResultsGrid`, `ResultsToolbar`, sub-tabbing, and smart naming into `ResultsViewerContainer`. This component will be used by `TabContentHost`. Manage `resultsHistory`, pruning, and interactions with the selected result sub-tab. Ensure dynamic loading for non-critical parts if applicable.

### Module 9: Top Menu Bar & Actions

*   **Current**: `TopMenuBar.tsx`, `TabToolbar.tsx`.
*   **Refactoring Goals**:
    *   A clean and intuitive menu bar using Shadcn UI/Radix UI menu components, styled with Tailwind CSS, for global and context-specific actions.
    *   Components should be functional with TypeScript interfaces.
*   **AI Tasks**:
    *   **Task 9.1**: Generate a `TopMenuBar` functional component (e.g., in `components/layout/TopMenuBar.tsx`) using Shadcn UI/Radix UI dropdown menu or menubar components, with placeholders for common actions.
    *   **Task 9.2**: Connect these actions to relevant state management functions (e.g., opening new query tab, showing connection manager).
    *   **Task 9.3**: Design and implement `TabToolbar` (if distinct from Module 8's `ResultsToolbar` or if a more generic tab-specific toolbar is needed) as a functional component, dynamically populated with actions relevant to the active tab.

### Module 10: Local Persistence (Settings, Workspace)

*   **Current**: Uses Dexie.js for `workspace` and `historyQueries`, `historyJobs`. `localStorage` for `_connection_name`, `_workspace_name`.
*   **Refactoring Goals**:
    *   Centralize local persistence logic in `services/persistenceService.ts`.
    *   Clearly define what needs to be persisted (user settings, open tabs, query history) using TypeScript interfaces.
    *   Continue using Dexie.js or switch if a more suitable modern alternative is identified.
*   **AI Tasks**:
    *   **Task 10.1**: Define a `PersistenceService` module that abstracts Dexie.js. Use TypeScript interfaces for data structures.
    *   **Task 10.2**: Implement methods in this service: `saveWorkspaceSettings(settings: WorkspaceSettingsInterface)`, `loadWorkspaceSettings(): Promise<WorkspaceSettingsInterface | null>`, `saveQueryToHistory(query: QueryHistoryItemInterface)`, `loadQueryHistory(): Promise<QueryHistoryItemInterface[]>`. Use `async/await` and clear TypeScript types.
    *   **Task 10.3**: Integrate calls to this service at appropriate points (e.g., on app load, on settings change, after query execution), ensuring data consistency.

### General AI-Assisted Tasks Across Modules:

*   **Component Styling**: Once basic functional components are generated, AI can be tasked with applying styles using Tailwind CSS, and integrating Shadcn UI/Radix UI components where appropriate (e.g., "Style this Button component using Tailwind CSS and base it on Shadcn UI's Button component").
*   **Unit Test Generation**: For well-defined functional components and pure functions, AI can help generate initial unit tests (e.g., using Jest and React Testing Library).
*   **TypeScript Type Refinement**: AI can assist in refining TypeScript interfaces as the application evolves, ensuring strong typing.
*   **Code Refactoring**: For specific functions or small components, AI can be asked to refactor for clarity, performance, or to adhere to new patterns, always producing concise, technical TypeScript.
*   **Documentation**: AI can help generate JSDoc comments for functions and components, and markdown documentation.
*   **Image Optimization**: For any image assets, ensure they are in WebP format, include size data, and implement lazy loading where applicable.

## 4. Phased Approach

This phased approach breaks down the refactoring process into manageable stages. Each phase builds upon the previous one, allowing for iterative development and testing. **As with the module implementation, developers should consult the old `frontend/` codebase during each phase to understand existing logic and UX flows, aiming to replicate the familiar user experience within the new UI and architecture.**

1.  **Phase 1: Project Setup & Core Services Foundation**
    *   **Activities**: 
        *   Initialize the new frontend project in the `ui/` directory (e.g., using Vite with React and TypeScript).
        *   Implement Module 1 (Core Application Shell & Layout): Basic structure (`MainLayout.tsx`), top menu bar placeholder, left/right pane placeholders.
        *   Implement Module 2 (API Client Service): Foundational `apiClient.ts` (e.g., with Axios) for basic GET/POST, and `apiEndpoints.ts`.
        *   Implement Module 3 (State Management Service): Initial setup (e.g., Zustand stores) for `connectionSlice`, `uiSlice`, and `settingsSlice`.
        *   Implement initial parts of Module 10 (Local Persistence): Basic `persistenceService.ts` with Dexie.js for saving/loading application settings (e.g., window size, last active connection) and workspace configurations.
    *   **Goal**: A runnable application shell in `ui/` with a basic layout. API client can make mock calls. Basic settings can be persisted and loaded.

2.  **Phase 2: Connection Management & Basic Schema Tree**
    *   **Activities**:
        *   Implement Module 4 (Connection Management UI & Logic): `ConnectionManager.tsx` to list, select connections. Connect to the backend API to fetch real connection details.
        *   Implement Module 5 (Schema Explorer Panel - Initial): 
            *   Basic `SchemaExplorerPanel.tsx` structure with top bar (connection name, refresh button).
            *   `TreeView` component rendering databases, schemas, tables/views with basic icons and labels.
            *   API calls via `ApiClient` for fetching schema data, supporting lazy loading of children on node expansion.
            *   Basic custom node rendering (icons, view distinction).
        *   Integrate `apiClient` (Module 2) fully for fetching connection and schema data.
        *   Expand `connectionSlice` and `schemaSlice` (Module 3) to manage live data.
    *   **Goal**: Users can connect to a database. A basic, filterable schema tree is displayed in the left pane, showing databases, schemas, and tables/views with lazy loading. Connection name and refresh are visible.

3.  **Phase 3: Core Querying Loop - Editor, Basic Tabs & Single Result View**
    *   **Activities**:
        *   Implement Module 6 (Tab Management System - Initial):
            *   `TabBar.tsx` for opening, selecting, and closing (single) query tabs.
            *   `TabContentHost.tsx` to render `QueryEditorTab`.
            *   "Add Tab" (+) functionality for new query tabs (prompts connection/db, auto-names tab).
            *   Basic tab tooltips (connection/db info).
        *   Implement Module 7 (Query Editor Component - Initial): 
            *   `QueryEditor.tsx` with Monaco integration, SQL syntax highlighting.
            *   Ability to execute the current query or selected block.
            *   Vim mode toggle.
            *   Basic highlighting of the executed SQL block.
        *   Implement Module 8 (Results Display Component - Initial Single View):
            *   `ResultsViewerContainer.tsx` (hosting a single `ResultsGrid.tsx` using `@glideapps/glide-data-grid`) to display the *current* result of a query.
            *   Basic `ResultsToolbar.tsx` with essential actions: Execute (linked to editor), Refresh (re-execute current query), Show SQL (for current result), and results Limit dropdown.
            *   Initial implementation of `inferResultTabName` for the title of this single result view/area.
        *   Integrate Module 10 (Local Persistence): Use `persistenceService.ts` (Dexie) to cache the *current* query result data for the active query tab. Persist basic state of open query tabs (ID, name, associated connection/DB, editor content).
        *   Update `tabSlice` (Module 3) for managing active query tabs and their content/state. Potentially an initial `resultsSlice` or state within `useResultsManager` for the single active result.
    *   **Goal**: Users can open query tabs, write/execute SQL, and view the results in a grid. The latest result is cached locally. Essential tab actions and result toolbar functions are operational.

4.  **Phase 4: Rich Schema Interactions, Advanced Tabs & Full Current Results View**
    *   **Activities**:
        *   Enhance Module 5 (Schema Explorer Panel - Advanced Interaction):
            *   Implement full, informative tooltips for schema nodes (with counts, types).
            *   Implement single-click (load meta details) and double-click (execute `SELECT *`) behaviors on table/view nodes.
            *   Implement the rich context menu for schema nodes (Copy Name, Refresh DB/Schema, SELECT \*, Get COUNT(\*), View DDL, Get Tables List, Get Columns List etc.), linking actions to open/update query tabs and results.
            *   Add tree filtering input.
            *   Persist tree expansion state (Module 10).
        *   Enhance Module 6 (Tab Management System - Advanced):
            *   Implement the full tab context menu (Rename, Close Others, Close to Right, Duplicate, Change Connection/DB for query tabs).
            *   Implement drag-and-drop for tab reordering.
            *   Loading indicators (spinners) on tabs.
        *   Enhance Module 8 (Results Display Component - Full Current View):
            *   Complete all `ResultsToolbar.tsx` functionalities for the *current* result (filtering, copy headers/data, export, row viewer, text mode, load more, duration/row count display).
            *   Add column header tooltips (name and data type) in `ResultsGrid.tsx`.
        *   Enhance Module 7 (Query Editor Component - Advanced):
            *   Implement the full editor context menu.
            *   Finalize structural hooks/API within `QueryEditor` for the future AI assistance overlay.
        *   Persist advanced tab states (order, active tab) and editor settings (e.g., Vim mode preference per tab) using Module 10.
    *   **Goal**: A highly interactive schema explorer. Full-featured tab management. Comprehensive display and interaction with the *current* query result. Editor is feature-rich (sans schema completion and AI overlay).

5.  **Phase 5: Result History/Pinning, Global UI & Polish**
    *   **Activities**:
        *   Implement Module 8 (Results Display Component - Full History & Pinning):
            *   Implement result sub-tab history (e.g., last 5 results, with smart names) within `ResultsViewerContainer.tsx` using `ResultsSubTab.tsx`.
            *   Implement pinning/unpinning for result sub-tabs.
            *   Ensure Dexie caching (Module 10) robustly supports the result history and pinning states, including cleanup of unpinned/closed results.
        *   Implement Module 9 (Top Menu Bar & Actions): Populate `TopMenuBar.tsx` with global actions (New Query Tab, Manage Connections, Settings, etc.) and connect them to state management.
        *   UI/UX polish across the application, focusing on workflows established in prior phases.
        *   Comprehensive error handling improvements.
    *   **Goal**: Users can view a history of query results within a tab, pin important ones. Main application navigation via top menu is functional. Core application feels polished and stable.

6.  **Phase 6: Remaining Features, Advanced Functionality & Optimization**
    *   **Activities**:
        *   Enhance Module 5 (Schema Explorer Panel): Context menu actions like "Analyze Table".
        *   Enhance Module 7 (Query Editor Component): Implement schema-aware autocompletion.
        *   Port remaining features from the original `frontend/` application like `HistoryPanel` (global query history) and `JobPanel`, refactoring them into the new architecture (as new modules under `features/`).
        *   Comprehensive end-to-end testing of all features.
        *   Performance optimization based on profiling.
        *   Final UI/UX review and polish.
        *   (Optional/Future) Begin implementation of the AI assistance overlay using the hooks defined in Module 7.
    *   **Goal**: A feature-complete, polished, and robust version of the dbNet frontend, incorporating advanced functionalities and ready for user testing and deployment.

This plan provides a structured approach to rebuilding the frontend. Each module and AI task can be tackled iteratively, allowing for focused development and easier integration of AI contributions.

## 5. Proposed File Tree for Refactored Frontend

This section outlines a potential file structure for the new `ui/src` directory. The original `frontend/` directory can be kept for reference. This structure aims to organize files by feature and type, promoting modularity and making it easier to locate and manage code.

```plaintext
ui/
├── public/                     # Static assets served by the web server
│   ├── index.html
│   └── ... (favicons, manifest.json, etc.)
├── src/
│   ├── App.tsx                 # Main application component, sets up layout, routing
│   ├── main.tsx                # Application entry point (renders App.tsx)
│   ├── config.ts               # Application-level configuration (e.g., API base URL)
│   │
│   ├── assets/                 # Static assets like images, fonts, icons
│   │   └── logo.svg
│   │
│   ├── components/             # Shared, reusable UI (presentational) components
│   │   ├── common/             # General-purpose, small UI elements
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   └── DataTable.tsx     # Generic data table/grid component wrapper (e.g., for glide-data-grid)
│   │   ├── layout/             # Components defining major layout structures
│   │   │   ├── MainLayout.tsx    # e.g., Two-pane structure with resizable splitter
│   │   │   ├── TopMenuBar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── navigation/         # Components related to navigation
│   │   │   └── TreeView.tsx      # Reusable tree view component for schema, etc.
│   │   └── specific/           # More specific, but still reusable components
│   │       └── MonacoEditor.tsx  # Wrapper for the Monaco editor instance
│   │
│   ├── features/               # Feature-specific modules (containers, hooks, specific components)
│   │   ├── connection/
│   │   │   ├── ConnectionManager.tsx # Main UI for managing connections
│   │   │   ├── ConnectionSelector.tsx # Dropdown/UI to pick current connection
│   │   │   ├── NewConnectionModal.tsx
│   │   │   └── useConnections.ts # Hook for connection logic & state interaction
│   │   ├── schema-explorer/    # The complete schema panel UI
│   │   │   ├── SchemaExplorerPanel.tsx
│   │   │   └── useSchema.ts      # Hook for schema fetching & state interaction
│   │   ├── query-editor/
│   │   │   ├── QueryEditorTab.tsx # Component representing a query editor tab
│   │   │   └── useQueryEditor.ts # Hook for editor content, execution logic
│   │   ├── results-viewer/     # Manages display of multiple query results, sub-tabs, and toolbar
│   │   │   ├── ResultsViewerContainer.tsx # Main container for a query's results area (hosting sub-tabs)
│   │   │   ├── ResultsSubTab.tsx   # Represents a single result set in a sub-tab
│   │   │   ├── ResultsGrid.tsx     # The @glideapps/glide-data-grid component wrapper
│   │   │   ├── ResultsToolbar.tsx  # Toolbar for actions on the active result
│   │   │   ├── useResultsManager.ts # Hook for managing results history, sub-tabs, pinning, and Dexie caching
│   │   │   └── results-utils.ts    # Utilities like inferResultTabName
│   │   ├── tab-management/
│   │   │   ├── TabBar.tsx
│   │   │   ├── TabContentHost.tsx # Renders the content of the active tab (QueryEditorTab, ResultsViewerContainer, etc.)
│   │   │   └── useTabs.ts        # Hook for tab state and logic
│   │   ├── history/
│   │   │   ├── HistoryPanel.tsx
│   │   │   └── useQueryHistory.ts
│   │   └── settings/
│   │       ├── SettingsModal.tsx
│   │       └── useSettings.ts
│   │
│   ├── services/               # Application-wide services (API, persistence, etc.)
│   │   ├── api-client.ts       # Centralized API client (e.g., using axios)
│   │   ├── api-endpoints.ts    # Definitions of API routes & constants
│   │   ├── persistence-service.ts # For local storage (e.g., Dexie.js wrapper for settings, workspace, and query results caching)
│   │   └── notification-service.ts # For toasts and global notifications
│   │
│   ├── store/                  # Global state management (e.g., Zustand, Redux Toolkit)
│   │   ├── index.ts              # Root store setup, exports all slices/stores
│   │   ├── connectionSlice.ts    # State for connections
│   │   ├── schemaSlice.ts        # State for database schemas
│   │   ├── tabSlice.ts           # State for open tabs and their content (including references to cached result IDs)
│   │   ├── resultsSlice.ts       # Potentially a slice to manage metadata about active/cached results if not fully handled by features/results-viewer
│   │   ├── editorSlice.ts        # State specifically for editor instances if complex
│   │   ├── uiSlice.ts            # General UI state (modals, global loading indicators)
│   │   └── settingsSlice.ts      # User preferences
│   │
│   ├── hooks/                  # Global, reusable React hooks (not feature-specific)
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useEventListener.ts
│   │
│   ├── styles/                 # Global styles, themes, CSS variables
│   │   ├── main.css              # Main stylesheet (or entry for CSS-in-JS)
│   │   ├── theme.ts              # Theme configuration (colors, fonts, etc.)
│   │   └── reset.css             # CSS reset or normalize
│   │
│   ├── types/                  # Shared TypeScript interfaces and type definitions
│   │   ├── api.ts                # Types for API requests and responses
│   │   ├── domain.ts             # Core domain model types (Connection, Schema, Table, QueryResult, CachedResult)
│   │   └── index.ts              # Aggregates and exports types
│   │
│   ├── utils/                  # General utility functions (formatting, validation, etc.)
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── helpers.ts            # Miscellaneous helper functions
│
├── package.json
├── tsconfig.json
├── vite.config.ts              # Example: using Vite as the build tool
└── README.md                   # Project README for the new frontend in ui/
```

**Key principles behind this structure:**

*   **Separation of Concerns**: UI components (`components`), feature logic (`features`), data services (`services`), and state (`store`) are clearly separated.
*   **Modularity**: Features are self-contained as much as possible within their respective directories under `features/`.
*   **Reusability**: Common UI elements are placed in `components/common/` for easy reuse across different features.
*   **Scalability**: This structure should scale well as more features and components are added.
*   **Clarity**: File and directory names are intended to be descriptive of their content and purpose.

This file tree is a suggestion and can be adapted as the project evolves. The primary goal is to establish a clean and organized foundation for the new dbNet frontend.

## 6. UI/UX Design and AI Collaboration

While the refactoring plan (Section 3, Module 1) specifies a high-level two-pane layout, a more detailed UI/UX design will be crucial for creating a modern and intuitive application. Collaborating with AI on UI design can be very effective if clear instructions and visual guides are provided.

### 6.1. Instructing AI for UI Design

To get the best results when asking an AI to help design or generate UI components, consider the following:

1.  **Clear Functional Requirements**: For each screen or major component, define what it needs to do and what information it needs to display or collect. (e.g., "The schema explorer should display a hierarchical list of databases, tables, and columns. Users must be able to expand/collapse nodes and trigger actions like 'view data' from a context menu.")

2.  **Wireframes or Layout Sketches**: This is one of the most effective ways to communicate UI structure.
    *   **What they are**: Simple black and white diagrams showing the placement of UI elements (buttons, input fields, text areas, navigation menus, content areas), their approximate size, and their relationship to each other. They focus on structure and functionality, not on visual aesthetics (colors, fonts).
    *   **Why they help AI**: They provide an unambiguous visual blueprint that an AI can translate into layout code (e.g., HTML/CSS, React components with styling).

3.  **Key UI Elements & Patterns**: Specify important components and any desired UI patterns (e.g., "Use a tabbed interface for the right pane," "Implement a global search bar in the top menu," "Follow a master-detail pattern for X view").

4.  **User Flows**: Describe how users will navigate through the UI to complete common tasks. This helps ensure the design is intuitive and supports the intended workflows.

5.  **Inspiration & Style Guides (Optional but helpful)**:
    *   **Visual References**: Point to existing applications or websites whose UI style you like (e.g., "Aim for a clean, minimalist aesthetic like VS Code," or "Incorporate elements of Material Design").
    *   **Brand Guidelines**: If there are specific brand colors, fonts, or spacing rules, provide them.

6.  **Constraints & Priorities**: Mention any specific constraints (e.g., "must be responsive down to 360px width," "prioritize information density over whitespace") or key design principles (e.g., "accessibility is a top priority").

7.  **Iterative Refinement**: Start with a broad request (e.g., "Generate a wireframe for the main application window based on the two-pane layout"). Then, provide feedback and ask for iterative refinements (e.g., "In the left pane, add a search input at the top," "Make the action buttons in the table rows icons instead of text").

### 6.2. Tools for Creating Wireframes (to feed to AI)

These tools can help you create wireframes or sketches that you can then use to instruct an AI:

*   **Excalidraw (excalidraw.com)**: Free, open-source, and very easy-to-use online tool for creating hand-drawn-like sketches and diagrams. Excellent for quick wireframes.
*   **Balsamiq (balsamiq.com)**: Specializes in rapid, low-fidelity wireframing with a sketchy look, which helps focus on structure.
*   **Figma (figma.com)** / **Sketch (sketch.com)** / **Adobe XD (adobe.com/products/xd)**: Professional design tools that can be used for everything from basic wireframes to high-fidelity mockups and interactive prototypes. Figma has a generous free tier and is web-based, making it very accessible.
*   **Miro (miro.com)** / **FigJam (figma.com/figjam/)**: Online collaborative whiteboarding tools that are great for brainstorming layouts and creating simple flowcharts or wireframes.
*   **Hand-drawn sketches**: Even a clear photo of a hand-drawn sketch on paper can be a good starting point for an AI, especially for initial layout ideas.

### 6.3. Example AI Prompt for UI Design (using a wireframe concept)

"Attached is a wireframe for the main application interface (`main_app_wireframe.png`). Please generate the React component structure using Tailwind CSS for the overall layout. The left pane (Schema Explorer) should initially be 25% of the width and resizable. The right pane (Content Area) will host tabs. The Top Menu Bar should contain placeholders for 'File', 'Edit', 'View', 'Connection', 'Help' menus."

By providing detailed textual descriptions combined with visual wireframes, you can guide AI to create UI components and layouts that more closely match your vision for dbNet Next.

## 7. Backend API Overview

This section provides a high-level overview of the backend API routes that the dbNet frontend interacts with. The backend is built using Go with the Echo framework. It leverages functionalities from a `dbrest` library for core database interactions.

Frontend API calls are managed via `frontend/src/store/api.tsx` (using `apiGet` and `apiPost`) and endpoint definitions are in `frontend/src/state/routes.ts`.

### Core Database Interaction Routes (largely from `dbrest`)

These routes handle direct interactions with configured database connections.

*   **Connection Management & Status:**
    *   `GET /.status`: Retrieves the status of the backend or a specific connection.
    *   `GET /.connections`: Fetches a list of all available/configured database connections.
    *   `POST /:connection/.close`: Closes an active database connection.
*   **Schema Browsing:**
    *   `GET /:connection/.databases`: Lists databases for a given connection.
    *   `GET /:connection/.schemas`: Lists schemas within a specific database of a connection.
    *   `GET /:connection/.tables`: Lists tables within a specific database (or a specific schema if provided implicitly via URL structure not fully detailed here but common in dbrest).
    *   `GET /:connection/:schema/.tables`: Lists tables for a specific schema.
    *   `GET /:connection/.columns`: Lists columns for all tables in a database (less common, usually per-table).
    *   `GET /:connection/:schema/.columns`: Lists columns for all tables in a specific schema.
    *   `GET /:connection/:schema/:table/.columns`: Retrieves column details for a specific table.
    *   `GET /:connection/:schema/:table/.indexes`: Retrieves index information for a table.
    *   `GET /:connection/:schema/:table/.keys`: Retrieves primary/foreign key information for a table.
*   **Query Execution & Data Retrieval:**
    *   `POST /:connection/.sql` & `POST /:connection/.sql/:id`: Submits a SQL query for execution against a specified connection. An optional ID can be used for tracking or specific handling. The backend uses `queryMiddleware` to process and log these queries (see `server/functions.go`).
    *   `POST /:connection/.cancel/:id`: Cancels a running query identified by its ID.
    *   `GET /:connection/:schema/:table`: Selects data from a specified table (likely with implicit default query, e.g., `SELECT * ... LIMIT X`).
*   **Data Manipulation (Potentially less used by a GUI directly, more for direct API):**
    *   `POST /:connection/:schema/:table`: Handles table inserts.
    *   `PUT /:connection/:schema/:table`: Handles table upserts.
    *   `PATCH /:connection/:schema/:table`: Handles table updates.

### dbNet Specific Application Routes (from `server/routes.go`)

These routes handle application-level functionalities beyond direct database interaction.

*   **Settings:**
    *   `GET /get-settings`: Retrieves application settings, including the `homeDir` (see `server/routes.go -> GetSettings`).
*   **History:**
    *   `GET /get-history`: Fetches query history. Supports different procedures like `get_latest` or `search` based on query parameters (see `server/routes.go -> GetHistory`). Query history is stored and retrieved via `store.Db`.
*   **Session Management:**
    *   `GET /load-session`: Loads a user session by name from the store.
    *   `POST /save-session`: Saves user session data to the store.
*   **File Operations:**
    *   `POST /file-operation`: Handles various file system operations based on the `operation` field in the request body (see `server/files.go` and `server/routes.go -> PostFileOperation`). Supported operations include:
        *   `list`: Lists files in a directory.
        *   `read`: Reads the content of a file.
        *   `write`: Writes content to a file (with optional overwrite and modification timestamp check).
        *   `delete`: Deletes a file.

### Static Content & Middleware

*   **Static File Serving**: The server uses `embed` to serve the frontend application (`/app`) directly from the Go binary. Routes like `/`, `/static/*`, and `/assets/*` are rewritten to serve content from the embedded `appFiles` (see `server/server.go`).
*   **Middleware**: Standard middleware like `Logger`, `Recover`, `RequestID`, and `CORS` are applied. Specific middleware (`queryMiddleware`, `schemataMiddleware` from `server/functions.go`) are used for processing query and schema-related requests, including logging queries to a persistent store (`store.Sync`).

This overview should provide context for understanding the backend interactions when refactoring the frontend components that rely on these API endpoints.
