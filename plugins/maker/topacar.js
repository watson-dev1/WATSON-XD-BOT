import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'topacar',
    category: 'maker',
    description: 'AI Image: topacar',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'topacar', ctx.prefix); }
};