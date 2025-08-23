// In webpack.main.config.ts

import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: {
    index: './src/index.ts',
    'analysis.worker': './src/analysis.worker.ts',
  },
  // Put your normal webpack config below here
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  // UPDATED: The output filename now uses the [name] placeholder
  output: {
    filename: '[name].js',
  },
};