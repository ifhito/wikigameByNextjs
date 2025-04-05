// テスト環境でのみ使用されるBabel設定
// process.env.NODE_ENVを確認して、テスト環境のみで適用される
const isTest = process.env.NODE_ENV === 'test';

// テスト時のみこの設定を適用
module.exports = isTest ? {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
} : {}; 