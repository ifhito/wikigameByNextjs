// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// モックの設定
// フェッチAPIのモック
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Socket.IOクライアントのためのウィンドウオブジェクトモック
window.location = {
  ...window.location,
  origin: 'http://localhost:3000'
};

// console.logなどをモック化して出力を抑制
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}; 