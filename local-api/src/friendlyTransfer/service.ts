import { resolveStation, type StationMatch } from './stationDirectory.js';

export interface FriendlyTransferDependencies {
  chat(message: string): Promise<string>;
}

export function createFriendlyTransferService(dependencies: FriendlyTransferDependencies) {
  return {
    findStation(spokenStation: string): StationMatch {
      const match = resolveStation(spokenStation);
      if (!match) {
        throw new Error('Station could not be resolved.');
      }
      return match;
    },

    async route(origin: string, destination: string): Promise<string> {
      if (!origin.trim() || !destination.trim()) {
        throw new Error('Origin and destination are required.');
      }
      return dependencies.chat([
        '\u4f60\u662f RailAgent\uff0c\u8acb\u4ee5\u7e41\u9ad4\u4e2d\u6587\u63d0\u4f9b\u7c21\u77ed\u3001\u53cb\u5584\u7684\u8f49\u4e58\u5efa\u8b70\u3002',
        `\u65c5\u5ba2\u76ee\u524d\u5728\uff1a${origin.trim()}\u3002`,
        `\u65c5\u5ba2\u6b32\u524d\u5f80\uff1a${destination.trim()}\u3002`,
        '\u4e0d\u53ef\u5ba3\u7a31\u5373\u6642\u73ed\u8868\u6216\u73fe\u5834\u72c0\u614b\uff1b\u8acb\u63d0\u9192\u65c5\u5ba2\u5411\u7ad9\u52d9\u4eba\u54e1\u78ba\u8a8d\u6708\u53f0\u3001\u6642\u9593\u8207\u7121\u969c\u7929\u8a2d\u65bd\u3002'
      ].join(''));
    }
  };
}
