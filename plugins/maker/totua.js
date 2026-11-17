import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'totua',
    category: 'maker',
    description: 'AI Image: totua',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'totua', ctx.prefix); }
};