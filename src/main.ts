import * as git from './git';
import * as installer from './installer';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {dirname} from 'path';

async function run(): Promise<void> {
  try {
    const distribution = core.getInput('distribution') || 'goreleaser';
    const version = core.getInput('version') || 'latest';
    const args = core.getInput('args');
    const workdir = core.getInput('workdir') || '.';
    const isInstallOnly = /^true$/i.test(core.getInput('install-only'));
    const goreleaser = await installer.getGoReleaser(distribution, version);
    core.info(`GoReleaser ${version} installed successfully`);

    if (isInstallOnly) {
      const goreleaserDir = dirname(goreleaser);
      core.addPath(goreleaserDir);
      core.debug(`Added ${goreleaserDir} to PATH`);
      return;
    } else if (!args) {
      core.setFailed('args input required');
      return;
    }

    if (workdir && workdir !== '.') {
      core.info(`Using ${workdir} as working directory`);
      process.chdir(workdir);
    }

    const commit = await git.getShortCommit();
    const tag = await git.getTag();
    const isTagDirty = await git.isTagDirty(tag);

    let snapshot = '';
    if (args.split(' ').indexOf('release') > -1) {
      if (isTagDirty) {
        if (!args.includes('--snapshot') && !args.includes('--nightly')) {
          core.info(`No tag found for commit ${commit}. Snapshot forced`);
          snapshot = ' --snapshot';
        }
      } else {
        core.info(`${tag} tag found for commit ${commit}`);
      }
    }

    if (!('GORELEASER_CURRENT_TAG' in process.env)) {
      process.env.GORELEASER_CURRENT_TAG = tag;
    }
    await exec.exec(`${goreleaser} ${args}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
