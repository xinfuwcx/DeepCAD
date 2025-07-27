import { test as base, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { GeometryPage } from '../pages/GeometryPage';
import { DXFImportPage } from '../pages/DXFImportPage';
import { MeshingPage } from '../pages/MeshingPage';
import { TestDataManager } from '../utils/TestDataManager';
import { ApiHelper } from '../utils/ApiHelper';

type TestFixtures = {
  dashboardPage: DashboardPage;
  geometryPage: GeometryPage;
  dxfImportPage: DXFImportPage;
  meshingPage: MeshingPage;
  testDataManager: TestDataManager;
  apiHelper: ApiHelper;
};

export const test = base.extend<TestFixtures>({
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  geometryPage: async ({ page }, use) => {
    const geometryPage = new GeometryPage(page);
    await use(geometryPage);
  },

  dxfImportPage: async ({ page }, use) => {
    const dxfImportPage = new DXFImportPage(page);
    await use(dxfImportPage);
  },

  meshingPage: async ({ page }, use) => {
    const meshingPage = new MeshingPage(page);
    await use(meshingPage);
  },

  testDataManager: async ({}, use) => {
    const testDataManager = new TestDataManager();
    await use(testDataManager);
  },

  apiHelper: async ({ request }, use) => {
    const apiHelper = new ApiHelper(request);
    await use(apiHelper);
  },
});

export { expect };