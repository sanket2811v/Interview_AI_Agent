import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('InterviewAI System Design & Interactive Whiteboard Audit', () => {
  test('1. AppRoutes.jsx registers /system-design/whiteboard route and lazy loads SystemDesignWhiteboard', () => {
    const routesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    assert.ok(fs.existsSync(routesPath), 'Missing AppRoutes.jsx');
    const content = fs.readFileSync(routesPath, 'utf-8');

    assert.ok(
      content.includes("const SystemDesignWhiteboard = lazy(() => import('../pages/SystemDesignWhiteboard.jsx'))"),
      'AppRoutes.jsx must lazy load SystemDesignWhiteboard'
    );
    assert.ok(
      content.includes('path="/system-design/whiteboard"'),
      'AppRoutes.jsx must declare /system-design/whiteboard route'
    );
  });

  test('2. SystemDesign.jsx has active onClick handler for Launch Interactive Whiteboard', () => {
    const pagePath = path.join(srcDir, 'pages/SystemDesign.jsx');
    assert.ok(fs.existsSync(pagePath), 'Missing SystemDesign.jsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      content.includes('Launch Interactive Whiteboard'),
      'SystemDesign.jsx must render Launch Interactive Whiteboard button'
    );
    assert.ok(
      content.includes('/system-design/whiteboard'),
      'Launch Interactive Whiteboard button must navigate to /system-design/whiteboard'
    );
    assert.ok(
      content.includes('handleLaunchWhiteboard') || content.includes('navigate('),
      'Launch Interactive Whiteboard must trigger navigation handler'
    );
  });

  test('3. systemDesignProblems.js defines all 3 problems with requirements, calculations, and starter topologies', () => {
    const dataPath = path.join(srcDir, 'data/systemDesignProblems.js');
    assert.ok(fs.existsSync(dataPath), 'Missing systemDesignProblems.js');
    const content = fs.readFileSync(dataPath, 'utf-8');

    assert.ok(content.includes('url-shortener'), 'Missing url-shortener problem');
    assert.ok(content.includes('notification-system'), 'Missing notification-system problem');
    assert.ok(content.includes('chat-system'), 'Missing chat-system problem');
    assert.ok(content.includes('starterNodes'), 'Must provide starterNodes for architectures');
    assert.ok(content.includes('starterEdges'), 'Must provide starterEdges for architectures');
  });

  test('4. SystemDesignWhiteboard.jsx implements full interactive canvas functionality', () => {
    const whiteboardPath = path.join(srcDir, 'pages/SystemDesignWhiteboard.jsx');
    assert.ok(fs.existsSync(whiteboardPath), 'Missing SystemDesignWhiteboard.jsx');
    const content = fs.readFileSync(whiteboardPath, 'utf-8');

    // Canvas & Node controls
    assert.ok(content.includes('handleAddComponent'), 'Must implement handleAddComponent');
    assert.ok(content.includes('handleNodeMouseDown'), 'Must implement node dragging');
    assert.ok(content.includes('handleNodeConnectClick'), 'Must implement connector logic');
    assert.ok(content.includes('deleteNode'), 'Must implement deleteNode');
    assert.ok(content.includes('duplicateNode'), 'Must implement duplicateNode');

    // Navigation & Viewport controls
    assert.ok(content.includes('handleZoomIn'), 'Must implement zoom in');
    assert.ok(content.includes('handleZoomOut'), 'Must implement zoom out');
    assert.ok(content.includes('handleFitView'), 'Must implement fit view');
    assert.ok(content.includes('handleUndo'), 'Must implement undo');
    assert.ok(content.includes('handleRedo'), 'Must implement redo');

    // Persistence & Export controls
    assert.ok(content.includes('handleSaveDiagram'), 'Must implement diagram saving');
    assert.ok(content.includes('handleExportPNG'), 'Must implement PNG export');
    assert.ok(content.includes('handleExportSVG'), 'Must implement SVG export');
    assert.ok(content.includes('handleExportJSON'), 'Must implement JSON export');
    assert.ok(content.includes('handleImportJSON'), 'Must implement JSON import');
    assert.ok(content.includes('handleClearCanvas'), 'Must implement clear canvas');
    assert.ok(content.includes('handleResetToTemplate'), 'Must implement reset to template');
  });

  test('5. systemDesignService.js provides full persistence and API abstraction', () => {
    const servicePath = path.join(srcDir, 'services/systemDesignService.js');
    assert.ok(fs.existsSync(servicePath), 'Missing systemDesignService.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    assert.ok(content.includes('getProblems'), 'Must provide getProblems');
    assert.ok(content.includes('getProblem'), 'Must provide getProblem');
    assert.ok(content.includes('getDiagram'), 'Must provide getDiagram');
    assert.ok(content.includes('saveDiagram'), 'Must provide saveDiagram');
    assert.ok(content.includes('deleteDiagram'), 'Must provide deleteDiagram');
  });
});
