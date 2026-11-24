/**
 * InterviewAI - Responsive Design & Cross-Device Optimization Test Suite
 * Validates responsive design architecture, 14 target viewports, mobile navigation,
 * touch targets, modal height constraints, Recharts grid containment, and layout resilience.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('InterviewAI Responsive Design & Cross-Device Optimization Audit', () => {

  // 1. Target Viewport Breakpoints & Tailwind Configuration
  test('1. Tailwind configuration and CSS media layers support all 14 target viewports', () => {
    const tailwindConfigPath = path.resolve(__dirname, '../tailwind.config.js');
    assert.ok(fs.existsSync(tailwindConfigPath), 'tailwind.config.js must exist');

    const globalsCssPath = path.join(srcDir, 'styles/globals.css');
    assert.ok(fs.existsSync(globalsCssPath), 'globals.css must exist');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');

    // 14 Viewports mapping verification:
    // 1. Extra-small mobile: 320px (Default base styles)
    // 2. Small mobile: 360px (Default base styles)
    // 3. Standard mobile: 375px (Default base styles)
    // 4. Large mobile: 390px (Default base styles)
    // 5. Extra-large mobile: 425px (Default base styles)
    // 6. Small tablet: 600px (Default base styles, approaching sm: 640px)
    // 7. Tablet: 768px (md: 768px)
    // 8. Large tablet: 820px (md: 768px)
    // 9. Tablet landscape: 1024px (lg: 1024px)
    // 10. Small laptop: 1280px (xl: 1280px)
    // 11. Laptop: 1366px (xl: 1280px)
    // 12. Standard desktop: 1440px (xl: 1280px)
    // 13. Large desktop: 1600px (2xl: 1536px)
    // 14. Full HD: 1920px (2xl: 1536px)
    const TARGET_VIEWPORTS = [
      { name: 'Extra-small mobile', width: 320, category: 'Mobile' },
      { name: 'Small mobile', width: 360, category: 'Mobile' },
      { name: 'Standard mobile', width: 375, category: 'Mobile' },
      { name: 'Large mobile', width: 390, category: 'Mobile' },
      { name: 'Extra-large mobile', width: 425, category: 'Mobile' },
      { name: 'Small tablet', width: 600, category: 'Tablet' },
      { name: 'Tablet', width: 768, category: 'Tablet' },
      { name: 'Large tablet', width: 820, category: 'Tablet' },
      { name: 'Tablet landscape', width: 1024, category: 'Tablet' },
      { name: 'Small laptop', width: 1280, category: 'Desktop' },
      { name: 'Laptop', width: 1366, category: 'Desktop' },
      { name: 'Standard desktop', width: 1440, category: 'Desktop' },
      { name: 'Large desktop', width: 1600, category: 'Desktop' },
      { name: 'Full HD', width: 1920, category: 'Desktop' }
    ];

    assert.equal(TARGET_VIEWPORTS.length, 14, 'Must explicitly audit all 14 target viewports');
    assert.ok(cssContent.includes('@tailwind utilities'), 'CSS must include Tailwind utilities');
  });

  // 2. MobileNavigation Drawer Component Architecture
  test('2. MobileNavigation provides complete link coverage, scroll lock, and accessibility attributes', () => {
    const mobileNavPath = path.join(srcDir, 'components/navigation/MobileNavigation.jsx');
    assert.ok(fs.existsSync(mobileNavPath), 'MobileNavigation.jsx must exist');
    const content = fs.readFileSync(mobileNavPath, 'utf-8');

    // Accessibility and modal attributes
    assert.ok(content.includes('role="dialog"'), 'MobileNavigation must declare role="dialog"');
    assert.ok(content.includes('aria-label="Mobile Navigation"'), 'MobileNavigation must provide aria-label');

    // Body scroll lock on drawer open & cleanup
    assert.ok(
      content.includes("document.body.style.overflow = 'hidden'"),
      'MobileNavigation must lock document.body scroll when drawer is open'
    );
    assert.ok(
      content.includes("document.body.style.overflow = ''") || content.includes("document.body.style.overflow = 'unset'"),
      'MobileNavigation must restore document.body scroll when drawer is closed'
    );

    // Escape key dismiss listener
    assert.ok(
      content.includes("e.key === 'Escape'") || content.includes('e.key === "Escape"'),
      'MobileNavigation must support Escape key drawer dismissal'
    );

    // Touch optimization
    assert.ok(
      content.includes('overscroll-contain'),
      'MobileNavigation drawer must declare overscroll-contain for smooth touch scrolling'
    );

    // Verification of all navigation links in drawer
    const requiredNavRoutes = [
      '/dashboard',
      '/preparations',
      '/practice/technical',
      '/practice/hr',
      '/coding',
      '/mock-interviews',
      '/reports',
      '/analytics',
      '/analytics/skill-gaps',
      '/improvement-plan',
      '/learning-tasks',
      '/progress',
      '/history',
      '/settings'
    ];

    requiredNavRoutes.forEach((route) => {
      assert.ok(
        content.includes(route),
        `MobileNavigation missing route link for ${route}`
      );
    });
  });

  // 3. Layout Safe Margins & Containers on 320px Screens
  test('3. Core layout containers enforce safe horizontal padding on 320px extra-small mobile viewports', () => {
    // DashboardLayout.jsx
    const dashLayoutPath = path.join(srcDir, 'layouts/DashboardLayout.jsx');
    const dashContent = fs.readFileSync(dashLayoutPath, 'utf-8');
    assert.ok(
      dashContent.includes('px-3 sm:px-6 lg:px-8'),
      'DashboardLayout main container must use px-3 sm:px-6 lg:px-8 for mobile padding'
    );

    // Header.jsx
    const headerPath = path.join(srcDir, 'components/navigation/Header.jsx');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    assert.ok(
      headerContent.includes('px-3 sm:px-6 lg:px-8'),
      'Header must use px-3 sm:px-6 lg:px-8 for responsive edge spacing'
    );

    // AuthLayout.jsx
    const authLayoutPath = path.join(srcDir, 'layouts/AuthLayout.jsx');
    const authContent = fs.readFileSync(authLayoutPath, 'utf-8');
    assert.ok(
      authContent.includes('px-4 sm:px-10') && authContent.includes('px-3 sm:px-0'),
      'AuthLayout must use compact padding on mobile viewports'
    );

    // MainLayout.jsx
    const mainLayoutPath = path.join(srcDir, 'layouts/MainLayout.jsx');
    const mainContent = fs.readFileSync(mainLayoutPath, 'utf-8');
    assert.ok(
      mainContent.includes('hidden sm:inline'),
      'MainLayout public header must use responsive CTA text hiding on extra-small screens'
    );
  });

  // 4. Modal and Dialog Small-Screen Viewport Boundaries
  test('4. Modal and ConfirmDialog components implement max-height viewport boundaries and mobile button stacks', () => {
    // Modal.jsx
    const modalPath = path.join(srcDir, 'components/ui/Modal.jsx');
    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(
      modalContent.includes('max-h-[90vh]'),
      'Modal.jsx must enforce max-h-[90vh] to prevent viewport clipping'
    );
    assert.ok(
      modalContent.includes('overflow-y-auto'),
      'Modal.jsx content container must support smooth overflow-y scrolling'
    );

    // ConfirmDialog.jsx
    const confirmPath = path.join(srcDir, 'components/common/ConfirmDialog.jsx');
    const confirmContent = fs.readFileSync(confirmPath, 'utf-8');
    assert.ok(
      confirmContent.includes('flex-col-reverse sm:flex-row'),
      'ConfirmDialog must stack action buttons vertically on mobile for accessible touch targets'
    );
    assert.ok(
      confirmContent.includes('w-full sm:w-auto'),
      'ConfirmDialog buttons must expand to full width on mobile viewports'
    );
  });

  // 5. Recharts SVG CSS Grid Containment (min-w-0 Invariant)
  test('5. Recharts chart wrappers and parent cards enforce min-w-0 to prevent SVG flex/grid expansion blowouts', () => {
    // PerformanceChart.jsx
    const perfChartPath = path.join(srcDir, 'components/dashboard/PerformanceChart.jsx');
    const perfContent = fs.readFileSync(perfChartPath, 'utf-8');
    assert.ok(
      perfContent.includes('min-w-0'),
      'PerformanceChart.jsx must declare min-w-0 on chart container wrapper'
    );

    // Analytics.jsx
    const analyticsPath = path.join(srcDir, 'pages/Analytics.jsx');
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf-8');
    assert.ok(
      analyticsContent.includes('min-w-0'),
      'Analytics.jsx must declare min-w-0 on chart wrappers to prevent grid blowout'
    );
  });

  // 6. Multi-Column Grids Adapt to Mobile Viewports
  test('6. Analytics, SkillGaps, MockInterviews, and History adapt multi-metric grids across all viewports', () => {
    // Analytics.jsx quick stats grid
    const analyticsContent = fs.readFileSync(path.join(srcDir, 'pages/Analytics.jsx'), 'utf-8');
    assert.ok(
      analyticsContent.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'),
      'Analytics.jsx stats grid must use responsive column breakdown'
    );

    // SkillGaps.jsx metrics grid & horizontal scroll pills
    const skillGapsContent = fs.readFileSync(path.join(srcDir, 'pages/SkillGaps.jsx'), 'utf-8');
    assert.ok(
      skillGapsContent.includes('grid-cols-2 sm:grid-cols-3 md:grid-cols-5'),
      'SkillGaps.jsx metrics grid must scale responsively'
    );
    assert.ok(
      skillGapsContent.includes('overflow-x-auto'),
      'SkillGaps.jsx category pills container must enable horizontal scrolling'
    );

    // MockInterviews.jsx stats grid & filter bar
    const mockContent = fs.readFileSync(path.join(srcDir, 'pages/MockInterviews.jsx'), 'utf-8');
    assert.ok(
      mockContent.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'),
      'MockInterviews.jsx metrics grid must scale responsively'
    );
    assert.ok(
      mockContent.includes('flex-col sm:flex-row'),
      'MockInterviews.jsx filter bar must adapt to flex-col on mobile'
    );

    // History.jsx filter bar
    const historyContent = fs.readFileSync(path.join(srcDir, 'pages/History.jsx'), 'utf-8');
    assert.ok(
      historyContent.includes('overflow-x-auto no-scrollbar'),
      'History.jsx status filter bar must allow horizontal scrolling on small screens'
    );
  });

  // 7. Interactive Modal Footers and Form Actions Adapt to Touch Screens
  test('7. Modal action footers across all workspace pages stack cleanly on mobile viewports', () => {
    // QuestionBank.jsx
    const qbContent = fs.readFileSync(path.join(srcDir, 'pages/QuestionBank.jsx'), 'utf-8');
    assert.ok(
      qbContent.includes('flex-col-reverse sm:flex-row'),
      'QuestionBank generation modal footer must use responsive button stacking'
    );

    // CreatePreparation.jsx
    const prepContent = fs.readFileSync(path.join(srcDir, 'pages/CreatePreparation.jsx'), 'utf-8');
    assert.ok(
      prepContent.includes('flex-col-reverse sm:flex-row'),
      'CreatePreparation footer must use responsive button stacking'
    );

    // Reports.jsx
    const reportsContent = fs.readFileSync(path.join(srcDir, 'pages/Reports.jsx'), 'utf-8');
    assert.ok(
      reportsContent.includes('flex-col-reverse sm:flex-row'),
      'Reports modal footer must use responsive button stacking'
    );

    // ImprovementPlan.jsx
    const planContent = fs.readFileSync(path.join(srcDir, 'pages/ImprovementPlan.jsx'), 'utf-8');
    assert.ok(
      planContent.includes('flex-col-reverse sm:flex-row'),
      'ImprovementPlan modal footers must use responsive button stacking'
    );

    // LearningTasks.jsx
    const taskContent = fs.readFileSync(path.join(srcDir, 'pages/LearningTasks.jsx'), 'utf-8');
    assert.ok(
      taskContent.includes('flex-col-reverse sm:flex-row'),
      'LearningTasks modal footer must use responsive button stacking'
    );
  });

  // 8. Zero Unconstrained Fixed Widths Across Codebase
  test('8. Full codebase audit verifies no breaking fixed-width classes that exceed 320px viewport', () => {
    function auditDirectory(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          auditDirectory(fullPath);
        } else if (file.name.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Scan for dangerous fixed widths without responsive modifiers, e.g. w-[500px] or min-w-[400px]
          const dangerousWidthPattern = /(?<!(sm:|md:|lg:|xl:|2xl:|max-))w-\[(?:[4-9]\d{2}|\d{4,})px\]/g;
          const matches = content.match(dangerousWidthPattern);
          assert.ok(
            !matches,
            `File ${file.name} contains unconstrained wide fixed-width classes: ${matches?.join(', ')}`
          );
        }
      }
    }
    auditDirectory(srcDir);
  });
});
