const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const WORKMANAGER_KEEP_RULE = '-keep class androidx.work.** { *; }';

module.exports = function withWorkManagerProguard(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const rulesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      );
      const existingRules = fs.existsSync(rulesPath)
        ? fs.readFileSync(rulesPath, 'utf8')
        : '';

      if (!existingRules.includes(WORKMANAGER_KEEP_RULE)) {
        fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
        fs.appendFileSync(rulesPath, `${existingRules.endsWith('\n') || !existingRules ? '' : '\n'}${WORKMANAGER_KEEP_RULE}\n`);
      }

      return config;
    },
  ]);
};
