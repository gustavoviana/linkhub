import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { IOS_VERSION_SCRIPT } from '@/lib/appgen/ios-version-script';

const PBX = `
    buildSettings = {
      CURRENT_PROJECT_VERSION = 1;
      MARKETING_VERSION = 1.0;
    };
    buildSettings = {
      CURRENT_PROJECT_VERSION = 1;
      MARKETING_VERSION = 1.0;
    };
`;

describe('versao-ios.cjs', () => {
  it('grava CFBundleShortVersionString e CFBundleVersion no projeto do Xcode', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ios-'));
    const proj = path.join(dir, 'ios', 'App', 'App.xcodeproj');
    mkdirSync(proj, { recursive: true });
    writeFileSync(path.join(proj, 'project.pbxproj'), PBX);
    writeFileSync(path.join(dir, 'versao-ios.json'), JSON.stringify({ versionName: '1.2.0', buildNumber: 7 }));
    writeFileSync(path.join(dir, 'versao-ios.cjs'), IOS_VERSION_SCRIPT);

    execFileSync(process.execPath, [path.join(dir, 'versao-ios.cjs'), dir]);

    const out = readFileSync(path.join(proj, 'project.pbxproj'), 'utf8');
    expect(out.match(/MARKETING_VERSION = 1\.2\.0;/g)).toHaveLength(2);
    expect(out.match(/CURRENT_PROJECT_VERSION = 7;/g)).toHaveLength(2);
  });
});
