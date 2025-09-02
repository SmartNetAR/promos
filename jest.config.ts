import type { Config } from 'jest';

const config: Config = {
    preset: 'jest-preset-angular',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    testMatch: ['**/?(*.)+(spec).ts'],
    moduleFileExtensions: ['ts', 'html', 'js', 'json'],
    transform: {
        '^.+\\.(ts|mjs|html)$': [
            'jest-preset-angular',
            {
                tsconfig: '<rootDir>/tsconfig.spec.json',
                stringifyContentPathRegex: '\\.(html|svg)$'
            }
        ]
    },
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1'
    },
    collectCoverageFrom: [
        'src/app/**/*.ts',
        '!src/main.ts',
        '!src/**/*.spec.ts'
    ],
    coverageDirectory: '<rootDir>/coverage-jest'
};

export default config;
