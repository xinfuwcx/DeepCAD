
// 简化的3D几何模型
lc = 2.0;

// 创建一个简单的长方体作为土体域
Point(1) = {0, 0, 0, lc};
Point(2) = {50.0, 0, 0, lc};
Point(3) = {50.0, 50.0, 0, lc};
Point(4) = {0, 50.0, 0, lc};
Point(5) = {0, 0, 5.0, lc};
Point(6) = {50.0, 0, 5.0, lc};
Point(7) = {50.0, 50.0, 5.0, lc};
Point(8) = {0, 50.0, 5.0, lc};

// 底面
Line(1) = {1, 2};
Line(2) = {2, 3};
Line(3) = {3, 4};
Line(4) = {4, 1};

// 顶面
Line(5) = {5, 6};
Line(6) = {6, 7};
Line(7) = {7, 8};
Line(8) = {8, 5};

// 竖直边
Line(9) = {1, 5};
Line(10) = {2, 6};
Line(11) = {3, 7};
Line(12) = {4, 8};

// 创建面
Curve Loop(1) = {1, 2, 3, 4};
Plane Surface(1) = {1};

Curve Loop(2) = {5, 6, 7, 8};
Plane Surface(2) = {2};

Curve Loop(3) = {1, 10, -5, -9};
Plane Surface(3) = {3};

Curve Loop(4) = {2, 11, -6, -10};
Plane Surface(4) = {4};

Curve Loop(5) = {3, 12, -7, -11};
Plane Surface(5) = {5};

Curve Loop(6) = {4, 9, -8, -12};
Plane Surface(6) = {6};

// 创建体积
Surface Loop(1) = {1, 2, 3, 4, 5, 6};
Volume(1) = {1};

// 物理组定义
Physical Volume("SoilDomain") = {1};
Physical Surface("BottomBoundary") = {1};
Physical Surface("TopBoundary") = {2};
