import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tohijab',
    category: 'maker',
    description: 'AI Image: tohijab',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tohijab', ctx.prefix); }
};