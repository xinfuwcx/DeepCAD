import { promises as fs } from 'fs';
import { join } from 'path';

export class TestDataManager {
  private testDataDir: string;

  constructor() {
    this.testDataDir = join(__dirname, '../test-data');
  }

  // 确保测试数据目录存在
  async ensureTestDataDir() {
    try {
      await fs.access(this.testDataDir);
    } catch {
      await fs.mkdir(this.testDataDir, { recursive: true });
    }
  }

  // 创建测试用的DXF文件
  async createTestDXF(filename: string, content?: string): Promise<string> {
    await this.ensureTestDataDir();
    
    const defaultContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1012
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
TestLayer
10
0.0
20
0.0
30
0.0
11
100.0
21
0.0
31
0.0
0
LINE
8
TestLayer
10
100.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
LINE
8
TestLayer
10
100.0
20
100.0
30
0.0
11
0.0
21
100.0
31
0.0
0
LINE
8
TestLayer
10
0.0
20
100.0
30
0.0
11
0.0
21
0.0
31
0.0
0
CIRCLE
8
CircleLayer
10
50.0
20
50.0
30
0.0
40
25.0
0
ARC
8
ArcLayer
10
75.0
20
75.0
30
0.0
40
15.0
50
0.0
51
90.0
0
ENDSEC
0
EOF`;

    const filePath = join(this.testDataDir, filename);
    await fs.writeFile(filePath, content || defaultContent);
    return filePath;
  }

  // 创建复杂的测试DXF文件
  async createComplexTestDXF(filename: string): Promise<string> {
    const complexContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1018
9
$INSUNITS
70
4
9
$EXTMIN
10
-50.0
20
-50.0
30
0.0
9
$EXTMAX
10
150.0
20
150.0
30
10.0
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
5
2
330
0
100
AcDbSymbolTable
70
3
0
LAYER
5
10
330
2
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
2
0
70
0
62
7
6
CONTINUOUS
0
LAYER
5
11
330
2
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
2
Geometry
70
0
62
1
6
CONTINUOUS
0
LAYER
5
12
330
2
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
2
Dimensions
70
0
62
3
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
5
100
330
1F
100
AcDbEntity
8
Geometry
100
AcDbLine
10
0.0
20
0.0
30
0.0
11
100.0
21
0.0
31
0.0
0
LINE
5
101
330
1F
100
AcDbEntity
8
Geometry
100
AcDbLine
10
100.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
POLYLINE
5
102
330
1F
100
AcDbEntity
8
Geometry
100
AcDb2dPolyline
66
1
10
0.0
20
0.0
30
0.0
70
1
0
VERTEX
5
103
330
102
100
AcDbEntity
8
Geometry
100
AcDbVertex
100
AcDb2dVertex
10
20.0
20
20.0
30
0.0
70
0
0
VERTEX
5
104
330
102
100
AcDbEntity
8
Geometry
100
AcDbVertex
100
AcDb2dVertex
10
80.0
20
20.0
30
0.0
70
0
0
VERTEX
5
105
330
102
100
AcDbEntity
8
Geometry
100
AcDbVertex
100
AcDb2dVertex
10
80.0
20
80.0
30
0.0
70
0
0
VERTEX
5
106
330
102
100
AcDbEntity
8
Geometry
100
AcDbVertex
100
AcDb2dVertex
10
20.0
20
80.0
30
0.0
70
0
0
SEQEND
5
107
330
102
100
AcDbEntity
8
Geometry
0
CIRCLE
5
108
330
1F
100
AcDbEntity
8
Geometry
100
AcDbCircle
10
50.0
20
50.0
30
0.0
40
15.0
0
ELLIPSE
5
109
330
1F
100
AcDbEntity
8
Geometry
100
AcDbEllipse
10
120.0
20
50.0
30
0.0
11
20.0
21
0.0
31
0.0
40
0.5
41
0.0
42
6.283185307179586
0
SPLINE
5
110
330
1F
100
AcDbEntity
8
Geometry
100
AcDbSpline
210
0.0
220
0.0
230
1.0
70
8
71
3
72
8
73
4
74
0
42
0.000000001
43
0.000000001
10
0.0
20
120.0
30
0.0
10
20.0
20
130.0
30
0.0
10
40.0
20
125.0
30
0.0
10
60.0
20
135.0
30
0.0
0
ENDSEC
0
EOF`;

    return await this.createTestDXF(filename, complexContent);
  }

  // 创建损坏的DXF文件用于测试错误处理
  async createCorruptedDXF(filename: string): Promise<string> {
    const corruptedContent = `0
SECTION
2
HEADER
MISSING_CODE
INVALID_DATA
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
INVALID_COORDINATE
20
0.0
30
0.0
11
100.0
MISSING_Y_COORDINATE
31
0.0
0
ENDSEC
EOF_MISSING`;

    return await this.createTestDXF(filename, corruptedContent);
  }

  // 创建空的DXF文件
  async createEmptyDXF(filename: string): Promise<string> {
    const emptyContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1012
0
ENDSEC
0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF`;

    return await this.createTestDXF(filename, emptyContent);
  }

  // 创建测试项目数据
  async createTestProject(projectName: string): Promise<any> {
    const projectData = {
      id: `test_project_${Date.now()}`,
      name: projectName,
      description: `测试项目 - ${projectName}`,
      created_at: new Date().toISOString(),
      settings: {
        units: 'mm',
        precision: 3,
        default_material: 'concrete',
      },
      geometry: {
        files: [],
        models: [],
      },
      analysis: {
        mesh_settings: {
          element_size: 1.0,
          quality: 'balanced',
        },
        boundary_conditions: [],
        loads: [],
      },
    };

    const projectFile = join(this.testDataDir, `${projectName}.json`);
    await fs.writeFile(projectFile, JSON.stringify(projectData, null, 2));
    
    return projectData;
  }

  // 获取测试文件路径
  getTestFilePath(filename: string): string {
    return join(this.testDataDir, filename);
  }

  // 检查文件是否存在
  async fileExists(filename: string): Promise<boolean> {
    try {
      await fs.access(this.getTestFilePath(filename));
      return true;
    } catch {
      return false;
    }
  }

  // 读取文件内容
  async readFile(filename: string): Promise<string> {
    return await fs.readFile(this.getTestFilePath(filename), 'utf-8');
  }

  // 删除测试文件
  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getTestFilePath(filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在，忽略错误
    }
  }

  // 清理所有测试数据
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.testDataDir);
      for (const file of files) {
        await fs.unlink(join(this.testDataDir, file));
      }
      await fs.rmdir(this.testDataDir);
    } catch {
      // 目录不存在或为空，忽略错误
    }
  }

  // 创建测试用的材料数据
  async createTestMaterials(): Promise<any[]> {
    const materials = [
      {
        id: 'test_concrete',
        name: '测试混凝土',
        type: 'concrete',
        properties: {
          density: 2400,
          elastic_modulus: 30000,
          poisson_ratio: 0.2,
          compressive_strength: 30,
          tensile_strength: 3,
        },
      },
      {
        id: 'test_steel',
        name: '测试钢材',
        type: 'steel',
        properties: {
          density: 7850,
          elastic_modulus: 210000,
          poisson_ratio: 0.3,
          yield_strength: 345,
          ultimate_strength: 490,
        },
      },
      {
        id: 'test_soil',
        name: '测试土壤',
        type: 'soil',
        properties: {
          density: 1800,
          cohesion: 20,
          friction_angle: 30,
          elastic_modulus: 50,
          poisson_ratio: 0.35,
        },
      },
    ];

    const materialsFile = join(this.testDataDir, 'test_materials.json');
    await fs.writeFile(materialsFile, JSON.stringify(materials, null, 2));
    
    return materials;
  }

  // 创建测试网格数据
  async createTestMeshData(): Promise<any> {
    const meshData = {
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 1, y: 1, z: 0 },
        { id: 4, x: 0, y: 1, z: 0 },
        { id: 5, x: 0, y: 0, z: 1 },
        { id: 6, x: 1, y: 0, z: 1 },
        { id: 7, x: 1, y: 1, z: 1 },
        { id: 8, x: 0, y: 1, z: 1 },
      ],
      elements: [
        { id: 1, type: 'hexahedron', nodes: [1, 2, 3, 4, 5, 6, 7, 8] },
      ],
      materials: [
        { element_id: 1, material_id: 'test_concrete' },
      ],
    };

    const meshFile = join(this.testDataDir, 'test_mesh.json');
    await fs.writeFile(meshFile, JSON.stringify(meshData, null, 2));
    
    return meshData;
  }

  // 创建测试几何文件
  async createTestGeometryFile(filename: string, format = 'obj'): Promise<string> {
    await this.ensureTestDataDir();
    
    let content = '';
    
    if (format === 'obj') {
      content = `# Test OBJ file
# Simple cube
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 1.0 1.0 0.0
v 0.0 1.0 0.0
v 0.0 0.0 1.0
v 1.0 0.0 1.0
v 1.0 1.0 1.0
v 0.0 1.0 1.0

# Faces
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
`;
    } else if (format === 'stl') {
      content = `solid TestCube
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 0.0 0.0
      vertex 1.0 1.0 0.0
    endloop
  endfacet
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 1.0 0.0
      vertex 0.0 1.0 0.0
    endloop
  endfacet
endsolid TestCube
`;
    }

    const filePath = join(this.testDataDir, filename);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  // 获取测试数据统计
  async getTestDataStats(): Promise<{
    fileCount: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    const stats = {
      fileCount: 0,
      totalSize: 0,
      fileTypes: {} as Record<string, number>,
    };

    try {
      const files = await fs.readdir(this.testDataDir);
      stats.fileCount = files.length;

      for (const file of files) {
        const filePath = join(this.testDataDir, file);
        const stat = await fs.stat(filePath);
        stats.totalSize += stat.size;

        const ext = file.split('.').pop()?.toLowerCase() || 'unknown';
        stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
      }
    } catch {
      // 目录不存在
    }

    return stats;
  }
}