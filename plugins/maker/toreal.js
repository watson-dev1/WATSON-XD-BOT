import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'toreal',
    category: 'maker',
    description: 'AI Image: toreal',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'toreal', ctx.prefix); }
};