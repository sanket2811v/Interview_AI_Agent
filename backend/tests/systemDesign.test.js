import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SystemDesignService, SYSTEM_DESIGN_PROBLEMS } from '../src/services/systemDesign.service.js';
import {
  getProblems,
  getProblemById,
  getDiagram,
  saveDiagram,
  deleteDiagram
} from '../src/controllers/systemDesign.controller.js';
import systemDesignRouter from '../src/routes/systemDesign.routes.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe('System Design Interactive Whiteboard Engine Test Suite', () => {
  test('1. SystemDesignService exports all 3 required system design problems', () => {
    const problems = SystemDesignService.getProblems();
    assert.equal(problems.length, 3);

    const problemIds = problems.map((p) => p.id);
    assert.ok(problemIds.includes('url-shortener'), 'Missing url-shortener problem');
    assert.ok(problemIds.includes('notification-system'), 'Missing notification-system problem');
    assert.ok(problemIds.includes('chat-system'), 'Missing chat-system problem');

    // Verify requirements & calculations exist
    problems.forEach((p) => {
      assert.ok(p.title, `Problem ${p.id} missing title`);
      assert.ok(p.scale, `Problem ${p.id} missing scale`);
      assert.ok(Array.isArray(p.requirements) && p.requirements.length > 0, `Problem ${p.id} missing requirements`);
      assert.ok(Array.isArray(p.calculations) && p.calculations.length > 0, `Problem ${p.id} missing calculations`);
      assert.ok(Array.isArray(p.recommendedTopology) && p.recommendedTopology.length > 0, `Problem ${p.id} missing topology`);
    });
  });

  test('2. getProblemById returns starter architecture topology', () => {
    const tinyUrl = SystemDesignService.getProblemById('url-shortener');
    assert.ok(tinyUrl);
    assert.ok(Array.isArray(tinyUrl.starterNodes));
    assert.ok(tinyUrl.starterNodes.length >= 7, 'Starter topology should contain key architecture nodes');
    assert.ok(Array.isArray(tinyUrl.starterEdges));
    assert.ok(tinyUrl.starterEdges.length >= 5, 'Starter topology should contain connection edges');

    const nodeTypes = tinyUrl.starterNodes.map((n) => n.type);
    assert.ok(nodeTypes.includes('client'));
    assert.ok(nodeTypes.includes('apiGateway'));
    assert.ok(nodeTypes.includes('loadBalancer'));
    assert.ok(nodeTypes.includes('cache'));
    assert.ok(nodeTypes.includes('database'));
  });

  test('3. Diagram persistence save and retrieve', () => {
    const mockDiagram = {
      nodes: [
        { id: 'node-test-1', type: 'client', label: 'Test Web App', x: 100, y: 100 },
        { id: 'node-test-2', type: 'database', label: 'Test DB', x: 400, y: 100 }
      ],
      edges: [
        { id: 'edge-test-1', from: 'node-test-1', to: 'node-test-2', label: 'SQL Query' }
      ]
    };

    const saved = SystemDesignService.saveDiagram('user-test-123', 'url-shortener', mockDiagram);
    assert.ok(saved);
    assert.equal(saved.nodes.length, 2);
    assert.equal(saved.edges.length, 1);

    const retrieved = SystemDesignService.getDiagram('user-test-123', 'url-shortener');
    assert.ok(retrieved);
    assert.equal(retrieved.nodes.length, 2);
    assert.equal(retrieved.nodes[0].label, 'Test Web App');

    // Clean up
    SystemDesignService.deleteDiagram('user-test-123', 'url-shortener');
  });

  test('4. getProblems controller returns 200 with list', async () => {
    const req = {};
    const res = createMockRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await getProblems(req, res, next);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3);
  });

  test('5. getProblemById controller returns problem details', async () => {
    const req = { params: { problemId: 'chat-system' } };
    const res = createMockRes();
    const next = () => {};

    await getProblemById(req, res, next);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'chat-system');
    assert.ok(res.body.data.starterNodes.length > 0);
  });

  test('6. getDiagram controller returns default template if unsaved', async () => {
    const req = { params: { problemId: 'notification-system' }, user: { id: 'temp-user' } };
    const res = createMockRes();
    const next = () => {};

    await getDiagram(req, res, next);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.problemId, 'notification-system');
    assert.ok(Array.isArray(res.body.data.nodes));
    assert.ok(res.body.data.nodes.length > 0);
  });

  test('7. saveDiagram controller saves diagram and returns 200', async () => {
    const req = {
      params: { problemId: 'chat-system' },
      user: { id: 'save-test-user' },
      body: {
        nodes: [{ id: 'n1', type: 'cache', label: 'Redis Cluster', x: 200, y: 200 }],
        edges: []
      }
    };
    const res = createMockRes();
    const next = () => {};

    await saveDiagram(req, res, next);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.nodes[0].label, 'Redis Cluster');

    // Clean up
    SystemDesignService.deleteDiagram('save-test-user', 'chat-system');
  });

  test('8. systemDesignRouter registers all 5 endpoints', () => {
    assert.ok(systemDesignRouter);
    const routes = systemDesignRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    assert.ok(routes.some((r) => r.path === '/problems' && r.methods.includes('get')));
    assert.ok(routes.some((r) => r.path === '/problems/:problemId' && r.methods.includes('get')));
    assert.ok(routes.some((r) => r.path === '/diagrams/:problemId' && r.methods.includes('get')));
    assert.ok(routes.some((r) => r.path === '/diagrams/:problemId' && r.methods.includes('post')));
    assert.ok(routes.some((r) => r.path === '/diagrams/:problemId' && r.methods.includes('delete')));
  });
});
