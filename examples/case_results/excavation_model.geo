
// 深基坑几何模型
SetFactory("OpenCASCADE");

// 参数
width = 100.0;
length = 100.0;
depth = 40.0;
excavation_width = 30.0;
excavation_length = 30.0;
excavation_depth = 20.0;
wall_thickness = 1.0;
wall_depth = 30.0;

// 创建土体域(长方体)
soil_box = newv;
Box(soil_box) = {-width/2, -length/2, -depth, width, length, depth};

// 创建基坑(长方体)
exc_box = newv;
Box(exc_box) = {-excavation_width/2, -excavation_length/2, -excavation_depth, 
                excavation_width, excavation_length, excavation_depth};

// 创建地下连续墙(四个侧面)
// 前墙
front_wall = newv;
Box(front_wall) = {-excavation_width/2 - wall_thickness, -excavation_length/2 - wall_thickness, -wall_depth,
                   excavation_width + 2*wall_thickness, wall_thickness, wall_depth};

// 后墙
back_wall = newv;
Box(back_wall) = {-excavation_width/2 - wall_thickness, excavation_length/2, -wall_depth,
                  excavation_width + 2*wall_thickness, wall_thickness, wall_depth};

// 左墙
left_wall = newv;
Box(left_wall) = {-excavation_width/2 - wall_thickness, -excavation_length/2, -wall_depth,
                  wall_thickness, excavation_length, wall_depth};

// 右墙
right_wall = newv;
Box(right_wall) = {excavation_width/2, -excavation_length/2, -wall_depth,
                   wall_thickness, excavation_length, wall_depth};

// 布尔运算
// 从土体中减去基坑
soil_with_excavation = BooleanDifference{Volume{soil_box}; Delete;}{Volume{exc_box}; Delete;};

// 添加物理组
// 土体
Physical Volume("soil", 1) = {soil_with_excavation};

// 墙体
Physical Volume("wall", 10) = {front_wall, back_wall, left_wall, right_wall};

// 边界面
bottom_faces = {};
left_faces = {};
right_faces = {};
front_faces = {};
back_faces = {};
top_faces = {};

// 获取边界面
boundary_faces = Boundary{Volume{soil_with_excavation};};

// 根据位置判断边界类型
For i In {0:#boundary_faces[]}
    face_tag = boundary_faces[i];
    center[] = CenterOfMass Surface{face_tag};
    x = center[0];
    y = center[1];
    z = center[2];
    
    If(Abs(z + depth) < 1e-6)
        bottom_faces[] += {face_tag}; // 底面
    EndIf
    If(Abs(x + width/2) < 1e-6)
        left_faces[] += {face_tag}; // 左面
    EndIf
    If(Abs(x - width/2) < 1e-6)
        right_faces[] += {face_tag}; // 右面
    EndIf
    If(Abs(y + length/2) < 1e-6)
        front_faces[] += {face_tag}; // 前面
    EndIf
    If(Abs(y - length/2) < 1e-6)
        back_faces[] += {face_tag}; // 后面
    EndIf
    If(Abs(z) < 1e-6)
        top_faces[] += {face_tag}; // 顶面
    EndIf
EndFor

// 添加物理组
If(#bottom_faces[])
    Physical Surface("bottom", 20) = {bottom_faces[]};
EndIf
If(#left_faces[])
    Physical Surface("left", 21) = {left_faces[]};
EndIf
If(#right_faces[])
    Physical Surface("right", 22) = {right_faces[]};
EndIf
If(#front_faces[])
    Physical Surface("front", 23) = {front_faces[]};
EndIf
If(#back_faces[])
    Physical Surface("back", 24) = {back_faces[]};
EndIf
If(#top_faces[])
    Physical Surface("top", 25) = {top_faces[]};
EndIf

// 添加土层分界面

// 土层 填土层 (深度 5.0m)
soil_layer_1_tag = 101;
Physical Volume("填土层", soil_layer_1_tag) = {soil_with_excavation};

// 土层 粉质粘土层 (深度 15.0m)
soil_layer_2_tag = 102;
Physical Volume("粉质粘土层", soil_layer_2_tag) = {soil_with_excavation};

// 土层 砂土层 (深度 25.0m)
soil_layer_3_tag = 103;
Physical Volume("砂土层", soil_layer_3_tag) = {soil_with_excavation};

// 土层 粘土层 (深度 40.0m)
soil_layer_4_tag = 104;
Physical Volume("粘土层", soil_layer_4_tag) = {soil_with_excavation};
