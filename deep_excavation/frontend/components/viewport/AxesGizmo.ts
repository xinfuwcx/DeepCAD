import * as THREE from 'three';

/**
 * Creates a text label as a Sprite.
 * @param text The text to display.
 * @param color The color of the text.
 * @param size The size of the canvas texture.
 * @returns A THREE.Sprite object.
 */
function createAxisLabel(text: string, color: string, size: number = 64): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');

    canvas.width = size;
    canvas.height = size;

    context.font = `Bold ${size * 0.5}px Arial`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 0.5); // Adjust scale to fit the gizmo size

    return sprite;
}


/**
 * Creates a professional-looking 3D axes gizmo using ArrowHelpers and Sprite labels.
 */
export function createAxesGizmo(): THREE.Object3D {
    const gizmo = new THREE.Object3D();

    const origin = new THREE.Vector3(0, 0, 0);
    const length = 1;
    const headLength = 0.2;
    const headWidth = 0.1;

    // --- Axes ---
    const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, length, 0xff7777, headLength, headWidth);
    const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, length, 0x77ff77, headLength, headWidth);
    const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, length, 0x7777ff, headLength, headWidth);
    
    // Softer, more modern colors for the axes
    (xAxis.line.material as THREE.LineBasicMaterial).linewidth = 2;
    (yAxis.line.material as THREE.LineBasicMaterial).linewidth = 2;
    (zAxis.line.material as THREE.LineBasicMaterial).linewidth = 2;
    
    // --- Labels ---
    const xLabel = createAxisLabel('X', '#ff7777');
    xLabel.position.set(length + 0.2, 0, 0);

    const yLabel = createAxisLabel('Y', '#77ff77');
    yLabel.position.set(0, length + 0.2, 0);

    const zLabel = createAxisLabel('Z', '#7777ff');
    zLabel.position.set(0, 0, length + 0.2);

    gizmo.add(xAxis, yAxis, zAxis, xLabel, yLabel, zLabel);
    
    return gizmo;
} 