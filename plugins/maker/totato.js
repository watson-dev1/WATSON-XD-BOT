import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'totato',
    category: 'maker',
    description: 'AI Image: totato',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'totato', ctx.prefix); }
};