export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    lastSavedAt?: string | null;
}

export type StreamType = 'kafka' | 'sqs' | 'sns' | 'other';
export type EdgeStyle = 'solid' | 'dashed' | 'dotted';
export type EdgeShape = 'circle' | 'square' | 'diamond' | 'star' | 'pizza' | 'ghost' | 'heart' | 'alien' | 'rocket';

export interface EventStream {
    id: string;
    name: string;
    type: StreamType;
    description: string;
    partitions: number;
    eventIds: string[];
}

export interface StreamConnection {
    streamId: string;
    eventIds: string[];
}

export interface Consumer {
    id: string;
    name: string;
    description: string;
    sources: StreamConnection[];
    sinks: StreamConnection[];
}

export interface DataFlow {
    id: string;
    name: string;
    description: string;
    color: string;
    consumerIds: string[];
}

export interface EventType {
    id: string;
    name: string;
    description: string;
    schema: string;
}

export interface SimulationStep {
    type: 'stream' | 'consumer' | 'edge';
    id?: string;
    from?: string;
    to?: string;
    message: string;
    payload?: any;
    outputPayload?: any;
}

export interface SimulationState {
    active: boolean;
    currentStep: number;
    totalSteps: number;
    steps: SimulationStep[];
    currentStreamId: string | null;
    currentEdgeId: string | null;
    visitedStreamIds: string[];
    visitedConsumerIds: string[];
    activeEdgeIds: string[];
    eventLog: {
        type: 'stream' | 'consumer' | 'info';
        message: string;
        time: string;
        payload?: any;
        outputPayload?: any;
    }[];
    speed: number;
}

export interface StoreState {
    projects: Project[];
    activeProjectId: string | null;
    streams: EventStream[];
    consumers: Consumer[];
    flows: DataFlow[];
    events: EventType[];
    activeFlowId: string | null;
    theme: 'dark' | 'light';
    simulation: SimulationState;
    sidebarTab: 'streams' | 'consumers' | 'flows' | 'events';
    leftSidebarOpen: boolean;
    rightSidebarOpen: boolean;
    selectedNodeId: string | null;
    modalOpen: 'stream' | 'consumer' | 'flow' | 'event' | 'project' | 'confirm' | 'nodeDetails' | null;
    editingItem: any | null;
    toastMessage: string | null;
    lastSavedAt: string | null;
    traceMode: boolean;
    edgeStyle: EdgeStyle;
    edgeShape: EdgeShape;

    init: () => void;
    toggleTheme: () => void;
    createProject: (name: string, description?: string) => Project;
    updateProject: (id: string, patch: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    switchProject: (projectId: string) => void;
    saveProject: () => void;
    exportProject: () => void;
    importProject: (file: File) => Promise<Project>;

    addStream: (name: string, type: StreamType, partitions: number, description: string, eventIds: string[]) => boolean;
    updateStream: (id: string, patch: Partial<EventStream>) => boolean;
    deleteStream: (id: string) => void;
    isStreamNameUnique: (name: string, excludeId?: string | null) => boolean;

    addConsumer: (name: string, description: string, sources: StreamConnection[], sinks: StreamConnection[]) => boolean;
    updateConsumer: (id: string, patch: Partial<Consumer>) => boolean;
    deleteConsumer: (id: string) => void;

    addFlow: (name: string, color: string, consumerIds: string[], description: string) => void;
    updateFlow: (id: string, patch: Partial<DataFlow>) => void;
    deleteFlow: (id: string) => void;

    addEvent: (name: string, description: string, schema: string) => void;
    updateEvent: (id: string, patch: Partial<EventType>) => void;
    deleteEvent: (id: string) => void;

    startSimulation: (streamId: string, customPayload?: any) => void;
    stopSimulation: () => void;
    clearSimulation: () => void;
    setSimulationSpeed: (ms: number) => void;
    advanceSimulation: () => boolean;

    showToast: (message: string) => void;
    setSidebarTab: (tab: 'streams' | 'consumers' | 'flows' | 'events') => void;
    setActiveFlow: (id: string | null) => void;
    setLeftSidebar: (open: boolean) => void;
    setRightSidebar: (open: boolean) => void;
    openModal: (type: 'stream' | 'consumer' | 'flow' | 'event' | 'project' | 'confirm' | 'nodeDetails', item?: any) => void;
    closeModal: () => void;
    setSelectedNode: (id: string | null) => void;
    setTraceMode: (enabled: boolean) => void;
    setEdgeStyle: (style: EdgeStyle) => void;
    setEdgeShape: (shape: EdgeShape) => void;
    loadDemo: () => void;
    resetApp: () => void;
}

