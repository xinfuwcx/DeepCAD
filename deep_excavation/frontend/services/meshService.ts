import * as THREE from 'three';
// @ts-ignore VTKLoader is not officially typed, but is part of three/examples
import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * 从后端下载并解析VTK网格文件
 * @param filename - 后端返回的临时VTK文件名 (包含.vtk后缀)
 * @returns - 一个包含已加载几何体的Promise
 */
export async function loadVtkMesh(filename: string): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const loader = new VTKLoader();
    const url = `${API_BASE_URL}/analysis/results/${filename}`;

    console.log(`正在从 ${url} 加载网格...`);

    loader.load(
      url,
      (geometry: THREE.BufferGeometry) => {
        console.log("VTK网格加载并解析成功。");
        geometry.computeVertexNormals();
        resolve(geometry);
      },
      (progress) => {
        console.log(`正在加载: ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error("加载或解析VTK网格时发生错误:", error);
        reject(new Error(`无法从 ${url} 加载VTK文件。`));
      }
    );
  });
} 