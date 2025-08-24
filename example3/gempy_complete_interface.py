"""
GemPy Complete Professional Interface - 完整专业界面
Integrates all features including professional sections system
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

# 导入基础界面
from gempy_professional_interface import *
from gempy_section_system import SectionSystemWidget

class GemPyCompleteInterface(GemPyProfessionalInterface):
    """完整专业GemPy界面 - 包含完整剖面系统"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("🌋 GemPy Complete Professional - 完整专业地质建模系统")
        
        # 替换底部剖面区域
        self.integrate_professional_sections()
        
        # 连接数据更新信号
        self.connect_section_signals()
    
    def integrate_professional_sections(self):
        """集成专业剖面系统"""
        # 移除原有的空白剖面区域
        if hasattr(self, 'sections_area'):
            self.sections_area.setParent(None)
        
        # 创建新的专业剖面系统
        self.professional_sections = SectionSystemWidget(self)
        
        # 将剖面系统添加到主布局
        # 找到中央分割器
        central_widget = self.centralWidget()
        if isinstance(central_widget, QSplitter):
            # 添加剖面系统到分割器
            central_widget.addWidget(self.professional_sections)
            
            # 设置分割比例: 3D视图60%，剖面40%
            sizes = central_widget.sizes()
            total = sum(sizes)
            if len(sizes) >= 2:
                central_widget.setSizes([int(total * 0.6), int(total * 0.4)])
        else:
            # 如果不是分割器，创建新的布局
            new_layout = QVBoxLayout()
            main_area = QSplitter(Qt.Orientation.Vertical)
            
            # 将现有的3D区域添加到分割器
            main_area.addWidget(central_widget)
            main_area.addWidget(self.professional_sections)
            
            # 设置分割比例
            main_area.setSizes([400, 200])  # 3D视图更大
            
            new_widget = QWidget()
            new_widget.setLayout(QVBoxLayout())
            new_widget.layout().addWidget(main_area)
            self.setCentralWidget(new_widget)
    
    def connect_section_signals(self):
        """连接剖面系统信号"""
        # 当数据面板数据更新时，同步到剖面系统
        if hasattr(self, 'data_panel'):
            self.data_panel.data_changed.connect(self.update_sections_data)
        
        # 当模型构建完成时，同步到剖面系统
        if hasattr(self, 'settings_panel'):
            self.settings_panel.model_updated.connect(self.update_sections_model)
    
    def update_sections_data(self):
        """更新剖面系统数据"""
        try:
            # 获取当前数据
            interface_points = self.get_interface_points_dataframe()
            orientations = self.get_orientations_dataframe()
            extent = self.get_model_extent()
            
            # 更新剖面系统
            self.professional_sections.update_data(
                interface_points=interface_points,
                orientations=orientations,
                extent=extent
            )
            
            print("✅ 剖面数据已更新")
            
        except Exception as e:
            print(f"⚠️ 剖面数据更新失败: {e}")
    
    def update_sections_model(self, geo_model):
        """更新剖面系统地质模型"""
        try:
            # 更新剖面系统的地质模型
            self.professional_sections.update_data(geo_model=geo_model)
            
            print("✅ 剖面地质模型已更新")
            
        except Exception as e:
            print(f"⚠️ 剖面模型更新失败: {e}")
    
    def get_interface_points_dataframe(self):
        """获取界面点DataFrame"""
        if hasattr(self, 'data_panel') and hasattr(self.data_panel, 'interface_points'):
            return pd.DataFrame(self.data_panel.interface_points)
        return pd.DataFrame()
    
    def get_orientations_dataframe(self):
        """获取产状数据DataFrame"""
        if hasattr(self, 'data_panel') and hasattr(self.data_panel, 'orientations'):
            return pd.DataFrame(self.data_panel.orientations)
        return pd.DataFrame()
    
    def get_model_extent(self):
        """获取模型范围"""
        if hasattr(self, 'settings_panel'):
            try:
                extent = [
                    float(self.settings_panel.x_min.text() or 0),
                    float(self.settings_panel.x_max.text() or 1000),
                    float(self.settings_panel.y_min.text() or 0),
                    float(self.settings_panel.y_max.text() or 1000),
                    float(self.settings_panel.z_min.text() or -500),
                    float(self.settings_panel.z_max.text() or 500)
                ]
                return extent
            except:
                pass
        
        return [0, 1000, 0, 1000, -500, 500]  # 默认范围
    
    def build_model(self):
        """增强的模型构建功能"""
        # 调用父类的构建功能
        super().build_model()
        
        # 构建完成后立即更新剖面
        QTimer.singleShot(1000, self.update_sections_after_build)
    
    def update_sections_after_build(self):
        """模型构建后更新剖面"""
        try:
            self.update_sections_data()
            self.professional_sections.refresh_all_sections()
            print("🎯 剖面系统已同步模型构建结果")
        except Exception as e:
            print(f"⚠️ 剖面同步失败: {e}")
    
    def add_interface_point(self, x, y, z, formation):
        """增强的添加界面点功能"""
        # 调用父类功能
        if hasattr(self, 'data_panel'):
            self.data_panel.add_interface_point(x, y, z, formation)
        
        # 立即更新剖面
        QTimer.singleShot(100, self.update_sections_data)
    
    def add_orientation(self, x, y, z, azimuth, dip, polarity, formation):
        """增强的添加产状功能"""
        # 调用父类功能
        if hasattr(self, 'data_panel'):
            self.data_panel.add_orientation(x, y, z, azimuth, dip, polarity, formation)
        
        # 立即更新剖面
        QTimer.singleShot(100, self.update_sections_data)


def create_demo_geological_data():
    """创建演示地质数据"""
    import numpy as np
    
    # 创建界面点数据
    interface_points = []
    
    # 第四系界面点
    for i in range(8):
        x = np.random.uniform(100, 900)
        y = np.random.uniform(100, 900)
        z = 200 + np.random.uniform(-30, 30)
        interface_points.append([x, y, z, "第四系"])
    
    # 第三系界面点  
    for i in range(10):
        x = np.random.uniform(100, 900)
        y = np.random.uniform(100, 900)
        z = 0 + np.random.uniform(-50, 50)
        interface_points.append([x, y, z, "第三系"])
    
    # 白垩系界面点
    for i in range(8):
        x = np.random.uniform(100, 900)
        y = np.random.uniform(100, 900)
        z = -200 + np.random.uniform(-40, 40)
        interface_points.append([x, y, z, "白垩系"])
    
    # 基岩界面点
    for i in range(6):
        x = np.random.uniform(200, 800)
        y = np.random.uniform(200, 800)
        z = -400 + np.random.uniform(-30, 30)
        interface_points.append([x, y, z, "基岩"])
    
    # 创建产状数据
    orientations = []
    
    for i in range(15):
        x = np.random.uniform(200, 800)
        y = np.random.uniform(200, 800)
        z = np.random.uniform(-300, 150)
        azimuth = np.random.uniform(0, 360)
        dip = np.random.uniform(15, 75)
        polarity = 1
        formation = np.random.choice(["第四系", "第三系", "白垩系", "基岩"])
        orientations.append([x, y, z, azimuth, dip, polarity, formation])
    
    interface_df = pd.DataFrame(interface_points, columns=['X', 'Y', 'Z', 'formation'])
    orientations_df = pd.DataFrame(orientations, columns=['X', 'Y', 'Z', 'azimuth', 'dip', 'polarity', 'formation'])
    
    return interface_df, orientations_df


def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    print("🌋 启动GemPy Complete Professional Interface...")
    
    # 创建并显示完整专业界面
    window = GemPyCompleteInterface()
    window.show()
    
    # 添加演示数据
    try:
        interface_df, orientations_df = create_demo_geological_data()
        
        # 等界面完全加载后添加数据
        def load_demo_data():
            try:
                window.professional_sections.update_data(
                    interface_points=interface_df,
                    orientations=orientations_df,
                    extent=[0, 1000, 0, 1000, -500, 500]
                )
                print("✅ 演示数据已加载到剖面系统")
                print(f"📊 界面点: {len(interface_df)}, 产状数据: {len(orientations_df)}")
            except Exception as e:
                print(f"⚠️ 演示数据加载失败: {e}")
        
        QTimer.singleShot(2000, load_demo_data)
        
    except Exception as e:
        print(f"⚠️ 演示数据创建失败: {e}")
    
    print("🎯 完整专业界面已启动!")
    print("✨ 包含完整的XY、XZ、YZ剖面系统")
    print("🔧 剖面与3D视图完全集成")
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()