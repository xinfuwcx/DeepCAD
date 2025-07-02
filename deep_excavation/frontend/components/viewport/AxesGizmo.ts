import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export function createAxesGizmo(): THREE.Group {
    const axes = new THREE.Group();

    const axisLength = 1;
    const arrowLength = 0.2;
    const arrowRadius = 0.08;

    const createAxis = (dir: THREE.Vector3, color: number, label: string) => {
        const origin = new THREE.Vector3(0, 0, 0);
        
        // Line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([origin, dir.clone().multiplyScalar(axisLength)]);
        const lineMaterial = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        
        // Arrow
        const arrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.copy(dir).multiplyScalar(axisLength);
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'axis-label';
        labelDiv.textContent = label;
        labelDiv.style.color = new THREE.Color(color).getStyle();
        labelDiv.style.fontWeight = 'bold';
        labelDiv.style.fontSize = '14px';

        const labelObject = new CSS2DObject(labelDiv);
        labelObject.position.copy(dir).multiplyScalar(axisLength + arrowLength * 2);

        const axisGroup = new THREE.Group();
        axisGroup.add(line, arrow, labelObject);
        return axisGroup;
    };
    
    const xAxis = createAxis(new THREE.Vector3(1, 0, 0), 0xff0000, 'X');
    const yAxis = createAxis(new THREE.Vector3(0, 1, 0), 0x00ff00, 'Y');
    const zAxis = createAxis(new THREE.Vector3(0, 0, 1), 0x0000ff, 'Z');
    
    axes.add(xAxis, yAxis, zAxis);
    
    return axes;
} 