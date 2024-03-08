import { applyRuleEngine } from '../rules/index.js';
import { transformFileDOM, transformFileRequest } from './attachments.js';
import { transformCaptchaDOM, transformCaptchaRequest } from './recaptcha.js';
import transferRepeatableDOM from './repeat.js';
import wizardLayout from './wizard.js';

export const transformers = [
  transformFileDOM,
  transformCaptchaDOM,
  transferRepeatableDOM,
  applyRuleEngine,
  wizardLayout,
];

export const asyncTransformers = [
];

export const requestTransformers = [
  transformCaptchaRequest,
  transformFileRequest,
];
