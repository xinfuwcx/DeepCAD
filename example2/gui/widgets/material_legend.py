#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MaterialLegendPanel - 可滚动/可展开的材料图例面板（Qt 叠加控件）

用法：
- panel = MaterialLegendPanel(parent)
- panel.attach(parent_widget_containing_3d_view)
- panel.set_items([{'id':1,'name':'填土','color':(0.8,0.6,0.4),'count':123}, ...])
- panel.set_expanded(True/False)
- panel.show_panel(True/False)

颜色输入支持：
- (r,g,b) 范围 0..1 或 0..255
- "#RRGGBB"
"""
from typing import List, Dict, Tuple, Union
from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QLabel, QScrollArea, QWidget, QPushButton
)
from PyQt6.QtCore import Qt, QSize, QObject, QEvent
from PyQt6.QtGui import QColor, QPalette

ColorType = Union[str, Tuple[int, int, int], Tuple[float, float, float], list]


class _ParentResizeFilter(QObject):
    """事件过滤器：跟随父部件大小变化定位右上角"""
    def __init__(self, owner: 'MaterialLegendPanel', margin: int = 12):
        super().__init__(owner)
        self._owner = owner
        self._margin = margin

    def eventFilter(self, watched: QObject, event: QEvent) -> bool:
        if event.type() in (QEvent.Type.Resize, QEvent.Type.Show):
            self._owner._reposition()
        return False


class MaterialLegendPanel(QFrame):
    def __init__(self, parent: QWidget | None = None, max_visible_rows: int = 12):
        super().__init__(parent)
        self._items: List[Dict] = []
        self._expanded = False
        self._max_rows = max(6, int(max_visible_rows))
        self._resize_filter: _ParentResizeFilter | None = None

        self.setObjectName("MaterialLegendPanel")
        self.setWindowFlag(Qt.WindowType.Tool, False)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setStyleSheet(
            """
            QFrame#MaterialLegendPanel {
                background: rgba(255,255,255,0.92);
                border: 1px solid #cfd6e3;
                border-radius: 8px;
            }
            QLabel#Title { color:#2d3e50; font-weight:600; }
            QLabel#Count { color:#6c757d; }
            QPushButton#Toggle {
                background:#f0f3f7; border:1px solid #cfd6e3; border-radius:6px; padding:2px 8px;
            }
            QPushButton#Toggle:hover { background:#e7ebf2; }
            """
        )

        outer = QVBoxLayout(self)
        outer.setContentsMargins(8, 8, 8, 8)
        outer.setSpacing(6)

        # Header
        header = QHBoxLayout()
        self._title = QLabel("材料图例")
        self._title.setObjectName("Title")
        header.addWidget(self._title)
        header.addStretch()
        self._toggle_btn = QPushButton("展开")
        self._toggle_btn.setObjectName("Toggle")
        self._toggle_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._toggle_btn.clicked.connect(self._on_toggle)
        header.addWidget(self._toggle_btn)
        outer.addLayout(header)

        # Scroll area
        self._scroll = QScrollArea()
        self._scroll.setWidgetResizable(True)
        self._scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self._scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self._content = QWidget()
        self._list_layout = QVBoxLayout(self._content)
        self._list_layout.setContentsMargins(0, 0, 0, 0)
        self._list_layout.setSpacing(4)
        self._scroll.setWidget(self._content)
        outer.addWidget(self._scroll)

        # footer spacer to keep aesthetics
        self._footer = QLabel("")
        outer.addWidget(self._footer)

        self.setMinimumWidth(220)
        self.setMaximumWidth(280)
        self._sync_scroll_height()
        self.hide()

    # Public API
    def attach(self, host: QWidget, margin: int = 12):
        """把面板附加到 host 上，并挂载一个大小事件过滤器以便右上角定位"""
        self.setParent(host)
        self._resize_filter = _ParentResizeFilter(self, margin)
        host.installEventFilter(self._resize_filter)
        self._reposition()

    def show_panel(self, visible: bool):
        if visible:
            self._reposition()
            self.show()
        else:
            self.hide()

    def set_items(self, items: List[Dict]):
        # items: [{'id': int, 'name': str, 'color': ColorType, 'count': int}]
        self._items = items or []
        self._rebuild_list()

    def set_expanded(self, expanded: bool):
        self._expanded = bool(expanded)
        self._toggle_btn.setText("收起" if self._expanded else "展开")
        self._rebuild_list()

    # Internals
    def _on_toggle(self):
        self.set_expanded(not self._expanded)

    def _rebuild_list(self):
        # clear
        while self._list_layout.count():
            item = self._list_layout.takeAt(0)
            w = item.widget()
            if w:
                w.deleteLater()
        # choose visible items
        visible = self._items if self._expanded else self._items[: self._max_rows]
        for it in visible:
            row = self._build_row(it)
            self._list_layout.addWidget(row)
        # summary if collapsed
        if not self._expanded and len(self._items) > len(visible):
            more = len(self._items) - len(visible)
            hint = QLabel(f"还有 {more} 个…")
            hint.setObjectName("Count")
            self._list_layout.addWidget(hint)
        self._list_layout.addStretch()
        self._sync_scroll_height()
        self._reposition()

    def _build_row(self, it: Dict) -> QWidget:
        w = QFrame()
        lay = QHBoxLayout(w)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(6)

        color = self._to_qcolor(it.get('color'))
        swatch = QFrame()
        swatch.setFixedSize(QSize(14, 14))
        swatch.setStyleSheet(f"QFrame {{ background: {color.name()}; border:1px solid #8a8f98; border-radius:3px; }}")
        lay.addWidget(swatch)

        name = str(it.get('name') or f"材料 {it.get('id', '?')}")
        lbl = QLabel(name)
        lay.addWidget(lbl, 1)

        cnt = int(it.get('count') or 0)
        if cnt > 0:
            c = QLabel(f"{cnt}")
            c.setObjectName("Count")
            lay.addWidget(c)

        return w

    def _to_qcolor(self, c: ColorType) -> QColor:
        try:
            if isinstance(c, str) and c.startswith('#') and len(c) == 7:
                return QColor(c)
            if isinstance(c, (list, tuple)) and len(c) >= 3:
                r, g, b = c[0], c[1], c[2]
                # normalize 0..1 to 0..255
                if isinstance(r, float) or isinstance(g, float) or isinstance(b, float):
                    r = int(max(0, min(1, float(r))) * 255)
                    g = int(max(0, min(1, float(g))) * 255)
                    b = int(max(0, min(1, float(b))) * 255)
                else:
                    r, g, b = int(r), int(g), int(b)
                return QColor(r, g, b)
        except Exception:
            pass
        return QColor(180, 180, 180)

    def _sync_scroll_height(self):
        # Keep a pleasant height: collapsed shows up to max_rows, expanded capped at 320px
        row_h = 20
        max_h = 320 if self._expanded else min(self._max_rows * row_h + 24, 320)
        self._scroll.setFixedHeight(max_h)

    def _reposition(self):
        parent = self.parentWidget()
        if not parent:
            return
        margin = 12
        w = self.width()
        h = self.height()
        # ensure a minimum to compute h on first show
        if h <= 0:
            h = self.sizeHint().height()
        x = max(0, parent.width() - w - margin)
        y = margin
        self.move(x, y)
