import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { Form } from 'antd';
import {
  AnimatedInput,
  AnimatedSelect,
  AnimatedNumberInput,
  AnimatedSwitch,
  AnimatedButton,
  FormItemWithTooltip,
} from './FormControls';
import { SaveOutlined, AppstoreOutlined } from '@ant-design/icons';

export default {
  title: 'Forms/Form Controls',
  component: AnimatedInput, // Main component for metadata
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Form layout="vertical" style={{ maxWidth: 300, padding: 20 }}>
        <Story />
      </Form>
    ),
  ],
} as Meta;

// --- Stories for each control ---

export const DefaultAnimatedInput: StoryFn<typeof AnimatedInput> = (args) => (
  <Form.Item label="Animated Text Input">
    <AnimatedInput {...args} />
  </Form.Item>
);
DefaultAnimatedInput.args = {
  placeholder: 'Enter text...',
  tooltip: 'This is a helpful tooltip for the input.',
};

export const DefaultAnimatedSelect: StoryFn<typeof AnimatedSelect> = (args) => (
  <Form.Item label="Animated Select">
    <AnimatedSelect {...args} />
  </Form.Item>
);
DefaultAnimatedSelect.args = {
  placeholder: 'Select an option',
  options: [
    { value: 'option1', label: 'Option One' },
    { value: 'option2', label: 'Option Two' },
    { value: 'option3', label: 'Option Three' },
  ],
  tooltip: 'This tooltip explains the select options.',
};

export const DefaultAnimatedNumberInput: StoryFn<typeof AnimatedNumberInput> = (args) => (
  <Form.Item label="Animated Number Input">
    <AnimatedNumberInput {...args} />
  </Form.Item>
);
DefaultAnimatedNumberInput.args = {
  placeholder: 'Enter a number',
  min: 0,
  max: 100,
  step: 5,
  unit: 'm',
  tooltip: 'Enter a value between 0 and 100.',
};

export const DefaultAnimatedSwitch: StoryFn<typeof AnimatedSwitch> = (args) => (
    <Form.Item label="Animated Switch">
        <AnimatedSwitch {...args} />
    </Form.Item>
);
DefaultAnimatedSwitch.args = {
  tooltip: 'Toggle this setting on or off.',
};

export const PrimaryAnimatedButton: StoryFn<typeof AnimatedButton> = (args) => <AnimatedButton {...args} />;
PrimaryAnimatedButton.args = {
  type: 'primary',
  icon: <SaveOutlined />,
  children: 'Save Changes',
  tooltip: 'Click to save your changes.',
};

export const SecondaryAnimatedButton: StoryFn<typeof AnimatedButton> = (args) => <AnimatedButton {...args} />;
SecondaryAnimatedButton.args = {
  type: 'default',
  icon: <AppstoreOutlined />,
  children: 'View Options',
  tooltip: 'Click to see more options.',
};

export const ItemWithTooltip: StoryFn<typeof FormItemWithTooltip> = () => (
    <FormItemWithTooltip
      name="demo_item"
      label="Form Item with Tooltip"
      tooltip="This tooltip is integrated into the form item's label."
    >
        <AnimatedInput placeholder="Wrapped Input" />
    </FormItemWithTooltip>
);