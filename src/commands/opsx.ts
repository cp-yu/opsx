import { Command } from 'commander';
import { OPSX_PATHS, readProjectOpsx, type OpsxNode } from '../utils/opsx-utils.js';
import { FileSystemUtils } from '../utils/file-system.js';

interface QueryOptions {
  relations?: boolean;
  codeMap?: boolean;
  json?: boolean;
}

function collectNodes(bundle: NonNullable<Awaited<ReturnType<typeof readProjectOpsx>>>): OpsxNode[] {
  return [
    ...bundle.domains,
    ...bundle.capabilities,
    ...(bundle.invariants || []),
    ...(bundle.interfaces || []),
    ...(bundle.decisions || []),
    ...(bundle.evidence || []),
  ];
}

export class OpsxCommand {
  async query(nodeId: string, options: QueryOptions = {}, projectRoot = '.'): Promise<void> {
    const mainPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.PROJECT_FILE);
    if (!await FileSystemUtils.fileExists(mainPath)) {
      throw new Error('OPSX files not found. Initialize with:\n  openspec bootstrap init\n  openspec init');
    }

    const codeMapPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.CODE_MAP_FILE);
    if (!await FileSystemUtils.fileExists(codeMapPath)) {
      throw new Error(`OPSX code-map file not found: ${OPSX_PATHS.CODE_MAP_FILE}`);
    }

    const bundle = await readProjectOpsx(projectRoot);
    if (!bundle) {
      throw new Error('OPSX files not found. Initialize with:\n  openspec bootstrap init\n  openspec init');
    }

    const nodes = collectNodes(bundle);
    const node = nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      const available = nodes.slice(0, 5).map((candidate) => candidate.id).join(', ');
      throw new Error(`Node '${nodeId}' not found in OPSX. Available nodes: ${available}`);
    }

    const includeRelations = !options.relations && !options.codeMap || !!options.relations;
    const includeCodeMap = !options.relations && !options.codeMap || !!options.codeMap;
    const output: Record<string, unknown> = { node };

    if (includeRelations) {
      output.relations = {
        incoming: bundle.relations.filter((relation) => relation.to === nodeId),
        outgoing: bundle.relations.filter((relation) => relation.from === nodeId),
      };
    }

    if (includeCodeMap) {
      output.codeMap = bundle.code_map.find((entry) => entry.id === nodeId)?.refs || [];
    }

    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(node.id);
  }
}

export function registerOpsxCommand(rootProgram: Command): Command {
  const opsxCommand = rootProgram
    .command('opsx')
    .description('Query OpenSpec OPSX architecture data');

  opsxCommand
    .command('query <node-id>')
    .description('Query an OPSX node')
    .option('--relations', 'Include relations only')
    .option('--code-map', 'Include code-map refs only')
    .option('--json', 'Output as JSON')
    .action(async (nodeId: string, options: QueryOptions) => {
      try {
        const cmd = new OpsxCommand();
        await cmd.query(nodeId, options);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exitCode = 1;
      }
    });

  return opsxCommand;
}
