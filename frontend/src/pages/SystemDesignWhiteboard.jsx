import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Save,
  Download,
  Upload,
  Plus,
  HelpCircle,
  Layers,
  Server,
  Database,
  Cpu,
  Zap,
  Radio,
  Globe,
  HardDrive,
  Shield,
  FileText,
  CheckCircle2,
  Move,
  MousePointer,
  Sparkles,
  Smartphone,
  Info,
  ChevronDown,
  X,
  Copy,
  Link2,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { systemDesignService } from '../services/systemDesignService.js';
import { SYSTEM_DESIGN_PROBLEMS, NODE_TYPES, getProblemById } from '../data/systemDesignProblems.js';

// Visual Icon helper for node types
function getNodeIcon(type) {
  switch (type) {
    case 'client':
      return Smartphone;
    case 'loadBalancer':
      return Layers;
    case 'apiGateway':
      return Shield;
    case 'backendService':
      return Cpu;
    case 'database':
      return Database;
    case 'cache':
      return Zap;
    case 'messageQueue':
      return Radio;
    case 'cdn':
      return Globe;
    case 'storage':
      return HardDrive;
    case 'annotation':
      return FileText;
    default:
      return Server;
  }
}

const COLOR_PALETTE = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Slate', value: '#64748b' }
];

export function SystemDesignWhiteboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const initialProblemId = searchParams.get('problem') || 'url-shortener';
  const [currentProblemId, setCurrentProblemId] = useState(initialProblemId);
  const currentProblem = useMemo(() => getProblemById(currentProblemId), [currentProblemId]);

  // Diagram state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  // Undo / Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas viewport navigation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Tool modes: 'select' | 'connect' | 'pan'
  const [activeTool, setActiveTool] = useState('select');
  const [connectSourceNodeId, setConnectSourceNodeId] = useState(null);

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // UI Drawer / Modals
  const [isSpecDrawerOpen, setIsSpecDrawerOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('components'); // 'components' | 'spec'
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isTemplateConfirmOpen, setIsTemplateConfirmOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Quick Edit node popover
  const [editingNode, setEditingNode] = useState(null);
  const [edgeLabelModal, setEdgeLabelModal] = useState({ isOpen: false, edgeId: null, label: '' });

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Record undo snapshot
  const pushHistory = useCallback((newNodes, newEdges) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { nodes: newNodes, edges: newEdges }];
    });
    setHistoryIndex((prev) => prev + 1);
    setSaveStatus('unsaved');
  }, [historyIndex]);

  // Load Diagram on problem switch
  useEffect(() => {
    let isMounted = true;
    async function loadDiagram() {
      try {
        const diagram = await systemDesignService.getDiagram(currentProblemId, userId);
        if (!isMounted) return;

        const loadedNodes = diagram.nodes || [];
        const loadedEdges = diagram.edges || [];
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setConnectSourceNodeId(null);

        // Reset history for new diagram
        setHistory([{ nodes: loadedNodes, edges: loadedEdges }]);
        setHistoryIndex(0);
        setSaveStatus('saved');
        setLastSavedTime(diagram.updatedAt ? new Date(diagram.updatedAt).toLocaleTimeString() : 'Just now');
      } catch (err) {
        console.error('Error loading diagram', err);
      }
    }

    loadDiagram();
    return () => {
      isMounted = false;
    };
  }, [currentProblemId, userId]);

  // Switch problem
  const handleProblemChange = (problemId) => {
    if (problemId === currentProblemId) return;
    setCurrentProblemId(problemId);
    setSearchParams({ problem: problemId });
  };

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const snapshot = history[nextIndex];
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setHistoryIndex(nextIndex);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSaveStatus('unsaved');
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const snapshot = history[nextIndex];
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setHistoryIndex(nextIndex);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSaveStatus('unsaved');
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing inside input / textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          deleteEdge(selectedEdgeId);
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setConnectSourceNodeId(null);
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedNodeId, selectedEdgeId]);

  // Add Component to canvas
  const handleAddComponent = (typeInfo) => {
    const id = `node-${Date.now()}`;
    // Position node near center of visible viewport
    const container = canvasRef.current?.getBoundingClientRect();
    const centerX = container ? (container.width / 2 - pan.x) / zoom - 85 : 300;
    const centerY = container ? (container.height / 2 - pan.y) / zoom - 40 : 200;

    const newNode = {
      id,
      type: typeInfo.type,
      label: typeInfo.label,
      subtitle: typeInfo.defaultSubtitle,
      color: typeInfo.color,
      x: Math.max(20, Math.round(centerX)),
      y: Math.max(20, Math.round(centerY)),
      width: typeInfo.type === 'annotation' ? 200 : 175,
      height: typeInfo.type === 'annotation' ? 90 : 75
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    pushHistory(nextNodes, edges);
  };

  // Node Dragging Logic
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();

    if (activeTool === 'connect') {
      handleNodeConnectClick(nodeId);
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX / zoom - targetNode.x,
      y: e.clientY / zoom - targetNode.y
    });
  };

  // Canvas Pan Mouse Down
  const handleCanvasMouseDown = (e) => {
    // Only drag on canvas background
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (activeTool === 'pan' || e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectSourceNodeId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Window Mouse Move (Smooth Dragging & Panning)
  const handleMouseMove = useCallback((e) => {
    if (draggingNodeId) {
      const newX = Math.round(e.clientX / zoom - dragOffset.x);
      const newY = Math.round(e.clientY / zoom - dragOffset.y);

      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [draggingNodeId, isPanning, zoom, dragOffset, panStart]);

  // Window Mouse Up (Commit Drag to History)
  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      pushHistory(nodes, edges);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [draggingNodeId, isPanning, nodes, edges, pushHistory]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle Wheel Zoom & Pan
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => Math.min(2.0, Math.max(0.4, Number((z * zoomFactor).toFixed(2)))));
    } else {
      // Pan with scroll
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY
      }));
    }
  };

  // Node Connection Logic
  const handleNodeConnectClick = (nodeId) => {
    if (!connectSourceNodeId) {
      setConnectSourceNodeId(nodeId);
    } else if (connectSourceNodeId === nodeId) {
      // Clicked same node, cancel
      setConnectSourceNodeId(null);
    } else {
      // Create new directed edge
      const edgeId = `edge-${Date.now()}`;
      const newEdge = {
        id: edgeId,
        from: connectSourceNodeId,
        to: nodeId,
        label: 'Connects to'
      };

      const nextEdges = [...edges, newEdge];
      setEdges(nextEdges);
      pushHistory(nodes, nextEdges);
      setConnectSourceNodeId(null);
      setActiveTool('select');
      setSelectedEdgeId(edgeId);
    }
  };

  // Delete Node
  const deleteNode = (nodeId) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeId(null);
    setEditingNode(null);
    pushHistory(nextNodes, nextEdges);
  };

  // Delete Edge
  const deleteEdge = (edgeId) => {
    const nextEdges = edges.filter((e) => e.id !== edgeId);
    setEdges(nextEdges);
    setSelectedEdgeId(null);
    pushHistory(nodes, nextEdges);
  };

  // Duplicate Selected Node
  const duplicateNode = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const duplicated = {
      ...node,
      id: `node-${Date.now()}`,
      label: `${node.label} (Copy)`,
      x: node.x + 30,
      y: node.y + 30
    };
    const nextNodes = [...nodes, duplicated];
    setNodes(nextNodes);
    setSelectedNodeId(duplicated.id);
    pushHistory(nextNodes, edges);
  };

  // Update Node Properties
  const updateNodeProps = (nodeId, updates) => {
    const nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));
    setNodes(nextNodes);
    pushHistory(nextNodes, edges);
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fit to screen
  const handleFitView = () => {
    if (nodes.length === 0) {
      handleResetZoom();
      return;
    }
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 180;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 90;

    const container = canvasRef.current?.getBoundingClientRect();
    if (!container) return;

    const width = maxX - minX;
    const height = maxY - minY;

    const scaleX = (container.width - 100) / width;
    const scaleY = (container.height - 100) / height;
    const newZoom = Math.min(1.2, Math.max(0.5, Math.min(scaleX, scaleY)));

    setZoom(Number(newZoom.toFixed(2)));
    setPan({
      x: (container.width - width * newZoom) / 2 - minX * newZoom,
      y: (container.height - height * newZoom) / 2 - minY * newZoom
    });
  };

  // Reset to Problem Template
  const handleResetToTemplate = () => {
    const templateNodes = currentProblem.starterNodes || [];
    const templateEdges = currentProblem.starterEdges || [];
    setNodes(templateNodes);
    setEdges(templateEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectSourceNodeId(null);
    pushHistory(templateNodes, templateEdges);
    setIsTemplateConfirmOpen(false);
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectSourceNodeId(null);
    pushHistory([], []);
    setIsClearConfirmOpen(false);
  };

  // Save Diagram
  const handleSaveDiagram = async () => {
    setSaveStatus('saving');
    try {
      const result = await systemDesignService.saveDiagram(
        currentProblemId,
        { nodes, edges },
        userId
      );
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      setIsSaveModalOpen(true);
    } catch (err) {
      setSaveStatus('unsaved');
      alert('Failed to save diagram: ' + (err.message || 'Unknown error'));
    }
  };

  // Export as PNG
  const handleExportPNG = () => {
    const svgElement = canvasRef.current?.querySelector('svg#whiteboard-svg');
    if (!svgElement) return;

    // Determine bounding box
    const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) - 60 : 0;
    const minY = nodes.length ? Math.min(...nodes.map((n) => n.y)) - 60 : 0;
    const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x + (n.width || 180))) + 60 : 1200;
    const maxY = nodes.length ? Math.max(...nodes.map((n) => n.y + (n.height || 90))) + 60 : 800;

    const width = Math.max(800, maxX - minX);
    const height = Math.max(600, maxY - minY);

    // Create a standalone SVG representation
    const svgClone = svgElement.cloneNode(true);
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width * 2; // High-res 2x
      offscreenCanvas.height = height * 2;
      const ctx = offscreenCanvas.getContext('2d');
      ctx.scale(2, 2);

      // Background color
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(blobURL);

      const a = document.createElement('a');
      a.download = `${currentProblemId}-system-architecture.png`;
      a.href = offscreenCanvas.toDataURL('image/png');
      a.click();
    };
    image.src = blobURL;
  };

  // Export as SVG
  const handleExportSVG = () => {
    const svgElement = canvasRef.current?.querySelector('svg#whiteboard-svg');
    if (!svgElement) return;

    const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) - 60 : 0;
    const minY = nodes.length ? Math.min(...nodes.map((n) => n.y)) - 60 : 0;
    const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x + (n.width || 180))) + 60 : 1200;
    const maxY = nodes.length ? Math.max(...nodes.map((n) => n.y + (n.height || 90))) + 60 : 800;
    const width = Math.max(800, maxX - minX);
    const height = Math.max(600, maxY - minY);

    const svgClone = svgElement.cloneNode(true);
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.download = `${currentProblemId}-system-architecture.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  // Export as JSON
  const handleExportJSON = () => {
    const diagram = {
      problemId: currentProblemId,
      problemTitle: currentProblem.title,
      exportedAt: new Date().toISOString(),
      nodes,
      edges
    };
    const blob = new Blob([JSON.stringify(diagram, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = `${currentProblemId}-architecture.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  // Import JSON Diagram
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          pushHistory(parsed.nodes, parsed.edges);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          alert('Diagram imported successfully!');
        } else {
          alert('Invalid diagram JSON format.');
        }
      } catch (err) {
        alert('Could not parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Edge Path Calculation Helper (Bezier Curve between Node Centers or Edge Points)
  const calculateEdgePath = (edge) => {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);

    if (!fromNode || !toNode) return { path: '', labelX: 0, labelY: 0 };

    const fromWidth = fromNode.width || 175;
    const fromHeight = fromNode.height || 75;
    const toWidth = toNode.width || 175;
    const toHeight = toNode.height || 75;

    const fromCenterX = fromNode.x + fromWidth / 2;
    const fromCenterY = fromNode.y + fromHeight / 2;
    const toCenterX = toNode.x + toWidth / 2;
    const toCenterY = toNode.y + toHeight / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    // Anchor points based on relative direction
    let x1, y1, x2, y2;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        x1 = fromNode.x + fromWidth;
        y1 = fromCenterY;
        x2 = toNode.x;
        y2 = toCenterY;
      } else {
        x1 = fromNode.x;
        y1 = fromCenterY;
        x2 = toNode.x + toWidth;
        y2 = toCenterY;
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        x1 = fromCenterX;
        y1 = fromNode.y + fromHeight;
        x2 = toCenterX;
        y2 = toNode.y;
      } else {
        x1 = fromCenterX;
        y1 = fromNode.y;
        x2 = toCenterX;
        y2 = toNode.y + toHeight;
      }
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const controlDist = Math.max(30, Math.min(80, Math.hypot(dx, dy) * 0.3));

    let path = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      path = `M ${x1} ${y1} C ${x1 + (dx > 0 ? controlDist : -controlDist)} ${y1}, ${x2 - (dx > 0 ? controlDist : -controlDist)} ${y2}, ${x2} ${y2}`;
    } else {
      path = `M ${x1} ${y1} C ${x1} ${y1 + (dy > 0 ? controlDist : -controlDist)}, ${x2} ${y2 - (dy > 0 ? controlDist : -controlDist)}, ${x2} ${y2}`;
    }

    return { path, labelX: midX, labelY: midY };
  };

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId), [edges, selectedEdgeId]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6 select-none bg-slate-900 text-slate-100 overflow-hidden relative">
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJSON}
        accept=".json"
        className="hidden"
      />

      {/* TOP HEADER & ACTION BAR */}
      <header className="h-14 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/system-design')}
            className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs px-2 sm:px-3"
            title="Back to System Design Blueprints"
          >
            <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Problem Selector Dropdown */}
          <div className="relative">
            <select
              value={currentProblemId}
              onChange={(e) => handleProblemChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-violet-500 focus:outline-none cursor-pointer appearance-none max-w-[200px] sm:max-w-xs truncate"
            >
              {SYSTEM_DESIGN_PROBLEMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Cloud / Local Save Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400">
            {saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Check className="h-3 w-3" /> Saved ({lastSavedTime || 'cloud'})
              </span>
            ) : saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <RotateCw className="h-3 w-3 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* History Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 hover:bg-slate-800 font-mono text-[11px] cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleFitView}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Tool Modes */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => {
                setActiveTool('select');
                setConnectSourceNodeId(null);
              }}
              className={`p-1.5 rounded cursor-pointer ${
                activeTool === 'select' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Select & Move Tool (V)"
            >
              <MousePointer className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setActiveTool('connect');
                setSelectedNodeId(null);
              }}
              className={`p-1.5 rounded cursor-pointer ${
                activeTool === 'connect' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Connect Nodes Tool (C)"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>

          {/* Save & Clear */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveDiagram}
            className="text-xs px-2.5 sm:px-3 bg-violet-600 hover:bg-violet-500"
            title="Save Diagram"
          >
            <Save className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          {/* Export Dropdown Menu */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs px-2 sm:px-2.5"
              title="Export Options"
            >
              <Download className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block hover:block w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={handleExportPNG}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-blue-400" /> Export as PNG Image
              </button>
              <button
                onClick={handleExportSVG}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" /> Export as SVG Vector
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-amber-400" /> Export as JSON Data
              </button>
              <div className="border-t border-slate-800 my-1" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-purple-400" /> Import JSON Diagram
              </button>
            </div>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Shortcuts & Instructions"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Toggle Specification Drawer */}
          <button
            onClick={() => setIsSpecDrawerOpen(!isSpecDrawerOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSpecDrawerOpen ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title={isSpecDrawerOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isSpecDrawerOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* WORKSPACE BODY (SIDEBAR DRAWER + INTERACTIVE CANVAS) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLLAPSIBLE DRAWER: COMPONENTS & PROBLEM SPECS */}
        {isSpecDrawerOpen && (
          <aside className="w-80 bg-slate-950/90 border-r border-slate-800 flex flex-col z-10 shrink-0 overflow-hidden">
            {/* Tab switch: Components Palette vs Problem Requirements */}
            <div className="flex border-b border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setActiveSidebarTab('components')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeSidebarTab === 'components'
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Component Palette
              </button>
              <button
                onClick={() => setActiveSidebarTab('spec')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeSidebarTab === 'spec'
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Problem Specs
              </button>
            </div>

            {/* TAB CONTENT 1: COMPONENT PALETTE */}
            {activeSidebarTab === 'components' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Architecture Nodes
                  </span>
                  <span className="text-[10px] text-slate-500">Click to add</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {NODE_TYPES.map((t) => {
                    const IconComp = getNodeIcon(t.type);
                    return (
                      <button
                        key={t.type}
                        onClick={() => handleAddComponent(t)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg shrink-0 shadow-sm"
                            style={{ backgroundColor: `${t.color}20`, color: t.color }}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                              {t.label}
                            </p>
                            <p className="text-[10px] text-slate-400">{t.defaultSubtitle}</p>
                          </div>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-slate-500 group-hover:text-violet-400" />
                      </button>
                    );
                  })}
                </div>

                {/* Canvas Management Actions */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Canvas Management
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTemplateConfirmOpen(true)}
                    className="w-full justify-start text-xs border-slate-800 hover:bg-slate-800 text-slate-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2 text-violet-400" />
                    Reset to Problem Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="w-full justify-start text-xs border-slate-800 hover:bg-rose-950/40 text-rose-400 hover:border-rose-800"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Clear Entire Canvas
                  </Button>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: PROBLEM SPECS & ESTIMATIONS */}
            {activeSidebarTab === 'spec' && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
                <div>
                  <Badge variant="primary" size="sm" className="mb-1.5">
                    {currentProblem.readWriteRatio}
                  </Badge>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {currentProblem.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">{currentProblem.scale}</p>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {currentProblem.description}
                  </p>
                </div>

                {/* Functional & Non-Functional Requirements */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    System Requirements
                  </h4>
                  <ul className="space-y-1.5 text-slate-300">
                    {currentProblem.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Back of the envelope calculations */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Capacity Estimations
                  </h4>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] space-y-1 text-slate-300">
                    {currentProblem.calculations.map((calc, i) => (
                      <p key={i}>• {calc}</p>
                    ))}
                  </div>
                </div>

                {/* Recommended Topologies */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Key Building Blocks
                  </h4>
                  <div className="space-y-1.5">
                    {currentProblem.recommendedTopology.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-200">{t.name}</span>
                        <span className="text-[10px] text-slate-400">{t.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* MAIN INTERACTIVE CANVAS VIEWPORT */}
        <main
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          className="flex-1 h-full relative overflow-hidden bg-[#0a0f1d] cursor-default"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Active Tool Reminder & Node Connector Indicator */}
          {activeTool === 'connect' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-violet-600 text-white px-4 py-1.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 animate-pulse">
              <Link2 className="h-4 w-4" />
              {connectSourceNodeId
                ? 'Click target node to complete directional arrow'
                : 'Click starting node to begin connection'}
              <button
                onClick={() => {
                  setActiveTool('select');
                  setConnectSourceNodeId(null);
                }}
                className="ml-2 hover:bg-violet-700 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* SVG RENDERING LAYER FOR CONNECTIONS */}
          <svg
            id="whiteboard-svg"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
              </marker>
              <marker
                id="arrowhead-selected"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Render all directional connection edges */}
            {edges.map((edge) => {
              const { path, labelX, labelY } = calculateEdgePath(edge);
              if (!path) return null;
              const isSelected = selectedEdgeId === edge.id;

              return (
                <g key={edge.id} className="pointer-events-auto cursor-pointer">
                  {/* Invisible wide stroke for easier clicking */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  />

                  {/* Visible arrow line */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? '#38bdf8' : '#8b5cf6'}
                    strokeWidth={isSelected ? '3' : '2'}
                    strokeDasharray={isSelected ? '4 2' : 'none'}
                    markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                    className="transition-colors duration-150"
                  />

                  {/* Connection Label badge */}
                  {edge.label && (
                    <g
                      transform={`translate(${labelX}, ${labelY})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setEdgeLabelModal({ isOpen: true, edgeId: edge.id, label: edge.label });
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x="-45"
                        y="-11"
                        width="90"
                        height="20"
                        rx="4"
                        fill="#1e1b4b"
                        stroke={isSelected ? '#38bdf8' : '#6366f1'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="9.5"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {edge.label.length > 14 ? edge.label.slice(0, 13) + '…' : edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML NODES RENDERING LAYER */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {nodes.map((node) => {
              const IconComp = getNodeIcon(node.type);
              const isSelected = selectedNodeId === node.id;
              const isConnectSource = connectSourceNodeId === node.id;
              const isAnnotation = node.type === 'annotation';

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNode({ ...node });
                  }}
                  className={`absolute pointer-events-auto rounded-xl select-none cursor-move transition-shadow ${
                    isAnnotation
                      ? 'bg-amber-950/40 border border-amber-600/60 text-amber-200 p-3 shadow-md backdrop-blur-sm'
                      : 'bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-sm p-3'
                  } ${
                    isSelected
                      ? 'ring-2 ring-violet-500 shadow-violet-500/30'
                      : isConnectSource
                      ? 'ring-2 ring-emerald-400 animate-pulse'
                      : 'hover:border-slate-500'
                  }`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width || 175}px`,
                    minHeight: `${node.height || 75}px`
                  }}
                >
                  {isAnnotation ? (
                    <div>
                      <div className="flex items-center justify-between pb-1 border-b border-amber-800/40">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          Annotation
                        </span>
                        <button
                          onClick={() => deleteNode(node.id)}
                          className="text-amber-500 hover:text-amber-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs font-medium text-amber-100 mt-1 whitespace-pre-wrap leading-tight">
                        {node.label}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Node Header: Icon + Color + Options */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded-lg shrink-0 shadow-sm"
                            style={{
                              backgroundColor: `${node.color || '#8b5cf6'}25`,
                              color: node.color || '#8b5cf6'
                            }}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${node.color || '#8b5cf6'}15`,
                              color: node.color || '#8b5cf6'
                            }}
                          >
                            {node.type}
                          </span>
                        </div>

                        {/* Node Port Connector Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNodeConnectClick(node.id);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isConnectSource
                              ? 'bg-emerald-500 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title="Connect to another node"
                        >
                          <Link2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Node Body: Title & Subtitle */}
                      <div className="mt-2">
                        <h4 className="text-xs font-bold text-slate-100 leading-tight truncate">
                          {node.label}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {node.subtitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 4 Interactive Connection Anchors (Top, Right, Bottom, Left) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeConnectClick(node.id);
                    }}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-violet-500 hover:bg-violet-300 hover:scale-125 rounded-full border-2 border-slate-900 cursor-crosshair transition-transform"
                    title="Connect from Top"
                  />
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeConnectClick(node.id);
                    }}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-violet-500 hover:bg-violet-300 hover:scale-125 rounded-full border-2 border-slate-900 cursor-crosshair transition-transform"
                    title="Connect from Right"
                  />
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeConnectClick(node.id);
                    }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-violet-500 hover:bg-violet-300 hover:scale-125 rounded-full border-2 border-slate-900 cursor-crosshair transition-transform"
                    title="Connect from Bottom"
                  />
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeConnectClick(node.id);
                    }}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-violet-500 hover:bg-violet-300 hover:scale-125 rounded-full border-2 border-slate-900 cursor-crosshair transition-transform"
                    title="Connect from Left"
                  />
                </div>
              );
            })}
          </div>

          {/* FLOATING ACTION TOOLBAR FOR SELECTED NODE */}
          {selectedNode && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl p-2 flex items-center gap-2 backdrop-blur-md">
              <span className="text-xs font-semibold px-2 text-slate-200 border-r border-slate-800">
                {selectedNode.label}
              </span>

              {/* Edit Details Button */}
              <button
                onClick={() => setEditingNode({ ...selectedNode })}
                className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Edit
              </button>

              {/* Color Swatch Picker */}
              <div className="flex items-center gap-1 px-1 border-l border-r border-slate-800">
                {COLOR_PALETTE.slice(0, 5).map((c) => (
                  <button
                    key={c.name}
                    onClick={() => updateNodeProps(selectedNode.id, { color: c.value })}
                    className="w-4 h-4 rounded-full border border-slate-900 transition-transform hover:scale-125 cursor-pointer"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Connect Button */}
              <button
                onClick={() => {
                  setActiveTool('connect');
                  setConnectSourceNodeId(selectedNode.id);
                }}
                className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Connect to node"
              >
                <Link2 className="h-4 w-4 text-violet-400" />
              </button>

              {/* Duplicate Button */}
              <button
                onClick={() => duplicateNode(selectedNode.id)}
                className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Duplicate node"
              >
                <Copy className="h-4 w-4" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Delete node (Del)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* FLOATING ACTION TOOLBAR FOR SELECTED EDGE */}
          {selectedEdge && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl p-2 flex items-center gap-2 backdrop-blur-md">
              <span className="text-xs font-semibold px-2 text-cyan-300 border-r border-slate-800">
                Connection: {selectedEdge.label || 'Arrow'}
              </span>

              <button
                onClick={() =>
                  setEdgeLabelModal({
                    isOpen: true,
                    edgeId: selectedEdge.id,
                    label: selectedEdge.label || ''
                  })
                }
                className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Edit Label
              </button>

              <button
                onClick={() => deleteEdge(selectedEdge.id)}
                className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Delete connection (Del)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* BOTTOM-RIGHT CANVAS HUD STATS */}
          <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-400 backdrop-blur z-10 font-mono">
            <span>{nodes.length} nodes</span>
            <span>•</span>
            <span>{edges.length} connections</span>
            <span>•</span>
            <span>{Math.round(zoom * 100)}% zoom</span>
          </div>
        </main>
      </div>

      {/* MODAL 1: EDIT NODE PROPERTIES */}
      {editingNode && (
        <Modal
          isOpen={Boolean(editingNode)}
          onClose={() => setEditingNode(null)}
          title="Edit Architecture Node"
          description="Customize component title, role description, and color accent."
          maxWidth="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Component Name / Label
              </label>
              <input
                type="text"
                value={editingNode.label || ''}
                onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Technology / Subtitle
              </label>
              <input
                type="text"
                value={editingNode.subtitle || ''}
                onChange={(e) => setEditingNode({ ...editingNode, subtitle: e.target.value })}
                placeholder="e.g., PostgreSQL Replicas, Redis Cluster, Kafka Bus"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Color Accent
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setEditingNode({ ...editingNode, color: c.value })}
                    className={`h-7 w-7 rounded-xl border transition-all ${
                      editingNode.color === c.value ? 'ring-2 ring-white scale-110' : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingNode(null)}
                className="text-xs border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  updateNodeProps(editingNode.id, {
                    label: editingNode.label,
                    subtitle: editingNode.subtitle,
                    color: editingNode.color
                  });
                  setEditingNode(null);
                }}
                className="text-xs bg-violet-600 hover:bg-violet-500"
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: EDIT EDGE CONNECTION LABEL */}
      {edgeLabelModal.isOpen && (
        <Modal
          isOpen={edgeLabelModal.isOpen}
          onClose={() => setEdgeLabelModal({ isOpen: false, edgeId: null, label: '' })}
          title="Edit Connection Protocol / Label"
          description="Describe the interaction protocol, data flow, or API contract."
          maxWidth="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Connection Label
              </label>
              <input
                type="text"
                value={edgeLabelModal.label}
                onChange={(e) =>
                  setEdgeLabelModal({ ...edgeLabelModal, label: e.target.value })
                }
                placeholder="e.g., HTTPS REST, gRPC, WebSocket, SQL Query, Event Publish"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEdgeLabelModal({ isOpen: false, edgeId: null, label: '' })}
                className="text-xs border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const nextEdges = edges.map((e) =>
                    e.id === edgeLabelModal.edgeId ? { ...e, label: edgeLabelModal.label } : e
                  );
                  setEdges(nextEdges);
                  pushHistory(nodes, nextEdges);
                  setEdgeLabelModal({ isOpen: false, edgeId: null, label: '' });
                }}
                className="text-xs bg-violet-600 hover:bg-violet-500"
              >
                Save Protocol Label
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CONFIRM CLEAR CANVAS */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClearCanvas}
        title="Clear Entire Whiteboard?"
        message="This will remove all nodes and connections from the current canvas. You can undo this action with Ctrl+Z."
        confirmText="Clear Canvas"
        danger={true}
      />

      {/* MODAL 4: CONFIRM RESET TO TEMPLATE */}
      <ConfirmDialog
        isOpen={isTemplateConfirmOpen}
        onClose={() => setIsTemplateConfirmOpen(false)}
        onConfirm={handleResetToTemplate}
        title="Reset to Starter Architecture?"
        message={`This will replace your current diagram with the official recommended blueprint for ${currentProblem.title}.`}
        confirmText="Reset to Template"
        danger={false}
      />

      {/* MODAL 5: SAVE SUCCESS CONFIRMATION */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Diagram Saved Successfully"
        description="Your system architecture diagram is securely stored in your workspace session and local storage."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-xs">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              All {nodes.length} architecture nodes and {edges.length} directional connections were persisted.
            </span>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSaveModalOpen(false)}
              className="text-xs bg-violet-600 hover:bg-violet-500"
            >
              Continue Working
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 6: HELP & SHORTCUTS GUIDE */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Interactive Whiteboard Guide & Shortcuts"
        description="Master distributed system design diagrams with full keyboard & mouse controls."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 pt-2 text-xs text-slate-300">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-violet-400">Add Components</p>
              <p className="text-[11px] text-slate-400">
                Click any node in the left Component Palette to place it on the canvas.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-violet-400">Connect with Arrows</p>
              <p className="text-[11px] text-slate-400">
                Click the 4 connector dots around any node or use the Connect tool in the header.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-violet-400">Pan & Zoom</p>
              <p className="text-[11px] text-slate-400">
                Click and drag empty canvas to pan. Use mouse wheel or top zoom buttons.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-violet-400">Export Options</p>
              <p className="text-[11px] text-slate-400">
                Export to PNG image, SVG vector file, or portable JSON schema.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <p className="font-bold text-slate-200">Keyboard Shortcuts</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <p><span className="text-violet-400">Ctrl + Z</span> : Undo</p>
              <p><span className="text-violet-400">Ctrl + Y</span> : Redo</p>
              <p><span className="text-violet-400">Delete / Backspace</span> : Delete selected</p>
              <p><span className="text-violet-400">Escape</span> : Deselect all</p>
              <p><span className="text-violet-400">Ctrl + Scroll</span> : Zoom in / out</p>
              <p><span className="text-violet-400">Double Click</span> : Edit node</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsHelpOpen(false)}
              className="text-xs bg-violet-600 hover:bg-violet-500"
            >
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SystemDesignWhiteboard;
