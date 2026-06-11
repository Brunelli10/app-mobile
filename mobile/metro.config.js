const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Metro resolver fallback
const metroResolver = require('metro-resolver');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Se for um import relativo e apontar para um diretório, resolver para o index.js desse diretório
  if (moduleName.startsWith('.') || moduleName.startsWith('..')) {
    const originDir = path.dirname(context.originModulePath);
    const candidatePath = path.resolve(originDir, moduleName);

    try {
      const stats = fs.statSync(candidatePath);
      if (stats.isDirectory()) {
        const indexPath = path.join(candidatePath, 'index.js');
        if (fs.existsSync(indexPath)) {
          return {
            type: 'sourceFile',
            filePath: indexPath,
          };
        }
      }
    } catch (e) {
      // Ignorar e deixar o resolver padrão lidar se o caminho não existir ou falhar
    }
  }

  // Fallback para o resolver padrão do Metro
  return metroResolver.resolve(context, moduleName, platform);
};

module.exports = config;
