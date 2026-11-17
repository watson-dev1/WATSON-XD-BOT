import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tounderground',
    category: 'maker',
    description: 'AI Image: tounderground',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tounderground', ctx.prefix); }
};