import { resolve } from 'path'
import { readFileSync } from 'fs'
import { Plugin } from 'vite'
import { parse } from 'jsonc-parser'

interface TSConfig {
    compilerOptions?: {
        baseUrl?: string
        paths?: Record<string, string[]>
    }
}

export interface AliasesOptions {
    tsconfigPath?: string
}

const pluginName: string = 'vite-tsconfig-aliases'

export default function aliases(options?: Partial<AliasesOptions>): Plugin {
    const { tsconfigPath = 'tsconfig.json' } = { ...options }
    return {
        name: pluginName,
        config(_) {
            const tsconfigPaths = loadTsconfigPaths(tsconfigPath)

            // Convert tsconfig paths to Vite aliases
            const aliases = Object.entries(tsconfigPaths).map(([alias, paths]) => ({
                find: alias.replace('/*', ''),
                replacement: paths[0], // Assuming the first path for simplicity
            }))

            console.log(`[${pluginName}] Aliases from ${tsconfigPath}:`, aliases)

            return {
                resolve: {
                    alias: aliases,
                }
            }
        },
    }
}

function loadTsconfigPaths(tsconfigPath = 'tsconfig.json'): Record<string, string[]> {
    try {
        console.debug(`[${pluginName}] Loading tsconfig from ${tsconfigPath}`)

        const tsconfig: TSConfig = parse(readFileSync(tsconfigPath, 'utf-8'))

        if (!tsconfig.compilerOptions || !tsconfig.compilerOptions.paths) {
            console.warn(`[${pluginName}] No "paths" found in ${tsconfigPath}`)
            return {}
        }

        const baseUrl = tsconfig.compilerOptions.baseUrl || '.'
        const paths = tsconfig.compilerOptions.paths

        // Resolve paths relative to the baseUrl
        const resolvedPaths: Record<string, string[]> = {}
        for (const alias in paths) {
            resolvedPaths[alias] = paths[alias].map(p => resolve(baseUrl, p.replace('/*', '')))
        }

        return resolvedPaths
    } catch (err) {
        console.error(`[${pluginName}] Failed to load or parse ${tsconfigPath}`, err)
        return {}
    }
}

