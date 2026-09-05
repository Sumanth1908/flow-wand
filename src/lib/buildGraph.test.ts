import { expect, it, vi } from 'vitest';
import dagre from 'dagre';
import { buildGraph, applySimulationToGraph } from './buildGraph';
import { INITIAL_SIM } from '../hooks/useSimulation';

it('decorates simulation frames without rerunning layout or moving nodes', () => {
    const layout = vi.spyOn(dagre, 'layout');
    const graph = buildGraph({ streams: [{ id: 's', name: 'Source', description: '', type: 'kafka', partitions: 1 }],
        consumers: [{ id: 'c', name: 'Consumer', description: '', sources: [{ streamId: 's', eventIds: [] }], sinks: [] }], flows: [], activeFlowId: null });
    expect(layout).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 50; i++) {
        const decorated = applySimulationToGraph(graph, { ...INITIAL_SIM, active: true, currentStreamId: 's', currentEdgeId: 's->c', activeEdgeIds: ['s->c'] }, true);
        expect(decorated.nodes[0].position).toEqual(graph.nodes[0].position);
        expect(decorated.nodes[0].data.simulationState).toBe('active');
        expect(decorated.edges[0].data?.simulationState).toBe('active');
    }
    expect(layout).toHaveBeenCalledTimes(1);
    expect(graph.nodes[0].data.simulationState).toBe('idle');
    layout.mockRestore();
});
