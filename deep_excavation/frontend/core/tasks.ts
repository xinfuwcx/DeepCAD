import { AnyFeature } from "../services/parametricAnalysisService";

/**
 * Defines the valid 'type' strings for features that can be initiated from a UI task.
 * This ensures that when we start a task, it corresponds to a known feature type.
 */
export type FeatureType = 'CreateBox' | 'CreateSketch' | 'Extrude' | 'AssignGroup' | 'AddInfiniteDomain';

/**
 * Represents an active task in the UI, such as a wizard for creating or editing a feature.
 * It guides the user through collecting the necessary parameters.
 */
export interface Task {
    /**
     * The type of feature this task is intended to create or edit.
     */
    type: FeatureType;

    /**
     * If the task is for editing an existing feature, this holds its ID.
     * If undefined, the task is for creating a new feature.
     */
    editingFeatureId?: string;

    /**
     * The ID of the parent feature, if the new feature is dependent on another.
     * For example, an 'ExtrudeCut' task would have the ID of its target body as a parentId.
     */
    parentId?: string;
} 