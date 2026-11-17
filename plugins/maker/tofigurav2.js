import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tofigurav2',
    category: 'maker',
    description: 'AI Image: tofigurav2',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tofigurav2', ctx.prefix); }
};