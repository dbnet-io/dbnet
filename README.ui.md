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

## 3. Refactoring Plan: Modules and AI Tasks

We will break the application into the following key modules/areas. For each, we'll define current observations, refactoring goals, and how AI can assist. **Important: Throughout the implementation of these modules, developers (and AI assisting them) should refer to the existing codebase in the `frontend/` directory. The primary goal is to modernize the UI and underlying architecture, but the core UX flows and essential functionalities should be replicated to ensure a familiar user experience, unless explicitly decided otherwise.**

### Module 1: Core Application Shell & Layout

*   **Current**: `App.tsx`, `Default.tsx`, `panes/LeftPane.tsx`, `panes/RightPane.tsx`. Uses PrimeReact Splitter.
*   **Refactoring Goals**:
    *   Define a clean, modern main application layout.
    *   Establish a root component structure.
    *   Implement responsive design for different screen sizes.
    *   Potentially replace PrimeReact Splitter with a more flexible or modern alternative if desired.
*   **AI Tasks**:
    *   **Task 1.1**: Generate a basic React/TypeScript application shell with a two-pane layout (left for navigation/schema, right for content tabs) using a modern CSS framework (e.g., Tailwind CSS or styled-components). Specify proportions and resizability.
    *   **Task 1.2**: Create basic placeholder components for `TopMenuBar`, `LeftPaneContainer`, and `RightPaneContainer`.
    *   **Task 1.3**: Implement routing (e.g., using `react-router-dom v6+`) if complex deep linking or view navigation is required beyond simple connection-based routing.

### Module 2: API Client Service

*   **Current**: `store/api.tsx`. Uses global `fetch` with custom response parsing.
*   **Refactoring Goals**:
    *   Create a dedicated, injectable API client service.
    *   Use a modern data fetching library (e.g., `axios`, `RTK Query`, `TanStack Query/React Query`) for better caching, request lifecycle management, and error handling.
    *   Define clear TypeScript types for API requests and responses.
    *   Centralize API endpoint definitions.
*   **AI Tasks**:
    *   **Task 2.1**: Define TypeScript interfaces for common API request payloads and response structures (e.g., `ConnectionInfo`, `DatabaseSchema`, `TableDetails`, `QueryResult`, `QueryError`).
    *   **Task 2.2**: Implement an `ApiClient` class or set of functions using `axios` (or another chosen library). It should include methods for GET and POST, header management, and standardized error handling.
    *   **Task 2.3**: Refactor existing API call logic from `store/api.tsx` and `state/dbnet.ts` to use the new `ApiClient`. AI can help map old `fetch` calls to the new methods.

### Module 3: State Management Service

*   **Current**: Hookstate with a central `DbNet` class (`state/dbnet.ts`) and various state modules (`state/*.ts`). Global window objects are also used (`window.dbnet`).
*   **Refactoring Goals**:
    *   Adopt a more standard React state management pattern (e.g., Zustand, Redux Toolkit, or continue with Hookstate but with clearer module boundaries and no global window objects for state).
    *   Ensure state is serializable and easily debuggable.
    *   Define clear state slices or stores for different parts of the application (e.g., `connections`, `schema`, `tabs`, `queryResults`, `uiState`).
    *   Eliminate reliance on `window.dbnet` and other global state variables.
*   **AI Tasks**:
    *   **Task 3.1**: Design the structure for the new state management solution (e.g., define Zustand stores or Redux slices) for:
        *   `connectionState`: List of available connections, selected connection, connection status.
        *   `schemaState`: Cached schema information per connection/database.
        *   `tabState`: List of open tabs, active tab, content per tab (query, results, type).
        *   `editorState`: Content and settings for query editors.
        *   `settingsState`: User preferences.
    *   **Task 3.2**: Generate the boilerplate for these state modules, including initial state, actions/reducers/mutators, and selectors.
    *   **Task 3.3**: Assist in migrating logic from the existing `DbNet` class and individual state files into the new state management structure.

### Module 4: Connection Management UI & Logic

*   **Current**: `ConnectionChooser.tsx`, parts of `Default.tsx`, `state/connection.ts`, `state/dbnet.ts`.
*   **Refactoring Goals**:
    *   A clear, user-friendly way to manage and select connections.
    *   Improved error handling and feedback during connection attempts.
    *   Decouple UI from direct state manipulation.
*   **AI Tasks**:
    *   **Task 4.1**: Generate a React component `ConnectionManager` that:
        *   Displays a list of available connections (fetched via the `ApiClient` and managed by `connectionState`).
        *   Allows selecting a connection.
        *   Shows a modal or form for adding/editing connection configurations (initially, this can be a placeholder, focusing on display and selection).
        *   Uses the new `ApiClient` to fetch connection lists and the `connectionState` to update the application state.
    *   **Task 4.2**: Style the `ConnectionManager` component using the chosen modern CSS framework.

### Module 5: Schema Explorer Panel

*   **Current**: `SchemaPanel.tsx` uses PrimeReact `Tree` and `ContextMenu`. It displays a filterable tree of Databases -> Schemas -> Tables/Views. Features include:
    *   A top bar with current connection name and a global refresh button.
    *   Custom node templates with icons and tooltips (showing item type, name, and counts like number of schemas/tables/columns).
    *   Views are visually distinguished (e.g., by color).
    *   Single-click on a table/view (after a delay) loads its metadata into a separate panel.
    *   Double-click on a table/view also executes a `SELECT * LIMIT 500` query for it.
    *   A rich context menu with actions like: Copy Name, Refresh (database), SELECT \*, Get COUNT(\*), View DDL, Analyze Table, Copy DROP Command, Get Tables (list), Get Columns (list).
    *   Tree expansion and selection state are managed and likely persisted.
*   **Refactoring Goals**:
    *   Replicate the existing hierarchical tree view (Databases -> Schemas -> Tables/Views) using a performant tree component (e.g., from a library like `react-arborist`, `rc-tree`, or a custom one if simple enough, wrapped in `components/navigation/TreeView.tsx`).
    *   Maintain the top bar with connection name and a refresh button.
    *   Implement custom node rendering to include icons, distinguish views, and show informative tooltips on hover (similar to existing: item type, name, relevant counts).
    *   Provide a text-based filter for the tree.
    *   Replicate the single-click and double-click behaviors on table/view nodes (opening meta details and executing a select query, respectively).
    *   Implement a context menu with actions comparable to the existing one, adapting them to the new action/state management system. Consider grouping or refining context menu items for better UX.
    *   Ensure tree expansion state is preserved (e.g., in `schemaState` or `uiSlice` and potentially persisted via `persistenceService`).
    *   Lazy loading of schema parts (e.g., loading tables/views only when a schema is expanded) should be a primary consideration for performance.
*   **AI Tasks**:
    *   **Task 5.1**: Design the data structure for the schema tree (e.g., `TreeNode` interface with properties like `id`, `name`, `type: 'database' | 'schema' | 'table' | 'view'`, `children`, `tooltipData: { count?: number, typeSpecificInfo?: string }`).
    *   **Task 5.2**: Generate a React component `SchemaExplorerPanel` that includes:
        *   The top bar (connection name, refresh button).
        *   A filter input field.
        *   The `TreeView` component for rendering the schema.
    *   **Task 5.3**: Develop the `TreeView` component (or adapt a library) with custom node rendering for icons, labels, and tooltips, and to differentiate views.
        *   AI can help generate the JSX for node templates based on `TreeNode` data.
    *   **Task 5.4**: Implement the logic for single-click (triggering meta detail view - this might involve a new `metaDetailState` or publishing an event) and double-click (dispatching an action to open a new query tab with `SELECT * ... LIMIT 500`).
    *   **Task 5.5**: Design and implement the context menu for schema nodes. AI can help structure the menu items and map them to actions (e.g., calling functions in `useSchema` hook or dispatching to state stores).
        *   Example actions to replicate: Copy Name, Refresh (for database/schema), SELECT \*, Get COUNT(\*), View DDL, Analyze Table, Get Tables List, Get Columns List.
    *   **Task 5.6**: Implement API calls via `ApiClient` to fetch schema information (databases, schemas, tables, columns), and update `schemaState`. This should support lazy-loading children on node expansion.
    *   **Task 5.7**: Manage tree expansion and selection state within `schemaState` or `uiSlice`, with persistence via `persistenceService`.

### Module 6: Tab Management System

*   **Current**: `components/TabNames.tsx` uses PrimeReact `TabMenu` for main query tabs. `state/tab.ts` handles tab state. Key UX features include:
    *   Displaying tab names with a loading spinner icon when busy.
    *   Tooltips on tab hover showing connection and database details.
    *   An "Add Tab" (+) button that prompts for connection/database and auto-generates a unique tab name (e.g., `database_name` or `YYYY-MM-DD_N`).
    *   A "Close Tab" (x) button for the active tab.
    *   Right-click context menu on a tab with options: Rename (inline editing), Close, and a list of databases for the current connection to switch the tab's database context.
    *   Logic for creating/finding tabs and appending SQL to existing tabs if a similar one exists (`createTab`, `appendSqlToTab`).
    *   Implicit handling of result associations which will be expanded in Module 8.
*   **Refactoring Goals**:
    *   Implement a robust and intuitive tab management system (e.g., using components from `features/tab_management/`) for primary content types (Query Editor, Results Viewer, Settings).
    *   Replicate the tab bar appearance: display tab names, show loading indicators (spinners) on tabs when their content is loading or executing.
    *   Implement tooltips on tab hover to show essential context (e.g., connection, database associated with a query tab).
    *   Provide an "Add Tab" (+) functionality: this should likely present a way to choose the tab type (e.g., New Query, or open specific views like Settings). For new query tabs, it should prompt for connection/database selection and auto-generate a unique, editable name.
    *   Allow closing tabs (e.g., with an 'x' icon on each tab or via context menu).
    *   Implement a right-click context menu for tabs with actions like: Rename Tab (inline edit), Close Tab, Close Others, Close to Right, Duplicate.
    *   For query tabs, the context menu should also allow changing the associated Connection and Database (similar to the current database list in the context menu).
    *   Ensure tab state (open tabs, active tab, their type, and associated context like connection/database for query tabs) is managed cleanly in `tabSlice` and persisted via `persistenceService`.
    *   Support reordering of tabs via drag-and-drop.
*   **AI Tasks**:
    *   **Task 6.1**: Generate a `TabBar` component that:
        *   Renders tab headers based on data from `tabSlice`.
        *   Displays an icon/spinner for loading states.
        *   Shows tooltips with context information.
        *   Includes an "Add Tab" button.
        *   Allows selecting tabs and provides a visual indication of the active tab.
        *   Handles drag-and-drop for tab reordering.
    *   **Task 6.2**: Implement the `TabContentHost` component that dynamically renders the content for the active tab based on its type (e.g., `QueryEditorTab` from Module 7, `ResultsViewerContainer` from Module 8, or a `SettingsView`).
    *   **Task 6.3**: Develop the tab context menu with actions: Rename (inline edit), Close, Close Others, Close to Right, Duplicate. For query tabs, add Change Connection & Change Database options.
        *   AI can generate the menu structure and boilerplate for action handlers.
    *   **Task 6.4**: Implement the logic in `tabSlice` (or `useTabs` hook) for:
        *   Adding new tabs (handling type, connection/database selection for query tabs, auto-naming).
        *   Closing tabs (single, others, to the right).
        *   Selecting tabs.
        *   Renaming tabs.
        *   Duplicating tabs.
        *   Reordering tabs.
        *   Updating connection/database context for a query tab.
    *   **Task 6.5**: Ensure tab state is persisted and restored using `persistenceService`.

### Module 7: Query Editor Component

*   **Current**: `TabEditor.tsx`, `state/editor.ts`, `state/monaco/`. Uses Monaco editor. Existing features include SQL formatting, saving editor selection, and some form of decorations (`setDecoration`). Ctrl/Meta-click on an identifier can load a meta table.
*   **Refactoring Goals**:
    *   Integrate Monaco editor smoothly within the new component structure.
    *   Provide robust SQL syntax highlighting and explore schema-aware autocompletion (linking to `schemaState`).
    *   Allow running the entire query or selected query blocks (e.g., via Ctrl+Enter / Cmd+Enter).
    *   Clearly highlight/decorate the exact block of SQL that was executed.
    *   Implement an option to switch to **Monaco's Vim mode** for users familiar with Vim keybindings.
    *   Replicate essential items from the **existing context menu** relevant to query editing (e.g., format query, copy, paste, potentially new AI actions).
    *   Design the editor component to **accommodate a future AI assistance overlay**. This overlay (e.g., triggered by Ctrl+K) would appear near the cursor, allowing users to submit AI commands and receive inline suggestions or code modifications. The editor component should provide necessary hooks or references (like cursor position, selected text) for the overlay to function.
    *   Manage editor content and settings (like Vim mode preference) per tab, possibly persisted via `settingsState` or `tabState`.
*   **AI Tasks**:
    *   **Task 7.1**: Create a `QueryEditor` React component that wraps the Monaco editor.
        *   Props: `initialContent: string`, `language: string` (e.g., "sql"), `onChange: (value: string) => void`, `onExecuteQuery: (query: string, selection?: Range) => void`, `options?: monaco.editor.IStandaloneEditorConstructionOptions`.
        *   Internal state/hooks for managing the editor instance, Vim mode status, decorations, and cursor position.
    *   **Task 7.2**: Implement Monaco editor setup:
        *   SQL language configuration, syntax highlighting.
        *   **Add a toggle/setting to enable/disable Vim mode** (`monaco-vim`).
        *   Functionality to get selected text or the entire content for query execution.
        *   Mechanism to apply **decorations to highlight specific ranges** (e.g., the last executed query block).
    *   **Task 7.3**: Develop a basic **context menu** for the editor. AI can help generate the structure and suggest initial common actions (Format, Copy, Paste). Later, actions like "Explain this query (AI)" or "Optimize this query (AI)" can be added.
    *   **Task 7.4**: Define an interface or mechanism within the `QueryEditor` component that would allow an external "AI Assistant" component to:
        *   Get the current cursor position and selected text.
        *   Insert or replace text at the cursor or in a selected range.
        *   (Future) Receive context from the editor (e.g., surrounding code) for more informed AI suggestions.
        *   This task focuses on the *structural hooks* in `QueryEditor`, not the AI overlay itself.
    *   **Task 7.5**: Integrate this `QueryEditor` component into the `TabContainer` when a tab's type is 'queryEditor'. Query content and editor-specific settings (like Vim mode) should be loaded from/saved to `tabState` and/or `settingsState`.
    *   **Task 7.6**: (Advanced) Explore dynamic autocompletion lists based on `schemaState`. AI can research Monaco's API for `registerCompletionItemProvider` and suggest how to map schema information (tables, columns from the active connection) to completion items.

### Module 8: Results Display Component

*   **Current**: `TabTable.tsx` (likely uses `@glideapps/glide-data-grid`) and `TabToolbar.tsx` (provides actions like refresh, filtering, copy, export, limit adjustment, SQL view, row count, duration, directly interacting with the result state).
*   **Refactoring Goals**:
    *   Utilize **`@glideapps/glide-data-grid`** for its performance and capabilities.
    *   Implement a **modernized `ResultsToolbar`** component placed directly above the data grid, mirroring the functionality of the existing `TabToolbar.tsx`. This toolbar will interact with the currently active result set.
    *   Display **column name and data type on hover** over column headers in the grid.
    *   Introduce **tabbed results within each main query results view**: each execution of a query in a primary query tab will generate a new result sub-tab. A history of the most recent (e.g., 5) results should be maintained. Older results are pruned unless pinned.
    *   Allow users to **pin specific result sub-tabs** (e.g., by double-clicking the result sub-tab title) to prevent them from being automatically pruned from the history.
    *   Implement **smart naming for result sub-tabs**: the name should be inferred from the SQL query. If a single table is queried, use that table name (without schema). If multiple tables are joined, use the first/primary table name. This will require basic SQL parsing.
    *   Ensure a clean, performant data flow between the grid, toolbar, and the state management solution.
    *   Cache results in frontend wit Dexie for persistence across tab switches and sessions. Once tab or result is closed, delete from Dexie as well.
*   **AI Tasks**:
    *   **Task 8.1**: Define props for a `ResultsViewerTab` component. This component will encapsulate the results area for a single main query tab and will manage its own set of result sub-tabs.
        *   Props: `queryId: string` (to associate with the parent query), `resultsHistory: ResultState[]` (array of the last N results), `activeResultIndex: number`, `onExecuteQueryAgain: (query: string) => void`, etc.
    *   **Task 8.2**: Generate the `ResultsGrid` component using `@glideapps/glide-data-grid`.
        *   Props: `columns: ColumnDef[]`, `data: Row[]`, `isLoading: boolean`, `error?: string`.
        *   Implement **column header hover functionality** to display a tooltip with column name and data type.
    *   **Task 8.3**: Generate a `ResultsToolbar` React component.
        *   This component will receive the currently active `ResultState` as a prop and provide UI elements (buttons, inputs) for actions similar to the existing `TabToolbar.tsx`:
            *   Execute/Kill Query (interacting with the parent query tab's execution logic)
            *   Refresh Results (re-execute the query that produced the current result)
            *   Show SQL (toggle a modal/overlay showing the SQL for the current result)
            *   Results Limit Dropdown (e.g., 100, 500, 1000 rows)
            *   Row Viewer Toggle
            *   Show as Text Toggle
            *   Filter Rows Input
            *   Copy Headers Button
            *   Copy Data Button
            *   Export Data Button (with options for format and row limit)
            *   Load More Rows Button (if applicable)
            *   Display for row count and query duration.
        *   AI can help design the layout and styling of this toolbar using the chosen modern CSS framework.
    *   **Task 8.4**: Implement the **result sub-tabbing and pinning logic** within the `ResultsViewerTab` component.
        *   Manage a list (e.g., up to 5) of `ResultState` objects.
        *   Provide UI (e.g., simple sub-tab headers) to switch between these historical results.
        *   Implement a mechanism to "pin" a result sub-tab (e.g., double-click on its title), which prevents it from being pruned when new results arrive.
        *   Pinned status should be part of the `ResultState`.
    *   **Task 8.5**: Develop a utility function `inferResultTabName(sql: string): string`.
        *   This function will perform basic SQL parsing (e.g., using regex or a lightweight parser) to extract the primary table name for naming result sub-tabs.
        *   AI can assist in generating parsing logic for common SQL SELECT patterns.
        *   This utility could reside in `features/results_viewer/utils.ts` or a global `utils/` directory.
    *   **Task 8.6**: Integrate the `ResultsGrid`, `ResultsToolbar`, result sub-tabbing, and smart naming logic into the `ResultsViewerTab` component. This component will then be used by the main `TabContainer` when a tab is designated to show query results.
        *   Ensure new results from query executions are added to the `resultsHistory`, pruning old unpinned results if the limit is exceeded.
        *   The `ResultsToolbar` should always operate on the currently selected result sub-tab.

### Module 9: Top Menu Bar & Actions

*   **Current**: `TopMenuBar.tsx`, `TabToolbar.tsx`.
*   **Refactoring Goals**:
    *   A clean and intuitive menu bar for global actions (e.g., New Query, Manage Connections, Settings) and context-specific actions (e.g., Run Query, Save Query - if applicable to the active tab).
*   **AI Tasks**:
    *   **Task 9.1**: Generate a `TopMenuBar` component with placeholder buttons/dropdowns for common actions.
    *   **Task 9.2**: Connect these actions to the relevant state management functions (e.g., opening a new query tab, showing the connection manager).
    *   **Task 9.3**: Design and implement a `TabToolbar` component that can be dynamically populated with actions relevant to the active tab's content (e.g., "Run Query" button for an editor tab).

### Module 10: Local Persistence (Settings, Workspace)

*   **Current**: Uses Dexie.js for `workspace` and `historyQueries`, `historyJobs`. `localStorage` for `_connection_name`, `_workspace_name`.
*   **Refactoring Goals**:
    *   Centralize local persistence logic.
    *   Clearly define what needs to be persisted (e.g., user settings, open tabs, last connection, query history).
    *   Continue using Dexie.js or switch to another robust client-side storage solution if needed.
*   **AI Tasks**:
    *   **Task 10.1**: Define a `PersistenceService` module that abstracts away the details of Dexie.js (or chosen storage).
    *   **Task 10.2**: Implement methods in this service to `saveWorkspaceSettings(settings: WorkspaceSettings)`, `loadWorkspaceSettings(): WorkspaceSettings`, `saveQueryToHistory(query: Query)`, `loadQueryHistory(): Query[]`.
    *   **Task 10.3**: Integrate calls to this service at appropriate points (e.g., on app load, on settings change, after query execution).

### General AI-Assisted Tasks Across Modules:

*   **Component Styling**: Once basic components are generated, AI can be tasked with applying styles using the chosen framework (e.g., "Style this button component using Tailwind CSS to look like X").
*   **Unit Test Generation**: For well-defined components and functions, AI can help generate initial unit tests (e.g., using Jest and React Testing Library).
*   **TypeScript Type Refinement**: AI can assist in refining TypeScript types and interfaces as the application evolves.
*   **Code Refactoring**: For specific functions or small components, AI can be asked to refactor for clarity, performance, or to adhere to new patterns.
*   **Documentation**: AI can help generate JSDoc comments or markdown documentation for components and services.

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
│   │   ├── schema_explorer/
│   │   │   ├── SchemaExplorerPanel.tsx # The complete schema panel UI
│   │   │   └── useSchema.ts      # Hook for schema fetching & state interaction
│   │   ├── query_editor/
│   │   │   ├── QueryEditorTab.tsx # Component representing a query editor tab
│   │   │   └── useQueryEditor.ts # Hook for editor content, execution logic
│   │   ├── results_viewer/       # Manages display of multiple query results, sub-tabs, and toolbar
│   │   │   ├── ResultsViewerContainer.tsx # Main container for a query's results area (hosting sub-tabs)
│   │   │   ├── ResultsSubTab.tsx   # Represents a single result set in a sub-tab
│   │   │   ├── ResultsGrid.tsx     # The @glideapps/glide-data-grid component wrapper
│   │   │   ├── ResultsToolbar.tsx  # Toolbar for actions on the active result
│   │   │   ├── useResultsManager.ts # Hook for managing results history, sub-tabs, pinning, and Dexie caching
│   │   │   └── resultsUtils.ts     # Utilities like inferResultTabName
│   │   ├── tab_management/
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
│   │   ├── apiClient.ts          # Centralized API client (e.g., using axios)
│   │   ├── apiEndpoints.ts       # Definitions of API routes & constants
│   │   ├── persistenceService.ts # For local storage (e.g., Dexie.js wrapper for settings, workspace, and query results caching)
│   │   └── notificationService.ts # For toasts and global notifications
│   │
│   ├── store/                  # Global state management (e.g., Zustand, Redux Toolkit)
│   │   ├── index.ts              # Root store setup, exports all slices/stores
│   │   ├── connectionSlice.ts    # State for connections
│   │   ├── schemaSlice.ts        # State for database schemas
│   │   ├── tabSlice.ts           # State for open tabs and their content (including references to cached result IDs)
│   │   ├── resultsSlice.ts       # Potentially a slice to manage metadata about active/cached results if not fully handled by features/results_viewer
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
