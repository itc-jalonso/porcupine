/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { PorcupineKeyword } from './types';
import { BUILT_IN_KEYWORD_BYTES, BuiltInKeyword } from './built_in_keywords';

import {
  fromBase64,
  fromPublicDirectory,
} from '@picovoice/web-utils';

const DEFAULT_SENSITIVITY = 0.5;

export async function keywordsProcess(keywords: Array<PorcupineKeyword | BuiltInKeyword> | PorcupineKeyword | BuiltInKeyword): Promise<[Array<string>, Float32Array]> {

  if (keywords === undefined || keywords === null) {
    throw new Error(
      'The keywords argument is undefined / empty',
    );
  }

  if (!Array.isArray(keywords)) {
    keywords = [keywords];
  } else if (keywords.length === 0) {
    throw new Error('The keywords argument array is empty');
  }

  const keywordSensitivities = [];
  const keywordLabels = [];

  for (const keyword of keywords) {
    // normalize keywords to PorcupineKeyword
    let keywordArgNormalized: PorcupineKeyword;
    if (typeof keyword === 'string') {
      keywordArgNormalized = {
        builtin: keyword as BuiltInKeyword,
        sensitivity: DEFAULT_SENSITIVITY,
      };
    } else if (typeof keyword !== 'object') {
      throw new Error(
        'Invalid keyword argument type: ' +
        keyword +
        ' : ' +
        typeof keyword,
      );
    } else {
      keywordArgNormalized = keyword;
    }

    if ('label' in keywordArgNormalized) {
      keywordLabels.push(keywordArgNormalized.label);
      if (keywordArgNormalized.base64 !== undefined) {
        await fromBase64(
          keywordArgNormalized.label,
          keywordArgNormalized.base64,
          keywordArgNormalized.usedCachedKeyword ?? false,
          1);
      } else if (keywordArgNormalized.ppnPath !== undefined) {
        await fromPublicDirectory(
          keywordArgNormalized.label,
          keywordArgNormalized.ppnPath,
          true,
          1);
      }
    } else if ('builtin' in keywordArgNormalized) {

      const validEnums = Object.values(BuiltInKeyword);
      const builtInName = keywordArgNormalized.builtin;
      // @ts-ignore
      const keywordEnum = BuiltInKeyword[builtInName.replace(' ', '')];
      if (!validEnums.includes(keywordEnum)) {
        throw new Error(
          `Keyword ${builtInName} does not map to list of built-in keywords (${validEnums})`,
        );
      }
      keywordLabels.push(keywordArgNormalized.builtin);
      await fromBase64(
        keywordArgNormalized.builtin,
        // @ts-ignore
        BUILT_IN_KEYWORD_BYTES.get(keywordEnum),
        keywordArgNormalized.usedCachedKeyword ?? false,
        1);
    } else {
      throw new Error(
        'Unknown keyword argument: ' + JSON.stringify(keyword),
      );
    }

    keywordSensitivities.push(
      keywordArgNormalized.sensitivity ?? DEFAULT_SENSITIVITY,
    );
  }

  for (const sensitivity of keywordSensitivities) {
    if (typeof sensitivity !== 'number') {
      throw new Error('Sensitivity is not a number (in range [0,1]): ' + sensitivity);
    }
    if (sensitivity < 0 || sensitivity > 1) {
      throw new Error('Sensitivity is outside of range [0, 1]: ' + sensitivity);
    }
  }

  if (keywordSensitivities.length !== keywordLabels.length) {
    throw new Error(`keywordSensitivities (${keywordSensitivities.length}) and keywordLabels (${keywordLabels.length}) length differs`);
  }
  const sensitivities = new Float32Array(keywordSensitivities);

  return [keywordLabels, sensitivities];
}