import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'topeci',
    category: 'maker',
    description: 'AI Image: topeci',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'topeci', ctx.prefix); }
};