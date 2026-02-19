export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    lastSavedAt?: string | null;
}

export interface Topic {
    id: string;
    name: string;
    description: string;
    partitions: number;
    eventIds: string[];
}

export interface FlinkJob {
    id: string;
    name: string;
    description: string;
    sourceTopics: string[];
    sinkTopics: string[];
}

export interface DataFlow {
    id: string;
    name: string;
    description: string;
    color: string;
    jobIds: string[];
}

export interface EventType {
    id: string;
    name: string;
    description: string;
    schema: string;
}

export interface SimulationStep {
    type: 'topic' | 'job' | 'edge';
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
    currentTopicId: string | null;
    visitedTopicIds: string[];
    visitedJobIds: string[];
    activeEdgeIds: string[];
    eventLog: {
        type: 'topic' | 'job' | 'info';
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
    topics: Topic[];
    flinkJobs: FlinkJob[];
    flows: DataFlow[];
    events: EventType[];
    activeFlowId: string | null;
    theme: 'dark' | 'light';
    simulation: SimulationState;
    sidebarTab: 'topics' | 'jobs' | 'flows' | 'events';
    leftSidebarOpen: boolean;
    rightSidebarOpen: boolean;
    selectedNodeId: string | null;
    modalOpen: 'topic' | 'job' | 'flow' | 'event' | 'project' | null;
    editingItem: any | null;
    toastMessage: string | null;
    lastSavedAt: string | null;

    init: () => void;
    toggleTheme: () => void;
    createProject: (name: string, description?: string) => Project;
    updateProject: (id: string, patch: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    switchProject: (projectId: string) => void;
    saveProject: () => void;
    exportProject: () => void;
    importProject: (file: File) => Promise<Project>;

    addTopic: (name: string, partitions: number, description: string, eventIds: string[]) => boolean;
    updateTopic: (id: string, patch: Partial<Topic>) => boolean;
    deleteTopic: (id: string) => void;
    isTopicNameUnique: (name: string, excludeId?: string | null) => boolean;

    addFlinkJob: (name: string, description: string, sourceTopics: string[], sinkTopics: string[]) => boolean;
    updateFlinkJob: (id: string, patch: Partial<FlinkJob>) => boolean;
    deleteFlinkJob: (id: string) => void;

    addFlow: (name: string, color: string, jobIds: string[], description: string) => void;
    updateFlow: (id: string, patch: Partial<DataFlow>) => void;
    deleteFlow: (id: string) => void;

    addEvent: (name: string, description: string, schema: string) => void;
    updateEvent: (id: string, patch: Partial<EventType>) => void;
    deleteEvent: (id: string) => void;

    startSimulation: (topicId: string, customPayload?: any) => void;
    stopSimulation: () => void;
    clearSimulation: () => void;
    setSimulationSpeed: (ms: number) => void;
    advanceSimulation: () => boolean;

    showToast: (message: string) => void;
    setSidebarTab: (tab: 'topics' | 'jobs' | 'flows' | 'events') => void;
    setActiveFlow: (id: string | null) => void;
    setLeftSidebar: (open: boolean) => void;
    setRightSidebar: (open: boolean) => void;
    openModal: (type: 'topic' | 'job' | 'flow' | 'event' | 'project', item?: any) => void;
    closeModal: () => void;
    setSelectedNode: (id: string | null) => void;
}
