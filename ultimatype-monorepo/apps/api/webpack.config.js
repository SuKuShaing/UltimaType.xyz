const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

// All npm packages that should remain external (not bundled by webpack)
// @ultimatype-monorepo/* workspace libs are intentionally NOT listed here
// so they get bundled inline and don't require the Nx ESM TS-source loader at runtime
const EXTERNAL_PACKAGES = [
  '@nestjs/common',
  '@nestjs/core',
  '@nestjs/platform-express',
  '@nestjs/passport',
  '@nestjs/jwt',
  '@prisma/client',
  '@prisma/engines',
  '@prisma/adapter-pg',
  'passport',
  'passport-google-oauth20',
  'passport-github2',
  'passport-jwt',
  'reflect-metadata',
  'rxjs',
  'tslib',
  'express',
  'dotenv',
  'geoip-lite',
  'pg',
];

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    // Allow webpack to resolve .ts files imported with .js extension
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // Only externalize specific npm packages listed above
      // This forces @ultimatype-monorepo/shared to be bundled inline
      externalDependencies: EXTERNAL_PACKAGES,
    }),
  ],
};
