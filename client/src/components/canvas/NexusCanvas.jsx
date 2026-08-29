import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SensorNode from './customNodes/SensorNode';
import FilterNode from './customNodes/FilterNode';
import MathNode from './customNodes/MathNode';
import ActionNode from './customNodes/ActionNode';
import CustomGlowEdge from './customNodes/CustomGlowEdge';
import NodeSidebar from './NodeSidebar';
import NodeConfigModal from './NodeConfigModal';
import PipelineToolbar from './PipelineToolbar';
import { PRESET_PIPELINES } from '../../constants/nodeTemplates';
import {
  fetchPipelines,
  createPipeline,
  testPipelineStructure
} from '../../services/api';
import confetti from 'canvas-confetti';

const nodeTypes = {
  sensorNode: SensorNode,
  filterNode: FilterNode,
  mathNode: MathNode,
  actionNode: ActionNode
};

const edgeTypes = {
  customGlowEdge: CustomGlowEdge
};

let idCounter = 100;

function CanvasInner({ onNotification }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [nodes, setNodes] = useState(PRESET_PIPELINES[0].nodes);
  const [edges, setEdges] = useState(PRESET_PIPELINES[0].edges.map(e => ({ ...e, type: 'customGlowEdge' })));
  const [pipelineId, setPipelineId] = useState('preset-turbine-overheat');
  const [pipelineName, setPipelineName] = useState(PRESET_PIPELINES[0].name);
  const [pipelineDesc, setPipelineDesc] = useState(PRESET_PIPELINES[0].description);
  const [isActive, setIsActive] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing pipeline from backend on init
  useEffect(() => {
    fetchPipelines().then(list => {
      if (list && list.length > 0) {
        const first = list[0];
        setPipelineId(first.pipelineId || first._id);
        setPipelineName(first.name);
        setPipelineDesc(first.description || '');
        setIsActive(first.isActive);
        if (first.nodes && first.nodes.length > 0) {
          setNodes(first.nodes);
          setEdges((first.edges || []).map(e => ({ ...e, type: 'customGlowEdge' })));
        }
      }
    }).catch(() => {});
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'customGlowEdge', animated: true }, eds)),
    []
  );

  // Drag and drop onto canvas
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeJson = event.dataTransfer.getData('application/reactflow');
      if (!nodeJson) return;

      const template = JSON.parse(nodeJson);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      idCounter++;
      const newNode = {
        id: `node-${Date.now()}-${idCounter}`,
        type: template.type,
        position,
        data: { ...template.defaultData }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  // Node click -> open properties modal
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  }, []);

  const handleSaveNodeConfig = (nodeId, updatedData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: updatedData };
        }
        return node;
      })
    );
    onNotification({ type: 'success', message: 'Node configuration updated.' });
  };

  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    onNotification({ type: 'info', message: 'Node deleted from pipeline.' });
  };

  const handleSavePipeline = async () => {
    setIsSaving(true);
    try {
      const payload = {
        pipelineId: pipelineId || `pipe-${Date.now()}`,
        name: pipelineName || 'Untitled Pipeline',
        description: pipelineDesc,
        nodes,
        edges,
        isActive
      };

      await createPipeline(payload);
      setIsSaving(false);
      onNotification({ type: 'success', message: `Pipeline "${pipelineName}" compiled & deployed to reactive engine!` });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      setIsSaving(false);
      onNotification({ type: 'error', message: `Deploy error: ${err.message}` });
    }
  };

  const handleLoadPreset = (preset) => {
    setPipelineId(preset.id);
    setPipelineName(preset.name);
    setPipelineDesc(preset.description);
    setNodes(preset.nodes);
    setEdges(preset.edges.map(e => ({ ...e, type: 'customGlowEdge' })));
    setIsActive(true);
    onNotification({ type: 'info', message: `Preset loaded: ${preset.name}` });
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    onNotification({ type: 'info', message: 'Canvas cleared.' });
  };

  const handleTestRun = async () => {
    try {
      const result = await testPipelineStructure({ nodes, edges });
      onNotification({
        type: 'success',
        message: `Validation Passed: ${result.sourceCount} Source(s), ${result.actionCount} Action(s). DAG ready.`
      });
    } catch (err) {
      onNotification({
        type: 'error',
        message: err.response?.data?.error || 'Validation failed: Pipeline needs at least 1 Source and 1 Action node.'
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      {/* Top Pipeline Toolbar */}
      <PipelineToolbar
        pipelineName={pipelineName}
        setPipelineName={setPipelineName}
        pipelineDesc={pipelineDesc}
        setPipelineDesc={setPipelineDesc}
        isActive={isActive}
        onToggleActive={() => setIsActive(!isActive)}
        onSave={handleSavePipeline}
        onClear={handleClear}
        onLoadPreset={handleLoadPreset}
        onTestRun={handleTestRun}
        isSaving={isSaving}
      />

      {/* Main Workspace Area: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodeSidebar />

        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'customGlowEdge', animated: true }}
            className="bg-[#090d16]"
          >
            <Controls className="!bg-slate-900 !border-slate-700" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'sensorNode') return '#00f0ff';
                if (n.type === 'filterNode') return '#b026ff';
                if (n.type === 'mathNode') return '#8b5cf6';
                if (n.type === 'actionNode') return '#ff007f';
                return '#475569';
              }}
              className="!bg-slate-900/90 !border-slate-800"
              maskColor="rgba(9, 13, 22, 0.7)"
            />
            <Background color="#1e293b" gap={20} size={1} />
          </ReactFlow>

          {/* Canvas Floating Hint */}
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 backdrop-blur-sm pointer-events-none">
            💡 Click any node to customize parameters • Drag edges between handles to route stream
          </div>
        </div>
      </div>

      {/* Node Config Modal */}
      <NodeConfigModal
        node={selectedNode}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNodeConfig}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}

export default function NexusCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}