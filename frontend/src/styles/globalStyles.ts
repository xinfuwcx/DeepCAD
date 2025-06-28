import { css } from '@emotion/react';

/**
 * 全局样式
 */
export const globalStyles = css`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    width: 100%;
    height: 100%;
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* 暗色模式下的滚动条样式 */
  .dark-mode ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .dark-mode ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  .dark-mode ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* 文本选择样式 */
  ::selection {
    background-color: rgba(25, 118, 210, 0.2);
  }

  /* 禁用文本选择 */
  .no-select {
    user-select: none;
  }

  /* 文本溢出省略号 */
  .text-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 多行文本溢出省略号 */
  .text-ellipsis-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .text-ellipsis-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 常用布局类 */
  .flex {
    display: flex;
  }

  .flex-col {
    display: flex;
    flex-direction: column;
  }

  .items-center {
    align-items: center;
  }

  .justify-center {
    justify-content: center;
  }

  .justify-between {
    justify-content: space-between;
  }

  .flex-1 {
    flex: 1;
  }

  .flex-wrap {
    flex-wrap: wrap;
  }

  .gap-1 {
    gap: 8px;
  }

  .gap-2 {
    gap: 16px;
  }

  .gap-3 {
    gap: 24px;
  }

  /* 常用间距类 */
  .m-1 {
    margin: 8px;
  }

  .m-2 {
    margin: 16px;
  }

  .m-3 {
    margin: 24px;
  }

  .mt-1 {
    margin-top: 8px;
  }

  .mt-2 {
    margin-top: 16px;
  }

  .mt-3 {
    margin-top: 24px;
  }

  .mb-1 {
    margin-bottom: 8px;
  }

  .mb-2 {
    margin-bottom: 16px;
  }

  .mb-3 {
    margin-bottom: 24px;
  }

  .ml-1 {
    margin-left: 8px;
  }

  .ml-2 {
    margin-left: 16px;
  }

  .ml-3 {
    margin-left: 24px;
  }

  .mr-1 {
    margin-right: 8px;
  }

  .mr-2 {
    margin-right: 16px;
  }

  .mr-3 {
    margin-right: 24px;
  }

  .p-1 {
    padding: 8px;
  }

  .p-2 {
    padding: 16px;
  }

  .p-3 {
    padding: 24px;
  }

  .pt-1 {
    padding-top: 8px;
  }

  .pt-2 {
    padding-top: 16px;
  }

  .pt-3 {
    padding-top: 24px;
  }

  .pb-1 {
    padding-bottom: 8px;
  }

  .pb-2 {
    padding-bottom: 16px;
  }

  .pb-3 {
    padding-bottom: 24px;
  }

  .pl-1 {
    padding-left: 8px;
  }

  .pl-2 {
    padding-left: 16px;
  }

  .pl-3 {
    padding-left: 24px;
  }

  .pr-1 {
    padding-right: 8px;
  }

  .pr-2 {
    padding-right: 16px;
  }

  .pr-3 {
    padding-right: 24px;
  }

  /* 常用文本类 */
  .text-center {
    text-align: center;
  }

  .text-left {
    text-align: left;
  }

  .text-right {
    text-align: right;
  }

  .font-bold {
    font-weight: 700;
  }

  .font-medium {
    font-weight: 500;
  }

  .font-normal {
    font-weight: 400;
  }

  .text-sm {
    font-size: 0.875rem;
  }

  .text-base {
    font-size: 1rem;
  }

  .text-lg {
    font-size: 1.125rem;
  }

  .text-xl {
    font-size: 1.25rem;
  }

  .text-2xl {
    font-size: 1.5rem;
  }

  /* 常用显示类 */
  .hidden {
    display: none;
  }

  .block {
    display: block;
  }

  .inline-block {
    display: inline-block;
  }

  .w-full {
    width: 100%;
  }

  .h-full {
    height: 100%;
  }

  .relative {
    position: relative;
  }

  .absolute {
    position: absolute;
  }

  .fixed {
    position: fixed;
  }

  .sticky {
    position: sticky;
  }

  .top-0 {
    top: 0;
  }

  .left-0 {
    left: 0;
  }

  .right-0 {
    right: 0;
  }

  .bottom-0 {
    bottom: 0;
  }

  /* 常用圆角类 */
  .rounded-sm {
    border-radius: 4px;
  }

  .rounded {
    border-radius: 8px;
  }

  .rounded-lg {
    border-radius: 12px;
  }

  .rounded-xl {
    border-radius: 16px;
  }

  .rounded-full {
    border-radius: 9999px;
  }

  /* 常用阴影类 */
  .shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .shadow {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  .shadow-md {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .shadow-xl {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* 常用过渡类 */
  .transition {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  .transition-colors {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  .transition-opacity {
    transition-property: opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  .transition-transform {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* 常用动画类 */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-bounce {
    animation: bounce 1s infinite;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(-25%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
`;

export default globalStyles; 