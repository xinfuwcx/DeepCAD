import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import DiaphragmWallForm from './DiaphragmWallForm';
import { DiaphragmWall } from '../../stores/components';
import { Material, ProjectScene } from '../../stores/models';
import { useSceneStore } from '../../stores/useSceneStore';

// --- Mocking Zustand Store ---
const mockScene: ProjectScene = {
  id: 'scene-1',
  name: 'Mock Scene',
  components: [],
  materials: [
    { id: 'mat-1', name: '混凝土 C30', type: 'concrete', parameters: { elasticModulus: 30000, poissonRatio: 0.2, density: 2500 } },
    { id: 'mat-2', name: '钢筋 HRB400', type: 'steel', parameters: { elasticModulus: 200000, poissonRatio: 0.3, density: 7850 } },
  ],
  domain: {
    soil_layer_thickness: 0,
    boreholes: [],
    stratums: [],
    bounding_box_min: null,
    bounding_box_max: null,
  },
  meshing: {
    global_size: 1.0,
  }
};

const mockUpdateComponent = (id: string, updates: Partial<DiaphragmWall>) => {
  console.log('Storybook: Mock updateComponent called', { id, updates });
};

// Mock the part of the store that the component uses
useSceneStore.setState({
  scene: mockScene,
  updateComponent: mockUpdateComponent,
});

// --- Storybook Metadata ---
export default {
  title: 'Forms/DiaphragmWallForm',
  component: DiaphragmWallForm,
  tags: ['autodocs'],
  argTypes: {
    // You can define argTypes for props here if needed
  },
} as Meta<typeof DiaphragmWallForm>;

// --- Story Template ---
const Template: StoryFn<typeof DiaphragmWallForm> = (args) => <DiaphragmWallForm {...args} />;

// --- Stories ---
const defaultComponent: DiaphragmWall = {
  id: 'dw-1',
  name: 'Default Diaphragm Wall',
  type: 'diaphragm_wall',
  path: [{x: 0, y: 0}, {x: 10, y: 0}],
  thickness: 0.8,
  depth: 25,
  material_id: 'mat-1',
  construction_method: 'slurry_wall',
  panel_length: 6.0,
  joint_type: 'interlocking',
};

export const Default = Template.bind({});
Default.args = {
  component: defaultComponent,
};

export const WithDifferentValues = Template.bind({});
WithDifferentValues.args = {
  component: {
    ...defaultComponent,
    id: 'dw-2',
    name: 'Milling Wall Example',
    thickness: 1.2,
    depth: 35,
    material_id: 'mat-2',
    construction_method: 'milling_wall',
    panel_length: 5.5,
    joint_type: 'welded',
  },
};

export const WithoutMaterial = Template.bind({});
WithoutMaterial.args = {
  component: {
    ...defaultComponent,
    id: 'dw-3',
    name: 'No Material',
    material_id: null,
  },
}; 