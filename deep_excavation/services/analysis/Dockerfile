FROM python:3.9-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenmpi-dev \
    libboost-all-dev \
    libhdf5-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制服务代码
COPY . .

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV SERVICE_NAME=analysis_service

# 暴露端口
EXPOSE 8003

# 启动服务
CMD ["python", "main.py"] 