import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/react'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {
      // eslint-plugin-react-hooks v7 activa como "error" las reglas del React Compiler.
      // Se dejan como advertencia para revisarlas gradualmente sin bloquear el lint.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/globals': 'warn',
    },
  },
];
